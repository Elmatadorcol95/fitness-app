import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { MoonIcon, SunIcon, SunriseIcon } from '@/components/icons/TimeIcons';
import { StreakWidget } from '@/components/gamification/StreakWidget';
import { TodayBanner } from '@/components/workout/TodayBanner';
import { RecapModal } from '@/components/recap/RecapModal';

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

const AMBER      = '#F2B450';
const GREEN      = '#3FBF7F';
const MOON_COLOR = '#F1F4F1';
const ICON_SIZE  = 30;

const GOAL_DEFS: Record<string, { iconName: string; color: string; labelKey: string }> = {
  strength:    { iconName: 'barbell-outline', color: GREEN, labelKey: 'onboarding.goal.strength' },
  hypertrophy: { iconName: 'body-outline',    color: GREEN, labelKey: 'onboarding.goal.hypertrophy' },
  fat_loss:    { iconName: 'flame-outline',   color: AMBER, labelKey: 'onboarding.goal.fat_loss' },
};

const LOCATION_ICON: Record<string, string> = {
  gym:  'barbell-outline',
  home: 'home-outline',
  both: 'repeat-outline',
};

function TimeIcon({ hour }: { hour: number }) {
  if (hour < 12) return <SunriseIcon size={ICON_SIZE} color={AMBER} />;
  if (hour < 19) return <SunIcon     size={ICON_SIZE} color={AMBER} />;
  return               <MoonIcon    size={ICON_SIZE} color={MOON_COLOR} />;
}

function greetingText(name: string, hour: number) {
  if (hour < 12) return `Buenos días, ${name}`;
  if (hour < 19) return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
}

function todayDate() {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function GoalChip({ goal }: { goal: string }) {
  const { t } = useTranslation();
  const def = GOAL_DEFS[goal];
  if (!def) return <ThemedText style={styles.goalChipText}>{goal}</ThemedText>;
  return (
    <View style={styles.goalChip}>
      <Ionicons name={def.iconName as any} size={16} color={def.color} />
      <ThemedText style={[styles.goalChipText, { color: def.color }]}>
        {t(def.labelKey)}
      </ThemedText>
    </View>
  );
}

function StatBox({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.statBox}>
      {typeof value === 'string'
        ? <ThemedText style={styles.statValue}>{value}</ThemedText>
        : value
      }
      <ThemedText themeColor="textSecondary" style={styles.statLabel}>{label}</ThemedText>
    </ThemedView>
  );
}

export default function TodayScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useProfileStore();
  const theme = useTheme();
  const [recapVisible, setRecapVisible] = useState(false);

  if (!profile) return null;

  const hour = new Date().getHours();
  const currentMonth = new Date().toLocaleDateString(i18n.language, { month: 'long' });
  const quotes = t('motd.quotes', { returnObjects: true }) as string[];
  const dailyQuote = Array.isArray(quotes) && quotes.length > 0
    ? quotes[getDayOfYear() % quotes.length]
    : '';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Cabecera ── */}
          <View style={styles.greetingRow}>
            <TimeIcon hour={hour} />
            <ThemedText type="subtitle" style={styles.greeting}>
              {greetingText(profile.name, hour)}
            </ThemedText>
          </View>
          <ThemedText themeColor="textSecondary" style={styles.date}>
            {todayDate()}
          </ThemedText>

          {/* ── Racha ── */}
          <StreakWidget />

          {/* ── Tarjeta de objetivo ── */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {t('tabs.today.goal')}
            </ThemedText>
            <View style={styles.goalRow}>
              <GoalChip goal={profile.goalPrimary} />
              {profile.goalSecondary && (
                <>
                  <ThemedText themeColor="textSecondary" style={styles.goalSep}>+</ThemedText>
                  <GoalChip goal={profile.goalSecondary} />
                </>
              )}
            </View>
          </ThemedView>

          {/* ── Tarjeta de plan ── */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {t('tabs.today.plan')}
            </ThemedText>
            <View style={styles.statRow}>
              <StatBox label={t('tabs.today.daysWeek')}   value={`${profile.daysPerWeek}`} />
              <StatBox label={t('tabs.today.minSession')} value={`${profile.minutesPerSession}'`} />
              <StatBox
                label={t('tabs.today.location')}
                value={
                  <Ionicons
                    name={(LOCATION_ICON[profile.location] ?? 'location-outline') as any}
                    size={26}
                    color={theme.text}
                  />
                }
              />
            </View>
          </ThemedView>

          {/* ── Entrenamiento de hoy ── */}
          <TodayBanner />

          {/* ── Banner recap mensual ── */}
          <Pressable onPress={() => setRecapVisible(true)} style={styles.recapBanner}>
            <View style={styles.recapBannerLeft}>
              <Ionicons name="hammer-outline" size={18} color={AMBER} />
              <ThemedText style={styles.recapBannerText}>
                {t('recap.openRecap', { month: currentMonth })}
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={AMBER} />
          </Pressable>

          {/* ── Frase del día ── */}
          {dailyQuote ? (
            <ThemedView type="backgroundElement" style={styles.motdCard}>
              <View style={styles.motdHeader}>
                <Ionicons name="flame-outline" size={16} color={AMBER} />
                <ThemedText style={styles.motdTitle}>{t('motd.title')}</ThemedText>
              </View>
              <ThemedText style={styles.motdQuote}>{dailyQuote}</ThemedText>
            </ThemedView>
          ) : null}

          {/* ── Descargo ── */}
          <ThemedText themeColor="textSecondary" style={styles.disclaimer}>
            {t('disclaimer')}
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      <RecapModal visible={recapVisible} onClose={() => setRecapVisible(false)} />
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
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  greeting: { fontSize: 26, flexShrink: 1 },
  date: { fontSize: 14, textTransform: 'capitalize', marginTop: -Spacing.one },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cardTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  goalRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.two },
  goalChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalChipText: { fontSize: 15, fontWeight: '500' },
  goalSep: { fontSize: 16 },
  statRow: { flexDirection: 'row', gap: Spacing.two },
  statBox: { flex: 1, borderRadius: Spacing.two, padding: Spacing.two, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  recapBanner: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    backgroundColor: '#1C231F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F2B45022',
  },
  recapBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  recapBannerText: { fontSize: 14, fontWeight: '500', color: AMBER, textTransform: 'capitalize' },
  motdCard: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two, borderLeftWidth: 3, borderLeftColor: AMBER },
  motdHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  motdTitle: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: AMBER, opacity: 0.85 },
  motdQuote: { fontSize: 15, fontStyle: 'italic', lineHeight: 22 },
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: Spacing.two },
});
