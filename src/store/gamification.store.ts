import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { achievements as achievementsTable, gamificationMeta } from '@/db/schema';
import { hapticsSuccess } from '@/lib/haptics';

export type AchievementId =
  | 'first_spark'
  | 'apprentice'
  | 'journeyman'
  | 'master'
  | 'incandescent'
  | 'tempered_steel'
  | 'personal_record';

export interface AchievementDef {
  id: AchievementId;
  iconName: string;
  nameKey: string;
  descKey: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_spark',     iconName: 'flash-outline',     nameKey: 'gamification.achievements.first_spark.name',     descKey: 'gamification.achievements.first_spark.desc'     },
  { id: 'apprentice',      iconName: 'hammer-outline',    nameKey: 'gamification.achievements.apprentice.name',      descKey: 'gamification.achievements.apprentice.desc'      },
  { id: 'journeyman',      iconName: 'construct-outline', nameKey: 'gamification.achievements.journeyman.name',      descKey: 'gamification.achievements.journeyman.desc'      },
  { id: 'master',          iconName: 'trophy-outline',    nameKey: 'gamification.achievements.master.name',          descKey: 'gamification.achievements.master.desc'          },
  { id: 'incandescent',    iconName: 'flame-outline',     nameKey: 'gamification.achievements.incandescent.name',    descKey: 'gamification.achievements.incandescent.desc'    },
  { id: 'tempered_steel',  iconName: 'shield-outline',    nameKey: 'gamification.achievements.tempered_steel.name',  descKey: 'gamification.achievements.tempered_steel.desc'  },
  { id: 'personal_record', iconName: 'ribbon-outline',    nameKey: 'gamification.achievements.personal_record.name', descKey: 'gamification.achievements.personal_record.desc' },
];

interface GamificationState {
  streak: number;
  longestStreak: number;
  totalWorkouts: number;
  lastWorkoutDate: string | null;
  unlockedAchievements: AchievementId[];
  isLoaded: boolean;
  // Cola de logros por celebrar (mostrar uno a uno en el overlay)
  celebrationQueue: AchievementId[];
  loadGamification: () => Promise<void>;
  recordWorkout: (date: string) => Promise<void>;
  unlockAchievement: (id: AchievementId) => Promise<void>;
  popCelebration: () => void;
  resetAll: () => Promise<void>;
}

async function getMeta(key: string): Promise<string | null> {
  const rows = await db.select().from(gamificationMeta).where(eq(gamificationMeta.key, key));
  return rows[0]?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  await db
    .insert(gamificationMeta)
    .values({ key, value })
    .onConflictDoUpdate({ target: gamificationMeta.key, set: { value } });
}

async function autoUnlock(
  id: AchievementId,
  unlockedSet: Set<AchievementId>,
  addFn: (id: AchievementId) => Promise<void>,
) {
  if (unlockedSet.has(id)) return;
  await addFn(id);
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  streak: 0,
  longestStreak: 0,
  totalWorkouts: 0,
  lastWorkoutDate: null,
  unlockedAchievements: [],
  celebrationQueue: [],
  isLoaded: false,

  loadGamification: async () => {
    if (get().isLoaded) return;
    const [streak, longest, total, lastDate] = await Promise.all([
      getMeta('streak'),
      getMeta('longest_streak'),
      getMeta('total_workouts'),
      getMeta('last_workout_date'),
    ]);
    const rows = await db.select().from(achievementsTable);
    set({
      streak: Number(streak ?? 0),
      longestStreak: Number(longest ?? 0),
      totalWorkouts: Number(total ?? 0),
      lastWorkoutDate: lastDate,
      unlockedAchievements: rows.map(r => r.id as AchievementId),
      isLoaded: true,
    });
  },

  recordWorkout: async (date: string) => {
    const { streak, longestStreak, totalWorkouts, lastWorkoutDate, unlockAchievement } = get();
    const newTotal = totalWorkouts + 1;

    let newStreak: number;
    if (!lastWorkoutDate) {
      newStreak = 1;
    } else {
      const diffDays = Math.round(
        (new Date(date).getTime() - new Date(lastWorkoutDate).getTime()) / 86_400_000,
      );
      if (diffDays === 0) newStreak = streak;
      else if (diffDays === 1) newStreak = streak + 1;
      else newStreak = 1;
    }
    const newLongest = Math.max(longestStreak, newStreak);

    await Promise.all([
      setMeta('streak', String(newStreak)),
      setMeta('longest_streak', String(newLongest)),
      setMeta('total_workouts', String(newTotal)),
      setMeta('last_workout_date', date),
    ]);
    set({ streak: newStreak, longestStreak: newLongest, totalWorkouts: newTotal, lastWorkoutDate: date });

    const unlocked = new Set(get().unlockedAchievements);
    if (newTotal >= 1)  await autoUnlock('first_spark',    unlocked, unlockAchievement);
    if (newTotal >= 10) await autoUnlock('apprentice',     unlocked, unlockAchievement);
    if (newTotal >= 25) await autoUnlock('journeyman',     unlocked, unlockAchievement);
    if (newTotal >= 50) await autoUnlock('master',         unlocked, unlockAchievement);
    if (newStreak >= 7)  await autoUnlock('incandescent',  unlocked, unlockAchievement);
    if (newStreak >= 30) await autoUnlock('tempered_steel', unlocked, unlockAchievement);
  },

  unlockAchievement: async (id: AchievementId) => {
    const { unlockedAchievements, celebrationQueue } = get();
    if (unlockedAchievements.includes(id)) return;
    const unlockedAt = new Date().toISOString();
    await db
      .insert(achievementsTable)
      .values({ id, unlockedAt })
      .onConflictDoUpdate({ target: achievementsTable.id, set: { unlockedAt } });
    set({
      unlockedAchievements: [...unlockedAchievements, id],
      // Añadir a la cola de celebración
      celebrationQueue: [...celebrationQueue, id],
    });
    await hapticsSuccess();
  },

  // Quita el primer logro de la cola (llamado cuando el overlay lo muestra)
  popCelebration: () => {
    const { celebrationQueue } = get();
    set({ celebrationQueue: celebrationQueue.slice(1) });
  },

  resetAll: async () => {
    await db.delete(achievementsTable);
    await db.delete(gamificationMeta);
    set({ streak: 0, longestStreak: 0, totalWorkouts: 0, lastWorkoutDate: null, unlockedAchievements: [], celebrationQueue: [], isLoaded: false });
  },
}));
