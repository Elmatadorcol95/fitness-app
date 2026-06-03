import { StyleSheet, TextInput, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';

export function StepInjuries() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { draft, updateDraft } = useProfileStore();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.injuries.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {t('onboarding.injuries.subtitle')}
      </ThemedText>

      <TextInput
        style={[styles.textarea, { color: colors.text, borderColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }]}
        placeholder={t('onboarding.injuries.placeholder')}
        placeholderTextColor={colors.textSecondary}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        value={draft.injuries}
        onChangeText={(v) => updateDraft({ injuries: v })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 14 },
  textarea: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    fontSize: 15,
    minHeight: 140,
  },
});
