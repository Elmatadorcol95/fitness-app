-- Migración: reemplaza la columna 'goal' por 'goal_primary' + 'goal_secondary'
-- SQLite no soporta RENAME COLUMN directamente, se recrea la tabla

PRAGMA foreign_keys=OFF;
--> statement-breakpoint

CREATE TABLE `profile_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`birth_year` integer,
	`gender` text,
	`height_cm` real,
	`weight_kg` real,
	`goal_primary` text NOT NULL,
	`goal_secondary` text,
	`days_per_week` integer NOT NULL,
	`minutes_per_session` integer NOT NULL,
	`location` text NOT NULL,
	`equipment` text DEFAULT '[]' NOT NULL,
	`injuries` text DEFAULT '' ,
	`units` text DEFAULT 'metric' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint

INSERT INTO `profile_new`
	SELECT `id`, `name`, `birth_year`, `gender`, `height_cm`, `weight_kg`,
	       `goal`, NULL, `days_per_week`, `minutes_per_session`,
	       `location`, `equipment`, `injuries`, `units`, `created_at`
	FROM `profile`;
--> statement-breakpoint

DROP TABLE `profile`;
--> statement-breakpoint

ALTER TABLE `profile_new` RENAME TO `profile`;
--> statement-breakpoint

PRAGMA foreign_keys=ON;
