CREATE TABLE `profile` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`birth_year` integer,
	`gender` text,
	`height_cm` real,
	`weight_kg` real,
	`goal` text NOT NULL,
	`days_per_week` integer NOT NULL,
	`minutes_per_session` integer NOT NULL,
	`location` text NOT NULL,
	`equipment` text DEFAULT '[]' NOT NULL,
	`injuries` text DEFAULT '',
	`units` text DEFAULT 'metric' NOT NULL,
	`created_at` integer NOT NULL
);
