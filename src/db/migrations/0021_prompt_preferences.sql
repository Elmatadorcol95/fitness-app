ALTER TABLE `profile` ADD COLUMN `training_location_mode` text DEFAULT 'ask' NOT NULL;
--> statement-breakpoint
ALTER TABLE `profile` ADD COLUMN `warmup_prompt_mode` text DEFAULT 'ask' NOT NULL;
--> statement-breakpoint
ALTER TABLE `profile` ADD COLUMN `cooldown_prompt_mode` text DEFAULT 'ask' NOT NULL;
