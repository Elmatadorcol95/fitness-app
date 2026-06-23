import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore, type Location } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { Spacing } from '@/constants/theme';

const LOCATIONS: Location[] = ['home', 'gym', 'both'];

// Misma lista que StepLocation — 'bodyweight' se muestra pero no afecta al filtro
// de ejercicios (los ejercicios de peso corporal tienen equipment:[] siempre disponibles)
const HOME_EQUIPMENT = [
  'bodyweight',
  'dumbbells',
  'barbellPlates',
  'kettlebells',
  'resistanceBands',
  'miniGluteBands',
  'pullupBar',
  'parallettes',
  'rings',
  'trx',
  'adjustableBench',
  'plioBox',
  'medicineBall',
  'fitball',
  'abRoller',
  'jumpRope',
  'mat',
  'foamRoller',
  'sliders',
  'weightedVest',
] as const;

export default function EquipmentScreen() {
  const { t } = useTranslation();
  const { profile, updateEquipmentAndLocation } = useProfileStore();
  const generateAndSavePlan = useWorkoutStore((s) => s.generateAndSavePlan);

  const initialEquipment: string[] = (() => {
    try { return JSON.parse(profile?.equipment ?? '[]') as string[]; } catch { return []; }
  })();
  const initialLocation: Location = (profile?.location as Location) ?? 'gym';

  const [location, setLocation] = useState<Location>(initialLocation);
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [saving, setSaving] = useState(false);

  const isGym = location === 'gym';

  const handleLocationChange = (loc: Location) => {
    setLocation(loc);
    if (loc === 'gym') setEquipment([]);
  };

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
  };

  const hasChanged =
    location !== initialLocation ||
    JSON.stringify([...equipment].sort()) !== JSON.stringify([...initialEquipment].sort());

  const handleSave = async () => {
    if (!profile) { router.back(); return; }
    if (!hasChanged) { router.back(); return; }

    setSaving(true);
    try {
      await updateEquipmentAndLocation(location, equipment);
      // Capturamos el perfil actualizado antes de mostrar el Alert
      const updatedProfile = { ...profile, location, equipment: JSON.stringify(equipment) };

      Alert.alert(
        t('equipment.regenTitle'),
        t('equipment.regenMsg'),
        [
          {
            text: t('equipment.regenNo'),
            onPress: () => router.back(),
          },
          {
            text: t('equipment.regenYes'),
            onPress: async () => {
              try {
                await generateAndSavePlan(updatedProfile);
              } finally {
                router.back();
              }
            },
          },
        ],
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#9DA89F" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t('equipment.title')}
          </ThemedText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Selector de lugar */}
          <View style={styles.locationRow}>
            {LOCATIONS.map((loc) => (
              <ThemedView
                key={loc}
                type={location === loc ? 'backgroundSelected' : 'backgroundElement'}
                style={[styles.locationChip, location === loc && styles.chipActive]}
                onTouchEnd={() => handleLocationChange(loc)}
              >
                <ThemedText
                  type={location === loc ? 'defaultSemiBold' : 'default'}
                  style={styles.chipText}
                >
                  {t(`onboarding.location.${loc}`)}
                </ThemedText>
              </ThemedView>
            ))}
          </View>

          {/* Nota de gimnasio */}
          {isGym && (
            <ThemedView type="backgroundElement" style={styles.gymNote}>
              <ThemedText style={styles.gymNoteText}>
                {t('onboarding.location.gymNote')}
              </ThemedText>
            </ThemedView>
          )}

          {/* Lista de equipamiento para casa / ambos */}
          {!isGym && (
            <>
              <ThemedText style={styles.equipLabel}>
                {t('onboarding.location.equipment')}
              </ThemedText>
              <View style={styles.equipGrid}>
                {HOME_EQUIPMENT.map((item) => {
                  const selected = equipment.includes(item);
                  return (
                    <ThemedView
                      key={item}
                      type={selected ? 'backgroundSelected' : 'backgroundElement'}
                      style={[styles.equipChip, selected && styles.equipChipActive]}
                      onTouchEnd={() => toggleEquipment(item)}
                    >
                      <ThemedText
                        type={selected ? 'defaultSemiBold' : 'default'}
                        style={styles.equipText}
                      >
                        {t(`onboarding.location.equipmentItems.${item}`)}
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </View>
            </>
          )}
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
  },
  locationRow: { flexDirection: 'row', gap: Spacing.two },
  locationChip: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: '#3FBF7F33' },
  chipText: { fontSize: 14 },
  gymNote: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.one,
  },
  gymNoteText: { textAlign: 'center', fontSize: 14 },
  equipLabel: { fontSize: 15, marginTop: Spacing.one },
  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  equipChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  equipChipActive: { borderColor: '#3FBF7F44' },
  equipText: { fontSize: 13 },
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
