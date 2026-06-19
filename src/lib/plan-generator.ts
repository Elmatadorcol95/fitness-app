import { EXERCISES, type Exercise, type ExerciseCategory } from './exercises';

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

function getExerciseCounts(minutes: number): { compounds: number; isolations: number } {
  if (minutes <= 20) return { compounds: 2, isolations: 1 };
  if (minutes <= 30) return { compounds: 2, isolations: 2 };
  if (minutes <= 45) return { compounds: 3, isolations: 2 };
  if (minutes <= 60) return { compounds: 3, isolations: 3 };
  if (minutes <= 75) return { compounds: 4, isolations: 3 };
  if (minutes <= 90) return { compounds: 4, isolations: 4 };
  return { compounds: 5, isolations: 4 };
}

function getSplit(daysPerWeek: number): DayType[] {
  switch (daysPerWeek) {
    case 1: return ['full_body'];
    case 2: return ['full_body', 'full_body'];
    case 3: return ['push', 'pull', 'legs'];
    case 4: return ['upper', 'lower', 'upper', 'lower'];
    case 5: return ['push', 'pull', 'legs', 'upper', 'lower'];
    case 6: return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    case 7: return ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];
    default: return ['full_body'];
  }
}

function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}

const GYM_EQUIP_PRIORITY = new Set(['barbellPlates', 'cableMachine', 'legPressMachine', 'dumbbells', 'kettlebells']);

// Para usuarios de gimnasio: coloca ejercicios con carga antes de los de peso corporal
function sortGymFirst(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const aScore = a.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    const bScore = b.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    return bScore - aScore;
  });
}

function safePick<T>(arr: T[], index: number): T | undefined {
  if (!arr.length) return undefined;
  return arr[index % arr.length];
}

// Equipamiento que añade carga externa; sin él el ejercicio es de peso corporal
const LOADED_EQUIPMENT_PLAN = new Set(['barbellPlates', 'dumbbells', 'kettlebells', 'weightedVest']);

// Para ejercicios de peso corporal con esquemas de fuerza (max < 8 reps) → usar 8-12
function getEffectiveReps(exercise: Exercise, planReps: string): string {
  const parts   = planReps.split('-');
  const maxReps = parseInt(parts[parts.length - 1] ?? parts[0], 10);
  if (!isNaN(maxReps) && maxReps < 8 && !exercise.equipment.some(e => LOADED_EQUIPMENT_PLAN.has(e))) {
    return '8-12';
  }
  return planReps;
}

function buildPlanned(exs: Exercise[], sets: number, reps: string, rest: number, isCompound: boolean): PlannedExercise[] {
  return exs.map(e => ({ exerciseId: e.id, sets, reps: getEffectiveReps(e, reps), restSeconds: rest, isCompound }));
}

function selectExercisesForDay(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  scheme: RepScheme,
  offset: number,
): PlannedExercise[] {
  const rawAvailable = EXERCISES.filter(e => canDoExercise(e, equipment, isGym));
  const available = isGym ? sortGymFirst(rawAvailable) : rawAvailable;
  let compounds: Exercise[];
  let isolations: Exercise[];

  if (dayType === 'full_body') {
    const pushC = available.filter(e => e.category === 'push' && e.isCompound);
    const pullC = available.filter(e => e.category === 'pull' && e.isCompound);
    const legsC = available.filter(e => e.category === 'legs' && e.isCompound);
    const chosen: Exercise[] = [];
    const p = safePick(pushC, offset); if (p) chosen.push(p);
    const q = safePick(pullC, offset); if (q) chosen.push(q);
    const l = safePick(legsC, offset); if (l) chosen.push(l);
    if (counts.compounds > 3) {
      const extras = [...pushC, ...pullC, ...legsC].filter(e => !chosen.includes(e));
      chosen.push(...extras.slice(0, counts.compounds - 3));
    }
    compounds = chosen.slice(0, counts.compounds);
    const allIso = available.filter(e =>
      (['push', 'pull', 'legs', 'core'] as ExerciseCategory[]).includes(e.category) && !e.isCompound,
    );
    isolations = allIso.slice(offset % Math.max(allIso.length, 1), offset % Math.max(allIso.length, 1) + counts.isolations);
    if (isolations.length < counts.isolations) {
      isolations = allIso.slice(0, counts.isolations);
    }
  } else {
    const cats: ExerciseCategory[] =
      dayType === 'upper' ? ['push', 'pull'] :
      dayType === 'lower' ? ['legs', 'core']  :
      [dayType as ExerciseCategory];
    compounds  = available.filter(e => cats.includes(e.category) && e.isCompound).slice(0, counts.compounds);
    isolations = available.filter(e => cats.includes(e.category) && !e.isCompound).slice(0, counts.isolations);
  }

  return [
    ...buildPlanned(compounds,  scheme.compoundSets,  scheme.compoundReps,  scheme.compoundRest,  true),
    ...buildPlanned(isolations, scheme.isolationSets, scheme.isolationReps, scheme.isolationRest, false),
  ];
}

export function generatePlan(profile: {
  goalPrimary: string;
  goalSecondary?: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  location: string;
  equipment: string;
}): GeneratedPlan {
  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment) as string[]; } catch { return []; }
  })();
  const isGym  = profile.location === 'gym';
  const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
  const counts = getExerciseCounts(profile.minutesPerSession);
  const split  = getSplit(profile.daysPerWeek);

  const days: PlanDayData[] = split.map((dayType, i) => ({
    dayIndex: i,
    dayType,
    exercises: selectExercisesForDay(dayType, equipment, isGym, counts, scheme, i),
  }));

  return {
    goalPrimary:       profile.goalPrimary,
    goalSecondary:     profile.goalSecondary ?? null,
    daysPerWeek:       profile.daysPerWeek,
    minutesPerSession: profile.minutesPerSession,
    generatedAt:       Date.now(),
    days,
  };
}
