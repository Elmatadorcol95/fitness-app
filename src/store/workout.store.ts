import { create } from 'zustand';
import { desc, eq, inArray, ne } from 'drizzle-orm';
import { db } from '@/db';
import { gamificationMeta, planDays, workoutPlans, workoutSessions } from '@/db/schema';
import { generatePlan, getRepScheme, buildPlanned, type PlannedExercise, type DayType, type GoalKey } from '@/lib/plan-generator';
import type { CardioPlan } from '@/lib/cardioSelection';
import { materializeTemplate, findManualPlan } from '@/lib/routineMaterializer';
import { getTemplate, type TemplateContext } from '@/lib/routineTemplates';
import { EXERCISES } from '@/lib/exercises';
import { useGamificationStore } from './gamification.store';
import type { Profile } from '@/db/schema';

const ACTIVE_DAY_KEY = 'workout_active_day_index'; // legacy — solo lectura, para el backfill una vez
const SELECTED_DAY_KEY = 'workout_selected_day_id';
// Deliberadamente sin la palabra "week": esto es el ciclo actual del plan,
// no una semana de calendario (ver PASO 0-BIS/0-TER — daysFinishedThisWeek
// tampoco lo es, a pesar del nombre).
const COMPLETED_DAYS_KEY = 'workout_completed_day_ids';

// StoredPlanDay extiende PlanDayData con el id de la fila en plan_days.
// Necesario para poder actualizar ejercicios concretos en SQLite.
export interface StoredPlanDay {
  dbId: number;
  dayIndex: number;
  dayType: DayType;
  exercises: PlannedExercise[];
  cardio: CardioPlan;
}

export interface StoredPlan {
  id: number;
  goalPrimary: string;
  goalSecondary: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  days: StoredPlanDay[];
  // Fuente de verdad real: el id de la fila de plan_days seleccionada, no
  // una posición. null solo antes de que exista ningún día entrenable
  // seleccionado (instalación nueva sin plan todavía).
  selectedDayId: number | null;
  // Derivado de selectedDayId, mantenido SOLO por compatibilidad con
  // WorkoutCard.tsx (sin importadores — código muerto) y TodayBanner.tsx
  // (pantalla Hoy) — ninguno forma parte de este refactor. No usar en
  // código nuevo: usar selectedDayId + getSelectedDay().
  activeDayIndex: number;
  source: 'auto' | 'manual';
  context: 'gym' | 'home' | null;
  // Paso 2c (#6+#18): ids (plan_days.id / StoredPlanDay.dbId) de los días
  // que ya llegaron al 100% de sus series en el ciclo actual. Se vacía cada
  // vez que arranca un ciclo nuevo (generateAndSavePlan, activateManualPlan,
  // startNextManualCycle) — nunca es una semana de calendario.
  completedDayIds: number[];
}

interface WorkoutState {
  currentPlan: StoredPlan | null;
  isGenerating: boolean;
  isLoaded: boolean;
  loadCurrentPlan: () => Promise<void>;
  generateAndSavePlan: (profile: Profile) => Promise<void>;
  replaceExercise: (dayDbId: number, exerciseIndex: number, newExerciseId: string, profile: Profile) => Promise<void>;
  advanceToNextDay: (justTrainedDayId: number | null) => Promise<void>;
  selectDay: (dayId: number) => Promise<void>;
  markDayCompleted: (dayId: number) => Promise<void>;
  backfillSelectedDayId: () => Promise<void>;
  resetAll: () => Promise<void>;
  activateManualPlan: (context: TemplateContext, profile: Profile, equipment: string[], dislikedIds: Set<string>) => Promise<void>;
  syncManualPlanIfActive: (context: TemplateContext, profile: Profile, equipment: string[], dislikedIds: Set<string>, forceCardioRefreshDayIndex?: number) => Promise<{ skippedDayIndexes: number[] }>;
  startNextManualCycle: (context: TemplateContext, profile: Profile, equipment: string[], dislikedIds: Set<string>) => Promise<void>;
  backToAutoPlan: (profile: Profile) => Promise<void>;
}

async function getSelectedDayId(): Promise<number | null> {
  const rows = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, SELECTED_DAY_KEY));
  if (!rows[0]) return null;
  const parsed = Number(rows[0].value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function saveSelectedDayId(dayId: number): Promise<void> {
  await db
    .insert(gamificationMeta)
    .values({ key: SELECTED_DAY_KEY, value: String(dayId) })
    .onConflictDoUpdate({ target: gamificationMeta.key, set: { value: String(dayId) } });
}

// Primer precedente en el proyecto de un ARRAY dentro de gamification_meta
// (PASO 0-TER, punto 3: sin precedente previo en esta tabla — JSON.stringify/
// parse sí es patrón establecido en otras tablas, ej. profile.equipment).
// Un JSON corrupto o con un formato antiguo cae a array vacío en vez de
// romper el arranque de la app.
async function getCompletedDayIds(): Promise<number[]> {
  const rows = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, COMPLETED_DAYS_KEY));
  if (!rows[0]) return [];
  try {
    const parsed = JSON.parse(rows[0].value);
    return Array.isArray(parsed) ? parsed.filter((n): n is number => typeof n === 'number') : [];
  } catch {
    return [];
  }
}

async function saveCompletedDayIds(dayIds: number[]): Promise<void> {
  const value = JSON.stringify(dayIds);
  await db
    .insert(gamificationMeta)
    .values({ key: COMPLETED_DAYS_KEY, value })
    .onConflictDoUpdate({ target: gamificationMeta.key, set: { value } });
}

// Único punto de verdad para "¿este día ya está completo?" — reutilizado en
// selectDay, advanceToNextDay y OtherDayCard (training.tsx). No reimplementar
// el .includes() por separado en ninguno de los tres.
export function isDayCompleted(dayId: number, completedDayIds: number[]): boolean {
  return completedDayIds.includes(dayId);
}

// #34: cuántos de los días entrenables reales están completos al 100% en el
// ciclo actual. Única fuente para "¿semana completada?" y para el contador
// "Día X de Y" en las 2 pantallas que lo muestran (training.tsx y
// TodayBanner.tsx) — antes se usaba daysFinishedThisWeek, que cuenta
// SESIONES terminadas, no días distintos, y podía cerrar la semana (o pasar
// del total) repitiendo el mismo día. Reutiliza isDayCompleted (Paso 2c),
// no reimplementa el .includes().
export function countCompletedTrainableDays(
  trainableDays: StoredPlanDay[],
  completedDayIds: number[],
): number {
  return trainableDays.filter(d => isDayCompleted(d.dbId, completedDayIds)).length;
}

// #36: filas de plan_days que ya no pertenecen a ningún plan activo Y que
// ningún workout_sessions.plan_day_id referencia — se acumulan sin límite en
// cada generateAndSavePlan()/activateManualPlan() (ninguno de los 2 borra los
// días del plan que acaba de desactivar). El cálculo se hace en JS (3 SELECT +
// diferencia de conjuntos) en vez de un DELETE con subquery NOT IN: si algún
// workout_sessions.plan_day_id es NULL (columna nullable en el schema), un
// `NOT IN` con NULL en la lista evaluaría a "unknown" para TODAS las filas por
// la lógica de 3 valores de SQL, y el borrado nunca borraría nada — sin error
// visible. Se hace select-de-los-ids-a-borrar antes del delete (mismo patrón
// que ya usa generateAndSavePlan con savedDayRows) para poder devolver un
// conteo real, ya que ningún punto del proyecto depende hoy del valor de
// retorno de db.delete(...) para contar filas afectadas.
async function cleanupOrphanedPlanDays(): Promise<number> {
  const inactivePlans = await db.select({ id: workoutPlans.id }).from(workoutPlans).where(eq(workoutPlans.isActive, 0));
  if (inactivePlans.length === 0) return 0;
  const inactivePlanIds = inactivePlans.map(p => p.id);

  const candidateDays = await db.select({ id: planDays.id }).from(planDays).where(inArray(planDays.planId, inactivePlanIds));
  if (candidateDays.length === 0) return 0;
  const candidateDayIds = candidateDays.map(d => d.id);

  const sessionsOnCandidates = await db
    .select({ planDayId: workoutSessions.planDayId })
    .from(workoutSessions)
    .where(inArray(workoutSessions.planDayId, candidateDayIds));
  const usedDayIds = new Set(
    sessionsOnCandidates.map(s => s.planDayId).filter((id): id is number => id !== null),
  );

  const orphanedIds = candidateDayIds.filter(id => !usedDayIds.has(id));
  if (orphanedIds.length === 0) return 0;

  await db.delete(planDays).where(inArray(planDays.id, orphanedIds));
  return orphanedIds.length;
}

// Único punto de resolución por id, mismo fallback en todos lados: si el id
// guardado no aparece entre los días entrenables (borrado, o un día que se
// quedó sin ejercicios tras editar la plantilla manual), cae al primer día
// entrenable sin preguntar nada.
export function getSelectedDay(
  selectedDayId: number | null,
  trainableDays: StoredPlanDay[],
): { day: StoredPlanDay; index: number } {
  if (selectedDayId !== null) {
    const idx = trainableDays.findIndex(d => d.dbId === selectedDayId);
    if (idx !== -1) return { day: trainableDays[idx], index: idx };
  }
  // TODO Paso 2: reemplazar por diálogo de elección en el punto exacto del fallback.
  return { day: trainableDays[0], index: 0 };
}

// activeDayIndex (compat): posición del día resuelto (mismo fallback de
// getSelectedDay) dentro del array COMPLETO de días, no solo los
// entrenables — así es como lo consumen WorkoutCard.tsx/TodayBanner.tsx
// (`days[activeDayIndex % days.length]`).
function deriveActiveDayIndex(days: StoredPlanDay[], selectedDayId: number | null): number {
  const trainableDays = days.filter(d => d.exercises.length > 0);
  if (trainableDays.length === 0) return 0;
  const { day: resolvedDay } = getSelectedDay(selectedDayId, trainableDays);
  const idx = days.findIndex(d => d.dbId === resolvedDay.dbId);
  return idx !== -1 ? idx : 0;
}

function mapDayRows(dayRows: (typeof planDays.$inferSelect)[]): StoredPlanDay[] {
  return dayRows
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map(d => ({
      dbId: d.id,
      dayIndex: d.dayIndex,
      dayType: d.dayType as DayType,
      exercises: JSON.parse(d.exercises) as PlannedExercise[],
      cardio: d.cardio === '[]' ? { gym: [], homeSessions: [] } : JSON.parse(d.cardio) as CardioPlan,
    }));
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentPlan: null,
  isGenerating: false,
  isLoaded: false,

  loadCurrentPlan: async () => {
    if (get().isLoaded) return;
    try {
      const plans = await db
        .select()
        .from(workoutPlans)
        .where(eq(workoutPlans.isActive, 1))
        .orderBy(desc(workoutPlans.id))
        .limit(1);

      if (!plans[0]) {
        set({ isLoaded: true });
        return;
      }

      const plan = plans[0];
      const dayRows = await db
        .select()
        .from(planDays)
        .where(eq(planDays.planId, plan.id));

      const days = mapDayRows(dayRows);
      const selectedDayId = await getSelectedDayId();
      const completedDayIds = await getCompletedDayIds();

      set({
        currentPlan: {
          id: plan.id,
          goalPrimary: plan.goalPrimary,
          goalSecondary: plan.goalSecondary,
          daysPerWeek: plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          selectedDayId,
          activeDayIndex: deriveActiveDayIndex(days, selectedDayId),
          days,
          source: plan.source as 'auto' | 'manual',
          context: plan.context as 'gym' | 'home' | null,
          completedDayIds,
        },
        isLoaded: true,
      });
    } catch (e: unknown) {
      // Migración aún no aplicada — _layout.tsx lo reintentará tras migrationsReady
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('no such table')) return;
      throw e;
    }
  },

  generateAndSavePlan: async (profile: Profile) => {
    set({ isGenerating: true });
    try {
      // Genera el plan en memoria ANTES de tocar la DB. Si falla aquí, no
      // hay nada que limpiar: los planes existentes siguen intactos.
      const plan = await generatePlan(profile);

      let savedPlan: typeof workoutPlans.$inferSelect | null = null;
      let savedDayRows: (typeof planDays.$inferSelect)[] = [];

      try {
        await db.insert(workoutPlans).values({
          goalPrimary:       plan.goalPrimary,
          goalSecondary:     plan.goalSecondary,
          daysPerWeek:       plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          isActive:          1,
          generatedAt:       plan.generatedAt,
        });

        [savedPlan] = await db
          .select()
          .from(workoutPlans)
          .where(eq(workoutPlans.isActive, 1))
          .orderBy(desc(workoutPlans.id))
          .limit(1);

        for (const day of plan.days) {
          await db.insert(planDays).values({
            planId:    savedPlan.id,
            dayIndex:  day.dayIndex,
            dayType:   day.dayType,
            exercises: JSON.stringify(day.exercises),
            cardio:    JSON.stringify(day.cardio),
          });
        }

        // Releer las filas insertadas para obtener sus IDs de BD
        savedDayRows = await db
          .select()
          .from(planDays)
          .where(eq(planDays.planId, savedPlan.id));
      } catch (err) {
        // Limpieza: el plan viejo NUNCA se tocó, así que basta con borrar
        // los restos huérfanos del plan nuevo que falló a medias.
        if (savedPlan) {
          await db.delete(planDays).where(eq(planDays.planId, savedPlan.id));
          await db.delete(workoutPlans).where(eq(workoutPlans.id, savedPlan.id));
        } else {
          // El insert pudo haber tenido éxito aunque el select posterior fallara.
          // Usamos generatedAt (disponible desde antes del insert) como respaldo
          // para no dejar un plan huérfano sin referencia.
          const orphans = await db.select().from(workoutPlans).where(eq(workoutPlans.generatedAt, plan.generatedAt));
          for (const orphan of orphans) {
            await db.delete(planDays).where(eq(planDays.planId, orphan.id));
            await db.delete(workoutPlans).where(eq(workoutPlans.id, orphan.id));
          }
        }
        throw err;
      }

      if (!savedPlan) throw new Error('generateAndSavePlan: savedPlan no se asignó tras la inserción');

      // El plan nuevo + todos sus días quedaron insertados y verificados:
      // ahora sí es seguro desactivar los planes anteriores.
      await db.update(workoutPlans).set({ isActive: 0 }).where(ne(workoutPlans.id, savedPlan.id));

      const cleanedUpCount = await cleanupOrphanedPlanDays();
      console.log('[Workout] Limpieza de plan_days huérfanos:', cleanedUpCount, 'filas eliminadas');

      const days = mapDayRows(savedDayRows);
      const selectedDayId = days.find(d => d.exercises.length > 0)?.dbId ?? null;
      if (selectedDayId !== null) await saveSelectedDayId(selectedDayId);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();
      await useGamificationStore.getState().resetDaysFinishedThisWeek();
      // Paso 2c (#6+#18): un plan nuevo es un ciclo nuevo — ningún día
      // arranca ya completo. Persistido explícitamente (no basta con el
      // completedDayIds:[] del set() de abajo): si no se escribe [] aquí,
      // el próximo loadCurrentPlan() en un arranque futuro leería de vuelta
      // los ids del ciclo ANTERIOR desde gamification_meta.
      await saveCompletedDayIds([]);

      set({
        currentPlan: {
          id:                savedPlan.id,
          goalPrimary:       plan.goalPrimary,
          goalSecondary:     plan.goalSecondary,
          daysPerWeek:       plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          selectedDayId,
          activeDayIndex:    deriveActiveDayIndex(days, selectedDayId),
          days,
          source: savedPlan.source as 'auto' | 'manual',
          context: savedPlan.context as 'gym' | 'home' | null,
          completedDayIds: [],
        },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  replaceExercise: async (dayDbId: number, exerciseIndex: number, newExerciseId: string, profile: Profile) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const targetDay = currentPlan.days.find(d => d.dbId === dayDbId);
    if (!targetDay) return;

    const newExercise = EXERCISES.find(e => e.id === newExerciseId);
    if (!newExercise) return;

    const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
    const [rebuilt] = buildPlanned(
      [newExercise],
      newExercise.isCompound ? scheme.compoundSets  : scheme.isolationSets,
      newExercise.isCompound ? scheme.compoundReps  : scheme.isolationReps,
      newExercise.isCompound ? scheme.compoundRest  : scheme.isolationRest,
      newExercise.isCompound,
    );

    const updatedExercises = targetDay.exercises.map((ex, i) =>
      i === exerciseIndex ? rebuilt : ex,
    );

    await db
      .update(planDays)
      .set({ exercises: JSON.stringify(updatedExercises) })
      .where(eq(planDays.id, dayDbId));

    set({
      currentPlan: {
        ...currentPlan,
        days: currentPlan.days.map(d =>
          d.dbId === dayDbId ? { ...d, exercises: updatedExercises } : d,
        ),
      },
    });
  },

  // Recibe el dbId del día que se acaba de entrenar (planDayId de la
  // sesión, estable incluso si el filtro E-3/rutina ancla sustituyó los
  // ejercicios — ver resolveEffectiveDay en training.tsx) y avanza al
  // siguiente día entrenable EN ORDEN (currentPlan.days ya viene ordenado
  // por dayIndex ascendente desde mapDayRows). Mismo comportamiento
  // observable que el índice ciego anterior: siempre avanza uno, con
  // vuelta al principio al llegar al final.
  advanceToNextDay: async (justTrainedDayId: number | null) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const trainableDays = currentPlan.days.filter(d => d.exercises.length > 0);
    if (trainableDays.length === 0) return;

    const idx = justTrainedDayId !== null
      ? trainableDays.findIndex(d => d.dbId === justTrainedDayId)
      : -1;
    if (idx === -1) {
      if (justTrainedDayId === null) {
        console.warn('[Workout] advanceToNextDay: justTrainedDayId es null — cae a nextIdx=0. trainableDays:', trainableDays.map(d => d.dbId));
      } else {
        console.warn('[Workout] advanceToNextDay: justTrainedDayId', justTrainedDayId, 'no encontrado en trainableDays — cae a nextIdx=0. trainableDays:', trainableDays.map(d => d.dbId));
      }
    }
    // Paso 2c (#6+#18): el índice "siguiente" de siempre es el punto de
    // partida de una búsqueda cíclica del primer día NO completo (los días
    // parciales sí califican — solo se salta los que llegaron al 100%).
    // Si tras recorrer las trainableDays.length posiciones ninguno califica
    // (los completó todos), nextDay se queda en su valor inicial — el mismo
    // fallback ciego de siempre, sin lanzar error ni dejar de avanzar.
    const baseIdx = idx !== -1 ? (idx + 1) % trainableDays.length : 0;
    let nextDay = trainableDays[baseIdx];
    for (let step = 0; step < trainableDays.length; step++) {
      const candidate = trainableDays[(baseIdx + step) % trainableDays.length];
      if (!isDayCompleted(candidate.dbId, currentPlan.completedDayIds)) {
        nextDay = candidate;
        break;
      }
    }

    await saveSelectedDayId(nextDay.dbId);
    set({
      currentPlan: {
        ...currentPlan,
        selectedDayId: nextDay.dbId,
        activeDayIndex: deriveActiveDayIndex(currentPlan.days, nextDay.dbId),
      },
    });
  },

  // Selección directa por el usuario (Paso 2b) — persiste el id elegido
  // sin recorrer trainableDays buscando "el siguiente" (a diferencia de
  // advanceToNextDay). El llamador (OtherDayCard en training.tsx) ya
  // garantiza que dayId pertenece a un día entrenable real, porque solo
  // se ofrece a elegir desde esa lista.
  //
  // Paso 2c (#6+#18): si el día ya llegó al 100% en este ciclo, no hace
  // nada — ni escritura ni set(). OtherDayCard ya no ofrece el botón de
  // selección para un día completo (ver training.tsx), así que este guard
  // es una segunda barrera, no el mecanismo principal — deja rastro con
  // console.warn si algo llega a llamarlo de todas formas.
  selectDay: async (dayId: number) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    if (isDayCompleted(dayId, currentPlan.completedDayIds)) {
      console.warn('[Workout] selectDay: día', dayId, 'ya completo — ignorado');
      return;
    }

    await saveSelectedDayId(dayId);
    set({
      currentPlan: {
        ...currentPlan,
        selectedDayId: dayId,
        activeDayIndex: deriveActiveDayIndex(currentPlan.days, dayId),
      },
    });
  },

  // Paso 2c (#6+#18): marca un día como completo al 100% en el ciclo
  // actual. Idempotente (no duplica si ya estaba). Llamada desde
  // doFinish() en session.tsx con el mismo criterio que ya usa `perfect`
  // (plannedSets > 0 && completedSets >= plannedSets).
  markDayCompleted: async (dayId: number) => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    if (isDayCompleted(dayId, currentPlan.completedDayIds)) return;

    const nextCompleted = [...currentPlan.completedDayIds, dayId];
    await saveCompletedDayIds(nextCompleted);
    set({
      currentPlan: {
        ...currentPlan,
        completedDayIds: nextCompleted,
      },
    });
  },

  resetAll: async () => {
    await db.delete(planDays);
    await db.delete(workoutPlans);
    set({ currentPlan: null, isLoaded: false });
  },

  // Activa (crea o reactiva) el plan manual de un contexto — único punto de
  // entrada al modo manual para ese contexto. Reutiliza el plan manual ya
  // existente de este contexto si lo hay (findManualPlan), en vez de crear
  // uno nuevo cada vez: eso preserva progresión/historial ligados a
  // plan_days.id entre activaciones sucesivas, igual que generateAndSavePlan
  // preserva el id del plan automático mientras no se regenera desde cero.
  activateManualPlan: async (context, profile, equipment, dislikedIds) => {
    set({ isGenerating: true });
    try {
      const templateDays = await getTemplate(context);
      if (templateDays.length === 0) {
        throw new Error(`activateManualPlan: la plantilla de contexto '${context}' está vacía — nada que activar`);
      }

      const generatedAtNew = Date.now();
      let targetPlan = await findManualPlan(context);

      if (targetPlan) {
        await db
          .update(workoutPlans)
          .set({ generatedAt: generatedAtNew })
          .where(eq(workoutPlans.id, targetPlan.id));
      } else {
        await db.insert(workoutPlans).values({
          goalPrimary:       profile.goalPrimary,
          goalSecondary:     profile.goalSecondary,
          daysPerWeek:       templateDays.length,
          minutesPerSession: profile.minutesPerSession,
          isActive:          1,
          generatedAt:       generatedAtNew,
          source:            'manual',
          context,
        });
        targetPlan = await findManualPlan(context);
      }
      if (!targetPlan) throw new Error('activateManualPlan: targetPlan no se pudo crear/leer tras la inserción');

      // Desactiva todos los demás planes (automático u otro contexto manual)
      // y asegura que este quede activo — cubre tanto el caso recién creado
      // (ya isActive:1 desde el insert) como la reactivación de uno que
      // pudiera estar en 0.
      await db.update(workoutPlans).set({ isActive: 0 }).where(ne(workoutPlans.id, targetPlan.id));
      await db.update(workoutPlans).set({ isActive: 1 }).where(eq(workoutPlans.id, targetPlan.id));

      // Limpieza DESPUÉS de fijar isActive:1 en targetPlan — si corriera entre
      // las 2 líneas de arriba, targetPlan mismo aparecería transitoriamente
      // como "inactivo", y un día suyo sin sesiones (ej. nunca entrenado)
      // se borraría justo antes de que materializeTemplate() lo necesite,
      // forzando un INSERT con id nuevo en vez de reutilizar el existente.
      const cleanedUpCount = await cleanupOrphanedPlanDays();
      console.log('[Workout] Limpieza de plan_days huérfanos:', cleanedUpCount, 'filas eliminadas');

      await materializeTemplate(context, profile, equipment, dislikedIds, targetPlan.id, generatedAtNew);

      const dayRows = await db.select().from(planDays).where(eq(planDays.planId, targetPlan.id));
      const days = mapDayRows(dayRows);
      const selectedDayId = days.find(d => d.exercises.length > 0)?.dbId ?? null;
      if (selectedDayId !== null) await saveSelectedDayId(selectedDayId);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();
      await useGamificationStore.getState().resetDaysFinishedThisWeek();
      // Paso 2c (#6+#18): activar (crear o reactivar) un plan manual es
      // también el INICIO de un ciclo — mismo criterio que generateAndSavePlan.
      await saveCompletedDayIds([]);

      set({
        currentPlan: {
          id:                targetPlan.id,
          goalPrimary:       targetPlan.goalPrimary,
          goalSecondary:     targetPlan.goalSecondary,
          daysPerWeek:       targetPlan.daysPerWeek,
          minutesPerSession: targetPlan.minutesPerSession,
          selectedDayId,
          activeDayIndex:    deriveActiveDayIndex(days, selectedDayId),
          days,
          source: targetPlan.source as 'auto' | 'manual',
          context: targetPlan.context as 'gym' | 'home' | null,
          completedDayIds: [],
        },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  // Sincroniza contenido tras editar un slot (Fase G2) — SOLO si el
  // contexto dado ya es el plan activo ahora mismo. Si no lo es (el usuario
  // está editando un contexto que no está corriendo), no hace nada: ni un
  // solo UPDATE, ni recarga de currentPlan. Nunca toca generatedAt —
  // distinto de activateManualPlan/startNextManualCycle, que sí lo hacen
  // porque esos dos representan el INICIO de un ciclo, no una edición de
  // contenido dentro de uno ya en marcha.
  syncManualPlanIfActive: async (context, profile, equipment, dislikedIds, forceCardioRefreshDayIndex) => {
    set({ isGenerating: true });
    try {
      const [activePlan] = await db
        .select()
        .from(workoutPlans)
        .where(eq(workoutPlans.isActive, 1))
        .orderBy(desc(workoutPlans.id))
        .limit(1);

      if (!activePlan) return { skippedDayIndexes: [] };
      if (activePlan.source !== 'manual' || activePlan.context !== context) return { skippedDayIndexes: [] };

      const { skippedDayIndexes } = await materializeTemplate(context, profile, equipment, dislikedIds, activePlan.id, activePlan.generatedAt, forceCardioRefreshDayIndex);

      const dayRows = await db.select().from(planDays).where(eq(planDays.planId, activePlan.id));
      const days = mapDayRows(dayRows);
      set(state => ({
        currentPlan: state.currentPlan
          ? { ...state.currentPlan, days, activeDayIndex: deriveActiveDayIndex(days, state.currentPlan.selectedDayId) }
          : state.currentPlan,
      }));

      return { skippedDayIndexes };
    } finally {
      set({ isGenerating: false });
    }
  },

  // Arranca el siguiente ciclo del plan manual YA activo (botón "semana
  // completada" en modo manual) — no busca ni crea ningún plan, asume que
  // activateManualPlan ya lo dejó activo antes. Lanza si esa premisa no se
  // cumple: es una defensa de backend, no debería alcanzarse desde la UI.
  startNextManualCycle: async (context, profile, equipment, dislikedIds) => {
    set({ isGenerating: true });
    try {
      const [activePlan] = await db
        .select()
        .from(workoutPlans)
        .where(eq(workoutPlans.isActive, 1))
        .orderBy(desc(workoutPlans.id))
        .limit(1);

      if (!activePlan || activePlan.source !== 'manual' || activePlan.context !== context) {
        throw new Error(`startNextManualCycle: no hay plan manual activo para el contexto '${context}'`);
      }

      const generatedAtNew = Date.now();
      await db.update(workoutPlans).set({ generatedAt: generatedAtNew }).where(eq(workoutPlans.id, activePlan.id));

      await materializeTemplate(context, profile, equipment, dislikedIds, activePlan.id, generatedAtNew);

      const dayRows = await db.select().from(planDays).where(eq(planDays.planId, activePlan.id));
      const days = mapDayRows(dayRows);
      const selectedDayId = days.find(d => d.exercises.length > 0)?.dbId ?? null;
      if (selectedDayId !== null) await saveSelectedDayId(selectedDayId);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();
      await useGamificationStore.getState().resetDaysFinishedThisWeek();
      // Paso 2c (#6+#18): "generar próxima semana" en modo manual también
      // arranca un ciclo nuevo — mismo criterio que las otras 2 funciones.
      await saveCompletedDayIds([]);

      set({
        currentPlan: {
          id:                activePlan.id,
          goalPrimary:       activePlan.goalPrimary,
          goalSecondary:     activePlan.goalSecondary,
          daysPerWeek:       activePlan.daysPerWeek,
          minutesPerSession: activePlan.minutesPerSession,
          selectedDayId,
          activeDayIndex:    deriveActiveDayIndex(days, selectedDayId),
          days,
          source: activePlan.source as 'auto' | 'manual',
          context: activePlan.context as 'gym' | 'home' | null,
          completedDayIds: [],
        },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  // Punto 4 — "Volver al plan automático" (antes vivía solo en profile.tsx,
  // ahora es una acción de store para poder disparase también desde
  // routineBuilder.tsx y training.tsx sin duplicar la llamada a
  // generateAndSavePlan). currentPlan.source vuelve a 'auto' solo porque
  // generateAndSavePlan() siempre crea un plan nuevo con source='auto'
  // (default del schema) — no hace falta ningún flag aparte para marcarlo.
  backToAutoPlan: async (profile) => {
    await get().generateAndSavePlan(profile);
  },

  // Backfill único — instalaciones de antes de este refactor tienen el
  // contador ciego bajo ACTIVE_DAY_KEY pero nunca escribieron
  // SELECTED_DAY_KEY. Traduce el índice viejo al id real del día
  // equivalente con la MISMA fórmula que training.tsx usaba para decidir
  // "hoy" (índice % trainableDays.length), una sola vez — no vuelve a
  // correr en arranques siguientes porque SELECTED_DAY_KEY ya queda
  // escrito. No borra la clave vieja (mismo criterio que el backfill de
  // auth_user_id en _layout.tsx, por si hay que revertir).
  backfillSelectedDayId: async () => {
    const alreadyMigrated = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, SELECTED_DAY_KEY));
    if (alreadyMigrated[0]) return;

    const oldRows = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, ACTIVE_DAY_KEY));
    if (!oldRows[0]) return;

    const { currentPlan } = get();
    if (!currentPlan) return;

    const trainableDays = currentPlan.days.filter(d => d.exercises.length > 0);
    if (trainableDays.length === 0) return;

    const oldIndex = Number(oldRows[0].value ?? 0);
    const equivDay = trainableDays[oldIndex % trainableDays.length];

    await saveSelectedDayId(equivDay.dbId);
    set({
      currentPlan: {
        ...currentPlan,
        selectedDayId: equivDay.dbId,
        activeDayIndex: deriveActiveDayIndex(currentPlan.days, equivDay.dbId),
      },
    });
  },
}));
