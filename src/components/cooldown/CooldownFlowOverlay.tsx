import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { useCooldownStore } from '@/store/cooldown.store';
import { Spacing } from '@/constants/theme';

// Siempre montado (mismo patrón que AchievementCelebrationOverlay): renderiza
// el diálogo "¿quieres estirar?" y el modal de minutos, leyendo su visibilidad
// directamente del store de cooldown en vez de estado local de SessionScreen
// (que ya se desmontó para cuando este flujo arranca — ver
// COOLDOWN_INTEGRATION_AUDIT.md, sección 2).
export function CooldownFlowOverlay() {
  const { t } = useTranslation();
  const promptOpen    = useCooldownStore(s => s.promptOpen);
  const minutesOpen   = useCooldownStore(s => s.minutesOpen);
  const declinePrompt = useCooldownStore(s => s.declinePrompt);
  const acceptPrompt  = useCooldownStore(s => s.acceptPrompt);
  const chooseMinutes = useCooldownStore(s => s.chooseMinutes);

  return (
    <>
      {/* ── ¿Quieres estirar después de entrenar? ── */}
      <VulcanDialog
        visible={promptOpen}
        onClose={declinePrompt}
        title={t('workout.cooldown.promptTitle')}
        confirmLabel={t('workout.cooldown.yes')}
        cancelLabel={t('workout.cooldown.no')}
        onConfirm={acceptPrompt}
      />

      {/* ── ¿Cuánto tiempo quieres estirar? (chips, mismo patrón que el modal de minutos de warmup en training.tsx) ── */}
      <Modal
        visible={minutesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => useCooldownStore.getState().dismissAll()}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => useCooldownStore.getState().dismissAll()}
        >
          <View style={[StyleSheet.absoluteFill, styles.minutesBackdrop]} />
        </Pressable>

        <View style={styles.minutesCenterer} pointerEvents="box-none">
          <ThemedView type="backgroundElement" style={styles.minutesCard}>
            <ThemedText type="defaultSemiBold" style={styles.minutesTitle}>
              {t('workout.cooldown.minutesTitle')}
            </ThemedText>
            <View style={styles.chipRow}>
              {([3, 5, 10, 15] as const).map((m) => (
                <Pressable key={m} onPress={() => chooseMinutes(m)} style={styles.chipPressable}>
                  <ThemedView type="backgroundSelected" style={styles.chip}>
                    <ThemedText type="defaultSemiBold" style={styles.chipText}>
                      {t(`workout.cooldown.min${m}`)}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          </ThemedView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  minutesBackdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  minutesCenterer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  minutesCard: {
    width: '100%', borderRadius: 20,
    padding: Spacing.four, gap: Spacing.three,
  },
  minutesTitle: { fontSize: 17, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: Spacing.two },
  chipPressable: { flex: 1 },
  chip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3FBF7F33',
  },
  chipText: { fontSize: 14 },
});
