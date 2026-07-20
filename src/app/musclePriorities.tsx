import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { parseMusclePriorities, type MuscleGroup } from '@/lib/exercises';
import { MuscleDiagramLabeled } from '@/components/musclePriorities/MuscleDiagramLabeled';
import type { MuscleRegionId } from '@/components/musclePriorities/MuscleDiagramPhoto';
import { Spacing } from '@/constants/theme';

const VIEWS: Array<'front' | 'back'> = ['front', 'back'];

export const MAX_SELECTED = 2;

const ZONE_TO_GROUPS: Record<MuscleRegionId, MuscleGroup[]> = {
  chest: ['chest'],
  shoulders: ['shoulders'],
  biceps: ['biceps'],
  quads: ['quads'],
  core_abdomen: ['core', 'abs'],
  back: ['back', 'lats', 'traps'],
  triceps: ['triceps'],
  glutes: ['glutes'],
  hamstrings: ['hamstrings'],
  calves: ['calves'],
};

export function groupsToZones(groups: MuscleGroup[]): MuscleRegionId[] {
  return (Object.keys(ZONE_TO_GROUPS) as MuscleRegionId[]).filter((zone) =>
    ZONE_TO_GROUPS[zone].some((g) => groups.includes(g)),
  );
}

function zonesToGroups(zones: MuscleRegionId[]): MuscleGroup[] {
  const groups = zones.flatMap((zone) => ZONE_TO_GROUPS[zone]);
  return Array.from(new Set(groups));
}

export default function MusclePrioritiesScreen() {
  const { t } = useTranslation();
  const { profile, updateMusclePriorities } = useProfileStore();
  const generateAndSavePlan = useWorkoutStore((s) => s.generateAndSavePlan);

  const initialSelected: MuscleRegionId[] = (() => {
    const groups = parseMusclePriorities(profile?.musclePriorities ?? undefined);
    return groupsToZones(groups);
  })();

  const [selected, setSelected] = useState<MuscleRegionId[]>(initialSelected);
  const [view, setView] = useState<'front' | 'back'>('front');
  const [saving, setSaving] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const pendingProfile = useRef<typeof profile>(null);
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
  function handleRegionPress(id: MuscleRegionId) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(r => r !== id);
      if (prev.length < MAX_SELECTED) return [...prev, id];
      firePulse();
      return prev;
    });
  }

  const hasChanged =
    JSON.stringify([...selected].sort()) !== JSON.stringify([...initialSelected].sort());

  const handleSave = async () => {
    if (!profile) { useProfileStore.getState().closeMusclePriorities(); return; }
    if (!hasChanged) { useProfileStore.getState().closeMusclePriorities(); return; }

    setSaving(true);
    try {
      const groups = zonesToGroups(selected);
      await updateMusclePriorities(groups);
      pendingProfile.current = { ...profile, musclePriorities: JSON.stringify(groups) };
      setRegenOpen(true);
    } finally {
      setSaving(false);
    }
  };

  const handleRegenConfirm = async () => {
    setRegenOpen(false);
    if (pendingProfile.current) {
      try {
        await generateAndSavePlan(pendingProfile.current);
      } catch (err) {
        console.error('[MusclePriorities] Error al regenerar plan:', err);
      }
    }
    useProfileStore.getState().closeMusclePriorities();
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable onPress={() => useProfileStore.getState().closeMusclePriorities()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#9DA89F" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t('musclePriorities.title')}
          </ThemedText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs Frontal/Trasera */}
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

          <ThemedText themeColor="textSecondary" style={styles.hintText}>
            {t('musclePriorities.hint')}
          </ThemedText>

          <Animated.View style={[styles.counterWrap, { transform: [{ scale: pulseAnim }] }]}>
            <ThemedText type="defaultSemiBold" style={styles.counterText}>
              {t('musclePriorities.selectedCount', { count: selected.length, max: MAX_SELECTED })}
            </ThemedText>
          </Animated.View>

          <MuscleDiagramLabeled view={view} selected={selected} onRegionPress={handleRegionPress} />
        </ScrollView>

        {/* Botón Guardar */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !hasChanged && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanged || saving}
          >
            {saving ? (
              <ActivityIndicator color="#04261A" />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.saveBtnText}>
                {t('common.save')}
              </ThemedText>
            )}
          </Pressable>
        </View>

      </SafeAreaView>

      <VulcanDialog
        visible={regenOpen}
        onClose={handleRegenConfirm}
        hideCancel
        title={t('musclePriorities.regenTitle')}
        message={t('musclePriorities.regenMsg')}
        confirmLabel={t('musclePriorities.regenConfirm')}
        onConfirm={handleRegenConfirm}
      />
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
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    alignItems: 'center',
  },
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
  counterWrap: { marginTop: Spacing.two },
  counterText: { fontSize: 15 },
  hintText: { fontSize: 13, textAlign: 'center', marginTop: Spacing.one },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  saveBtn: {
    backgroundColor: '#3FBF7F',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#04261A' },
});
