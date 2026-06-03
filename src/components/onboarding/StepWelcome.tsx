import { StyleSheet, TextInput, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProfileStore, type Units } from '@/store/profile.store';

export function StepWelcome() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { draft, updateDraft } = useProfileStore();

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.welcome.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {t('onboarding.welcome.subtitle')}
      </ThemedText>

      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }]}
        placeholder={t('onboarding.welcome.namePlaceholder')}
        placeholderTextColor={colors.textSecondary}
        value={draft.name}
        onChangeText={(v) => updateDraft({ name: v })}
        autoCapitalize="words"
        returnKeyType="done"
      />

      <ThemedText style={styles.label}>{t('onboarding.welcome.units')}</ThemedText>

      <View style={styles.toggle}>
        {(['metric', 'imperial'] as Units[]).map((u) => (
          <ThemedView
            key={u}
            type={draft.units === u ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.toggleOption}
            onTouchEnd={() => updateDraft({ units: u })}
          >
            <ThemedText type={draft.units === u ? 'defaultSemiBold' : 'default'}>
              {t(`onboarding.welcome.${u}`)}
            </ThemedText>
          </ThemedView>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
  },
  label: { marginTop: Spacing.two },
  toggle: { flexDirection: 'row', gap: Spacing.two },
  toggleOption: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
  },
});
