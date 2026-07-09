import { create } from 'zustand';
import type { WarmupItem } from '@/lib/warmupGenerator';
import type { DayType } from '@/lib/plan-generator';
import type { Exercise } from '@/lib/exercises';

interface WarmupState {
  items: WarmupItem[];
  currentIndex: number;
  active: boolean;
  // Contexto en el que se generó la rutina — necesario para que "Intercambiar"
  // (Paso 3) pueda buscar una alternativa en el mismo pool, sin volver a
  // derivarlo de profile.location (que puede no coincidir con el contexto
  // gym/casa elegido para HOY por un usuario "ambos").
  dayType: DayType | null;
  equipment: string[];
  isGym: boolean;
  start: (items: WarmupItem[], dayType: DayType, equipment: string[], isGym: boolean) => void;
  advance: () => void;
  end: () => void;
  replaceCurrent: (exercise: Exercise) => void;
}

// Store efímero: vive solo en memoria mientras la app está abierta. No toca
// SQLite ni AsyncStorage — no hay persistencia entre sesiones ni reinicios.
export const useWarmupStore = create<WarmupState>((set, get) => ({
  items: [],
  currentIndex: 0,
  active: false,
  dayType: null,
  equipment: [],
  isGym: false,
  start: (items, dayType, equipment, isGym) =>
    set({ items, currentIndex: 0, active: true, dayType, equipment, isGym }),
  advance: () => set((s) => ({
    currentIndex: Math.min(s.currentIndex + 1, Math.max(s.items.length - 1, 0)),
  })),
  end: () => set({ items: [], currentIndex: 0, active: false, dayType: null, equipment: [], isGym: false }),
  replaceCurrent: (exercise) => {
    const { items, currentIndex } = get();
    if (!items[currentIndex]) return;
    const updated = [...items];
    updated[currentIndex] = { ...updated[currentIndex], exercise };
    set({ items: updated });
  },
}));
