import { create } from 'zustand';
import type { WarmupItem } from '@/lib/warmupGenerator';

interface WarmupState {
  items: WarmupItem[];
  currentIndex: number;
  setWarmup: (items: WarmupItem[]) => void;
  advance: () => void;
  reset: () => void;
}

// Store efímero: vive solo en memoria mientras la app está abierta. No toca
// SQLite ni AsyncStorage — no hay persistencia entre sesiones ni reinicios.
export const useWarmupStore = create<WarmupState>((set) => ({
  items: [],
  currentIndex: 0,
  setWarmup: (items) => set({ items, currentIndex: 0 }),
  advance: () => set((s) => ({
    currentIndex: Math.min(s.currentIndex + 1, Math.max(s.items.length - 1, 0)),
  })),
  reset: () => set({ items: [], currentIndex: 0 }),
}));
