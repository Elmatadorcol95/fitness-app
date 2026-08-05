import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore, type Location } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { Spacing } from '@/constants/theme';
import { type EquipmentKey } from '@/lib/exercises';
import { getPullCoverage } from '@/lib/pullBicepCoverage';
import { useAndroidBack } from '@/hooks/use-android-back';

const AMBER = '#F2B450';

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
  const isManualPlan = useWorkoutStore((s) => s.currentPlan?.source) === 'manual';
  const currentPlanContext = useWorkoutStore((s) => s.currentPlan?.context);

  const initialEquipment: string[] = (() => {
    try { return JSON.parse(profile?.equipment ?? '[]') as string[]; } catch { return []; }
  })();
  const initialLocation: Location = (profile?.location as Location) ?? 'gym';

  const [location, setLocation] = useState<Location>(initialLocation);
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [saving, setSaving] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [manualNoticeOpen, setManualNoticeOpen] = useState(false);
  const [locationConflictOpen, setLocationConflictOpen] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [regenErrorMsg, setRegenErrorMsg] = useState('');
  const pendingProfile = useRef<typeof profile>(null);

  useAndroidBack(true, () => useProfileStore.getState().closeEquipment());

  const isGym = location === 'gym';
  const { hasBackVariety, hasBicepWork } = getPullCoverage(equipment as EquipmentKey[]);
  const pullWarningKey: string | null =
    isGym || (hasBackVariety && hasBicepWork)   ? null :
    !hasBackVariety && !hasBicepWork            ? 'onboarding.location.noBackVarietyOrBicepNote' :
    !hasBackVariety                             ? 'onboarding.location.noBackVarietyNote' :
    'onboarding.location.noBicepWorkNote';

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
    const wouldOrphanActiveContext =
      isManualPlan &&
      !!currentPlanContext &&
      location !== 'both' &&
      location !== currentPlanContext;

    if (wouldOrphanActiveContext) {
      setLocationConflictOpen(true);
      return;
    }

    if (!profile) { useProfileStore.getState().closeEquipment(); return; }
    if (!hasChanged) { useProfileStore.getState().closeEquipment(); return; }

    setSaving(true);
    try {
      await updateEquipmentAndLocation(location, equipment);
      if (isManualPlan) {
        setManualNoticeOpen(true);
      } else {
        pendingProfile.current = { ...profile, location, equipment: JSON.stringify(equipment) };
        setRegenOpen(true);
      }
    } catch (err) {
      console.error('[Equipment] Error al guardar equipamiento:', err);
      setSaveErrorMsg(t('equipment.saveErrorMsg'));
    } finally {
      setSaving(false);
    }
  };

  const handleManualNoticeClose = () => {
    setManualNoticeOpen(false);
    useProfileStore.getState().closeEquipment();
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable onPress={() => useProfileStore.getState().closeEquipment()} style={styles.backBtn} hitSlop={12}>
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

              {/* Aviso: poca variedad de espalda o sin trabajo de bíceps con el equipamiento actual */}
              {pullWarningKey && (
                <View style={styles.noPullBanner}>
                  <Ionicons name="information-circle-outline" size={15} color={AMBER} />
                  <ThemedText style={styles.noPullBannerText}>
                    {t(pullWarningKey)}
                    {location === 'both' ? ' ' + t('onboarding.location.homeDaysQualifier') : ''}
                  </ThemedText>
                </View>
              )}
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

      <VulcanDialog
        visible={regenOpen}
        onClose={() => { setRegenOpen(false); useProfileStore.getState().closeEquipment(); }}
        title={t('equipment.regenTitle')}
        message={t('equipment.regenMsg')}
        confirmLabel={t('equipment.regenYes')}
        cancelLabel={t('equipment.regenNo')}
        onConfirm={async () => {
          setRegenOpen(false);
          if (pendingProfile.current) {
            try {
              await generateAndSavePlan(pendingProfile.current);
            } catch (err) {
              console.error('[Equipment] Error al regenerar plan:', err);
              setRegenErrorMsg(t('equipment.regenErrorMsg'));
            }
          }
          useProfileStore.getState().closeEquipment();
        }}
      />

      <VulcanDialog
        visible={manualNoticeOpen}
        onClose={handleManualNoticeClose}
        hideCancel
        title={t('equipment.manualNoticeTitle')}
        message={t('equipment.manualNoticeMsg')}
        confirmLabel="OK"
        onConfirm={handleManualNoticeClose}
      />

      <VulcanDialog
        visible={locationConflictOpen}
        onClose={() => setLocationConflictOpen(false)}
        hideCancel
        title={t('equipment.locationConflictTitle')}
        message={t('equipment.locationConflictMsg', {
          context: t(`onboarding.location.${currentPlanContext ?? 'home'}`),
        })}
        confirmLabel={t('equipment.locationConflictButton')}
        onConfirm={() => setLocationConflictOpen(false)}
      />

      <VulcanDialog
        visible={saveErrorMsg !== ''}
        onClose={() => setSaveErrorMsg('')}
        title={t('equipment.saveErrorTitle')}
        message={saveErrorMsg}
        confirmLabel="OK"
        onConfirm={() => setSaveErrorMsg('')}
        hideCancel
      />

      <VulcanDialog
        visible={regenErrorMsg !== ''}
        onClose={() => setRegenErrorMsg('')}
        title={t('equipment.regenErrorTitle')}
        message={regenErrorMsg}
        confirmLabel="OK"
        onConfirm={() => setRegenErrorMsg('')}
        hideCancel
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
  noPullBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  noPullBannerText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },
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
