import { EXERCISES, type Exercise } from './exercises';
import { canDoExercise } from './plan-generator';

export interface PlannedCardioBlock {
  exerciseId: string;
  durationSeconds: number;
}

// Fase 3 — duración fija por bloque en la sesión (distinta del opener de
// calentamiento, que usa sus propias constantes GYM_CARDIO_OPEN_SECONDS/
// HOME_CARDIO_OPEN_SECONDS en warmupGenerator.ts — no se tocan ni se
// comparten). Decisión de producto de Juan: 10 min fijos por hueco ganado,
// independiente del defaultDurationSeconds del catálogo (300s en máquinas).
const CARDIO_BLOCK_SECONDS = 600;

// Gimnasio: mismo filtro exacto que ya usa getCardioOpenerPool(true) en
// warmupGenerator.ts (categoría cardio + requiere cardioMachine) — no se
// usa canDoExercise aquí porque con isGym=true siempre devuelve true y no
// serviría para discriminar máquina vs peso corporal.
function selectGymCardio(slots: number, excludeIds: Set<string>): PlannedCardioBlock[] {
  const pool = EXERCISES.filter(e => e.category === 'cardio' && e.equipment.includes('cardioMachine'));
  const blocks: PlannedCardioBlock[] = [];
  const chosenIds = new Set<string>();

  for (let i = 0; i < slots; i++) {
    let candidates = pool.filter(e => !chosenIds.has(e.id) && !excludeIds.has(e.id));
    if (candidates.length === 0) candidates = pool.filter(e => !chosenIds.has(e.id));
    if (candidates.length === 0) candidates = pool;
    if (candidates.length === 0) break;

    const chosen = candidates[0];
    chosenIds.add(chosen.id);
    blocks.push({ exerciseId: chosen.id, durationSeconds: CARDIO_BLOCK_SECONDS });
  }
  return blocks;
}

// Casa: circuito acumulado — a diferencia del gimnasio, aquí SÍ usamos
// canDoExercise(e, equipment, false) en vez del filtro equipment.length===0
// que usa el warmup (ese excluye jump_rope a propósito por simplicidad;
// aquí, si el usuario tiene cuerda en su equipamiento, sí puede entrar).
// Se van sumando ejercicios DISTINTOS (variando, no repitiendo mientras
// el pool dé para más) hasta alcanzar slots × CARDIO_BLOCK_SECONDS. Cada
// ejercicio usa su propio defaultDurationSeconds real del catálogo (no
// todos duran 30s parejo — shadow_boxing dura 45s).
function selectHomeCardio(slots: number, equipment: string[], excludeIds: Set<string>): PlannedCardioBlock[] {
  const targetSeconds = slots * CARDIO_BLOCK_SECONDS;
  const pool = EXERCISES.filter(e => e.category === 'cardio' && canDoExercise(e, equipment, false));
  const blocks: PlannedCardioBlock[] = [];
  const chosenIds = new Set<string>();
  let accumulated = 0;

  while (accumulated < targetSeconds) {
    let candidates = pool.filter(e => !chosenIds.has(e.id) && !excludeIds.has(e.id));
    if (candidates.length === 0) candidates = pool.filter(e => !chosenIds.has(e.id));
    if (candidates.length === 0) candidates = pool;
    if (candidates.length === 0) break;

    const chosen = candidates[0];
    chosenIds.add(chosen.id);
    const duration = chosen.defaultDurationSeconds ?? 30;
    blocks.push({ exerciseId: chosen.id, durationSeconds: duration });
    accumulated += duration;
  }
  return blocks;
}

// Punto de entrada único. slots viene ya calculado desde fuera (Fase 3-B
// decide cuántos según fat_loss + el tope de mitad de huecos del día) —
// esta función no sabe nada de goalPrimary/goalSecondary ni de dayType:
// el cardio es el mismo sin importar si el día es push/pull/legs/full_body.
// Síncrona a propósito: v1 no persiste nada en SQLite ni toca progresión.
export function selectCardioBlocks(
  slots: number,
  equipment: string[],
  isGym: boolean,
  excludeIds: Set<string>,
): PlannedCardioBlock[] {
  if (slots <= 0) return [];
  return isGym
    ? selectGymCardio(slots, excludeIds)
    : selectHomeCardio(slots, equipment, excludeIds);
}
