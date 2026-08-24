import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  useProfileStore,
  type RestSoundMode,
  type TrainingLocationMode,
  type PromptMode,
} from '@/store/profile.store';
import { Spacing } from '@/constants/theme';
import { useAndroidBack } from '@/hooks/use-android-back';

const GREEN = '#3FBF7F';

interface SettingsOption<T extends string> {
  value: T;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
}

// Componente compartido — mismo bloque visual que hoy solo usaba la
// sección de sonido de fin de descanso (#38), extraído sin cambiar su
// comportamiento ni su estilo, para reutilizarlo en las 4 secciones.
function SettingsOptionGroup<T extends string>({
  title, hint, options, currentValue, onSelect,
}: {
  title: string;
  hint: string;
  options: SettingsOption<T>[];
  currentValue: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.sectionHint}>
        {hint}
      </ThemedText>

      <View style={styles.optionsWrap}>
        {options.map(({ value, icon, label, desc }) => {
          const active = currentValue === value;
          return (
            <Pressable key={value} onPress={() => onSelect(value)}>
              <ThemedView
                type={active ? 'backgroundSelected' : 'backgroundElement'}
                style={[styles.optionRow, active && styles.optionRowActive]}
              >
                <Ionicons name={icon} size={20} color={active ? GREEN : '#9DA89F'} />
                <View style={styles.optionTextWrap}>
                  <ThemedText type={active ? 'defaultSemiBold' : 'default'} style={styles.optionLabel}>
                    {label}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.optionDesc}>
                    {desc}
                  </ThemedText>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={GREEN} />}
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const profile = useProfileStore(s => s.profile);
  const updateRestSoundMode = useProfileStore(s => s.updateRestSoundMode);
  const updateTrainingLocationMode = useProfileStore(s => s.updateTrainingLocationMode);
  const updateWarmupPromptMode = useProfileStore(s => s.updateWarmupPromptMode);
  const updateCooldownPromptMode = useProfileStore(s => s.updateCooldownPromptMode);

  useAndroidBack(true, () => useProfileStore.getState().closeSettings());

  const restSoundMode: RestSoundMode = (profile?.restSoundMode as RestSoundMode) ?? 'vulcan';
  const trainingLocationMode: TrainingLocationMode = (profile?.trainingLocationMode as TrainingLocationMode) ?? 'ask';
  const warmupPromptMode: PromptMode = (profile?.warmupPromptMode as PromptMode) ?? 'ask';
  const cooldownPromptMode: PromptMode = (profile?.cooldownPromptMode as PromptMode) ?? 'ask';

  const restSoundOptions: SettingsOption<RestSoundMode>[] = [
    { value: 'vulcan', icon: 'hammer-outline',        label: t('settings.restSound.vulcan'), desc: t('settings.restSound.vulcanDesc') },
    { value: 'native', icon: 'notifications-outline', label: t('settings.restSound.native'), desc: t('settings.restSound.nativeDesc') },
    { value: 'off',    icon: 'volume-mute-outline',   label: t('settings.restSound.off'),    desc: t('settings.restSound.offDesc') },
  ];

  const trainingLocationOptions: SettingsOption<TrainingLocationMode>[] = [
    { value: 'ask',  icon: 'help-circle-outline', label: t('settings.trainingLocation.ask'),  desc: t('settings.trainingLocation.askDesc') },
    { value: 'gym',  icon: 'barbell-outline',     label: t('settings.trainingLocation.gym'),  desc: t('settings.trainingLocation.gymDesc') },
    { value: 'home', icon: 'home-outline',        label: t('settings.trainingLocation.home'), desc: t('settings.trainingLocation.homeDesc') },
  ];

  const warmupOptions: SettingsOption<PromptMode>[] = [
    { value: 'ask',    icon: 'help-circle-outline',       label: t('settings.warmupPrompt.ask'),    desc: t('settings.warmupPrompt.askDesc') },
    { value: 'always', icon: 'checkmark-circle-outline',  label: t('settings.warmupPrompt.always'), desc: t('settings.warmupPrompt.alwaysDesc') },
    { value: 'never',  icon: 'close-circle-outline',      label: t('settings.warmupPrompt.never'),  desc: t('settings.warmupPrompt.neverDesc') },
  ];

  const cooldownOptions: SettingsOption<PromptMode>[] = [
    { value: 'ask',    icon: 'help-circle-outline',      label: t('settings.cooldownPrompt.ask'),    desc: t('settings.cooldownPrompt.askDesc') },
    { value: 'always', icon: 'checkmark-circle-outline', label: t('settings.cooldownPrompt.always'), desc: t('settings.cooldownPrompt.alwaysDesc') },
    { value: 'never',  icon: 'close-circle-outline',     label: t('settings.cooldownPrompt.never'),  desc: t('settings.cooldownPrompt.neverDesc') },
  ];

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
          <SettingsOptionGroup
            title={t('settings.restSound.sectionTitle')}
            hint={t('settings.restSound.sectionHint')}
            options={restSoundOptions}
            currentValue={restSoundMode}
            onSelect={updateRestSoundMode}
          />

          {/* Solo tiene sentido si el usuario entrena en los 2 contextos —
              mismo gate que ya usa handleStart() en training.tsx. */}
          {profile?.location === 'both' && (
            <SettingsOptionGroup
              title={t('settings.trainingLocation.sectionTitle')}
              hint={t('settings.trainingLocation.sectionHint')}
              options={trainingLocationOptions}
              currentValue={trainingLocationMode}
              onSelect={updateTrainingLocationMode}
            />
          )}

          <SettingsOptionGroup
            title={t('settings.warmupPrompt.sectionTitle')}
            hint={t('settings.warmupPrompt.sectionHint')}
            options={warmupOptions}
            currentValue={warmupPromptMode}
            onSelect={updateWarmupPromptMode}
          />

          <SettingsOptionGroup
            title={t('settings.cooldownPrompt.sectionTitle')}
            hint={t('settings.cooldownPrompt.sectionHint')}
            options={cooldownOptions}
            currentValue={cooldownPromptMode}
            onSelect={updateCooldownPromptMode}
          />
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
  section: { gap: Spacing.one, marginBottom: Spacing.three },
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
