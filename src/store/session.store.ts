import { create } from 'zustand';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { exerciseTargets, workoutSessions, sessionSets, exerciseRestPrefs } from '@/db/schema';
import { hapticsLight, hapticsSuccess } from '@/lib/haptics';
import { playRestDone } from '@/lib/sounds';
import { runProgressionAfterSession } from '@/lib/progression';
import { EXERCISES } from '@/lib/exercises';
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

  startSession: (planId: number, day: StoredPlanDay) => Promise<void>;
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
  finishSession: () => Promise<{ hasPR: boolean }>;
  cancelSession: () => void;
  replaceExercise: (exIdx: number, newExerciseId: string) => void;
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

async function getTargetFromProgression(planId: number, exerciseId: string): Promise<{ weightKg: number | null; repsMin: number | null }> {
  try {
    const rows = await db
      .select({ targetWeightKg: exerciseTargets.targetWeightKg, targetRepsMin: exerciseTargets.targetRepsMin })
      .from(exerciseTargets)
      .where(and(eq(exerciseTargets.planId, planId), eq(exerciseTargets.exerciseId, exerciseId)))
      .limit(1);
    return { weightKg: rows[0]?.targetWeightKg ?? null, repsMin: rows[0]?.targetRepsMin ?? null };
  } catch {
    return { weightKg: null, repsMin: null };
  }
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

// ── Coach en tiempo real (determinista) ───────────────────────────────────────

type EquipLocal = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' | 'bodyweight';

function getEquipLocal(exerciseId: string): EquipLocal {
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return 'bodyweight';
  if (ex.equipment.includes('barbellPlates'))  return 'barbell';
  if (ex.equipment.includes('dumbbells'))      return 'dumbbell';
  if (ex.equipment.includes('kettlebells'))    return 'kettlebell';
  if (ex.equipment.includes('cableMachine'))   return 'cable';
  if (ex.equipment.includes('legPressMachine'))return 'machine';
  return 'bodyweight';
}

const EQUIP_INC: Record<EquipLocal, number> = {
  barbell: 2.5, dumbbell: 2, kettlebell: 4, cable: 2.5, machine: 5, bodyweight: 0,
};

function computeCoach(
  done: { actualReps: number; weightKg: number; rir: number },
  nextKg: number,
  nextReps: number,
  planRepsMin: number,
  planRepsMax: number,
  equip: EquipLocal,
): { reps: number; kg: number; reason: string } | null {
  const inc = EQUIP_INC[equip];

  // ── Peso corporal ────────────────────────────────────────────────────────────
  if (equip === 'bodyweight') {
    if (done.actualReps < planRepsMin) {
      // Por debajo del mínimo: recomendar bajar objetivo
      const safeTarget = Math.max(Math.round(done.actualReps * 0.9), 3);
      if (safeTarget < nextReps) {
        return { reps: safeTarget, kg: 0, reason: `${done.actualReps} reps (bajo rango) → apunta a ${safeTarget}` };
      }
      return null;
    }
    if (done.actualReps >= planRepsMax) {
      // Al tope o por encima: sugerir progresión (nunca "mantén X")
      const msg = done.rir >= 2
        ? `Te quedó fácil (${done.actualReps} reps · RIR ${done.rir}) → prueba variante difícil o añade lastre`
        : `${done.actualReps} reps al límite (RIR ${done.rir}) → progresando bien`;
      return { reps: planRepsMax, kg: 0, reason: msg };
    }
    return null; // En rango: sin cambio
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

  // No subir si fue al fallo (RIR ≤ 1)
  if (done.rir <= 1 && suggested > done.weightKg) suggested = done.weightKg;

  if (suggested <= 0) return null;

  const diff = suggested - nextKg;

  // Diferencia menor que medio incremento → revisar casos especiales
  if (Math.abs(diff) < inc * 0.5) {
    if (done.actualReps < planRepsMin) {
      return { reps: done.actualReps, kg: suggested, reason: `${done.actualReps} reps (bajo mín ${planRepsMin}) · mantén ${suggested} kg` };
    }
    if (done.actualReps > planRepsMax && done.rir >= 3) {
      return { reps: planRepsMin, kg: suggested, reason: `${done.actualReps} reps (sobre máx · RIR ${done.rir}) → considera +peso próxima sesión` };
    }
    // Dentro del rango pero muy fácil (RIR ≥ 4) → sugerir pequeño aumento
    if (done.actualReps >= planRepsMin && done.rir >= 4) {
      const nextUp = Math.round((done.weightKg + inc) / inc) * inc;
      return { reps: planRepsMin, kg: nextUp, reason: `${done.actualReps} reps · RIR ${done.rir} (muy fácil) → prueba ${nextUp} kg` };
    }
    return null; // En rango, misma carga, sensación normal
  }

  const dir = diff > 0 ? '↑' : '↓';
  return {
    reps: planRepsMin,
    kg: suggested,
    reason: `${done.actualReps} reps · RIR ${done.rir} → ${dir} ${suggested} kg`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_STATE: Pick<SessionStore,
  'isActive' | 'planId' | 'planDayId' | 'startTime' | 'currentExerciseIdx' |
  'exercises' | 'restTimerSeconds' | 'restTimerRunning'
> = {
  isActive: false, planId: null, planDayId: null, startTime: null,
  currentExerciseIdx: 0, exercises: [], restTimerSeconds: 0, restTimerRunning: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...EMPTY_STATE,

  startSession: async (planId: number, day: StoredPlanDay) => {
    console.log('[Session] startSession — planId:', planId, 'day.dbId:', day.dbId);

    const progressionDataArr = await Promise.all(
      day.exercises.map(ex => getTargetFromProgression(planId, ex.exerciseId)),
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

    const exercises: ExerciseState[] = day.exercises.map((ex, i) => {
      const { min: minReps, max: maxReps } = parseRepsString(ex.reps);
      const progData  = progressionDataArr[i];
      const lastData  = lastDataArr[i];
      const customRest = customRestArr[i];
      // Ejercicios no-barra: aplicar mínimo 8-12 reps aunque el plan diga 3-5
      const equip = getEquipLocal(ex.exerciseId);
      const effMin = (equip !== 'barbell' && equip !== 'bodyweight' && minReps < 8) ? 8 : minReps;
      const effMax = (equip !== 'barbell' && equip !== 'bodyweight' && maxReps < 12) ? Math.max(maxReps, 12) : maxReps;
      // Pre-cargar con el punto medio del rango (~10 para 8-12) si no hay datos de progresión
      const targetMid = Math.round((effMin + effMax) / 2);
      const targetInit = progData.repsMin ?? targetMid;
      const restSeconds = customRest ?? computeDefaultRest(ex.exerciseId, ex.restSeconds);
      return {
        exerciseId:   ex.exerciseId,
        restSeconds,
        note:         '',
        lastReps:     lastData.reps,
        lastWeightKg: lastData.weightKg,
        planRepsMin:  effMin,
        planRepsMax:  effMax,
        planSets:     ex.sets,
        sets: Array.from({ length: ex.sets }, (_, s) =>
          buildSetState(s, targetInit, lastData.weightKg),
        ),
      };
    });

    console.log('[Session] startSession complete — exercises:', exercises.length);
    set({
      isActive: true, planId, planDayId: day.dbId,
      startTime: Date.now(), currentExerciseIdx: 0,
      exercises, restTimerSeconds: 0, restTimerRunning: false,
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

      if (nextIdx !== -1) {
        const equip = getEquipLocal(ex.exerciseId);
        const hint  = computeCoach(
          { actualReps: doneSt.actualReps, weightKg: doneSt.weightKg, rir: doneSt.rir },
          sets[nextIdx].weightKg, sets[nextIdx].actualReps,
          ex.planRepsMin, ex.planRepsMax, equip,
        );
        // Siempre actualizar coachReason (null limpia hints obsoletos)
        sets[nextIdx] = {
          ...sets[nextIdx],
          coachReason: hint?.reason,
          ...(hint
            ? { actualReps: hint.reps, ...(hint.kg > 0 ? { weightKg: hint.kg } : {}) }
            : {}),
        };
      }

      ex.sets = sets;
      exercises[exIdx] = ex;
      set({ exercises, restTimerSeconds: ex.restSeconds, restTimerRunning: true });
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
    const { restTimerRunning, restTimerSeconds } = get();
    if (restTimerRunning) {
      set({ exercises, restTimerSeconds: Math.max(0, restTimerSeconds + delta) });
    } else {
      set({ exercises });
    }
    saveCustomRest(ex.exerciseId, ex.restSeconds);
  },

  startRestTimer: (seconds) => set({ restTimerSeconds: seconds, restTimerRunning: true }),
  stopRestTimer:  ()        => set({ restTimerRunning: false }),

  tickRestTimer: () => {
    const { restTimerSeconds, restTimerRunning } = get();
    if (!restTimerRunning) return;
    if (restTimerSeconds <= 1) {
      hapticsSuccess();
      playRestDone();
      set({ restTimerSeconds: 0, restTimerRunning: false });
    } else {
      set({ restTimerSeconds: restTimerSeconds - 1 });
    }
  },

  replaceExercise: (exIdx, newExerciseId) => {
    const exercises  = [...get().exercises];
    const ex         = exercises[exIdx];
    exercises[exIdx] = {
      ...ex,
      exerciseId:   newExerciseId,
      lastReps:     null,
      lastWeightKg: null,
      sets: ex.sets.map(s => ({ ...s, completed: false })),
    };
    set({ exercises });
  },

  finishSession: async () => {
    const { planId, planDayId, startTime, exercises } = get();
    const durationSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const today = new Date().toISOString().split('T')[0];

    console.log('[Session] finishSession — exercises:', exercises.length);

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
      return { hasPR: false };
    }

    const [session] = await db.select().from(workoutSessions).orderBy(desc(workoutSessions.id)).limit(1);
    if (!session) { set({ ...EMPTY_STATE }); return { hasPR: false }; }

    console.log('[Session] finishSession — sesión guardada, id:', session.id);

    let setsCount = 0;
    for (const ex of exercises) {
      for (const s of ex.sets) {
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

    let hasPR = false;
    if (planId !== null) {
      try {
        const result = await runProgressionAfterSession(planId, exercises.map(ex => ({
          exerciseId:    ex.exerciseId,
          planRepsMin:   ex.planRepsMin,
          planRepsMax:   ex.planRepsMax,
          planSets:      ex.planSets,
          completedSets: ex.sets.filter(s => s.completed).map(s => ({ actualReps: s.actualReps, weightKg: s.weightKg, rir: s.rir })),
        })));
        hasPR = result.hasPR;
      } catch {}
    }

    set({ ...EMPTY_STATE });
    return { hasPR };
  },

  cancelSession: () => set({ ...EMPTY_STATE }),
}));
