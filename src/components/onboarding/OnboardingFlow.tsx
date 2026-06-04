import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from './ProgressBar';
import { StepWelcome } from './StepWelcome';
import { StepPhysical } from './StepPhysical';
import { StepGoal } from './StepGoal';
import { StepSchedule } from './StepSchedule';
import { StepLocation } from './StepLocation';
import { StepInjuries } from './StepInjuries';
import { StepSummary } from './StepSummary';

import { db, schema } from '@/db';
import { useProfileStore } from '@/store/profile.store';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TOTAL_STEPS = 7;
const STEPS = [StepWelcome, StepPhysical, StepGoal, StepSchedule, StepLocation, StepInjuries, StepSummary];

export function OnboardingFlow() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { draft, setProfile } = useProfileStore();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const StepComponent = STEPS[step];
  const isFirst = step === 0;
  const isLast  = step === TOTAL_STEPS - 1;

  const canGoNext = () => {
    if (step === 0) return draft.name.trim().length > 0;
    if (step === 2) return draft.goals.length > 0; // al menos 1 objetivo
    return true;
  };

  const handleNext = async () => {
    if (!isLast) { setStep((s) => s + 1); return; }

    setSaving(true);
    try {
      await db.insert(schema.profile).values({
        name:             draft.name.trim(),
        birthYear:        draft.birthYear,
        gender:           draft.gender,
        heightCm:         draft.heightCm,
        weightKg:         draft.weightKg,
        goalPrimary:      draft.goals[0],
        goalSecondary:    draft.goals[1] ?? null,
        daysPerWeek:      draft.daysPerWeek,
        minutesPerSession: draft.minutesPerSession,
        location:         draft.location,
        equipment:        JSON.stringify(draft.equipment),
        injuries:         draft.injuries,
        units:            draft.units,
        createdAt:        Date.now(),
      });

      const rows = await db.select().from(schema.profile).orderBy(schema.profile.id);
      setProfile(rows[rows.length - 1] ?? null);
    } catch (e) {
      console.error('Error guardando perfil:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText themeColor="textSecondary" style={styles.stepLabel}>
            {t('onboarding.step', { current: step + 1, total: TOTAL_STEPS })}
          </ThemedText>
          <ProgressBar current={step + 1} total={TOTAL_STEPS} />
        </View>

        <View style={styles.content}>
          <StepComponent />
        </View>

        <View style={styles.footer}>
          {!isFirst && (
            <Pressable
              style={[styles.btn, { backgroundColor: theme.backgroundElement }]}
              onPress={() => setStep((s) => s - 1)}
            >
              <ThemedText>{t('common.back')}</ThemedText>
            </Pressable>
          )}
          <Pressable
            style={[styles.btn, styles.btnNext, { opacity: canGoNext() ? 1 : 0.4 }]}
            onPress={handleNext}
            disabled={!canGoNext() || saving}
          >
            {saving ? (
              <ActivityIndicator color="#04261A" />
            ) : (
              <ThemedText style={styles.btnNextText} type="defaultSemiBold">
                {isLast ? t('onboarding.summary.start') : t('common.next')}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  header: { paddingTop: Spacing.three, gap: Spacing.two },
  stepLabel: { fontSize: 13, textAlign: 'center' },
  content: { flex: 1, paddingTop: Spacing.four, paddingBottom: Spacing.two },
  footer: { flexDirection: 'row', gap: Spacing.two, paddingBottom: Spacing.four, paddingTop: Spacing.two },
  btn: {
    flex: 1, borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 6,
    alignItems: 'center', justifyContent: 'center',
  },
  btnNext: { backgroundColor: '#3FBF7F' },
  btnNextText: { color: '#04261A' },
});
