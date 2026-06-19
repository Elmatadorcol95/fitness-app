import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamificationStore } from '@/store/gamification.store';
import { useProfileStore } from '@/store/profile.store';

const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const GREEN = '#3FBF7F';

function flameProps(streak: number): { size: number; color: string; name: 'flame' | 'flame-outline' } {
  if (streak === 0)  return { size: 22, color: MUTED,  name: 'flame-outline' };
  if (streak < 7)   return { size: 26, color: AMBER,  name: 'flame' };
  if (streak < 30)  return { size: 30, color: AMBER,  name: 'flame' };
  return              { size: 34, color: '#FF8C00', name: 'flame' };
}

export function StreakWidget() {
  const { t } = useTranslation();
  const { streak, totalWorkouts, loadGamification } = useGamificationStore();
  const isDbReady = useProfileStore(s => s.isDbReady);

  useEffect(() => {
    if (!isDbReady) return;
    loadGamification();
  }, [isDbReady]);

  const flame = flameProps(streak);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Racha */}
      <View style={styles.block}>
        <View style={styles.row}>
          <Ionicons name={flame.name} size={flame.size} color={flame.color} />
          <ThemedText style={[styles.count, { color: streak > 0 ? flame.color : MUTED }]}>
            {streak}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.label}>
          {streak === 0 ? t('gamification.streak.noStreak') : t('gamification.streak.days')}
        </ThemedText>
      </View>

      <View style={styles.divider} />

      {/* Total entrenos */}
      <View style={styles.block}>
        <View style={styles.row}>
          <Ionicons name="barbell-outline" size={22} color={totalWorkouts > 0 ? GREEN : MUTED} />
          <ThemedText style={[styles.count, { color: totalWorkouts > 0 ? GREEN : MUTED }]}>
            {totalWorkouts}
          </ThemedText>
        </View>
        <ThemedText themeColor="textSecondary" style={styles.label}>
          {t('gamification.streak.workouts')}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
  },
  block: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  count: {
    fontSize: 28,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    textAlign: 'center',
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: '#9DA89F',
    opacity: 0.2,
    marginHorizontal: Spacing.two,
  },
});
