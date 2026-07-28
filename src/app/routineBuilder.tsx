import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { Spacing } from '@/constants/theme';
import { getExerciseName, type MuscleGroup } from '@/lib/exercises';
import { muscleLabel } from '@/components/workout/ExerciseCard';
import { ChangeExerciseModal } from '@/components/workout/ChangeExerciseModal';
import { getSplit, getProfileSignals, type DayType } from '@/lib/plan-generator';
import {
  getTemplate,
  createTemplate,
  setSlotExercise,
  type TemplateContext,
  type BuilderDayType,
  type RoutineTemplateDay,
} from '@/lib/routineTemplates';

const GREEN = '#3FBF7F';

// Días que el constructor manual admite hoy — upper/lower quedan dormidos
// (mismo DayType del generador automático, ver CLAUDE.md "Constructor de
// rutina propia"). getSplit() nunca devuelve upper/lower para 1-7 días; este
// filtro es solo por seguridad de tipos, no porque hoy pueda pasar de verdad.
const BUILDER_DAY_TYPES = new Set<BuilderDayType>(['push', 'pull', 'legs', 'full_body']);
function toBuilderDayType(d: DayType): BuilderDayType {
  return BUILDER_DAY_TYPES.has(d as BuilderDayType) ? (d as BuilderDayType) : 'full_body';
}

export default function RoutineBuilderScreen() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith('fr') ? 'fr' : i18n.language.startsWith('es') ? 'es' : 'en') as 'es' | 'en' | 'fr';
  const isDbReady = useProfileStore(s => s.isDbReady);
  const profile = useProfileStore(s => s.profile);

  const showSelector = profile?.location === 'both';
  const initialContext: TemplateContext = profile?.location === 'home' ? 'home' : 'gym';
  const [context, setContext] = useState<TemplateContext>(initialContext);
  const [days, setDays] = useState<RoutineTemplateDay[] | null>(null);
  const [slotModal, setSlotModal] = useState<{
    visible: boolean;
    slotId: number;
    currentExerciseId: string | null;
    muscleGroup: MuscleGroup | undefined;
  }>({ visible: false, slotId: 0, currentExerciseId: null, muscleGroup: undefined });

  // Mismo parseo que getProfileSignals(), pero solo lo que el picker necesita
  // (sin dislikedIds/likedIds — getExercisesByMuscleGroup/getAlternatives no
  // los usan). isGym por CONTEXTO elegido, no por profile.location — mismo
  // motivo que en la creación de la plantilla más abajo.
  const equipmentForModal: string[] = (() => {
    try { return JSON.parse(profile?.equipment ?? '[]') as string[]; } catch { return []; }
  })();
  const isGymForModal = context === 'gym';

  async function reloadTemplate() {
    const template = await getTemplate(context);
    setDays(template);
  }

  useEffect(() => {
    if (!isDbReady || !profile) return;
    let cancelled = false;
    setDays(null);
    (async () => {
      try {
        let template = await getTemplate(context);
        if (template.length === 0) {
          const builderDays = getSplit(profile.daysPerWeek).map(toBuilderDayType);
          const signals = await getProfileSignals(profile);
          // location:'both' tiene DOS plantillas independientes por contexto
          // (gym/home) — isGym debe reflejar el CONTEXTO elegido aquí, no
          // profile.location (que para 'both' siempre da isGym=true en
          // getProfileSignals). equipment sigue siendo válido tal cual:
          // profile.equipment ya guarda solo equipamiento de casa (se vacía
          // al elegir gym — FASE E-1), independientemente del contexto.
          const isGymForContext = context === 'gym';
          await createTemplate(
            context,
            builderDays,
            profile.minutesPerSession,
            signals.equipment,
            isGymForContext,
            signals.musclePriorities,
            signals.dislikedIds,
            signals.likedIds,
          );
          template = await getTemplate(context);
        }
        if (!cancelled) setDays(template);
      } catch (e) {
        console.error('[RoutineBuilder] Error al cargar/crear la plantilla:', e);
        if (!cancelled) setDays([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isDbReady, profile, context]);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => useProfileStore.getState().closeRoutineBuilder()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#9DA89F" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t('routineBuilder.title')}
          </ThemedText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {showSelector && (
            <>
              <ThemedText themeColor="textSecondary" style={styles.contextPrompt}>
                {t('routineBuilder.contextPrompt')}
              </ThemedText>
              <View style={styles.contextRow}>
                {(['home', 'gym'] as TemplateContext[]).map((c) => (
                  <ThemedView
                    key={c}
                    type={context === c ? 'backgroundSelected' : 'backgroundElement'}
                    style={[styles.contextChip, context === c && styles.contextChipActive]}
                    onTouchEnd={() => setContext(c)}
                  >
                    <ThemedText type={context === c ? 'defaultSemiBold' : 'default'} style={styles.contextChipText}>
                      {t(c === 'gym' ? 'onboarding.location.gym' : 'onboarding.location.home')}
                    </ThemedText>
                  </ThemedView>
                ))}
              </View>
            </>
          )}

          {days === null ? (
            <ActivityIndicator color={GREEN} style={styles.loading} />
          ) : days.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {t('routineBuilder.emptySlots')}
            </ThemedText>
          ) : (
            days.map((day, dayIdx) => (
              <View key={day.id} style={styles.dayBlock}>
                <ThemedText type="defaultSemiBold" style={styles.dayTitle}>
                  {dayIdx + 1}. {t(`workout.days.${day.dayType}`)}
                </ThemedText>
                <ThemedView type="backgroundElement" style={styles.dayCard}>
                  {day.slots.length === 0 ? (
                    <ThemedText themeColor="textSecondary" style={styles.emptySlotsText}>
                      {t('routineBuilder.emptySlots')}
                    </ThemedText>
                  ) : (
                    day.slots.map((slot) => (
                      <Pressable
                        key={slot.id}
                        style={styles.slotRow}
                        onPress={() => setSlotModal({
                          visible: true,
                          slotId: slot.id,
                          currentExerciseId: slot.exerciseId,
                          muscleGroup: slot.exerciseId ? undefined : (slot.muscleGroup as MuscleGroup),
                        })}
                      >
                        <View style={styles.slotTextWrap}>
                          <ThemedText style={styles.slotMuscle}>
                            {muscleLabel(slot.muscleGroup, lang)}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary" style={styles.slotExercise}>
                            {slot.exerciseId ? getExerciseName(slot.exerciseId, lang) : t('routineBuilder.slotEmpty')}
                          </ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={GREEN} />
                      </Pressable>
                    ))
                  )}
                </ThemedView>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Picker de ejercicio por slot (Fase E) */}
      <ChangeExerciseModal
        visible={slotModal.visible}
        currentExerciseId={slotModal.currentExerciseId}
        muscleGroup={slotModal.muscleGroup}
        userEquipment={equipmentForModal}
        isGym={isGymForModal}
        lang={lang}
        changeExTitle={t('tabs.training.changeExTitle')}
        noAlternativesText={t('tabs.training.noAlternatives')}
        onClose={() => setSlotModal(m => ({ ...m, visible: false }))}
        onSelect={async (newId) => {
          await setSlotExercise(slotModal.slotId, newId);
          setSlotModal(m => ({ ...m, visible: false }));
          await reloadTemplate();
        }}
        onRemove={async () => {
          await setSlotExercise(slotModal.slotId, null);
          await reloadTemplate();
        }}
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
  content: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.five, gap: Spacing.three },
  contextPrompt: { fontSize: 13, marginTop: Spacing.one },
  contextRow: { flexDirection: 'row', gap: Spacing.two },
  contextChip: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  contextChipActive: { borderColor: '#3FBF7F33' },
  contextChipText: { fontSize: 14 },
  loading: { marginTop: Spacing.five },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: Spacing.five, lineHeight: 20 },
  dayBlock: { gap: Spacing.one },
  dayTitle: { fontSize: 15 },
  dayCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  emptySlotsText: { fontSize: 13 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFFFFF12',
  },
  slotTextWrap: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: Spacing.one },
  slotMuscle: { fontSize: 14 },
  slotExercise: { fontSize: 13 },
});
