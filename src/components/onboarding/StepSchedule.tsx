import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';

const DAYS = [2, 3, 4, 5, 6];
const MINUTES = [30, 45, 60, 90];

export function StepSchedule() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.schedule.title')}
      </ThemedText>

      <ThemedText style={styles.label}>{t('onboarding.schedule.daysPerWeek')}</ThemedText>
      <View style={styles.chips}>
        {DAYS.map((d) => (
          <ThemedView
            key={d}
            type={draft.daysPerWeek === d ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.chip}
            onTouchEnd={() => updateDraft({ daysPerWeek: d })}
          >
            <ThemedText type={draft.daysPerWeek === d ? 'defaultSemiBold' : 'default'} style={styles.chipText}>
              {d}
            </ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedText style={[styles.label, styles.labelGap]}>{t('onboarding.schedule.minutesPerSession')}</ThemedText>
      <View style={styles.chips}>
        {MINUTES.map((m) => (
          <ThemedView
            key={m}
            type={draft.minutesPerSession === m ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.chip}
            onTouchEnd={() => updateDraft({ minutesPerSession: m })}
          >
            <ThemedText type={draft.minutesPerSession === m ? 'defaultSemiBold' : 'default'} style={styles.chipText}>
              {m}'
            </ThemedText>
          </ThemedView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  label: { fontSize: 15 },
  labelGap: { marginTop: Spacing.three },
  chips: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  chip: {
    flex: 1,
    minWidth: 56,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  chipText: { fontSize: 18 },
});
