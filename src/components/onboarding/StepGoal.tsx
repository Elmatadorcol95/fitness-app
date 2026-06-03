import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Goal } from '@/store/profile.store';

const GOALS: Goal[] = ['strength', 'hypertrophy', 'fat_loss'];
const ICONS: Record<Goal, string> = {
  strength: '🏋️',
  hypertrophy: '💪',
  fat_loss: '🔥',
};

export function StepGoal() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.goal.title')}
      </ThemedText>

      {GOALS.map((goal) => (
        <ThemedView
          key={goal}
          type={draft.goal === goal ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.card, draft.goal === goal && styles.cardSelected]}
          onTouchEnd={() => updateDraft({ goal })}
        >
          <ThemedText style={styles.icon}>{ICONS[goal]}</ThemedText>
          <View style={styles.cardText}>
            <ThemedText type="defaultSemiBold">{t(`onboarding.goal.${goal}`)}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.desc}>
              {t(`onboarding.goal.${goal}Desc`)}
            </ThemedText>
          </View>
        </ThemedView>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: 'rgba(128,128,128,0.4)',
  },
  icon: { fontSize: 32 },
  cardText: { flex: 1, gap: 4 },
  desc: { fontSize: 13 },
});
