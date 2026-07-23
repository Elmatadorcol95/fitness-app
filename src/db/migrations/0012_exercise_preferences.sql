CREATE TABLE IF NOT EXISTS `exercise_preferences` (
	`exercise_id` text PRIMARY KEY NOT NULL,
	`preference` text NOT NULL,
	`updated_at` integer NOT NULL
);
