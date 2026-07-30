import { and, desc, eq, gte } from 'drizzle-orm';
import { db } from '@/db';
import { workoutPlans, planDays, workoutSessions } from '@/db/schema';
import type { Profile } from '@/db/schema';
import { EXERCISES } from './exercises';
import { getRepScheme, buildPlanned, getExerciseCounts, getCardioSlots, type GoalKey, type PlannedExercise } from './plan-generator';
import { selectCardio, createCardioCycleState, type CardioPlan } from './cardioSelection';
import { getTemplate, type TemplateContext, type RoutineTemplateDay } from './routineTemplates';

// ¿Este día del plan (plan_days.id) tiene ya alguna sesión real registrada
// DESDE sinceTimestamp? (Fase G1: antes era "alguna vez, para siempre" —
// ahora un día puede volver a contar como "sin entrenar" tras activar/
// reactivar un plan o pasar de semana, comparando contra el generatedAt del
// ciclo vigente en vez de contra todo el historial.)
// workout_sessions.completed está siempre en 1 en la práctica (hardcodeado
// en finishSession()), así que filtrar por plan_day_id ya es equivalente a
// filtrar por "completada" — no hace falta comprobar completed aquí.
export async function hasSessionForPlanDay(planDayId: number, sinceTimestamp: number): Promise<boolean> {
  const rows = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.planDayId, planDayId), gte(workoutSessions.createdAt, sinceTimestamp)))
    .limit(1);
  return rows.length > 0;
}

// Convierte los slots ya elegidos de un día de plantilla en PlannedExercise[]
// SIN tocar la base de datos — misma lógica que antes vivía duplicada dentro
// de materializeTemplate() y, por separado, en estimateDayDuration()
// (routineBuilder.tsx). Slots sin exerciseId o con un exerciseId huérfano
// (catálogo cambió) se omiten en silencio, igual que antes.
export function buildExercisesFromTemplateDay(
  day: RoutineTemplateDay,
  profile: Profile,
): PlannedExercise[] {
  const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
  const exercises: PlannedExercise[] = [];
  for (const slot of day.slots) {
    if (slot.exerciseId === null) continue;
    const exercise = EXERCISES.find(e => e.id === slot.exerciseId);
    if (!exercise) continue;
    exercises.push(...buildPlanned(
      [exercise],
      exercise.isCompound ? scheme.compoundSets  : scheme.isolationSets,
      exercise.isCompound ? scheme.compoundReps  : scheme.isolationReps,
      exercise.isCompound ? scheme.compoundRest  : scheme.isolationRest,
      exercise.isCompound,
    ));
  }
  return exercises;
}

// Materializa la plantilla de un contexto (gym/casa) sobre plan_days reales
// del plan YA IDENTIFICADO por planId — esta función ya NO busca ni crea el
// plan activo por su cuenta (Fase G1: ese trabajo pasa a las 3 acciones de
// workout.store.ts, únicas capaces de resolver qué contexto es "el activo"
// para un usuario location:'both'). cycleStart es el generatedAt del ciclo
// vigente: un día solo se considera "ya entrenado" (y por tanto intocable)
// si tiene una sesión con createdAt >= cycleStart.
//
// Nunca toca un día que ya tiene una sesión registrada DENTRO del ciclo
// vigente (hasSessionForPlanDay). Un día con todos sus slots vacíos SIGUE
// creando/actualizando su fila con exercises: '[]' — no se omite.
//
// Devuelve skippedDayIndexes: los dayIndex saltados por hasSessionForPlanDay
// (Fase G2 — bug 2), para que el llamador pueda avisar de una edición que no
// se reflejará hasta el próximo ciclo.
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
  planId: number,
  cycleStart: number,
): Promise<{ skippedDayIndexes: number[] }> {
  const templateDays = await getTemplate(context);
  // Plantilla inexistente (aún sin crear para este contexto) — nada que
  // materializar.
  if (templateDays.length === 0) return { skippedDayIndexes: [] };

  const skippedDayIndexes: number[] = [];

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
      .where(and(eq(planDays.planId, planId), eq(planDays.dayIndex, day.dayIndex)))
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
      .where(and(eq(planDays.planId, planId), eq(planDays.dayIndex, day.dayIndex)))
      .limit(1);

    if (existingDay && await hasSessionForPlanDay(existingDay.id, cycleStart)) {
      skippedDayIndexes.push(day.dayIndex);
      continue; // día ya entrenado en ESTE ciclo — nunca se toca (cardio incluido)
    }

    const exercises = buildExercisesFromTemplateDay(day, profile);

    const needsCardio = exercises.length > 0 && (!existingDay || existingDay.cardio === '[]');
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
        planId,
        dayIndex:  day.dayIndex,
        dayType:   day.dayType,
        exercises: JSON.stringify(exercises),
        cardio:    needsCardio ? JSON.stringify(cardioPlan) : '[]',
      });
    }
  }

  return { skippedDayIndexes };
}

// Busca la fila más reciente de workoutPlans para el constructor propio de
// un contexto dado (source='manual' AND context=el dado) — SIN filtrar por
// isActive, porque puede existir (creada antes) y estar inactiva en este
// momento (el usuario cambió a otro modo/contexto) y aun así ser "la
// plantilla materializada de este contexto" que activateManualPlan debe
// reactivar en vez de duplicar.
export async function findManualPlan(context: TemplateContext): Promise<typeof workoutPlans.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.source, 'manual'), eq(workoutPlans.context, context)))
    .orderBy(desc(workoutPlans.id))
    .limit(1);
  return row ?? null;
}
