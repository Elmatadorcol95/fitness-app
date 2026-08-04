ALTER TABLE `profile` ADD COLUMN `auth_user_id` text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_profile_auth_user_id` ON `profile` (`auth_user_id`);
