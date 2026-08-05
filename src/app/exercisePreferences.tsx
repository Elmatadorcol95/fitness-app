import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { Spacing } from '@/constants/theme';
import { EXERCISES, getExerciseName } from '@/lib/exercises';
import { getAllPreferences, togglePreference, type Preference } from '@/lib/exercisePreferences';
import { useAndroidBack } from '@/hooks/use-android-back';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';

export default function ExercisePreferencesScreen() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith('fr') ? 'fr' : i18n.language.startsWith('es') ? 'es' : 'en') as 'es' | 'en' | 'fr';
  const isDbReady = useProfileStore(s => s.isDbReady);

  const [preferences, setPreferences] = useState<Map<string, Preference>>(new Map());

  useAndroidBack(true, () => useProfileStore.getState().closeExercisePreferences());

  useEffect(() => {
    if (!isDbReady) return;
    getAllPreferences().then(setPreferences);
  }, [isDbReady]);

  async function handleToggle(exerciseId: string, preference: Preference) {
    await togglePreference(exerciseId, preference);
    setPreferences(prev => {
      const next = new Map(prev);
      if (next.get(exerciseId) === preference) {
        next.delete(exerciseId);
      } else {
        next.set(exerciseId, preference);
      }
      return next;
    });
  }

  const likedIds = [...preferences.entries()].filter(([, p]) => p === 'liked').map(([id]) => id);
  const dislikedIds = [...preferences.entries()].filter(([, p]) => p === 'disliked').map(([id]) => id);
  const isEmpty = likedIds.length === 0 && dislikedIds.length === 0;

  function renderRow(exerciseId: string) {
    const exercise = EXERCISES.find(e => e.id === exerciseId);
    if (!exercise) return null;
    const pref = preferences.get(exerciseId) ?? null;
    return (
      <View key={exerciseId} style={styles.row}>
        <ThemedText style={styles.rowName} numberOfLines={1}>
          {getExerciseName(exercise.id, lang)}
        </ThemedText>
        <View style={styles.rowBtns}>
          <Pressable onPress={() => handleToggle(exerciseId, 'liked')} hitSlop={10} style={styles.rowBtn}>
            <Ionicons
              name={pref === 'liked' ? 'thumbs-up' : 'thumbs-up-outline'}
              size={18}
              color={pref === 'liked' ? GREEN : MUTED}
            />
          </Pressable>
          <Pressable onPress={() => handleToggle(exerciseId, 'disliked')} hitSlop={10} style={styles.rowBtn}>
            <Ionicons
              name={pref === 'disliked' ? 'thumbs-down' : 'thumbs-down-outline'}
              size={18}
              color={pref === 'disliked' ? AMBER : MUTED}
            />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => useProfileStore.getState().closeExercisePreferences()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#9DA89F" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t('exercisePreferences.title')}
          </ThemedText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isEmpty ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {t('exercisePreferences.empty')}
            </ThemedText>
          ) : (
            <>
              {likedIds.length > 0 && (
                <>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    {t('exercisePreferences.likedSection')}
                  </ThemedText>
                  {likedIds.map(renderRow)}
                </>
              )}
              {dislikedIds.length > 0 && (
                <>
                  <ThemedText type="defaultSemiBold" style={[styles.sectionTitle, likedIds.length > 0 && styles.sectionTitleSpaced]}>
                    {t('exercisePreferences.dislikedSection')}
                  </ThemedText>
                  {dislikedIds.map(renderRow)}
                </>
              )}
            </>
          )}
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
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: Spacing.five, lineHeight: 20 },
  sectionTitle: { fontSize: 15, marginBottom: Spacing.one },
  sectionTitleSpaced: { marginTop: Spacing.three },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFFFFF12',
  },
  rowName: { flex: 1, fontSize: 14, marginRight: Spacing.two },
  rowBtns: { flexDirection: 'row', gap: 12 },
  rowBtn: { padding: 4 },
});
