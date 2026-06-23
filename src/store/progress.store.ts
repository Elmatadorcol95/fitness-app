import { create } from 'zustand';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import {
  weightLog,
  bodyMeasurements,
  progressPhotos,
  measurementPrefs,
  profile,
  type WeightEntry,
  type MeasurementEntry,
  type ProgressPhoto,
} from '@/db/schema';

export type MeasurementField =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hip'
  | 'arm'
  | 'forearm'
  | 'thigh'
  | 'calf'
  | 'bodyFatPct';

export const ALL_MEASUREMENT_FIELDS: MeasurementField[] = [
  'neck',
  'shoulders',
  'chest',
  'waist',
  'hip',
  'arm',
  'forearm',
  'thigh',
  'calf',
  'bodyFatPct',
];

export type { WeightEntry, MeasurementEntry, ProgressPhoto };

interface ProgressState {
  weightEntries: WeightEntry[];
  measurements: MeasurementEntry[];
  photos: ProgressPhoto[];
  activeFields: MeasurementField[];
  isLoading: boolean;

  loadAll: () => Promise<void>;
  addWeight: (weightKg: number, date: string, notes?: string) => Promise<void>;
  deleteWeight: (id: number) => Promise<void>;
  addMeasurement: (data: { date: string } & Partial<Record<MeasurementField, number>>) => Promise<void>;
  addPhoto: (date: string, pose: 'front' | 'side' | 'back', localUri: string) => Promise<void>;
  deletePhoto: (id: number) => Promise<void>;
  setActiveFields: (fields: MeasurementField[]) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  weightEntries: [],
  measurements: [],
  photos: [],
  activeFields: ['waist', 'hip', 'chest', 'arm'],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true });
    try {
      const [wRaw, measures, ph, prefs] = await Promise.all([
        db.select().from(weightLog).orderBy(desc(weightLog.date)),
        db.select().from(bodyMeasurements).orderBy(desc(bodyMeasurements.date)),
        db.select().from(progressPhotos).orderBy(desc(progressPhotos.date)),
        db.select().from(measurementPrefs).limit(1),
      ]);

      let weights = wRaw;

      // Semilla para usuarios que completaron el onboarding antes de que existiera
      // el historial de peso. Solo se ejecuta si weight_log está vacío Y el perfil
      // ya existe (garantía de que el onboarding terminó y no estamos en medio de él).
      if (weights.length === 0) {
        const profileRows = await db.select().from(profile).limit(1);
        const p = profileRows[0];
        if (p?.weightKg && p.weightKg > 0) {
          const d = new Date(p.createdAt);
          const seedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          // Guarda de deduplicación: no insertar si ya existe una fila para esa fecha
          const already = await db
            .select({ id: weightLog.id })
            .from(weightLog)
            .where(eq(weightLog.date, seedDate))
            .limit(1);
          if (already.length === 0) {
            await db.insert(weightLog).values({
              weightKg:  p.weightKg,
              date:      seedDate,
              notes:     '',
              createdAt: p.createdAt,
            });
          }
          weights = await db.select().from(weightLog).orderBy(desc(weightLog.date));
        }
      }

      const activeFields: MeasurementField[] = prefs[0]
        ? (JSON.parse(prefs[0].activeFields) as MeasurementField[])
        : ['waist', 'hip', 'chest', 'arm'];

      set({ weightEntries: weights, measurements: measures, photos: ph, activeFields, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addWeight: async (weightKg, date, notes = '') => {
    const [entry] = await db
      .insert(weightLog)
      .values({ weightKg, date, notes, createdAt: Date.now() })
      .returning();
    set((s) => ({
      weightEntries: [entry, ...s.weightEntries].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  },

  deleteWeight: async (id) => {
    await db.delete(weightLog).where(eq(weightLog.id, id));
    set((s) => ({ weightEntries: s.weightEntries.filter((e) => e.id !== id) }));
  },

  addMeasurement: async (data) => {
    const [entry] = await db
      .insert(bodyMeasurements)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .values({ ...data, createdAt: Date.now() } as any)
      .returning();
    set((s) => ({
      measurements: [entry, ...s.measurements].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  },

  addPhoto: async (date, pose, localUri) => {
    const [entry] = await db
      .insert(progressPhotos)
      .values({ date, pose, localUri, createdAt: Date.now() })
      .returning();
    set((s) => ({
      photos: [entry, ...s.photos].sort((a, b) => b.date.localeCompare(a.date)),
    }));
  },

  deletePhoto: async (id) => {
    await db.delete(progressPhotos).where(eq(progressPhotos.id, id));
    set((s) => ({ photos: s.photos.filter((p) => p.id !== id) }));
  },

  setActiveFields: async (fields) => {
    const json = JSON.stringify(fields);
    const existing = await db.select().from(measurementPrefs).limit(1);
    if (existing.length === 0) {
      await db.insert(measurementPrefs).values({ activeFields: json });
    } else {
      await db.update(measurementPrefs).set({ activeFields: json }).where(eq(measurementPrefs.id, existing[0].id));
    }
    set({ activeFields: fields });
  },
}));
