import { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';
import { MuscleDiagramLabeled } from '@/components/musclePriorities/MuscleDiagramLabeled';
import type { MuscleRegionId } from '@/components/musclePriorities/MuscleDiagramPhoto';
import { groupsToZones, zonesToGroups, MAX_SELECTED } from '@/app/musclePriorities';
import type { MuscleGroup } from '@/lib/exercises';

const VIEWS: Array<'front' | 'back'> = ['front', 'back'];

export function StepMusclePriorities() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<MuscleRegionId[]>(() => groupsToZones(draft.musclePriorities as MuscleGroup[]));
  const pulseAnim = useRef(new Animated.Value(1)).current;

  function firePulse() {
    pulseAnim.setValue(1);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }

  // Toggle si ya está seleccionada; añade si hay hueco (<2); si ya hay 2 y se
  // toca una tercera región distinta, no cambia la selección — solo pulso.
  // Cada cambio real de selección se escribe de inmediato al draft.
  function handleRegionPress(id: MuscleRegionId) {
    let next: MuscleRegionId[];
    if (selected.includes(id)) {
      next = selected.filter(r => r !== id);
    } else if (selected.length < MAX_SELECTED) {
      next = [...selected, id];
    } else {
      firePulse();
      return;
    }
    setSelected(next);
    updateDraft({ musclePriorities: zonesToGroups(next) });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.musclePriorities.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.instruction}>
        {t('onboarding.musclePriorities.instruction')}
      </ThemedText>

      <View style={styles.viewRow}>
        {VIEWS.map((v) => (
          <ThemedView
            key={v}
            type={view === v ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.viewChip, view === v && styles.chipActive]}
            onTouchEnd={() => setView(v)}
          >
            <ThemedText
              type={view === v ? 'defaultSemiBold' : 'default'}
              style={styles.chipText}
            >
              {v === 'front' ? t('musclePriorities.tabFront') : t('musclePriorities.tabBack')}
            </ThemedText>
          </ThemedView>
        ))}
      </View>

      <Animated.View style={[styles.counterWrap, { transform: [{ scale: pulseAnim }] }]}>
        <ThemedText type="defaultSemiBold" style={styles.counterText}>
          {t('musclePriorities.selectedCount', { count: selected.length, max: MAX_SELECTED })}
        </ThemedText>
      </Animated.View>

      <MuscleDiagramLabeled view={view} selected={selected} onRegionPress={handleRegionPress} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.four },
  title: { textAlign: 'center' },
  instruction: { textAlign: 'center', fontSize: 14, marginBottom: Spacing.one },
  viewRow: { flexDirection: 'row', gap: Spacing.two, alignSelf: 'stretch' },
  viewChip: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: '#3FBF7F33' },
  chipText: { fontSize: 14 },
  counterWrap: { marginTop: Spacing.one },
  counterText: { fontSize: 15 },
});
