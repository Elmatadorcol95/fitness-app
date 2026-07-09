import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getExerciseName, type Exercise, type ExerciseCategory } from '@/lib/exercises';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const BLUE  = '#3C87F7';

// Los ítems de calentamiento/estiramiento solo usan 'cardio' o 'mobility' —
// mismos colores/iconos que el resto de la app para esas dos categorías
// (ver CAT_ICONS/CAT_COLORS en session.tsx y ExerciseCard.tsx).
const CAT_ICONS: Partial<Record<ExerciseCategory, string>> = {
  cardio: 'bicycle-outline',
  mobility: 'accessibility-outline',
};
const CAT_COLORS: Partial<Record<ExerciseCategory, string>> = {
  cardio: AMBER,
  mobility: BLUE,
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatSeconds(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
function normLang(l: string): 'es' | 'en' | 'fr' {
  return l.startsWith('es') ? 'es' : l.startsWith('fr') ? 'fr' : 'en';
}

export interface TimedChecklistItemProps {
  exercise: Exercise;
  remainingSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  swapDisabled: boolean;
  onPlayPause: () => void;
  onToggleComplete: () => void;
  onSwap: () => void;
}

// Tarjeta compacta pensada para lista (checklist), no para foco único —
// deliberadamente distinta de ExerciseCard (que es más grande, con imagen
// placeholder de 72×72 y datos de series/reps/peso). Reutilizable tal cual
// por la Fase 2 (estiramiento).
export function TimedChecklistItem({
  exercise, remainingSeconds, isRunning, isCompleted, swapDisabled,
  onPlayPause, onToggleComplete, onSwap,
}: TimedChecklistItemProps) {
  const { t, i18n } = useTranslation();
  const lang = normLang(i18n.language);

  const catColor = CAT_COLORS[exercise.category] ?? GREEN;
  const catIcon  = (CAT_ICONS[exercise.category] ?? 'fitness-outline') as any;
  const catLabel = exercise.category === 'cardio'
    ? t('workout.warmup.categoryCardio')
    : t('workout.warmup.categoryMobility');
  const name = getExerciseName(exercise.id, lang);

  return (
    <ThemedView type="backgroundElement" style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: catColor + '22' }]}>
          <Ionicons name={catIcon} size={18} color={catColor} />
        </View>

        <View style={styles.nameCol}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
            {name}
          </ThemedText>
          <View style={styles.badgeRow}>
            <View style={[styles.catBadge, { backgroundColor: catColor + '18', borderColor: catColor + '55' }]}>
              <ThemedText style={[styles.catBadgeText, { color: catColor }]}>{catLabel}</ThemedText>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="time-outline" size={11} color={MUTED} />
              <ThemedText themeColor="textSecondary" style={styles.durationText}>
                {formatSeconds(remainingSeconds)}
              </ThemedText>
            </View>
          </View>
        </View>

        <Pressable onPress={onToggleComplete} hitSlop={10}>
          <Ionicons
            name={isCompleted ? 'checkmark-circle' : 'ellipse-outline'}
            size={26}
            color={isCompleted ? GREEN : MUTED}
          />
        </Pressable>
      </View>

      <View style={styles.bottomRow}>
        <Pressable onPress={onPlayPause} hitSlop={8} style={styles.playBtn}>
          <Ionicons name={isRunning ? 'pause-circle' : 'play-circle'} size={26} color={GREEN} />
        </Pressable>

        <ThemedText style={styles.timerText}>{formatSeconds(remainingSeconds)}</ThemedText>

        <Pressable
          onPress={onSwap}
          disabled={swapDisabled}
          style={[styles.swapBtn, swapDisabled && styles.swapBtnDisabled]}
          hitSlop={8}
        >
          <Ionicons name="swap-horizontal" size={16} color={swapDisabled ? MUTED : GREEN} />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  cardCompleted: { opacity: 0.6 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  nameCol: { flex: 1, gap: 4 },
  name: { fontSize: 14, lineHeight: 18 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catBadge: {
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: Spacing.three, borderWidth: 1,
  },
  catBadgeText: { fontSize: 10, fontWeight: '700' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  durationText: { fontSize: 11 },

  bottomRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: MUTED + '33',
    paddingTop: Spacing.two,
  },
  playBtn: {},
  timerText: { flex: 1, fontSize: 16, fontWeight: '700', color: AMBER, letterSpacing: 1 },
  swapBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.two, paddingVertical: 4,
    borderRadius: Spacing.one, borderWidth: 1, borderColor: GREEN + '55',
  },
  swapBtnDisabled: { borderColor: MUTED + '33' },
});
