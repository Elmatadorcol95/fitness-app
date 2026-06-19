import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
  injuries: text('injuries').default(''),
  units: text('units').notNull().default('metric'),
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
});

export const planDays = sqliteTable('plan_days', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  planId: integer('plan_id').notNull(),
  dayIndex: integer('day_index').notNull(),
  dayType: text('day_type').notNull(),
  exercises: text('exercises').notNull(),
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
  planId: integer('plan_id').notNull(),
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
