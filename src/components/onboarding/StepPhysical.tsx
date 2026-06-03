import { StyleSheet, TextInput, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '@/lib/units';

const GENDERS = ['male', 'female', 'other'] as const;

export function StepPhysical() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { draft, updateDraft } = useProfileStore();
  const isImperial = draft.units === 'imperial';

  const displayHeight = () => {
    if (!draft.heightCm) return '';
    if (isImperial) {
      const { ft, inches } = cmToFtIn(draft.heightCm);
      return `${ft}'${inches}"`;
    }
    return String(Math.round(draft.heightCm));
  };

  const displayWeight = () => {
    if (!draft.weightKg) return '';
    return isImperial ? String(kgToLb(draft.weightKg)) : String(draft.weightKg);
  };

  const handleHeightChange = (v: string) => {
    if (isImperial) {
      const match = v.match(/^(\d+)'(\d+)/);
      if (match) {
        updateDraft({ heightCm: ftInToCm(Number(match[1]), Number(match[2])) });
      }
    } else {
      const n = parseFloat(v);
      if (!isNaN(n)) updateDraft({ heightCm: n });
    }
  };

  const handleWeightChange = (v: string) => {
    const n = parseFloat(v);
    if (isNaN(n)) return;
    updateDraft({ weightKg: isImperial ? lbToKg(n) : n });
  };

  const inputStyle = [styles.input, { color: colors.text, borderColor: colors.backgroundElement, backgroundColor: colors.backgroundElement }];

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.physical.title')}
      </ThemedText>

      <View style={styles.row}>
        <View style={styles.half}>
          <ThemedText style={styles.label}>{t('onboarding.physical.birthYear')}</ThemedText>
          <TextInput
            style={inputStyle}
            placeholder="1990"
            placeholderTextColor={colors.textSecondary}
            keyboardType="number-pad"
            value={draft.birthYear ? String(draft.birthYear) : ''}
            onChangeText={(v) => { const n = parseInt(v); if (!isNaN(n)) updateDraft({ birthYear: n }); }}
          />
        </View>
        <View style={styles.half}>
          <ThemedText style={styles.label}>{t('onboarding.physical.gender')}</ThemedText>
          <View style={styles.genderRow}>
            {GENDERS.map((g) => (
              <ThemedView
                key={g}
                type={draft.gender === g ? 'backgroundSelected' : 'backgroundElement'}
                style={styles.genderChip}
                onTouchEnd={() => updateDraft({ gender: g })}
              >
                <ThemedText type={draft.gender === g ? 'defaultSemiBold' : 'default'} style={styles.chipText}>
                  {t(`onboarding.physical.${g}`)}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <ThemedText style={styles.label}>
            {t('onboarding.physical.height')} ({isImperial ? "ft'in\"" : 'cm'})
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={isImperial ? "5'10\"" : '175'}
            placeholderTextColor={colors.textSecondary}
            keyboardType={isImperial ? 'default' : 'decimal-pad'}
            value={displayHeight()}
            onChangeText={handleHeightChange}
          />
        </View>
        <View style={styles.half}>
          <ThemedText style={styles.label}>
            {t('onboarding.physical.weight')} ({isImperial ? 'lb' : 'kg'})
          </ThemedText>
          <TextInput
            style={inputStyle}
            placeholder={isImperial ? '154' : '70'}
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            value={displayWeight()}
            onChangeText={handleWeightChange}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.three },
  title: { textAlign: 'center' },
  label: { marginBottom: Spacing.one, fontSize: 13 },
  row: { flexDirection: 'row', gap: Spacing.two },
  half: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 4,
    fontSize: 16,
  },
  genderRow: { gap: Spacing.one },
  genderChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
  },
  chipText: { fontSize: 13 },
});
