import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Linking, StyleSheet, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { eq } from 'drizzle-orm';
import { useTranslation } from 'react-i18next';

import '@/i18n';
import { db, schema } from '@/db';
import migrations from '@/db/migrations/migrations';

import { MigrationErrorScreen } from '@/components/MigrationErrorScreen';

import { supabase, isTrialValid, daysRemaining } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { useGamificationStore } from '@/store/gamification.store';

import { VulcanSplash } from '@/components/VulcanSplash';
import { AuthFlow }       from '@/components/auth/AuthFlow';
import { PaywallScreen }  from '@/components/auth/PaywallScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import AppTabs            from '@/components/app-tabs';
import SessionScreen      from '@/app/session';
import EquipmentScreen    from '@/app/equipment';
import MusclePrioritiesScreen from '@/app/musclePriorities';
import ExercisePreferencesScreen from '@/app/exercisePreferences';
import RoutineBuilderScreen from '@/app/routineBuilder';
import SettingsScreen     from '@/app/settings';
import { registerNotificationHandler } from '@/lib/notifications';
import WarmupScreen       from '@/app/warmup';
import CooldownScreen     from '@/app/cooldown';
import { useSessionStore } from '@/store/session.store';
import { useWarmupStore } from '@/store/warmup.store';
import { useCooldownStore } from '@/store/cooldown.store';
import { CooldownFlowOverlay } from '@/components/cooldown/CooldownFlowOverlay';
import { AchievementCelebrationOverlay } from '@/components/gamification/AchievementCelebrationOverlay';
import { BottomSheetOverlay } from '@/components/ui/BottomSheetOverlay';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms)
    ),
  ]);
}

// Intercambia el código PKCE (o tokens implícitos) de una URL de callback
async function handleAuthUrl(url: string) {
  if (!url.includes('auth/callback')) return;
  try {
    const codeMatch = url.match(/[?&]code=([^&#]+)/);
    if (codeMatch) {
      await supabase.auth.exchangeCodeForSession(codeMatch[1]);
      return;
    }
    const fragment = url.split('#')[1] ?? '';
    const p = Object.fromEntries(new URLSearchParams(fragment));
    if (p.access_token && p.refresh_token) {
      await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token });
    }
  } catch (e) {
    console.error('Auth URL error:', e);
  }
}

function MigrationRunner({ onResult }: { onResult: (r: { success: boolean; error?: Error }) => void }) {
  const result = useMigrations(db, migrations);
  useEffect(() => { onResult(result); }, [result.success, result.error]);
  return null;
}

export default function RootLayout() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const [migrationAttempt, setMigrationAttempt] = useState(0);
  const [migrationsReady, setMigrationsReady] = useState(false);
  const [migrationsError, setMigrationsError] = useState<Error | undefined>(undefined);
  const [authCheckAttempt, setAuthCheckAttempt] = useState(0);
  const [authCheckTimedOut, setAuthCheckTimedOut] = useState(false);

  useEffect(() => {
    if (migrationsError) {
      console.error('[Migrations] Error aplicando migraciones:', migrationsError);
    }
  }, [migrationsError]);

  // #38: handler de comportamiento en primer plano — sin esto, la opción
  // "Nativo de Android" no mostraría/sonaría nada con la app abierta. Global,
  // una sola vez al arrancar — no depende de ningún flag de visibilidad.
  useEffect(() => {
    registerNotificationHandler();
  }, []);

  // Selectores SOLO primitivos — nunca objetos
  const isAuthenticated  = useAuthStore((s) => !!s.session);
  const isAuthLoading    = useAuthStore((s) => s.isAuthLoading);
  const hasUserStatus    = useAuthStore((s) => s.userStatus !== null);
  const trialStartedAt   = useAuthStore((s) => s.userStatus?.trial_started_at ?? null);
  const isPaid           = useAuthStore((s) => s.userStatus?.is_paid ?? false);
  const hasProfile       = useProfileStore((s) => s.profile !== null);
  const isProfileLoading = useProfileStore((s) => s.isLoading);

  // Suscripción Supabase + validación inicial + deep links — una sola vez
  useEffect(() => {
    // ── Cambios FUTUROS de sesión (login, logout, token refresh) ─────────────
    // Ignoramos INITIAL_SESSION porque lo manejamos manualmente abajo con
    // getUser(), que valida contra el servidor y rechaza cuentas borradas.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('[Auth] onAuthStateChange event:', event, '| user:', newSession?.user?.email ?? null);
        if (event === 'INITIAL_SESSION') return;

        let fetchedStatus = null;
        if (newSession?.user) {
          try {
            const { data } = await withTimeout(
              Promise.resolve(supabase.from('user_status').select('trial_started_at, is_paid').single()),
              6000,
              'authEventStatus'
            );
            fetchedStatus = data ?? null;
          } catch (e) {
            console.log('[Auth] onAuthStateChange — user_status timeout/error, continuando sin status:', e);
          }
        }
        console.log('[Auth] setAuthState via event — session:', newSession?.user?.email ?? null, '| status:', fetchedStatus);
        useAuthStore.getState().setAuthState(newSession, fetchedStatus);
      },
    );

    // ── Verificación inicial con el servidor ──────────────────────────────────
    (async () => {
      setAuthCheckTimedOut(false);
      try {
        const { data: { user }, error } = await withTimeout(
          supabase.auth.getUser(),
          15000,
          'getUser'
        );
        console.log('[Auth] startup getUser — user:', user?.email ?? null, '| error:', error?.message ?? null);

        if (error || !user) {
          console.log('[Auth] startup → no valid user, clearing session');
          useAuthStore.getState().setAuthState(null, null);
          return;
        }

        const [statusRes, sessionRes] = await withTimeout(
          Promise.all([
            supabase.from('user_status').select('trial_started_at, is_paid').single(),
            supabase.auth.getSession(),
          ]),
          15000,
          'startupStatus'
        );
        console.log('[Auth] startup → authenticated as', user.email, '| session:', !!sessionRes.data.session);
        useAuthStore.getState().setAuthState(
          sessionRes.data.session ?? null,
          statusRes.data ?? null,
        );
      } catch (e) {
        const isTimeout = e instanceof Error && e.message.startsWith('TIMEOUT:');
        console.log('[Auth] startup error — clearing session:', e);
        if (isTimeout) {
          setAuthCheckTimedOut(true);
        } else {
          useAuthStore.getState().setAuthState(null, null);
        }
      }
    })();

    // ── Deep link de verificación de email ────────────────────────────────────
    Linking.getInitialURL().then(url => { if (url) handleAuthUrl(url); });
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, [authCheckAttempt]);

  // Cargar datos SQLite una vez confirmadas las migraciones.
  // Las migraciones (0000-0008) las aplica useMigrations() automáticamente.
  // Solo después de que terminen es seguro hacer cualquier consulta a la DB.
  // isDbReady=true es la señal global que usan los componentes para saber que
  // la DB está lista; sin ella, StreakWidget, AchievementsSection e HistoryScreen
  // consultarían tablas que aún no existen.
  useEffect(() => {
    if (!migrationsReady || isAuthLoading) return;
    (async () => {
      try {
        const rows = await db.select().from(schema.profile).limit(1);
        const row = rows[0];
        if (!row) {
          useProfileStore.getState().setProfile(null);
        } else {
          const currentUserId = useAuthStore.getState().session?.user.id ?? null;
          if (row.authUserId === null) {
            // Instalación previa a la migración 0018 — backfill con la sesión actual.
            await db.update(schema.profile).set({ authUserId: currentUserId }).where(eq(schema.profile.id, row.id));
            useProfileStore.getState().setProfile({ ...row, authUserId: currentUserId });
          } else if (row.authUserId !== currentUserId) {
            console.warn('[Profile] auth_user_id no coincide con la sesion activa');
            useProfileStore.getState().setProfile(null);
          } else {
            useProfileStore.getState().setProfile(row);
          }
        }
      } catch {
        useProfileStore.getState().setProfile(null);
      } finally {
        useProfileStore.getState().setLoading(false);
      }
      await useWorkoutStore.getState().loadCurrentPlan();
      await useWorkoutStore.getState().backfillSelectedDayId();
      await useGamificationStore.getState().loadGamification();
      useProfileStore.getState().setDbReady(true);
    })();
  }, [migrationsReady, isAuthLoading]);

  // ── Patrón "overlay": AppTabs siempre montado, pantallas de auth encima ────
  //
  // Motivo: montar/desmontar NativeTabs condicionalmente desde el root layout
  // actualiza el store de navegación interno de Expo Router. usePathname() (u
  // otro hook de navegación) en este mismo componente suscribiría a ese store
  // → cada actualización del store fuerza un re-render → bucle.
  //
  // Solución: <AppTabs /> siempre montado (Expo Router feliz). Las pantallas
  // de auth/carga son overlays absolutas encima, sin participar en el sistema
  // de rutas. Cuando la condición cambia, el overlay desaparece y las tabs
  // quedan visibles sin re-montar nada.

  const isSessionActive    = useSessionStore(s => s.isActive);
  const isEquipmentVisible = useProfileStore(s => s.equipmentVisible);
  const isMusclePrioritiesVisible = useProfileStore(s => s.musclePrioritiesVisible);
  const isExercisePreferencesVisible = useProfileStore(s => s.exercisePreferencesVisible);
  const isRoutineBuilderVisible = useProfileStore(s => s.routineBuilderVisible);
  const isSettingsVisible = useProfileStore(s => s.settingsVisible);
  const isWarmupActive     = useWarmupStore(s => s.active);
  const isCooldownActive   = useCooldownStore(s => s.active);
  const stillLoading   = !migrationsReady || isProfileLoading || isAuthLoading;
  const trialExpired   = hasUserStatus && !!trialStartedAt && !isTrialValid(trialStartedAt, isPaid);
  const needsOnboarding = !stillLoading && isAuthenticated && !trialExpired && !hasProfile;
  const needsAuth       = !stillLoading && !isAuthenticated;
  const needsPaywall    = !stillLoading && isAuthenticated && trialExpired;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeProvider value={theme}>
      {/* Corre las migraciones; no ocupa pantalla. key={migrationAttempt} fuerza
          un montaje nuevo (y por tanto un intento nuevo) al pulsar "Reintentar". */}
      <MigrationRunner
        key={migrationAttempt}
        onResult={({ success, error }) => { setMigrationsReady(success); setMigrationsError(error); }}
      />

      {/* Tabs siempre montados — el store de navegación de Expo Router no fluctúa */}
      <AppTabs />

      {/* Overlays encima — position absolute cubre todo */}
      {stillLoading && !migrationsError && (
        <View style={StyleSheet.absoluteFill}>
          <VulcanSplash />
        </View>
      )}
      {migrationsError && (
        <View style={StyleSheet.absoluteFill}>
          <MigrationErrorScreen
            error={migrationsError}
            onRetry={() => {
              setMigrationsError(undefined);
              setMigrationAttempt(a => a + 1);
            }}
          />
        </View>
      )}
      {authCheckTimedOut && (
        <View style={StyleSheet.absoluteFill}>
          <MigrationErrorScreen
            error={new Error(t('migrations.connectionErrorMsg'))}
            onRetry={() => { setAuthCheckTimedOut(false); setAuthCheckAttempt(a => a + 1); }}
          />
        </View>
      )}
      {needsAuth && (
        <View style={StyleSheet.absoluteFill}>
          <AuthFlow />
        </View>
      )}
      {needsPaywall && (
        <View style={StyleSheet.absoluteFill}>
          <PaywallScreen daysOver={14 - daysRemaining(trialStartedAt!)} />
        </View>
      )}
      {needsOnboarding && (
        <View style={StyleSheet.absoluteFill}>
          <OnboardingFlow />
        </View>
      )}
      {/* Pantalla de sesión de entrenamiento — overlay sobre las tabs */}
      {isSessionActive && (
        <View style={StyleSheet.absoluteFill}>
          <SessionScreen />
        </View>
      )}
      {/* Pantalla de equipamiento — overlay sobre las tabs */}
      {isEquipmentVisible && (
        <View style={StyleSheet.absoluteFill}>
          <EquipmentScreen />
        </View>
      )}
      {/* Pantalla de prioridad muscular — overlay sobre las tabs */}
      {isMusclePrioritiesVisible && (
        <View style={StyleSheet.absoluteFill}>
          <MusclePrioritiesScreen />
        </View>
      )}
      {/* Pantalla de preferencias de ejercicios — overlay sobre las tabs */}
      {isExercisePreferencesVisible && (
        <View style={StyleSheet.absoluteFill}>
          <ExercisePreferencesScreen />
        </View>
      )}
      {/* Pantalla del constructor de rutina propia — overlay sobre las tabs */}
      {isRoutineBuilderVisible && (
        <View style={StyleSheet.absoluteFill}>
          <RoutineBuilderScreen />
        </View>
      )}
      {/* Pantalla de Ajustes — overlay sobre las tabs */}
      {isSettingsVisible && (
        <View style={StyleSheet.absoluteFill}>
          <SettingsScreen />
        </View>
      )}
      {/* Pantalla de calentamiento — overlay sobre las tabs */}
      {isWarmupActive && (
        <View style={StyleSheet.absoluteFill}>
          <WarmupScreen />
        </View>
      )}
      {/* Pantalla de enfriamiento — overlay sobre las tabs */}
      {isCooldownActive && (
        <View style={StyleSheet.absoluteFill}>
          <CooldownScreen />
        </View>
      )}
      {/* Flujo de diálogo de enfriamiento (prompt + minutos) — siempre montado,
          igual que el overlay de logros; lee su visibilidad del store, no del
          ciclo de vida de SessionScreen (ver COOLDOWN_INTEGRATION_AUDIT.md) */}
      <CooldownFlowOverlay />
      {/* Overlay de logros — encima de todo, incluido la sesión */}
      <AchievementCelebrationOverlay />
      {/* Piloto #40 (parte 2): sheet store-driven, sin Modal — reemplaza
          VulcanBottomSheet solo para "¿Dónde entrenas hoy?" (training.tsx) */}
      <BottomSheetOverlay />
    </ThemeProvider>
    </GestureHandlerRootView>
  );
}
