import { StyleSheet, View, useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';

const DAYS    = [1, 2, 3, 4, 5, 6, 7];
const MINUTES = [15, 30, 45, 60, 75, 90, 105, 120];

export function StepSchedule() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const { draft, updateDraft } = useProfileStore();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.schedule.title')}
      </ThemedText>

      <ThemedText style={styles.label}>{t('onboarding.schedule.daysPerWeek')}</ThemedText>
      <ThemedView type="backgroundElement" style={styles.pickerWrap}>
        <Picker
          selectedValue={draft.daysPerWeek}
          onValueChange={(v) => updateDraft({ daysPerWeek: v })}
          style={[styles.picker, { color: colors.text }]}
          dropdownIconColor={colors.textSecondary}
          itemStyle={{ color: colors.text }}
        >
          {DAYS.map((d) => (
            <Picker.Item
              key={d}
              label={`${d} ${d === 1 ? t('onboarding.schedule.day') : t('onboarding.schedule.days')}`}
              value={d}
              color={colors.text}
            />
          ))}
        </Picker>
      </ThemedView>

      <ThemedText style={[styles.label, styles.labelGap]}>
        {t('onboarding.schedule.minutesPerSession')}
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.pickerWrap}>
        <Picker
          selectedValue={draft.minutesPerSession}
          onValueChange={(v) => updateDraft({ minutesPerSession: v })}
          style={[styles.picker, { color: colors.text }]}
          dropdownIconColor={colors.textSecondary}
          itemStyle={{ color: colors.text }}
        >
          {MINUTES.map((m) => (
            <Picker.Item
              key={m}
              label={`${m} ${t('onboarding.schedule.min')}`}
              value={m}
              color={colors.text}
            />
          ))}
        </Picker>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  label: { fontSize: 15 },
  labelGap: { marginTop: Spacing.three },
  pickerWrap: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
});
