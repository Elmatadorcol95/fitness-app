import { parseMusclePriorities, type Exercise, type MuscleGroup } from './exercises';
import { selectExercisesForDayByMuscle } from './muscleBasedSelection';
import { selectCardio, createCardioCycleState, CARDIO_BLOCK_SECONDS, type CardioPlan } from './cardioSelection';
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

export function getRepScheme(primary: GoalKey, secondary?: GoalKey | null): RepScheme {
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

// Sustituye la antigua tabla fija de tramos por minutos (getExerciseCounts)
// por un cálculo derivado de la fórmula real de duración
// (estimateDuration: sets*(45+rest) por ejercicio, ver training.tsx) y del
// esquema real de sets/rest del objetivo (getRepScheme) — antes ninguna de
// las dos fórmulas se conocía entre sí, lo que dejaba huecos de hasta ~27
// min entre lo pedido y lo generado (ver auditoría de esta sesión).
// Construye la cuenta añadiendo un ítem a la vez en el patrón C,C,I,C,C,I,...
// (2 compuestos por cada aislamiento), aceptando cada ítem solo si acerca
// (o empata) el costo acumulado al presupuesto en segundos; en cuanto un
// ítem lo alejaría, se detiene. Sin techo artificial. Suelo obligatorio:
// nunca compounds:0, aunque el presupuesto no alcance ni para uno.
export function computeExerciseCounts(
  minutesPerSession: number,
  goalPrimary: GoalKey,
  goalSecondary: GoalKey | null,
): { compounds: number; isolations: number } {
  const scheme = getRepScheme(goalPrimary, goalSecondary);
  const compoundCost  = scheme.compoundSets  * (45 + scheme.compoundRest);
  const isolationCost = scheme.isolationSets * (45 + scheme.isolationRest);
  const budgetSeconds  = minutesPerSession * 60;

  const pattern: Array<'compound' | 'isolation'> = ['compound', 'compound', 'isolation'];
  let compounds  = 0;
  let isolations = 0;
  let cost = 0;

  for (let i = 0; ; i++) {
    const kind = pattern[i % pattern.length];
    const itemCost = kind === 'compound' ? compoundCost : isolationCost;
    const costWithItem = cost + itemCost;
    if (Math.abs(costWithItem - budgetSeconds) > Math.abs(cost - budgetSeconds)) break;
    cost = costWithItem;
    if (kind === 'compound') compounds++; else isolations++;
  }

  if (compounds === 0) compounds = 1;

  return { compounds, isolations };
}

export function getCardioSlots(goalPrimary: GoalKey, goalSecondary: GoalKey | null, totalSlots: number): number {
  const raw = goalPrimary === 'fat_loss' ? 2 : goalSecondary === 'fat_loss' ? 1 : 0;
  return Math.min(raw, Math.floor(totalSlots / 2));
}

export function getSplit(daysPerWeek: number): DayType[] {
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

export function buildPlanned(exs: Exercise[], sets: number, reps: string, rest: number, isCompound: boolean): PlannedExercise[] {
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

// Deriva las 5 señales que dependen del perfil (equipamiento parseado, si es
// gimnasio, prioridades musculares, y preferencias de like/dislike) y que
// tanto generatePlan() (plan automático) como createTemplate() (constructor
// propio, Fase D) necesitan por igual. Único punto de obtención — antes vivía
// inline dentro de generatePlan(); extraído sin cambiar el orden relativo de
// los awaits (dislikedIds antes que likedIds) ni el resultado de ningún valor.
//
// slice(0,6) en musclePriorities es defensa de corrupción de datos, NO la
// regla de negocio real (esa vive en la pantalla de prioridades, contando
// ZONAS seleccionadas — máx. 2 — no valores del array). Una zona puede
// agrupar varios MuscleGroup (ej. Core/Abdomen = ['core','abs']), así que 2
// zonas legítimas pueden superar 2 valores.
export async function getProfileSignals(profile: {
  location: string;
  equipment: string;
  musclePriorities?: string;
}): Promise<{
  equipment: string[];
  isGym: boolean;
  musclePriorities: MuscleGroup[];
  dislikedIds: Set<string>;
  likedIds: Set<string>;
}> {
  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment) as string[]; } catch { return []; }
  })();
  const isGym = profile.location === 'gym' || profile.location === 'both';
  const musclePriorities = parseMusclePriorities(profile.musclePriorities).slice(0, 6);
  const dislikedIds = await getDislikedIds();
  const likedIds = await getLikedIds();
  return { equipment, isGym, musclePriorities, dislikedIds, likedIds };
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
  const { equipment, isGym, musclePriorities, dislikedIds, likedIds } = await getProfileSignals(profile);

  const goalPrimary   = profile.goalPrimary as GoalKey;
  const goalSecondary = profile.goalSecondary as GoalKey | null;

  const scheme = getRepScheme(goalPrimary, goalSecondary);
  const counts = computeExerciseCounts(profile.minutesPerSession, goalPrimary, goalSecondary);
  const split  = getSplit(profile.daysPerWeek);

  const compoundCost  = scheme.compoundSets  * (45 + scheme.compoundRest);
  const isolationCost = scheme.isolationSets * (45 + scheme.isolationRest);
  const budgetSeconds  = profile.minutesPerSession * 60;

  // Cardio: único de los 4 consumidores de counts.compounds/isolations que
  // resta del presupuesto de fuerza (routineTemplates/routineMaterializer/
  // routineBuilder NO restan — decisión de producto ya existente, sin
  // tocar). Costo real en segundos por slot según contexto, en vez del
  // hueco aproximado de antes.
  const cardioSlotsRaw = goalPrimary === 'fat_loss' ? 2 : goalSecondary === 'fat_loss' ? 1 : 0;
  const HOME_SLOT_SECONDS_APPROX = 2 * 300 + 2 * 90; // 2 sesiones de casa + su descanso, aproximación conservadora
  const cardioSecondsPerSlot = isGym ? CARDIO_BLOCK_SECONDS : HOME_SLOT_SECONDS_APPROX;

  // Tope: el cardio no puede superar la mitad del presupuesto total en segundos.
  let cardioSlots = cardioSlotsRaw;
  while (cardioSlots > 0 && cardioSlots * cardioSecondsPerSlot > budgetSeconds / 2) {
    cardioSlots--;
  }
  const cardioSeconds = cardioSlots * cardioSecondsPerSlot;

  // Reduce fuerza (aislamientos primero, igual que antes) hasta acercarse lo
  // más posible al presupuesto restante tras reservar el cardio — mismo
  // criterio de "lo más cercano gana" que computeExerciseCounts, no un
  // simple "no superar": si el conteo inicial ya estaba más cerca del
  // objetivo que tras reducir (típico en perfiles sin cardio o con poco),
  // no reduce.
  const reducedCounts = { ...counts };
  const forceBudget = budgetSeconds - cardioSeconds;
  const costOf = (c: { compounds: number; isolations: number }) => c.compounds * compoundCost + c.isolations * isolationCost;
  while (reducedCounts.isolations > 0 || reducedCounts.compounds > 1) {
    const candidate = { ...reducedCounts };
    if (candidate.isolations > 0) candidate.isolations--;
    else candidate.compounds--;
    const currentDist   = Math.abs(costOf(reducedCounts) - forceBudget);
    const candidateDist = Math.abs(costOf(candidate) - forceBudget);
    if (candidateDist < currentDist) {
      reducedCounts.isolations  = candidate.isolations;
      reducedCounts.compounds   = candidate.compounds;
    } else {
      break;
    }
  }

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
