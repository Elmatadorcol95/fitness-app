import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Location } from '@/store/profile.store';
import { cmToFtIn, kgToLb } from '@/lib/units';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary" style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

const locationLabels: Record<Location, string> = {
  home: 'En casa',
  gym: 'Gimnasio',
  both: 'Ambos',
};

export function StepSummary() {
  const { t } = useTranslation();
  const { draft } = useProfileStore();
  const isImperial = draft.units === 'imperial';

  const heightDisplay = draft.heightCm
    ? isImperial
      ? (() => { const { ft, inches } = cmToFtIn(draft.heightCm!); return `${ft}'${inches}"`; })()
      : `${Math.round(draft.heightCm)} cm`
    : '—';

  const weightDisplay = draft.weightKg
    ? isImperial ? `${kgToLb(draft.weightKg)} lb` : `${draft.weightKg} kg`
    : '—';

  const goalDisplay = () => {
    const [primary, secondary] = draft.goals;
    if (!primary) return '—';
    const pLabel = t(`onboarding.goal.${primary}`);
    if (!secondary) return pLabel;
    return `${pLabel}  +  ${t(`onboarding.goal.${secondary}`)}`;
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.summary.title')}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <Row label={t('onboarding.summary.name')} value={draft.name || '—'} />
        <Row label={t('onboarding.summary.goal')} value={goalDisplay()} />
        <Row
          label={t('onboarding.summary.schedule')}
          value={`${draft.daysPerWeek} días / ${draft.minutesPerSession} min`}
        />
        <Row label={t('onboarding.summary.location')} value={locationLabels[draft.location]} />
        <Row label={t('onboarding.physical.height')} value={heightDisplay} />
        <Row label={t('onboarding.physical.weight')} value={weightDisplay} />
        <Row
          label={t('onboarding.summary.units')}
          value={isImperial ? 'Imperial (lb, ft)' : 'Métrico (kg, cm)'}
        />
        {draft.injuries ? (
          <Row label={t('onboarding.injuries.title')} value={draft.injuries} />
        ) : null}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.disclaimer}>
        <ThemedText themeColor="textSecondary" style={styles.disclaimerText}>
          {t('onboarding.summary.disclaimer')}
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  title: { textAlign: 'center', marginBottom: Spacing.three },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.two },
  rowLabel: { fontSize: 14, flex: 1 },
  rowValue: { fontSize: 14, flex: 1, textAlign: 'right' },
  disclaimer: { borderRadius: Spacing.two, padding: Spacing.three, marginTop: Spacing.three, marginBottom: Spacing.five },
  disclaimerText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
