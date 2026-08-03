DROP TABLE IF EXISTS `exercise_targets_new`;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `exercise_targets_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
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
INSERT INTO `exercise_targets_new` (
	`exercise_id`, `target_sets`, `target_reps_min`, `target_reps_max`,
	`target_weight_kg`, `target_rir`, `progression_reason`,
	`sessions_below_range`, `session_count`, `updated_at`
)
SELECT
	`exercise_id`, `target_sets`, `target_reps_min`, `target_reps_max`,
	`target_weight_kg`, `target_rir`, `progression_reason`,
	`sessions_below_range`, `session_count`, `updated_at`
FROM `exercise_targets` t
WHERE t.`id` = (
	SELECT t2.`id` FROM `exercise_targets` t2
	WHERE t2.`exercise_id` = t.`exercise_id`
	ORDER BY t2.`updated_at` DESC, t2.`id` DESC
	LIMIT 1
);
--> statement-breakpoint
ALTER TABLE `exercise_targets` RENAME TO `exercise_targets_legacy`;
--> statement-breakpoint
ALTER TABLE `exercise_targets_new` RENAME TO `exercise_targets`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_exercise_targets_exercise` ON `exercise_targets` (`exercise_id`);
