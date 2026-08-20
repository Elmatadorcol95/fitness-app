import { create } from 'zustand';

export interface SheetOption<T extends string | number = string | number> {
  label: string;
  value: T;
}

interface SheetRequest {
  options: SheetOption[];
  onSelect: (value: string | number) => void;
  selectedValue?: string | number;
  title?: string;
  cancelLabel?: string;
}

interface SheetState {
  request: SheetRequest | null;
  open: (request: SheetRequest) => void;
  close: () => void;
}

// Store efímero: vive solo en memoria mientras la app está abierta (mismo
// patrón que cooldown.store.ts/warmup.store.ts). Un único slot de solicitud
// a la vez — no hay pila de sheets simultáneos, igual que VulcanBottomSheet
// original (cada instancia solo tenía un `visible` propio).
export const useSheetStore = create<SheetState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
