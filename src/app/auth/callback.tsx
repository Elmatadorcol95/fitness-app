import { useEffect } from 'react';
import { ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

/**
 * Pantalla de callback del deep link vulcan://auth/callback.
 * Expo Router la renderiza cuando el usuario regresa a la app
 * tras hacer clic en el enlace de confirmación de correo.
 *
 * Supabase redirige con ?code=xxx (flujo PKCE) o #access_token=xxx (flujo implícito).
 * Aquí se extrae el token, se cierra la sesión y se redirige a la app principal.
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code?: string }>();

  useEffect(() => {
    (async () => {
      try {
        // ── Flujo PKCE (por defecto en Supabase v2): ?code=xxx ──────────────
        if (code) {
          await supabase.auth.exchangeCodeForSession(String(code));
          return;
        }

        // ── Flujo implícito (fallback): tokens en el fragmento #... ─────────
        const url = await Linking.getInitialURL();
        if (url) {
          const fragment = url.split('#')[1] ?? '';
          const p = Object.fromEntries(new URLSearchParams(fragment));
          if (p.access_token && p.refresh_token) {
            await supabase.auth.setSession({
              access_token:  p.access_token,
              refresh_token: p.refresh_token,
            });
          }
        }
      } catch (e) {
        console.error('Auth callback error:', e);
      } finally {
        // Volver al inicio: _layout.tsx reevalúa el estado y muestra lo correcto
        router.replace('/');
      }
    })();
  }, [code]);

  return (
    <ThemedView style={styles.root}>
      <ActivityIndicator size="large" color="#3FBF7F" />
      <ThemedText themeColor="textSecondary" style={styles.text}>
        Verificando cuenta…
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  text: { fontSize: 14 },
});
