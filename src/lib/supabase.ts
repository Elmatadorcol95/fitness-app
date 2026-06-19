import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store: claves solo con alfanumérico + . - _  (máx 255 chars)
function sanitizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

const secureStorage = {
  getItem:    (key: string) => SecureStore.getItemAsync(sanitizeKey(key)),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(sanitizeKey(key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(sanitizeKey(key)),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: secureStorage,
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
