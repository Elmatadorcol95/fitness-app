import { EXERCISES, type Exercise } from './exercises';
import { canDoExercise, type DayType } from './plan-generator';

export interface WarmupItem {
  exercise: Exercise;
  durationSeconds: number;
}

const GYM_CARDIO_OPEN_SECONDS = 180;
const HOME_CARDIO_OPEN_SECONDS = 60;
const DEFAULT_MOBILITY_SECONDS = 30;

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

function pickCardioOpener(isGym: boolean): WarmupItem | null {
  const pool = isGym
    ? EXERCISES.filter(e => e.category === 'cardio' && e.equipment.includes('cardioMachine'))
    : EXERCISES.filter(e => e.category === 'cardio' && e.equipment.length === 0);
  const exercise = pickRandom(pool);
  if (!exercise) return null;
  return { exercise, durationSeconds: isGym ? GYM_CARDIO_OPEN_SECONDS : HOME_CARDIO_OPEN_SECONDS };
}

// relevantDayTypes se guarda combinado (ej. ['push','upper']); basta comprobar
// la clave específica del día para capturar el subconjunto correcto del pool.
function targetKeysFor(dayType: DayType): Array<'push' | 'pull' | 'legs'> {
  switch (dayType) {
    case 'push': return ['push'];
    case 'pull': return ['pull'];
    case 'legs': return ['legs'];
    case 'lower': return ['legs'];
    case 'upper': return ['push', 'pull'];
    case 'full_body': return [];
  }
}

function getWarmupMobilityPool(dayType: DayType, equipment: string[], isGym: boolean): Exercise[] {
  const targets = targetKeysFor(dayType);
  return EXERCISES.filter(e => {
    if (e.category !== 'mobility') return false;
    // Excluye explícitamente los ítems solo de enfriamiento (movementPhase 'cooldown').
    if (e.movementPhase !== 'warmup' && e.movementPhase !== 'both') return false;
    if (!canDoExercise(e, equipment, isGym)) return false;

    const isGeneral = !e.relevantDayTypes || e.relevantDayTypes.length === 0;
    if (isGeneral) return true;
    return targets.some(t => e.relevantDayTypes!.includes(t));
  });
}

// Recorre el pool en orden sumando defaultDurationSeconds hasta igualar o superar
// remainingSeconds (puede pasarse por la duración del último ítem). Si el pool se
// agota antes, repite desde el principio (round-robin efímero, sin memoria entre sesiones).
function fillMobility(pool: Exercise[], remainingSeconds: number): WarmupItem[] {
  const items: WarmupItem[] = [];
  if (pool.length === 0 || remainingSeconds <= 0) return items;

  let covered = 0;
  let i = 0;
  while (covered < remainingSeconds) {
    const exercise = pool[i % pool.length];
    const durationSeconds = exercise.defaultDurationSeconds ?? DEFAULT_MOBILITY_SECONDS;
    items.push({ exercise, durationSeconds });
    covered += durationSeconds;
    i++;
  }
  return items;
}

export function generateWarmup(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  totalMinutes: 5 | 10 | 15,
): WarmupItem[] {
  const totalSeconds = totalMinutes * 60;
  const opener = pickCardioOpener(isGym);
  const remainingSeconds = totalSeconds - (opener?.durationSeconds ?? 0);

  const pool = getWarmupMobilityPool(dayType, equipment, isGym);
  const mobilityItems = fillMobility(pool, remainingSeconds);

  return opener ? [opener, ...mobilityItems] : mobilityItems;
}
