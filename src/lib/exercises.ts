import type { DayType } from './plan-generator';

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'
  | 'lats' | 'traps' | 'forearms' | 'abs' | 'adductors';

export type EquipmentKey =
  | 'dumbbells' | 'barbellPlates' | 'kettlebells'
  | 'resistanceBands' | 'miniGluteBands' | 'pullupBar' | 'parallettes'
  | 'rings' | 'trx' | 'adjustableBench' | 'plioBox' | 'medicineBall'
  | 'fitball' | 'abRoller' | 'jumpRope' | 'mat' | 'foamRoller'
  | 'sliders' | 'weightedVest'
  | 'cableMachine' | 'legPressMachine' | 'cardioMachine' | 'calfMachine' | 'hipAdductorMachine'
  | 'smithMachine' | 'assistedMachine' | 'abMachine' | 'hipAbductorMachine' | 'pecDeckMachine'
  | 'tBarRowMachine' | 'hipThrustMachine' | 'chestPressMachine' | 'shoulderPressMachine' | 'seatedRowMachine';

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'full_body' | 'mobility';

export interface Exercise {
  id: string;
  name: { es: string; en: string; fr: string };
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentKey[];  // vacío = solo peso corporal, sin equipamiento extra
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompound: boolean;
  isTimeBased?: boolean;        // true = se ejecuta por tiempo, no por reps (cardio)
  defaultDurationSeconds?: number;
  movementPhase?: 'warmup' | 'cooldown' | 'both';
  relevantDayTypes?: DayType[]; // días de plan donde este ejercicio de movilidad aplica
}

export const EXERCISES: Exercise[] = [
  // ── PUSH — Compound ──────────────────────────────────────────────────────────
  {
    id: 'push_up',
    name: { es: 'Flexión de brazos', en: 'Push-up', fr: 'Pompe' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'],
    equipment: [],
  },
  {
    id: 'pike_push_up',
    name: { es: 'Flexión en pica', en: 'Pike push-up', fr: 'Pompe en pique' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['shoulders', 'triceps'], secondaryMuscles: ['chest', 'core'],
    equipment: [],
  },
  {
    id: 'db_bench_press',
    name: { es: 'Press banca con mancuernas', en: 'Dumbbell bench press', fr: 'Développé couché haltères' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_overhead_press',
    name: { es: 'Press militar con mancuernas', en: 'Dumbbell overhead press', fr: 'Développé militaire haltères' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'core'],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_bench_press',
    name: { es: 'Press de banca con barra', en: 'Barbell bench press', fr: 'Développé couché barre' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'barbell_overhead_press',
    name: { es: 'Press militar con barra', en: 'Barbell overhead press', fr: 'Développé militaire barre' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'traps', 'core'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'dip',
    name: { es: 'Fondos en paralelas', en: 'Parallel bar dip', fr: 'Dips aux barres parallèles' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'],
    equipment: ['parallettes'],
  },
  {
    id: 'ring_dip',
    name: { es: 'Fondos en anillas', en: 'Ring dip', fr: 'Dips aux anneaux' },
    category: 'push', isCompound: true, difficulty: 'advanced',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'],
    equipment: ['rings'],
  },
  {
    id: 'trx_push_up',
    name: { es: 'Flexión en TRX', en: 'TRX push-up', fr: 'Pompe TRX' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'],
    equipment: ['trx'],
  },

  // ── PUSH — Isolation ─────────────────────────────────────────────────────────
  {
    id: 'db_lateral_raise',
    name: { es: 'Elevación lateral', en: 'Lateral raise', fr: 'Élévation latérale haltères' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_fly',
    name: { es: 'Aperturas con mancuernas', en: 'Dumbbell fly', fr: 'Écarté haltères' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_tricep_extension',
    name: { es: 'Extensión de tríceps', en: 'Tricep extension', fr: 'Extension triceps haltère' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'close_grip_push_up',
    name: { es: 'Flexión cerrada', en: 'Close-grip push-up', fr: 'Pompe prise serrée' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['triceps'], secondaryMuscles: ['chest'],
    equipment: [],
  },
  {
    id: 'band_lateral_raise',
    name: { es: 'Elevación lateral con banda', en: 'Band lateral raise', fr: 'Élévation latérale élastique' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: ['resistanceBands'],
  },
  {
    id: 'db_front_raise',
    name: { es: 'Elevación frontal', en: 'Front raise', fr: 'Élévation frontale haltères' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },

  // ── PULL — Compound ──────────────────────────────────────────────────────────
  {
    id: 'pull_up',
    name: { es: 'Dominada prona', en: 'Pull-up', fr: 'Traction pronation' },
    category: 'pull', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['lats', 'back'], secondaryMuscles: ['biceps', 'core'],
    equipment: ['pullupBar'],
  },
  {
    id: 'chin_up',
    name: { es: 'Dominada supina', en: 'Chin-up', fr: 'Traction supination' },
    category: 'pull', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['biceps', 'lats'], secondaryMuscles: ['back', 'core'],
    equipment: ['pullupBar'],
  },
  {
    id: 'inverted_row',
    name: { es: 'Remo invertido', en: 'Inverted row', fr: 'Rowing inversé' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps', 'core'],
    equipment: ['pullupBar'],
  },
  {
    id: 'db_row',
    name: { es: 'Remo con mancuerna', en: 'Dumbbell row', fr: 'Rowing haltère' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps'],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_row',
    name: { es: 'Remo con barra', en: 'Barbell row', fr: 'Rowing barre' },
    category: 'pull', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps', 'hamstrings'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'db_deadlift',
    name: { es: 'Peso muerto con mancuernas', en: 'Dumbbell deadlift', fr: 'Soulevé de terre haltères' },
    category: 'pull', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['back', 'hamstrings', 'glutes'], secondaryMuscles: ['quads', 'traps', 'core'],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_deadlift',
    name: { es: 'Peso muerto con barra', en: 'Barbell deadlift', fr: 'Soulevé de terre barre' },
    category: 'pull', isCompound: true, difficulty: 'advanced',
    primaryMuscles: ['back', 'hamstrings', 'glutes'], secondaryMuscles: ['quads', 'traps', 'core'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'kb_swing',
    name: { es: 'Swing con kettlebell', en: 'Kettlebell swing', fr: 'Balancé kettlebell' },
    category: 'pull', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['glutes', 'hamstrings'], secondaryMuscles: ['back', 'shoulders', 'core'],
    equipment: ['kettlebells'],
  },
  {
    id: 'trx_row',
    name: { es: 'Remo en TRX', en: 'TRX row', fr: 'Rowing TRX' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps', 'core'],
    equipment: ['trx'],
  },

  // ── PULL — Isolation ─────────────────────────────────────────────────────────
  {
    id: 'db_bicep_curl',
    name: { es: 'Curl de bíceps', en: 'Bicep curl', fr: 'Curl biceps haltères' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: ['dumbbells'],
  },
  {
    id: 'hammer_curl',
    name: { es: 'Curl martillo', en: 'Hammer curl', fr: 'Curl marteau' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps', 'forearms'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_curl',
    name: { es: 'Curl con barra', en: 'Barbell curl', fr: 'Curl biceps barre' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'face_pull_band',
    name: { es: 'Face pull con banda', en: 'Band face pull', fr: 'Face pull élastique' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'traps'], secondaryMuscles: ['back'],
    equipment: ['resistanceBands'],
  },
  {
    id: 'band_curl',
    name: { es: 'Curl con banda', en: 'Band curl', fr: 'Curl élastique' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps'], secondaryMuscles: [],
    equipment: ['resistanceBands'],
  },
  {
    id: 'superman',
    name: { es: 'Superman', en: 'Superman', fr: 'Superman' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
  },
  {
    id: 'ytw_prone',
    name: { es: 'Y-T-W en prono', en: 'Y-T-W prone', fr: 'Y-T-W en pronation' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back', 'shoulders'], secondaryMuscles: ['traps'],
    equipment: [],
  },
  {
    id: 'snow_angel_prone',
    name: { es: 'Ángeles de nieve invertidos', en: 'Prone snow angel', fr: 'Ange de neige en pronation' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back', 'shoulders'], secondaryMuscles: ['traps', 'core'],
    equipment: [],
  },

  // ── LEGS — Compound ──────────────────────────────────────────────────────────
  {
    id: 'squat_bodyweight',
    name: { es: 'Sentadilla libre', en: 'Bodyweight squat', fr: 'Squat au poids du corps' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
  },
  {
    id: 'goblet_squat',
    name: { es: 'Sentadilla copa', en: 'Goblet squat', fr: 'Squat gobelet' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['core', 'hamstrings'],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_squat',
    name: { es: 'Sentadilla con barra', en: 'Barbell squat', fr: 'Squat barre' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'lunge',
    name: { es: 'Zancada', en: 'Lunge', fr: 'Fente avant' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: [],
  },
  {
    id: 'db_lunge',
    name: { es: 'Zancada con mancuernas', en: 'Dumbbell lunge', fr: 'Fente haltères' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_romanian_deadlift',
    name: { es: 'Peso muerto rumano', en: 'Romanian deadlift', fr: 'Soulevé de terre roumain' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['back', 'core'],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_romanian_deadlift',
    name: { es: 'Peso muerto rumano con barra', en: 'Barbell Romanian deadlift', fr: 'Soulevé de terre roumain barre' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['back', 'core'],
    equipment: ['barbellPlates'],
  },
  {
    id: 'hip_thrust_bodyweight',
    name: { es: 'Hip thrust', en: 'Hip thrust', fr: 'Hip thrust poids du corps' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
  },
  {
    id: 'db_hip_thrust',
    name: { es: 'Hip thrust con mancuerna', en: 'DB hip thrust', fr: 'Hip thrust haltère' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['dumbbells', 'adjustableBench'],
  },
  {
    id: 'bulgarian_split_squat',
    name: { es: 'Sentadilla búlgara', en: 'Bulgarian split squat', fr: 'Fente bulgare' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['adjustableBench'],
  },
  {
    id: 'step_up',
    name: { es: 'Subida al cajón', en: 'Step-up', fr: 'Montée sur step' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['plioBox'],
  },
  {
    id: 'kb_goblet_squat',
    name: { es: 'Sentadilla copa con kettlebell', en: 'KB goblet squat', fr: 'Squat gobelet kettlebell' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['core', 'hamstrings'],
    equipment: ['kettlebells'],
  },

  // ── LEGS — Isolation ─────────────────────────────────────────────────────────
  {
    id: 'glute_bridge',
    name: { es: 'Puente de glúteos', en: 'Glute bridge', fr: 'Pont fessier' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
  },
  {
    id: 'calf_raise',
    name: { es: 'Elevación de talones', en: 'Calf raise', fr: 'Élévation sur pointes' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'lateral_band_walk',
    name: { es: 'Paso lateral con banda', en: 'Band lateral walk', fr: 'Pas latéral élastique' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: [],
    equipment: ['miniGluteBands'],
  },
  {
    id: 'glute_kickback_band',
    name: { es: 'Patada de glúteo con banda', en: 'Band glute kickback', fr: 'Kickback fessier élastique' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['resistanceBands'],
  },
  {
    id: 'sumo_squat',
    name: { es: 'Sentadilla sumo', en: 'Sumo squat', fr: 'Squat sumo' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: [],
  },
  {
    id: 'single_leg_rdl_bw',
    name: { es: 'Peso muerto rumano a una pierna', en: 'Single-leg Romanian deadlift', fr: 'Soulevé de terre roumain unipodal' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['back', 'core'],
    equipment: [],
  },

  // ── CORE ─────────────────────────────────────────────────────────────────────
  {
    id: 'plank',
    name: { es: 'Plancha', en: 'Plank', fr: 'Gainage' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: [],
  },
  {
    id: 'side_plank',
    name: { es: 'Plancha lateral', en: 'Side plank', fr: 'Gainage latéral' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: [],
  },
  {
    id: 'crunch',
    name: { es: 'Crunch abdominal', en: 'Crunch', fr: 'Crunch' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'leg_raise',
    name: { es: 'Elevación de piernas', en: 'Leg raise', fr: 'Élévation de jambes' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'russian_twist',
    name: { es: 'Giro ruso', en: 'Russian twist', fr: 'Rotation russe' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'dead_bug',
    name: { es: 'Dead bug', en: 'Dead bug', fr: 'Dead bug' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'mountain_climber',
    name: { es: 'Escalador', en: 'Mountain climber', fr: 'Grimpeur' },
    category: 'core', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['chest', 'shoulders'],
    equipment: [],
  },
  {
    id: 'ab_roller',
    name: { es: 'Rueda abdominal', en: 'Ab roller', fr: 'Roue abdominale' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: ['lats'],
    equipment: ['abRoller'],
  },
  {
    id: 'hanging_knee_raise',
    name: { es: 'Rodillas al pecho en barra', en: 'Hanging knee raise', fr: 'Relevé de genoux suspendu' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: [],
    equipment: ['pullupBar'],
  },

  // ── FULL BODY / CARDIO ────────────────────────────────────────────────────────
  {
    id: 'burpee',
    name: { es: 'Burpee', en: 'Burpee', fr: 'Burpee' },
    category: 'full_body', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['core', 'chest', 'quads'], secondaryMuscles: ['shoulders', 'glutes'],
    equipment: [],
  },
  {
    id: 'jump_rope',
    name: { es: 'Comba', en: 'Jump rope', fr: 'Corde à sauter' },
    category: 'cardio', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves', 'core'], secondaryMuscles: [],
    equipment: ['jumpRope'],
    isTimeBased: true, defaultDurationSeconds: 60,
  },
  {
    id: 'box_jump',
    name: { es: 'Salto al cajón', en: 'Box jump', fr: 'Saut sur boîte' },
    category: 'full_body', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'core'],
    equipment: ['plioBox'],
  },
  {
    id: 'kb_thruster',
    name: { es: 'Thruster con kettlebell', en: 'KB thruster', fr: 'Thruster kettlebell' },
    category: 'full_body', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'shoulders'], secondaryMuscles: ['glutes', 'core', 'triceps'],
    equipment: ['kettlebells'],
  },
  {
    id: 'med_ball_slam',
    name: { es: 'Lanzamiento de balón medicinal', en: 'Med ball slam', fr: 'Lancer de médecine-ball' },
    category: 'full_body', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['core', 'back'], secondaryMuscles: ['shoulders', 'abs'],
    equipment: ['medicineBall'],
  },

  // ── GYM — PUSH (polea/máquina) ───────────────────────────────────────────────
  {
    id: 'incline_barbell_press',
    name: { es: 'Press inclinado con barra', en: 'Incline barbell press', fr: 'Développé incliné barre' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['barbellPlates', 'adjustableBench'],
  },
  {
    id: 'cable_fly',
    name: { es: 'Aperturas en polea', en: 'Cable fly', fr: 'Écarté poulie' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
    equipment: ['cableMachine'],
  },
  {
    id: 'machine_chest_press',
    name: { es: 'Press pectoral en máquina', en: 'Machine chest press', fr: 'Développé pectoral machine' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['chestPressMachine'],
  },
  {
    id: 'cable_lateral_raise',
    name: { es: 'Elevación lateral en polea', en: 'Cable lateral raise', fr: 'Élévation latérale poulie' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_tricep_pushdown',
    name: { es: 'Jalón de tríceps en polea', en: 'Cable tricep pushdown', fr: 'Extension triceps poulie' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    equipment: ['cableMachine'],
  },
  {
    id: 'machine_overhead_press',
    name: { es: 'Press de hombros en máquina', en: 'Machine overhead press', fr: 'Développé épaules machine' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'],
    equipment: ['shoulderPressMachine'],
  },

  // ── GYM — PULL (polea/máquina) ───────────────────────────────────────────────
  {
    id: 'lat_pulldown',
    name: { es: 'Jalón al pecho en polea', en: 'Lat pulldown', fr: 'Tirage poulie haute' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['lats', 'back'], secondaryMuscles: ['biceps'],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_row',
    name: { es: 'Remo en polea baja', en: 'Cable row', fr: 'Rowing poulie basse' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps'],
    equipment: ['cableMachine'],
  },
  {
    id: 'machine_row',
    name: { es: 'Remo en máquina', en: 'Machine row', fr: 'Rowing machine' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps'],
    equipment: ['seatedRowMachine'],
  },
  {
    id: 'cable_face_pull',
    name: { es: 'Face pull en polea', en: 'Cable face pull', fr: 'Face pull poulie' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'traps'], secondaryMuscles: ['back'],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_curl',
    name: { es: 'Curl de bíceps en polea', en: 'Cable curl', fr: 'Curl biceps poulie' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: ['cableMachine'],
  },

  // ── GYM — LEGS (máquinas) ────────────────────────────────────────────────────
  {
    id: 'leg_press',
    name: { es: 'Prensa de piernas', en: 'Leg press', fr: 'Presse à cuisses' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['legPressMachine'],
  },
  {
    id: 'hack_squat',
    name: { es: 'Sentadilla hack', en: 'Hack squat', fr: 'Squat hack' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['legPressMachine'],
  },
  {
    id: 'leg_curl',
    name: { es: 'Curl femoral en máquina', en: 'Leg curl', fr: 'Leg curl machine' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes'],
    equipment: ['legPressMachine'],
  },
  {
    id: 'leg_extension',
    name: { es: 'Extensión de cuádriceps', en: 'Leg extension', fr: 'Leg extension' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['quads'], secondaryMuscles: [],
    equipment: ['legPressMachine'],
  },
  {
    id: 'seated_calf_raise',
    name: { es: 'Elevación de talones sentado', en: 'Seated calf raise', fr: 'Mollet assis machine' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['legPressMachine'],
  },
  {
    id: 'cable_hip_abduction',
    name: { es: 'Abducción de cadera en polea', en: 'Cable hip abduction', fr: 'Abduction hanche poulie' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: [],
    equipment: ['cableMachine'],
  },

  // ── CARDIO — Gimnasio (máquinas) ─────────────────────────────────────────────
  {
    id: 'elliptical',
    name: { es: 'Elíptica', en: 'Elliptical', fr: 'Elliptique' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: ['cardioMachine'],
    isTimeBased: true, defaultDurationSeconds: 300,
  },
  {
    id: 'treadmill',
    name: { es: 'Cinta de correr', en: 'Treadmill', fr: 'Tapis de course' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'hamstrings'], secondaryMuscles: ['calves', 'glutes'],
    equipment: ['cardioMachine'],
    isTimeBased: true, defaultDurationSeconds: 300,
  },
  {
    id: 'stationary_bike',
    name: { es: 'Bici estática', en: 'Stationary bike', fr: "Vélo d'appartement" },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: ['cardioMachine'],
    isTimeBased: true, defaultDurationSeconds: 300,
  },
  {
    id: 'rowing_machine_cardio',
    name: { es: 'Remo (máquina)', en: 'Rowing machine', fr: 'Rameur' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['back', 'quads'], secondaryMuscles: ['lats', 'hamstrings', 'core'],
    equipment: ['cardioMachine'],
    isTimeBased: true, defaultDurationSeconds: 300,
  },
  {
    id: 'stair_climber',
    name: { es: 'Escalera automática', en: 'Stair climber', fr: 'Escalier mécanique' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'hamstrings'],
    equipment: ['cardioMachine'],
    isTimeBased: true, defaultDurationSeconds: 300,
  },

  // ── CARDIO — Casa ─────────────────────────────────────────────────────────────
  {
    id: 'jumping_jacks',
    name: { es: 'Salto de tijera', en: 'Jumping jack', fr: 'Jumping jack' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['calves', 'core'], secondaryMuscles: ['shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'high_knees',
    name: { es: 'Rodillas al pecho', en: 'High knees', fr: 'Montées de genoux' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'core'], secondaryMuscles: ['calves'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'mountain_climbers',
    name: { es: 'Escaladores', en: 'Mountain climbers', fr: 'Grimpeurs' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['chest', 'shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'burpees',
    name: { es: 'Burpees', en: 'Burpees', fr: 'Burpees' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['core', 'chest', 'quads'], secondaryMuscles: ['shoulders', 'glutes'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'skater_jumps',
    name: { es: 'Saltos laterales tipo patinador', en: 'Skater jumps', fr: 'Sauts patineur' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['glutes', 'quads'], secondaryMuscles: ['calves', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'squat_jumps',
    name: { es: 'Sentadilla con salto', en: 'Squat jump', fr: 'Squat sauté' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'butt_kicks',
    name: { es: 'Talones al glúteo', en: 'Butt kicks', fr: 'Talons-fesses' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['hamstrings', 'calves'], secondaryMuscles: ['quads'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'bear_crawl',
    name: { es: 'Oso caminante', en: 'Bear crawl', fr: "Marche de l'ours" },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['core', 'shoulders'], secondaryMuscles: ['quads', 'chest'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'lateral_shuffle',
    name: { es: 'Desplazamiento lateral', en: 'Lateral shuffle', fr: 'Déplacement latéral' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['calves', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'broad_jumps',
    name: { es: 'Salto horizontal', en: 'Broad jump', fr: 'Saut en longueur' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'shadow_boxing',
    name: { es: 'Sombra de boxeo', en: 'Shadow boxing', fr: "Boxe à l'ombre" },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'core'], secondaryMuscles: ['triceps', 'chest'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 45,
  },
  {
    id: 'step_ups',
    name: { es: 'Subida a banco/escalón', en: 'Step-ups', fr: 'Montées sur banc' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'inchworm_walkout',
    name: { es: 'Inchworm', en: 'Inchworm walkout', fr: 'Inchworm' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['core', 'shoulders'], secondaryMuscles: ['hamstrings', 'chest'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'jumping_lunges',
    name: { es: 'Zancada saltada', en: 'Jumping lunge', fr: 'Fente sautée' },
    category: 'cardio', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'calves'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'burpee_sin_salto',
    name: { es: 'Burpee sin salto', en: 'Burpee (no jump)', fr: 'Burpee sans saut' },
    category: 'cardio', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['core', 'chest', 'quads'], secondaryMuscles: ['shoulders', 'glutes'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30,
  },

  // ── MOVILIDAD — General (calentamiento, sin día específico) ──────────────────
  {
    id: 'arm_circles',
    name: { es: 'Círculos de brazos', en: 'Arm circles', fr: 'Cercles de bras' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'torso_twists',
    name: { es: 'Giros de torso', en: 'Torso twists', fr: 'Rotations du buste' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['core'], secondaryMuscles: ['abs'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'cat_cow',
    name: { es: 'Gato-vaca', en: 'Cat-cow', fr: 'Chat-vache' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'core'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'hip_circles',
    name: { es: 'Círculos de cadera', en: 'Hip circles', fr: 'Cercles de hanche' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'deep_squat_hold',
    name: { es: 'Sentadilla profunda mantenida', en: 'Deep squat hold', fr: 'Squat profond maintenu' },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'ankle_circles',
    name: { es: 'Círculos de tobillo', en: 'Ankle circles', fr: 'Cercles de cheville' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'thoracic_open_book',
    name: { es: 'Apertura torácica', en: 'Thoracic open book', fr: 'Ouverture thoracique' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'core'], secondaryMuscles: ['shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'worlds_greatest_stretch',
    name: { es: 'El mejor estiramiento del mundo', en: "World's greatest stretch", fr: 'Le meilleur étirement du monde' },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['core', 'shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'downdog_to_cobra',
    name: { es: 'Perro boca abajo a cobra', en: 'Downward dog to cobra', fr: 'Chien tête en bas à cobra' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'shoulders'], secondaryMuscles: ['core', 'chest'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },
  {
    id: 'hip_90_90_switch',
    name: { es: 'Cambios de cadera 90/90', en: '90/90 hip switch', fr: 'Changement de hanche 90/90' },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup',
  },

  // ── MOVILIDAD — Piernas (relevantDayTypes: legs, lower) ──────────────────────
  {
    id: 'dynamic_bodyweight_squat',
    name: { es: 'Sentadilla dinámica', en: 'Dynamic bodyweight squat', fr: 'Squat dynamique au poids du corps' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'leg_swings',
    name: { es: 'Balanceo de pierna', en: 'Leg swings', fr: 'Balancements de jambe' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['quads'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'walking_lunge_twist',
    name: { es: 'Zancada caminando con giro', en: 'Walking lunge twist', fr: 'Fente marchée avec rotation' },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['core', 'hamstrings'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'glute_bridge_activation',
    name: { es: 'Activación de puente de glúteos', en: 'Glute bridge activation', fr: 'Activation pont fessier' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'lateral_lunge_dynamic',
    name: { es: 'Zancada lateral dinámica', en: 'Dynamic lateral lunge', fr: 'Fente latérale dynamique' },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'hamstring_sweep',
    name: { es: 'Barrido de isquiotibiales', en: 'Hamstring sweep', fr: 'Balayage ischio-jambiers' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'back'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'fire_hydrants',
    name: { es: 'Hidrante', en: 'Fire hydrants', fr: 'Ouverture de hanche à 4 pattes' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'clamshell',
    name: { es: 'Almeja', en: 'Clamshell', fr: 'Palourde' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: [],
    equipment: ['miniGluteBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'monster_walk',
    name: { es: 'Caminata de monstruo', en: 'Monster walk', fr: 'Marche du monstre' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['quads'],
    equipment: ['miniGluteBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'hip_airplanes',
    name: { es: 'Aviones de cadera', en: 'Hip airplanes', fr: 'Avion de hanche' },
    category: 'mobility', isCompound: true, difficulty: 'advanced',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },

  // ── MOVILIDAD — Empuje (relevantDayTypes: push, upper) ───────────────────────
  {
    id: 'shoulder_rotation',
    name: { es: 'Rotación de hombro', en: 'Shoulder rotation', fr: "Rotation d'épaule" },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'wrist_mobility',
    name: { es: 'Movilidad de muñeca', en: 'Wrist mobility', fr: 'Mobilité du poignet' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'plank_shoulder_taps',
    name: { es: 'Toques de hombro en plancha', en: 'Plank shoulder taps', fr: "Touches d'épaule en planche" },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['core', 'shoulders'], secondaryMuscles: ['chest'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'scapular_pushup',
    name: { es: 'Flexión escapular', en: 'Scapular push-up', fr: 'Pompe scapulaire' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['chest', 'shoulders'], secondaryMuscles: ['triceps'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'band_pass_through',
    name: { es: 'Pass-through con banda', en: 'Band pass-through', fr: 'Passage de bande' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['chest', 'back'],
    equipment: ['resistanceBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'wall_slides',
    name: { es: 'Deslizamiento en pared', en: 'Wall slides', fr: 'Glissades murales' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['back'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'band_external_rotation',
    name: { es: 'Rotación externa con banda', en: 'Band external rotation', fr: 'Rotation externe élastique' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: [],
    equipment: ['resistanceBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['push', 'upper'],
  },

  // ── MOVILIDAD — Tirón (relevantDayTypes: pull, upper) ────────────────────────
  {
    id: 'scapular_retraction',
    name: { es: 'Retracción escapular', en: 'Scapular retraction', fr: 'Rétraction scapulaire' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back'], secondaryMuscles: ['traps'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'band_pull_apart',
    name: { es: 'Apertura con banda', en: 'Band pull-apart', fr: 'Écartement élastique' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'back'], secondaryMuscles: ['traps'],
    equipment: ['resistanceBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'dead_hang',
    name: { es: 'Colgado pasivo', en: 'Dead hang', fr: 'Suspension passive' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['lats', 'back'], secondaryMuscles: ['forearms'],
    equipment: ['pullupBar'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'both', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'scapular_pullup',
    name: { es: 'Dominada escapular', en: 'Scapular pull-up', fr: 'Traction scapulaire' },
    category: 'mobility', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['lats', 'back'], secondaryMuscles: ['traps'],
    equipment: ['pullupBar'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'band_straight_arm_pulldown',
    name: { es: 'Jalón de brazos rectos con banda', en: 'Band straight-arm pulldown', fr: 'Tirage bras tendus élastique' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['lats'], secondaryMuscles: ['back'],
    equipment: ['resistanceBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'band_face_pull_light',
    name: { es: 'Face pull ligero con banda', en: 'Light band face pull', fr: 'Face pull léger élastique' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['shoulders', 'traps'], secondaryMuscles: ['back'],
    equipment: ['resistanceBands'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'prone_swimmers',
    name: { es: 'Nadadores en prono', en: 'Prone swimmers', fr: 'Nageurs en pronation' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'shoulders'], secondaryMuscles: ['glutes', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'lat_stretch_dynamic',
    name: { es: 'Estiramiento dinámico de dorsal', en: 'Dynamic lat stretch', fr: 'Étirement dynamique du dorsal' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['lats'], secondaryMuscles: ['back'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['pull', 'upper'],
  },

  // ── MOVILIDAD — Enfriamiento — Piernas (relevantDayTypes: legs, lower) ───────
  {
    id: 'seated_hamstring_stretch',
    name: { es: 'Estiramiento de isquiotibiales sentado', en: 'Seated hamstring stretch', fr: 'Étirement des ischio-jambiers assis' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['back'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'standing_quad_stretch',
    name: { es: 'Estiramiento de cuádriceps de pie', en: 'Standing quad stretch', fr: 'Étirement du quadriceps debout' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['quads'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'kneeling_hip_flexor_stretch',
    name: { es: 'Estiramiento de flexor de cadera de rodillas', en: 'Kneeling hip flexor stretch', fr: 'Étirement du fléchisseur de hanche à genoux' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['quads'], secondaryMuscles: ['core'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'calf_stretch',
    name: { es: 'Estiramiento de gemelos', en: 'Calf stretch', fr: 'Étirement du mollet' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'foam_roll_quads',
    name: { es: 'Rodillo de espuma en cuádriceps', en: 'Foam roll quads', fr: 'Rouleau de mousse quadriceps' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['quads'], secondaryMuscles: [],
    equipment: ['foamRoller'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'foam_roll_glutes',
    name: { es: 'Rodillo de espuma en glúteos', en: 'Foam roll glutes', fr: 'Rouleau de mousse fessiers' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: [],
    equipment: ['foamRoller'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'pigeon_stretch',
    name: { es: 'Figura 4', en: 'Pigeon stretch', fr: 'Étirement du pigeon' },
    category: 'mobility', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 45, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'static_90_90_hip_stretch',
    name: { es: 'Estiramiento de cadera 90/90 estático', en: 'Static 90/90 hip stretch', fr: 'Étirement statique de hanche 90/90' },
    category: 'mobility', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 45, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'couch_stretch',
    name: { es: 'Estiramiento de sofá', en: 'Couch stretch', fr: 'Étirement du canapé' },
    category: 'mobility', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['quads'], secondaryMuscles: ['glutes'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 45, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },

  // ── MOVILIDAD — Enfriamiento — Empuje (relevantDayTypes: push, upper) ────────
  {
    id: 'doorway_chest_stretch',
    name: { es: 'Estiramiento de pecho en marco de puerta', en: 'Doorway chest stretch', fr: "Étirement pectoral dans l'embrasure" },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['push', 'upper'],
  },
  {
    id: 'overhead_triceps_stretch',
    name: { es: 'Estiramiento de tríceps por encima de la cabeza', en: 'Overhead triceps stretch', fr: 'Étirement du triceps au-dessus de la tête' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['triceps'], secondaryMuscles: ['shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['push', 'upper'],
  },

  // ── MOVILIDAD — Enfriamiento — Tirón (relevantDayTypes: pull, upper) ─────────
  {
    id: 'childs_pose',
    name: { es: 'Postura del niño', en: "Child's pose", fr: "Posture de l'enfant" },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['shoulders'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'foam_roll_upper_back',
    name: { es: 'Rodillo de espuma en espalda alta', en: 'Foam roll upper back', fr: 'Rouleau de mousse haut du dos' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back'], secondaryMuscles: ['traps'],
    equipment: ['foamRoller'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'lat_stretch_static',
    name: { es: 'Estiramiento estático de dorsal', en: 'Static lat stretch', fr: 'Étirement statique du dorsal' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['lats'], secondaryMuscles: ['back'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'biceps_wall_stretch',
    name: { es: 'Estiramiento de bíceps en pared', en: 'Biceps wall stretch', fr: 'Étirement du biceps au mur' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['pull', 'upper'],
  },
  {
    id: 'thread_the_needle_static',
    name: { es: 'Aguja enhebrada estática', en: 'Static thread the needle', fr: 'Aiguille statique' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back', 'shoulders'], secondaryMuscles: ['traps'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown', relevantDayTypes: ['pull', 'upper'],
  },

  // ── MOVILIDAD — Enfriamiento — General (sin día específico) ──────────────────
  {
    id: 'fitball_core_stretch',
    name: { es: 'Estiramiento de core en fitball', en: 'Fitball core stretch', fr: 'Étirement du gainage sur fitball' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['back'],
    equipment: ['fitball'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },
  {
    id: 'supine_spinal_twist',
    name: { es: 'Giro espinal supino', en: 'Supine spinal twist', fr: 'Torsion vertébrale allongée' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core', 'back'], secondaryMuscles: ['glutes'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },
  {
    id: 'cobra_sphinx_stretch',
    name: { es: 'Estiramiento cobra-esfinge', en: 'Cobra-sphinx stretch', fr: 'Étirement cobra-sphinx' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['back', 'core'], secondaryMuscles: ['chest'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },
  {
    id: 'forearm_flexor_stretch',
    name: { es: 'Estiramiento de flexores del antebrazo', en: 'Forearm flexor stretch', fr: "Étirement des fléchisseurs de l'avant-bras" },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },
  {
    id: 'forearm_extensor_stretch',
    name: { es: 'Estiramiento de extensores del antebrazo', en: 'Forearm extensor stretch', fr: "Étirement des extenseurs de l'avant-bras" },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },
  {
    id: 'upper_trap_stretch',
    name: { es: 'Estiramiento de trapecio superior', en: 'Upper trap stretch', fr: 'Étirement du trapèze supérieur' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['traps'], secondaryMuscles: ['shoulders'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },
  {
    id: 'levator_scapulae_stretch',
    name: { es: 'Estiramiento del elevador de la escápula', en: 'Levator scapulae stretch', fr: "Étirement de l'élévateur de la scapula" },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['traps', 'shoulders'], secondaryMuscles: ['back'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'cooldown',
  },

  // ── CORE — Cable ──────────────────────────────────────────────────────────────
  {
    id: 'cable_woodchop',
    name: { es: 'Cable woodchop', en: 'Cable woodchop', fr: 'Woodchop à la poulie' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_pallof_press',
    name: { es: 'Pallof press en cable', en: 'Cable Pallof press', fr: 'Pallof press à la poulie' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core'], secondaryMuscles: ['shoulders'],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_crunch',
    name: { es: 'Crunch en polea', en: 'Cable crunch', fr: 'Crunch à la poulie' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs'], secondaryMuscles: ['core'],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_reverse_crunch',
    name: { es: 'Reverse crunch en polea', en: 'Cable reverse crunch', fr: 'Reverse crunch à la poulie' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['abs'], secondaryMuscles: ['core'],
    equipment: ['cableMachine'],
  },
  {
    id: 'cable_dead_bug',
    name: { es: 'Dead bug en cable', en: 'Cable dead bug', fr: 'Dead bug à la poulie' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: [],
    equipment: ['cableMachine'],
  },

  // ── CORE — Mancuernas ─────────────────────────────────────────────────────────
  {
    id: 'weighted_crunch',
    name: { es: 'Crunch con peso', en: 'Weighted crunch', fr: 'Crunch lesté' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_side_bend',
    name: { es: 'Flexión lateral con mancuerna', en: 'Dumbbell side bend', fr: 'Flexion latérale avec haltère' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_russian_twist',
    name: { es: 'Russian twist con mancuerna', en: 'Dumbbell Russian twist', fr: 'Rotation russe avec haltère' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_dead_bug',
    name: { es: 'Dead bug con mancuerna', en: 'Dumbbell dead bug', fr: 'Dead bug avec haltères' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'farmers_carry',
    name: { es: "Farmer's carry", en: "Farmer's carry", fr: 'Marche du fermier' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core'], secondaryMuscles: ['forearms', 'traps'],
    equipment: ['dumbbells'],
  },
  {
    id: 'suitcase_carry',
    name: { es: 'Suitcase carry', en: 'Suitcase carry', fr: 'Marche valise' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core'], secondaryMuscles: ['forearms'],
    equipment: ['dumbbells'],
  },
  {
    id: 'db_plank_drag_through',
    name: { es: 'Plancha con arrastre de mancuerna', en: 'Dumbbell plank drag-through', fr: "Planche avec traction d'haltère" },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['dumbbells'],
  },

  // ── CORE — Kettlebells ────────────────────────────────────────────────────────
  {
    id: 'kb_around_the_world',
    name: { es: 'Around the world', en: 'Kettlebell around the world', fr: 'Tour du monde kettlebell' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core'], secondaryMuscles: ['shoulders'],
    equipment: ['kettlebells'],
  },
  {
    id: 'turkish_getup',
    name: { es: 'Turkish get-up', en: 'Turkish get-up', fr: 'Lever turc' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core'], secondaryMuscles: ['shoulders', 'glutes'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_windmill',
    name: { es: 'Windmill', en: 'Kettlebell windmill', fr: 'Moulin à vent kettlebell' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core'], secondaryMuscles: ['shoulders', 'hamstrings'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_suitcase_carry',
    name: { es: 'Suitcase carry con kettlebell', en: 'Kettlebell suitcase carry', fr: 'Marche valise kettlebell' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core'], secondaryMuscles: ['forearms'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_russian_twist',
    name: { es: 'Russian twist con kettlebell', en: 'Kettlebell Russian twist', fr: 'Rotation russe kettlebell' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: [],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_farmer_carry',
    name: { es: "Farmer's carry con kettlebell", en: "Kettlebell farmer's carry", fr: 'Marche du fermier kettlebell' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core'], secondaryMuscles: ['forearms', 'traps'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_halo',
    name: { es: 'Halo', en: 'Kettlebell halo', fr: 'Halo kettlebell' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core'], secondaryMuscles: ['shoulders'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_plank_drag_through',
    name: { es: 'Plancha con arrastre de kettlebell', en: 'Kettlebell plank drag-through', fr: 'Planche avec traction de kettlebell' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['kettlebells'],
  },

  // ── CORE — Bandas ─────────────────────────────────────────────────────────────
  {
    id: 'pallof_press_band',
    name: { es: 'Pallof press con banda', en: 'Band Pallof press', fr: 'Pallof press élastique' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['core'], secondaryMuscles: ['shoulders'],
    equipment: ['resistanceBands'],
  },

  // ── CORE — TRX ────────────────────────────────────────────────────────────────
  {
    id: 'trx_fallout',
    name: { es: 'TRX fallout', en: 'TRX fallout', fr: 'TRX fallout' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['trx'],
  },
  {
    id: 'trx_knee_tuck',
    name: { es: 'TRX knee tuck', en: 'TRX knee tuck', fr: 'TRX knee tuck' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: [],
    equipment: ['trx'],
  },
  {
    id: 'trx_pike',
    name: { es: 'TRX pike', en: 'TRX pike', fr: 'TRX pike' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['trx'],
  },
  {
    id: 'trx_body_saw',
    name: { es: 'TRX body saw', en: 'TRX body saw', fr: 'TRX body saw' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['trx'],
  },
  {
    id: 'trx_plank',
    name: { es: 'TRX plank', en: 'TRX plank', fr: 'TRX plank' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['trx'],
  },
  {
    id: 'trx_mountain_climber',
    name: { es: 'TRX mountain climber', en: 'TRX mountain climber', fr: 'TRX mountain climber' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['quads', 'shoulders'],
    equipment: ['trx'],
  },
  {
    id: 'trx_atomic_pushup',
    name: { es: 'TRX atomic push-up', en: 'TRX atomic push-up', fr: 'TRX atomic push-up' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['chest', 'shoulders', 'triceps'],
    equipment: ['trx'],
  },
  {
    id: 'trx_kneeling_rollout',
    name: { es: 'TRX kneeling rollout', en: 'TRX kneeling rollout', fr: 'TRX kneeling rollout' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['lats'],
    equipment: ['trx'],
  },

  // ── CORE — Fitball ────────────────────────────────────────────────────────────
  {
    id: 'fitball_crunch',
    name: { es: 'Crunch en fitball', en: 'Fitball crunch', fr: 'Crunch sur fitball' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs'], secondaryMuscles: ['core'],
    equipment: ['fitball'],
  },
  {
    id: 'fitball_plank',
    name: { es: 'Plancha en fitball', en: 'Fitball plank', fr: 'Planche sur fitball' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['fitball'],
  },
  {
    id: 'fitball_pike',
    name: { es: 'Pike en fitball', en: 'Fitball pike', fr: 'Pike sur fitball' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['fitball'],
  },
  {
    id: 'fitball_knee_tuck',
    name: { es: 'Knee tuck en fitball', en: 'Fitball knee tuck', fr: 'Knee tuck sur fitball' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['fitball'],
  },
  {
    id: 'stir_the_pot',
    name: { es: 'Stir the pot', en: 'Stir the pot', fr: 'Stir the pot' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['fitball'],
  },
  {
    id: 'fitball_rollout',
    name: { es: 'Rollout en fitball', en: 'Fitball rollout', fr: 'Rollout sur fitball' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: ['lats'],
    equipment: ['fitball'],
  },

  // ── CORE — Sliders ────────────────────────────────────────────────────────────
  {
    id: 'slider_body_saw',
    name: { es: 'Body saw con deslizadores', en: 'Slider body saw', fr: 'Body saw avec sliders' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['sliders'],
  },
  {
    id: 'slider_mountain_climber',
    name: { es: 'Mountain climber con deslizadores', en: 'Slider mountain climber', fr: 'Mountain climber avec sliders' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['quads', 'shoulders'],
    equipment: ['sliders'],
  },
  {
    id: 'slider_knee_tuck',
    name: { es: 'Knee tuck con deslizadores', en: 'Slider knee tuck', fr: 'Knee tuck avec sliders' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: [],
    equipment: ['sliders'],
  },
  {
    id: 'slider_pike',
    name: { es: 'Pike con deslizadores', en: 'Slider pike', fr: 'Pike avec sliders' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['sliders'],
  },
  {
    id: 'slider_plank_circles',
    name: { es: 'Círculos de plancha con deslizadores', en: 'Slider plank circles', fr: 'Cercles en planche avec sliders' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['sliders'],
  },

  // ── FUERZA — TRX ──────────────────────────────────────────────────────────────
  {
    id: 'trx_squat',
    name: { es: 'Sentadilla en TRX', en: 'TRX squat', fr: 'Squat TRX' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['trx'],
  },
  {
    id: 'trx_assisted_pistol_squat',
    name: { es: 'Sentadilla pistol asistida en TRX', en: 'TRX assisted pistol squat', fr: 'Squat pistol assisté TRX' },
    category: 'legs', isCompound: true, difficulty: 'advanced',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['trx'],
  },
  {
    id: 'trx_reverse_lunge',
    name: { es: 'Zancada inversa en TRX', en: 'TRX reverse lunge', fr: 'Fente arrière TRX' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['trx'],
  },
  {
    id: 'trx_hamstring_curl',
    name: { es: 'Curl femoral en TRX', en: 'TRX hamstring curl', fr: 'Curl ischio-jambiers TRX' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'core'],
    equipment: ['trx'],
  },
  {
    id: 'trx_chest_fly',
    name: { es: 'Aperturas en TRX', en: 'TRX chest fly', fr: 'Écarté TRX' },
    category: 'push', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
    equipment: ['trx'],
  },
  {
    id: 'trx_y_raise',
    name: { es: 'Elevación en Y en TRX', en: 'TRX Y-raise', fr: 'Élévation en Y TRX' },
    category: 'pull', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['shoulders', 'back'], secondaryMuscles: ['traps'],
    equipment: ['trx'],
  },
  {
    id: 'trx_biceps_curl',
    name: { es: 'Curl de bíceps en TRX', en: 'TRX biceps curl', fr: 'Curl biceps TRX' },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: ['trx'],
  },
  {
    id: 'trx_triceps_extension',
    name: { es: 'Extensión de tríceps en TRX', en: 'TRX triceps extension', fr: 'Extension triceps TRX' },
    category: 'push', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    equipment: ['trx'],
  },

  // ── FUERZA — Anillas ──────────────────────────────────────────────────────────
  {
    id: 'ring_row',
    name: { es: 'Remo en anillas', en: 'Ring row', fr: 'Rowing aux anneaux' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps', 'core'],
    equipment: ['rings'],
  },
  {
    id: 'ring_pushup',
    name: { es: 'Flexión en anillas', en: 'Ring push-up', fr: 'Pompe aux anneaux' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'],
    equipment: ['rings'],
  },
  {
    id: 'ring_support_hold',
    name: { es: 'Sostén en anillas', en: 'Ring support hold', fr: 'Maintien en appui aux anneaux' },
    category: 'push', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['shoulders', 'chest'], secondaryMuscles: ['triceps', 'core'],
    equipment: ['rings'],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'ring_lsit',
    name: { es: 'L-sit en anillas', en: 'Ring L-sit', fr: 'L-sit aux anneaux' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['rings'],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'ring_face_pull',
    name: { es: 'Face pull en anillas', en: 'Ring face pull', fr: 'Face pull aux anneaux' },
    category: 'pull', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['shoulders', 'traps'], secondaryMuscles: ['back'],
    equipment: ['rings'],
  },
  {
    id: 'ring_biceps_curl',
    name: { es: 'Curl de bíceps en anillas', en: 'Ring biceps curl', fr: 'Curl biceps aux anneaux' },
    category: 'pull', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: ['rings'],
  },
  {
    id: 'ring_triceps_extension',
    name: { es: 'Extensión de tríceps en anillas', en: 'Ring triceps extension', fr: 'Extension triceps aux anneaux' },
    category: 'push', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['triceps'], secondaryMuscles: [],
    equipment: ['rings'],
  },
  {
    id: 'ring_fallout',
    name: { es: 'Fallout en anillas', en: 'Ring fallout', fr: 'Fallout aux anneaux' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['rings'],
  },
  {
    id: 'ring_assisted_squat',
    name: { es: 'Sentadilla asistida en anillas', en: 'Ring assisted squat', fr: 'Squat assisté aux anneaux' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['rings'],
  },

  // ── FUERZA — Paralelas ────────────────────────────────────────────────────────
  {
    id: 'parallette_pushup',
    name: { es: 'Flexión en paralelas', en: 'Parallette push-up', fr: 'Pompe sur barres parallèles' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'],
    equipment: ['parallettes'],
  },
  {
    id: 'parallette_lsit',
    name: { es: 'L-sit en paralelas', en: 'Parallette L-sit', fr: 'L-sit sur barres parallèles' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['parallettes'],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'parallette_tuck_hold',
    name: { es: 'Tuck hold en paralelas', en: 'Parallette tuck hold', fr: 'Tuck hold sur barres parallèles' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['parallettes'],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'parallette_knee_raise',
    name: { es: 'Elevación de rodillas en paralelas', en: 'Parallette knee raise', fr: 'Relevé de genoux sur barres parallèles' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['abs', 'core'], secondaryMuscles: ['shoulders'],
    equipment: ['parallettes'],
  },
  {
    id: 'parallette_handstand_hold',
    name: { es: 'Pino en paralelas', en: 'Parallette handstand hold', fr: 'Poirier sur barres parallèles' },
    category: 'push', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'core'],
    equipment: ['parallettes'],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'parallette_mountain_climber',
    name: { es: 'Mountain climber en paralelas', en: 'Parallette mountain climber', fr: 'Mountain climber sur barres parallèles' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['quads', 'shoulders'],
    equipment: ['parallettes'],
  },

  // ── PUSH — Kettlebells ────────────────────────────────────────────────────────
  {
    id: 'kb_floor_press',
    name: { es: 'Press de suelo con kettlebell', en: 'Kettlebell floor press', fr: 'Développé au sol kettlebell' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['triceps', 'shoulders'],
    equipment: ['kettlebells'],
  },
  {
    id: 'single_arm_kb_press',
    name: { es: 'Press a una mano con kettlebell', en: 'Single-arm kettlebell press', fr: 'Développé kettlebell à un bras' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'core'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_push_press',
    name: { es: 'Push press con kettlebell', en: 'Kettlebell push press', fr: 'Push press kettlebell' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'quads', 'core'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_bottoms_up_press',
    name: { es: 'Press bottoms-up con kettlebell', en: 'Kettlebell bottoms-up press', fr: 'Développé bottoms-up kettlebell' },
    category: 'push', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['forearms', 'core'],
    equipment: ['kettlebells'],
  },
  {
    id: 'kb_half_kneeling_press',
    name: { es: 'Press de rodilla en el suelo con kettlebell', en: 'Kettlebell half-kneeling press', fr: 'Développé kettlebell à genou' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps', 'core'],
    equipment: ['kettlebells'],
  },

  // ── LEGS — Isquiotibiales sin equipo ──────────────────────────────────────────
  {
    id: 'single_leg_glute_bridge',
    name: { es: 'Puente de glúteos a una pierna', en: 'Single-leg glute bridge', fr: 'Pont fessier unilatéral' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: [],
  },
  {
    id: 'long_lever_glute_bridge',
    name: { es: 'Puente de glúteos con palanca larga', en: 'Long-lever glute bridge', fr: 'Pont fessier à levier long' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['glutes', 'hamstrings'], secondaryMuscles: ['core'],
    equipment: [],
  },
  {
    id: 'reverse_plank_bridge',
    name: { es: 'Plancha invertida', en: 'Reverse plank bridge', fr: 'Planche inversée' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['hamstrings', 'glutes'], secondaryMuscles: ['core', 'shoulders'],
    equipment: [],
  },
  {
    id: 'bodyweight_good_morning',
    name: { es: 'Good morning sin peso', en: 'Bodyweight good morning', fr: 'Good morning au poids du corps' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes', 'back'],
    equipment: [],
  },
  {
    id: 'heel_dig_isometric_hold',
    name: { es: 'Isométrico de talón clavado', en: 'Heel dig isometric hold', fr: 'Maintien isométrique talon ancré' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['hamstrings'], secondaryMuscles: ['glutes'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 20,
  },

  // ── LEGS — Pantorrilla ────────────────────────────────────────────────────────
  {
    id: 'single_leg_calf_raise',
    name: { es: 'Elevación de talones a una pierna', en: 'Single-leg calf raise', fr: 'Élévation sur pointe unilatérale' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'db_calf_raise',
    name: { es: 'Elevación de talones con mancuernas', en: 'Dumbbell calf raise', fr: 'Élévation sur pointes avec haltères' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_calf_raise',
    name: { es: 'Elevación de talones con barra', en: 'Barbell calf raise', fr: 'Élévation sur pointes avec barre' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['barbellPlates'],
  },
  {
    id: 'seated_db_calf_raise',
    name: { es: 'Elevación de talones sentado con mancuerna', en: 'Seated dumbbell calf raise', fr: 'Élévation sur pointes assis avec haltère' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },

  // ── LEGS — Prensa de piernas ──────────────────────────────────────────────────
  // NOTA: 'leg_press' (isCompound:true) ya existe en el catálogo original con estos
  // mismos campos — no se duplica. Solo se añade el accesorio de gemelos en prensa.
  {
    id: 'leg_press_calf_press',
    name: { es: 'Prensa de gemelos en prensa de piernas', en: 'Leg press calf press', fr: 'Presse mollets sur presse à cuisses' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['legPressMachine'],
  },

  // ── LEGS — Máquina de gemelos ─────────────────────────────────────────────────
  {
    id: 'standing_calf_raise_machine',
    name: { es: 'Elevación de talones de pie en máquina', en: 'Standing calf raise machine', fr: 'Mollets debout machine' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['calfMachine'],
  },
  {
    id: 'seated_calf_raise_machine',
    name: { es: 'Elevación de talones sentado en máquina', en: 'Seated calf raise machine', fr: 'Mollets assis machine' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['calfMachine'],
  },

  // ── CORE — Antebrazo/agarre ───────────────────────────────────────────────────
  {
    id: 'wrist_curl_db',
    name: { es: 'Curl de muñeca con mancuerna', en: 'Dumbbell wrist curl', fr: 'Curl de poignet avec haltère' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'reverse_wrist_curl_db',
    name: { es: 'Curl de muñeca inverso con mancuerna', en: 'Dumbbell reverse wrist curl', fr: 'Curl de poignet inversé avec haltère' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'plate_pinch_hold',
    name: { es: 'Pinza de discos', en: 'Plate pinch hold', fr: 'Maintien en pince de disques' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['forearms'], secondaryMuscles: [],
    equipment: ['barbellPlates'],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'zottman_curl',
    name: { es: 'Curl Zottman', en: 'Zottman curl', fr: 'Curl Zottman' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['biceps', 'forearms'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },

  // ── PULL — Trapecio ───────────────────────────────────────────────────────────
  {
    id: 'db_shrug',
    name: { es: 'Encogimiento con mancuernas', en: 'Dumbbell shrug', fr: "Haussement d'épaules haltères" },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['traps'], secondaryMuscles: [],
    equipment: ['dumbbells'],
  },
  {
    id: 'barbell_shrug',
    name: { es: 'Encogimiento con barra', en: 'Barbell shrug', fr: "Haussement d'épaules barre" },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['traps'], secondaryMuscles: [],
    equipment: ['barbellPlates'],
  },
  {
    id: 'kb_shrug',
    name: { es: 'Encogimiento con kettlebell', en: 'Kettlebell shrug', fr: "Haussement d'épaules kettlebell" },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['traps'], secondaryMuscles: [],
    equipment: ['kettlebells'],
  },
  {
    id: 'cable_shrug',
    name: { es: 'Encogimiento en polea', en: 'Cable shrug', fr: "Haussement d'épaules à la poulie" },
    category: 'pull', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['traps'], secondaryMuscles: [],
    equipment: ['cableMachine'],
  },

  // ── LEGS/CORE — Aductores (fuerza) ────────────────────────────────────────────
  {
    id: 'copenhagen_plank',
    name: { es: 'Plancha copenhague', en: 'Copenhagen plank', fr: 'Planche de Copenhague' },
    category: 'core', isCompound: false, difficulty: 'advanced',
    primaryMuscles: ['adductors'], secondaryMuscles: ['core', 'abs'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 20,
  },
  {
    id: 'side_lying_hip_adduction',
    name: { es: 'Aducción de cadera tumbado de lado', en: 'Side-lying hip adduction', fr: 'Adduction de hanche allongé sur le côté' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['adductors'], secondaryMuscles: [],
    equipment: [],
  },
  {
    id: 'standing_cable_hip_adduction',
    name: { es: 'Aducción de cadera de pie en polea', en: 'Standing cable hip adduction', fr: 'Adduction de hanche debout à la poulie' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['adductors'], secondaryMuscles: [],
    equipment: ['cableMachine'],
  },
  {
    id: 'seated_hip_adductor_machine',
    name: { es: 'Máquina de aductores sentado', en: 'Seated hip adductor machine', fr: 'Machine adducteurs assis' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['adductors'], secondaryMuscles: [],
    equipment: ['hipAdductorMachine'],
  },
  {
    id: 'cossack_squat',
    name: { es: 'Sentadilla cosaco', en: 'Cossack squat', fr: 'Squat cosaque' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['adductors'], secondaryMuscles: ['quads', 'glutes'],
    equipment: [],
  },
  {
    id: 'lateral_lunge',
    name: { es: 'Zancada lateral', en: 'Lateral lunge', fr: 'Fente latérale' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['adductors'], secondaryMuscles: ['quads', 'glutes'],
    equipment: [],
  },

  // ── MOVILIDAD — Aductores — Calentamiento ─────────────────────────────────────
  {
    id: 'adductor_rockback',
    name: { es: 'Rockback de aductores', en: 'Adductor rockback', fr: 'Rockback des adducteurs' },
    category: 'mobility', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['adductors'], secondaryMuscles: ['glutes', 'core'],
    equipment: [],
    isTimeBased: true, defaultDurationSeconds: 30, movementPhase: 'warmup', relevantDayTypes: ['legs', 'lower'],
  },

  // ── MOVILIDAD — Aductores — Enfriamiento ──────────────────────────────────────
  {
    id: 'frog_stretch',
    name: { es: 'Estiramiento de rana', en: 'Frog stretch', fr: 'Étirement grenouille' },
    category: 'mobility', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['adductors'], secondaryMuscles: ['hamstrings', 'glutes'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 45, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'butterfly_stretch',
    name: { es: 'Estiramiento mariposa', en: 'Butterfly stretch', fr: 'Étirement papillon' },
    category: 'mobility', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['adductors'], secondaryMuscles: ['glutes'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 45, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },
  {
    id: 'seated_straddle_stretch',
    name: { es: 'Estiramiento en horqueta sentado', en: 'Seated straddle stretch', fr: 'Étirement écart assis' },
    category: 'mobility', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['adductors'], secondaryMuscles: ['hamstrings'],
    equipment: ['mat'],
    isTimeBased: true, defaultDurationSeconds: 45, movementPhase: 'cooldown', relevantDayTypes: ['legs', 'lower'],
  },

  // ── CHALECO LASTRADO ──────────────────────────────────────────────────────────
  {
    id: 'weighted_vest_pushup',
    name: { es: 'Flexión con chaleco lastrado', en: 'Weighted vest push-up', fr: 'Pompe avec gilet lesté' },
    category: 'push', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders', 'core'],
    equipment: ['weightedVest'],
  },
  {
    id: 'weighted_vest_squat',
    name: { es: 'Sentadilla con chaleco lastrado', en: 'Weighted vest squat', fr: 'Squat avec gilet lesté' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings', 'core'],
    equipment: ['weightedVest'],
  },
  {
    id: 'weighted_vest_lunge',
    name: { es: 'Zancada con chaleco lastrado', en: 'Weighted vest lunge', fr: 'Fente avec gilet lesté' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['weightedVest'],
  },
  {
    id: 'weighted_vest_step_up',
    name: { es: 'Subida al cajón con chaleco lastrado', en: 'Weighted vest step-up', fr: 'Montée sur step avec gilet lesté' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['weightedVest'],
  },
  {
    id: 'weighted_vest_calf_raise',
    name: { es: 'Elevación de talones con chaleco lastrado', en: 'Weighted vest calf raise', fr: 'Élévation sur pointes avec gilet lesté' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['calves'], secondaryMuscles: [],
    equipment: ['weightedVest'],
  },
  {
    id: 'weighted_vest_pullup',
    name: { es: 'Dominada con chaleco lastrado', en: 'Weighted vest pull-up', fr: 'Traction avec gilet lesté' },
    category: 'pull', isCompound: true, difficulty: 'advanced',
    primaryMuscles: ['lats', 'back'], secondaryMuscles: ['biceps', 'core'],
    equipment: ['weightedVest', 'pullupBar'],
  },
  {
    id: 'weighted_vest_chinup',
    name: { es: 'Dominada supina con chaleco lastrado', en: 'Weighted vest chin-up', fr: 'Traction supination avec gilet lesté' },
    category: 'pull', isCompound: true, difficulty: 'advanced',
    primaryMuscles: ['biceps', 'lats'], secondaryMuscles: ['back', 'core'],
    equipment: ['weightedVest', 'pullupBar'],
  },
  {
    id: 'weighted_vest_plank',
    name: { es: 'Plancha con chaleco lastrado', en: 'Weighted vest plank', fr: 'Planche avec gilet lesté' },
    category: 'core', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['core', 'abs'], secondaryMuscles: ['shoulders'],
    equipment: ['weightedVest'],
    isTimeBased: true, defaultDurationSeconds: 30,
  },
  {
    id: 'weighted_vest_wall_sit',
    name: { es: 'Sentadilla en pared con chaleco lastrado', en: 'Weighted vest wall sit', fr: 'Chaise murale avec gilet lesté' },
    category: 'legs', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['quads'], secondaryMuscles: ['glutes'],
    equipment: ['weightedVest'],
    isTimeBased: true, defaultDurationSeconds: 30,
  },

  // ── MÁQUINAS DE GIMNASIO — Máquina Smith ──────────────────────────────────────
  {
    id: 'smith_squat',
    name: { es: 'Sentadilla en máquina Smith', en: 'Smith machine squat', fr: 'Squat guidé Smith' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['smithMachine'],
  },
  {
    id: 'smith_bench_press',
    name: { es: 'Press de banca en máquina Smith', en: 'Smith machine bench press', fr: 'Développé couché guidé Smith' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders', 'triceps'],
    equipment: ['smithMachine'],
  },
  {
    id: 'smith_shoulder_press',
    name: { es: 'Press militar en máquina Smith', en: 'Smith machine shoulder press', fr: 'Développé épaules guidé Smith' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['shoulders'], secondaryMuscles: ['triceps'],
    equipment: ['smithMachine'],
  },
  {
    id: 'smith_row',
    name: { es: 'Remo en máquina Smith', en: 'Smith machine row', fr: 'Rowing guidé Smith' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps'],
    equipment: ['smithMachine'],
  },
  {
    id: 'smith_lunge',
    name: { es: 'Zancada en máquina Smith', en: 'Smith machine lunge', fr: 'Fente guidée Smith' },
    category: 'legs', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['quads', 'glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['smithMachine'],
  },

  // ── MÁQUINAS DE GIMNASIO — Asistida ───────────────────────────────────────────
  {
    id: 'assisted_pullup',
    name: { es: 'Dominada asistida en máquina', en: 'Assisted pull-up machine', fr: 'Traction assistée machine' },
    category: 'pull', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['lats', 'back'], secondaryMuscles: ['biceps'],
    equipment: ['assistedMachine'],
  },
  {
    id: 'assisted_dip',
    name: { es: 'Fondos asistidos en máquina', en: 'Assisted dip machine', fr: 'Dips assistés machine' },
    category: 'push', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['shoulders'],
    equipment: ['assistedMachine'],
  },

  // ── MÁQUINAS DE GIMNASIO — Abdominales, abductor, pec deck, T-bar, hip thrust ─
  {
    id: 'ab_machine_crunch',
    name: { es: 'Crunch en máquina abdominal', en: 'Ab machine crunch', fr: 'Crunch machine abdominale' },
    category: 'core', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['abs'], secondaryMuscles: ['core'],
    equipment: ['abMachine'],
  },
  {
    id: 'seated_hip_abductor_machine',
    name: { es: 'Máquina de abductores sentado', en: 'Seated hip abductor machine', fr: 'Machine abducteurs assis' },
    category: 'legs', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: [],
    equipment: ['hipAbductorMachine'],
  },
  {
    id: 'pec_deck_fly',
    name: { es: 'Aperturas en pec deck', en: 'Pec deck fly', fr: 'Écarté pec deck' },
    category: 'push', isCompound: false, difficulty: 'beginner',
    primaryMuscles: ['chest'], secondaryMuscles: ['shoulders'],
    equipment: ['pecDeckMachine'],
  },
  {
    id: 't_bar_row',
    name: { es: 'Remo en T', en: 'T-bar row', fr: 'Rowing T-bar' },
    category: 'pull', isCompound: true, difficulty: 'intermediate',
    primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps'],
    equipment: ['tBarRowMachine'],
  },
  {
    id: 'hip_thrust_machine',
    name: { es: 'Empuje de cadera en máquina', en: 'Hip thrust machine', fr: 'Hip thrust machine' },
    category: 'legs', isCompound: true, difficulty: 'beginner',
    primaryMuscles: ['glutes'], secondaryMuscles: ['hamstrings'],
    equipment: ['hipThrustMachine'],
  },
  {
    id: 'preacher_curl_db',
    name: { es: 'Curl predicador con mancuerna', en: 'Dumbbell preacher curl', fr: 'Curl pupitre avec haltère' },
    category: 'pull', isCompound: false, difficulty: 'intermediate',
    primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
    equipment: ['adjustableBench', 'dumbbells'],
  },
];

export function getExerciseName(id: string, lang: string): string {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return id;
  const l = lang.startsWith('fr') ? 'fr' : lang.startsWith('es') ? 'es' : 'en';
  return ex.name[l];
}

/** Verdadero si el usuario puede hacer el ejercicio con su equipamiento en casa. */
export function canDoAtHome(exerciseId: string, homeEquipment: string[]): boolean {
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return true;
  if (ex.equipment.length === 0) return true; // peso corporal, siempre disponible
  return ex.equipment.every(eq => homeEquipment.includes(eq));
}

/**
 * Devuelve ejercicios alternativos al indicado, filtrados por equipamiento disponible
 * y ordenados por mayor solapamiento muscular. Reutilizada en ChangeExerciseModal y
 * en el filtro ligero de sesión (E-3).
 */
export function getAlternatives(
  currentId: string,
  equipment: string[],
  isGym: boolean,
): Exercise[] {
  const current = EXERCISES.find(e => e.id === currentId);
  if (!current) return [];

  return EXERCISES.filter(ex => {
    if (ex.id === currentId) return false;
    if (ex.category !== current.category) return false;
    const canDo = isGym
      ? true
      : ex.equipment.length === 0 || ex.equipment.every(eq => equipment.includes(eq));
    if (!canDo) return false;
    return ex.primaryMuscles.some(m => current.primaryMuscles.includes(m));
  }).sort((a, b) => {
    const aOverlap = a.primaryMuscles.filter(m => current.primaryMuscles.includes(m)).length;
    const bOverlap = b.primaryMuscles.filter(m => current.primaryMuscles.includes(m)).length;
    return bOverlap - aOverlap;
  });
}
