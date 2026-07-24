import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { workoutPlans, planDays, workoutSessions } from '@/db/schema';
import type { Profile } from '@/db/schema';
import { EXERCISES } from './exercises';
import { getRepScheme, buildPlanned, getExerciseCounts, getCardioSlots, type GoalKey, type PlannedExercise } from './plan-generator';
import { selectCardio, createCardioCycleState, type CardioPlan } from './cardioSelection';
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
// exercises: '[]' — no se omite.
//
// Cardio (Fase C2): '[]' (el string literal, no un CardioPlan vacío) es el
// centinela de "cardio aún no calculado" para una fila ya existente. Solo se
// calcula cardio si el día tiene al menos un ejercicio de fuerza elegido Y
// (la fila es nueva O su cardio actual sigue siendo el centinela '[]') — en
// cualquier otro caso (día sin ejercicios, o fila existente con cardio ya
// calculado/editado por el usuario) cardio no se toca en absoluto: en el
// UPDATE queda fuera del .set() por completo, no se sobrescribe con nada.
export async function materializeTemplate(
  context: TemplateContext,
  profile: Profile,
  equipment: string[],
  dislikedIds: Set<string>,
): Promise<void> {
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

  // Cardio: mismo patrón que generatePlan() — un único CardioCycleState y un
  // único Set de ids ya usados, creados ANTES del bucle y mutados después de
  // cada día, para que la rotación/variedad persista a través de todos los
  // días de este materialize (no se reinicia por día).
  const cardioCycle   = createCardioCycleState();
  const usedCardioIds = new Set<string>();
  const isGym         = context === 'gym';
  const counts        = getExerciseCounts(profile.minutesPerSession);
  const totalSlots    = counts.compounds + counts.isolations;

  // Pase previo — no toca ninguna fila, solo siembra usedCardioIds con el
  // cardio que YA está persistido en días que esta llamada no va a
  // recalcular (fila existente con cardio distinto del centinela '[]'), para
  // que los días que SÍ se recalculen en el bucle de abajo no repitan un
  // cardio que otro día del mismo materialize ya tiene guardado.
  for (const day of templateDays) {
    const [existingForSeed] = await db
      .select()
      .from(planDays)
      .where(and(eq(planDays.planId, activePlan.id), eq(planDays.dayIndex, day.dayIndex)))
      .limit(1);
    if (existingForSeed && existingForSeed.cardio !== '[]') {
      const seedCardio = JSON.parse(existingForSeed.cardio) as CardioPlan;
      for (const c of seedCardio.gym) usedCardioIds.add(c.exerciseId);
      for (const session of seedCardio.homeSessions) {
        for (const c of session.blocks) usedCardioIds.add(c.exerciseId);
      }
    }
  }

  // Un día a la vez — mismo estilo secuencial que generatePlan() (cada
  // operación de DB espera a la anterior; el estado de cardio SÍ se comparte
  // entre iteraciones, igual que usedThisWeek en el generador automático).
  for (const day of templateDays) {
    const [existingDay] = await db
      .select()
      .from(planDays)
      .where(and(eq(planDays.planId, activePlan.id), eq(planDays.dayIndex, day.dayIndex)))
      .limit(1);

    if (existingDay && await hasSessionForPlanDay(existingDay.id)) {
      continue; // día ya entrenado — nunca se toca (cardio incluido)
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

    const needsCardio = filledSlots.length > 0 && (!existingDay || existingDay.cardio === '[]');
    let cardioPlan: CardioPlan | null = null;
    if (needsCardio) {
      const cardioSlots = getCardioSlots(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null, totalSlots);
      cardioPlan = selectCardio(cardioSlots, equipment, isGym, usedCardioIds, cardioCycle, dislikedIds);
      for (const c of cardioPlan.gym) usedCardioIds.add(c.exerciseId);
      for (const session of cardioPlan.homeSessions) {
        for (const c of session.blocks) usedCardioIds.add(c.exerciseId);
      }
    }

    if (existingDay) {
      const updateValues: { exercises: string; dayType: string; cardio?: string } = {
        exercises: JSON.stringify(exercises),
        dayType:   day.dayType,
      };
      if (needsCardio) updateValues.cardio = JSON.stringify(cardioPlan);
      await db
        .update(planDays)
        .set(updateValues)
        .where(eq(planDays.id, existingDay.id));
    } else {
      await db.insert(planDays).values({
        planId:    activePlan.id,
        dayIndex:  day.dayIndex,
        dayType:   day.dayType,
        exercises: JSON.stringify(exercises),
        cardio:    needsCardio ? JSON.stringify(cardioPlan) : '[]',
      });
    }
  }
}
