import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profile as profileTable } from '@/db/schema';
import type { Profile } from '@/db/schema';
import type { MuscleGroup } from '@/lib/exercises';

export type Goal = 'strength' | 'hypertrophy' | 'fat_loss';
export type Location = 'home' | 'gym' | 'both';
export type Units = 'metric' | 'imperial';
export type RestSoundMode = 'vulcan' | 'native' | 'off';
export type TrainingLocationMode = 'ask' | 'gym' | 'home';
export type PromptMode = 'ask' | 'always' | 'never';

export interface OnboardingDraft {
  name: string;
  units: Units;
  birthDate?: string; // YYYY-MM-DD
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  // goals[0] = principal, goals[1] = secundario (opcional)
  goals: Goal[];
  daysPerWeek: number;
  minutesPerSession: number;
  location: Location;
  equipment: string[];
  musclePriorities: string[];
  injuries: string;
}

const defaultDraft: OnboardingDraft = {
  name: '',
  units: 'metric',
  heightCm: 170,
  weightKg: 70,
  goals: [],
  daysPerWeek: 3,
  minutesPerSession: 45,
  location: 'gym',
  equipment: [],
  musclePriorities: [],
  injuries: '',
};

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  isDbReady: boolean;
  draft: OnboardingDraft;
  equipmentVisible: boolean;
  musclePrioritiesVisible: boolean;
  exercisePreferencesVisible: boolean;
  routineBuilderVisible: boolean;
  settingsVisible: boolean;
  setProfile: (p: Profile | null) => void;
  setLoading: (v: boolean) => void;
  setDbReady: (v: boolean) => void;
  updateDraft: (updates: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
  updateEquipmentAndLocation: (location: Location, equipment: string[]) => Promise<void>;
  updateMusclePriorities: (priorities: MuscleGroup[]) => Promise<void>;
  updateRestSoundMode: (mode: RestSoundMode) => Promise<void>;
  updateTrainingLocationMode: (mode: TrainingLocationMode) => Promise<void>;
  updateWarmupPromptMode: (mode: PromptMode) => Promise<void>;
  updateCooldownPromptMode: (mode: PromptMode) => Promise<void>;
  updateDaysPerWeek: (value: number) => Promise<void>;
  updateMinutesPerSession: (value: number) => Promise<void>;
  updateUnits: (value: Units) => Promise<void>;
  openEquipment: () => void;
  closeEquipment: () => void;
  openMusclePriorities: () => void;
  closeMusclePriorities: () => void;
  openExercisePreferences: () => void;
  closeExercisePreferences: () => void;
  openRoutineBuilder: () => void;
  closeRoutineBuilder: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: true,
  isDbReady: false,
  draft: { ...defaultDraft },
  equipmentVisible: false,
  musclePrioritiesVisible: false,
  exercisePreferencesVisible: false,
  routineBuilderVisible: false,
  settingsVisible: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setDbReady: (isDbReady) => set({ isDbReady }),
  updateDraft: (updates) => set((s) => ({ draft: { ...s.draft, ...updates } })),
  resetDraft: () => set({ draft: { ...defaultDraft } }),
  openEquipment:  () => set({ equipmentVisible: true }),
  closeEquipment: () => set({ equipmentVisible: false }),
  openMusclePriorities:  () => set({ musclePrioritiesVisible: true }),
  closeMusclePriorities: () => set({ musclePrioritiesVisible: false }),
  openExercisePreferences:  () => set({ exercisePreferencesVisible: true }),
  closeExercisePreferences: () => set({ exercisePreferencesVisible: false }),
  openRoutineBuilder:  () => set({ routineBuilderVisible: true }),
  closeRoutineBuilder: () => set({ routineBuilderVisible: false }),
  openSettings:  () => set({ settingsVisible: true }),
  closeSettings: () => set({ settingsVisible: false }),
  updateEquipmentAndLocation: async (location, equipment) => {
    const current = get().profile;
    if (!current) return;
    const equipmentJson = JSON.stringify(equipment);
    await db
      .update(profileTable)
      .set({ location, equipment: equipmentJson })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, location, equipment: equipmentJson } });
  },
  updateMusclePriorities: async (priorities) => {
    const current = get().profile;
    if (!current) return;
    const musclePrioritiesJson = JSON.stringify(priorities);
    await db
      .update(profileTable)
      .set({ musclePriorities: musclePrioritiesJson })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, musclePriorities: musclePrioritiesJson } });
  },
  updateRestSoundMode: async (mode) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ restSoundMode: mode })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, restSoundMode: mode } });
  },
  updateTrainingLocationMode: async (mode) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ trainingLocationMode: mode })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, trainingLocationMode: mode } });
  },
  updateWarmupPromptMode: async (mode) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ warmupPromptMode: mode })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, warmupPromptMode: mode } });
  },
  updateCooldownPromptMode: async (mode) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ cooldownPromptMode: mode })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, cooldownPromptMode: mode } });
  },
  updateDaysPerWeek: async (value) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ daysPerWeek: value })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, daysPerWeek: value } });
  },
  updateMinutesPerSession: async (value) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ minutesPerSession: value })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, minutesPerSession: value } });
  },
  updateUnits: async (value) => {
    const current = get().profile;
    if (!current) return;
    await db
      .update(profileTable)
      .set({ units: value })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, units: value } });
  },
}));
