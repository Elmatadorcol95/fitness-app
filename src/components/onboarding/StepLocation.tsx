import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Location } from '@/store/profile.store';
import { type EquipmentKey } from '@/lib/exercises';
import { getPullCoverage } from '@/lib/pullBicepCoverage';

const AMBER = '#F2B450';

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
  const { hasBackVariety, hasBicepWork } = getPullCoverage(draft.equipment as EquipmentKey[]);
  const pullWarningKey: string | null =
    isGym || (hasBackVariety && hasBicepWork)   ? null :
    !hasBackVariety && !hasBicepWork            ? 'onboarding.location.noBackVarietyOrBicepNote' :
    !hasBackVariety                             ? 'onboarding.location.noBackVarietyNote' :
    'onboarding.location.noBicepWorkNote';

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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
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

          {/* Aviso: poca variedad de espalda o sin trabajo de bíceps con el equipamiento actual */}
          {pullWarningKey && (
            <View style={styles.noPullBanner}>
              <Ionicons name="information-circle-outline" size={15} color={AMBER} />
              <ThemedText style={styles.noPullBannerText}>
                {t(pullWarningKey)}
                {draft.location === 'both' ? ' ' + t('onboarding.location.homeDaysQualifier') : ''}
              </ThemedText>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two, paddingBottom: Spacing.four },
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
  noPullBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  noPullBannerText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },
});
