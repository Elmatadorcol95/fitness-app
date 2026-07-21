import { create } from 'zustand';
import { desc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { gamificationMeta, planDays, workoutPlans } from '@/db/schema';
import { generatePlan, type PlannedExercise, type DayType } from '@/lib/plan-generator';
import type { PlannedCardioBlock } from '@/lib/cardioSelection';
import { useGamificationStore } from './gamification.store';
import type { Profile } from '@/db/schema';

const ACTIVE_DAY_KEY = 'workout_active_day_index';

// StoredPlanDay extiende PlanDayData con el id de la fila en plan_days.
// Necesario para poder actualizar ejercicios concretos en SQLite.
export interface StoredPlanDay {
  dbId: number;
  dayIndex: number;
  dayType: DayType;
  exercises: PlannedExercise[];
  cardio: PlannedCardioBlock[];
}

export interface StoredPlan {
  id: number;
  goalPrimary: string;
  goalSecondary: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  days: StoredPlanDay[];
  activeDayIndex: number;
}

interface WorkoutState {
  currentPlan: StoredPlan | null;
  isGenerating: boolean;
  isLoaded: boolean;
  loadCurrentPlan: () => Promise<void>;
  generateAndSavePlan: (profile: Profile) => Promise<void>;
  replaceExercise: (dayDbId: number, exerciseIndex: number, newExerciseId: string) => Promise<void>;
  advanceDayIndex: () => Promise<void>;
  resetAll: () => Promise<void>;
}

async function getActiveDayIndex(): Promise<number> {
  const rows = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, ACTIVE_DAY_KEY));
  return Number(rows[0]?.value ?? 0);
}

async function saveActiveDayIndex(value: number): Promise<void> {
  await db
    .insert(gamificationMeta)
    .values({ key: ACTIVE_DAY_KEY, value: String(value) })
    .onConflictDoUpdate({ target: gamificationMeta.key, set: { value: String(value) } });
}

function mapDayRows(dayRows: (typeof planDays.$inferSelect)[]): StoredPlanDay[] {
  return dayRows
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .map(d => ({
      dbId: d.id,
      dayIndex: d.dayIndex,
      dayType: d.dayType as DayType,
      exercises: JSON.parse(d.exercises) as PlannedExercise[],
      cardio: JSON.parse(d.cardio) as PlannedCardioBlock[],
    }));
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  currentPlan: null,
  isGenerating: false,
  isLoaded: false,

  loadCurrentPlan: async () => {
    if (get().isLoaded) return;
    try {
      const plans = await db
        .select()
        .from(workoutPlans)
        .where(eq(workoutPlans.isActive, 1))
        .orderBy(desc(workoutPlans.id))
        .limit(1);

      if (!plans[0]) {
        set({ isLoaded: true });
        return;
      }

      const plan = plans[0];
      const dayRows = await db
        .select()
        .from(planDays)
        .where(eq(planDays.planId, plan.id));

      const activeDayIndex = await getActiveDayIndex();

      set({
        currentPlan: {
          id: plan.id,
          goalPrimary: plan.goalPrimary,
          goalSecondary: plan.goalSecondary,
          daysPerWeek: plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          activeDayIndex,
          days: mapDayRows(dayRows),
        },
        isLoaded: true,
      });
    } catch (e: unknown) {
      // Migración aún no aplicada — _layout.tsx lo reintentará tras migrationsReady
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('no such table')) return;
      throw e;
    }
  },

  generateAndSavePlan: async (profile: Profile) => {
    set({ isGenerating: true });
    try {
      // Genera el plan en memoria ANTES de tocar la DB. Si falla aquí, no
      // hay nada que limpiar: los planes existentes siguen intactos.
      const plan = await generatePlan(profile);

      let savedPlan: typeof workoutPlans.$inferSelect | null = null;
      let savedDayRows: (typeof planDays.$inferSelect)[] = [];

      try {
        await db.insert(workoutPlans).values({
          goalPrimary:       plan.goalPrimary,
          goalSecondary:     plan.goalSecondary,
          daysPerWeek:       plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          isActive:          1,
          generatedAt:       plan.generatedAt,
        });

        [savedPlan] = await db
          .select()
          .from(workoutPlans)
          .where(eq(workoutPlans.isActive, 1))
          .orderBy(desc(workoutPlans.id))
          .limit(1);

        for (const day of plan.days) {
          await db.insert(planDays).values({
            planId:    savedPlan.id,
            dayIndex:  day.dayIndex,
            dayType:   day.dayType,
            exercises: JSON.stringify(day.exercises),
            cardio:    JSON.stringify(day.cardio),
          });
        }

        // Releer las filas insertadas para obtener sus IDs de BD
        savedDayRows = await db
          .select()
          .from(planDays)
          .where(eq(planDays.planId, savedPlan.id));
      } catch (err) {
        // Limpieza: el plan viejo NUNCA se tocó, así que basta con borrar
        // los restos huérfanos del plan nuevo que falló a medias.
        if (savedPlan) {
          await db.delete(planDays).where(eq(planDays.planId, savedPlan.id));
          await db.delete(workoutPlans).where(eq(workoutPlans.id, savedPlan.id));
        } else {
          // El insert pudo haber tenido éxito aunque el select posterior fallara.
          // Usamos generatedAt (disponible desde antes del insert) como respaldo
          // para no dejar un plan huérfano sin referencia.
          const orphans = await db.select().from(workoutPlans).where(eq(workoutPlans.generatedAt, plan.generatedAt));
          for (const orphan of orphans) {
            await db.delete(planDays).where(eq(planDays.planId, orphan.id));
            await db.delete(workoutPlans).where(eq(workoutPlans.id, orphan.id));
          }
        }
        throw err;
      }

      if (!savedPlan) throw new Error('generateAndSavePlan: savedPlan no se asignó tras la inserción');

      // El plan nuevo + todos sus días quedaron insertados y verificados:
      // ahora sí es seguro desactivar los planes anteriores.
      await db.update(workoutPlans).set({ isActive: 0 }).where(ne(workoutPlans.id, savedPlan.id));

      await saveActiveDayIndex(0);
      await useGamificationStore.getState().resetDaysTrainedThisWeek();

      set({
        currentPlan: {
          id:                savedPlan.id,
          goalPrimary:       plan.goalPrimary,
          goalSecondary:     plan.goalSecondary,
          daysPerWeek:       plan.daysPerWeek,
          minutesPerSession: plan.minutesPerSession,
          activeDayIndex:    0,
          days: mapDayRows(savedDayRows),
        },
      });
    } finally {
      set({ isGenerating: false });
    }
  },

  replaceExercise: async (dayDbId: number, exerciseIndex: number, newExerciseId: string) => {
    const { currentPlan } = get();
    if (!currentPlan) return;

    const targetDay = currentPlan.days.find(d => d.dbId === dayDbId);
    if (!targetDay) return;

    const updatedExercises = targetDay.exercises.map((ex, i) =>
      i === exerciseIndex ? { ...ex, exerciseId: newExerciseId } : ex,
    );

    await db
      .update(planDays)
      .set({ exercises: JSON.stringify(updatedExercises) })
      .where(eq(planDays.id, dayDbId));

    set({
      currentPlan: {
        ...currentPlan,
        days: currentPlan.days.map(d =>
          d.dbId === dayDbId ? { ...d, exercises: updatedExercises } : d,
        ),
      },
    });
  },

  advanceDayIndex: async () => {
    const { currentPlan } = get();
    if (!currentPlan) return;
    const next = currentPlan.activeDayIndex + 1;
    await saveActiveDayIndex(next);
    set({ currentPlan: { ...currentPlan, activeDayIndex: next } });
  },

  resetAll: async () => {
    await db.delete(planDays);
    await db.delete(workoutPlans);
    set({ currentPlan: null, isLoaded: false });
  },
}));
