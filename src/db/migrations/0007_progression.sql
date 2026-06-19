CREATE TABLE IF NOT EXISTS `exercise_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`exercise_id` text NOT NULL,
	`target_sets` integer NOT NULL,
	`target_reps_min` integer NOT NULL,
	`target_reps_max` integer NOT NULL,
	`target_weight_kg` real,
	`target_rir` integer DEFAULT 2 NOT NULL,
	`progression_reason` text,
	`sessions_below_range` integer DEFAULT 0 NOT NULL,
	`session_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_exercise_targets_plan_exercise` ON `exercise_targets` (`plan_id`,`exercise_id`);
