import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Spacing } from '@/constants/theme';

function greeting(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Buenos días, ${name} 🌅`;
  if (h < 19) return `Buenas tardes, ${name} ☀️`;
  return `Buenas noches, ${name} 🌙`;
}

function todayDate() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

export default function TodayScreen() {
  const { t } = useTranslation();
  const { profile } = useProfileStore();
  const theme = useTheme();

  if (!profile) return null;

  const goalLabel: Record<string, string> = {
    strength: '🏋️ Fuerza',
    hypertrophy: '💪 Hipertrofia',
    fat_loss: '🔥 Pérdida de grasa',
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Cabecera ── */}
          <ThemedText type="subtitle" style={styles.greeting}>
            {greeting(profile.name)}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.date}>
            {todayDate()}
          </ThemedText>

          {/* ── Tarjeta de objetivo ── */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {t('tabs.today.goal')}
            </ThemedText>
            <ThemedText style={styles.cardValue}>
              {goalLabel[profile.goalPrimary] ?? profile.goalPrimary}
              {profile.goalSecondary
                ? `  +  ${goalLabel[profile.goalSecondary] ?? profile.goalSecondary}`
                : ''}
            </ThemedText>
          </ThemedView>

          {/* ── Tarjeta de plan ── */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {t('tabs.today.plan')}
            </ThemedText>
            <View style={styles.statRow}>
              <StatBox label={t('tabs.today.daysWeek')} value={`${profile.daysPerWeek}`} />
              <StatBox label={t('tabs.today.minSession')} value={`${profile.minutesPerSession}'`} />
              <StatBox
                label={t('tabs.today.location')}
                value={
                  profile.location === 'gym' ? '🏋️'
                  : profile.location === 'home' ? '🏠' : '🏠🏋️'
                }
              />
            </View>
          </ThemedView>

          {/* ── Placeholder entrenamiento ── */}
          <ThemedView type="backgroundElement" style={[styles.card, styles.comingSoon]}>
            <ThemedText style={styles.comingSoonIcon}>⚒️</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ textAlign: 'center' }}>
              {t('tabs.today.workoutComingSoon')}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.comingSoonSub}>
              {t('tabs.today.workoutComingSoonSub')}
            </ThemedText>
          </ThemedView>

          {/* ── Descargo ── */}
          <ThemedText themeColor="textSecondary" style={styles.disclaimer}>
            {t('disclaimer')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.statBox}>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.statLabel}>{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  greeting: { marginTop: Spacing.four, fontSize: 26 },
  date: { fontSize: 14, textTransform: 'capitalize', marginTop: -Spacing.two },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  cardValue: { fontSize: 17 },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  statBox: { flex: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  comingSoon: { alignItems: 'center', paddingVertical: Spacing.five },
  comingSoonIcon: { fontSize: 40 },
  comingSoonSub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: Spacing.two },
});
