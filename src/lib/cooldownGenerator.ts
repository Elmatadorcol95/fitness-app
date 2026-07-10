import { EXERCISES, type Exercise } from './exercises';
import { canDoExercise, type DayType } from './plan-generator';

export interface CooldownItem {
  exercise: Exercise;
  durationSeconds: number;
}

const DEFAULT_STRETCH_SECONDS = 30;

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Mismo criterio que targetKeysFor() en warmupGenerator.ts (no exportada allí,
// por eso se replica aquí en vez de importarla).
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

function getCooldownPool(dayType: DayType, equipment: string[], isGym: boolean): Exercise[] {
  const targets = targetKeysFor(dayType);
  return EXERCISES.filter(e => {
    if (e.category !== 'mobility') return false;
    // Acepta 'cooldown' y 'both' (dead_hang, etc.); excluye los solo-warmup.
    if (e.movementPhase !== 'cooldown' && e.movementPhase !== 'both') return false;
    if (!canDoExercise(e, equipment, isGym)) return false;

    const isGeneral = !e.relevantDayTypes || e.relevantDayTypes.length === 0;
    if (isGeneral) return true;
    return targets.some(t => e.relevantDayTypes!.includes(t));
  });
}

// Recorre el pool (previamente barajado para variedad entre generaciones)
// sumando defaultDurationSeconds hasta igualar o superar totalSeconds; puede
// pasarse por la duración del último ítem (mejor completar el estiramiento
// que cortarlo). Si el pool se agota antes, repite desde el principio
// (round-robin efímero, sin memoria entre sesiones).
function fillCooldown(pool: Exercise[], totalSeconds: number): CooldownItem[] {
  const items: CooldownItem[] = [];
  if (pool.length === 0 || totalSeconds <= 0) return items;

  let covered = 0;
  let i = 0;
  while (covered < totalSeconds) {
    const exercise = pool[i % pool.length];
    const durationSeconds = exercise.defaultDurationSeconds ?? DEFAULT_STRETCH_SECONDS;
    items.push({ exercise, durationSeconds });
    covered += durationSeconds;
    i++;
  }
  return items;
}

export function generateCooldown(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  totalMinutes: 5 | 10 | 15,
): CooldownItem[] {
  const totalSeconds = totalMinutes * 60;
  const pool = shuffle(getCooldownPool(dayType, equipment, isGym));
  return fillCooldown(pool, totalSeconds);
}

// Alternativa determinista para el botón "Intercambiar": mismo pool que generó
// el ítem original, primer candidato no presente en alreadyShownIds. Sin
// Math.random() — el intercambio debe ser predecible. Sin memoria persistente
// entre llamadas. Espejo de getWarmupAlternative() en warmupGenerator.ts.
export function getCooldownAlternative(
  currentItem: CooldownItem,
  alreadyShownIds: string[],
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
): Exercise | null {
  if (currentItem.exercise.category !== 'mobility') return null;

  const pool = getCooldownPool(dayType, equipment, isGym);
  return pool.find(e => !alreadyShownIds.includes(e.id)) ?? null;
}
