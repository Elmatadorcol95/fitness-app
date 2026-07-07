CREATE TABLE IF NOT EXISTS `muscle_exercise_usage` (
	`muscle` text NOT NULL,
	`exercise_id` text NOT NULL,
	`used_at` integer NOT NULL,
	PRIMARY KEY(`muscle`, `exercise_id`)
);
