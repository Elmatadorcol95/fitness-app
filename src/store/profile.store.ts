import { create } from 'zustand';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { profile as profileTable } from '@/db/schema';
import type { Profile } from '@/db/schema';

export type Goal = 'strength' | 'hypertrophy' | 'fat_loss';
export type Location = 'home' | 'gym' | 'both';
export type Units = 'metric' | 'imperial';

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
  injuries: '',
};

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  isDbReady: boolean;
  draft: OnboardingDraft;
  equipmentVisible: boolean;
  setProfile: (p: Profile | null) => void;
  setLoading: (v: boolean) => void;
  setDbReady: (v: boolean) => void;
  updateDraft: (updates: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
  updateEquipmentAndLocation: (location: Location, equipment: string[]) => Promise<void>;
  openEquipment: () => void;
  closeEquipment: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  isLoading: true,
  isDbReady: false,
  draft: { ...defaultDraft },
  equipmentVisible: false,
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setDbReady: (isDbReady) => set({ isDbReady }),
  updateDraft: (updates) => set((s) => ({ draft: { ...s.draft, ...updates } })),
  resetDraft: () => set({ draft: { ...defaultDraft } }),
  openEquipment:  () => set({ equipmentVisible: true }),
  closeEquipment: () => set({ equipmentVisible: false }),
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
}));
