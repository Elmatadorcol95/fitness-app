import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { exerciseTargets, exerciseMaxes } from '@/db/schema';
import { getEquipLocal, EQUIP_INC, type EquipLocal } from '@/lib/equipmentClassification';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProgressionInput {
  exerciseId: string;
  equipmentType: EquipLocal;
  /** Rango mínimo del plan (ej. 8 en "8-12") */
  planRepsMin: number;
  /** Rango máximo del plan (ej. 12 en "8-12") */
  planRepsMax: number;
  planSets: number;
  /** RIR objetivo (reserva de reps); por defecto 2 */
  targetRir: number;
  /** Peso objetivo actual guardado (null = sin historial) */
  currentWeightKg: number | null;
  /** Reps mínimas objetivo actuales (puede haber subido del mínimo del plan) */
  currentRepsMin: number;
  /** Contador de sesiones consecutivas por debajo del rango */
  sessionsBelowRange: number;
  /** Número de sesiones previas del ejercicio (0 = primera sesión = calibración) */
  sessionCount: number;
  /** Series completadas en la sesión recién terminada */
  completedSets: Array<{ actualReps: number; weightKg: number; rir: number }>;
}

export interface ProgressionOutput {
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeightKg: number | null;
  targetRir: number;
  sessionsBelowRange: number;
  sessionCount: number;
  reason: string;
}

export interface ExerciseProgressionData {
  exerciseId: string;
  planRepsMin: number;
  planRepsMax: number;
  planSets: number;
  completedSets: Array<{ actualReps: number; weightKg: number; rir: number }>;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return Math.round(value * 10) / 10;
  return Math.round(value / increment) * increment;
}

// ── Algoritmo puro (testeable sin DB) ────────────────────────────────────────

export function computeNextTargets(input: ProgressionInput): ProgressionOutput {
  const {
    planRepsMin, planRepsMax, planSets, targetRir,
    currentWeightKg, currentRepsMin, sessionsBelowRange, sessionCount,
    completedSets, equipmentType,
  } = input;

  const increment = EQUIP_INC[equipmentType];
  const newCount  = sessionCount + 1;
  const safeCurrentRepsMin = Math.min(Math.max(currentRepsMin, planRepsMin), planRepsMax);

  const unchanged: ProgressionOutput = {
    targetSets:         planSets,
    targetRepsMin:      safeCurrentRepsMin,
    targetRepsMax:      planRepsMax,
    targetWeightKg:     currentWeightKg,
    targetRir,
    sessionsBelowRange,
    sessionCount:       newCount,
    reason:             '',
  };

  // Sin series completadas: no cambiar objetivos
  if (completedSets.length === 0) {
    return { ...unchanged, reason: 'Sin series completadas — objetivos sin cambios.' };
  }

  const workWeight = completedSets[completedSets.length - 1].weightKg;
  const avgRir     = completedSets.reduce((s, e) => s + e.rir, 0) / completedSets.length;
  const allHitTop  = completedSets.every(s => s.actualReps >= planRepsMax);
  const missedBtm  = completedSets.some(s => s.actualReps < planRepsMin);

  // ── Sesión 1: calibración ─────────────────────────────────────────────────
  if (sessionCount === 0) {
    return {
      targetSets:         planSets,
      targetRepsMin:      planRepsMin,
      targetRepsMax:      planRepsMax,
      targetWeightKg:     workWeight > 0 ? workWeight : currentWeightKg,
      targetRir,
      sessionsBelowRange: 0,
      sessionCount:       newCount,
      reason: `Calibración completada — peso de trabajo fijado en ${workWeight} kg. Desde la próxima sesión aplica la progresión doble.`,
    };
  }

  // ── Regla 5: por debajo del rango mínimo ─────────────────────────────────
  if (missedBtm) {
    const newBelow = sessionsBelowRange + 1;
    if (newBelow >= 2 && workWeight > 0 && increment > 0) {
      if (equipmentType === 'assisted') {
        const newWeight = roundToIncrement(workWeight + increment, increment);
        return {
          targetSets: planSets, targetRepsMin: planRepsMin, targetRepsMax: planRepsMax,
          targetWeightKg: newWeight, targetRir, sessionsBelowRange: 0, sessionCount: newCount,
          reason: `Dos sesiones seguidas sin llegar al mínimo (${planRepsMin} reps) → más asistencia: ${newWeight} kg para volver al rango.`,
        };
      }
      const newWeight = roundToIncrement(workWeight * 0.9, increment);
      return {
        targetSets:         planSets,
        targetRepsMin:      planRepsMin,
        targetRepsMax:      planRepsMax,
        targetWeightKg:     newWeight,
        targetRir,
        sessionsBelowRange: 0,
        sessionCount:       newCount,
        reason: `Dos sesiones seguidas sin llegar al mínimo (${planRepsMin} reps) → bajamos a ${newWeight} kg para volver al rango.`,
      };
    }
    return {
      ...unchanged,
      sessionsBelowRange: newBelow,
      sessionCount:       newCount,
      targetWeightKg:     workWeight,
      reason:             `Reps por debajo del mínimo (${planRepsMin}). Mantenemos el peso — si ocurre de nuevo, lo bajaremos.`,
    };
  }

  // ── Regla 3/4: llegó al tope ──────────────────────────────────────────────
  if (allHitTop) {
    if (Math.round(avgRir) >= targetRir) {
      // Regla 3: subir peso
      if (equipmentType === 'assisted') {
        const newWeight = Math.max(roundToIncrement(workWeight - increment, increment), increment);
        if (newWeight === workWeight) {
          return {
            ...unchanged, sessionsBelowRange: 0, sessionCount: newCount, targetWeightKg: workWeight,
            reason: `${planRepsMax} reps en todas las series con RIR ${Math.round(avgRir)} → ya casi sin asistencia, prueba la variante sin ayuda.`,
          };
        }
        return {
          targetSets: planSets, targetRepsMin: planRepsMin, targetRepsMax: planRepsMax,
          targetWeightKg: newWeight, targetRir, sessionsBelowRange: 0, sessionCount: newCount,
          reason: `${planRepsMax} reps en todas las series con RIR ${Math.round(avgRir)} → menos asistencia: ${newWeight} kg.`,
        };
      }
      if (increment === 0) {
        // Peso corporal: no podemos añadir kg — sugerir variación más difícil
        return {
          ...unchanged,
          sessionsBelowRange: 0,
          sessionCount:       newCount,
          targetWeightKg:     workWeight,
          reason: `${planRepsMax} reps en todas las series con RIR ${Math.round(avgRir)} → prueba una variación más difícil o añade lastre (chaleco).`,
        };
      }
      const newWeight = roundToIncrement(workWeight + increment, increment);
      return {
        targetSets:         planSets,
        targetRepsMin:      planRepsMin,
        targetRepsMax:      planRepsMax,
        targetWeightKg:     newWeight,
        targetRir,
        sessionsBelowRange: 0,
        sessionCount:       newCount,
        reason: `${planRepsMax} reps en todas las series con RIR ${Math.round(avgRir)} → subimos a ${newWeight} kg.`,
      };
    } else {
      // Regla 4: al límite, consolidar
      return {
        ...unchanged,
        sessionsBelowRange: 0,
        sessionCount:       newCount,
        targetWeightKg:     workWeight,
        reason: `${planRepsMax} reps al límite (RIR ${Math.round(avgRir)}) → consolidamos el peso antes de subir.`,
      };
    }
  }

  // ── Regla 2: en rango pero sin llegar al tope → subir reps ───────────────
  const avgActual   = completedSets.reduce((s, e) => s + e.actualReps, 0) / completedSets.length;
  const nextRepsMin = Math.min(Math.round(avgActual) + 1, planRepsMax);
  return {
    targetSets:         planSets,
    targetRepsMin:      nextRepsMin,
    targetRepsMax:      planRepsMax,
    targetWeightKg:     workWeight,
    targetRir,
    sessionsBelowRange: 0,
    sessionCount:       newCount,
    reason: `Media de ${Math.round(avgActual)} reps (rango: ${planRepsMin}–${planRepsMax}) → objetivo: ${nextRepsMin}–${planRepsMax} reps la próxima vez.`,
  };
}

// ── 1RM estimado — fórmula de Epley ──────────────────────────────────────────

export function estimateOneRepMax(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// ── DB: obtener target de un ejercicio ───────────────────────────────────────

export async function getExerciseTarget(exerciseId: string) {
  try {
    const rows = await db
      .select()
      .from(exerciseTargets)
      .where(eq(exerciseTargets.exerciseId, exerciseId))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── DB: obtener todos los targets ────────────────────────────────────────────

export async function getAllExerciseTargets() {
  try {
    return await db
      .select()
      .from(exerciseTargets);
  } catch {
    return [];
  }
}

// ── DB: guardar target (insert or update) ────────────────────────────────────

async function upsertTarget(exerciseId: string, output: ProgressionOutput) {
  const existing = await getExerciseTarget(exerciseId);
  const values = {
    exerciseId,
    targetSets:         output.targetSets,
    targetRepsMin:      output.targetRepsMin,
    targetRepsMax:      output.targetRepsMax,
    targetWeightKg:     output.targetWeightKg,
    targetRir:          output.targetRir,
    progressionReason:  output.reason,
    sessionsBelowRange: output.sessionsBelowRange,
    sessionCount:       output.sessionCount,
    updatedAt:          Date.now(),
  };
  if (existing) {
    await db
      .update(exerciseTargets)
      .set(values)
      .where(eq(exerciseTargets.exerciseId, exerciseId));
  } else {
    await db.insert(exerciseTargets).values(values);
  }
}

// ── DB: ejecutar progresión tras una sesión ───────────────────────────────────

export async function runProgressionAfterSession(
  exercisesData: ExerciseProgressionData[],
): Promise<{ hasPR: boolean }> {
  let hasPR = false;
  const today = new Date().toISOString().split('T')[0];

  for (const data of exercisesData) {
    if (data.completedSets.length === 0) continue;

    const current      = await getExerciseTarget(data.exerciseId);
    const equipmentType = getEquipLocal(data.exerciseId);

    const input: ProgressionInput = {
      exerciseId:         data.exerciseId,
      equipmentType,
      planRepsMin:        data.planRepsMin,
      planRepsMax:        data.planRepsMax,
      planSets:           data.planSets,
      targetRir:          current?.targetRir ?? 2,
      currentWeightKg:    current?.targetWeightKg ?? null,
      currentRepsMin:     current?.targetRepsMin ?? data.planRepsMin,
      sessionsBelowRange: current?.sessionsBelowRange ?? 0,
      sessionCount:       current?.sessionCount ?? 0,
      completedSets:      data.completedSets,
    };

    const output = computeNextTargets(input);
    await upsertTarget(data.exerciseId, output);

    // ── 1RM estimado (Epley) ──────────────────────────────────────────────
    const bestSet = data.completedSets.reduce((best, s) =>
      estimateOneRepMax(s.weightKg, s.actualReps) > estimateOneRepMax(best.weightKg, best.actualReps)
        ? s : best,
      data.completedSets[0],
    );

    const e1rm = estimateOneRepMax(bestSet.weightKg, bestSet.actualReps);
    if (e1rm > 0) {
      const existingMax = await db
        .select()
        .from(exerciseMaxes)
        .where(eq(exerciseMaxes.exerciseId, data.exerciseId))
        .orderBy(desc(exerciseMaxes.e1rm))
        .limit(1);

      if (!existingMax[0] || e1rm > existingMax[0].e1rm) {
        await db.insert(exerciseMaxes).values({
          exerciseId:  data.exerciseId,
          weightKg:    bestSet.weightKg,
          reps:        bestSet.actualReps,
          e1rm,
          achievedAt:  today,
        });
        hasPR = true;
      }
    }
  }

  return { hasPR };
}
