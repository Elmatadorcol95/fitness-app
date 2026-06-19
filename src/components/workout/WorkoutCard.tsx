import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workout.store';
import { useProfileStore } from '@/store/profile.store';
import { getExerciseName } from '@/lib/exercises';
import type { PlannedExercise, DayType } from '@/lib/plan-generator';

const GREEN = '#3FBF7F';
const MUTED = '#9DA89F';

const DAY_ICON: Record<DayType, string> = {
  push:      'arrow-up-circle-outline',
  pull:      'arrow-down-circle-outline',
  legs:      'walk-outline',
  upper:     'body-outline',
  lower:     'footsteps-outline',
  full_body: 'infinite-outline',
};

function ExRow({ ex, lang }: { ex: PlannedExercise; lang: string }) {
  return (
    <View style={row.wrap}>
      <View style={[row.dot, ex.isCompound ? row.dotGreen : row.dotMuted]} />
      <ThemedText style={row.name} numberOfLines={1}>
        {getExerciseName(ex.exerciseId, lang)}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={row.detail}>
        {ex.sets}×{ex.reps}
      </ThemedText>
    </View>
  );
}

export function WorkoutCard() {
  const { t, i18n } = useTranslation();
  const { profile }  = useProfileStore();
  const {
    currentPlan, isGenerating, isLoaded,
    loadCurrentPlan, generateAndSavePlan,
  } = useWorkoutStore();
  const lang = i18n.language;

  useEffect(() => { loadCurrentPlan(); }, []);

  if (!isLoaded) {
    return (
      <ThemedView type="backgroundElement" style={[s.card, s.center]}>
        <ActivityIndicator color={GREEN} />
      </ThemedView>
    );
  }

  if (!currentPlan) {
    return (
      <ThemedView type="backgroundElement" style={[s.card, s.center]}>
        <Ionicons name="barbell-outline" size={44} color={MUTED} />
        <ThemedText type="defaultSemiBold" style={s.generateTitle}>
          {t('workout.noplan.title')}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={s.generateSub}>
          {t('workout.noplan.subtitle')}
        </ThemedText>
        <Pressable
          onPress={() => profile && generateAndSavePlan(profile)}
          disabled={isGenerating}
          style={s.primaryBtn}
        >
          {isGenerating ? (
            <ActivityIndicator color="#04261A" />
          ) : (
            <>
              <Ionicons name="flash" size={18} color="#04261A" />
              <ThemedText style={s.primaryBtnText}>{t('workout.noplan.button')}</ThemedText>
            </>
          )}
        </Pressable>
      </ThemedView>
    );
  }

  const idx    = currentPlan.activeDayIndex % currentPlan.days.length;
  const today  = currentPlan.days[idx];
  const dayNum = idx + 1;
  const total  = currentPlan.days.length;

  return (
    <ThemedView type="backgroundElement" style={s.card}>
      {/* Cabecera */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Ionicons
            name={(DAY_ICON[today.dayType] ?? 'barbell-outline') as any}
            size={20}
            color={GREEN}
          />
          <ThemedText type="defaultSemiBold" style={s.dayName}>
            {t(`workout.days.${today.dayType}`)}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={s.dayCounter}>
          {t('workout.planDay', { current: dayNum, total })}
        </ThemedText>
      </View>

      {/* Lista de ejercicios */}
      <View style={s.exList}>
        {today.exercises.map((ex, i) => (
          <ExRow key={`${ex.exerciseId}-${i}`} ex={ex} lang={lang} />
        ))}
      </View>

      {/* Botón iniciar (la pantalla de sesión llega en la siguiente sub-fase) */}
      <Pressable style={s.primaryBtn}>
        <Ionicons name="play-circle-outline" size={20} color="#04261A" />
        <ThemedText style={s.primaryBtnText}>{t('workout.startWorkout')}</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const s = StyleSheet.create({
  card:    { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  center:  { alignItems: 'center', paddingVertical: Spacing.five },
  header:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayName:    { fontSize: 15, color: GREEN },
  dayCounter: { fontSize: 12 },
  exList:     { gap: 6 },
  generateTitle: { fontSize: 16, textAlign: 'center', marginTop: Spacing.two },
  generateSub:   { fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    backgroundColor: GREEN,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 10, paddingVertical: Spacing.two + 2, marginTop: Spacing.one,
    minHeight: 44,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#04261A' },
});

const row = StyleSheet.create({
  wrap:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:      { width: 6, height: 6, borderRadius: 3 },
  dotGreen: { backgroundColor: GREEN, opacity: 0.85 },
  dotMuted: { backgroundColor: MUTED, opacity: 0.6 },
  name:     { flex: 1, fontSize: 14 },
  detail:   { fontSize: 13 },
});
