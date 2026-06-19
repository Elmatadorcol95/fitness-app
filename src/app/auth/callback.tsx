import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  // Evita ejecutar el intercambio más de una vez (p. ej. en React Strict Mode)
  const hasRun = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

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
        // Señalamos que terminamos. El render devolverá <Redirect>,
        // que navega DESPUÉS del ciclo de render actual — sin colisionar
        // con las actualizaciones de estado de onAuthStateChange.
        setDone(true);
      }
    })();
  }, [code]);

  // La navegación ocurre de forma declarativa, fuera del ciclo de render activo
  if (done) {
    return <Redirect href="/" />;
  }

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
