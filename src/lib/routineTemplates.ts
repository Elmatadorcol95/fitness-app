import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { routineTemplates, routineTemplateSlots } from '@/db/schema';
import type { RoutineTemplate, RoutineTemplateSlot } from '@/db/schema';
import { getExerciseCounts } from './plan-generator';
import { getTargetsForDayType } from './muscleTargets';
import type { MuscleGroup } from './exercises';

export type TemplateContext = 'gym' | 'home';

// El constructor manual solo ofrece estos 4 tipos de día — upper/lower quedan
// dormidos (mismo DayType del generador automático, sin ampliar el tipo).
export type BuilderDayType = 'push' | 'pull' | 'legs' | 'full_body';

export interface RoutineTemplateDay extends RoutineTemplate {
  slots: RoutineTemplateSlot[];
}

// Reparte `count` slots entre los MuscleGroup de getTargetsForDayType(dayType),
// en orden de declaración (mismo pool que usa la generación automática),
// repitiendo en round-robin si hay más slots que targets. Solo decide el punto
// de partida de la plantilla — el usuario podrá cambiarlo todo después vía
// addSlot/removeSlot/setSlotExercise.
function pickMuscleGroups(dayType: BuilderDayType, count: number): MuscleGroup[] {
  const targets = getTargetsForDayType(dayType);
  return Array.from({ length: count }, (_, i) => targets[i % targets.length].muscleGroups[0]);
}

// Crea una plantilla completa (una fila de routine_templates por día + sus
// slots vacíos) para un contexto. getExerciseCounts(minutesPerSession) decide
// SOLO el número total de slots por día (compounds+isolations sumados) — el
// desglose compound/isolation no se persiste en ningún slot, se deriva más
// adelante de isCompound del ejercicio que el usuario elija.
// No borra ninguna plantilla previa del mismo contexto — llamar a
// deleteTemplate(context) antes si se está regenerando desde cero.
export async function createTemplate(
  context: TemplateContext,
  days: BuilderDayType[],
  minutesPerSession: number,
): Promise<void> {
  const counts = getExerciseCounts(minutesPerSession);
  const totalSlots = counts.compounds + counts.isolations;
  const now = Date.now();

  for (const [dayIndex, dayType] of days.entries()) {
    await db.insert(routineTemplates).values({ context, dayIndex, dayType, createdAt: now, updatedAt: now });

    const [templateRow] = await db
      .select()
      .from(routineTemplates)
      .where(and(eq(routineTemplates.context, context), eq(routineTemplates.dayIndex, dayIndex)))
      .orderBy(desc(routineTemplates.id))
      .limit(1);
    if (!templateRow) continue;

    const muscleGroups = pickMuscleGroups(dayType, totalSlots);
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

// Borra una plantilla completa (todos sus días + todos sus slots) de un
// contexto — para cuando el usuario cambia de planMode o regenera desde cero.
export async function deleteTemplate(context: TemplateContext): Promise<void> {
  const days = await db.select({ id: routineTemplates.id }).from(routineTemplates).where(eq(routineTemplates.context, context));
  for (const day of days) {
    await db.delete(routineTemplateSlots).where(eq(routineTemplateSlots.templateId, day.id));
  }
  await db.delete(routineTemplates).where(eq(routineTemplates.context, context));
}
