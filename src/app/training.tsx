import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VulcanSymbol } from '@/components/icons/VulcanSymbol';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { ChangeExerciseModal } from '@/components/workout/ChangeExerciseModal';
import { useWorkoutStore, type StoredPlanDay } from '@/store/workout.store';
import { useSessionStore } from '@/store/session.store';
import { useProfileStore } from '@/store/profile.store';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getExerciseName } from '@/lib/exercises';
import { getExerciseTargetsForPlan } from '@/lib/progression';
import type { PlannedExercise } from '@/lib/plan-generator';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';

const DAY_ICONS: Record<string, string> = {
  push: 'arrow-up-circle-outline', pull: 'arrow-down-circle-outline',
  legs: 'walk-outline', upper: 'body-outline',
  lower: 'footsteps-outline', full_body: 'infinite-outline',
};

function normalizeLang(lang: string): 'es' | 'en' | 'fr' {
  if (lang.startsWith('es')) return 'es';
  if (lang.startsWith('fr')) return 'fr';
  return 'en';
}

function parseEquipment(raw?: string): string[] {
  try { return JSON.parse(raw ?? '[]') as string[]; } catch { return []; }
}

function estimateDuration(exercises: PlannedExercise[]): number {
  return Math.round(exercises.reduce((sum, ex) => sum + ex.sets * (45 + ex.restSeconds), 0) / 60);
}

function countSets(exercises: PlannedExercise[]): number {
  return exercises.reduce((sum, ex) => sum + ex.sets, 0);
}

// ── Tarjeta de día condensada (ciclo / días que no son hoy) ──────────────────

interface OtherDayCardProps {
  day: StoredPlanDay;
  index: number;
  total: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChangeEx: (exIdx: number) => void;
  lang: 'es' | 'en' | 'fr';
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function OtherDayCard({ day, index, total, isExpanded, onToggle, onChangeEx, lang, t }: OtherDayCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.otherDayCard}>
      <Pressable onPress={onToggle} style={styles.otherDayHeader}>
        <View style={styles.otherDayLeft}>
          <Ionicons name={(DAY_ICONS[day.dayType] ?? 'barbell-outline') as any} size={18} color={MUTED} />
          <ThemedText themeColor="textSecondary" style={styles.otherDayName}>
            {t(`workout.days.${day.dayType}`)}
          </ThemedText>
        </View>
        <View style={styles.otherDayRight}>
          <ThemedText themeColor="textSecondary" style={styles.otherDayIndex}>
            {t('workout.planDay', { current: index + 1, total })}
          </ThemedText>
          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
        </View>
      </Pressable>
      {isExpanded && (
        <View style={styles.otherDayExList}>
          {day.exercises.map((ex, i) => (
            <View key={`${ex.exerciseId}-${i}`} style={[styles.otherDayExRow, i > 0 && styles.otherDayExBorder]}>
              <ThemedText themeColor="textSecondary" style={styles.otherDayExName} numberOfLines={1}>
                {ex.sets}× {getExerciseName(ex.exerciseId, lang)}
              </ThemedText>
              <Pressable
                onPress={() => onChangeEx(i)}
                style={({ pressed }) => [styles.miniChangeBtn, pressed && { opacity: 0.6 }]}
              >
                <ThemedText style={styles.miniChangeBtnText}>{t('tabs.training.changeEx')}</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ThemedView>
  );
}

// ── TrainingScreen ────────────────────────────────────────────────────────────

export default function TrainingScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useProfileStore();
  const {
    currentPlan, isLoaded, isGenerating,
    loadCurrentPlan, generateAndSavePlan, replaceExercise,
  } = useWorkoutStore();
  const startSession = useSessionStore(s => s.startSession);

  const [expandedOtherDay, setExpandedOtherDay] = useState<number | null>(null);
  const [changeModal, setChangeModal] = useState({
    visible: false, dayDbId: 0, exIdx: 0, exId: '',
  });
  // targetMap: exerciseId → { weightKg, reason } del sistema de progresión
  const [targetMap, setTargetMap] = useState<Record<string, { weightKg: number | null; reason: string | null }>>({});
  const [isStarting, setIsStarting] = useState(false);

  const lang      = normalizeLang(i18n.language);
  const equipment = parseEquipment(profile?.equipment);
  const isGym     = profile?.location === 'gym' || profile?.location === 'both';

  const bwLabel = lang === 'es' ? 'Peso corporal' : lang === 'fr' ? 'Poids du corps' : 'Bodyweight';

  useEffect(() => { loadCurrentPlan(); }, []);

  // Carga los targets de progresión del plan activo
  useEffect(() => {
    if (!currentPlan) return;
    (async () => {
      const targets = await getExerciseTargetsForPlan(currentPlan.id);
      const map: Record<string, { weightKg: number | null; reason: string | null }> = {};
      for (const t of targets) {
        map[t.exerciseId] = {
          weightKg: t.targetWeightKg ?? null,
          reason:   t.progressionReason ?? null,
        };
      }
      setTargetMap(map);
    })();
  }, [currentPlan?.id, currentPlan?.activeDayIndex]);

  async function handleStart() {
    if (!currentPlan) return;
    const activeIdx = currentPlan.activeDayIndex % currentPlan.days.length;
    const today     = currentPlan.days[activeIdx];
    console.log('[Training] handleStart — planId:', currentPlan.id, 'day:', today.dayType, 'exercises:', today.exercises.length);
    setIsStarting(true);
    try {
      await startSession(currentPlan.id, today);
      console.log('[Training] startSession OK — isActive=true, overlay aparecerá');
    } catch (err) {
      console.error('[Training] startSession ERROR:', err);
      Alert.alert('Error al iniciar', String(err instanceof Error ? err.message : err));
    } finally {
      setIsStarting(false);
    }
  }

  function handleRegen() {
    Alert.alert(
      t('tabs.training.regen'),
      t('tabs.training.regenConfirm'),
      [
        { text: t('tabs.training.regenCancel'), style: 'cancel' },
        {
          text: t('tabs.training.regenOk'),
          style: 'destructive',
          onPress: () => profile && generateAndSavePlan(profile),
        },
      ],
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!isLoaded) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <ActivityIndicator size="large" color={GREEN} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Sin plan ─────────────────────────────────────────────────────────────────
  if (!currentPlan) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <VulcanSymbol size={80} />
          <ThemedText type="subtitle" style={styles.noPlanTitle}>{t('workout.noplan.title')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.noPlanSub}>{t('workout.noplan.subtitle')}</ThemedText>
          <Pressable
            style={[styles.genBtn, isGenerating && styles.genBtnDisabled]}
            onPress={() => profile && generateAndSavePlan(profile)}
            disabled={isGenerating || !profile}
          >
            {isGenerating
              ? <ActivityIndicator size="small" color="#04261A" />
              : <ThemedText style={styles.genBtnText}>{t('workout.noplan.button')}</ThemedText>
            }
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Plan activo ──────────────────────────────────────────────────────────────
  const activeIdx  = currentPlan.activeDayIndex % currentPlan.days.length;
  const today      = currentPlan.days[activeIdx];
  const otherDays  = currentPlan.days.filter((_, i) => i !== activeIdx);
  const estMin     = estimateDuration(today.exercises);
  const totalSets_ = countSets(today.exercises);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Plan header ── */}
          <View style={styles.planHeader}>
            <View style={styles.planHeaderLeft}>
              <ThemedText type="defaultSemiBold" style={styles.planHeaderTitle}>
                {t('tabs.training.cycle')}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.planHeaderSub}>
                {currentPlan.daysPerWeek} {t('tabs.today.daysWeek').toLowerCase()} · {currentPlan.minutesPerSession} min
              </ThemedText>
            </View>
            <Pressable onPress={handleRegen} disabled={isGenerating} style={styles.regenBtn}>
              <ThemedText style={styles.regenBtnText}>{t('tabs.training.regen')}</ThemedText>
            </Pressable>
          </View>

          {/* ── Cabecera del día activo ── */}
          <ThemedView type="backgroundElement" style={styles.dayHeader}>
            <View style={styles.dayHeaderLeft}>
              <View style={styles.todayBadge}>
                <ThemedText style={styles.todayBadgeText}>{t('tabs.training.todayLabel')}</ThemedText>
              </View>
              <Ionicons name={(DAY_ICONS[today.dayType] ?? 'barbell-outline') as any} size={20} color={GREEN} />
              <ThemedText type="defaultSemiBold" style={styles.dayName}>
                {t(`workout.days.${today.dayType}`)}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.dayCounter}>
                {t('workout.planDay', { current: activeIdx + 1, total: currentPlan.days.length })}
              </ThemedText>
            </View>
            <View style={styles.dayStats}>
              <View style={styles.statChip}>
                <Ionicons name="time-outline" size={13} color={AMBER} />
                <ThemedText style={styles.statChipText}>~{estMin} min</ThemedText>
              </View>
              <View style={styles.statChip}>
                <Ionicons name="layers-outline" size={13} color={AMBER} />
                <ThemedText style={styles.statChipText}>{totalSets_} series</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* ── Tarjetas de ejercicios ── */}
          {today.exercises.map((ex, i) => (
            <ExerciseCard
              key={`${ex.exerciseId}-${i}`}
              plannedEx={ex}
              lastWeightKg={targetMap[ex.exerciseId]?.weightKg ?? null}
              progressionReason={targetMap[ex.exerciseId]?.reason ?? null}
              lang={lang}
              bodyweightLabel={bwLabel}
              onChangeExercise={() => setChangeModal({
                visible: true,
                dayDbId: today.dbId,
                exIdx:   i,
                exId:    ex.exerciseId,
              })}
            />
          ))}

          {/* ── Botón INICIAR ── */}
          <Pressable
            style={[styles.startBtn, isStarting && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={isStarting}
          >
            {isStarting
              ? <ActivityIndicator size="small" color="#04261A" />
              : (
                <>
                  <Ionicons name="play-circle" size={24} color="#04261A" />
                  <ThemedText style={styles.startBtnText}>{t('workout.startWorkout')}</ThemedText>
                </>
              )
            }
          </Pressable>

          {/* ── Tu ciclo (otros días) ── */}
          {otherDays.length > 0 && (
            <>
              <View style={styles.sectionDivider}>
                <View style={styles.divLine} />
                <ThemedText themeColor="textSecondary" style={styles.divLabel}>
                  {t('tabs.training.cycle')}
                </ThemedText>
                <View style={styles.divLine} />
              </View>

              {currentPlan.days.map((day, rawIdx) => {
                if (rawIdx === activeIdx) return null;
                const isExpanded = expandedOtherDay === rawIdx;
                return (
                  <OtherDayCard
                    key={day.dbId}
                    day={day}
                    index={rawIdx}
                    total={currentPlan.days.length}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedOtherDay(isExpanded ? null : rawIdx)}
                    onChangeEx={(exIdx) => setChangeModal({
                      visible: true,
                      dayDbId: day.dbId,
                      exIdx,
                      exId:    day.exercises[exIdx].exerciseId,
                    })}
                    lang={lang}
                    t={t as any}
                  />
                );
              })}

              {currentPlan.daysPerWeek < 7 && (
                <View style={styles.restRow}>
                  <View style={styles.restLine} />
                  <ThemedText themeColor="textSecondary" style={styles.restText}>
                    {t('tabs.training.restDays', { n: 7 - currentPlan.daysPerWeek })}
                  </ThemedText>
                  <View style={styles.restLine} />
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Modal cambiar ejercicio ── */}
      <ChangeExerciseModal
        visible={changeModal.visible}
        currentExerciseId={changeModal.exId}
        userEquipment={equipment}
        isGym={isGym}
        lang={lang}
        changeExTitle={t('tabs.training.changeExTitle')}
        noAlternativesText={t('tabs.training.noAlternatives')}
        onClose={() => setChangeModal(m => ({ ...m, visible: false }))}
        onSelect={(newId) => {
          replaceExercise(changeModal.dayDbId, changeModal.exIdx, newId);
          setChangeModal(m => ({ ...m, visible: false }));
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1 },
  safe:    { flex: 1 },
  centered: {
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.three, paddingHorizontal: Spacing.four,
  },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },

  // No plan
  noPlanTitle: { textAlign: 'center', marginTop: Spacing.three },
  noPlanSub:   { textAlign: 'center', lineHeight: 22, fontSize: 14 },
  genBtn:      {
    backgroundColor: GREEN, borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    marginTop: Spacing.two, minWidth: 200, alignItems: 'center',
  },
  genBtnDisabled: { opacity: 0.6 },
  genBtnText:     { color: '#04261A', fontSize: 16, fontWeight: '700' },

  // Plan header
  planHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  planHeaderLeft:  { gap: 2 },
  planHeaderTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  planHeaderSub:   { fontSize: 13 },
  regenBtn:        {
    borderWidth: 1, borderColor: MUTED + '44',
    borderRadius: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: 4,
  },
  regenBtnText: { fontSize: 12, color: MUTED },

  // Day header
  dayHeader: {
    borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: GREEN + '88',
  },
  dayHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  todayBadge: {
    backgroundColor: GREEN + '22', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: GREEN + '55',
  },
  todayBadgeText: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 0.5 },
  dayName:    { fontSize: 15, fontWeight: '600', color: GREEN },
  dayCounter: { fontSize: 13 },
  dayStats:   { flexDirection: 'row', gap: Spacing.two },
  statChip:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statChipText: { fontSize: 13, color: AMBER },

  // Iniciar
  startBtn: {
    backgroundColor: GREEN, borderRadius: Spacing.three,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, paddingVertical: Spacing.three + 2,
    minHeight: 56,
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText:     { color: '#04261A', fontSize: 17, fontWeight: '700' },

  // Cycle section
  sectionDivider: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
  },
  divLine:  { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: MUTED + '44' },
  divLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },

  // Other day cards
  otherDayCard:    { borderRadius: Spacing.three, overflow: 'hidden' },
  otherDayHeader:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.three,
  },
  otherDayLeft:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  otherDayRight:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  otherDayName:    { fontSize: 14 },
  otherDayIndex:   { fontSize: 13 },
  otherDayExList:  { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  otherDayExRow:   {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, gap: Spacing.two,
  },
  otherDayExBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#FFFFFF12' },
  otherDayExName:   { flex: 1, fontSize: 13 },
  miniChangeBtn:    {
    paddingHorizontal: Spacing.two, paddingVertical: 3,
    borderRadius: Spacing.one, borderWidth: 1, borderColor: GREEN + '44',
  },
  miniChangeBtnText: { fontSize: 11, color: GREEN },

  // Rest indicator
  restRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  restLine:{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: MUTED + '44' },
  restText:{ fontSize: 12 },
});
