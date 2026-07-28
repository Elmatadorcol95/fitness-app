import { EXERCISES, type Exercise, type MuscleGroup } from './exercises';
import { findTargetByKey, getTargetsForDayType, targetIsPrioritized, type MuscleTarget } from './muscleTargets';
import { getUsedExerciseIds, resetMuscleCycle } from './muscleUsage';
import { isExerciseUsable, type DayType } from './plan-generator';

export interface MuscleSelectedExercise {
  exercise: Exercise;
  isCompound: boolean;
  targetKey: string;
}

// Orden fijo para el "segundo compuesto" de targets de prioridad 1 (paso 5 del
// algoritmo aprobado). Los que no apliquen al día en curso simplemente no
// están entre los targets de ese día y se saltan.
const SECOND_COMPOUND_ORDER = ['pecho', 'espalda', 'cuadriceps', 'isquiotibiales'];

// Tope general de ejercicios por target cuando el target no define su propio
// maxSlots (p. ej. antebrazo sigue capado en 1 vía su propio maxSlots).
const MAX_EXERCISES_PER_TARGET = 3;

// Categorías admitidas para generación de fuerza — el mismo conjunto que el
// sistema viejo permitía efectivamente en plan-generator.ts (cats/allIso solo
// usan 'push'|'pull'|'legs'|'core'; 'cardio' y 'mobility' quedan fuera, tal
// como estuvo garantizado siempre por el sistema anterior).
export const ALLOWED_CATEGORIES = new Set(['push', 'pull', 'legs', 'core']);

// Alineación por categoría — mismo criterio que `cats` en el sistema viejo
// de plan-generator.ts: un target solo puede elegir ejercicios cuya
// `category` real corresponda al componente de día que se está generando.
// En días 'upper' (que mezclan PUSH_TARGETS + PULL_TARGETS) la categoría
// admitida depende de `target.sourceCategory` — de qué lista viene el
// target — nunca se adivina por el nombre/key del target.
const PUSH_ONLY = new Set(['push']);
const PULL_ONLY = new Set(['pull']);
const LEGS_OR_CORE = new Set(['legs', 'core']);

function allowedCategoriesFor(dayType: DayType, target: MuscleTarget): Set<string> {
  switch (dayType) {
    case 'push':
      return PUSH_ONLY;
    case 'pull':
      return PULL_ONLY;
    case 'legs':
    case 'lower':
      return LEGS_OR_CORE;
    case 'upper':
      return new Set([target.sourceCategory]);
    case 'full_body':
      return ALLOWED_CATEGORIES;
  }
}

export async function selectExercisesForDayByMuscle(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  excludeIds: Set<string>,
  musclePriorities: MuscleGroup[] = [],
  dislikedIds: Set<string> = new Set(),
  likedIds: Set<string> = new Set(),
): Promise<MuscleSelectedExercise[]> {
  const targets = [...getTargetsForDayType(dayType)].sort((a, b) => a.bonusPriority - b.bonusPriority);
  const available = EXERCISES.filter(e => ALLOWED_CATEGORIES.has(e.category) && isExerciseUsable(e, equipment, isGym, dislikedIds));

  // Reordenación por prioridad muscular (Fase 0-B-1): los targets priorizados
  // pasan al frente, preservando el orden relativo original entre el resto
  // (partición estable con filter+concat — NUNCA shuffle, ni toca el sort por
  // bonusPriority dentro de cada mitad). NO altera el mínimo garantizado de la
  // Pasada 1 ni el tope de 3 por músculo; solo el ORDEN en que se recorren.
  // Con musclePriorities=[] la primera mitad es [] y orderedTargets queda con
  // el mismo orden que `targets`: no-op exacto.
  const isPrio = (t: MuscleTarget) => targetIsPrioritized(t, musclePriorities);
  const orderedTargets = [...targets.filter(isPrio), ...targets.filter(t => !isPrio(t))];

  // Mismo criterio para las keys de SECOND_COMPOUND_ORDER: se resuelve cada key
  // a su MuscleTarget canónico (findTargetByKey) y las priorizadas saltan al
  // frente, con el orden relativo del resto intacto. Con musclePriorities=[]
  // ninguna key es prioritaria → orden idéntico al de la constante.
  const keyIsPrio = (key: string) => {
    const t = findTargetByKey(key);
    return t ? targetIsPrioritized(t, musclePriorities) : false;
  };
  const secondCompoundOrder = [
    ...SECOND_COMPOUND_ORDER.filter(keyIsPrio),
    ...SECOND_COMPOUND_ORDER.filter(k => !keyIsPrio(k)),
  ];

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

  // Candidatos elegibles para un target, ya sin los usados en este día ni los
  // ya elegidos en días previos de ESTA MISMA generación de plan (excludeIds);
  // si el uso previo (BD, persistente entre semanas) vacía el pool, resetea
  // el ciclo de esos músculos y reintenta sobre el pool completo (paso 4 del
  // algoritmo). excludeIds NO se resetea nunca — es del plan actual, no del
  // ciclo de rotación persistente.
  async function getEligiblePool(target: MuscleTarget, isCompound: boolean): Promise<Exercise[]> {
    const allowedCats = allowedCategoriesFor(dayType, target);
    const pool = available.filter(e =>
      e.isCompound === isCompound &&
      !chosenIds.has(e.id) &&
      !excludeIds.has(e.id) &&
      allowedCats.has(e.category) &&
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
    // Si alguno de los candidatos ya elegibles para este hueco tiene like,
    // el desempate de siempre (cobertura incidental, luego orden de
    // catálogo) se aplica SOLO entre los favoritos. Sin favoritos entre los
    // candidatos, se comporta exactamente igual que antes.
    const likedCandidates = candidates.filter(c => likedIds.has(c.id));
    const pool = likedCandidates.length > 0 ? likedCandidates : candidates;

    let best = pool[0];
    let bestScore = incidentalScore(best);
    let bestIdx = declOrder.get(best.id)!;
    for (let i = 1; i < pool.length; i++) {
      const c = pool[i];
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
  for (const t of orderedTargets) {
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
    for (const key of secondCompoundOrder) {
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
  isolationLeft += compoundLeft;
  compoundLeft = 0;

  // Huecos de aislamiento sobrantes: a los targets restantes por
  // bonusPriority (1 antes que 2 — el orden de `targets` ya lo refleja),
  // respetando maxSlots en todo momento.
  while (isolationLeft > 0) {
    let assignedAny = false;
    for (const t of orderedTargets) {
      if (isolationLeft <= 0) break;
      if (slotsLeft(t) <= 0) continue;
      if (await tryAssign(t, false)) { isolationLeft--; assignedAny = true; }
    }
    if (!assignedAny) break;
  }

  return results;
}

// Candidatos para el picker de un slot vacío del constructor propio (Fase E)
// — filtra por categoría admitida + equipamiento, igual que el motor real,
// pero por MuscleGroup directo (no por target/día) porque el slot ya sabe su
// muscleGroup desde que se creó. Sin sort especial (orden de declaración del
// catálogo) ni dislikedIds — mismo comportamiento que getAlternatives hoy.
export function getExercisesByMuscleGroup(
  muscleGroup: MuscleGroup,
  equipment: string[],
  isGym: boolean,
): Exercise[] {
  return EXERCISES.filter(ex => {
    if (!ALLOWED_CATEGORIES.has(ex.category)) return false;
    const canDo = isGym
      ? true
      : ex.equipment.length === 0 || ex.equipment.every(eq => equipment.includes(eq));
    if (!canDo) return false;
    return ex.primaryMuscles.includes(muscleGroup);
  });
}
