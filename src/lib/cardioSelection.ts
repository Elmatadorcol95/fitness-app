import { EXERCISES, type Exercise } from './exercises';
import { isExerciseUsable } from './plan-generator';

export interface PlannedCardioBlock {
  exerciseId: string;
  durationSeconds: number;
}

export interface HomeCardioSession {
  blocks: PlannedCardioBlock[];
  restAfterSeconds: number; // 0 en la última sesión del día
}

export interface CardioPlan {
  gym: PlannedCardioBlock[];
  homeSessions: HomeCardioSession[];
}

// Estado mutable que persiste a través de TODOS los días de la semana en una
// misma generación de plan (mismo patrón que usedThisWeek en plan-generator.ts:
// se crea una vez antes del bucle de días y se pasa por referencia). Registra
// cuántas veces se ha tenido que "repetir" tras agotar el pool de variedad —
// permite que la repetición rote de verdad (0,1,2,3,4,0,1...) en vez de
// reiniciarse siempre en el mismo ítem. Bug real corregido: antes, al agotar
// el pool, SIEMPRE se repetía el primer ítem del catálogo para siempre —
// visible sobre todo en casa (14 ejercicios, hasta 40 bloques necesarios) pero
// el mismo defecto también afectaba a gimnasio (5 máquinas), solo que
// disimulado por necesitar pocas repeticiones para completar la semana.
export interface CardioCycleState {
  gymCount: number;
  homeCount: number;
}

export function createCardioCycleState(): CardioCycleState {
  return { gymCount: 0, homeCount: 0 };
}

const CARDIO_BLOCK_SECONDS = 600; // 10 min fijos por hueco de gimnasio (decisión de producto, independiente del defaultDurationSeconds del catálogo)
const HOME_SESSION_SECONDS = 300; // 5 min por sesión de casa
const HOME_SESSION_REST_SECONDS = 90; // descanso por defecto entre sesiones de casa (editable en la UI, esto es solo el valor inicial)

function selectGymCardio(slots: number, excludeIds: Set<string>, cycle: CardioCycleState, dislikedIds: Set<string>): PlannedCardioBlock[] {
  const pool = EXERCISES.filter(e => e.category === 'cardio' && e.equipment.includes('cardioMachine') && !dislikedIds.has(e.id));
  const blocks: PlannedCardioBlock[] = [];
  const chosenIds = new Set<string>();

  for (let i = 0; i < slots; i++) {
    const candidates = pool.filter(e => !chosenIds.has(e.id) && !excludeIds.has(e.id));
    let chosen: Exercise;
    if (candidates.length > 0) {
      chosen = candidates[0];
    } else if (pool.length > 0) {
      chosen = pool[cycle.gymCount % pool.length];
      cycle.gymCount++;
    } else {
      break;
    }
    chosenIds.add(chosen.id);
    blocks.push({ exerciseId: chosen.id, durationSeconds: CARDIO_BLOCK_SECONDS });
  }
  return blocks;
}

// Casa: sessionCount sesiones de HOME_SESSION_SECONDS cada una (1 hueco de
// 10 min = 2 sesiones de 5 min). Los ejercicios varían a través de TODAS las
// sesiones del día (chosenIds es compartido entre sesiones, no se reinicia
// por sesión) — solo se repite un ejercicio dentro del mismo día cuando el
// pool completo (14 ejercicios) ya se agotó para ese día.
function selectHomeCardioSessions(
  slots: number,
  equipment: string[],
  excludeIds: Set<string>,
  cycle: CardioCycleState,
  dislikedIds: Set<string>,
): HomeCardioSession[] {
  const sessionCount = slots * 2;
  const pool = EXERCISES.filter(e => e.category === 'cardio' && isExerciseUsable(e, equipment, false, dislikedIds));
  const sessions: HomeCardioSession[] = [];
  const chosenIdsAllSessions = new Set<string>();

  for (let s = 0; s < sessionCount; s++) {
    const blocks: PlannedCardioBlock[] = [];
    let accumulated = 0;
    while (accumulated < HOME_SESSION_SECONDS) {
      const candidates = pool.filter(e => !chosenIdsAllSessions.has(e.id) && !excludeIds.has(e.id));
      let chosen: Exercise;
      if (candidates.length > 0) {
        chosen = candidates[0];
      } else if (pool.length > 0) {
        chosen = pool[cycle.homeCount % pool.length];
        cycle.homeCount++;
      } else {
        break;
      }
      chosenIdsAllSessions.add(chosen.id);
      const duration = chosen.defaultDurationSeconds ?? 30;
      blocks.push({ exerciseId: chosen.id, durationSeconds: duration });
      accumulated += duration;
    }
    sessions.push({ blocks, restAfterSeconds: s < sessionCount - 1 ? HOME_SESSION_REST_SECONDS : 0 });
  }
  return sessions;
}

// Punto de entrada único. slots viene ya calculado desde fuera (getCardioSlots
// en plan-generator.ts, según fat_loss + tope de mitad de huecos del día).
// cycle debe crearse UNA VEZ antes del bucle de días en generatePlan() y
// pasarse por referencia a cada llamada — persiste la rotación a lo largo de
// toda la semana, no se reinicia por día.
export function selectCardio(
  slots: number,
  equipment: string[],
  isGym: boolean,
  excludeIds: Set<string>,
  cycle: CardioCycleState,
  dislikedIds: Set<string> = new Set(),
): CardioPlan {
  if (slots <= 0) return { gym: [], homeSessions: [] };
  return isGym
    ? { gym: selectGymCardio(slots, excludeIds, cycle, dislikedIds), homeSessions: [] }
    : { gym: [], homeSessions: selectHomeCardioSessions(slots, equipment, excludeIds, cycle, dislikedIds) };
}
