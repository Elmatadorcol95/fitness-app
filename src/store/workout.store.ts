import { create } from 'zustand';
import { desc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { gamificationMeta, planDays, workoutPlans } from '@/db/schema';
import { generatePlan, type PlannedExercise, type DayType } from '@/lib/plan-generator';
import type { CardioPlan } from '@/lib/cardioSelection';
import { materializeTemplate, findManualPlan } from '@/lib/routineMaterializer';
import { getTemplate, type TemplateContext } from '@/lib/routineTemplates';
import { useGamificationStore } from './gamification.store';
import { useProfileStore } from './profile.store';
import type { Profile } from '@/db/schema';

const ACTIVE_DAY_KEY = 'workout_active_day_index';

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
  activeDayIndex: number;
  source: 'auto' | 'manual';
  context: 'gym' | 'home' | null;
}

interface WorkoutState {
  currentPlan: StoredPlan | null;
  isGenerating: boolean;
  isLoaded: boolean;
  loadCurrentPlan: () => Promise<void>;
  generateAndSavePlan: (profile: Profile) => Promise<void>;
  replaceExercise: (dayDbId: number, exerciseIndex: number, newExerciseId: string) => Promise<void>;
  advanceDayIndex: () => Promise<void>;
  resetAll: () => Promise<void>;
  activateManualPlan: (context: TemplateContext, profile: Profile, equipment: string[], dislikedIds: Set<string>) => Promise<void>;
  syncManualPlanIfActive: (context: TemplateContext, profile: Profile, equipment: string[], dislikedIds: Set<string>) => Promise<{ skippedDayIndexes: number[] }>;
  startNextManualCycle: (context: TemplateContext, profile: Profile, equipment: string[], dislikedIds: Set<string>) => Promise<void>;
  backToAutoPlan: (profile: Profile) => Promise<void>;
}

async function getActiveDayIndex(): Promise<number> {
  const rows = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, ACTIVE_DAY_KEY));
  return Number(rows[0]?.value ?? 0);
}

async function saveActiveDayIndex(value: number): Promise<void> {
  await db
    .insert(gamificationMeta)
    .values({ key: ACTIVE_DAY_KEY, value: String(value) })
    .onConflictDoUpdate({ target: gamificationMeta.key, set: { value: String(value) } });
}

function mapDayRows(dayRows: (typeof planDays.$inferSelect)[]): StoredPlanDay[] {
  return dayRows
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map(d => ({
      dbId: d.id,
      dayIndex: d.dayIndex,
      dayType: d.dayType as DayType,
      exercises: JSON.parse(d.exercises) as PlannedExercise[],
      cardio: JSON.parse(d.cardio) as CardioPlan,
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

      const activeDayIndex = await getActiveDayIndex();

      set({
        currentPlan: {
          id: plan.id,
          goalPrimary: plan.goalPrimary,
          goalSecondary: plan.goalSecondary,
          daysPerWeek: plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          activeDayIndex,
          days: mapDayRows(dayRows),
          source: plan.source as 'auto' | 'manual',
          context: plan.context as 'gym' | 'home' | null,
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

      await saveActiveDayIndex(0);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();
      await useGamificationStore.getState().resetDaysFinishedThisWeek();

      set({
        currentPlan: {
          id:                savedPlan.id,
          goalPrimary:       plan.goalPrimary,
          goalSecondary:     plan.goalSecondary,
          daysPerWeek:       plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          activeDayIndex:    0,
          days: mapDayRows(savedDayRows),
          source: savedPlan.source as 'auto' | 'manual',
          context: savedPlan.context as 'gym' | 'home' | null,
        },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  replaceExercise: async (dayDbId: number, exerciseIndex: number, newExerciseId: string) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const targetDay = currentPlan.days.find(d => d.dbId === dayDbId);
    if (!targetDay) return;

    const updatedExercises = targetDay.exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, exerciseId: newExerciseId } : ex,
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

  advanceDayIndex: async () => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const next = currentPlan.activeDayIndex + 1;
    await saveActiveDayIndex(next);
    set({ currentPlan: { ...currentPlan, activeDayIndex: next } });
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

      await materializeTemplate(context, profile, equipment, dislikedIds, targetPlan.id, generatedAtNew);

      await saveActiveDayIndex(0);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();
      await useGamificationStore.getState().resetDaysFinishedThisWeek();

      const dayRows = await db.select().from(planDays).where(eq(planDays.planId, targetPlan.id));
      set({
        currentPlan: {
          id:                targetPlan.id,
          goalPrimary:       targetPlan.goalPrimary,
          goalSecondary:     targetPlan.goalSecondary,
          daysPerWeek:       targetPlan.daysPerWeek,
          minutesPerSession: targetPlan.minutesPerSession,
          activeDayIndex:    0,
          days: mapDayRows(dayRows),
          source: targetPlan.source as 'auto' | 'manual',
          context: targetPlan.context as 'gym' | 'home' | null,
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
  syncManualPlanIfActive: async (context, profile, equipment, dislikedIds) => {
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

      const { skippedDayIndexes } = await materializeTemplate(context, profile, equipment, dislikedIds, activePlan.id, activePlan.generatedAt);

      const dayRows = await db.select().from(planDays).where(eq(planDays.planId, activePlan.id));
      set(state => ({
        currentPlan: state.currentPlan
          ? { ...state.currentPlan, days: mapDayRows(dayRows) }
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

      await saveActiveDayIndex(0);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();
      await useGamificationStore.getState().resetDaysFinishedThisWeek();

      const dayRows = await db.select().from(planDays).where(eq(planDays.planId, activePlan.id));
      set({
        currentPlan: {
          id:                activePlan.id,
          goalPrimary:       activePlan.goalPrimary,
          goalSecondary:     activePlan.goalSecondary,
          daysPerWeek:       activePlan.daysPerWeek,
          minutesPerSession: activePlan.minutesPerSession,
          activeDayIndex:    0,
          days: mapDayRows(dayRows),
          source: activePlan.source as 'auto' | 'manual',
          context: activePlan.context as 'gym' | 'home' | null,
        },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  // Punto 4 — "Volver al plan automático" (antes vivía solo en profile.tsx,
  // ahora es una acción de store para poder disparase también desde
  // routineBuilder.tsx y training.tsx sin duplicar la secuencia
  // setPlanMode('auto') + generateAndSavePlan).
  backToAutoPlan: async (profile) => {
    await useProfileStore.getState().setPlanMode('auto');
    await get().generateAndSavePlan(profile);
  },
}));
