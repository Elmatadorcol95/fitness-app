import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Location } from '@/store/profile.store';

const LOCATIONS: Location[] = ['home', 'gym', 'both'];

const EQUIPMENT_BY_LOCATION: Record<Location, string[]> = {
  home: ['bodyweight', 'bands', 'dumbbells', 'pullupBar', 'kettlebell', 'mat'],
  gym: ['barbells', 'machines', 'cables', 'dumbbells', 'bench', 'rack', 'pullupBar'],
  both: ['bodyweight', 'bands', 'dumbbells', 'pullupBar', 'kettlebell', 'mat', 'barbells', 'machines', 'cables', 'bench', 'rack'],
};

export function StepLocation() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();

  const handleLocationChange = (loc: Location) => {
    updateDraft({ location: loc, equipment: [] });
  };

  const toggleEquipment = (item: string) => {
    const current = draft.equipment;
    const next = current.includes(item)
      ? current.filter((e) => e !== item)
      : [...current, item];
    updateDraft({ equipment: next });
  };

  const availableEquipment = EQUIPMENT_BY_LOCATION[draft.location];

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.location.title')}
      </ThemedText>

      <View style={styles.locationRow}>
        {LOCATIONS.map((loc) => (
          <ThemedView
            key={loc}
            type={draft.location === loc ? 'backgroundSelected' : 'backgroundElement'}
            style={styles.locationChip}
            onTouchEnd={() => handleLocationChange(loc)}
          >
            <ThemedText type={draft.location === loc ? 'defaultSemiBold' : 'default'} style={styles.chipText}>
              {t(`onboarding.location.${loc}`)}
            </ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedText style={styles.label}>{t('onboarding.location.equipment')}</ThemedText>
      <View style={styles.equipmentGrid}>
        {availableEquipment.map((item) => {
          const selected = draft.equipment.includes(item);
          return (
            <ThemedView
              key={item}
              type={selected ? 'backgroundSelected' : 'backgroundElement'}
              style={styles.equipChip}
              onTouchEnd={() => toggleEquipment(item)}
            >
              <ThemedText type={selected ? 'defaultSemiBold' : 'default'} style={styles.equipText}>
                {t(`onboarding.location.equipmentItems.${item}`)}
              </ThemedText>
            </ThemedView>
          );
        })}
      </View>
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
  },
  chipText: { fontSize: 14 },
  label: { fontSize: 15, marginTop: Spacing.two },
  equipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  equipChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
  },
  equipText: { fontSize: 13 },
});
