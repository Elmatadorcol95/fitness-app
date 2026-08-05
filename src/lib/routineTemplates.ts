import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { routineTemplates, routineTemplateSlots } from '@/db/schema';
import type { RoutineTemplate, RoutineTemplateSlot } from '@/db/schema';
import { computeExerciseCounts, type GoalKey } from './plan-generator';
import { findTargetByKey } from './muscleTargets';
import { selectExercisesForDayByMuscle } from './muscleBasedSelection';
import type { MuscleGroup } from './exercises';
import type { CardioPlan } from './cardioSelection';

export type TemplateContext = 'gym' | 'home';

// El constructor manual solo ofrece estos 4 tipos de día — upper/lower quedan
// dormidos (mismo DayType del generador automático, sin ampliar el tipo).
export type BuilderDayType = 'push' | 'pull' | 'legs' | 'full_body';

export interface RoutineTemplateDay extends RoutineTemplate {
  slots: RoutineTemplateSlot[];
}

// Recomienda el muscleGroup de cada slot vacío reutilizando el motor real de
// selección (selectExercisesForDayByMuscle) — mismo orden por bonusPriority,
// misma disponibilidad real de isCompound en el catálogo, mismas reglas de
// cruce compound/isolation y de rotación (getUsedExerciseIds/excludeIds) que
// usa generatePlan(). El exercise elegido por el motor se descarta por
// completo: solo se conserva el muscleGroup real de su target
// (findTargetByKey(result.targetKey).muscleGroups[0], NUNCA
// exercise.primaryMuscles) — el slot sigue naciendo con exerciseId: null.
// excludeIds se muta (se le añade cada exercise.id elegido) para que el
// llamador pueda seguir el mismo patrón de generatePlan() y evitar que dos
// días de la misma plantilla recomienden el mismo candidato de base.
async function recommendMuscleGroups(
  dayType: BuilderDayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  excludeIds: Set<string>,
  musclePriorities: MuscleGroup[],
  dislikedIds: Set<string>,
  likedIds: Set<string>,
): Promise<MuscleGroup[]> {
  const selected = await selectExercisesForDayByMuscle(
    dayType, equipment, isGym, counts, excludeIds, musclePriorities, dislikedIds, likedIds,
  );
  for (const s of selected) excludeIds.add(s.exercise.id);
  return selected.map(s => findTargetByKey(s.targetKey)!.muscleGroups[0]);
}

// Crea una plantilla completa (una fila de routine_templates por día + sus
// slots vacíos) para un contexto. computeExerciseCounts(minutesPerSession,
// goalPrimary, goalSecondary) decide el presupuesto compound/isolation que
// recibe selectExercisesForDayByMuscle
// para recomendar muscleGroup por slot — el desglose compound/isolation en sí
// no se persiste en ningún slot, se deriva más adelante de isCompound del
// ejercicio que el usuario elija. equipment/isGym/musclePriorities/
// dislikedIds/likedIds son las mismas señales que generateAndSavePlan ya saca
// del perfil hoy para el plan automático — aquí las recibe por parámetro
// porque esta fase es solo modelo/helpers, sin conexión al store/perfil.
// El número de slots por día puede salir por debajo de
// counts.compounds+counts.isolations si el motor real no encuentra candidato
// para algún target (mismo hueco estructural que ya admite generatePlan) —
// no se fuerza relleno artificial.
// No borra ninguna plantilla previa del mismo contexto — llamar a
// deleteTemplate(context) antes si se está regenerando desde cero.
export async function createTemplate(
  context: TemplateContext,
  days: BuilderDayType[],
  minutesPerSession: number,
  equipment: string[],
  isGym: boolean,
  musclePriorities: MuscleGroup[],
  dislikedIds: Set<string>,
  likedIds: Set<string>,
  goalPrimary: GoalKey,
  goalSecondary: GoalKey | null,
): Promise<void> {
  const counts = computeExerciseCounts(minutesPerSession, goalPrimary, goalSecondary);
  const now = Date.now();
  // Mismo patrón exacto que generatePlan(): un único Set creado ANTES del
  // bucle de días, mutado tras cada día para que el siguiente no recomiende
  // el mismo candidato de base.
  const usedThisWeek = new Set<string>();

  for (const [dayIndex, dayType] of days.entries()) {
    await db.insert(routineTemplates).values({ context, dayIndex, dayType, createdAt: now, updatedAt: now });

    const [templateRow] = await db
      .select()
      .from(routineTemplates)
      .where(and(eq(routineTemplates.context, context), eq(routineTemplates.dayIndex, dayIndex)))
      .orderBy(desc(routineTemplates.id))
      .limit(1);
    if (!templateRow) continue;

    const muscleGroups = await recommendMuscleGroups(
      dayType, equipment, isGym, counts, usedThisWeek, musclePriorities, dislikedIds, likedIds,
    );
    for (const [slotIndex, muscleGroup] of muscleGroups.entries()) {
      await db.insert(routineTemplateSlots).values({
        templateId: templateRow.id,
        slotIndex,
        muscleGroup,
        exerciseId: null,
      });
    }
  }
}

// Lee la plantilla completa de un contexto: todos sus días (ordenados por
// dayIndex) con sus slots (ordenados por slotIndex) ya anidados.
export async function getTemplate(context: TemplateContext): Promise<RoutineTemplateDay[]> {
  const days = await db.select().from(routineTemplates).where(eq(routineTemplates.context, context));
  const sortedDays = [...days].sort((a, b) => a.dayIndex - b.dayIndex);

  const result: RoutineTemplateDay[] = [];
  for (const day of sortedDays) {
    const slots = await db
      .select()
      .from(routineTemplateSlots)
      .where(eq(routineTemplateSlots.templateId, day.id));
    result.push({ ...day, slots: [...slots].sort((a, b) => a.slotIndex - b.slotIndex) });
  }
  return result;
}

// Asigna/cambia el ejercicio de un slot. exerciseId acepta null para volver a
// dejarlo "sin elegir" (mismo significado que un slot recién creado) — el
// campo ya es nullable en el esquema precisamente para ese estado.
export async function setSlotExercise(slotId: number, exerciseId: string | null): Promise<void> {
  await db.update(routineTemplateSlots).set({ exerciseId }).where(eq(routineTemplateSlots.id, slotId));
}

// Añade un slot vacío al final de un día. dayIndex se usa como comprobación
// de consistencia (debe coincidir con el dayIndex real de templateId) — no se
// persiste en la fila del slot, ya que ese dato ya vive en su plantilla padre.
export async function addSlot(templateId: number, dayIndex: number, muscleGroup: MuscleGroup): Promise<void> {
  const [template] = await db.select().from(routineTemplates).where(eq(routineTemplates.id, templateId)).limit(1);
  if (!template || template.dayIndex !== dayIndex) {
    throw new Error(`addSlot: dayIndex ${dayIndex} no coincide con el día real de templateId ${templateId}`);
  }

  const existing = await db
    .select({ slotIndex: routineTemplateSlots.slotIndex })
    .from(routineTemplateSlots)
    .where(eq(routineTemplateSlots.templateId, templateId));
  const nextIndex = existing.length === 0 ? 0 : Math.max(...existing.map(s => s.slotIndex)) + 1;

  await db.insert(routineTemplateSlots).values({
    templateId,
    slotIndex: nextIndex,
    muscleGroup,
    exerciseId: null,
  });
}

export async function removeSlot(slotId: number): Promise<void> {
  await db.delete(routineTemplateSlots).where(eq(routineTemplateSlots.id, slotId));
}

// Fija (o borra, con null) el cardio propio de un día de plantilla. null =
// vuelve a usar el cardio automático (selectCardio() dentro de
// materializeTemplate) — mismo significado que el centinela ausente de
// verdad, a diferencia de plan_days.cardio que usa '[]' como centinela por
// no ser nullable.
export async function setTemplateCardio(templateId: number, cardio: CardioPlan | null): Promise<void> {
  await db
    .update(routineTemplates)
    .set({ cardio: cardio ? JSON.stringify(cardio) : null })
    .where(eq(routineTemplates.id, templateId));
}

// Borra una plantilla completa (todos sus días + todos sus slots) de un
// contexto — para cuando el usuario sale del modo manual o regenera desde cero.
export async function deleteTemplate(context: TemplateContext): Promise<void> {
  const days = await db.select({ id: routineTemplates.id }).from(routineTemplates).where(eq(routineTemplates.context, context));
  for (const day of days) {
    await db.delete(routineTemplateSlots).where(eq(routineTemplateSlots.templateId, day.id));
  }
  await db.delete(routineTemplates).where(eq(routineTemplates.context, context));
}
