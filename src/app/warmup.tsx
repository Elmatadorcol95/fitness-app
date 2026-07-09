import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useWarmupStore } from '@/store/warmup.store';
import { getExerciseName, type ExerciseCategory } from '@/lib/exercises';
import { getWarmupAlternative } from '@/lib/warmupGenerator';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const BLUE  = '#3C87F7';

// Los ítems de calentamiento solo son 'cardio' (apertura) o 'mobility'
// (relleno) — ver generateWarmup(). Mismos colores/iconos que CAT_ICONS/
// CAT_COLORS en session.tsx para esas dos categorías.
const CAT_ICONS: Partial<Record<ExerciseCategory, string>> = {
  cardio: 'bicycle-outline',
  mobility: 'accessibility-outline',
};
const CAT_COLORS: Partial<Record<ExerciseCategory, string>> = {
  cardio: AMBER,
  mobility: BLUE,
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatTimer(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
function normLang(l: string): 'es' | 'en' | 'fr' {
  return l.startsWith('es') ? 'es' : l.startsWith('fr') ? 'fr' : 'en';
}

// Fase 1b Paso 3 — pantalla de foco real del calentamiento. Recorre los
// WarmupItem del store con un cronómetro por ítem (mismo patrón visual/
// interacción que el temporizador de descanso de session.tsx).
export default function WarmupScreen() {
  const { t, i18n } = useTranslation();
  const lang = normLang(i18n.language);

  const items       = useWarmupStore(s => s.items);
  const currentIndex = useWarmupStore(s => s.currentIndex);
  const dayType      = useWarmupStore(s => s.dayType);
  const equipment    = useWarmupStore(s => s.equipment);
  const isGym        = useWarmupStore(s => s.isGym);
  const advance        = useWarmupStore(s => s.advance);
  const end             = useWarmupStore(s => s.end);
  const replaceCurrent = useWarmupStore(s => s.replaceCurrent);

  const currentItem = items[currentIndex];

  const [timerSeconds, setTimerSeconds] = useState(currentItem?.durationSeconds ?? 0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Reinicia el cronómetro al avanzar de ítem o al intercambiar el ejercicio
  // actual (currentItem.exercise.id cambia aunque currentIndex no lo haga).
  useEffect(() => {
    setTimerSeconds(currentItem?.durationSeconds ?? 0);
    setTimerRunning(false);
  }, [currentIndex, currentItem?.exercise.id, currentItem?.durationSeconds]);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setTimerSeconds(s => {
        if (s <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  if (!currentItem) return null;

  const isLast   = currentIndex >= items.length - 1;
  const exName   = getExerciseName(currentItem.exercise.id, lang);
  const category = currentItem.exercise.category as 'cardio' | 'mobility';
  const catColor = CAT_COLORS[category] ?? GREEN;
  const catIcon  = (CAT_ICONS[category] ?? 'fitness-outline') as any;
  const catLabel = category === 'cardio'
    ? t('workout.warmup.categoryCardio')
    : t('workout.warmup.categoryMobility');

  const excludeIds    = items.map(i => i.exercise.id);
  const alternative   = dayType
    ? getWarmupAlternative(currentItem.exercise.id, dayType, equipment, isGym, excludeIds)
    : null;
  const hasAlternative = alternative !== null;

  function handleSwap() {
    if (alternative) replaceCurrent(alternative);
  }

  function handleNext() {
    if (isLast) end(); else advance();
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText themeColor="textSecondary" style={styles.progress}>
            {t('workout.warmup.progress', { current: currentIndex + 1, total: items.length })}
          </ThemedText>
        </View>

        <View style={styles.content}>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
            <Ionicons name={catIcon} size={14} color={catColor} />
            <ThemedText style={[styles.catBadgeText, { color: catColor }]}>{catLabel}</ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.title}>{exName}</ThemedText>

          {/* Cronómetro — mismo patrón visual/interacción que el descanso de session.tsx */}
          <View style={styles.timerBox}>
            <Pressable
              onPress={() => setTimerSeconds(s => Math.max(0, s - 15))}
              style={styles.timerAdjBtn} hitSlop={8}
            >
              <ThemedText style={styles.timerAdjText}>−15s</ThemedText>
            </Pressable>
            <View style={styles.timerCenter}>
              <Ionicons name="hourglass-outline" size={16} color={AMBER} />
              <ThemedText style={styles.timerValue}>{formatTimer(timerSeconds)}</ThemedText>
            </View>
            <Pressable
              onPress={() => setTimerSeconds(s => s + 15)}
              style={styles.timerAdjBtn} hitSlop={8}
            >
              <ThemedText style={styles.timerAdjText}>+15s</ThemedText>
            </Pressable>
            <Pressable onPress={() => setTimerRunning(r => !r)} style={styles.timerToggleBtn} hitSlop={8}>
              <Ionicons name={timerRunning ? 'pause-circle' : 'play-circle'} size={30} color={GREEN} />
            </Pressable>
          </View>

          <Pressable
            style={[styles.swapBtn, !hasAlternative && styles.swapBtnDisabled]}
            onPress={handleSwap}
            disabled={!hasAlternative}
          >
            <Ionicons name="swap-horizontal" size={16} color={hasAlternative ? GREEN : MUTED} />
            <ThemedText style={[styles.swapBtnText, { color: hasAlternative ? GREEN : MUTED }]}>
              {t('workout.warmup.swap')}
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.nextBtn} onPress={handleNext}>
            <ThemedText style={styles.nextBtnText}>
              {isLast ? t('workout.warmup.finish') : t('workout.warmup.next')}
            </ThemedText>
          </Pressable>
          <Pressable style={styles.skipLink} onPress={end} hitSlop={8}>
            <ThemedText themeColor="textSecondary" style={styles.skipLinkText}>
              {t('workout.warmup.goToWorkout')}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between' },

  header: { alignItems: 'center', paddingTop: Spacing.three },
  progress: { fontSize: 14, fontWeight: '600' },

  content: { alignItems: 'center', gap: Spacing.four, paddingHorizontal: Spacing.four },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.two, paddingVertical: 6,
    borderRadius: Spacing.four, borderWidth: 1,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700' },
  title: { textAlign: 'center' },

  timerBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    gap: Spacing.two, width: '100%',
    borderWidth: 1, borderColor: AMBER + '44',
  },
  timerCenter:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timerValue:   { fontSize: 22, fontWeight: '700', color: AMBER, letterSpacing: 2 },
  timerAdjBtn:  { paddingHorizontal: Spacing.two, paddingVertical: 4 },
  timerAdjText: { fontSize: 12, color: AMBER, fontWeight: '600' },
  timerToggleBtn: { paddingLeft: Spacing.one },

  swapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    borderRadius: Spacing.two, borderWidth: 1, borderColor: GREEN + '55',
  },
  swapBtnDisabled: { borderColor: MUTED + '33' },
  swapBtnText: { fontSize: 14, fontWeight: '600' },

  footer: { alignItems: 'center', paddingBottom: Spacing.four, paddingHorizontal: Spacing.four, gap: Spacing.three },
  nextBtn: {
    backgroundColor: GREEN, borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    minWidth: 240, alignItems: 'center',
  },
  nextBtnText: { color: '#04261A', fontSize: 16, fontWeight: '700' },
  skipLink: { paddingVertical: Spacing.one },
  skipLinkText: { fontSize: 13, textDecorationLine: 'underline' },
});
