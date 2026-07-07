import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { muscleExerciseUsage } from '@/db/schema';
import type { Exercise, MuscleGroup } from './exercises';

export async function getUsedExerciseIds(muscle: MuscleGroup): Promise<Set<string>> {
  try {
    const rows = await db
      .select()
      .from(muscleExerciseUsage)
      .where(eq(muscleExerciseUsage.muscle, muscle));
    return new Set(rows.map(r => r.exerciseId));
  } catch (err) {
    console.error('[MuscleUsage] Error leyendo uso por músculo:', err);
    return new Set();
  }
}

export async function markExerciseUsed(exercise: Exercise): Promise<void> {
  const usedAt = Date.now();
  const muscles = [...exercise.primaryMuscles, ...exercise.secondaryMuscles];
  for (const muscle of muscles) {
    await db
      .insert(muscleExerciseUsage)
      .values({ muscle, exerciseId: exercise.id, usedAt })
      .onConflictDoNothing({ target: [muscleExerciseUsage.muscle, muscleExerciseUsage.exerciseId] });
  }
}

export async function resetMuscleCycle(muscle: MuscleGroup): Promise<void> {
  await db.delete(muscleExerciseUsage).where(eq(muscleExerciseUsage.muscle, muscle));
}
