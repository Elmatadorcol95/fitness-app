import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useWorkoutStore } from '@/store/workout.store';
import { Spacing } from '@/constants/theme';

const GREEN  = '#3FBF7F';
const MUTED  = '#9DA89F';

const DAY_ICONS: Record<string, string> = {
  push:      'arrow-up-circle-outline',
  pull:      'arrow-down-circle-outline',
  legs:      'walk-outline',
  upper:     'body-outline',
  lower:     'footsteps-outline',
  full_body: 'infinite-outline',
};

export function TodayBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const { currentPlan, isLoaded } = useWorkoutStore();

  const navigate = () => router.navigate('/training');

  if (!isLoaded) {
    return (
      <ThemedView type="backgroundElement" style={styles.card}>
        <ActivityIndicator size="small" color={GREEN} />
      </ThemedView>
    );
  }

  if (!currentPlan) {
    return (
      <Pressable onPress={navigate}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <Ionicons name="barbell-outline" size={20} color={MUTED} />
          <View style={styles.texts}>
            <ThemedText style={styles.prefix}>{t('workout.todayBanner.prefix')}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.dayName}>
              {t('workout.noplan.button')}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={GREEN} />
        </ThemedView>
      </Pressable>
    );
  }

  const activeIdx = currentPlan.activeDayIndex % currentPlan.days.length;
  const today     = currentPlan.days[activeIdx];

  return (
    <Pressable onPress={navigate} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <Ionicons
          name={(DAY_ICONS[today.dayType] ?? 'barbell-outline') as any}
          size={22}
          color={GREEN}
        />
        <View style={styles.texts}>
          <ThemedText themeColor="textSecondary" style={styles.prefix}>
            {t('workout.todayBanner.prefix')}
          </ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.dayName}>
            {t(`workout.days.${today.dayType}`)}
            {' · '}
            {t('workout.planDay', { current: activeIdx + 1, total: currentPlan.days.length })}
          </ThemedText>
        </View>
        <ThemedText style={styles.viewBtn}>{t('workout.todayBanner.view')}</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: GREEN,
  },
  pressed: { opacity: 0.75 },
  texts: { flex: 1, gap: 2 },
  prefix: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.7 },
  dayName: { fontSize: 15 },
  viewBtn: { fontSize: 14, fontWeight: '600', color: GREEN },
});
