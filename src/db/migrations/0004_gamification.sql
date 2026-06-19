CREATE TABLE IF NOT EXISTS `achievements` (
	`id` text PRIMARY KEY NOT NULL,
	`unlocked_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `gamification_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
