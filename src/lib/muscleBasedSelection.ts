import { EXERCISES, type Exercise } from './exercises';
import { getTargetsForDayType, type MuscleTarget } from './muscleTargets';
import { getUsedExerciseIds, resetMuscleCycle } from './muscleUsage';
import type { DayType } from './plan-generator';

export interface MuscleSelectedExercise {
  exercise: Exercise;
  isCompound: boolean;
  targetKey: string;
}

// Espejo exacto de canDoExercise() en plan-generator.ts. No se importa desde
// allí porque no está exportada y este sub-paso no debe tocar ese archivo
// (ver Sección 11 del audit — plan-generator.ts queda intacto hasta el
// Sub-paso 3, cuando esto se conecte de verdad). Si esa función cambia allí,
// hay que replicar el cambio aquí a mano.
function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}

// Orden fijo para el "segundo compuesto" de targets de prioridad 1 (paso 5 del
// algoritmo aprobado). Los que no apliquen al día en curso simplemente no
// están entre los targets de ese día y se saltan.
const SECOND_COMPOUND_ORDER = ['pecho', 'espalda', 'cuadriceps', 'isquiotibiales'];

// Tope general de ejercicios por target cuando el target no define su propio
// maxSlots (p. ej. antebrazo sigue capado en 1 vía su propio maxSlots).
const MAX_EXERCISES_PER_TARGET = 3;

export async function selectExercisesForDayByMuscle(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
): Promise<MuscleSelectedExercise[]> {
  const targets = [...getTargetsForDayType(dayType)].sort((a, b) => a.bonusPriority - b.bonusPriority);
  const available = EXERCISES.filter(e => canDoExercise(e, equipment, isGym));

  // Orden de declaración real en EXERCISES — desempate final determinista.
  const declOrder = new Map<string, number>(EXERCISES.map((e, i) => [e.id, i]));

  const chosenIds = new Set<string>();     // ningún id se repite en el día
  const coveredKeys = new Set<string>();   // targets que ya recibieron un pick
  const slotsGiven: Record<string, number> = {};
  const results: MuscleSelectedExercise[] = [];

  function slotsLeft(target: MuscleTarget): number {
    const cap = target.maxSlots ?? MAX_EXERCISES_PER_TARGET;
    return cap - (slotsGiven[target.key] ?? 0);
  }

  // Candidatos elegibles para un target, ya sin los usados en este día;
  // si el uso previo (BD) vacía el pool, resetea el ciclo de esos músculos
  // y reintenta sobre el pool completo (paso 4 del algoritmo).
  async function getEligiblePool(target: MuscleTarget, isCompound: boolean): Promise<Exercise[]> {
    const pool = available.filter(e =>
      e.isCompound === isCompound &&
      !chosenIds.has(e.id) &&
      target.muscleGroups.some(m => e.primaryMuscles.includes(m)),
    );
    if (pool.length === 0) return [];

    const usedSets = await Promise.all(target.muscleGroups.map(m => getUsedExerciseIds(m)));
    const usedUnion = new Set<string>();
    for (const s of usedSets) for (const id of s) usedUnion.add(id);

    let unused = pool.filter(e => !usedUnion.has(e.id));
    if (unused.length === 0) {
      for (const m of target.muscleGroups) await resetMuscleCycle(m);
      unused = pool; // tras resetear, ya no queda exclusión que aplicar
    }
    return unused;
  }

  // Cobertura incidental: cuántos targets AÚN NO CUBIERTOS tocaría este
  // ejercicio contando primaryMuscles + secondaryMuscles combinados.
  function incidentalScore(exercise: Exercise): number {
    const muscles = new Set([...exercise.primaryMuscles, ...exercise.secondaryMuscles]);
    let score = 0;
    for (const t of targets) {
      if (coveredKeys.has(t.key)) continue;
      if (t.muscleGroups.some(m => muscles.has(m))) score++;
    }
    return score;
  }

  function pickBest(candidates: Exercise[]): Exercise {
    let best = candidates[0];
    let bestScore = incidentalScore(best);
    let bestIdx = declOrder.get(best.id)!;
    for (let i = 1; i < candidates.length; i++) {
      const c = candidates[i];
      const score = incidentalScore(c);
      const idx = declOrder.get(c.id)!;
      if (score > bestScore || (score === bestScore && idx < bestIdx)) {
        best = c; bestScore = score; bestIdx = idx;
      }
    }
    return best;
  }

  function assign(target: MuscleTarget, exercise: Exercise, isCompound: boolean) {
    chosenIds.add(exercise.id);
    coveredKeys.add(target.key);
    slotsGiven[target.key] = (slotsGiven[target.key] ?? 0) + 1;
    results.push({ exercise, isCompound, targetKey: target.key });
  }

  const priority1 = targets.filter(t => t.bonusPriority === 1);
  let compoundUsed = 0;
  let isolationUsed = 0;
  const totalBudget = counts.compounds + counts.isolations;

  // Intenta asignar un ejercicio de un tipo concreto a un target. Devuelve
  // true si encontró candidato y asignó (sin mirar cupo de bolsa — eso lo
  // decide quien llama).
  async function tryAssign(t: MuscleTarget, isCompound: boolean): Promise<boolean> {
    const pool = await getEligiblePool(t, isCompound);
    if (pool.length === 0) return false;
    assign(t, pickBest(pool), isCompound);
    return true;
  }

  // ── Pasada 1 — mínimo garantizado, sin excepción ─────────────────────────
  // Recorre TODOS los targets del día en su orden de lista (ya viene
  // ordenado por bonusPriority) y le da a cada uno EXACTAMENTE 1 ejercicio,
  // consumiendo del presupuesto TOTAL combinado (compounds+isolations), no
  // de cada bolsa por separado: si la bolsa preferida no tiene cupo o
  // candidato, se cruza a la otra bolsa mientras quede presupuesto total.
  for (const t of targets) {
    if (compoundUsed + isolationUsed >= totalBudget) break;
    if (slotsLeft(t) <= 0) continue;

    let assigned = false;

    // Preferencia normal: compuesto si su bolsa tiene cupo; si no, aislamiento.
    if (!assigned && compoundUsed < counts.compounds) {
      if (await tryAssign(t, true)) { compoundUsed++; assigned = true; }
    }
    if (!assigned && isolationUsed < counts.isolations) {
      if (await tryAssign(t, false)) { isolationUsed++; assigned = true; }
    }
    // Cruce: la bolsa preferida no tenía cupo o candidato — prueba la otra
    // bolsa igualmente, ya que el presupuesto TOTAL (comprobado arriba) aún
    // tiene margen. Esto es lo que garantiza que nadie quede en cero mientras
    // exista cualquier hueco disponible, sea de la bolsa que sea.
    if (!assigned) {
      if (await tryAssign(t, true)) { compoundUsed++; assigned = true; }
    }
    if (!assigned) {
      if (await tryAssign(t, false)) { isolationUsed++; assigned = true; }
    }
    // Si sigue sin asignar, este target no tiene NINGÚN candidato elegible
    // (ni compuesto ni aislamiento) — hueco estructural (equipamiento/uso),
    // no se fuerza nada.
  }

  // ── Pasada 2 — bonos, solo con lo que sobre ──────────────────────────────
  let compoundLeft  = counts.compounds  - compoundUsed;
  let isolationLeft = counts.isolations - isolationUsed;

  // Huecos de compuesto sobrantes: orden fijo, repitiendo la lista tantas
  // vueltas como haga falta hasta agotar los huecos o que una vuelta completa
  // no logre asignar nada (mismo patrón que el bucle de aislamiento de abajo).
  while (compoundLeft > 0) {
    let assignedAny = false;
    for (const key of SECOND_COMPOUND_ORDER) {
      if (compoundLeft <= 0) break;
      const t = priority1.find(pt => pt.key === key);
      if (!t || slotsLeft(t) <= 0) continue;
      if (await tryAssign(t, true)) { compoundLeft--; assignedAny = true; }
    }
    if (!assignedAny) break;
  }

  // Lo que sobre de compuesto (por tope de target o lista agotada) se
  // convierte en aislamiento, para que el bucle de abajo lo reparta entre
  // el resto de targets por bonusPriority en vez de perderlo.
  console.log('[muscleBasedSelection] compoundLeft antes de convertir a aislamiento:', compoundLeft);
  isolationLeft += compoundLeft;
  compoundLeft = 0;

  // Huecos de aislamiento sobrantes: a los targets restantes por
  // bonusPriority (1 antes que 2 — el orden de `targets` ya lo refleja),
  // respetando maxSlots en todo momento.
  while (isolationLeft > 0) {
    let assignedAny = false;
    for (const t of targets) {
      if (isolationLeft <= 0) break;
      if (slotsLeft(t) <= 0) continue;
      if (await tryAssign(t, false)) { isolationLeft--; assignedAny = true; }
    }
    if (!assignedAny) break;
  }

  return results;
}
