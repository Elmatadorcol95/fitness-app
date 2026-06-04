import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Location } from '@/store/profile.store';

const LOCATIONS: Location[] = ['home', 'gym', 'both'];

// Lista completa de equipamiento para casa
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
];

export function StepLocation() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();
  const isGym = draft.location === 'gym';

  const handleLocationChange = (loc: Location) => {
    // Al cambiar a gym, borramos el equipamiento (no aplica)
    updateDraft({ location: loc, equipment: loc === 'gym' ? [] : draft.equipment });
  };

  const toggleEquipment = (item: string) => {
    const current = draft.equipment;
    const next = current.includes(item)
      ? current.filter((e) => e !== item)
      : [...current, item];
    updateDraft({ equipment: next });
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.location.title')}
      </ThemedText>

      {/* Selector de lugar */}
      <View style={styles.locationRow}>
        {LOCATIONS.map((loc) => (
          <ThemedView
            key={loc}
            type={draft.location === loc ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.locationChip, draft.location === loc && styles.chipActive]}
            onTouchEnd={() => handleLocationChange(loc)}
          >
            <ThemedText
              type={draft.location === loc ? 'defaultSemiBold' : 'default'}
              style={styles.chipText}
            >
              {t(`onboarding.location.${loc}`)}
            </ThemedText>
          </ThemedView>
        ))}
      </View>

      {/* Gimnasio: equipamiento completo asumido */}
      {isGym && (
        <ThemedView type="backgroundElement" style={styles.gymNote}>
          <ThemedText style={styles.gymNoteText}>
            {t('onboarding.location.gymNote')}
          </ThemedText>
        </ThemedView>
      )}

      {/* Casa o Ambos: lista de equipamiento */}
      {!isGym && (
        <>
          <ThemedText style={styles.equipLabel}>
            {t('onboarding.location.equipment')}
          </ThemedText>
          <View style={styles.equipGrid}>
            {HOME_EQUIPMENT.map((item) => {
              const selected = draft.equipment.includes(item);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.two },
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
  equipLabel: { fontSize: 15, marginTop: Spacing.two },
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
});
