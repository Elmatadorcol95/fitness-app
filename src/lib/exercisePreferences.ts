import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { exercisePreferences } from '@/db/schema';

export type Preference = 'liked' | 'disliked';

// Alterna la preferencia: si ya tenía ese mismo valor, la borra (vuelve a
// neutral) — mismo botón sirve para marcar y para desmarcar, sin estado
// "neutral" explícito en la tabla (ausencia de fila = neutral, gratis).
export async function togglePreference(exerciseId: string, preference: Preference): Promise<void> {
  const existing = await db
    .select()
    .from(exercisePreferences)
    .where(eq(exercisePreferences.exerciseId, exerciseId))
    .limit(1);

  if (existing[0]?.preference === preference) {
    await db.delete(exercisePreferences).where(eq(exercisePreferences.exerciseId, exerciseId));
  } else {
    await db
      .insert(exercisePreferences)
      .values({ exerciseId, preference, updatedAt: Date.now() })
      .onConflictDoUpdate({ target: exercisePreferences.exerciseId, set: { preference, updatedAt: Date.now() } });
  }
}

// Carga única de IDs con dislike — para pasar como Set a las funciones de
// generación (mismo patrón que musclePriorities/usedThisWeek: se carga una
// vez, se pasa por parámetro, nunca una consulta por ejercicio).
export async function getDislikedIds(): Promise<Set<string>> {
  const rows = await db
    .select({ exerciseId: exercisePreferences.exerciseId })
    .from(exercisePreferences)
    .where(eq(exercisePreferences.preference, 'disliked'));
  return new Set(rows.map(r => r.exerciseId));
}

// Carga única de IDs con like — mismo criterio.
export async function getLikedIds(): Promise<Set<string>> {
  const rows = await db
    .select({ exerciseId: exercisePreferences.exerciseId })
    .from(exercisePreferences)
    .where(eq(exercisePreferences.preference, 'liked'));
  return new Set(rows.map(r => r.exerciseId));
}

// Para la UI (modal/tarjeta/pantalla de preferencias): estado completo por
// ejercicio, para pintar qué botón está activo hoy.
export async function getAllPreferences(): Promise<Map<string, Preference>> {
  const rows = await db.select().from(exercisePreferences);
  return new Map(rows.map(r => [r.exerciseId, r.preference as Preference]));
}
