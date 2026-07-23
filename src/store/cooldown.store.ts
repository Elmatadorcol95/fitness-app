import { create } from 'zustand';
import { generateCooldown, type CooldownItem } from '@/lib/cooldownGenerator';
import type { DayType } from '@/lib/plan-generator';
import type { Exercise } from '@/lib/exercises';
import { getDislikedIds } from '@/lib/exercisePreferences';

interface PendingCooldownContext {
  dayType: DayType;
  equipment: string[];
  isGym: boolean;
}

interface CooldownState {
  items: CooldownItem[];
  active: boolean;
  // Contexto en el que se generó la rutina — mismo motivo que warmup.store.ts:
  // necesario para que "Intercambiar" busque en el mismo pool sin re-derivarlo.
  dayType: DayType | null;
  equipment: string[];
  isGym: boolean;
  dislikedIds: Set<string>;
  start: (items: CooldownItem[], dayType: DayType, equipment: string[], isGym: boolean, dislikedIds: Set<string>) => void;
  end: () => void;
  replaceAt: (index: number, exercise: Exercise, durationSeconds: number) => void;

  // ── Flujo previo: "¿quieres estirar?" → elección de minutos ─────────────────
  promptOpen: boolean;
  minutesOpen: boolean;
  pending: PendingCooldownContext | null;
  promptAfterSession: (dayType: DayType, equipment: string[], isGym: boolean) => void;
  declinePrompt: () => void;
  acceptPrompt: () => void;
  chooseMinutes: (minutes: 3 | 5 | 10 | 15) => Promise<void>;
  dismissAll: () => void;
}

// Store efímero: vive solo en memoria mientras la app está abierta. No toca
// SQLite ni AsyncStorage — no hay persistencia entre sesiones ni reinicios.
export const useCooldownStore = create<CooldownState>((set, get) => ({
  items: [],
  active: false,
  dayType: null,
  equipment: [],
  isGym: false,
  dislikedIds: new Set(),
  promptOpen: false,
  minutesOpen: false,
  pending: null,

  start: (items, dayType, equipment, isGym, dislikedIds) =>
    set({ items, active: true, dayType, equipment, isGym, dislikedIds }),
  end: () => set({ items: [], active: false, dayType: null, equipment: [], isGym: false, dislikedIds: new Set() }),
  replaceAt: (index, exercise, durationSeconds) => {
    const { items } = get();
    if (!items[index]) return;
    const updated = [...items];
    updated[index] = { exercise, durationSeconds };
    set({ items: updated });
  },

  promptAfterSession: (dayType, equipment, isGym) =>
    set({ pending: { dayType, equipment, isGym }, promptOpen: true }),
  declinePrompt: () => set({ promptOpen: false, pending: null }),
  acceptPrompt: () => set({ promptOpen: false, minutesOpen: true }),
  chooseMinutes: async (minutes) => {
    const { pending, start } = get();
    if (!pending) { set({ minutesOpen: false }); return; }
    const dislikedIds = await getDislikedIds();
    const items = generateCooldown(pending.dayType, pending.equipment, pending.isGym, minutes, dislikedIds);
    set({ minutesOpen: false, pending: null });
    start(items, pending.dayType, pending.equipment, pending.isGym, dislikedIds);
  },
  dismissAll: () => set({ promptOpen: false, minutesOpen: false, pending: null }),
}));
