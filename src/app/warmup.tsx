import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useWarmupStore } from '@/store/warmup.store';
import { getWarmupAlternative } from '@/lib/warmupGenerator';
import { TimedChecklistItem } from '@/components/warmup/TimedChecklistItem';
import { hapticsSuccess } from '@/lib/haptics';
import { playRestDone } from '@/lib/sounds';

const GREEN = '#3FBF7F';

// Mismo valor de reserva que fillMobility() en warmupGenerator.ts (no
// exportado desde ahí — se duplica aquí, igual que otras constantes locales
// pequeñas ya duplicadas por archivo en este proyecto).
const DEFAULT_MOBILITY_SECONDS = 30;

// Fase 1b — rediseño a lista completa con checklist (de foco secuencial a
// lista). Un único cronómetro "mutex": solo remaining[runningIndex] avanza
// cada segundo; el resto de ítems quedan pausados tal cual al cambiar de
// cronómetro activo.
export default function WarmupScreen() {
  const { t } = useTranslation();

  const items       = useWarmupStore(s => s.items);
  const dayType     = useWarmupStore(s => s.dayType);
  const equipment   = useWarmupStore(s => s.equipment);
  const isGym       = useWarmupStore(s => s.isGym);
  const dislikedIds = useWarmupStore(s => s.dislikedIds);
  const end         = useWarmupStore(s => s.end);
  const replaceAt   = useWarmupStore(s => s.replaceAt);

  const [runningIndex, setRunningIndex] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number[]>(() => items.map(i => i.durationSeconds));
  const [completed, setCompleted] = useState<boolean[]>(() => items.map(() => false));

  // Mutex del cronómetro: un solo intervalo, ligado al índice que corre en
  // cada momento. Solo decrementa — sin efectos secundarios aquí dentro.
  useEffect(() => {
    if (runningIndex === null) return;
    const idx = runningIndex;
    const id = setInterval(() => {
      setRemaining(prev => {
        const current = prev[idx];
        if (current <= 0) return prev; // ya en cero, el efecto de abajo maneja la transición
        const next = [...prev];
        next[idx] = current - 1;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [runningIndex]);

  // Transición real a "llegó a 0": para, suena+vibra (mismo mecanismo que el
  // fin de descanso de session.tsx) y marca ese ítem como completado. Separado
  // del intervalo de arriba para no mezclar decremento puro con side effects.
  useEffect(() => {
    if (runningIndex === null) return;
    if (remaining[runningIndex] > 0) return;
    const idx = runningIndex;
    setRunningIndex(null);
    hapticsSuccess();
    playRestDone();
    setCompleted(c => { const next = [...c]; next[idx] = true; return next; });
  }, [runningIndex, remaining]);

  const excludeIds = items.map(it => it.exercise.id);
  const alternatives = dayType
    ? items.map(it => getWarmupAlternative(it.exercise.id, dayType, equipment, isGym, excludeIds, dislikedIds))
    : items.map(() => null);

  function handlePlayPause(i: number) {
    setRunningIndex(prev => (prev === i ? null : i));
  }

  function handleToggleComplete(i: number) {
    setCompleted(c => {
      const next = [...c];
      next[i] = !next[i];
      return next;
    });
  }

  function handleSwap(i: number) {
    const alt = alternatives[i];
    if (!alt) return;

    // La apertura de cardio (índice 0) tiene duración fija por diseño
    // (180s gimnasio / 60s casa) — se conserva la que ya tenía, sin adoptar
    // el defaultDurationSeconds del nuevo ejercicio elegido. El resto
    // (movilidad) sí usa el defaultDurationSeconds del nuevo ejercicio.
    const newDuration = i === 0
      ? items[i].durationSeconds
      : (alt.defaultDurationSeconds ?? DEFAULT_MOBILITY_SECONDS);

    replaceAt(i, alt, newDuration);
    setCompleted(c => { const next = [...c]; next[i] = false; return next; });
    setRemaining(r => { const next = [...r]; next[i] = newDuration; return next; });
  }

  const completedCount = completed.filter(Boolean).length;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
            {t('workout.warmup.progress', { current: completedCount, total: items.length })}
          </ThemedText>
          <Pressable onPress={end} hitSlop={8}>
            <ThemedText themeColor="textSecondary" style={styles.goLinkText}>
              {t('workout.warmup.goToWorkout')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, i) => (
            <TimedChecklistItem
              key={i}
              exercise={item.exercise}
              remainingSeconds={remaining[i] ?? 0}
              isRunning={runningIndex === i}
              isCompleted={completed[i] ?? false}
              swapDisabled={alternatives[i] === null}
              onPlayPause={() => handlePlayPause(i)}
              onToggleComplete={() => handleToggleComplete(i)}
              onSwap={() => handleSwap(i)}
            />
          ))}

          <Pressable style={styles.finishBtn} onPress={end}>
            <ThemedText style={styles.finishBtnText}>{t('workout.warmup.finish')}</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 15 },
  goLinkText: { fontSize: 13, textDecorationLine: 'underline' },

  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },

  finishBtn: {
    backgroundColor: GREEN, borderRadius: Spacing.three,
    paddingVertical: Spacing.three, alignItems: 'center',
    marginTop: Spacing.three,
  },
  finishBtnText: { color: '#04261A', fontSize: 16, fontWeight: '700' },
});
