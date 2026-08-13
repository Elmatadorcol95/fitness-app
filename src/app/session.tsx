import {
  AppState, BackHandler, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText }          from '@/components/themed-text';
import { ThemedView }          from '@/components/themed-view';
import { VulcanDialog }        from '@/components/ui/VulcanDialog';
import { ChangeExerciseModal } from '@/components/workout/ChangeExerciseModal';
import { useSessionStore } from '@/store/session.store';
import { useWorkoutStore }     from '@/store/workout.store';
import { useGamificationStore } from '@/store/gamification.store';
import { useProfileStore }     from '@/store/profile.store';
import { useCooldownStore }    from '@/store/cooldown.store';
import { getExerciseName, EXERCISES, type ExerciseCategory, type Exercise } from '@/lib/exercises';
import { getEquipLocal } from '@/lib/equipmentClassification';
import { muscleLabel, equipmentLabel } from '@/components/workout/ExerciseCard';
import { TimedChecklistItem } from '@/components/warmup/TimedChecklistItem';
import { selectCardio, createCardioCycleState, type CardioPlan, type PlannedCardioBlock } from '@/lib/cardioSelection';
import { hapticsSuccess } from '@/lib/haptics';
import { playRestDone } from '@/lib/sounds';
import { Spacing } from '@/constants/theme';
import { getAllPreferences, togglePreference, type Preference } from '@/lib/exercisePreferences';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const BG2   = '#1C231F';
const BLUE  = '#3C87F7';

const CAT_ICONS: Record<ExerciseCategory, string> = {
  push: 'arrow-up-circle-outline', pull: 'arrow-down-circle-outline',
  legs: 'walk-outline', core: 'fitness-outline',
  cardio: 'bicycle-outline', full_body: 'infinite-outline', mobility: 'accessibility-outline',
};
const CAT_COLORS: Record<ExerciseCategory, string> = {
  push: GREEN, pull: AMBER, legs: '#5BD897', core: GREEN, cardio: AMBER, full_body: GREEN, mobility: BLUE,
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
  // Étapa 3 (#6+#18): serie restaurada de una sesión anterior de este ciclo —
  // de solo lectura, no responde a ningún toque.
  isRestored?: boolean;
  onChangeReps:   (v: number) => void;
  onChangeWeight: (v: number) => void;
  onChangeRir:    (v: number) => void;
  onComplete:     () => void;
}

function SetRow({ num, actualReps, weightKg, rir, completed, coachReason, isRestored, onChangeReps, onChangeWeight, onChangeRir, onComplete }: SetRowProps) {
  const [repsStr, setRepsStr] = useState(String(actualReps));
  const [kgStr,   setKgStr]   = useState(String(weightKg));
  const [rirStr,  setRirStr]  = useState(String(rir));
  const [focused, setFocused] = useState<'reps' | 'kg' | 'rir' | null>(null);
  const [kgSelection, setKgSelection] = useState<{ start: number; end: number } | undefined>(undefined);

  useEffect(() => { if (focused !== 'reps') setRepsStr(String(actualReps)); }, [actualReps, focused]);
  useEffect(() => { if (focused !== 'kg')   setKgStr(String(weightKg));     }, [weightKg,   focused]);
  useEffect(() => { if (focused !== 'rir')  setRirStr(String(rir));         }, [rir,         focused]);

  const currentRir = parseInt(rirStr, 10);
  const ririColor  = isNaN(currentRir) ? RIR_GRAY : rirColor(currentRir);

  return (
    <View>
      <View style={[styles.setRow, completed && styles.setRowDone, isRestored && styles.setRowRestored]}>
        <ThemedText themeColor="textSecondary" style={styles.setNum}>{num}</ThemedText>

        {/* Reps — editable, salvo serie restaurada (solo lectura) */}
        <TextInput
          style={[styles.setInput, isRestored && styles.setInputRestored]}
          keyboardType="numeric"
          selectTextOnFocus
          editable={!isRestored}
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

        {/* Kg — editable, salvo serie restaurada (solo lectura) */}
        <TextInput
          style={[styles.setInput, isRestored && styles.setInputRestored]}
          keyboardType="decimal-pad"
          editable={!isRestored}
          value={kgStr}
          selection={kgSelection}
          onFocus={() => {
            setFocused('kg');
            setKgSelection({ start: 0, end: kgStr.length });
          }}
          onChangeText={(text) => {
            setKgStr(text);
            setKgSelection({ start: text.length, end: text.length });
          }}
          onEndEditing={() => {
            setFocused(null);
            const v = parseFloat(kgStr);
            if (!isNaN(v) && v >= 0) onChangeWeight(v);
            else setKgStr(String(weightKg));
          }}
        />

        {/* RIR — editable, salvo serie restaurada (solo lectura), color dinámico */}
        <TextInput
          style={[styles.setInput, styles.setInputRir, isRestored && styles.setInputRestored, { color: ririColor }]}
          keyboardType="numeric"
          selectTextOnFocus
          editable={!isRestored}
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

        {/* Toggle checkmark — vuelca los tres campos al store ANTES de completar,
            por si el teclado sigue abierto (onEndEditing no habría disparado aún).
            Deshabilitado del todo si es una serie restaurada. */}
        <Pressable
          disabled={isRestored}
          onPress={() => {
            const rVal = parseInt(repsStr, 10);
            if (!isNaN(rVal) && rVal > 0) onChangeReps(rVal);
            const kVal = parseFloat(kgStr);
            if (!isNaN(kVal) && kVal >= 0) onChangeWeight(kVal);
            const rirVal = parseInt(rirStr, 10);
            if (!isNaN(rirVal) && rirVal >= 0) onChangeRir(rirVal);
            onComplete();
          }}
          style={[styles.checkBtn, completed && styles.checkBtnDone]}
        >
          <Ionicons
            name={isRestored ? 'lock-closed' : completed ? 'checkmark' : 'ellipse-outline'}
            size={isRestored ? 18 : 22}
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
    restTimerSeconds, restTimerRunning, trainingContext,
    cardio, sessionDayType,
    setCurrentExercise, updateSetField, completeSet,
    addSet, removeSet, updateNote, adjustRest, startRestTimer, stopRestTimer,
    tickRestTimer, finishSession, cancelSession, replaceExercise,
  } = useSessionStore();

  // Étapa 3 (#6+#18): conteo a nivel de SERIES para el banner de retomado —
  // no cambia mientras dura la sesión (isRestored solo se asigna al arrancar).
  const restoredSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.filter(s => s.isRestored).length, 0);
  const totalSetsCount    = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  const { advanceToNextDay, markDayCompleted } = useWorkoutStore();
  const currentPlan = useWorkoutStore(s => s.currentPlan);
  const { recordWorkout, unlockAchievement, incrementDaysTrainedThisWeek, incrementDaysFinishedThisWeek } = useGamificationStore();
  const { profile }           = useProfileStore();
  const equipment = parseEquipment(profile?.equipment);
  const isGym     = profile?.location === 'gym' || profile?.location === 'both';

  const cardioSlotsForDay = cardio.gym.length > 0 ? cardio.gym.length : cardio.homeSessions.length / 2;
  const wasGymGenerated = cardio.gym.length > 0;
  const effectiveIsGymForCardio = trainingContext === 'home' ? false : trainingContext === 'gym' ? true : isGym;
  const displayCardio: CardioPlan = (cardioSlotsForDay > 0 && wasGymGenerated !== effectiveIsGymForCardio)
    ? selectCardio(cardioSlotsForDay, equipment, effectiveIsGymForCardio, new Set(), createCardioCycleState())
    : cardio;
  const homeBlocks: PlannedCardioBlock[] = displayCardio.homeSessions.flatMap(s => s.blocks);
  const sessionOffsets: number[] = [];
  {
    let acc = 0;
    for (const s of displayCardio.homeSessions) { sessionOffsets.push(acc); acc += s.blocks.length; }
  }

  const [elapsed, setElapsed]       = useState(0);
  const [showNote, setShowNote]     = useState(false);
  const [swapModal, setSwapModal]   = useState(false);
  const [guideExId, setGuideExId]   = useState<string | null>(null);
  const [restInputStr, setRestInputStr] = useState(() => String(currentEx?.restSeconds ?? 90));
  const [finishState,  setFinishState]  = useState<'idle' | 'confirm' | 'incomplete'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingExerciseCount, setPendingExerciseCount] = useState(0);
  const [cancelOpen,   setCancelOpen]   = useState(false);
  const [historyOpen,  setHistoryOpen]  = useState(false);
  const [historyMsg,   setHistoryMsg]   = useState('');
  const [rirHelpOpen,  setRirHelpOpen]  = useState(false);
  const [showingCardio, setShowingCardio] = useState(false);
  const [cardioRunningIndex, setCardioRunningIndex] = useState<number | null>(null);
  const [cardioRemaining, setCardioRemaining] = useState<number[]>(() => homeBlocks.map(b => b.durationSeconds));
  const [cardioCompleted, setCardioCompleted] = useState<boolean[]>(() => homeBlocks.map(() => false));
  const [gymRunningIndex, setGymRunningIndex] = useState<number | null>(null);
  const [gymRemaining, setGymRemaining] = useState<number[]>(() => displayCardio.gym.map(b => b.durationSeconds));
  const [gymCompleted, setGymCompleted] = useState<boolean[]>(() => displayCardio.gym.map(() => false));
  const [gymInputStr, setGymInputStr] = useState<string[]>(() => displayCardio.gym.map(b => String(Math.round(b.durationSeconds / 60))));
  const [sessionRestRunning, setSessionRestRunning] = useState<number | null>(null);
  const [sessionRestRemaining, setSessionRestRemaining] = useState<number[]>(() => displayCardio.homeSessions.map(s => s.restAfterSeconds));
  const [sessionRestInputStr, setSessionRestInputStr] = useState<string[]>(() => displayCardio.homeSessions.map(s => String(s.restAfterSeconds)));
  const [sessionRestAutoStarted, setSessionRestAutoStarted] = useState<boolean[]>(() => displayCardio.homeSessions.map(() => false));
  const [preferencesMap, setPreferencesMap] = useState<Map<string, Preference>>(new Map());
  const carouselRef = useRef<FlatList<any>>(null);

  const currentEx = exercises[currentExerciseIdx];
  const exercise  = currentEx ? EXERCISES.find(e => e.id === currentEx.exerciseId) : null;
  const exName    = exercise ? getExerciseName(exercise.id, lang) : '';
  const catColor  = exercise ? CAT_COLORS[exercise.category] : GREEN;
  const catIcon   = (exercise ? CAT_ICONS[exercise.category] : 'barbell-outline') as any;

  const isLoadedExercise = exercise
    ? getEquipLocal(exercise.id) !== 'bodyweight'
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

  // ── Aviso: sesión "en casa" con poca variedad de espalda o sin bíceps ──────────
  const isHomeContext  = trainingContext === 'home';
  const isPullRelevant = sessionDayType === 'pull' || sessionDayType === 'upper';
  const dayExercises = exercises
    .map(ex => EXERCISES.find(e => e.id === ex.exerciseId))
    .filter((e): e is Exercise => e !== undefined);

  const hasBackVariety = !isHomeContext || !isPullRelevant || dayExercises.some(e => e.category === 'pull' && e.isCompound);
  const hasBicepWork   = !isHomeContext || !isPullRelevant || dayExercises.some(e => e.primaryMuscles.includes('biceps'));
  const pullWarningKey: string | null =
    hasBackVariety && hasBicepWork    ? null :
    !hasBackVariety && !hasBicepWork  ? 'workout.today.noBackVarietyOrBicep' :
    !hasBackVariety                   ? 'workout.today.noBackVariety' :
    'workout.today.noBicepWork';

  // Log de diagnóstico al montar
  useEffect(() => {
    console.log('[Session] mounted — isActive:', isActive, 'exercises:', exercises.length);
  }, []);

  useEffect(() => {
    getAllPreferences().then(setPreferencesMap);
  }, []);

  // Cronómetro + rest timer (cada segundo)
  useEffect(() => {
    const id = setInterval(() => {
      if (startTime) setElapsed(Date.now() - startTime);
      tickRestTimer();
    }, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') tickRestTimer();
    });
    return () => sub.remove();
  }, []);

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

  useEffect(() => {
    if (cardioRunningIndex === null) return;
    const idx = cardioRunningIndex;
    const id = setInterval(() => {
      setCardioRemaining(prev => {
        const current = prev[idx];
        if (current <= 0) return prev;
        const next = [...prev];
        next[idx] = current - 1;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cardioRunningIndex]);

  useEffect(() => {
    if (cardioRunningIndex === null) return;
    if (cardioRemaining[cardioRunningIndex] > 0) return;
    const idx = cardioRunningIndex;
    setCardioRunningIndex(null);
    hapticsSuccess();
    playRestDone();
    setCardioCompleted(c => { const next = [...c]; next[idx] = true; return next; });
  }, [cardioRunningIndex, cardioRemaining]);

  useEffect(() => {
    if (gymRunningIndex === null) return;
    const idx = gymRunningIndex;
    const id = setInterval(() => {
      setGymRemaining(prev => {
        const current = prev[idx];
        if (current <= 0) return prev;
        const next = [...prev];
        next[idx] = current - 1;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gymRunningIndex]);

  useEffect(() => {
    if (gymRunningIndex === null) return;
    if (gymRemaining[gymRunningIndex] > 0) return;
    const idx = gymRunningIndex;
    setGymRunningIndex(null);
    hapticsSuccess();
    playRestDone();
    setGymCompleted(c => { const next = [...c]; next[idx] = true; return next; });
  }, [gymRunningIndex, gymRemaining]);

  useEffect(() => {
    if (sessionRestRunning === null) return;
    const idx = sessionRestRunning;
    const id = setInterval(() => {
      setSessionRestRemaining(prev => {
        const current = prev[idx];
        if (current <= 0) return prev;
        const next = [...prev];
        next[idx] = current - 1;
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sessionRestRunning]);

  useEffect(() => {
    if (sessionRestRunning === null) return;
    if (sessionRestRemaining[sessionRestRunning] > 0) return;
    setSessionRestRunning(null);
    hapticsSuccess();
    playRestDone();
  }, [sessionRestRunning, sessionRestRemaining]);

  useEffect(() => {
    displayCardio.homeSessions.forEach((session, s) => {
      if (session.restAfterSeconds <= 0) return;
      if (sessionRestAutoStarted[s]) return;
      if (sessionRestRunning === s) return;
      if (session.blocks.length === 0) return;
      const start = sessionOffsets[s];
      const end = start + session.blocks.length;
      const allDone = cardioCompleted.slice(start, end).every(Boolean);
      if (allDone) {
        setSessionRestAutoStarted(prev => { const next = [...prev]; next[s] = true; return next; });
        applySessionRestInput(s);
        setSessionRestRunning(s);
      }
    });
  }, [cardioCompleted]);

  // ── Acciones ──────────────────────────────────────────────────────────────────

  function applyRestInput() {
    const v = parseInt(restInputStr, 10);
    if (v >= 1 && v <= 600) {
      const delta = v - (currentEx?.restSeconds ?? 90);
      if (delta !== 0) adjustRest(currentExerciseIdx, delta);
      setRestInputStr(String(v));
    } else {
      setRestInputStr(String(currentEx?.restSeconds ?? 90));
    }
  }

  const doFinish = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    // Capturado ANTES de finishSession(): esta resetea el store a
    // EMPTY_STATE (planDayId: null) al terminar, así que hay que leerlo
    // ahora o se pierde. Estable incluso si el filtro E-3/rutina ancla
    // sustituyó los ejercicios (resolveEffectiveDay en training.tsx
    // conserva el dbId del día ancla al sustituir).
    const justTrainedDayId = useSessionStore.getState().planDayId;
    const { hasPR, completedSets, plannedSets } = await finishSession();

    // Fase 2 Paso 2: dispara el prompt de estiramiento vía store global —NO
    // estado local de este componente, que ya se está desmontando en este
    // punto porque finishSession() acaba de poner isActive:false (ver
    // COOLDOWN_INTEGRATION_AUDIT.md, sección 2). isGym usa el contexto de
    // ESTA sesión (trainingContext), no profile.location, para reflejar
    // dónde entrenó hoy un usuario "ambos" (mismo criterio que warmupIsGym
    // en training.tsx).
    if (sessionDayType) {
      useCooldownStore.getState().promptAfterSession(sessionDayType, equipment, trainingContext !== 'home');
    }

    if (hasPR) unlockAchievement('personal_record');

    const ratio = plannedSets > 0 ? completedSets / plannedSets : 0;
    // Mismo criterio para "perfect" (gate de logros/racha) y para el marcado
    // de día completo del Paso 2c (#6+#18) — una sola condición, no dos
    // copias del mismo cálculo.
    const dayFullyCompleted = plannedSets > 0 && completedSets >= plannedSets;
    if (ratio >= 0.5) {
      recordWorkout(today, { perfect: dayFullyCompleted });
      incrementDaysTrainedThisWeek();
    }

    // Cierra la semana por "día finalizado", no por el gate de logros/racha
    // de arriba — se incrementa siempre, sin importar cuántas series se
    // completaron (a diferencia de incrementDaysTrainedThisWeek).
    incrementDaysFinishedThisWeek();

    // Paso 2c (#6+#18): bloquea la reselección de un día ya completo al
    // 100% en este ciclo. Misma protección ante justTrainedDayId === null
    // que ya usa advanceToNextDay() — sin id no hay qué marcar.
    if (dayFullyCompleted && justTrainedDayId !== null) {
      await markDayCompleted(justTrainedDayId);
    }

    await advanceToNextDay(justTrainedDayId);
  }, [finishSession, unlockAchievement, recordWorkout, incrementDaysTrainedThisWeek, incrementDaysFinishedThisWeek, markDayCompleted, advanceToNextDay, sessionDayType, equipment, trainingContext]);

  function handleFinish() {
    const pending = exercises.reduce(
      (acc, ex) => acc + ex.sets.filter(s => !s.completed).length, 0,
    );
    const pendingExercises = exercises.filter(ex => ex.sets.some(s => !s.completed)).length;
    setPendingCount(pending);
    setPendingExerciseCount(pendingExercises);
    setFinishState(pending === 0 ? 'confirm' : 'incomplete');
  }

  function handleCancel() {
    setCancelOpen(true);
  }

  function handleHistory() {
    if (!currentEx) return;
    const last = currentEx.lastWeightKg !== null
      ? `${currentEx.lastReps ?? '?'} reps · ${currentEx.lastWeightKg} kg`
      : t('workout.session.noHistory');
    setHistoryMsg(last);
    setHistoryOpen(true);
  }

  function handleGuide() {
    if (exercise) setGuideExId(exercise.id);
  }

  function showRirHelp() {
    setRirHelpOpen(true);
  }

  async function handleTogglePreference(exerciseId: string, preference: Preference) {
    await togglePreference(exerciseId, preference);
    setPreferencesMap(prev => {
      const next = new Map(prev);
      if (next.get(exerciseId) === preference) {
        next.delete(exerciseId);
      } else {
        next.set(exerciseId, preference);
      }
      return next;
    });
  }

  function handleCardioPlayPause(i: number) {
    setCardioRunningIndex(prev => (prev === i ? null : i));
  }
  function handleCardioToggleComplete(i: number) {
    setCardioCompleted(c => {
      const next = [...c];
      next[i] = !next[i];
      return next;
    });
  }

  function applyGymInput(i: number) {
    const v = parseInt(gymInputStr[i], 10);
    if (v >= 1 && v <= 60) {
      const newSeconds = v * 60;
      setGymRemaining(prev => { const next = [...prev]; next[i] = newSeconds; return next; });
      setGymInputStr(prev => { const next = [...prev]; next[i] = String(v); return next; });
    } else {
      setGymInputStr(prev => { const next = [...prev]; next[i] = String(Math.round((gymRemaining[i] ?? 600) / 60)); return next; });
    }
  }
  function handleGymPlayPause(i: number) {
    if (gymRunningIndex === i) {
      setGymRunningIndex(null);
    } else {
      applyGymInput(i);
      setGymRunningIndex(i);
    }
  }
  function handleGymToggleComplete(i: number) {
    setGymCompleted(c => { const next = [...c]; next[i] = !next[i]; return next; });
  }
  function handleGymAdjust(i: number, deltaSeconds: number) {
    setGymRemaining(prev => {
      const next = [...prev];
      next[i] = Math.max(60, Math.min(3600, next[i] + deltaSeconds));
      return next;
    });
  }

  function applySessionRestInput(s: number) {
    const v = parseInt(sessionRestInputStr[s], 10);
    if (v >= 1 && v <= 600) {
      setSessionRestRemaining(prev => { const next = [...prev]; next[s] = v; return next; });
      setSessionRestInputStr(prev => { const next = [...prev]; next[s] = String(v); return next; });
    } else {
      setSessionRestInputStr(prev => { const next = [...prev]; next[s] = String(sessionRestRemaining[s] ?? 90); return next; });
    }
  }
  function handleSessionRestPlayPause(s: number) {
    if (sessionRestRunning === s) {
      setSessionRestRunning(null);
    } else {
      applySessionRestInput(s);
      setSessionRestRunning(s);
    }
  }
  function handleSessionRestAdjust(s: number, delta: number) {
    setSessionRestRemaining(prev => {
      const next = [...prev];
      next[s] = Math.max(1, Math.min(600, next[s] + delta));
      return next;
    });
  }
  function handleSessionRestSkip(s: number) {
    setSessionRestRunning(null);
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

          {/* ── Badge de contexto (solo para usuarios "ambos") ── */}
          {trainingContext !== null && (
            <View style={styles.contextBadgeRow}>
              <View style={styles.contextBadge}>
                <Ionicons
                  name={trainingContext === 'home' ? 'home-outline' : 'barbell-outline'}
                  size={12}
                  color={MUTED}
                />
                <ThemedText style={styles.contextBadgeText}>
                  {t(`workout.session.where${trainingContext === 'home' ? 'Home' : 'Gym'}`)}
                </ThemedText>
              </View>
            </View>
          )}

          {/* ── Aviso: poca variedad de espalda o sin bíceps con el equipamiento de casa ── */}
          {pullWarningKey && (
            <View style={styles.pullWarningBanner}>
              <Ionicons name="information-circle-outline" size={15} color={AMBER} />
              <ThemedText style={styles.pullWarningText}>
                {t(pullWarningKey)}
              </ThemedText>
            </View>
          )}

          {/* ── Carrusel de ejercicios ── */}
          <FlatList
            ref={carouselRef}
            horizontal
            data={exercises}
            keyExtractor={(_, i) => String(i)}
            showsHorizontalScrollIndicator={false}
            style={styles.carouselList}
            contentContainerStyle={styles.carousel}
            onScrollToIndexFailed={() => {}}
            ListFooterComponent={
              (displayCardio.gym.length > 0 || homeBlocks.length > 0) ? (
                <Pressable
                  onPress={() => setShowingCardio(true)}
                  style={[styles.carouselItem, showingCardio && styles.carouselItemActive]}
                >
                  <View style={[styles.carouselIcon, { backgroundColor: AMBER + '22' }]}>
                    <Ionicons name="bicycle-outline" size={20} color={showingCardio ? AMBER : MUTED} />
                  </View>
                  <ThemedText
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    style={[styles.carouselLabel, showingCardio ? { color: AMBER } : undefined]}
                  >
                    {t('workout.session.cardioTitle')}
                  </ThemedText>
                </Pressable>
              ) : null
            }
            renderItem={({ item, index }) => {
              const ex2    = EXERCISES.find(e => e.id === item.exerciseId);
              const isCurr = !showingCardio && index === currentExerciseIdx;
              const c2     = ex2 ? CAT_COLORS[ex2.category] : GREEN;
              const ic2    = (ex2 ? CAT_ICONS[ex2.category] : 'barbell-outline') as any;
              return (
                <Pressable
                  onPress={() => { setCurrentExercise(index); setShowingCardio(false); }}
                  style={[styles.carouselItem, isCurr && styles.carouselItemActive]}
                >
                  <View style={[styles.carouselIcon, { backgroundColor: c2 + '22' }]}>
                    <Ionicons name={ic2} size={20} color={isCurr ? c2 : MUTED} />
                  </View>
                  <ThemedText
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
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
            {!showingCardio && (
            <>
            {/* Étapa 3 (#6+#18): aviso de series restauradas — describe el
                estado actual del día, no un evento puntual, sin acción de
                cerrar necesaria (mismo patrón que noPullBanner en training.tsx). */}
            {restoredSetsCount > 0 && (
              <View style={styles.restoredBanner}>
                <Ionicons name="information-circle-outline" size={15} color={AMBER} />
                <ThemedText style={styles.restoredBannerText}>
                  {t('workout.session.restoredBanner', { done: restoredSetsCount, total: totalSetsCount })}
                </ThemedText>
              </View>
            )}

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
                      const secs = v >= 1 && v <= 600 ? v : (currentEx?.restSeconds ?? 90);
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
                isRestored={s.isRestored}
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

            {/* Preferencia del ejercicio actual */}
            {currentPlan?.source !== 'manual' && (
            <View style={styles.prefSection}>
              <View style={styles.prefRow}>
                <Pressable onPress={() => handleTogglePreference(currentEx.exerciseId, 'liked')} hitSlop={10} style={styles.prefBtn}>
                  <Ionicons
                    name={preferencesMap.get(currentEx.exerciseId) === 'liked' ? 'thumbs-up' : 'thumbs-up-outline'}
                    size={20}
                    color={preferencesMap.get(currentEx.exerciseId) === 'liked' ? GREEN : MUTED}
                  />
                </Pressable>
                <Pressable onPress={() => handleTogglePreference(currentEx.exerciseId, 'disliked')} hitSlop={10} style={styles.prefBtn}>
                  <Ionicons
                    name={preferencesMap.get(currentEx.exerciseId) === 'disliked' ? 'thumbs-down' : 'thumbs-down-outline'}
                    size={20}
                    color={preferencesMap.get(currentEx.exerciseId) === 'disliked' ? AMBER : MUTED}
                  />
                </Pressable>
              </View>
              <ThemedText themeColor="textSecondary" style={styles.prefHint}>
                <Ionicons name="thumbs-up" size={12} color={GREEN} /> tus favoritos aparecerán con más frecuencia. <Ionicons name="thumbs-down" size={12} color={AMBER} /> no volverán a aparecer en tu plan — puedes deshacerlo cuando quieras desde tu perfil.
              </ThemedText>
            </View>
            )}

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
              {currentExerciseIdx < exercises.length - 1 ? (
                <Pressable
                  style={[styles.exNavBtn, styles.exNavBtnRight]}
                  onPress={() => setCurrentExercise(currentExerciseIdx + 1)}
                >
                  <ThemedText style={styles.exNavText}>{t('workout.session.nextEx')}</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={GREEN} />
                </Pressable>
              ) : (displayCardio.gym.length > 0 || homeBlocks.length > 0) ? (
                <Pressable
                  style={[styles.exNavBtn, styles.exNavBtnRight]}
                  onPress={() => setShowingCardio(true)}
                >
                  <ThemedText style={styles.exNavText}>{t('workout.session.goToCardio')}</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={GREEN} />
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.exNavBtn, styles.exNavBtnRight]}
                  onPress={handleFinish}
                >
                  <ThemedText style={styles.exNavText}>{t('workout.session.finishSession')}</ThemedText>
                </Pressable>
              )}
            </View>
            </>
            )}

            {showingCardio && (
              <>
                <ThemedText type="title">{t('workout.session.cardioTitle')}</ThemedText>

                {displayCardio.gym.map((block, i) => {
                  const gymEx = EXERCISES.find(e => e.id === block.exerciseId);
                  if (!gymEx) return null;
                  return (
                    <View key={`gym-${i}`} style={styles.cardioGymBlock}>
                      <View style={styles.cardioGymHeader}>
                        <Ionicons name="bicycle-outline" size={20} color={AMBER} />
                        <ThemedText style={styles.cardioGymName}>{getExerciseName(gymEx.id, lang)}</ThemedText>
                        <Pressable onPress={() => handleGymToggleComplete(i)} style={[styles.checkBtn, gymCompleted[i] && styles.checkBtnDone]}>
                          <Ionicons name={gymCompleted[i] ? 'checkmark' : 'ellipse-outline'} size={20} color={gymCompleted[i] ? '#04261A' : MUTED} />
                        </Pressable>
                      </View>
                      {!gymCompleted[i] && (
                        gymRunningIndex === i ? (
                          <View style={styles.restBox}>
                            <Pressable onPress={() => handleGymAdjust(i, -300)} style={styles.restAdjBtn} hitSlop={8}>
                              <ThemedText style={styles.restAdjText}>−5min</ThemedText>
                            </Pressable>
                            <View style={styles.restCenter}>
                              <Ionicons name="hourglass-outline" size={16} color={AMBER} />
                              <ThemedText style={styles.restTimer}>{formatRest(gymRemaining[i] ?? 0)}</ThemedText>
                            </View>
                            <Pressable onPress={() => handleGymAdjust(i, +300)} style={styles.restAdjBtn} hitSlop={8}>
                              <ThemedText style={styles.restAdjText}>+5min</ThemedText>
                            </Pressable>
                            <Pressable onPress={() => handleGymPlayPause(i)} style={styles.restStopBtn}>
                              <ThemedText style={styles.restStopText}>{t('workout.session.pause')}</ThemedText>
                            </Pressable>
                          </View>
                        ) : (
                          <View style={styles.restIdleRow}>
                            <View style={styles.restEditRow}>
                              <Ionicons name="timer-outline" size={16} color={MUTED} />
                              <TextInput
                                style={styles.restEditInput}
                                keyboardType="numeric"
                                value={gymInputStr[i] ?? ''}
                                onChangeText={(text) => setGymInputStr(prev => { const next = [...prev]; next[i] = text; return next; })}
                                onEndEditing={() => applyGymInput(i)}
                                onSubmitEditing={() => applyGymInput(i)}
                                selectTextOnFocus
                                returnKeyType="done"
                              />
                              <ThemedText themeColor="textSecondary" style={styles.restStartText}>{t('workout.session.minutesAbbrev')}</ThemedText>
                              <Pressable hitSlop={8} onPress={() => handleGymPlayPause(i)}>
                                <Ionicons name="play-circle" size={28} color={GREEN} />
                              </Pressable>
                            </View>
                          </View>
                        )
                      )}
                    </View>
                  );
                })}

                {displayCardio.homeSessions.map((session, s) => (
                  <View key={`session-${s}`}>
                    <ThemedText type="defaultSemiBold" style={styles.cardioSessionTitle}>
                      {t('workout.session.sessionLabel', { n: s + 1 })}
                    </ThemedText>
                    {session.blocks.map((block, bi) => {
                      const flatIdx = sessionOffsets[s] + bi;
                      const cardioEx = EXERCISES.find(e => e.id === block.exerciseId);
                      if (!cardioEx) return null;
                      return (
                        <TimedChecklistItem
                          key={`home-${flatIdx}`}
                          exercise={cardioEx}
                          remainingSeconds={cardioRemaining[flatIdx] ?? 0}
                          isRunning={cardioRunningIndex === flatIdx}
                          isCompleted={cardioCompleted[flatIdx] ?? false}
                          swapDisabled={true}
                          onPlayPause={() => handleCardioPlayPause(flatIdx)}
                          onToggleComplete={() => handleCardioToggleComplete(flatIdx)}
                          onSwap={() => {}}
                        />
                      );
                    })}
                    {session.restAfterSeconds > 0 && (
                      sessionRestRunning === s ? (
                        <View style={styles.restBox}>
                          <Pressable onPress={() => handleSessionRestAdjust(s, -15)} style={styles.restAdjBtn} hitSlop={8}>
                            <ThemedText style={styles.restAdjText}>−15s</ThemedText>
                          </Pressable>
                          <View style={styles.restCenter}>
                            <Ionicons name="hourglass-outline" size={16} color={AMBER} />
                            <ThemedText style={styles.restTimer}>{formatRest(sessionRestRemaining[s] ?? 0)}</ThemedText>
                          </View>
                          <Pressable onPress={() => handleSessionRestAdjust(s, +15)} style={styles.restAdjBtn} hitSlop={8}>
                            <ThemedText style={styles.restAdjText}>+15s</ThemedText>
                          </Pressable>
                          <Pressable onPress={() => handleSessionRestSkip(s)} style={styles.restStopBtn}>
                            <ThemedText style={styles.restStopText}>{t('workout.session.skipRest')}</ThemedText>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.restIdleRow}>
                          <View style={styles.restEditRow}>
                            <Ionicons name="timer-outline" size={16} color={MUTED} />
                            <TextInput
                              style={styles.restEditInput}
                              keyboardType="numeric"
                              value={sessionRestInputStr[s] ?? ''}
                              onChangeText={(text) => setSessionRestInputStr(prev => { const next = [...prev]; next[s] = text; return next; })}
                              onEndEditing={() => applySessionRestInput(s)}
                              onSubmitEditing={() => applySessionRestInput(s)}
                              selectTextOnFocus
                              returnKeyType="done"
                            />
                            <ThemedText themeColor="textSecondary" style={styles.restStartText}>s</ThemedText>
                            <Pressable hitSlop={8} onPress={() => handleSessionRestPlayPause(s)}>
                              <Ionicons name="play-circle" size={28} color={GREEN} />
                            </Pressable>
                          </View>
                        </View>
                      )
                    )}
                  </View>
                ))}

                <View style={styles.exNav}>
                  <Pressable style={styles.exNavBtn} onPress={() => setShowingCardio(false)}>
                    <Ionicons name="chevron-back" size={16} color={GREEN} />
                    <ThemedText style={styles.exNavText}>{t('workout.session.backToExercises')}</ThemedText>
                  </Pressable>
                  <Pressable style={[styles.exNavBtn, styles.exNavBtnRight]} onPress={handleFinish}>
                    <ThemedText style={styles.exNavText}>{t('workout.session.finishSession')}</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
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
          if (profile) replaceExercise(currentExerciseIdx, newId, profile);
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

      {/* ── ¿Finalizar sesión? ── */}
      <VulcanDialog
        visible={finishState === 'confirm'}
        onClose={() => setFinishState('idle')}
        title={t('workout.session.finishConfirmTitle')}
        message={t('workout.session.finishConfirmMsg')}
        confirmLabel={t('workout.session.finishSession')}
        cancelLabel={t('workout.session.stay')}
        onConfirm={() => { setFinishState('idle'); void doFinish(); }}
      />

      {/* ── ¿Finalizar sin completar? ── */}
      <VulcanDialog
        visible={finishState === 'incomplete'}
        onClose={() => setFinishState('idle')}
        title={t('workout.session.finishIncompleteTitle')}
        message={t('workout.session.finishIncompleteMsg', { count: pendingCount, exercises: pendingExerciseCount })}
        confirmLabel={t('workout.session.finishSession')}
        cancelLabel={t('workout.session.stay')}
        destructive
        onConfirm={() => { setFinishState('idle'); void doFinish(); }}
      />

      {/* ── ¿Cancelar sesión? ── */}
      <VulcanDialog
        visible={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={t('workout.session.cancelConfirmTitle')}
        message={t('workout.session.cancelConfirmMsg')}
        confirmLabel={t('workout.session.exitNoSave')}
        cancelLabel={t('workout.session.stay')}
        destructive
        onConfirm={() => { setCancelOpen(false); cancelSession(); }}
      />

      {/* ── Historial del ejercicio ── */}
      <VulcanDialog
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={t('workout.session.lastSession')}
        message={historyMsg}
        confirmLabel="OK"
        onConfirm={() => setHistoryOpen(false)}
        hideCancel
      />

      {/* ── Ayuda RIR ── */}
      <VulcanDialog
        visible={rirHelpOpen}
        onClose={() => setRirHelpOpen(false)}
        title={t('workout.session.rirHelpTitle')}
        message={t('workout.session.rirHelpBody')}
        confirmLabel="OK"
        onConfirm={() => setRirHelpOpen(false)}
        hideCancel
      />
    </ThemedView>
  );
}

// ── ExerciseGuideModal (A6) ───────────────────────────────────────────────────

const GUIDE_CAT_COLORS: Record<ExerciseCategory, string> = {
  push: GREEN, pull: AMBER, legs: '#5BD897', core: GREEN, cardio: AMBER, full_body: GREEN, mobility: BLUE,
};
const GUIDE_CAT_ICONS: Record<ExerciseCategory, string> = {
  push: 'arrow-up-circle-outline', pull: 'arrow-down-circle-outline',
  legs: 'walk-outline', core: 'fitness-outline',
  cardio: 'bicycle-outline', full_body: 'infinite-outline', mobility: 'accessibility-outline',
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

  // Context badge
  contextBadgeRow: { alignItems: 'center', paddingVertical: 4 },
  contextBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF0A',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3,
  },
  contextBadgeText: { fontSize: 11, color: MUTED, letterSpacing: 0.3 },

  // Pull/bicep coverage warning
  pullWarningBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginHorizontal: Spacing.three, marginBottom: Spacing.two,
  },
  pullWarningText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },

  // Carousel
  carouselList: { flexShrink: 0 },
  carousel: { paddingHorizontal: Spacing.three, gap: Spacing.two, alignItems: 'flex-start' },
  carouselItem: {
    alignItems: 'center', justifyContent: 'center', gap: 4,
    width: 72, height: 90,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1, borderColor: 'transparent',
  },
  carouselItemActive: { borderColor: GREEN + '55', backgroundColor: GREEN + '0D' },
  carouselIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  carouselLabel: { fontSize: 10, textAlign: 'center', color: MUTED, lineHeight: 15 },

  // Body
  body: { paddingHorizontal: Spacing.four, paddingTop: 8, gap: Spacing.three, paddingBottom: 40 },
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

  // Étapa 3 (#6+#18): aviso de series restauradas — mismo tratamiento visual
  // que calibBanner/noPullBanner (training.tsx): ámbar, borde izquierdo, sin
  // botón de cerrar porque describe el estado actual, no un evento puntual.
  restoredBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginBottom: Spacing.two,
  },
  restoredBannerText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },

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
    gap: Spacing.two,
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
    width: 72, height: 44, textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20, fontWeight: '700', color: AMBER,
    borderBottomWidth: 1.5, borderBottomColor: AMBER + '88',
  },
  restStartText: { fontSize: 13 },
  restNudgeRow:  { flexDirection: 'row', justifyContent: 'center', gap: Spacing.four },
  restNudgeText: { fontSize: 12, color: MUTED },
  cardioGymBlock: { gap: 6, marginBottom: Spacing.two, paddingBottom: Spacing.two, borderBottomWidth: 1, borderBottomColor: MUTED + '22' },
  cardioGymHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardioGymName: { flex: 1, fontSize: 15, fontWeight: '600' },
  cardioSessionTitle: { fontSize: 16, marginTop: Spacing.three, marginBottom: Spacing.one },

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
  // Étapa 3 (#6+#18): serie restaurada — más apagada que una recién
  // completada (0.75), para distinguir "de solo lectura" de "hecha hoy".
  setRowRestored: { opacity: 0.55 },
  setNum:     { width: 24, fontSize: 13, textAlign: 'center' },
  setInput: {
    flex: 1, height: 38, textAlign: 'center', fontSize: 16, fontWeight: '600',
    color: '#F1F4F1', backgroundColor: BG2, borderRadius: Spacing.one,
    borderWidth: 1, borderColor: '#FFFFFF14',
  },
  setInputRestored: { color: MUTED },
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

  // Preferencia del ejercicio
  prefSection: { alignItems: 'center', gap: 6, marginTop: Spacing.two, marginBottom: Spacing.one },
  prefRow: { flexDirection: 'row', gap: 16 },
  prefBtn: { padding: 4 },
  prefHint: { fontSize: 12, textAlign: 'center', paddingHorizontal: Spacing.four, lineHeight: 18 },

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
