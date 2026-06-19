-- Migración: Módulo Progreso — peso, medidas corporales, fotos de progreso

CREATE TABLE `weight_log` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `weight_kg` real NOT NULL,
  `date` text NOT NULL,
  `notes` text DEFAULT '',
  `created_at` integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE `body_measurements` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` text NOT NULL,
  `neck` real,
  `shoulders` real,
  `chest` real,
  `waist` real,
  `hip` real,
  `arm` real,
  `forearm` real,
  `thigh` real,
  `calf` real,
  `body_fat_pct` real,
  `created_at` integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE `progress_photos` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `date` text NOT NULL,
  `pose` text NOT NULL,
  `local_uri` text NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint

CREATE TABLE `measurement_prefs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `active_fields` text NOT NULL DEFAULT '["waist","hip","chest","arm"]'
);
