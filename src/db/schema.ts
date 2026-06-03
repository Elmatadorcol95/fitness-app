import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  birthYear: integer('birth_year'),
  gender: text('gender'),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  goal: text('goal').notNull(),
  daysPerWeek: integer('days_per_week').notNull(),
  minutesPerSession: integer('minutes_per_session').notNull(),
  location: text('location').notNull(),
  equipment: text('equipment').notNull().default('[]'),
  injuries: text('injuries').default(''),
  units: text('units').notNull().default('metric'),
  createdAt: integer('created_at').notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
