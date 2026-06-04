import { create } from 'zustand';
import type { Profile } from '@/db/schema';

export type Goal = 'strength' | 'hypertrophy' | 'fat_loss';
export type Location = 'home' | 'gym' | 'both';
export type Units = 'metric' | 'imperial';

export interface OnboardingDraft {
  name: string;
  units: Units;
  birthYear?: number;
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
  draft: OnboardingDraft;
  setProfile: (p: Profile | null) => void;
  setLoading: (v: boolean) => void;
  updateDraft: (updates: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: true,
  draft: { ...defaultDraft },
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  updateDraft: (updates) => set((s) => ({ draft: { ...s.draft, ...updates } })),
  resetDraft: () => set({ draft: { ...defaultDraft } }),
}));
