import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore, type RestSoundMode } from '@/store/profile.store';
import { Spacing } from '@/constants/theme';
import { useAndroidBack } from '@/hooks/use-android-back';

const GREEN = '#3FBF7F';

const REST_SOUND_MODES: { mode: RestSoundMode; icon: keyof typeof Ionicons.glyphMap; labelKey: string; descKey: string }[] = [
  { mode: 'vulcan', icon: 'hammer-outline',      labelKey: 'settings.restSound.vulcan',  descKey: 'settings.restSound.vulcanDesc' },
  { mode: 'native', icon: 'notifications-outline', labelKey: 'settings.restSound.native', descKey: 'settings.restSound.nativeDesc' },
  { mode: 'off',    icon: 'volume-mute-outline', labelKey: 'settings.restSound.off',     descKey: 'settings.restSound.offDesc' },
];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore(s => s.profile);
  const updateRestSoundMode = useProfileStore(s => s.updateRestSoundMode);

  useAndroidBack(true, () => useProfileStore.getState().closeSettings());

  const currentMode: RestSoundMode = (profile?.restSoundMode as RestSoundMode) ?? 'vulcan';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => useProfileStore.getState().closeSettings()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#9DA89F" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t('settings.title')}
          </ThemedText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ThemedText style={styles.sectionTitle}>{t('settings.restSound.sectionTitle')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.sectionHint}>
            {t('settings.restSound.sectionHint')}
          </ThemedText>

          <View style={styles.optionsWrap}>
            {REST_SOUND_MODES.map(({ mode, icon, labelKey, descKey }) => {
              const active = currentMode === mode;
              return (
                <Pressable key={mode} onPress={() => updateRestSoundMode(mode)}>
                  <ThemedView
                    type={active ? 'backgroundSelected' : 'backgroundElement'}
                    style={[styles.optionRow, active && styles.optionRowActive]}
                  >
                    <Ionicons name={icon} size={20} color={active ? GREEN : '#9DA89F'} />
                    <View style={styles.optionTextWrap}>
                      <ThemedText type={active ? 'defaultSemiBold' : 'default'} style={styles.optionLabel}>
                        {t(labelKey)}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.optionDesc}>
                        {t(descKey)}
                      </ThemedText>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  title: { flex: 1, textAlign: 'center', fontSize: 18 },
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.one },
  sectionTitle: { fontSize: 15, marginTop: Spacing.one },
  sectionHint: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.two },
  optionsWrap: { gap: Spacing.two },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionRowActive: { borderColor: '#3FBF7F44' },
  optionTextWrap: { flex: 1, gap: 2 },
  optionLabel: { fontSize: 15 },
  optionDesc: { fontSize: 12, lineHeight: 16 },
});
