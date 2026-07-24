import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workoutPlans, planDays, workoutSessions } from '@/db/schema';
import type { Profile } from '@/db/schema';
import { EXERCISES } from './exercises';
import { getRepScheme, buildPlanned, type GoalKey, type PlannedExercise } from './plan-generator';
import { getTemplate, type TemplateContext } from './routineTemplates';

// ¿Este día del plan (plan_days.id) tiene ya alguna sesión real registrada?
// No existía ninguna consulta así en el proyecto — se escribe de cero.
// workout_sessions.completed está siempre en 1 en la práctica (hardcodeado
// en finishSession()), así que filtrar por plan_day_id ya es equivalente a
// filtrar por "completada" — no hace falta comprobar completed aquí.
export async function hasSessionForPlanDay(planDayId: number): Promise<boolean> {
  const rows = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(eq(workoutSessions.planDayId, planDayId))
    .limit(1);
  return rows.length > 0;
}

// Materializa la plantilla de un contexto (gym/casa) sobre plan_days reales,
// reutilizando el plan activo (o creándolo si no existe). Nunca toca un día
// que ya tiene una sesión registrada (hasSessionForPlanDay). Un día con
// todos sus slots vacíos SIGUE creando/actualizando su fila con
// exercises: '[]' — no se omite. cardio no se toca en esta fase: '[]' en
// filas nuevas, intacto en filas ya existentes (Fase C2).
export async function materializeTemplate(context: TemplateContext, profile: Profile): Promise<void> {
  const templateDays = await getTemplate(context);
  // Plantilla inexistente (aún sin crear para este contexto) — nada que
  // materializar. Salir aquí evita crear un workoutPlans "zombie" con
  // daysPerWeek: 0 y ningún plan_days.
  if (templateDays.length === 0) return;

  // 1. Plan activo — mismo patrón de re-lectura tras insertar que ya usa
  // generateAndSavePlan() en workout.store.ts.
  let [activePlan] = await db
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.isActive, 1))
    .orderBy(desc(workoutPlans.id))
    .limit(1);

  if (!activePlan) {
    await db.insert(workoutPlans).values({
      goalPrimary:       profile.goalPrimary,
      goalSecondary:     profile.goalSecondary,
      daysPerWeek:       templateDays.length,
      minutesPerSession: profile.minutesPerSession,
      isActive:          1,
      generatedAt:       Date.now(),
    });
    [activePlan] = await db
      .select()
      .from(workoutPlans)
      .where(eq(workoutPlans.isActive, 1))
      .orderBy(desc(workoutPlans.id))
      .limit(1);
  }
  if (!activePlan) throw new Error('materializeTemplate: no se pudo crear/leer el plan activo');

  const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);

  // 3. Un día a la vez — mismo estilo secuencial que generatePlan() (cada
  // operación de DB espera a la anterior; no hay estado compartido entre
  // días aquí, pero se mantiene la consistencia de estilo del archivo hermano).
  for (const day of templateDays) {
    const [existingDay] = await db
      .select()
      .from(planDays)
      .where(and(eq(planDays.planId, activePlan.id), eq(planDays.dayIndex, day.dayIndex)))
      .limit(1);

    if (existingDay && await hasSessionForPlanDay(existingDay.id)) {
      continue; // día ya entrenado — nunca se toca
    }

    const filledSlots = day.slots.filter(s => s.exerciseId !== null);
    const exercises: PlannedExercise[] = [];
    for (const slot of filledSlots) {
      const exercise = EXERCISES.find(e => e.id === slot.exerciseId);
      if (!exercise) continue; // exerciseId huérfano (catálogo cambió) — se omite, no rompe
      exercises.push(...buildPlanned(
        [exercise],
        exercise.isCompound ? scheme.compoundSets  : scheme.isolationSets,
        exercise.isCompound ? scheme.compoundReps  : scheme.isolationReps,
        exercise.isCompound ? scheme.compoundRest  : scheme.isolationRest,
        exercise.isCompound,
      ));
    }

    if (existingDay) {
      await db
        .update(planDays)
        .set({ exercises: JSON.stringify(exercises), dayType: day.dayType })
        .where(eq(planDays.id, existingDay.id));
    } else {
      await db.insert(planDays).values({
        planId:    activePlan.id,
        dayIndex:  day.dayIndex,
        dayType:   day.dayType,
        exercises: JSON.stringify(exercises),
        cardio:    '[]',
      });
    }
  }
}
