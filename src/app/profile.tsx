import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { cmToFtIn, kgToLb } from '@/lib/units';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <ThemedText style={sectionStyles.title}>{title}</ThemedText>
      <ThemedView type="backgroundElement" style={sectionStyles.card}>
        {children}
      </ThemedView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.wrap}>
      <ThemedText themeColor="textSecondary" style={rowStyles.label}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={rowStyles.value}>{value}</ThemedText>
    </View>
  );
}

const goalLabel: Record<string, string> = {
  strength: '🏋️ Fuerza',
  hypertrophy: '💪 Hipertrofia',
  fat_loss: '🔥 Pérdida de grasa',
};

const locationLabel: Record<string, string> = {
  home: '🏠 En casa',
  gym: '🏋️ Gimnasio',
  both: '🏠🏋️ Ambos',
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile } = useProfileStore();

  if (!profile) return null;

  const isImperial = profile.units === 'imperial';

  const heightStr = profile.heightCm
    ? isImperial
      ? (() => { const { ft, inches } = cmToFtIn(profile.heightCm!); return `${ft}'${inches}"`; })()
      : `${Math.round(profile.heightCm)} cm`
    : '—';

  const weightStr = profile.weightKg
    ? isImperial ? `${kgToLb(profile.weightKg)} lb` : `${profile.weightKg} kg`
    : '—';

  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment ?? '[]'); } catch { return []; }
  })();

  const goalStr = goalLabel[profile.goalPrimary] ?? profile.goalPrimary;
  const fullGoalStr = profile.goalSecondary
    ? `${goalStr}  +  ${goalLabel[profile.goalSecondary] ?? profile.goalSecondary}`
    : goalStr;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Avatar e identificador ── */}
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {profile.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText type="subtitle">{profile.name}</ThemedText>
          </View>

          {/* ── Objetivo ── */}
          <Section title={t('tabs.profile.goalSection')}>
            <Row label={t('onboarding.summary.goal')} value={fullGoalStr} />
          </Section>

          {/* ── Entrenamiento ── */}
          <Section title={t('tabs.profile.trainingSection')}>
            <Row label={t('onboarding.schedule.daysPerWeek')} value={`${profile.daysPerWeek} ${t('onboarding.schedule.days')}`} />
            <Row label={t('onboarding.schedule.minutesPerSession')} value={`${profile.minutesPerSession} ${t('onboarding.schedule.min')}`} />
            <Row label={t('onboarding.summary.location')} value={locationLabel[profile.location] ?? profile.location} />
          </Section>

          {/* ── Datos físicos ── */}
          <Section title={t('tabs.profile.physicalSection')}>
            {profile.birthYear ? <Row label={t('onboarding.physical.birthYear')} value={String(profile.birthYear)} /> : null}
            <Row label={t('onboarding.physical.height')} value={heightStr} />
            <Row label={t('onboarding.physical.weight')} value={weightStr} />
            <Row label={t('onboarding.summary.units')} value={isImperial ? 'Imperial (lb, ft)' : 'Métrico (kg, cm)'} />
          </Section>

          {/* ── Equipamiento ── */}
          {equipment.length > 0 && (
            <Section title={t('tabs.profile.equipmentSection')}>
              <View style={styles.chips}>
                {equipment.map((e) => (
                  <ThemedView key={e} type="backgroundSelected" style={styles.chip}>
                    <ThemedText style={styles.chipText}>
                      {t(`onboarding.location.equipmentItems.${e}`, { defaultValue: e })}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            </Section>
          )}

          {/* ── Lesiones ── */}
          {profile.injuries ? (
            <Section title={t('onboarding.injuries.title')}>
              <ThemedText style={styles.injuriesText}>{profile.injuries}</ThemedText>
            </Section>
          ) : null}

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four, marginBottom: Spacing.two },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#3FBF7F',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#04261A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  chip: { borderRadius: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  chipText: { fontSize: 13 },
  injuriesText: { fontSize: 14, lineHeight: 20 },
});

const sectionStyles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  title: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, paddingHorizontal: 4 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
});

const rowStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 14, textAlign: 'right', flex: 1 },
});
