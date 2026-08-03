import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  birthYear: integer('birth_year'),
  birthDate: text('birth_date'),
  gender: text('gender'),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  goalPrimary: text('goal_primary').notNull(),
  goalSecondary: text('goal_secondary'),
  daysPerWeek: integer('days_per_week').notNull(),
  minutesPerSession: integer('minutes_per_session').notNull(),
  location: text('location').notNull(),
  equipment: text('equipment').notNull().default('[]'),
  musclePriorities: text('muscle_priorities').notNull().default('[]'),
  injuries: text('injuries').default(''),
  units: text('units').notNull().default('metric'),
  planMode: text('plan_mode').notNull().default('auto'), // 'auto' | 'manual'
  createdAt: integer('created_at').notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;

// ── Módulo Progreso ──────────────────────────────────────────────────────────

export const weightLog = sqliteTable('weight_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  weightKg: real('weight_kg').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  notes: text('notes').default(''),
  createdAt: integer('created_at').notNull(),
});

export const bodyMeasurements = sqliteTable('body_measurements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  neck: real('neck'),
  shoulders: real('shoulders'),
  chest: real('chest'),
  waist: real('waist'),
  hip: real('hip'),
  arm: real('arm'),
  forearm: real('forearm'),
  thigh: real('thigh'),
  calf: real('calf'),
  bodyFatPct: real('body_fat_pct'),
  createdAt: integer('created_at').notNull(),
});

export const progressPhotos = sqliteTable('progress_photos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(), // YYYY-MM-DD
  pose: text('pose').notNull(), // 'front' | 'side' | 'back'
  localUri: text('local_uri').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const measurementPrefs = sqliteTable('measurement_prefs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  activeFields: text('active_fields').notNull().default('["waist","hip","chest","arm"]'),
});

export type WeightEntry = typeof weightLog.$inferSelect;
export type MeasurementEntry = typeof bodyMeasurements.$inferSelect;
export type ProgressPhoto = typeof progressPhotos.$inferSelect;

// ── Gamificación ─────────────────────────────────────────────────────────────

export const achievements = sqliteTable('achievements', {
  id: text('id').primaryKey(),
  unlockedAt: text('unlocked_at').notNull(),
});

export const gamificationMeta = sqliteTable('gamification_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ── Módulo Entrenamiento ──────────────────────────────────────────────────────

export const workoutPlans = sqliteTable('workout_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  goalPrimary: text('goal_primary').notNull(),
  goalSecondary: text('goal_secondary'),
  daysPerWeek: integer('days_per_week').notNull(),
  minutesPerSession: integer('minutes_per_session').notNull(),
  isActive: integer('is_active').notNull().default(1),
  generatedAt: integer('generated_at').notNull(),
  source: text('source').notNull().default('auto'), // 'auto' | 'manual'
  context: text('context'), // 'gym' | 'home' | null — solo relevante si source='manual'
});

export const planDays = sqliteTable('plan_days', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull(),
  dayIndex: integer('day_index').notNull(),
  dayType: text('day_type').notNull(),
  exercises: text('exercises').notNull(),
  cardio: text('cardio').notNull().default('[]'),
});

export const workoutSessions = sqliteTable('workout_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planDayId: integer('plan_day_id'),
  date: text('date').notNull(),
  durationSeconds: integer('duration_seconds'),
  completed: integer('completed').notNull().default(0),
  notes: text('notes'),
  createdAt: integer('created_at').notNull(),
});

export const sessionSets = sqliteTable('session_sets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: integer('session_id').notNull(),
  exerciseId: text('exercise_id').notNull(),
  setNumber: integer('set_number').notNull(),
  targetReps: integer('target_reps'),
  actualReps: integer('actual_reps'),
  weightKg: real('weight_kg'),
  weightTargetKg: real('weight_target_kg'),
  perceivedEffort: integer('perceived_effort'), // RPE 1-10
  completed: integer('completed').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const exerciseMaxes = sqliteTable('exercise_maxes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseId: text('exercise_id').notNull(),
  weightKg: real('weight_kg').notNull(),
  reps: integer('reps').notNull(),
  e1rm: real('e1rm').notNull(),
  achievedAt: text('achieved_at').notNull(),
});

// ── Progresión de cargas ──────────────────────────────────────────────────────

export const exerciseTargets = sqliteTable('exercise_targets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exerciseId: text('exercise_id').notNull(),
  targetSets: integer('target_sets').notNull(),
  targetRepsMin: integer('target_reps_min').notNull(),
  targetRepsMax: integer('target_reps_max').notNull(),
  targetWeightKg: real('target_weight_kg'),
  targetRir: integer('target_rir').notNull().default(2),
  progressionReason: text('progression_reason'),
  sessionsBelowRange: integer('sessions_below_range').notNull().default(0),
  sessionCount: integer('session_count').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

export type ExerciseTarget = typeof exerciseTargets.$inferSelect;

// ── Preferencias de descanso por ejercicio ────────────────────────────────────

export const exerciseRestPrefs = sqliteTable('exercise_rest_prefs', {
  exerciseId: text('exercise_id').primaryKey().notNull(),
  restSeconds: integer('rest_seconds').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const exercisePreferences = sqliteTable('exercise_preferences', {
  exerciseId: text('exercise_id').primaryKey().notNull(),
  preference: text('preference').notNull(), // 'liked' | 'disliked'
  updatedAt: integer('updated_at').notNull(),
});

export type ExercisePreference = typeof exercisePreferences.$inferSelect;

// ── Objetivos musculares — rotación de ejercicios ya usados por músculo ──────

export const muscleExerciseUsage = sqliteTable('muscle_exercise_usage', {
  muscle: text('muscle').notNull(),
  exerciseId: text('exercise_id').notNull(),
  usedAt: integer('used_at').notNull(),
}, (table) => [
  primaryKey({ columns: [table.muscle, table.exerciseId] }),
]);

export type MuscleExerciseUsage = typeof muscleExerciseUsage.$inferSelect;

// ── Plan propio (constructor manual) — Fase B ─────────────────────────────────
// Un plan propio coexiste con el automático vía profile.planMode ('auto'|'manual').
// Cada fila de routine_templates es UN DÍA de la plantilla (mismo patrón que
// plan_days para el plan automático); context distingue gym/casa — un usuario
// location:'both' tiene DOS plantillas independientes (dos tandas de filas,
// nunca compartidas), una por context.

export const routineTemplates = sqliteTable('routine_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  context: text('context').notNull(), // 'gym' | 'home'
  dayIndex: integer('day_index').notNull(),
  dayType: text('day_type').notNull(), // DayType — solo push/pull/legs/full_body en el constructor
  cardio: text('cardio'), // JSON de CardioPlan, nullable — null = usa el cardio automático
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type RoutineTemplate = typeof routineTemplates.$inferSelect;

export const routineTemplateSlots = sqliteTable('routine_template_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  templateId: integer('template_id').notNull(),
  slotIndex: integer('slot_index').notNull(),
  muscleGroup: text('muscle_group').notNull(), // MuscleGroup
  exerciseId: text('exercise_id'), // null = slot aún sin elegir
  sets: integer('sets'),
  repRangeMin: integer('rep_range_min'),
  repRangeMax: integer('rep_range_max'),
  restSeconds: integer('rest_seconds'),
  notes: text('notes'),
});

export type RoutineTemplateSlot = typeof routineTemplateSlots.$inferSelect;
