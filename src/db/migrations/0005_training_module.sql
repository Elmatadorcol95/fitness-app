CREATE TABLE IF NOT EXISTS `workout_plans` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `goal_primary` TEXT NOT NULL,
  `goal_secondary` TEXT,
  `days_per_week` INTEGER NOT NULL,
  `minutes_per_session` INTEGER NOT NULL,
  `is_active` INTEGER NOT NULL DEFAULT 1,
  `generated_at` INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `plan_days` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `plan_id` INTEGER NOT NULL,
  `day_index` INTEGER NOT NULL,
  `day_type` TEXT NOT NULL,
  `exercises` TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workout_sessions` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `plan_day_id` INTEGER,
  `date` TEXT NOT NULL,
  `duration_seconds` INTEGER,
  `completed` INTEGER NOT NULL DEFAULT 0,
  `notes` TEXT,
  `created_at` INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `session_sets` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `session_id` INTEGER NOT NULL,
  `exercise_id` TEXT NOT NULL,
  `set_number` INTEGER NOT NULL,
  `target_reps` INTEGER,
  `actual_reps` INTEGER,
  `weight_kg` REAL,
  `completed` INTEGER NOT NULL DEFAULT 0,
  `created_at` INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exercise_maxes` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `exercise_id` TEXT NOT NULL,
  `weight_kg` REAL NOT NULL,
  `reps` INTEGER NOT NULL,
  `e1rm` REAL NOT NULL,
  `achieved_at` TEXT NOT NULL
);
