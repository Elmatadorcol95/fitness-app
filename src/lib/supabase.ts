import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// Almacenamiento en memoria (sin módulos nativos).
// La sesión no persiste si el usuario cierra la app, pero es suficiente
// para esta fase. En el próximo EAS build se migrará a expo-secure-store.
const _mem = new Map<string, string>();
const memStorage = {
  getItem:    async (key: string) => _mem.get(key) ?? null,
  setItem:    async (key: string, value: string) => { _mem.set(key, value); },
  removeItem: async (key: string) => { _mem.delete(key); },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: memStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// ── Helpers de trial ──────────────────────────────────────────────────────────
export const TRIAL_DAYS = 14;

export function daysRemaining(trialStartedAt: string): number {
  const elapsed = (Date.now() - new Date(trialStartedAt).getTime()) / 86_400_000;
  return Math.max(0, Math.ceil(TRIAL_DAYS - elapsed));
}

export function isTrialValid(trialStartedAt: string, isPaid: boolean): boolean {
  return isPaid || daysRemaining(trialStartedAt) > 0;
}

export type UserStatus = { trial_started_at: string; is_paid: boolean };
