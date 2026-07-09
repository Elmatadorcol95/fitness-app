import { create } from 'zustand';
import type { WarmupItem } from '@/lib/warmupGenerator';
import type { DayType } from '@/lib/plan-generator';
import type { Exercise } from '@/lib/exercises';

interface WarmupState {
  items: WarmupItem[];
  active: boolean;
  // Contexto en el que se generó la rutina — necesario para que "Intercambiar"
  // pueda buscar una alternativa en el mismo pool, sin volver a derivarlo de
  // profile.location (que puede no coincidir con el contexto gym/casa
  // elegido para HOY por un usuario "ambos").
  dayType: DayType | null;
  equipment: string[];
  isGym: boolean;
  start: (items: WarmupItem[], dayType: DayType, equipment: string[], isGym: boolean) => void;
  end: () => void;
  // Reemplaza el ejercicio (y su duración) del ítem en `index` — usado por el
  // botón "Intercambiar" de cada tarjeta de la lista. La duración se decide
  // en warmup.tsx (fija para la apertura de cardio, defaultDurationSeconds
  // del nuevo ejercicio para movilidad), no aquí.
  replaceAt: (index: number, exercise: Exercise, durationSeconds: number) => void;
}

// Store efímero: vive solo en memoria mientras la app está abierta. No toca
// SQLite ni AsyncStorage — no hay persistencia entre sesiones ni reinicios.
export const useWarmupStore = create<WarmupState>((set, get) => ({
  items: [],
  active: false,
  dayType: null,
  equipment: [],
  isGym: false,
  start: (items, dayType, equipment, isGym) =>
    set({ items, active: true, dayType, equipment, isGym }),
  end: () => set({ items: [], active: false, dayType: null, equipment: [], isGym: false }),
  replaceAt: (index, exercise, durationSeconds) => {
    const { items } = get();
    if (!items[index]) return;
    const updated = [...items];
    updated[index] = { exercise, durationSeconds };
    set({ items: updated });
  },
}));
