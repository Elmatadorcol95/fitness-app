ALTER TABLE profile ADD COLUMN plan_mode text NOT NULL DEFAULT 'auto';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `routine_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`context` text NOT NULL,
	`day_index` integer NOT NULL,
	`day_type` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `routine_template_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_id` integer NOT NULL,
	`slot_index` integer NOT NULL,
	`muscle_group` text NOT NULL,
	`exercise_id` text,
	`sets` integer,
	`rep_range_min` integer,
	`rep_range_max` integer,
	`rest_seconds` integer,
	`notes` text
);
