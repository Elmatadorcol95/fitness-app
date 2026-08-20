import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';
import { useSheetStore, type SheetOption } from '@/store/sheet.store';

const DAYS    = [1, 2, 3, 4, 5, 6, 7];
const MINUTES = [15, 30, 45, 60, 75, 90, 105, 120];

export function StepSchedule() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const { draft, updateDraft } = useProfileStore();

  const dayLabel = (d: number) =>
    `${d} ${d === 1 ? t('onboarding.schedule.day') : t('onboarding.schedule.days')}`;
  const minLabel = (m: number) =>
    `${m} ${t('onboarding.schedule.min')}`;

  const dayOptions: SheetOption<number>[] = DAYS.map((d) => ({
    value: d,
    label: dayLabel(d),
  }));
  const minOptions: SheetOption<number>[] = MINUTES.map((m) => ({
    value: m,
    label: minLabel(m),
  }));

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.schedule.title')}
      </ThemedText>

      {/* Días */}
      <ThemedText style={styles.label}>{t('onboarding.schedule.daysPerWeek')}</ThemedText>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.backgroundElement },
          pressed && { backgroundColor: colors.backgroundSelected },
        ]}
        onPress={() => useSheetStore.getState().open({
          options: dayOptions,
          onSelect: (v) => updateDraft({ daysPerWeek: v as number }),
          selectedValue: draft.daysPerWeek,
          title: t('onboarding.schedule.daysPerWeek'),
          cancelLabel: t('common.cancel'),
        })}
      >
        <ThemedText style={styles.triggerText}>
          {dayLabel(draft.daysPerWeek)}
        </ThemedText>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      {/* Minutos */}
      <ThemedText style={[styles.label, styles.labelGap]}>
        {t('onboarding.schedule.minutesPerSession')}
      </ThemedText>
      <Pressable
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.backgroundElement },
          pressed && { backgroundColor: colors.backgroundSelected },
        ]}
        onPress={() => useSheetStore.getState().open({
          options: minOptions,
          onSelect: (v) => updateDraft({ minutesPerSession: v as number }),
          selectedValue: draft.minutesPerSession,
          title: t('onboarding.schedule.minutesPerSession'),
          cancelLabel: t('common.cancel'),
        })}
      >
        <ThemedText style={styles.triggerText}>
          {minLabel(draft.minutesPerSession)}
        </ThemedText>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  label: { fontSize: 15 },
  labelGap: { marginTop: Spacing.three },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
  },
  triggerText: {
    fontSize: 16,
  },
});
