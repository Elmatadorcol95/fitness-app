import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';

// Placeholder — Fase 1b Paso 2. La pantalla de foco real (recorrer los
// WarmupItem del store con temporizador) se construye en el Paso 3.
export default function WarmupScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={[styles.safe, styles.centered]}>
        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('workout.warmup.placeholderTitle')}
          </ThemedText>
          <Pressable style={styles.btn} onPress={() => router.back()}>
            <ThemedText style={styles.btnText}>
              {t('workout.warmup.placeholderButton')}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.four },
  content: { alignItems: 'center', gap: Spacing.four },
  title: { textAlign: 'center' },
  btn: {
    backgroundColor: GREEN, borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    minWidth: 200, alignItems: 'center',
  },
  btnText: { color: '#04261A', fontSize: 16, fontWeight: '700' },
});
