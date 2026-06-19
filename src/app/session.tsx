import {
  Alert, BackHandler, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText }          from '@/components/themed-text';
import { ThemedView }          from '@/components/themed-view';
import { ChangeExerciseModal } from '@/components/workout/ChangeExerciseModal';
import { useSessionStore }     from '@/store/session.store';
import { useWorkoutStore }     from '@/store/workout.store';
import { useGamificationStore } from '@/store/gamification.store';
import { useProfileStore }     from '@/store/profile.store';
import { getExerciseName, EXERCISES, type ExerciseCategory } from '@/lib/exercises';
import { muscleLabel, equipmentLabel } from '@/components/workout/ExerciseCard';
import { Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const BG2   = '#1C231F';

const CAT_ICONS: Record<ExerciseCategory, string> = {
  push: 'arrow-up-circle-outline', pull: 'arrow-down-circle-outline',
  legs: 'walk-outline', core: 'fitness-outline',
  cardio: 'bicycle-outline', full_body: 'infinite-outline',
};
const CAT_COLORS: Record<ExerciseCategory, string> = {
  push: GREEN, pull: AMBER, legs: '#5BD897', core: GREEN, cardio: AMBER, full_body: GREEN,
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatElapsed(ms: number) {
  const s   = Math.floor(ms / 1000);
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
function formatRest(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
function normLang(l: string): 'es' | 'en' | 'fr' {
  return l.startsWith('es') ? 'es' : l.startsWith('fr') ? 'fr' : 'en';
}
function parseEquipment(raw?: string): string[] {
  try { return JSON.parse(raw ?? '[]') as string[]; } catch { return []; }
}

// ── Fila de serie ─────────────────────────────────────────────────────────────

const RIR_RED   = '#FF6B6B';
const RIR_GREEN = '#3FBF7F';
const RIR_GRAY  = '#9DA89F';

function rirColor(rir: number): string {
  if (rir <= 1) return RIR_RED;
  if (rir <= 3) return RIR_GREEN;
  return RIR_GRAY;
}

interface SetRowProps {
  num: number;
  actualReps: number;
  weightKg: number;
  rir: number;
  completed: boolean;
  coachReason?: string;
  onChangeReps:   (v: number) => void;
  onChangeWeight: (v: number) => void;
  onChangeRir:    (v: number) => void;
  onComplete:     () => void;
}

function SetRow({ num, actualReps, weightKg, rir, completed, coachReason, onChangeReps, onChangeWeight, onChangeRir, onComplete }: SetRowProps) {
  const [repsStr, setRepsStr] = useState(String(actualReps));
  const [kgStr,   setKgStr]   = useState(String(weightKg));
  const [rirStr,  setRirStr]  = useState(String(rir));
  const [focused, setFocused] = useState<'reps' | 'kg' | 'rir' | null>(null);

  useEffect(() => { if (focused !== 'reps') setRepsStr(String(actualReps)); }, [actualReps, focused]);
  useEffect(() => { if (focused !== 'kg')   setKgStr(String(weightKg));     }, [weightKg,   focused]);
  useEffect(() => { if (focused !== 'rir')  setRirStr(String(rir));         }, [rir,         focused]);

  const currentRir = parseInt(rirStr, 10);
  const ririColor  = isNaN(currentRir) ? RIR_GRAY : rirColor(currentRir);

  return (
    <View>
      <View style={[styles.setRow, completed && styles.setRowDone]}>
        <ThemedText themeColor="textSecondary" style={styles.setNum}>{num}</ThemedText>

        {/* Reps — siempre editable */}
        <TextInput
          style={styles.setInput}
          keyboardType="numeric"
          selectTextOnFocus
          value={repsStr}
          onFocus={() => setFocused('reps')}
          onChangeText={setRepsStr}
          onEndEditing={() => {
            setFocused(null);
            const v = parseInt(repsStr, 10);
            if (!isNaN(v) && v > 0) onChangeReps(v);
            else setRepsStr(String(actualReps));
          }}
        />

        {/* Kg — siempre editable */}
        <TextInput
          style={styles.setInput}
          keyboardType="decimal-pad"
          selectTextOnFocus
          value={kgStr}
          onFocus={() => setFocused('kg')}
          onChangeText={setKgStr}
          onEndEditing={() => {
            setFocused(null);
            const v = parseFloat(kgStr);
            if (!isNaN(v) && v >= 0) onChangeWeight(v);
            else setKgStr(String(weightKg));
          }}
        />

        {/* RIR — siempre editable, color dinámico */}
        <TextInput
          style={[styles.setInput, styles.setInputRir, { color: ririColor }]}
          keyboardType="numeric"
          selectTextOnFocus
          value={rirStr}
          onFocus={() => setFocused('rir')}
          onChangeText={setRirStr}
          onEndEditing={() => {
            setFocused(null);
            const v = parseInt(rirStr, 10);
            if (!isNaN(v) && v >= 0) onChangeRir(v);
            else setRirStr(String(rir));
          }}
        />

        {/* Toggle checkmark (A2) */}
        <Pressable onPress={onComplete} style={[styles.checkBtn, completed && styles.checkBtnDone]}>
          <Ionicons
            name={completed ? 'checkmark' : 'ellipse-outline'}
            size={22}
            color={completed ? '#04261A' : MUTED}
          />
        </Pressable>
      </View>

      {/* Coach hint (PARTE B) */}
      {!!coachReason && !completed && (
        <ThemedText style={styles.coachHint}>{coachReason}</ThemedText>
      )}
    </View>
  );
}

// ── SessionScreen ─────────────────────────────────────────────────────────────

export default function SessionScreen() {
  const { t, i18n } = useTranslation();
  const lang   = normLang(i18n.language);

  const {
    isActive, startTime, currentExerciseIdx, exercises,
    restTimerSeconds, restTimerRunning,
    setCurrentExercise, updateSetField, completeSet,
    addSet, removeSet, updateNote, adjustRest, startRestTimer, stopRestTimer,
    tickRestTimer, finishSession, cancelSession, replaceExercise,
  } = useSessionStore();

  const { advanceDayIndex }           = useWorkoutStore();
  const { recordWorkout, unlockAchievement } = useGamificationStore();
  const { profile }           = useProfileStore();
  const equipment = parseEquipment(profile?.equipment);
  const isGym     = profile?.location === 'gym' || profile?.location === 'both';

  const [elapsed, setElapsed]       = useState(0);
  const [showNote, setShowNote]     = useState(false);
  const [swapModal, setSwapModal]   = useState(false);
  const [guideExId, setGuideExId]   = useState<string | null>(null);
  const [restInputStr, setRestInputStr] = useState(() => String(currentEx?.restSeconds ?? 90));
  const carouselRef = useRef<FlatList<any>>(null);

  const currentEx = exercises[currentExerciseIdx];
  const exercise  = currentEx ? EXERCISES.find(e => e.id === currentEx.exerciseId) : null;
  const exName    = exercise ? getExerciseName(exercise.id, lang) : '';
  const catColor  = exercise ? CAT_COLORS[exercise.category] : GREEN;
  const catIcon   = (exercise ? CAT_ICONS[exercise.category] : 'barbell-outline') as any;

  const isLoadedExercise = exercise
    ? exercise.equipment.some(e => ['barbellPlates', 'dumbbells', 'kettlebells', 'cableMachine', 'legPressMachine', 'weightedVest'].includes(e))
    : false;

  const bwLabel = lang === 'es' ? 'Peso corporal' : lang === 'fr' ? 'Poids du corps' : 'Bodyweight';
  const equipText = exercise
    ? exercise.equipment.length === 0
      ? bwLabel
      : exercise.equipment.map(eq => equipmentLabel(eq, lang)).join(', ')
    : '';
  const musclesText = exercise
    ? exercise.primaryMuscles.slice(0, 3).map(m => muscleLabel(m, lang)).join(' · ')
    : '';

  // Log de diagnóstico al montar
  useEffect(() => {
    console.log('[Session] mounted — isActive:', isActive, 'exercises:', exercises.length);
  }, []);

  // Cronómetro + rest timer (cada segundo)
  useEffect(() => {
    const id = setInterval(() => {
      if (startTime) setElapsed(Date.now() - startTime);
      tickRestTimer();
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  // Android back button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => sub.remove();
  }, []);

  // Desplaza el carrusel al ejercicio activo
  useEffect(() => {
    carouselRef.current?.scrollToIndex({ index: currentExerciseIdx, animated: true, viewPosition: 0.5 });
  }, [currentExerciseIdx]);

  // Sincroniza el campo de descanso con el valor del store (cambia tras ±15s o al cambiar ejercicio)
  useEffect(() => {
    if (currentEx) setRestInputStr(String(currentEx.restSeconds));
  }, [currentEx?.restSeconds, currentExerciseIdx]);

  // ── Acciones ──────────────────────────────────────────────────────────────────

  function applyRestInput() {
    const v = parseInt(restInputStr, 10);
    if (v >= 15 && v <= 600) {
      const delta = v - (currentEx?.restSeconds ?? 90);
      if (delta !== 0) adjustRest(currentExerciseIdx, delta);
      setRestInputStr(String(v));
    } else {
      setRestInputStr(String(currentEx?.restSeconds ?? 90));
    }
  }

  async function handleFinish() {
    const today = new Date().toISOString().split('T')[0];

    // Cuenta series sin completar en toda la sesión (A3)
    const pending = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter(s => !s.completed).length, 0,
    );

    const doFinish = async () => {
      const { hasPR } = await finishSession();
      if (hasPR) unlockAchievement('personal_record');
      recordWorkout(today);
      await advanceDayIndex();
    };

    if (pending === 0) {
      Alert.alert(
        t('workout.session.finishConfirmTitle'),
        t('workout.session.finishConfirmMsg'),
        [
          { text: t('workout.session.stay'), style: 'cancel' },
          { text: t('workout.session.finishSession'), onPress: doFinish },
        ],
      );
    } else {
      Alert.alert(
        t('workout.session.finishIncompleteTitle'),
        t('workout.session.finishIncompleteMsg', { count: pending }),
        [
          { text: t('workout.session.stay'), style: 'cancel' },
          { text: t('workout.session.finishSession'), style: 'destructive', onPress: doFinish },
        ],
      );
    }
  }

  function handleCancel() {
    Alert.alert(
      t('workout.session.cancelConfirmTitle'),
      t('workout.session.cancelConfirmMsg'),
      [
        { text: t('workout.session.stay'), style: 'cancel' },
        {
          text: t('workout.session.exitNoSave'),
          style: 'destructive',
          onPress: () => { cancelSession(); },
        },
      ],
    );
  }

  function handleHistory() {
    if (!currentEx) return;
    const last = currentEx.lastWeightKg !== null
      ? `${currentEx.lastReps ?? '?'} reps · ${currentEx.lastWeightKg} kg`
      : t('workout.session.noHistory');
    Alert.alert(t('workout.session.lastSession'), last);
  }

  function handleGuide() {
    if (exercise) setGuideExId(exercise.id);
  }

  function showRirHelp() {
    Alert.alert(
      t('workout.session.rirHelpTitle'),
      t('workout.session.rirHelpBody'),
    );
  }

  if (!isActive || !currentEx) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <ThemedText themeColor="textSecondary">{t('common.loading')}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.cancelBtn} hitSlop={12}>
              <Ionicons name="close" size={22} color={MUTED} />
            </Pressable>
            <ThemedText style={styles.chrono}>{formatElapsed(elapsed)}</ThemedText>
            <Pressable onPress={handleFinish} style={styles.finishBtn}>
              <ThemedText style={styles.finishBtnText}>{t('workout.session.finishSession')}</ThemedText>
            </Pressable>
          </View>

          {/* ── Carrusel de ejercicios ── */}
          <FlatList
            ref={carouselRef}
            horizontal
            data={exercises}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item, index }) => {
              const ex2    = EXERCISES.find(e => e.id === item.exerciseId);
              const isCurr = index === currentExerciseIdx;
              const c2     = ex2 ? CAT_COLORS[ex2.category] : GREEN;
              const ic2    = (ex2 ? CAT_ICONS[ex2.category] : 'barbell-outline') as any;
              return (
                <Pressable
                  onPress={() => setCurrentExercise(index)}
                  style={[styles.carouselItem, isCurr && styles.carouselItemActive]}
                >
                  <View style={[styles.carouselIcon, { backgroundColor: c2 + '22' }]}>
                    <Ionicons name={ic2} size={20} color={isCurr ? c2 : MUTED} />
                  </View>
                  <ThemedText
                    numberOfLines={2}
                    style={[styles.carouselLabel, isCurr && { color: c2 }]}
                  >
                    {ex2 ? getExerciseName(ex2.id, lang) : item.exerciseId}
                  </ThemedText>
                </Pressable>
              );
            }}
          />

          {/* ── Cuerpo ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ejercicio actual */}
            <View style={[styles.exHero, { backgroundColor: catColor + '18' }]}>
              <Ionicons name={catIcon} size={56} color={catColor} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.exName}>{exName}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.exMeta}>
              {musclesText}{equipText ? ` · ${equipText}` : ''}
            </ThemedText>

            {/* Banner de calibración — primera vez con este ejercicio cargado */}
            {currentEx?.lastWeightKg === null && isLoadedExercise && (
              <View style={styles.calibBanner}>
                <Ionicons name="information-circle-outline" size={15} color={AMBER} />
                <ThemedText style={styles.calibText}>
                  {lang === 'es'
                    ? 'Primera vez — indica tu peso de partida ↑ El coach ajustará las siguientes series.'
                    : lang === 'fr'
                    ? 'Première fois — indique ton poids de départ ↑ Le coach ajustera les séries suivantes.'
                    : 'First time — enter your starting weight ↑ The coach will adjust the next sets.'}
                </ThemedText>
              </View>
            )}

            {/* Acciones */}
            <View style={styles.actionRow}>
              <ActionBtn icon="book-outline" label={t('workout.session.guide')} onPress={handleGuide} />
              <ActionBtn icon="swap-horizontal-outline" label={t('workout.session.swap')} onPress={() => setSwapModal(true)} />
              <ActionBtn icon="time-outline" label={t('workout.session.history')} onPress={handleHistory} />
              <ActionBtn icon="create-outline" label={t('workout.session.note')} onPress={() => setShowNote(v => !v)} active={showNote} />
            </View>

            {/* Nota */}
            {showNote && (
              <TextInput
                style={styles.noteInput}
                placeholder={t('workout.session.addNote')}
                placeholderTextColor={MUTED}
                value={currentEx.note}
                onChangeText={v => updateNote(currentExerciseIdx, v)}
                multiline
                maxLength={200}
              />
            )}

            {/* Temporizador de descanso */}
            {restTimerRunning ? (
              <View style={styles.restBox}>
                <Pressable
                  onPress={() => adjustRest(currentExerciseIdx, -15)}
                  style={styles.restAdjBtn} hitSlop={8}
                >
                  <ThemedText style={styles.restAdjText}>−15s</ThemedText>
                </Pressable>
                <View style={styles.restCenter}>
                  <Ionicons name="hourglass-outline" size={16} color={AMBER} />
                  <ThemedText style={styles.restTimer}>{formatRest(restTimerSeconds)}</ThemedText>
                </View>
                <Pressable
                  onPress={() => adjustRest(currentExerciseIdx, +15)}
                  style={styles.restAdjBtn} hitSlop={8}
                >
                  <ThemedText style={styles.restAdjText}>+15s</ThemedText>
                </Pressable>
                <Pressable onPress={stopRestTimer} style={styles.restStopBtn}>
                  <ThemedText style={styles.restStopText}>{t('workout.session.skipRest')}</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.restIdleRow}>
                {/* Fila editable: icono + campo numérico + unidad + botón iniciar */}
                <View style={styles.restEditRow}>
                  <Ionicons name="timer-outline" size={16} color={MUTED} />
                  <TextInput
                    style={styles.restEditInput}
                    keyboardType="numeric"
                    value={restInputStr}
                    onChangeText={setRestInputStr}
                    onEndEditing={applyRestInput}
                    onSubmitEditing={applyRestInput}
                    selectTextOnFocus
                    returnKeyType="done"
                  />
                  <ThemedText themeColor="textSecondary" style={styles.restStartText}>s</ThemedText>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      const v = parseInt(restInputStr, 10);
                      const secs = v >= 15 && v <= 600 ? v : (currentEx?.restSeconds ?? 90);
                      startRestTimer(secs);
                    }}
                  >
                    <Ionicons name="play-circle" size={28} color={GREEN} />
                  </Pressable>
                </View>
                {/* Ajuste rápido ±15s */}
                <View style={styles.restNudgeRow}>
                  <Pressable onPress={() => adjustRest(currentExerciseIdx, -15)} hitSlop={8}>
                    <ThemedText style={styles.restNudgeText}>−15s</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => adjustRest(currentExerciseIdx, +15)} hitSlop={8}>
                    <ThemedText style={styles.restNudgeText}>+15s</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Tabla de series */}
            <View style={styles.tableHeader}>
              <ThemedText style={[styles.colHdr, styles.colNum]}>#</ThemedText>
              <ThemedText style={[styles.colHdr, styles.colVal]}>{t('workout.session.col.reps')}</ThemedText>
              <ThemedText style={[styles.colHdr, styles.colVal]}>kg</ThemedText>
              <Pressable onPress={showRirHelp} style={styles.colRirHdr} hitSlop={10}>
                <ThemedText style={[styles.colHdr, { color: MUTED }]}>RIR</ThemedText>
                <Ionicons name="help-circle-outline" size={11} color={MUTED} />
              </Pressable>
              <ThemedText style={[styles.colHdr, styles.colCheck]}>{t('workout.session.col.done')}</ThemedText>
            </View>

            {currentEx.sets.map((s, setIdx) => (
              <SetRow
                key={setIdx}
                num={s.setNumber}
                actualReps={s.actualReps}
                weightKg={s.weightKg}
                rir={s.rir}
                completed={s.completed}
                coachReason={s.coachReason}
                onChangeReps={v =>   updateSetField(currentExerciseIdx, setIdx, 'actualReps', v)}
                onChangeWeight={v => updateSetField(currentExerciseIdx, setIdx, 'weightKg', v)}
                onChangeRir={v =>   updateSetField(currentExerciseIdx, setIdx, 'rir', v)}
                onComplete={() =>  completeSet(currentExerciseIdx, setIdx)}
              />
            ))}

            {/* + / - Serie */}
            <View style={styles.addRemoveRow}>
              <Pressable
                style={styles.addSetBtn}
                onPress={() => addSet(currentExerciseIdx)}
              >
                <Ionicons name="add-circle-outline" size={18} color={GREEN} />
                <ThemedText style={styles.addSetText}>{t('workout.session.addSet')}</ThemedText>
              </Pressable>
              {currentEx.sets.length > 1 && (
                <Pressable
                  style={styles.removeSetBtn}
                  onPress={() => removeSet(currentExerciseIdx)}
                >
                  <Ionicons name="remove-circle-outline" size={18} color={MUTED} />
                  <ThemedText themeColor="textSecondary" style={styles.removeSetText}>
                    {t('workout.session.removeSet')}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            {/* Navegación entre ejercicios */}
            <View style={styles.exNav}>
              {currentExerciseIdx > 0 && (
                <Pressable
                  style={styles.exNavBtn}
                  onPress={() => setCurrentExercise(currentExerciseIdx - 1)}
                >
                  <Ionicons name="chevron-back" size={16} color={GREEN} />
                  <ThemedText style={styles.exNavText}>{t('workout.session.prevEx')}</ThemedText>
                </Pressable>
              )}
              {currentExerciseIdx < exercises.length - 1 && (
                <Pressable
                  style={[styles.exNavBtn, styles.exNavBtnRight]}
                  onPress={() => setCurrentExercise(currentExerciseIdx + 1)}
                >
                  <ThemedText style={styles.exNavText}>{t('workout.session.nextEx')}</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={GREEN} />
                </Pressable>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modal de intercambio */}
      <ChangeExerciseModal
        visible={swapModal}
        currentExerciseId={currentEx.exerciseId}
        userEquipment={equipment}
        isGym={isGym}
        lang={lang}
        changeExTitle={t('workout.session.swap')}
        noAlternativesText={t('tabs.training.noAlternatives')}
        onClose={() => setSwapModal(false)}
        onSelect={(newId) => {
          replaceExercise(currentExerciseIdx, newId);
          setSwapModal(false);
        }}
      />

      {/* Modal guía del ejercicio (A6) */}
      {guideExId && (
        <ExerciseGuideModal
          exerciseId={guideExId}
          lang={lang}
          onClose={() => setGuideExId(null)}
        />
      )}
    </ThemedView>
  );
}

// ── ExerciseGuideModal (A6) ───────────────────────────────────────────────────

const GUIDE_CAT_COLORS: Record<ExerciseCategory, string> = {
  push: GREEN, pull: AMBER, legs: '#5BD897', core: GREEN, cardio: AMBER, full_body: GREEN,
};
const GUIDE_CAT_ICONS: Record<ExerciseCategory, string> = {
  push: 'arrow-up-circle-outline', pull: 'arrow-down-circle-outline',
  legs: 'walk-outline', core: 'fitness-outline',
  cardio: 'bicycle-outline', full_body: 'infinite-outline',
};
const GUIDE_EQUIP_BW: Record<string, string> = {
  es: 'Peso corporal', en: 'Bodyweight', fr: 'Poids du corps',
};
const GUIDE_MUSCLE_SECTION: Record<string, Record<string, string>> = {
  primary:   { es: 'Músculos principales', en: 'Primary muscles', fr: 'Muscles principaux' },
  secondary: { es: 'Músculos secundarios', en: 'Secondary muscles', fr: 'Muscles secondaires' },
  equipment: { es: 'Equipamiento',          en: 'Equipment',        fr: 'Équipement' },
  guide:     { es: 'Instrucciones',         en: 'Instructions',     fr: 'Instructions' },
  soon:      { es: 'Instrucciones detalladas próximamente.', en: 'Detailed instructions coming soon.', fr: 'Instructions détaillées bientôt disponibles.' },
};

function ExerciseGuideModal({ exerciseId, lang, onClose }: {
  exerciseId: string;
  lang: 'es' | 'en' | 'fr';
  onClose: () => void;
}) {
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return null;

  const name     = getExerciseName(exerciseId, lang);
  const catColor = GUIDE_CAT_COLORS[ex.category];
  const catIcon  = (GUIDE_CAT_ICONS[ex.category] ?? 'barbell-outline') as any;
  const bwLabel  = GUIDE_EQUIP_BW[lang];
  const equip    = ex.equipment.length === 0
    ? bwLabel
    : ex.equipment.map(k => equipmentLabel(k, lang)).join(', ');

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ThemedView style={guideStyles.root}>
        <SafeAreaView style={guideStyles.safe}>
          <Pressable onPress={onClose} style={guideStyles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={24} color={MUTED} />
          </Pressable>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={guideStyles.scroll}>
            <View style={[guideStyles.hero, { backgroundColor: catColor + '1A' }]}>
              <Ionicons name={catIcon} size={72} color={catColor} />
            </View>
            <ThemedText type="defaultSemiBold" style={guideStyles.name}>{name}</ThemedText>

            {/* Músculos principales */}
            <View style={guideStyles.card}>
              <ThemedText style={guideStyles.cardLabel}>{GUIDE_MUSCLE_SECTION.primary[lang]}</ThemedText>
              <View style={guideStyles.chips}>
                {ex.primaryMuscles.map(m => (
                  <View key={m} style={[guideStyles.chip, { backgroundColor: catColor + '22' }]}>
                    <ThemedText style={[guideStyles.chipText, { color: catColor }]}>
                      {muscleLabel(m, lang)}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            {/* Músculos secundarios */}
            {ex.secondaryMuscles.length > 0 && (
              <View style={guideStyles.card}>
                <ThemedText style={guideStyles.cardLabel}>{GUIDE_MUSCLE_SECTION.secondary[lang]}</ThemedText>
                <View style={guideStyles.chips}>
                  {ex.secondaryMuscles.map(m => (
                    <View key={m} style={[guideStyles.chip, { backgroundColor: MUTED + '22' }]}>
                      <ThemedText style={[guideStyles.chipText, { color: MUTED }]}>
                        {muscleLabel(m, lang)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Equipo */}
            <View style={guideStyles.card}>
              <ThemedText style={guideStyles.cardLabel}>{GUIDE_MUSCLE_SECTION.equipment[lang]}</ThemedText>
              <ThemedText style={guideStyles.cardText}>{equip}</ThemedText>
            </View>

            {/* Instrucciones (placeholder) */}
            <View style={guideStyles.card}>
              <ThemedText style={guideStyles.cardLabel}>{GUIDE_MUSCLE_SECTION.guide[lang]}</ThemedText>
              <ThemedText themeColor="textSecondary" style={guideStyles.cardText}>
                {GUIDE_MUSCLE_SECTION.soon[lang]}
              </ThemedText>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const guideStyles = StyleSheet.create({
  root:      { flex: 1 },
  safe:      { flex: 1 },
  closeBtn:  { alignSelf: 'flex-end', padding: Spacing.three },
  scroll:    { paddingHorizontal: Spacing.four, paddingBottom: 40, gap: Spacing.three },
  hero:      { height: 160, borderRadius: Spacing.three, alignItems: 'center', justifyContent: 'center' },
  name:      { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  card:      { backgroundColor: '#1C231F', borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  cardLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 },
  cardText:  { fontSize: 14, lineHeight: 22 },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip:      { borderRadius: 20, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  chipText:  { fontSize: 12, fontWeight: '500' },
});

// ── ActionBtn ─────────────────────────────────────────────────────────────────

function ActionBtn({ icon, label, onPress, active }: {
  icon: string; label: string; onPress: () => void; active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }, active && styles.actionBtnActive]}
    >
      <Ionicons name={icon as any} size={20} color={active ? GREEN : MUTED} />
      <ThemedText style={[styles.actionLabel, active && { color: GREEN }]}>{label}</ThemedText>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1 },
  safe:    { flex: 1 },
  flex:    { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFFFFF14',
  },
  cancelBtn:    { padding: 4 },
  chrono:       { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', letterSpacing: 2 },
  finishBtn:    {
    backgroundColor: GREEN, borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: 6,
  },
  finishBtnText: { color: '#04261A', fontSize: 13, fontWeight: '700' },

  // Carousel
  carousel: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  carouselItem: {
    alignItems: 'center', gap: 4, width: 72,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1, borderColor: 'transparent',
  },
  carouselItemActive: { borderColor: GREEN + '55', backgroundColor: GREEN + '0D' },
  carouselIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  carouselLabel: { fontSize: 10, textAlign: 'center', color: MUTED, lineHeight: 13 },

  // Body
  body: { paddingHorizontal: Spacing.four, gap: Spacing.three, paddingBottom: 40 },
  exHero: {
    height: 140, borderRadius: Spacing.three,
    alignItems: 'center', justifyContent: 'center',
  },
  exName: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  exMeta: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Actions
  actionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  actionBtn: {
    alignItems: 'center', gap: 4, paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two, borderRadius: Spacing.two,
    flex: 1,
  },
  actionBtnActive: { backgroundColor: GREEN + '14' },
  actionLabel:     { fontSize: 10, color: MUTED, textAlign: 'center' },

  // Calibration banner
  calibBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  calibText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },

  // Note
  noteInput: {
    backgroundColor: BG2, borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    color: '#F1F4F1', fontSize: 14, minHeight: 60,
    borderWidth: 1, borderColor: GREEN + '55',
  },

  // Rest timer
  restBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    gap: Spacing.two, justifyContent: 'center',
    borderWidth: 1, borderColor: AMBER + '44',
  },
  restCenter:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restTimer:    { fontSize: 22, fontWeight: '700', color: AMBER, letterSpacing: 2 },
  restAdjBtn:   { paddingHorizontal: Spacing.two, paddingVertical: 4 },
  restAdjText:  { fontSize: 12, color: AMBER, fontWeight: '600' },
  restStopBtn:  { paddingHorizontal: Spacing.two, paddingVertical: 4, borderRadius: Spacing.one, borderWidth: 1, borderColor: AMBER + '55' },
  restStopText: { fontSize: 12, color: AMBER },
  restIdleRow:  { gap: 4 },
  restEditRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.two, paddingVertical: Spacing.two,
    borderRadius: Spacing.two, borderWidth: 1, borderColor: MUTED + '33',
  },
  restEditInput: {
    width: 72, height: 36, textAlign: 'center',
    fontSize: 20, fontWeight: '700', color: AMBER,
    borderBottomWidth: 1.5, borderBottomColor: AMBER + '88',
  },
  restStartText: { fontSize: 13 },
  restNudgeRow:  { flexDirection: 'row', justifyContent: 'center', gap: Spacing.four },
  restNudgeText: { fontSize: 12, color: MUTED },

  // Set table
  tableHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.two, paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFFFFF14',
  },
  colHdr:    { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: MUTED, textAlign: 'center', fontWeight: '600' },
  colNum:    { width: 28 },
  colVal:    { flex: 1 },
  colRirHdr: { width: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  colCheck:  { width: 44, textAlign: 'center' },

  // Set row
  setRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two, gap: 4,
  },
  setRowDone: { opacity: 0.75 },
  setNum:     { width: 24, fontSize: 13, textAlign: 'center' },
  setInput: {
    flex: 1, height: 38, textAlign: 'center', fontSize: 16, fontWeight: '600',
    color: '#F1F4F1', backgroundColor: BG2, borderRadius: Spacing.one,
    borderWidth: 1, borderColor: '#FFFFFF14',
  },
  setInputRir: { flex: 0, width: 52 },
  checkBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BG2, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: MUTED + '55',
  },
  checkBtnDone: { backgroundColor: GREEN, borderColor: GREEN },
  coachHint: {
    fontSize: 11, color: AMBER, fontStyle: 'italic',
    paddingLeft: 30, marginTop: -2, marginBottom: 2,
  },

  // Add/Remove set
  addRemoveRow: { flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.one },
  addSetBtn:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  addSetText:   { color: GREEN, fontSize: 14 },
  removeSetBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  removeSetText:{ fontSize: 14 },

  // Exercise nav
  exNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FFFFFF14', marginTop: Spacing.two,
  },
  exNavBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exNavBtnRight: { marginLeft: 'auto' },
  exNavText:     { fontSize: 13, color: GREEN },
});
