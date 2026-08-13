import { create } from 'zustand';
import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { exerciseTargets, workoutSessions, sessionSets, exerciseRestPrefs, workoutPlans } from '@/db/schema';
import type { Profile } from '@/db/schema';
import { hapticsLight, hapticsSuccess } from '@/lib/haptics';
import { playRestDone } from '@/lib/sounds';
import { scheduleRestDoneNotification, cancelScheduledNotification } from '@/lib/notifications';
import { runProgressionAfterSession } from '@/lib/progression';
import { EXERCISES } from '@/lib/exercises';
import { getEquipLocal, EQUIP_INC, type EquipLocal } from '@/lib/equipmentClassification';
import { markExerciseUsed } from '@/lib/muscleUsage';
import type { CardioPlan } from '@/lib/cardioSelection';
import { getRepScheme, buildPlanned, type DayType, type GoalKey } from '@/lib/plan-generator';
import type { StoredPlanDay } from './workout.store';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SetState {
  setNumber: number;
  targetReps: number;
  actualReps: number;
  weightKg: number;
  rir: number;
  completed: boolean;
  coachReason?: string;
  // Étapa 3 (#6+#18): true solo en una serie restaurada de una sesión
  // anterior de ESTE ciclo (ver getRestoredSets/startSession). Ausente/false
  // en cualquier serie normal — mismo patrón opcional que coachReason.
  isRestored?: boolean;
}

export interface ExerciseState {
  exerciseId: string;
  restSeconds: number;
  sets: SetState[];
  note: string;
  lastReps: number | null;
  lastWeightKg: number | null;
  planRepsMin: number;
  planRepsMax: number;
  planSets: number;
  targetRir: number;
}

interface SessionStore {
  isActive: boolean;
  planId: number | null;
  planDayId: number | null;
  startTime: number | null;
  currentExerciseIdx: number;
  exercises: ExerciseState[];
  restTimerSeconds: number;
  restTimerRunning: boolean;
  restTimerEndAt: number | null;
  trainingContext: 'gym' | 'home' | null;
  cardio: CardioPlan;
  sessionDayType: DayType | null;

  startSession: (planId: number, day: StoredPlanDay) => Promise<void>;
  setTrainingContext: (ctx: 'gym' | 'home' | null) => void;
  setCurrentExercise: (idx: number) => void;
  updateSetField: (exIdx: number, setIdx: number, field: 'actualReps' | 'weightKg' | 'rir', value: number) => void;
  completeSet: (exIdx: number, setIdx: number) => void;
  addSet: (exIdx: number) => void;
  removeSet: (exIdx: number) => void;
  updateNote: (exIdx: number, note: string) => void;
  adjustRest: (exIdx: number, delta: number) => void;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  tickRestTimer: () => void;
  // #27: programa/cancela la notificación local de fin de descanso. title/body
  // ya vienen traducidos del llamador (session.tsx) — ningún store del proyecto
  // importa i18n hoy (confirmado por auditoría, sin precedente), así que la
  // traducción se queda en la capa de UI; el store solo decide SI corresponde
  // programar (mirando restTimerRunning/restTimerEndAt) y llama al módulo de
  // notificaciones, igual que ya hace con playRestDone/hapticsSuccess.
  scheduleRestNotification: (title: string, body: string) => Promise<string | null>;
  cancelRestNotification: (id: string | null) => Promise<void>;
  finishSession: () => Promise<{ hasPR: boolean; completedSets: number; plannedSets: number }>;
  cancelSession: () => void;
  replaceExercise: (exIdx: number, newExerciseId: string, profile: Profile) => Promise<void>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseRepsString(repsStr: string): { min: number; max: number } {
  const parts = repsStr.split('-');
  const min   = parseInt(parts[0] ?? '8', 10);
  const max   = parseInt(parts[1] ?? parts[0] ?? '12', 10);
  return { min: isNaN(min) ? 8 : min, max: isNaN(max) ? min : max };
}

const LOADED_REST = new Set(['barbellPlates', 'dumbbells', 'kettlebells', 'weightedVest', 'cableMachine', 'legPressMachine']);

// Calcula el descanso por defecto según el tipo de ejercicio
function computeDefaultRest(exerciseId: string, planRestSeconds: number): number {
  // Si el plan tiene un valor sensato (distinto del genérico 90), respetarlo
  if (planRestSeconds > 0 && planRestSeconds !== 90) return planRestSeconds;
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return 90;
  const isLoaded = ex.equipment.some(e => LOADED_REST.has(e));
  if (ex.isCompound && ex.equipment.includes('barbellPlates')) return 180; // compuesto pesado
  if (ex.isCompound && isLoaded)                                return 120; // compuesto cargado
  if (ex.isCompound)                                            return 90;  // compuesto peso corporal
  return 60; // aislamiento
}

async function getCustomRest(exerciseId: string): Promise<number | null> {
  try {
    const rows = await db.select().from(exerciseRestPrefs).where(eq(exerciseRestPrefs.exerciseId, exerciseId));
    return rows[0]?.restSeconds ?? null;
  } catch { return null; }
}

async function saveCustomRest(exerciseId: string, restSeconds: number): Promise<void> {
  try {
    await db.insert(exerciseRestPrefs)
      .values({ exerciseId, restSeconds, updatedAt: Date.now() })
      .onConflictDoUpdate({ target: exerciseRestPrefs.exerciseId, set: { restSeconds, updatedAt: Date.now() } });
  } catch {}
}

async function getLastSetData(exerciseId: string): Promise<{ reps: number | null; weightKg: number | null }> {
  try {
    const rows = await db
      .select({ actualReps: sessionSets.actualReps, weightKg: sessionSets.weightKg })
      .from(sessionSets)
      .where(and(eq(sessionSets.exerciseId, exerciseId), eq(sessionSets.completed, 1)))
      .orderBy(desc(sessionSets.createdAt))
      .limit(1);
    return { reps: rows[0]?.actualReps ?? null, weightKg: rows[0]?.weightKg ?? null };
  } catch {
    return { reps: null, weightKg: null };
  }
}

async function getTargetFromProgression(exerciseId: string): Promise<{ weightKg: number | null; repsMin: number | null; targetRir: number | null }> {
  try {
    const rows = await db
      .select({ targetWeightKg: exerciseTargets.targetWeightKg, targetRepsMin: exerciseTargets.targetRepsMin, targetRir: exerciseTargets.targetRir })
      .from(exerciseTargets)
      .where(eq(exerciseTargets.exerciseId, exerciseId))
      .limit(1);
    return { weightKg: rows[0]?.targetWeightKg ?? null, repsMin: rows[0]?.targetRepsMin ?? null, targetRir: rows[0]?.targetRir ?? null };
  } catch {
    return { weightKg: null, repsMin: null, targetRir: null };
  }
}

// Étapa 3 (#6+#18): busca series ya completadas en sesiones ANTERIORES de
// este mismo ciclo para el mismo día de plan (day.dbId), para restaurarlas
// como de solo lectura al reabrir un día parcial. Modo automático: los
// plan_days.dbId nunca se repiten entre ciclos (confirmado en auditoría
// previa), así que cualquier sesión con este planDayId es válida sin más
// filtro. Modo manual: plan_days SÍ se reutiliza entre ciclos
// (materializeTemplate), así que se filtra además por
// workout_sessions.created_at >= generatedAt del plan activo — mismo
// cycleStart que ya usa hasSessionForPlanDay en routineMaterializer.ts.
// Lookup por "exerciseId:setNumber" — si el mismo par aparece en más de una
// fila (raro), se queda con la última que gane la iteración, sin desambiguar.
async function getRestoredSets(
  planDayId: number,
  planId: number,
): Promise<Map<string, { actualReps: number; weightKg: number; rir: number }>> {
  const map = new Map<string, { actualReps: number; weightKg: number; rir: number }>();
  try {
    const [planRow] = await db
      .select({ source: workoutPlans.source, generatedAt: workoutPlans.generatedAt })
      .from(workoutPlans)
      .where(eq(workoutPlans.id, planId))
      .limit(1);

    const conditions = [eq(workoutSessions.planDayId, planDayId), eq(sessionSets.completed, 1)];
    if (planRow?.source === 'manual') {
      conditions.push(gte(workoutSessions.createdAt, planRow.generatedAt));
    }

    const rows = await db
      .select({
        exerciseId:      sessionSets.exerciseId,
        setNumber:       sessionSets.setNumber,
        actualReps:      sessionSets.actualReps,
        weightKg:        sessionSets.weightKg,
        perceivedEffort: sessionSets.perceivedEffort,
      })
      .from(sessionSets)
      .innerJoin(workoutSessions, eq(sessionSets.sessionId, workoutSessions.id))
      .where(and(...conditions));

    for (const row of rows) {
      map.set(`${row.exerciseId}:${row.setNumber}`, {
        actualReps: row.actualReps ?? 0,
        weightKg:   row.weightKg ?? 0,
        rir:        row.perceivedEffort ?? 0,
      });
    }
  } catch (err) {
    console.error('[Session] Error cargando series restauradas:', err);
  }
  return map;
}

function buildSetState(index: number, targetReps: number, lastWeightKg: number | null): SetState {
  return {
    setNumber: index + 1,
    targetReps,
    actualReps: targetReps,
    weightKg: lastWeightKg ?? 0,
    rir: 3, // 3 = expectativa neutra; el usuario ajusta después de cada serie
    completed: false,
  };
}

// Calcula los campos derivados (rango de reps efectivo, series
// iniciales, descanso) para UN ejercicio, a partir de sus datos crudos
// del plan y los datos ya obtenidos de progresion/ultimo set/descanso
// personalizado. Compartida entre startSession (arranque del dia
// completo) y replaceExercise (intercambio de un ejercicio a mitad de
// sesion) — evita una tercera implementacion de este calculo.
function buildExerciseState(
  planned: { exerciseId: string; reps: string; sets: number; restSeconds: number },
  progData: { weightKg: number | null; repsMin: number | null; targetRir: number | null },
  lastData: { reps: number | null; weightKg: number | null },
  customRest: number | null,
): ExerciseState {
  const { min: minReps, max: maxReps } = parseRepsString(planned.reps);
  const equip = getEquipLocal(planned.exerciseId);
  const effMin = (equip !== 'barbell' && equip !== 'bodyweight' && minReps < 8) ? 8 : minReps;
  const effMax = (equip !== 'barbell' && equip !== 'bodyweight' && maxReps < 12) ? Math.max(maxReps, 12) : maxReps;
  const targetMid = Math.round((effMin + effMax) / 2);
  const targetInit = progData.repsMin ?? targetMid;
  const restSeconds = customRest ?? computeDefaultRest(planned.exerciseId, planned.restSeconds);
  return {
    exerciseId:   planned.exerciseId,
    restSeconds,
    note:         '',
    lastReps:     lastData.reps,
    lastWeightKg: lastData.weightKg,
    planRepsMin:  effMin,
    planRepsMax:  effMax,
    planSets:     planned.sets,
    targetRir:    progData.targetRir ?? 3,
    sets: Array.from({ length: planned.sets }, (_, s) =>
      buildSetState(s, targetInit, lastData.weightKg),
    ),
  };
}

// ── Coach en tiempo real (determinista) ───────────────────────────────────────

function computeCoach(
  done: { actualReps: number; weightKg: number; rir: number },
  nextKg: number,
  nextReps: number,
  planRepsMin: number,
  planRepsMax: number,
  equip: EquipLocal,
  targetRir: number,
): { reps: number; kg: number; reason: string } | null {
  const inc = EQUIP_INC[equip];

  // ── Peso corporal ────────────────────────────────────────────────────────────
  if (equip === 'bodyweight') {
    if (done.actualReps < planRepsMin) {
      // Por debajo del minimo: bajar objetivo. NO mira el RIR a proposito —
      // fallar el rango ya es la señal mas clara posible, distinguir RIR
      // aqui añadiria complejidad sin valor real.
      const safeTarget = Math.max(Math.round(done.actualReps * 0.9), 3);
      if (safeTarget < nextReps) {
        return { reps: safeTarget, kg: 0, reason: `${done.actualReps} reps (bajo rango) → apunta a ${safeTarget}` };
      }
      return null;
    }

    if (done.actualReps >= planRepsMax) {
      // Al tope o por encima: sugerir progresión (sin cambios respecto a hoy)
      const msg = done.rir >= 2
        ? `Te quedó fácil (${done.actualReps} reps · RIR ${done.rir}) → prueba variante difícil o añade lastre`
        : `${done.actualReps} reps al límite (RIR ${done.rir}) → progresando bien`;
      return { reps: planRepsMax, kg: 0, reason: msg };
    }

    // Dentro del rango — antes SIEMPRE null. Ahora usa el RIR como segunda
    // señal, igual que ya hacen la rama generica y la rama 'assisted'.
    if (done.rir > targetRir) {
      // Sobró margen aunque las reps ya estuvieran en rango: empuja el
      // objetivo hacia el techo, sin pasarlo.
      const nextTarget = Math.min(done.actualReps + 1, planRepsMax);
      if (nextTarget > nextReps) {
        return { reps: nextTarget, kg: 0, reason: `${done.actualReps} reps · RIR ${done.rir} → sube el objetivo a ${nextTarget}` };
      }
      return null;
    }

    const serieDura = done.rir < targetRir || done.rir <= 1;
    if (serieDura) {
      return { reps: planRepsMin, kg: 0, reason: `${done.rir <= 1 ? 'Al límite' : 'Duro'} (RIR ${done.rir}) → mantén el objetivo` };
    }

    return null; // En rango y en objetivo: sin cambio
  }

  // ── Maquinas de pila con pin (machine, cable) — el incremento real de
  // cada bloque es desconocido e imposible de adivinar con fiabilidad
  // (varia por maquina/gimnasio/pais). Se describe la DIRECCION, no un
  // numero — el usuario anota el peso real que lee en la maquina.
  // kg:0 siempre a proposito: completeSet solo propaga el peso cuando
  // hint.kg > 0, asi que el campo conserva lo que ya tenia hasta que el
  // usuario lo actualice el mismo (mismo mecanismo que 'bodyweight').
  if (equip === 'machine' || equip === 'cable') {
    const serieDura = done.rir < targetRir || done.rir <= 1;

    const tooHard = done.actualReps < planRepsMin || serieDura;
    if (tooHard) {
      return { reps: Math.max(done.actualReps, planRepsMin), kg: 0, reason: `${done.actualReps} reps (RIR ${done.rir}) → baja al bloque anterior (menos peso) y anota el peso que marque` };
    }

    const tooEasy = done.actualReps >= planRepsMax || done.rir > targetRir;
    if (tooEasy) {
      return { reps: planRepsMin, kg: 0, reason: `Fácil (${done.actualReps} reps · RIR ${done.rir}) → sube al siguiente bloque (más peso) y anota el peso que marque` };
    }

    return null;
  }

  // ── Maquina asistida — mismo mecanismo de pin que arriba, pero la
  // asistencia es inversa: sube el pin = mas ayuda = mas facil.
  if (equip === 'assisted') {
    const serieDura = done.rir < targetRir || done.rir <= 1;

    const tooHard = done.actualReps < planRepsMin || serieDura;
    if (tooHard) {
      return { reps: Math.max(done.actualReps, planRepsMin), kg: 0, reason: `${done.actualReps} reps (RIR ${done.rir}) → sube al siguiente bloque (más asistencia) y anota el peso que marque` };
    }

    const tooEasy = done.actualReps >= planRepsMax || done.rir > targetRir;
    if (tooEasy) {
      // Umbral bajo: si ya casi no hay asistencia, sugerir la variante
      // sin ayuda en vez de seguir pidiendo bajar de bloque.
      if (done.weightKg <= 5) {
        return { reps: planRepsMax, kg: 0, reason: `Fácil (RIR ${done.rir}) → ya casi sin asistencia, prueba la variante sin ayuda` };
      }
      return { reps: planRepsMin, kg: 0, reason: `Fácil (${done.actualReps} reps · RIR ${done.rir}) → baja al bloque anterior (menos asistencia) y anota el peso que marque` };
    }

    return null;
  }

  // ── Ejercicio cargable ───────────────────────────────────────────────────────
  if (done.weightKg <= 0) return null;

  // Reps muy por encima del rango (>30% sobre el máx) con RIR alto → salto de peso más decidido
  const veryHighReps = done.actualReps > planRepsMax * 1.3 && done.rir >= 3;

  const effectiveReps = Math.max(done.actualReps + done.rir, 1);
  const e1rm = done.weightKg * (1 + effectiveReps / 30);

  // Peso ideal para planRepsMin con RIR objetivo 2
  const idealKg = e1rm / (1 + (planRepsMin + 2) / 30);
  const rounded  = Math.round(idealKg / inc) * inc;

  // Cap ±15% normal, ±30% cuando las reps superan ampliamente el rango
  const swingPct = veryHighReps ? 0.30 : 0.15;
  const maxSwing = Math.max(done.weightKg * swingPct, inc);
  let suggested  = Math.max(done.weightKg - maxSwing, Math.min(done.weightKg + maxSwing, rounded));
  suggested      = Math.round(suggested / inc) * inc;

  // Red de seguridad doble: relativa (más duro de lo esperado) + absoluta (fallo/casi fallo).
  // Ambas condiciones bloquean cualquier subida de peso.
  const serieDura = done.rir < targetRir || done.rir <= 1;
  if (serieDura && suggested > done.weightKg) suggested = done.weightKg;

  // Piso mínimo garantizado: si la fórmula devuelve el mismo peso (o menos) pero fue más
  // fácil de lo esperado, forzar una subida proporcional a cuánto le sobró.
  if (done.rir > targetRir && suggested <= done.weightKg) {
    const extraIncs = done.rir >= targetRir + 4 ? 3 : done.rir >= targetRir + 2 ? 2 : 1;
    suggested = Math.round((done.weightKg + extraIncs * inc) / inc) * inc;
  }

  if (suggested <= 0) return null;

  // Mensaje claro: mostrar siempre el peso DESTINO, no la dirección ambigua
  const isUp   = suggested > done.weightKg;
  const isDown = suggested < done.weightKg;

  if (done.actualReps < planRepsMin) {
    // Por debajo del rango: mantener o bajar peso
    const dir = isUp ? `sube a ${suggested} kg` : isDown ? `baja a ${suggested} kg` : `mantén ${suggested} kg`;
    return { reps: planRepsMin, kg: suggested, reason: `${done.actualReps} reps (bajo mín ${planRepsMin}) → ${dir}` };
  }

  if (done.actualReps > planRepsMax) {
    // Por encima del rango
    if (isUp) {
      return { reps: planRepsMin, kg: suggested, reason: `${done.actualReps} reps (sobre máx · RIR ${done.rir}) → sube a ${suggested} kg` };
    }
    return { reps: planRepsMin, kg: suggested, reason: `${done.actualReps} reps (sobre máx · RIR ${done.rir}) → consolida en ${suggested} kg` };
  }

  // Dentro del rango
  if (serieDura) {
    // Serie más dura de lo esperado o casi al fallo: mantener peso y reportar el RIR real
    const hardLabel = done.rir <= 1 ? 'Al límite' : 'Duro';
    return { reps: planRepsMin, kg: done.weightKg, reason: `${hardLabel} (RIR ${done.rir}) → mantén ${done.weightKg} kg` };
  }

  if (isUp) {
    const easyLabel = done.rir >= targetRir + 2 ? 'Muy fácil' : 'Fácil';
    return { reps: planRepsMin, kg: suggested, reason: `${easyLabel} (RIR ${done.rir}) → sube a ${suggested} kg` };
  }

  if (isDown) {
    return { reps: planRepsMin, kg: suggested, reason: `${done.actualReps} reps · RIR ${done.rir} → baja a ${suggested} kg` };
  }

  // Mismo peso: RIR en el objetivo → progresar por reps (sin cambiar peso)
  if (done.rir > targetRir) {
    const nextUp = Math.round((done.weightKg + inc) / inc) * inc;
    return { reps: planRepsMin, kg: nextUp, reason: `Fácil (RIR ${done.rir}) → prueba ${nextUp} kg` };
  }

  return null; // En rango y en objetivo: sin cambio
}

// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_STATE: Pick<SessionStore,
  'isActive' | 'planId' | 'planDayId' | 'startTime' | 'currentExerciseIdx' |
  'exercises' | 'restTimerSeconds' | 'restTimerRunning' | 'restTimerEndAt' | 'trainingContext' |
  'cardio' | 'sessionDayType'
> = {
  isActive: false, planId: null, planDayId: null, startTime: null,
  currentExerciseIdx: 0, exercises: [], restTimerSeconds: 0, restTimerRunning: false,
  restTimerEndAt: null,
  trainingContext: null,
  cardio: { gym: [], homeSessions: [] }, sessionDayType: null,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...EMPTY_STATE,

  startSession: async (planId: number, day: StoredPlanDay) => {
    console.log('[Session] startSession — planId:', planId, 'day.dbId:', day.dbId);

    const progressionDataArr = await Promise.all(
      day.exercises.map(ex => getTargetFromProgression(ex.exerciseId)),
    );
    const lastDataArr = await Promise.all(
      day.exercises.map((ex, i) =>
        progressionDataArr[i].weightKg !== null
          ? Promise.resolve({ reps: null, weightKg: progressionDataArr[i].weightKg })
          : getLastSetData(ex.exerciseId),
      ),
    );
    // Cargar descanso personalizado para cada ejercicio
    const customRestArr = await Promise.all(
      day.exercises.map(ex => getCustomRest(ex.exerciseId)),
    );

    const exercises: ExerciseState[] = day.exercises.map((ex, i) =>
      buildExerciseState(
        { exerciseId: ex.exerciseId, reps: ex.reps, sets: ex.sets, restSeconds: ex.restSeconds },
        progressionDataArr[i],
        lastDataArr[i],
        customRestArr[i],
      ),
    );

    // Étapa 3 (#6+#18): restaura como completadas/solo-lectura las series de
    // este día que ya se guardaron en una sesión anterior de este ciclo.
    const restoredMap = await getRestoredSets(day.dbId, planId);
    if (restoredMap.size > 0) {
      for (const ex of exercises) {
        ex.sets = ex.sets.map(s => {
          const restored = restoredMap.get(`${ex.exerciseId}:${s.setNumber}`);
          if (!restored) return s;
          return {
            ...s,
            completed:  true,
            actualReps: restored.actualReps,
            weightKg:   restored.weightKg,
            rir:        restored.rir,
            isRestored: true,
          };
        });
      }
    }

    console.log('[Session] startSession complete — exercises:', exercises.length, 'restored:', restoredMap.size);
    set({
      isActive: true, planId, planDayId: day.dbId,
      startTime: Date.now(), currentExerciseIdx: 0,
      exercises, restTimerSeconds: 0, restTimerRunning: false,
      cardio: day.cardio, sessionDayType: day.dayType,
    });
  },

  setCurrentExercise: (idx) => set({ currentExerciseIdx: idx }),

  updateSetField: (exIdx, setIdx, field, value) => {
    const exercises  = [...get().exercises];
    const ex         = { ...exercises[exIdx] };
    const sets       = [...ex.sets];
    sets[setIdx]     = { ...sets[setIdx], [field]: value };
    ex.sets          = sets;
    exercises[exIdx] = ex;
    set({ exercises });
  },

  completeSet: (exIdx, setIdx) => {
    const exercises    = [...get().exercises];
    const ex           = { ...exercises[exIdx] };
    const sets         = [...ex.sets];
    const wasCompleted = sets[setIdx].completed;

    sets[setIdx] = { ...sets[setIdx], completed: !wasCompleted };

    if (!wasCompleted) {
      hapticsLight();
      const doneSt  = sets[setIdx];
      const nextIdx = sets.findIndex((s, i) => i > setIdx && !s.completed);
      const equip   = getEquipLocal(ex.exerciseId);

      if (nextIdx !== -1) {
        const hint  = computeCoach(
          { actualReps: doneSt.actualReps, weightKg: doneSt.weightKg, rir: doneSt.rir },
          sets[nextIdx].weightKg, sets[nextIdx].actualReps,
          ex.planRepsMin, ex.planRepsMax, equip,
          ex.targetRir,
        );
        // Siempre actualizar coachReason (null limpia hints obsoletos)
        sets[nextIdx] = {
          ...sets[nextIdx],
          coachReason: hint?.reason,
          ...(hint
            ? { actualReps: hint.reps, ...(hint.kg > 0 ? { weightKg: hint.kg } : {}) }
            : { actualReps: doneSt.actualReps, weightKg: doneSt.weightKg }),
        };
      }

      ex.sets = sets;
      exercises[exIdx] = ex;

      // Propaga a otras apariciones del MISMO ejercicio en el mismo dia
      // (ej. "Press de hombros" 2 veces) — decision de Juan: el coach evalua
      // y sugiere en cada instancia hermana igual que ya hace dentro de la
      // misma, no solo copia el peso en crudo.
      exercises.forEach((other, otherIdx) => {
        if (otherIdx === exIdx) return;
        if (other.exerciseId !== ex.exerciseId) return;
        const otherSets = [...other.sets];
        const otherNextIdx = otherSets.findIndex(s => !s.completed);
        if (otherNextIdx === -1) return;
        const otherHint = computeCoach(
          { actualReps: doneSt.actualReps, weightKg: doneSt.weightKg, rir: doneSt.rir },
          otherSets[otherNextIdx].weightKg, otherSets[otherNextIdx].actualReps,
          other.planRepsMin, other.planRepsMax, equip,
          other.targetRir,
        );
        otherSets[otherNextIdx] = {
          ...otherSets[otherNextIdx],
          coachReason: otherHint?.reason,
          ...(otherHint
            ? { actualReps: otherHint.reps, ...(otherHint.kg > 0 ? { weightKg: otherHint.kg } : {}) }
            : { actualReps: doneSt.actualReps, weightKg: doneSt.weightKg }),
        };
        exercises[otherIdx] = { ...other, sets: otherSets };
      });

      set({
        exercises,
        restTimerSeconds: ex.restSeconds,
        restTimerRunning: true,
        restTimerEndAt: Date.now() + ex.restSeconds * 1000,
      });
    } else {
      ex.sets = sets;
      exercises[exIdx] = ex;
      set({ exercises });
    }
  },

  addSet: (exIdx) => {
    const exercises = [...get().exercises];
    const ex        = { ...exercises[exIdx] };
    const lastSet   = ex.sets[ex.sets.length - 1];
    const newSet    = buildSetState(ex.sets.length, lastSet?.targetReps ?? 8, lastSet?.weightKg ?? 0);
    newSet.actualReps = lastSet?.actualReps ?? newSet.targetReps;
    newSet.weightKg   = lastSet?.weightKg   ?? 0;
    ex.sets           = [...ex.sets, newSet];
    exercises[exIdx]  = ex;
    set({ exercises });
  },

  removeSet: (exIdx) => {
    const exercises = [...get().exercises];
    const ex        = { ...exercises[exIdx] };
    if (ex.sets.length <= 1) return;
    ex.sets         = ex.sets.slice(0, -1);
    exercises[exIdx] = ex;
    set({ exercises });
  },

  updateNote: (exIdx, note) => {
    const exercises  = [...get().exercises];
    exercises[exIdx] = { ...exercises[exIdx], note };
    set({ exercises });
  },

  adjustRest: (exIdx, delta) => {
    const exercises  = [...get().exercises];
    const ex         = { ...exercises[exIdx] };
    ex.restSeconds   = Math.max(15, ex.restSeconds + delta);
    exercises[exIdx] = ex;
    // Si el timer está corriendo para este ejercicio, ajustar también el timer
    const { restTimerRunning, restTimerSeconds, restTimerEndAt } = get();
    if (restTimerRunning) {
      set({
        exercises,
        restTimerSeconds: Math.max(0, restTimerSeconds + delta),
        restTimerEndAt: restTimerEndAt !== null ? restTimerEndAt + delta * 1000 : null,
      });
    } else {
      set({ exercises });
    }
    saveCustomRest(ex.exerciseId, ex.restSeconds);
  },

  startRestTimer: (seconds) => set({
    restTimerSeconds: seconds,
    restTimerRunning: true,
    restTimerEndAt: Date.now() + seconds * 1000,
  }),
  stopRestTimer:  ()        => set({ restTimerRunning: false, restTimerEndAt: null }),

  // #27: solo programa si el timer sigue corriendo EN ESTE INSTANTE (leído
  // vía get(), no de un valor capturado antes) — mismo cálculo de segundos
  // restantes que ya usa tickRestTimer contra restTimerEndAt.
  scheduleRestNotification: async (title, body) => {
    const { restTimerRunning, restTimerEndAt } = get();
    if (!restTimerRunning || restTimerEndAt === null) return null;
    const secondsFromNow = (restTimerEndAt - Date.now()) / 1000;
    // Margen de tolerancia: si el descanso terminó hace muy poco (≤5s), sigue
    // mereciendo un aviso casi inmediato — solo bloquea si ya es demasiado
    // viejo (ej. volver de segundo plano 10 min después).
    if (secondsFromNow <= -5) return null;
    return scheduleRestDoneNotification(secondsFromNow, title, body);
  },

  cancelRestNotification: async (id) => {
    await cancelScheduledNotification(id);
  },

  tickRestTimer: () => {
    const { restTimerRunning, restTimerEndAt } = get();
    if (!restTimerRunning || restTimerEndAt === null) return;
    const remaining = Math.max(0, Math.round((restTimerEndAt - Date.now()) / 1000));
    if (remaining <= 0) {
      hapticsSuccess();
      playRestDone();
      set({ restTimerSeconds: 0, restTimerRunning: false, restTimerEndAt: null });
    } else {
      set({ restTimerSeconds: remaining });
    }
  },

  replaceExercise: async (exIdx, newExerciseId, profile) => {
    const exercises = [...get().exercises];
    if (!exercises[exIdx]) return;

    const newExercise = EXERCISES.find(e => e.id === newExerciseId);
    if (!newExercise) return;

    const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
    const [newPlanned] = buildPlanned(
      [newExercise],
      newExercise.isCompound ? scheme.compoundSets  : scheme.isolationSets,
      newExercise.isCompound ? scheme.compoundReps  : scheme.isolationReps,
      newExercise.isCompound ? scheme.compoundRest  : scheme.isolationRest,
      newExercise.isCompound,
    );

    const progData = await getTargetFromProgression(newExerciseId);
    const lastData = progData.weightKg !== null
      ? { reps: null, weightKg: progData.weightKg }
      : await getLastSetData(newExerciseId);
    const customRest = await getCustomRest(newExerciseId);

    exercises[exIdx] = buildExerciseState(newPlanned, progData, lastData, customRest);
    set({ exercises });
  },

  finishSession: async () => {
    const { planId, planDayId, startTime, exercises } = get();
    const durationSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const today = new Date().toISOString().split('T')[0];

    console.log('[Session] finishSession — exercises:', exercises.length);

    // Étapa 3 (#6+#18), punto C.1: el guard de sesión fantasma (#12) cuenta
    // SOLO series NUEVAS (no restauradas) — un día ya restaurado al que no se
    // le añade trabajo nuevo no debe crear una fila en workout_sessions.
    const newCompletedSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed && !s.isRestored).length, 0);
    if (newCompletedSetsCount === 0) {
      const plannedSets = exercises.reduce((acc, ex) => acc + ex.planSets, 0);
      // El ratio que ve el llamador (doFinish → dayFullyCompleted/perfect/
      // markDayCompleted) debe reflejar el progreso TOTAL del día, restaurado
      // incluido — por eso aquí NO se devuelve 0 a secas, se cuenta todo lo
      // completado igual que en el camino normal más abajo.
      const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);
      set({ ...EMPTY_STATE });
      return { hasPR: false, completedSets, plannedSets };
    }

    try {
      await db.insert(workoutSessions).values({
        planDayId, date: today, durationSeconds,
        completed: 1,
        notes:     exercises.map(e => e.note).filter(Boolean).join(' | '),
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error('[Session] finishSession — ERROR al guardar sesión:', err);
      set({ ...EMPTY_STATE });
      return { hasPR: false, completedSets: 0, plannedSets: 0 };
    }

    const [session] = await db.select().from(workoutSessions).orderBy(desc(workoutSessions.id)).limit(1);
    if (!session) { set({ ...EMPTY_STATE }); return { hasPR: false, completedSets: 0, plannedSets: 0 }; }

    console.log('[Session] finishSession — sesión guardada, id:', session.id);

    let setsCount = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
        // Punto C.2: una serie restaurada ya existe en session_sets (viene de
        // la sesión anterior que la restauró) — insertarla de nuevo la duplicaría.
        if (s.isRestored) continue;
        const base = {
          sessionId: session.id, exerciseId: ex.exerciseId, setNumber: s.setNumber,
          targetReps: s.targetReps, actualReps: s.actualReps, weightKg: s.weightKg,
          completed: s.completed ? 1 : 0, createdAt: Date.now(),
        };
        try {
          await db.insert(sessionSets).values({ ...base, weightTargetKg: s.weightKg, perceivedEffort: s.rir });
        } catch {
          try { await db.insert(sessionSets).values(base); } catch (err2) {
            console.error('[Session] ERROR serie:', err2);
          }
        }
        setsCount++;
      }
    }
    console.log('[Session] guardadas', setsCount, 'series');

    // Punto C.4: solo marca uso si hay al menos una serie NUEVA completada —
    // la rotación de variedad por músculo debe reaccionar a trabajo de hoy,
    // no a progreso ya contabilizado en una sesión anterior.
    for (const ex of exercises) {
      if (ex.sets.some(s => s.completed && !s.isRestored)) {
        const exercise = EXERCISES.find(e => e.id === ex.exerciseId);
        if (exercise) {
          try {
            await markExerciseUsed(exercise);
          } catch (err) {
            console.error('[Session] ERROR marcando ejercicio usado:', err);
          }
        }
      }
    }

    let hasPR = false;
    if (planId !== null) {
      try {
        // Punto C.3: progresión y detección de PR miran SOLO lo nuevo de hoy
        // — lo restaurado ya se evaluó (y ya actualizó exercise_targets) la
        // vez que se completó de verdad.
        const result = await runProgressionAfterSession(exercises.map(ex => ({
          exerciseId:    ex.exerciseId,
          planRepsMin:   ex.planRepsMin,
          planRepsMax:   ex.planRepsMax,
          planSets:      ex.planSets,
          completedSets: ex.sets.filter(s => s.completed && !s.isRestored).map(s => ({ actualReps: s.actualReps, weightKg: s.weightKg, rir: s.rir })),
        })));
        hasPR = result.hasPR;
      } catch {}
    }

    // Ratio final (dayFullyCompleted/perfect/markDayCompleted en doFinish):
    // cuenta TODAS las series completadas, restauradas o no — sin cambios
    // respecto al comportamiento anterior a esta Étapa.
    const plannedSets = exercises.reduce((acc, ex) => acc + ex.planSets, 0);
    const completedSets = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.completed).length, 0);

    set({ ...EMPTY_STATE });
    return { hasPR, completedSets, plannedSets };
  },

  setTrainingContext: (ctx) => set({ trainingContext: ctx }),

  cancelSession: () => set({ ...EMPTY_STATE }),
}));
