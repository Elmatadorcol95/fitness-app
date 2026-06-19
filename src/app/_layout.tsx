import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Linking, StyleSheet, View, useColorScheme } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import '@/i18n';
import { db, schema } from '@/db';
import migrations from '@/db/migrations/migrations';

import { supabase, isTrialValid, daysRemaining } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { useGamificationStore } from '@/store/gamification.store';

import { VulcanSplash }   from '@/components/VulcanSplash';
import { AuthFlow }       from '@/components/auth/AuthFlow';
import { PaywallScreen }  from '@/components/auth/PaywallScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import AppTabs            from '@/components/app-tabs';
import SessionScreen      from '@/app/session';
import { useSessionStore } from '@/store/session.store';
import { AchievementCelebrationOverlay } from '@/components/gamification/AchievementCelebrationOverlay';

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

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  const { success: migrationsReady } = useMigrations(db, migrations);

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
          const { data } = await supabase
            .from('user_status')
            .select('trial_started_at, is_paid')
            .single();
          fetchedStatus = data ?? null;
        }
        console.log('[Auth] setAuthState via event — session:', newSession?.user?.email ?? null, '| status:', fetchedStatus);
        useAuthStore.getState().setAuthState(newSession, fetchedStatus);
      },
    );

    // ── Verificación inicial con el servidor ──────────────────────────────────
    (async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('[Auth] startup getUser — user:', user?.email ?? null, '| error:', error?.message ?? null);

        if (error || !user) {
          console.log('[Auth] startup → no valid user, clearing session');
          useAuthStore.getState().setAuthState(null, null);
          return;
        }

        const [statusRes, sessionRes] = await Promise.all([
          supabase.from('user_status').select('trial_started_at, is_paid').single(),
          supabase.auth.getSession(),
        ]);
        console.log('[Auth] startup → authenticated as', user.email, '| session:', !!sessionRes.data.session);
        useAuthStore.getState().setAuthState(
          sessionRes.data.session ?? null,
          statusRes.data ?? null,
        );
      } catch (e) {
        console.log('[Auth] startup error — clearing session:', e);
        useAuthStore.getState().setAuthState(null, null);
      }
    })();

    // ── Deep link de verificación de email ────────────────────────────────────
    Linking.getInitialURL().then(url => { if (url) handleAuthUrl(url); });
    const linkingSub = Linking.addEventListener('url', ({ url }) => handleAuthUrl(url));

    return () => {
      subscription.unsubscribe();
      linkingSub.remove();
    };
  }, []);

  // Cargar datos SQLite una vez confirmadas las migraciones.
  // Las migraciones (0000-0008) las aplica useMigrations() automáticamente.
  // Solo después de que terminen es seguro hacer cualquier consulta a la DB.
  // isDbReady=true es la señal global que usan los componentes para saber que
  // la DB está lista; sin ella, StreakWidget, AchievementsSection e HistoryScreen
  // consultarían tablas que aún no existen.
  useEffect(() => {
    if (!migrationsReady) return;
    (async () => {
      try {
        const rows = await db.select().from(schema.profile).limit(1);
        useProfileStore.getState().setProfile(rows[0] ?? null);
      } catch {
        useProfileStore.getState().setProfile(null);
      } finally {
        useProfileStore.getState().setLoading(false);
      }
      await useWorkoutStore.getState().loadCurrentPlan();
      await useGamificationStore.getState().loadGamification();
      useProfileStore.getState().setDbReady(true);
    })();
  }, [migrationsReady]);

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

  const isSessionActive = useSessionStore(s => s.isActive);
  const stillLoading   = !migrationsReady || isProfileLoading || isAuthLoading;
  const trialExpired   = hasUserStatus && !!trialStartedAt && !isTrialValid(trialStartedAt, isPaid);
  const needsOnboarding = !stillLoading && isAuthenticated && !trialExpired && !hasProfile;
  const needsAuth       = !stillLoading && !isAuthenticated;
  const needsPaywall    = !stillLoading && isAuthenticated && trialExpired;

  return (
    <ThemeProvider value={theme}>
      {/* Tabs siempre montados — el store de navegación de Expo Router no fluctúa */}
      <AppTabs />

      {/* Overlays encima — position absolute cubre todo */}
      {stillLoading && (
        <View style={StyleSheet.absoluteFill}>
          <VulcanSplash />
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
      {/* Overlay de logros — encima de todo, incluido la sesión */}
      <AchievementCelebrationOverlay />
    </ThemeProvider>
  );
}
