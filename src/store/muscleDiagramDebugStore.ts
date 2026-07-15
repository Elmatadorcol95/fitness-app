// TEMPORAL — spike paso 3b, se reemplaza en paso 3c.
import { create } from 'zustand';

interface MuscleDiagramDebugState {
  visible: boolean;
  open: () => void;
  close: () => void;
}

export const useMuscleDiagramDebugStore = create<MuscleDiagramDebugState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
