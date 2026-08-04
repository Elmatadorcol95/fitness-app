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

function assertCleanEnvValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `[Supabase] Falta la variable de entorno ${name}. Revisa tu .env ` +
      `(ver .env.example) — recuerda que .env.local tiene prioridad sobre ` +
      `.env si ambos existen.`
    );
  }
  if (/^[^\x20-\x7E]/.test(value)) {
    throw new Error(
      `[Supabase] ${name} empieza con un caracter no imprimible: ` +
      `${JSON.stringify(value.slice(0, 20))}... Esto suele pasar al pegar ` +
      `la credencial en un prompt interactivo de terminal — revisa tu ` +
      `.env / .env.local y regenera el valor sin pegarlo a mano.`
    );
  }
  return value;
}

const supabaseUrl = assertCleanEnvValue('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = assertCleanEnvValue('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl.startsWith('https://')) {
  throw new Error(
    `[Supabase] EXPO_PUBLIC_SUPABASE_URL no empieza por "https://": ` +
    `${JSON.stringify(supabaseUrl)}`
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
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
