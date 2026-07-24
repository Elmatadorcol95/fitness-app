import { parseMusclePriorities, type Exercise, type MuscleGroup } from './exercises';
import { selectExercisesForDayByMuscle } from './muscleBasedSelection';
import { selectCardio, createCardioCycleState, type CardioPlan } from './cardioSelection';
import { getDislikedIds, getLikedIds } from './exercisePreferences';

export type DayType = 'full_body' | 'push' | 'pull' | 'legs' | 'upper' | 'lower';
export type GoalKey  = 'strength' | 'hypertrophy' | 'fat_loss';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string;         // "8-12", "3-5", "60s"
  restSeconds: number;
  isCompound: boolean;
}

export interface PlanDayData {
  dayIndex: number;
  dayType: DayType;
  exercises: PlannedExercise[];
  cardio: CardioPlan;
}

export interface GeneratedPlan {
  goalPrimary: string;
  goalSecondary: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  generatedAt: number;
  days: PlanDayData[];
}

interface RepScheme {
  compoundSets: number;
  compoundReps: string;
  compoundRest: number;
  isolationSets: number;
  isolationReps: string;
  isolationRest: number;
}

function getRepScheme(primary: GoalKey, secondary?: GoalKey | null): RepScheme {
  if (primary === 'strength') {
    return secondary === 'hypertrophy'
      ? { compoundSets: 4, compoundReps: '4-6', compoundRest: 150, isolationSets: 3, isolationReps: '8-10', isolationRest: 90 }
      : { compoundSets: 4, compoundReps: '3-5', compoundRest: 180, isolationSets: 3, isolationReps: '6-8', isolationRest: 120 };
  }
  if (primary === 'hypertrophy') {
    return secondary === 'fat_loss'
      ? { compoundSets: 4, compoundReps: '10-12', compoundRest: 75, isolationSets: 3, isolationReps: '12-15', isolationRest: 45 }
      : { compoundSets: 4, compoundReps: '8-12', compoundRest: 90, isolationSets: 3, isolationReps: '10-15', isolationRest: 60 };
  }
  // fat_loss
  return secondary === 'strength'
    ? { compoundSets: 3, compoundReps: '5-8', compoundRest: 120, isolationSets: 3, isolationReps: '12-15', isolationRest: 60 }
    : { compoundSets: 3, compoundReps: '12-15', compoundRest: 60, isolationSets: 3, isolationReps: '15-20', isolationRest: 45 };
}

export function getExerciseCounts(minutes: number): { compounds: number; isolations: number } {
  if (minutes <= 20) return { compounds: 2, isolations: 1 };
  if (minutes <= 30) return { compounds: 2, isolations: 2 };
  if (minutes <= 45) return { compounds: 3, isolations: 2 };
  if (minutes <= 60) return { compounds: 3, isolations: 3 };
  if (minutes <= 75) return { compounds: 4, isolations: 3 };
  if (minutes <= 90) return { compounds: 4, isolations: 4 };
  return { compounds: 5, isolations: 4 };
}

function getCardioSlots(goalPrimary: GoalKey, goalSecondary: GoalKey | null, totalSlots: number): number {
  const raw = goalPrimary === 'fat_loss' ? 2 : goalSecondary === 'fat_loss' ? 1 : 0;
  return Math.min(raw, Math.floor(totalSlots / 2));
}

function subtractCardioSlots(counts: { compounds: number; isolations: number }, cardioSlots: number): { compounds: number; isolations: number } {
  const fromIsolations = Math.min(cardioSlots, counts.isolations);
  const remaining = cardioSlots - fromIsolations;
  const fromCompounds = Math.min(remaining, counts.compounds);
  return {
    isolations: counts.isolations - fromIsolations,
    compounds: counts.compounds - fromCompounds,
  };
}

function getSplit(daysPerWeek: number): DayType[] {
  switch (daysPerWeek) {
    case 1: return ['full_body'];
    case 2: return ['full_body', 'full_body'];
    case 3: return ['push', 'pull', 'legs'];
    case 4: return ['push', 'pull', 'legs', 'full_body'];
    case 5: return ['push', 'full_body', 'pull', 'full_body', 'legs'];
    case 6: return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    case 7: return ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];
    default: return ['full_body'];
  }
}

export function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}

export function isExerciseUsable(ex: Exercise, equipment: string[], isGym: boolean, dislikedIds: Set<string>): boolean {
  return canDoExercise(ex, equipment, isGym) && !dislikedIds.has(ex.id);
}

// Solo la barra con discos acepta rangos de fuerza bajos (3-5, 4-6 reps)
const BARBELL_EQUIP = new Set(['barbellPlates']);

// Mancuerna/cable/máquina/kettlebell/peso corporal: mínimo 8-12 reps aunque el objetivo sea fuerza
function getEffectiveReps(exercise: Exercise, planReps: string): string {
  const parts   = planReps.split('-');
  const maxReps = parseInt(parts[parts.length - 1] ?? parts[0], 10);
  if (!isNaN(maxReps) && maxReps < 8) {
    if (exercise.equipment.some(e => BARBELL_EQUIP.has(e))) return planReps; // barra: respeta el esquema
    return '8-12'; // todo lo demás: mínimo 8-12
  }
  return planReps;
}

function buildPlanned(exs: Exercise[], sets: number, reps: string, rest: number, isCompound: boolean): PlannedExercise[] {
  return exs.map(e => ({ exerciseId: e.id, sets, reps: getEffectiveReps(e, reps), restSeconds: rest, isCompound }));
}

async function selectExercisesForDay(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  scheme: RepScheme,
  excludeIds: Set<string>,
  musclePriorities: MuscleGroup[] = [],
  dislikedIds: Set<string> = new Set(),
  likedIds: Set<string> = new Set(),
): Promise<PlannedExercise[]> {
  const selected = await selectExercisesForDayByMuscle(dayType, equipment, isGym, counts, excludeIds, musclePriorities, dislikedIds, likedIds);
  const compounds  = selected.filter(s => s.isCompound).map(s => s.exercise);
  const isolations = selected.filter(s => !s.isCompound).map(s => s.exercise);

  return [
    ...buildPlanned(compounds,  scheme.compoundSets,  scheme.compoundReps,  scheme.compoundRest,  true),
    ...buildPlanned(isolations, scheme.isolationSets, scheme.isolationReps, scheme.isolationRest, false),
  ];
}

export async function generatePlan(profile: {
  goalPrimary: string;
  goalSecondary?: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  location: string;
  equipment: string;
  musclePriorities?: string;
}): Promise<GeneratedPlan> {
  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment) as string[]; } catch { return []; }
  })();
  const isGym  = profile.location === 'gym' || profile.location === 'both';
  const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
  const counts = getExerciseCounts(profile.minutesPerSession);
  const split  = getSplit(profile.daysPerWeek);

  const totalSlotsPerDay = counts.compounds + counts.isolations;
  const cardioSlots = getCardioSlots(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null, totalSlotsPerDay);
  const reducedCounts = subtractCardioSlots(counts, cardioSlots);

  // Prioridades musculares del usuario (Fase 0-B-1). Punto único de obtención.
  // Defensa de corrupción de datos, NO la regla de negocio real (esa vive en la
  // pantalla de prioridades, contando ZONAS seleccionadas — máx. 2 — no valores
  // del array). Una zona puede agrupar varios MuscleGroup (ej. Core/Abdomen =
  // ['core','abs']), así que 2 zonas legítimas pueden superar 2 valores.
  // slice(0,6) es un tope generoso solo para datos corruptos; nunca lanza ni
  // bloquea la generación. Hoy nadie las fija todavía (sin UI), así que esto
  // es [] para todos los usuarios y la generación resulta idéntica a la anterior.
  const musclePriorities = parseMusclePriorities(profile.musclePriorities).slice(0, 6);
  const dislikedIds = await getDislikedIds();
  const likedIds = await getLikedIds();

  // Secuencial (no en paralelo): cada día necesita conocer los ejercicios ya
  // elegidos por los días anteriores de ESTA generación, vía excludeIds.
  const usedThisWeek = new Set<string>();
  const cardioCycle = createCardioCycleState();
  const days: PlanDayData[] = [];
  for (const [i, dayType] of split.entries()) {
    const exercises = await selectExercisesForDay(dayType, equipment, isGym, reducedCounts, scheme, usedThisWeek, musclePriorities, dislikedIds, likedIds);
    for (const ex of exercises) usedThisWeek.add(ex.exerciseId);
    const cardio = selectCardio(cardioSlots, equipment, isGym, usedThisWeek, cardioCycle, dislikedIds);
    for (const c of cardio.gym) usedThisWeek.add(c.exerciseId);
    for (const session of cardio.homeSessions) {
      for (const c of session.blocks) usedThisWeek.add(c.exerciseId);
    }
    days.push({ dayIndex: i, dayType, exercises, cardio });
  }

  return {
    goalPrimary:       profile.goalPrimary,
    goalSecondary:     profile.goalSecondary ?? null,
    daysPerWeek:       profile.daysPerWeek,
    minutesPerSession: profile.minutesPerSession,
    generatedAt:       Date.now(),
    days,
  };
}
