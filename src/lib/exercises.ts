export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'
  | 'lats' | 'traps' | 'forearms' | 'abs';

export type EquipmentKey =
  | 'dumbbells' | 'barbellPlates' | 'kettlebells'
  | 'resistanceBands' | 'miniGluteBands' | 'pullupBar' | 'parallettes'
  | 'rings' | 'trx' | 'adjustableBench' | 'plioBox' | 'medicineBall'
  | 'fitball' | 'abRoller' | 'jumpRope' | 'mat' | 'foamRoller'
  | 'sliders' | 'weightedVest'
  | 'cableMachine' | 'legPressMachine';

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'full_body';

export interface Exercise {
  id: string;
  name: { es: string; en: string; fr: string };
  category: ExerciseCategory;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentKey[];  // vacío = solo peso corporal, sin equipamiento extra
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  isCompound: boolean;
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
    equipment: ['cableMachine'],
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
    equipment: ['cableMachine'],
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
    equipment: ['cableMachine'],
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
