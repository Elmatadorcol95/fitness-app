import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';

import '@/i18n';
import { db, schema } from '@/db';
import migrations from '@/db/migrations/migrations';
import { useProfileStore } from '@/store/profile.store';
import { VulcanSplash } from '@/components/VulcanSplash';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import AppTabs from '@/components/app-tabs';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { profile, isLoading, setProfile, setLoading } = useProfileStore();
  const { success: migrationsReady, error: migrationError } = useMigrations(db, migrations);

  useEffect(() => {
    if (!migrationsReady) return;

    (async () => {
      try {
        const rows = await db.select().from(schema.profile).limit(1);
        setProfile(rows[0] ?? null);
      } catch (e) {
        console.error('Error cargando perfil:', e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [migrationsReady]);

  if (migrationError) {
    console.error('Error en migraciones:', migrationError);
  }

  // Mostrar animación Vulcan mientras carga
  if (isLoading || !migrationsReady) {
    return <VulcanSplash />;
  }

  if (!profile) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <OnboardingFlow />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppTabs />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
