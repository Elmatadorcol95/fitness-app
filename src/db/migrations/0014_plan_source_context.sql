ALTER TABLE workout_plans ADD COLUMN source text NOT NULL DEFAULT 'auto';
--> statement-breakpoint
ALTER TABLE workout_plans ADD COLUMN context text;
