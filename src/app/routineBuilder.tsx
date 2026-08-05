import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { useProfileStore } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { Spacing } from '@/constants/theme';
import { EXERCISES, getExerciseName, type Exercise, type MuscleGroup } from '@/lib/exercises';
import type { Profile } from '@/db/schema';
import { muscleLabel } from '@/components/workout/ExerciseCard';
import { ChangeExerciseModal } from '@/components/workout/ChangeExerciseModal';
import { estimateDuration } from '@/app/training';
import {
  getSplit,
  getProfileSignals,
  canDoExercise,
  computeExerciseCounts,
  getCardioSlots,
  type DayType,
  type GoalKey,
} from '@/lib/plan-generator';
import { buildExercisesFromTemplateDay } from '@/lib/routineMaterializer';
import { useAndroidBack } from '@/hooks/use-android-back';
import {
  selectCardio,
  createCardioCycleState,
  type PlannedCardioBlock,
  type CardioPlan,
  type HomeCardioSession,
} from '@/lib/cardioSelection';
import {
  getTemplate,
  createTemplate,
  setSlotExercise,
  addSlot,
  removeSlot,
  setTemplateCardio,
  type TemplateContext,
  type BuilderDayType,
  type RoutineTemplateDay,
} from '@/lib/routineTemplates';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';

// Días que el constructor manual admite hoy — upper/lower quedan dormidos
// (mismo DayType del generador automático, ver CLAUDE.md "Constructor de
// rutina propia"). getSplit() nunca devuelve upper/lower para 1-7 días; este
// filtro es solo por seguridad de tipos, no porque hoy pueda pasar de verdad.
const BUILDER_DAY_TYPES = new Set<BuilderDayType>(['push', 'pull', 'legs', 'full_body']);
function toBuilderDayType(d: DayType): BuilderDayType {
  return BUILDER_DAY_TYPES.has(d as BuilderDayType) ? (d as BuilderDayType) : 'full_body';
}

// Orden A — mismo orden ya repetido en exercises.ts (MuscleGroup /
// MUSCLE_GROUP_VALUES) y en ExerciseCard.tsx (MUSCLE_LABELS). Cubre los 15
// valores, sin restricción por tipo de día — libertad total al añadir un slot.
const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps',
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
  'lats', 'traps', 'forearms', 'abs', 'adductors',
];

// Mismo pool que selectGymCardio() en cardioSelection.ts — los 5 ejercicios
// de cardio de máquina de gimnasio, para el picker del bloque nuevo.
const GYM_CARDIO_EXERCISES = EXERCISES.filter(e => e.category === 'cardio' && e.equipment.includes('cardioMachine'));

// Lee los bloques de cardio propio de gimnasio ya guardados en la plantilla.
// day.cardio null = todavía usa el cardio automático (centinela de
// routineTemplates.cardio, distinto del '[]' de plan_days.cardio).
function getGymCardioBlocks(day: RoutineTemplateDay): PlannedCardioBlock[] {
  if (!day.cardio) return [];
  return (JSON.parse(day.cardio) as CardioPlan).gym;
}

function cardioMinutesKey(day: RoutineTemplateDay, blockIdx: number): string {
  return `${day.id}-${blockIdx}`;
}

// Pool de cardio de casa para el picker — mismo criterio que
// selectHomeCardioSessions() en cardioSelection.ts, pero sin dislikedIds
// (el constructor da libertad total, igual que getExercisesByMuscleGroup/
// getAlternatives). Función, no constante: depende del equipamiento real del
// perfil, a diferencia de GYM_CARDIO_EXERCISES (isGym=true siempre disponible).
function getHomeCardioExercises(equipment: string[]): Exercise[] {
  return EXERCISES.filter(e => e.category === 'cardio' && !e.equipment.includes('cardioMachine') && canDoExercise(e, equipment, false));
}

// Lee las sesiones de cardio propio de casa ya guardadas en la plantilla.
function getHomeCardioSessions(day: RoutineTemplateDay): HomeCardioSession[] {
  if (!day.cardio) return [];
  return (JSON.parse(day.cardio) as CardioPlan).homeSessions;
}

// El descanso entre sesiones nunca se edita a mano aquí (solo en vivo, en
// session.tsx) — se recalcula siempre que se guarda: 90s todas menos la
// última, 0 en la última.
function withRecalculatedRest(sessions: HomeCardioSession[]): HomeCardioSession[] {
  return sessions.map((s, i) => ({ ...s, restAfterSeconds: i < sessions.length - 1 ? 90 : 0 }));
}

function homeCardioSecondsKey(day: RoutineTemplateDay, sessionIdx: number, blockIdx: number): string {
  return `${day.id}-${sessionIdx}-${blockIdx}`;
}

// Mismo criterio que routineMaterializer.ts (reutiliza buildExercisesFromTemplateDay,
// ya no duplica la lógica): solo slots con exerciseId ya asignado aportan al
// cálculo. Slots vacíos no aportan nada todavía.
function estimateDayDuration(day: RoutineTemplateDay, profile: Profile | null): number {
  if (!profile) return 0;
  const exercises = buildExercisesFromTemplateDay(day, profile);
  return estimateDuration(exercises);
}

// Picker de músculo para un slot nuevo (Fase F) — modal ligero, sin estado
// propio más allá de lo que le pasan por props.
function MusclePickerModal({
  visible,
  title,
  lang,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  lang: 'es' | 'en' | 'fr';
  onClose: () => void;
  onSelect: (m: MuscleGroup) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.pickerRoot}>
        <View style={styles.pickerHeader}>
          <ThemedText type="subtitle" style={styles.pickerHeaderTitle}>{title}</ThemedText>
          <Pressable onPress={onClose} hitSlop={16}>
            <Ionicons name="close" size={24} color="#9DA89F" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.pickerList}>
          {ALL_MUSCLE_GROUPS.map((m) => (
            <Pressable key={m} style={styles.pickerRow} onPress={() => onSelect(m)}>
              <ThemedText style={styles.pickerRowText}>{muscleLabel(m, lang)}</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={GREEN} />
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

// Picker de ejercicio de cardio para un bloque nuevo — mismo patrón que
// MusclePickerModal. exercises viene por prop (gimnasio pasa
// GYM_CARDIO_EXERCISES tal cual; casa pasa getHomeCardioExercises(equipment)).
function CardioExercisePickerModal({
  visible,
  title,
  lang,
  exercises,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  lang: 'es' | 'en' | 'fr';
  exercises: Exercise[];
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.pickerRoot}>
        <View style={styles.pickerHeader}>
          <ThemedText type="subtitle" style={styles.pickerHeaderTitle}>{title}</ThemedText>
          <Pressable onPress={onClose} hitSlop={16}>
            <Ionicons name="close" size={24} color="#9DA89F" />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.pickerList}>
          {exercises.map((e) => (
            <Pressable key={e.id} style={styles.pickerRow} onPress={() => onSelect(e.id)}>
              <ThemedText style={styles.pickerRowText}>{getExerciseName(e.id, lang)}</ThemedText>
              <Ionicons name="chevron-forward" size={18} color={GREEN} />
            </Pressable>
          ))}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

export default function RoutineBuilderScreen() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith('fr') ? 'fr' : i18n.language.startsWith('es') ? 'es' : 'en') as 'es' | 'en' | 'fr';
  const isDbReady = useProfileStore(s => s.isDbReady);
  const profile = useProfileStore(s => s.profile);
  const currentPlan = useWorkoutStore(s => s.currentPlan);
  const isGenerating = useWorkoutStore(s => s.isGenerating);

  useAndroidBack(true, () => useProfileStore.getState().closeRoutineBuilder());

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
  const [addSlotDay, setAddSlotDay] = useState<RoutineTemplateDay | null>(null);
  const [cardioPickerDay, setCardioPickerDay] = useState<RoutineTemplateDay | null>(null);
  // Texto en edición de los minutos de un bloque de cardio, por día+índice
  // (mismo patrón que gymInputStr en session.tsx, pero indexado también por
  // día porque aquí coexisten varios días a la vez en pantalla).
  const [cardioMinutesInput, setCardioMinutesInput] = useState<Record<string, string>>({});
  // Cardio propio de casa (Sub-fase 3) — target del picker (día + sesión a la
  // que añadir el bloque; sessionIdx=null crea una sesión nueva) y texto en
  // edición de los segundos de un bloque, por día+sesión+índice.
  const [homeCardioPickerTarget, setHomeCardioPickerTarget] = useState<{ day: RoutineTemplateDay; sessionIdx: number | null } | null>(null);
  const [homeCardioSecondsInput, setHomeCardioSecondsInput] = useState<Record<string, string>>({});
  // dayIndex → true si el último intento de sincronizar ese día se saltó por
  // ya tener una sesión registrada este ciclo (bug 2). Solo en memoria, no se
  // persiste — se recalcula en cada syncIfActive() y se limpia sola si un
  // día deja de estar saltado (ej. tras activar un ciclo nuevo).
  const [skippedWarningDays, setSkippedWarningDays] = useState<Set<number>>(new Set());
  // Punto 4 — "Volver al plan automático": antes vivía solo en Perfil, ahora
  // también aquí (y en Entreno) para que esté visible justo donde el
  // usuario está gestionando su rutina propia.
  const [backToAutoOpen, setBackToAutoOpen] = useState(false);

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

  // Sincroniza el plan manual de este contexto (Fase G2) — solo tiene efecto
  // real si ya está activo (syncManualPlanIfActive lo comprueba internamente);
  // si el usuario está editando un contexto que no está corriendo, es un
  // no-op silencioso. Señales frescas en cada llamada, sin cachear en estado
  // del componente (mismo criterio que activateManualPlan más abajo).
  // dayIndex: el día cuyo slot se acaba de editar — si viene en
  // skippedDayIndexes, ese día ya se entrenó este ciclo y el cambio no se
  // reflejará hasta el próximo (bug 2); se avisa con un banner local.
  async function syncIfActive(dayIndex: number, forceCardioRefreshDayIndex?: number) {
    if (!profile) return;
    const signals = await getProfileSignals(profile);
    const result = await useWorkoutStore.getState().syncManualPlanIfActive(context, profile, signals.equipment, signals.dislikedIds, forceCardioRefreshDayIndex);
    setSkippedWarningDays(prev => {
      const next = new Set(prev);
      if (result.skippedDayIndexes.includes(dayIndex)) next.add(dayIndex);
      else next.delete(dayIndex);
      return next;
    });
  }

  // Resuelve a qué día pertenece un slot ya existente (para el modal de
  // cambiar/quitar ejercicio, que solo conoce el slotId, no el día).
  function findDayIndexForSlot(slotId: number): number | null {
    const day = days?.find(d => d.slots.some(s => s.id === slotId));
    return day ? day.dayIndex : null;
  }

  const isActiveForContext = currentPlan?.source === 'manual' && currentPlan?.context === context;

  async function handleActivate() {
    if (!profile) return;
    const signals = await getProfileSignals(profile);
    await useWorkoutStore.getState().activateManualPlan(context, profile, signals.equipment, signals.dislikedIds);
  }

  async function handleBackToAuto() {
    setBackToAutoOpen(false);
    if (!profile) return;
    await useWorkoutStore.getState().backToAutoPlan(profile);
  }

  // ── Cardio propio de gimnasio (Sub-fase 2) ──────────────────────────────────
  // forceCardioRefreshDayIndex=day.dayIndex en las 4 llamadas: el cardio
  // recién guardado en la plantilla ya no es la primera materialización de
  // este día (en modo manual las filas de plan_days se reutilizan entre
  // ciclos), así que sin este flag needsCardio no volvería a ser true y el
  // cambio nunca se reflejaría en Entreno (ver Sub-fase 1).
  async function addCardioBlock(day: RoutineTemplateDay, exerciseId: string) {
    const current = getGymCardioBlocks(day);
    const updated: CardioPlan = { gym: [...current, { exerciseId, durationSeconds: 600 }], homeSessions: [] };
    await setTemplateCardio(day.id, updated);
    setCardioPickerDay(null);
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  async function removeCardioBlock(day: RoutineTemplateDay, blockIdx: number) {
    const current = getGymCardioBlocks(day);
    const filtered = current.filter((_, i) => i !== blockIdx);
    await setTemplateCardio(day.id, filtered.length === 0 ? null : { gym: filtered, homeSessions: [] });
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  async function updateCardioBlockMinutes(day: RoutineTemplateDay, blockIdx: number, minutes: number) {
    const current = getGymCardioBlocks(day);
    const updated = current.map((b, i) => i === blockIdx ? { ...b, durationSeconds: minutes * 60 } : b);
    await setTemplateCardio(day.id, { gym: updated, homeSessions: [] });
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  async function revertToAutoCardio(day: RoutineTemplateDay) {
    await setTemplateCardio(day.id, null);
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  // Valida el texto de minutos igual que applyGymInput en session.tsx (rango
  // 1-60): si es válido, persiste; si no, revierte el texto al valor real
  // guardado, sin tocar la DB.
  function applyCardioMinutes(day: RoutineTemplateDay, blockIdx: number) {
    const key = cardioMinutesKey(day, blockIdx);
    const v = parseInt(cardioMinutesInput[key] ?? '', 10);
    if (v >= 1 && v <= 60) {
      updateCardioBlockMinutes(day, blockIdx, v);
    } else {
      const current = getGymCardioBlocks(day)[blockIdx];
      setCardioMinutesInput(prev => ({ ...prev, [key]: String(Math.round((current?.durationSeconds ?? 600) / 60)) }));
    }
  }

  // ── Cardio propio de casa (Sub-fase 3) ──────────────────────────────────────
  // Mismo motivo del forceCardioRefreshDayIndex que en gimnasio (ver arriba).
  async function addHomeCardioBlock(day: RoutineTemplateDay, sessionIdx: number | null, exerciseId: string) {
    const exercise = EXERCISES.find(e => e.id === exerciseId);
    const durationSeconds = exercise?.defaultDurationSeconds ?? 30;
    const sessions = getHomeCardioSessions(day);
    const updatedSessions: HomeCardioSession[] = sessionIdx === null
      ? [...sessions, { blocks: [{ exerciseId, durationSeconds }], restAfterSeconds: 0 }]
      : sessions.map((s, i) => i === sessionIdx ? { ...s, blocks: [...s.blocks, { exerciseId, durationSeconds }] } : s);
    await setTemplateCardio(day.id, { gym: [], homeSessions: withRecalculatedRest(updatedSessions) });
    setHomeCardioPickerTarget(null);
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  async function removeHomeCardioBlock(day: RoutineTemplateDay, sessionIdx: number, blockIdx: number) {
    const sessions = getHomeCardioSessions(day);
    const updatedSessions = sessions
      .map((s, i) => i === sessionIdx ? { ...s, blocks: s.blocks.filter((_, bi) => bi !== blockIdx) } : s)
      .filter(s => s.blocks.length > 0);
    await setTemplateCardio(day.id, updatedSessions.length === 0 ? null : { gym: [], homeSessions: withRecalculatedRest(updatedSessions) });
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  async function updateHomeCardioBlockSeconds(day: RoutineTemplateDay, sessionIdx: number, blockIdx: number, seconds: number) {
    const sessions = getHomeCardioSessions(day);
    const updatedSessions = sessions.map((s, i) => i === sessionIdx
      ? { ...s, blocks: s.blocks.map((b, bi) => bi === blockIdx ? { ...b, durationSeconds: seconds } : b) }
      : s);
    await setTemplateCardio(day.id, { gym: [], homeSessions: withRecalculatedRest(updatedSessions) });
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  // Valida el texto de segundos (rango 5-600): si es válido, persiste; si no,
  // revierte el texto al valor real guardado, sin tocar la DB.
  function applyHomeCardioSeconds(day: RoutineTemplateDay, sessionIdx: number, blockIdx: number) {
    const key = homeCardioSecondsKey(day, sessionIdx, blockIdx);
    const v = parseInt(homeCardioSecondsInput[key] ?? '', 10);
    if (v >= 5 && v <= 600) {
      updateHomeCardioBlockSeconds(day, sessionIdx, blockIdx, v);
    } else {
      const current = getHomeCardioSessions(day)[sessionIdx]?.blocks[blockIdx];
      setHomeCardioSecondsInput(prev => ({ ...prev, [key]: String(current?.durationSeconds ?? 30) }));
    }
  }

  // Siembra inicial con el motor real (gimnasio y casa) — una sola vez, sin
  // coordinación de variedad entre días (es un punto de partida editable
  // para ESTE día, no una generación semanal). El usuario sigue editando
  // desde ahí con el resto de herramientas ya existentes.
  async function generateAutoCardioSeed(day: RoutineTemplateDay, isGymContext: boolean) {
    if (!profile) return;
    const counts = computeExerciseCounts(profile.minutesPerSession, profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
    const totalSlots = counts.compounds + counts.isolations;
    const cardioSlots = getCardioSlots(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null, totalSlots);
    const seed = selectCardio(cardioSlots, equipmentForModal, isGymContext, new Set(), createCardioCycleState());
    await setTemplateCardio(day.id, seed);
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
  }

  // Duplica los bloques de la última sesión de casa tal cual, como sesión
  // nueva al final — solo casa, mismo recálculo de descanso de siempre.
  async function duplicateLastHomeSession(day: RoutineTemplateDay) {
    const sessions = getHomeCardioSessions(day);
    if (sessions.length === 0) return;
    const last = sessions[sessions.length - 1];
    const duplicated: HomeCardioSession = { blocks: last.blocks.map(b => ({ ...b })), restAfterSeconds: 0 };
    await setTemplateCardio(day.id, { gym: [], homeSessions: withRecalculatedRest([...sessions, duplicated]) });
    await reloadTemplate();
    await syncIfActive(day.dayIndex, day.dayIndex);
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
            profile.goalPrimary as GoalKey,
            profile.goalSecondary as GoalKey | null,
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
          {currentPlan?.source === 'manual' && (
            <Pressable
              style={styles.backToAutoBtn}
              onPress={() => setBackToAutoOpen(true)}
            >
              <ThemedText style={styles.backToAutoBtnText}>{t('routineBuilder.backToAutoLink')}</ThemedText>
            </Pressable>
          )}

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

          {days !== null && days.length > 0 && (
            <View style={styles.activateRow}>
              {isActiveForContext ? (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={GREEN} />
                  <ThemedText style={styles.activeBadgeText}>{t('routineBuilder.activeBadge')}</ThemedText>
                </View>
              ) : currentPlan?.source === 'manual' ? (
                // Ya hay un ancla manual activa en el OTRO contexto (Punto 1 —
                // rutina ancla): esta plantilla se usa como sustituto completo
                // cuando el usuario entrena aquí, sin necesidad de activarla.
                <ThemedText themeColor="textSecondary" style={styles.autoSubstituteText}>
                  {t('routineBuilder.autoSubstituteNote')}
                </ThemedText>
              ) : (
                <Pressable
                  style={[styles.activateBtn, isGenerating && styles.activateBtnDisabled]}
                  onPress={handleActivate}
                  disabled={isGenerating}
                >
                  {isGenerating
                    ? <ActivityIndicator size="small" color="#04261A" />
                    : <ThemedText style={styles.activateBtnText}>{t('routineBuilder.activateBtn')}</ThemedText>
                  }
                </Pressable>
              )}
            </View>
          )}

          {days === null ? (
            <ActivityIndicator color={GREEN} style={styles.loading} />
          ) : days.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {t('routineBuilder.emptySlots')}
            </ThemedText>
          ) : (
            days.map((day, dayIdx) => {
              const estMin = estimateDayDuration(day, profile);
              return (
                <View key={day.id} style={styles.dayBlock}>
                  <ThemedText type="defaultSemiBold" style={styles.dayTitle}>
                    {dayIdx + 1}. {t(`workout.days.${day.dayType}`)}
                    {estMin > 0 ? ` · ~${estMin} ${t('workout.session.minutesAbbrev')}` : ''}
                  </ThemedText>
                  <ThemedView type="backgroundElement" style={styles.dayCard}>
                    {day.slots.length === 0 ? (
                      <ThemedText themeColor="textSecondary" style={styles.emptySlotsText}>
                        {t('routineBuilder.emptySlots')}
                      </ThemedText>
                    ) : (
                      day.slots.map((slot) => (
                        <View key={slot.id} style={styles.slotRow}>
                          <Pressable
                            style={styles.slotMainPressable}
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
                          <Pressable
                            style={styles.slotDeleteBtn}
                            hitSlop={8}
                            onPress={async () => { await removeSlot(slot.id); await reloadTemplate(); await syncIfActive(day.dayIndex); }}
                          >
                            <Ionicons name="trash-outline" size={18} color={AMBER} />
                          </Pressable>
                        </View>
                      ))
                    )}
                    <Pressable style={styles.addSlotRow} onPress={() => setAddSlotDay(day)} hitSlop={8}>
                      <Ionicons name="add-circle-outline" size={22} color={GREEN} />
                    </Pressable>
                  </ThemedView>

                  {/* Cardio propio (Sub-fase 2 gimnasio, Sub-fase 3 casa) */}
                  {context === 'gym' ? (() => {
                    const cardioBlocks = getGymCardioBlocks(day);
                    return (
                      <View style={styles.cardioSection}>
                        <ThemedText type="defaultSemiBold" style={styles.dayTitle}>
                          {t('routineBuilder.cardioSectionTitle')}
                        </ThemedText>
                        <ThemedView type="backgroundElement" style={styles.dayCard}>
                          {cardioBlocks.length === 0 ? (
                            <>
                              <ThemedText themeColor="textSecondary" style={styles.emptySlotsText}>
                                {t('routineBuilder.cardioAutoNote')}
                              </ThemedText>
                              <View style={styles.cardioEmptyActionsRow}>
                                <Pressable style={[styles.addSlotRow, styles.cardioEmptyActionFlex]} onPress={() => setCardioPickerDay(day)} hitSlop={8}>
                                  <Ionicons name="add-circle-outline" size={22} color={GREEN} />
                                </Pressable>
                                <Pressable
                                  style={[styles.cardioGenerateAutoBtn, styles.cardioEmptyActionFlex]}
                                  onPress={() => generateAutoCardioSeed(day, true)}
                                >
                                  <ThemedText style={styles.cardioGenerateAutoBtnText}>{t('routineBuilder.cardioGenerateAutoBtn')}</ThemedText>
                                </Pressable>
                              </View>
                            </>
                          ) : (
                            <>
                              <Pressable style={styles.cardioBackToAutoBtn} onPress={() => revertToAutoCardio(day)}>
                                <ThemedText style={styles.cardioBackToAutoBtnText}>{t('routineBuilder.cardioBackToAutoLink')}</ThemedText>
                              </Pressable>
                              {cardioBlocks.map((block, blockIdx) => {
                                const key = cardioMinutesKey(day, blockIdx);
                                return (
                                  <View key={blockIdx} style={styles.slotRow}>
                                    <View style={styles.slotTextWrap}>
                                      <ThemedText style={styles.slotMuscle}>
                                        {getExerciseName(block.exerciseId, lang)}
                                      </ThemedText>
                                    </View>
                                    <TextInput
                                      style={styles.cardioMinutesInput}
                                      keyboardType="numeric"
                                      value={cardioMinutesInput[key] ?? String(Math.round(block.durationSeconds / 60))}
                                      onChangeText={(text) => setCardioMinutesInput(prev => ({ ...prev, [key]: text }))}
                                      onEndEditing={() => applyCardioMinutes(day, blockIdx)}
                                      onSubmitEditing={() => applyCardioMinutes(day, blockIdx)}
                                      selectTextOnFocus
                                      returnKeyType="done"
                                    />
                                    <ThemedText themeColor="textSecondary" style={styles.cardioMinutesLabel}>
                                      {t('workout.session.minutesAbbrev')}
                                    </ThemedText>
                                    <Pressable
                                      style={styles.slotDeleteBtn}
                                      hitSlop={8}
                                      onPress={() => removeCardioBlock(day, blockIdx)}
                                    >
                                      <Ionicons name="trash-outline" size={18} color={AMBER} />
                                    </Pressable>
                                  </View>
                                );
                              })}
                              <Pressable style={styles.addSlotRow} onPress={() => setCardioPickerDay(day)} hitSlop={8}>
                                <Ionicons name="add-circle-outline" size={22} color={GREEN} />
                              </Pressable>
                            </>
                          )}
                        </ThemedView>
                      </View>
                    );
                  })() : (() => {
                    const homeSessions = getHomeCardioSessions(day);
                    return (
                      <View style={styles.cardioSection}>
                        <ThemedText type="defaultSemiBold" style={styles.dayTitle}>
                          {t('routineBuilder.cardioSectionTitle')}
                        </ThemedText>
                        <ThemedView type="backgroundElement" style={styles.dayCard}>
                          {homeSessions.length === 0 ? (
                            <>
                              <ThemedText themeColor="textSecondary" style={styles.emptySlotsText}>
                                {t('routineBuilder.cardioAutoNote')}
                              </ThemedText>
                              <View style={styles.cardioEmptyActionsRow}>
                                <Pressable style={[styles.addSlotRow, styles.cardioEmptyActionFlex]} onPress={() => setHomeCardioPickerTarget({ day, sessionIdx: null })} hitSlop={8}>
                                  <Ionicons name="add-circle-outline" size={22} color={GREEN} />
                                </Pressable>
                                <Pressable
                                  style={[styles.cardioGenerateAutoBtn, styles.cardioEmptyActionFlex]}
                                  onPress={() => generateAutoCardioSeed(day, false)}
                                >
                                  <ThemedText style={styles.cardioGenerateAutoBtnText}>{t('routineBuilder.cardioGenerateAutoBtn')}</ThemedText>
                                </Pressable>
                              </View>
                            </>
                          ) : (
                            <>
                              <Pressable style={styles.cardioBackToAutoBtn} onPress={() => revertToAutoCardio(day)}>
                                <ThemedText style={styles.cardioBackToAutoBtnText}>{t('routineBuilder.cardioBackToAutoLink')}</ThemedText>
                              </Pressable>
                              {homeSessions.map((session, sessionIdx) => (
                                <View key={sessionIdx} style={styles.homeSessionBlock}>
                                  <ThemedText themeColor="textSecondary" type="defaultSemiBold" style={styles.homeSessionTitle}>
                                    {t('workout.session.sessionLabel', { n: sessionIdx + 1 })}
                                  </ThemedText>
                                  {session.blocks.map((block, blockIdx) => {
                                    const key = homeCardioSecondsKey(day, sessionIdx, blockIdx);
                                    return (
                                      <View key={blockIdx} style={styles.slotRow}>
                                        <View style={styles.slotTextWrap}>
                                          <ThemedText style={styles.slotMuscle}>
                                            {getExerciseName(block.exerciseId, lang)}
                                          </ThemedText>
                                        </View>
                                        <TextInput
                                          style={styles.cardioMinutesInput}
                                          keyboardType="numeric"
                                          value={homeCardioSecondsInput[key] ?? String(block.durationSeconds)}
                                          onChangeText={(text) => setHomeCardioSecondsInput(prev => ({ ...prev, [key]: text }))}
                                          onEndEditing={() => applyHomeCardioSeconds(day, sessionIdx, blockIdx)}
                                          onSubmitEditing={() => applyHomeCardioSeconds(day, sessionIdx, blockIdx)}
                                          selectTextOnFocus
                                          returnKeyType="done"
                                        />
                                        <ThemedText themeColor="textSecondary" style={styles.cardioMinutesLabel}>s</ThemedText>
                                        <Pressable
                                          style={styles.slotDeleteBtn}
                                          hitSlop={8}
                                          onPress={() => removeHomeCardioBlock(day, sessionIdx, blockIdx)}
                                        >
                                          <Ionicons name="trash-outline" size={18} color={AMBER} />
                                        </Pressable>
                                      </View>
                                    );
                                  })}
                                  <Pressable
                                    style={styles.addSlotRowSmall}
                                    onPress={() => setHomeCardioPickerTarget({ day, sessionIdx })}
                                    hitSlop={8}
                                  >
                                    <Ionicons name="add-circle-outline" size={16} color={GREEN} />
                                  </Pressable>
                                </View>
                              ))}
                              <View style={styles.cardioEmptyActionsRow}>
                                <Pressable style={[styles.addSlotRow, styles.cardioEmptyActionFlex]} onPress={() => setHomeCardioPickerTarget({ day, sessionIdx: null })} hitSlop={8}>
                                  <Ionicons name="add-circle-outline" size={22} color={GREEN} />
                                </Pressable>
                                <Pressable
                                  style={[styles.cardioGenerateAutoBtn, styles.cardioEmptyActionFlex]}
                                  onPress={() => duplicateLastHomeSession(day)}
                                >
                                  <ThemedText style={styles.cardioGenerateAutoBtnText}>{t('routineBuilder.cardioDuplicateSessionBtn')}</ThemedText>
                                </Pressable>
                              </View>
                            </>
                          )}
                        </ThemedView>
                      </View>
                    );
                  })()}

                  {skippedWarningDays.has(day.dayIndex) && (
                    <View style={styles.skippedWarning}>
                      <Ionicons name="information-circle-outline" size={14} color={AMBER} />
                      <ThemedText style={styles.skippedWarningText}>
                        {t('routineBuilder.dayAlreadyTrainedWarning')}
                      </ThemedText>
                    </View>
                  )}
                </View>
              );
            })
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
          const dayIndex = findDayIndexForSlot(slotModal.slotId);
          await setSlotExercise(slotModal.slotId, newId);
          setSlotModal(m => ({ ...m, visible: false }));
          await reloadTemplate();
          if (dayIndex !== null) await syncIfActive(dayIndex);
        }}
        onRemove={async () => {
          const dayIndex = findDayIndexForSlot(slotModal.slotId);
          await setSlotExercise(slotModal.slotId, null);
          await reloadTemplate();
          if (dayIndex !== null) await syncIfActive(dayIndex);
        }}
      />

      {/* Picker de músculo para slot nuevo (Fase F) */}
      <MusclePickerModal
        visible={addSlotDay !== null}
        title={t('routineBuilder.addSlotPickerTitle')}
        lang={lang}
        onClose={() => setAddSlotDay(null)}
        onSelect={async (muscleGroup) => {
          if (!addSlotDay) return;
          const dayIndex = addSlotDay.dayIndex;
          await addSlot(addSlotDay.id, dayIndex, muscleGroup);
          setAddSlotDay(null);
          await reloadTemplate();
          await syncIfActive(dayIndex);
        }}
      />

      {/* Picker de ejercicio de cardio para un bloque nuevo de gimnasio (Sub-fase 2) */}
      <CardioExercisePickerModal
        visible={cardioPickerDay !== null}
        title={t('routineBuilder.addCardioPickerTitle')}
        lang={lang}
        exercises={GYM_CARDIO_EXERCISES}
        onClose={() => setCardioPickerDay(null)}
        onSelect={(exerciseId) => {
          if (cardioPickerDay) addCardioBlock(cardioPickerDay, exerciseId);
        }}
      />

      {/* Picker de ejercicio de cardio para un bloque nuevo de casa (Sub-fase 3) */}
      <CardioExercisePickerModal
        visible={homeCardioPickerTarget !== null}
        title={t('routineBuilder.addCardioPickerTitle')}
        lang={lang}
        exercises={getHomeCardioExercises(equipmentForModal)}
        onClose={() => setHomeCardioPickerTarget(null)}
        onSelect={(exerciseId) => {
          if (homeCardioPickerTarget) addHomeCardioBlock(homeCardioPickerTarget.day, homeCardioPickerTarget.sessionIdx, exerciseId);
        }}
      />

      {/* ── ¿Volver al plan automático? (Punto 4) ── */}
      <VulcanDialog
        visible={backToAutoOpen}
        onClose={() => setBackToAutoOpen(false)}
        title={t('routineBuilder.backToAutoTitle')}
        message={t('routineBuilder.backToAutoMsg')}
        confirmLabel={t('routineBuilder.backToAutoConfirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={handleBackToAuto}
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
  activateRow: { alignItems: 'center' },
  activateBtn: {
    backgroundColor: GREEN, borderRadius: Spacing.three,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two + 4,
    minWidth: 200, alignItems: 'center',
  },
  activateBtnDisabled: { opacity: 0.6 },
  activateBtnText: { color: '#04261A', fontSize: 15, fontWeight: '700' },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    borderWidth: 1, borderColor: GREEN + '55', backgroundColor: GREEN + '18',
  },
  activeBadgeText: { fontSize: 13, color: GREEN, fontWeight: '600' },
  autoSubstituteText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  backToAutoBtn: {
    alignSelf: 'center', borderRadius: Spacing.three, borderWidth: 1, borderColor: AMBER + '55',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  backToAutoBtnText: { fontSize: 13, color: AMBER, fontWeight: '600' },
  loading: { marginTop: Spacing.five },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: Spacing.five, lineHeight: 20 },
  dayBlock: { gap: Spacing.one },
  dayTitle: { fontSize: 15 },
  dayCard: { borderRadius: Spacing.two, padding: Spacing.three, gap: Spacing.two },
  skippedWarning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.two, paddingVertical: Spacing.one + 2,
  },
  skippedWarningText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 17 },
  emptySlotsText: { fontSize: 13 },
  slotRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFFFFF12',
  },
  slotMainPressable: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  slotTextWrap: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: Spacing.one },
  slotMuscle: { fontSize: 14 },
  slotExercise: { fontSize: 13 },
  slotDeleteBtn: { paddingLeft: Spacing.two, paddingVertical: Spacing.one },
  addSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: GREEN + '33',
    borderStyle: 'dashed',
  },
  cardioSection: { gap: Spacing.one },
  cardioBackToAutoBtn: {
    alignSelf: 'flex-start', borderRadius: Spacing.two, borderWidth: 1, borderColor: AMBER + '55',
    paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, marginBottom: Spacing.one,
  },
  cardioBackToAutoBtnText: { fontSize: 12, color: AMBER, fontWeight: '600' },
  cardioMinutesInput: {
    width: 44, fontSize: 14, color: '#F1F4F1', textAlign: 'center',
    borderBottomWidth: 1, borderBottomColor: GREEN + '55', paddingVertical: 2,
  },
  cardioMinutesLabel: { fontSize: 12, marginLeft: 4, marginRight: Spacing.one },
  homeSessionBlock: { gap: Spacing.one, marginBottom: Spacing.one },
  homeSessionTitle: { fontSize: 13 },
  cardioEmptyActionsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  cardioEmptyActionFlex: { flex: 1, marginTop: 0 },
  cardioGenerateAutoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: AMBER + '55',
  },
  cardioGenerateAutoBtnText: { fontSize: 12, color: AMBER, fontWeight: '600' },
  addSlotRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: GREEN + '33',
    borderStyle: 'dashed',
  },
  pickerRoot: { flex: 1 },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
  },
  pickerHeaderTitle: { fontSize: 18 },
  pickerList: { paddingBottom: Spacing.four },
  pickerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFFFFF12',
  },
  pickerRowText: { fontSize: 15 },
});
