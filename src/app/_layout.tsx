import { useEffect } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import '@/i18n';
import { db, schema } from '@/db';
import migrations from '@/db/migrations/migrations';

import { supabase, isTrialValid, daysRemaining } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';
import { useProfileStore } from '@/store/profile.store';

import { VulcanSplash }    from '@/components/VulcanSplash';
import { AuthFlow }        from '@/components/auth/AuthFlow';
import { PaywallScreen }   from '@/components/auth/PaywallScreen';
import { OnboardingFlow }  from '@/components/onboarding/OnboardingFlow';
import AppTabs             from '@/components/app-tabs';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // ── DB migrations ──────────────────────────────────────────────────────────
  const { success: migrationsReady } = useMigrations(db, migrations);

  // ── Stores ─────────────────────────────────────────────────────────────────
  const { profile, isLoading: isProfileLoading, setProfile, setLoading } = useProfileStore();
  const { session, userStatus, isAuthLoading, setSession, setUserStatus, setAuthLoading } = useAuthStore();

  // ── Escuchar cambios de sesión Supabase ────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          const { data } = await supabase
            .from('user_status')
            .select('trial_started_at, is_paid')
            .single();
          setUserStatus(data ?? null);
        } else {
          setUserStatus(null);
        }

        setAuthLoading(false);
      },
    );
    return () => subscription.unsubscribe();
  }, []);

  // ── Manejar deep link vulcan://auth/callback cuando vuelve de verificar email ──
  useEffect(() => {
    const handleUrl = async (url: string) => {
      if (!url.includes('auth/callback')) return;

      // Flujo PKCE: Supabase manda ?code=xxx
      const qs = url.split('?')[1] ?? '';
      const code = new URLSearchParams(qs).get('code');
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }

      // Flujo implícito (fallback): tokens en el fragmento #access_token=xxx&...
      const fragment = url.split('#')[1] ?? '';
      const p = Object.fromEntries(new URLSearchParams(fragment));
      if (p.access_token && p.refresh_token) {
        await supabase.auth.setSession({
          access_token:  p.access_token,
          refresh_token: p.refresh_token,
        });
      }
    };

    // App estaba cerrada: obtener URL inicial
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // App en segundo plano: escuchar nuevas URLs
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // ── Cargar perfil local (SQLite) una vez que las migraciones estén listas ──
  useEffect(() => {
    if (!migrationsReady) return;
    (async () => {
      try {
        const rows = await db.select().from(schema.profile).limit(1);
        setProfile(rows[0] ?? null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [migrationsReady]);

  // ── Pantalla de carga ───────────────────────────────────────────────────────
  const stillLoading = !migrationsReady || isProfileLoading || isAuthLoading;
  if (stillLoading) return <VulcanSplash />;

  // ── Sin sesión → pantallas de auth ─────────────────────────────────────────
  if (!session) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthFlow />
      </ThemeProvider>
    );
  }

  // ── Trial expirado y sin pago → paywall ─────────────────────────────────────
  if (userStatus && !isTrialValid(userStatus.trial_started_at, userStatus.is_paid)) {
    const over = 14 - daysRemaining(userStatus.trial_started_at);
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <PaywallScreen daysOver={over} />
      </ThemeProvider>
    );
  }

  // ── Sin perfil local → onboarding ───────────────────────────────────────────
  if (!profile) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <OnboardingFlow />
      </ThemeProvider>
    );
  }

  // ── Todo ok → app principal ─────────────────────────────────────────────────
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({});
