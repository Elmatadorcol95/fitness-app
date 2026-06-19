import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Goal } from '@/store/profile.store';

const GOALS: Goal[] = ['strength', 'hypertrophy', 'fat_loss'];

const GOAL_DEFS: Record<Goal, { iconName: string; color: string }> = {
  strength:    { iconName: 'barbell-outline', color: '#3FBF7F' },
  hypertrophy: { iconName: 'body-outline',    color: '#3FBF7F' },
  fat_loss:    { iconName: 'flame-outline',   color: '#F2B450' },
};

export function StepGoal() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();

  const handleTap = (goal: Goal) => {
    const current = draft.goals;
    const isPrimary   = current[0] === goal;
    const isSecondary = current[1] === goal;

    if (isPrimary) {
      updateDraft({ goals: current[1] ? [current[1]] : [] });
    } else if (isSecondary) {
      updateDraft({ goals: [current[0]] });
    } else if (current.length === 0) {
      updateDraft({ goals: [goal] });
    } else if (current.length === 1) {
      updateDraft({ goals: [current[0], goal] });
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.goal.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.instruction}>
        {t('onboarding.goal.instruction')}
      </ThemedText>

      {GOALS.map((goal) => {
        const isPrimary   = draft.goals[0] === goal;
        const isSecondary = draft.goals[1] === goal;
        const isSelected  = isPrimary || isSecondary;
        const def = GOAL_DEFS[goal];

        return (
          <ThemedView
            key={goal}
            type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.card, isSelected && styles.cardSelected]}
            onTouchEnd={() => handleTap(goal)}
          >
            <Ionicons name={def.iconName as any} size={30} color={def.color} />

            <View style={styles.cardText}>
              <ThemedText type="defaultSemiBold">{t(`onboarding.goal.${goal}`)}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.desc}>
                {t(`onboarding.goal.${goal}Desc`)}
              </ThemedText>
            </View>

            {isPrimary && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{t('onboarding.goal.primaryBadge')}</ThemedText>
              </View>
            )}
            {isSecondary && (
              <View style={[styles.badge, styles.badgeSecondary]}>
                <ThemedText style={[styles.badgeText, styles.badgeSecondaryText]}>
                  {t('onboarding.goal.secondaryBadge')}
                </ThemedText>
              </View>
            )}
          </ThemedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.one },
  instruction: { textAlign: 'center', fontSize: 13, marginBottom: Spacing.two },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: '#3FBF7F33' },
  cardText: { flex: 1, gap: 4 },
  desc: { fontSize: 13 },
  badge: {
    backgroundColor: '#3FBF7F',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#04261A' },
  badgeSecondary: { backgroundColor: '#F2B45033' },
  badgeSecondaryText: { color: '#F2B450' },
});
