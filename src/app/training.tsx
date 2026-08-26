import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { useSheetStore } from '@/store/sheet.store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VulcanSymbol } from '@/components/icons/VulcanSymbol';
import { ExerciseCard } from '@/components/workout/ExerciseCard';
import { ChangeExerciseModal } from '@/components/workout/ChangeExerciseModal';
import { useWorkoutStore, getSelectedDay, isDayCompleted, countCompletedTrainableDays, type StoredPlanDay } from '@/store/workout.store';
import { useSessionStore } from '@/store/session.store';
import { useProfileStore } from '@/store/profile.store';
import { useWarmupStore } from '@/store/warmup.store';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getExerciseName, getAlternatives, canDoAtHome, EXERCISES, type Exercise } from '@/lib/exercises';
import { getAllExerciseTargets } from '@/lib/progression';
import { generateWarmup } from '@/lib/warmupGenerator';
import { getProfileSignals, type PlannedExercise, type DayType } from '@/lib/plan-generator';
import type { CardioPlan } from '@/lib/cardioSelection';
import { getDislikedIds, getAllPreferences, togglePreference, type Preference } from '@/lib/exercisePreferences';
import { getTemplate } from '@/lib/routineTemplates';
import { buildExercisesFromTemplateDay } from '@/lib/routineMaterializer';

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

export function estimateDuration(exercises: PlannedExercise[]): number {
  return Math.round(exercises.reduce((sum, ex) => sum + ex.sets * (45 + ex.restSeconds), 0) / 60);
}

export function estimateCardioDuration(cardio: CardioPlan): number {
  const gymSeconds = cardio.gym.reduce((sum, b) => sum + b.durationSeconds, 0);
  const homeSeconds = cardio.homeSessions.reduce((sum, s) =>
    sum + s.blocks.reduce((bs, b) => bs + b.durationSeconds, 0) + s.restAfterSeconds, 0);
  return Math.round((gymSeconds + homeSeconds) / 60);
}

function countSets(exercises: PlannedExercise[]): number {
  return exercises.reduce((sum, ex) => sum + ex.sets, 0);
}

// ── Tarjeta de día condensada (ciclo / días que no son hoy) ──────────────────

interface OtherDayCardProps {
  day: StoredPlanDay;
  isExpanded: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  onSelectDay: () => void;
  onChangeEx?: (exIdx: number) => void;
  lang: 'es' | 'en' | 'fr';
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function OtherDayCard({ day, isExpanded, isCompleted, onToggle, onSelectDay, onChangeEx, lang, t }: OtherDayCardProps) {
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
          {/* Paso 2c (#6+#18): día ya completo al 100% en este ciclo — badge
              en vez de botón de selección. El resto de la tarjeta (expandir/
              contraer para ver ejercicios) sigue funcionando igual. */}
          {isCompleted ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={GREEN} />
              <ThemedText style={styles.completedBadgeText}>{t('tabs.training.dayCompletedBadge')}</ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={onSelectDay}
              style={({ pressed }) => [styles.selectDayBtn, pressed && { opacity: 0.6 }]}
            >
              <ThemedText style={styles.selectDayBtnText}>{t('tabs.training.selectDay')}</ThemedText>
            </Pressable>
          )}
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
              {onChangeEx && (
                <Pressable
                  onPress={() => onChangeEx(i)}
                  style={({ pressed }) => [styles.miniChangeBtn, pressed && { opacity: 0.6 }]}
                >
                  <ThemedText style={styles.miniChangeBtnText}>{t('tabs.training.changeEx')}</ThemedText>
                </Pressable>
              )}
            </View>
          ))}
          {(day.cardio.gym.length > 0 || day.cardio.homeSessions.length > 0) && (
            <View style={[styles.otherDayExRow, day.exercises.length > 0 && styles.otherDayExBorder]}>
              <ThemedText themeColor="textSecondary" style={styles.otherDayExName} numberOfLines={1}>
                {t('workout.session.cardioTitle')}
              </ThemedText>
              <ThemedText style={styles.otherDayCardioSummary}>
                {day.cardio.gym.length > 0
                  ? t('workout.session.cardioGymSummary', { n: day.cardio.gym.length })
                  : t('workout.session.cardioHomeSummary', { n: day.cardio.homeSessions.length })}
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </ThemedView>
  );
}

// ── TrainingScreen ────────────────────────────────────────────────────────────

export default function TrainingScreen() {
  const { t, i18n } = useTranslation();
  const { profile } = useProfileStore();
  const isDbReady = useProfileStore(s => s.isDbReady);
  const {
    currentPlan, isLoaded, isGenerating,
    loadCurrentPlan, generateAndSavePlan, replaceExercise,
  } = useWorkoutStore();
  // Bug 3a: días sin ejercicios nunca son "hoy" ni cuentan para el ciclo.
  // Se calcula aquí arriba (no más abajo, junto al resto de "Plan activo")
  // para que startRealSession/handleWarmupMinutes usen la MISMA base que el
  // render — si no, "hoy" en pantalla y el día que de verdad arranca la
  // sesión podrían desincronizarse en cuanto hubiera algún día vacío.
  const trainableDays = currentPlan ? currentPlan.days.filter(d => d.exercises.length > 0) : [];
  // #34: días entrenables realmente completos al 100% en este ciclo — reemplaza
  // a daysFinishedThisWeek (que contaba sesiones terminadas, no días distintos)
  // como fuente única del contador "Día X de Y" y de weekComplete.
  const completedTrainableDaysCount = currentPlan
    ? countCompletedTrainableDays(trainableDays, currentPlan.completedDayIds)
    : 0;
  const startSession       = useSessionStore(s => s.startSession);
  const setTrainingContext = useSessionStore(s => s.setTrainingContext);
  const startWarmup         = useWarmupStore(s => s.start);
  const isWarmupActive      = useWarmupStore(s => s.active);

  const [expandedOtherDay, setExpandedOtherDay] = useState<number | null>(null);
  // Atado al id inválido específico, no un booleano suelto: si
  // selectedDayId cambia a OTRO id igualmente inválido, el banner debe
  // volver a aparecer en vez de quedar descartado para siempre.
  const [dismissedStaleDayId, setDismissedStaleDayId] = useState<number | null>(null);
  const [changeModal, setChangeModal] = useState({
    visible: false, dayDbId: 0, exIdx: 0, exId: '',
  });
  // targetMap: exerciseId → { weightKg, reason } del sistema de progresión
  const [targetMap, setTargetMap] = useState<Record<string, { weightKg: number | null; reason: string | null }>>({});
  const [preferencesMap, setPreferencesMap] = useState<Map<string, Preference>>(new Map());
  const [isStarting,   setIsStarting]  = useState(false);
  const [startError,   setStartError]  = useState('');
  const [resetWeekOpen, setResetWeekOpen] = useState(false);
  const [backToAutoOpen, setBackToAutoOpen] = useState(false);
  const [warmupPromptOpen,   setWarmupPromptOpen]   = useState(false);
  const [warmupMinutesOpen, setWarmupMinutesOpen] = useState(false);
  const [pendingContext, setPendingContext] = useState<'gym' | 'home' | null>(null);

  const lang      = normalizeLang(i18n.language);
  const equipment = parseEquipment(profile?.equipment);
  const isGym     = profile?.location === 'gym' || profile?.location === 'both';

  const bwLabel = lang === 'es' ? 'Peso corporal' : lang === 'fr' ? 'Poids du corps' : 'Bodyweight';

  useEffect(() => {
    if (!isDbReady) return;
    loadCurrentPlan();
  }, [isDbReady]);

  // Carga los targets de progresión del plan activo
  useEffect(() => {
    if (!isDbReady) return;
    if (!currentPlan) return;
    (async () => {
      const targets = await getAllExerciseTargets();
      const map: Record<string, { weightKg: number | null; reason: string | null }> = {};
      for (const t of targets) {
        map[t.exerciseId] = {
          weightKg: t.targetWeightKg ?? null,
          reason:   t.progressionReason ?? null,
        };
      }
      setTargetMap(map);
    })();
  }, [isDbReady, currentPlan?.id, currentPlan?.selectedDayId]);

  useEffect(() => {
    if (!isDbReady) return;
    getAllPreferences().then(setPreferencesMap);
  }, [isDbReady, currentPlan?.id, currentPlan?.selectedDayId]);

  // Punto 1 — rutina ancla para location:'both': si el plan activo es
  // manual y el usuario elige entrenar HOY en el contexto que NO es el
  // ancla, sustituye el día completo (no ejercicio-por-ejercicio) por el
  // día correspondiente de la plantilla del otro contexto, emparejado por
  // ÍNDICE con módulo — mismo criterio que ya usa el ancla para decidir
  // "qué día toca" (getSelectedDay sobre selectedDayId). Puramente en memoria: nunca
  // escribe en plan_days, nunca resetea el ciclo ni el contador semanal.
  // Si la plantilla del otro contexto no existe o no tiene ningún día
  // entrenable, cae al filtro E-3 de siempre (substituted: false).
  async function resolveEffectiveDay(context: 'gym' | 'home' | null): Promise<{ day: StoredPlanDay; substituted: boolean }> {
    const { day: anchorDay, index: activeIdx } = getSelectedDay(currentPlan!.selectedDayId, trainableDays);
    if (currentPlan!.source === 'manual' && context && context !== currentPlan!.context && profile) {
      const otherTemplateDays = await getTemplate(context);
      const trainableOtherDays = otherTemplateDays.filter(d => d.slots.some(s => s.exerciseId !== null));
      if (trainableOtherDays.length > 0) {
        const substituteIdx = activeIdx % trainableOtherDays.length;
        const substituteDay = trainableOtherDays[substituteIdx];
        const substituteExercises = buildExercisesFromTemplateDay(substituteDay, profile);
        const substituteCardio: CardioPlan | null = substituteDay.cardio
          ? JSON.parse(substituteDay.cardio) as CardioPlan
          : null;
        return {
          day: {
            ...anchorDay,
            exercises: substituteExercises,
            dayType: substituteDay.dayType as DayType,
            ...(substituteCardio ? { cardio: substituteCardio } : {}),
          },
          substituted: true,
        };
      }
    }
    return { day: anchorDay, substituted: false };
  }

  async function startRealSession(context: 'gym' | 'home' | null) {
    if (!currentPlan) return;
    const { day: resolvedDay, substituted } = await resolveEffectiveDay(context);
    let   sessionDay = resolvedDay;
    // El día ya nacía sin ejercicios ANTES de tocar el filtro de casa (p. ej.
    // un día materializado desde una plantilla sin slots elegidos) — distinto
    // de quedarse vacío POR el filtro E-3 de abajo. Determina qué mensaje usar.
    const wasEmptyBeforeFilter = sessionDay.exercises.length === 0;

    // ── E-3: Filtro ligero para contexto de casa ─────────────────────────────
    // Solo si el usuario eligió "En casa" en el Alert de E-2. Para gym o sin
    // contexto, el plan queda intacto. Si ya hubo sustitución por rutina
    // ancla (Punto 1), el día sustituido YA viene de la plantilla de casa —
    // no hace falta volver a filtrar por equipamiento.
    if (context === 'home' && !substituted) {
      const homeEquipment = parseEquipment(profile?.equipment);

      // Cuenta usos para no repetir el mismo sustituto más de 2 veces.
      // Incluimos los ejercicios que ya pasan canDoAtHome (sin sustituir).
      const usageCount = new Map<string, number>();
      for (const ex of sessionDay.exercises) {
        if (canDoAtHome(ex.exerciseId, homeEquipment)) {
          usageCount.set(ex.exerciseId, (usageCount.get(ex.exerciseId) ?? 0) + 1);
        }
      }

      const filteredExercises = sessionDay.exercises
        .map(ex => {
          if (canDoAtHome(ex.exerciseId, homeEquipment)) return ex;

          const alts = getAlternatives(ex.exerciseId, homeEquipment, false);
          if (alts.length === 0) {
            // Sin ninguna alternativa bodyweight/casa válida — se excluye del
            // día en vez de dejar pasar un ejercicio que requiere equipo que
            // el usuario no tiene (ver EQUIPMENT_LEAK_AUDIT.md).
            return null;
          }

          // 1. Mejor alternativa con menos de 2 usos (por solapamiento muscular)
          let chosen = alts.find(a => (usageCount.get(a.id) ?? 0) < 2);

          // 2. Búsqueda ampliada: cualquier ejercicio de casa de la misma categoría
          //    con menos de 2 usos (evita una 3.ª repetición forzada)
          if (!chosen) {
            const srcEx = EXERCISES.find(e => e.id === ex.exerciseId);
            if (srcEx) {
              const broader = EXERCISES.filter(e =>
                e.id !== ex.exerciseId &&
                e.category === srcEx.category &&
                (e.equipment.length === 0 || e.equipment.every(eq => homeEquipment.includes(eq))),
              );
              chosen = broader.find(a => (usageCount.get(a.id) ?? 0) < 2);
            }
          }

          // 3. Último recurso: la menos usada entre las alternativas primarias
          const winner = chosen ?? alts.reduce((min, a) =>
            (usageCount.get(a.id) ?? 0) < (usageCount.get(min.id) ?? 0) ? a : min,
          );

          usageCount.set(winner.id, (usageCount.get(winner.id) ?? 0) + 1);
          return { ...ex, exerciseId: winner.id, isCompound: winner.isCompound };
        })
        .filter((ex): ex is PlannedExercise => ex !== null);
      sessionDay = { ...sessionDay, exercises: filteredExercises };
    }

    // Salvaguarda: si no queda ningún ejercicio (ya sea porque el día nacía
    // vacío desde el origen, o porque el filtro E-3 de casa dejó todo fuera),
    // no arrancamos la sesión (se vería como una pantalla de "Cargando…" sin
    // salida) — avisamos y el usuario se queda en esta pantalla. El mensaje
    // distingue ambos casos: homeEmptyDay está escrito para el escenario del
    // filtro de equipamiento, no para un día genuinamente sin ejercicios.
    if (sessionDay.exercises.length === 0) {
      setStartError(t(wasEmptyBeforeFilter ? 'workout.today.emptyDay' : 'workout.today.homeEmptyDay'));
      return;
    }

    console.log('[Training] doStartSession — context:', context, 'day:', sessionDay.dayType);
    setTrainingContext(context);
    setIsStarting(true);
    try {
      await startSession(currentPlan.id, sessionDay);
      console.log('[Training] startSession OK — exercises:', sessionDay.exercises.length);
    } catch (err) {
      console.error('[Training] startSession ERROR:', err);
      setStartError(String(err instanceof Error ? err.message : err));
    } finally {
      setIsStarting(false);
    }
  }

  // ── Fase 1b Paso 2: pregunta de calentamiento ────────────────────────────────
  // Intercepta el arranque justo con la ubicación ya resuelta (mismo "context"
  // que hoy ya distingue casa/gimnasio, tanto para usuarios "both" como de una
  // sola ubicación). Si el usuario dice "No", el comportamiento es idéntico al
  // actual: startRealSession() es el mismo cuerpo que antes tenía doStartSession.
  function doStartSession(context: 'gym' | 'home' | null) {
    if (!currentPlan) return;
    setPendingContext(context);
    const mode = profile?.warmupPromptMode ?? 'ask';
    if (mode === 'never') {
      // Mismo camino que handleWarmupNo(), sin pasar por el diálogo sí/no.
      void startRealSession(context);
    } else if (mode === 'always') {
      // Mismo camino que handleWarmupYes(): salta directo a elegir minutos,
      // sin preguntar si se quiere calentar.
      setWarmupMinutesOpen(true);
    } else {
      setWarmupPromptOpen(true);
    }
  }

  function handleWarmupNo() {
    setWarmupPromptOpen(false);
    void startRealSession(pendingContext);
  }

  function handleWarmupYes() {
    setWarmupPromptOpen(false);
    setWarmupMinutesOpen(true);
  }

  async function handleWarmupMinutes(minutes: 5 | 10 | 15) {
    setWarmupMinutesOpen(false);
    if (!currentPlan) return;
    const { day: resolvedDay } = await resolveEffectiveDay(pendingContext);
    const dayType = resolvedDay.dayType;
    // pendingContext: 'home' = casa; 'gym' o null (perfil solo-gym) = gimnasio.
    const warmupIsGym = pendingContext !== 'home';
    const dislikedIds = await getDislikedIds();
    const items = generateWarmup(dayType, equipment, warmupIsGym, minutes, dislikedIds);
    startWarmup(items, dayType, equipment, warmupIsGym, dislikedIds);
  }

  // ── Fase 1b Paso 3: puente de finalización del calentamiento ────────────────
  // Detecta la transición active: true → false del store de calentamiento
  // (botones "Finalizar calentamiento" / "Ir a tu entreno" en warmup.tsx) y
  // SOLO entonces arranca la sesión real. Independiente de handleWarmupNo, que
  // ya arranca la sesión por su cuenta cuando el usuario dice "No" al
  // calentamiento — en ese camino el store de calentamiento nunca se activa,
  // así que esta transición nunca se dispara para él.
  const wasWarmupActive = useRef(false);
  useEffect(() => {
    if (wasWarmupActive.current && !isWarmupActive) {
      void startRealSession(pendingContext);
    }
    wasWarmupActive.current = isWarmupActive;
  }, [isWarmupActive, pendingContext]);

  function handleStart() {
    if (!currentPlan) return;
    if (profile?.location === 'both') {
      const locMode = profile?.trainingLocationMode ?? 'ask';
      if (locMode === 'gym' || locMode === 'home') {
        void doStartSession(locMode);
      } else {
        useSheetStore.getState().open({
          options: [
            { value: 'gym',  label: t('workout.session.whereGym') },
            { value: 'home', label: t('workout.session.whereHome') },
          ],
          onSelect: (ctx) => { void doStartSession(ctx as 'gym' | 'home'); },
          title: t('workout.session.whereTitle'),
          cancelLabel: t('common.cancel'),
        });
      }
    } else if (profile?.location === 'home') {
      void doStartSession('home');
    } else {
      void doStartSession(null);
    }
  }

  // "Semana completada" — modo manual reactiva el mismo plan (nuevo ciclo,
  // sin regenerar ejercicios); modo automático sigue generando un plan nuevo.
  async function handleGenerateNextWeek() {
    if (!profile) return;
    if (currentPlan?.source === 'manual' && currentPlan.context) {
      const signals = await getProfileSignals(profile);
      await useWorkoutStore.getState().startNextManualCycle(currentPlan.context, profile, signals.equipment, signals.dislikedIds);
    } else {
      await generateAndSavePlan(profile);
    }
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
              : <ThemedText style={styles.genBtnText}>{t('workout.noplan.buttonAuto')}</ThemedText>
            }
          </Pressable>
          <Pressable
            style={styles.genBtnSecondary}
            onPress={() => useProfileStore.getState().openRoutineBuilder()}
          >
            <ThemedText style={styles.genBtnSecondaryText}>{t('workout.noplan.buttonManual')}</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Sin días entrenables (bug 3a) ────────────────────────────────────────────
  if (trainableDays.length === 0) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <VulcanSymbol size={80} />
          <ThemedText type="subtitle" style={styles.noPlanTitle}>{t('workout.noTrainableDays.title')}</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.noPlanSub}>{t('workout.noTrainableDays.subtitle')}</ThemedText>
          <Pressable
            style={styles.genBtn}
            onPress={() => useProfileStore.getState().openRoutineBuilder()}
          >
            <ThemedText style={styles.genBtnText}>{t('workout.noTrainableDays.button')}</ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Plan activo ──────────────────────────────────────────────────────────────
  const { day: today, index: activeIdx } = getSelectedDay(currentPlan.selectedDayId, trainableDays);
  const otherDays  = trainableDays.filter((_, i) => i !== activeIdx);

  // Día guardado que ya no existe entre los entrenables (editado a 0
  // ejercicios, borrado, etc.) — getSelectedDay() ya cayó al fallback
  // silencioso arriba; este banner es el aviso real que faltaba (Paso 2b).
  const staleSelectedDayId =
    currentPlan.selectedDayId !== null && !trainableDays.some(d => d.dbId === currentPlan.selectedDayId)
      ? currentPlan.selectedDayId
      : null;
  const showStaleDayBanner = staleSelectedDayId !== null && dismissedStaleDayId !== staleSelectedDayId;
  const estMin     = estimateDuration(today.exercises) + estimateCardioDuration(today.cardio);
  const totalSets_ = countSets(today.exercises);
  const isPullRelevantDay = today.dayType === 'pull' || today.dayType === 'upper';
  const dayExercises = today.exercises
    .map(ex => EXERCISES.find(e => e.id === ex.exerciseId))
    .filter((e): e is Exercise => e !== undefined);

  // Fuera de días pull/upper ninguna de las dos condiciones aplica (siempre "true" = sin aviso).
  const hasBackVariety = !isPullRelevantDay || dayExercises.some(e => e.category === 'pull' && e.isCompound);
  const hasBicepWork   = !isPullRelevantDay || dayExercises.some(e => e.primaryMuscles.includes('biceps'));

  const pullWarningKey: string | null =
    hasBackVariety && hasBicepWork    ? null :
    !hasBackVariety && !hasBicepWork  ? 'workout.today.noBackVarietyOrBicep' :
    !hasBackVariety                   ? 'workout.today.noBackVariety' :
    'workout.today.noBicepWork';

  const weekComplete = trainableDays.length > 0 && completedTrainableDaysCount >= trainableDays.length;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {weekComplete ? (
            <View style={styles.weekCompleteWrap}>
              <VulcanSymbol size={80} />
              <ThemedText type="subtitle" style={styles.weekCompleteTitle}>
                {t('tabs.training.weekComplete.title')}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.weekCompleteSubtitle}>
                {t('tabs.training.weekComplete.subtitle', { days: trainableDays.length })}
              </ThemedText>
              <Pressable
                style={[styles.genBtn, isGenerating && styles.genBtnDisabled]}
                onPress={handleGenerateNextWeek}
                disabled={isGenerating || !profile}
              >
                {isGenerating
                  ? <ActivityIndicator size="small" color="#04261A" />
                  : <ThemedText style={styles.genBtnText}>{t('tabs.training.weekComplete.generateButton')}</ThemedText>
                }
              </Pressable>
            </View>
          ) : (
          <>
          {/* ── Aviso: el día guardado ya no tiene ejercicios ── */}
          {showStaleDayBanner && (
            <View style={styles.staleDayBanner}>
              <Ionicons name="information-circle-outline" size={15} color={AMBER} />
              <ThemedText style={styles.staleDayBannerText}>
                {t('tabs.training.staleDayBanner')}
              </ThemedText>
              <Pressable
                onPress={() => setDismissedStaleDayId(staleSelectedDayId)}
                hitSlop={8}
                accessibilityLabel={t('tabs.training.staleDayBannerDismiss')}
                style={({ pressed }) => pressed && { opacity: 0.6 }}
              >
                <Ionicons name="close" size={16} color={AMBER} />
              </Pressable>
            </View>
          )}

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
                {t('workout.planDay', { current: completedTrainableDaysCount + 1, total: trainableDays.length })}
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

          {/* ── Aviso: día pull/upper con poca variedad de espalda o sin bíceps ── */}
          {pullWarningKey && (
            <View style={styles.noPullBanner}>
              <Ionicons name="information-circle-outline" size={15} color={AMBER} />
              <ThemedText style={styles.noPullBannerText}>
                {t(pullWarningKey)}
              </ThemedText>
            </View>
          )}

          {/* ── Tarjetas de ejercicios ── */}
          {today.exercises.map((ex, i) => (
            <ExerciseCard
              key={`${ex.exerciseId}-${i}`}
              plannedEx={ex}
              lastWeightKg={targetMap[ex.exerciseId]?.weightKg ?? null}
              progressionReason={targetMap[ex.exerciseId]?.reason ?? null}
              lang={lang}
              bodyweightLabel={bwLabel}
              onChangeExercise={currentPlan.source === 'manual' ? undefined : () => setChangeModal({
                visible: true,
                dayDbId: today.dbId,
                exIdx:   i,
                exId:    ex.exerciseId,
              })}
              preference={preferencesMap.get(ex.exerciseId) ?? null}
              onTogglePreference={(pref) => handleTogglePreference(ex.exerciseId, pref)}
            />
          ))}

          {(today.cardio.gym.length > 0 || today.cardio.homeSessions.length > 0) && (
            <ThemedView type="backgroundElement" style={styles.cardioCard}>
              <View style={[styles.cardioPlaceholder, { backgroundColor: AMBER + '22' }]}>
                <Ionicons name="bicycle-outline" size={34} color={AMBER} />
              </View>
              <View style={styles.cardioInfo}>
                <ThemedText type="defaultSemiBold" style={styles.cardioName}>
                  {t('workout.session.cardioTitle')}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.cardioSubtitle}>
                  {today.cardio.gym.length > 0 ? t('workout.session.cardioGymLabel') : t('workout.session.cardioHomeLabel')}
                </ThemedText>
                <ThemedText style={styles.cardioSummary}>
                  {today.cardio.gym.length > 0
                    ? t('workout.session.cardioGymSummary', { n: today.cardio.gym.length })
                    : t('workout.session.cardioHomeSummary', { n: today.cardio.homeSessions.length })}
                </ThemedText>
              </View>
            </ThemedView>
          )}

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

              {trainableDays.map((day, rawIdx) => {
                if (rawIdx === activeIdx) return null;
                const isExpanded = expandedOtherDay === rawIdx;
                return (
                  <OtherDayCard
                    key={day.dbId}
                    day={day}
                    isExpanded={isExpanded}
                    isCompleted={isDayCompleted(day.dbId, currentPlan.completedDayIds)}
                    onToggle={() => setExpandedOtherDay(isExpanded ? null : rawIdx)}
                    onSelectDay={() => useWorkoutStore.getState().selectDay(day.dbId)}
                    onChangeEx={currentPlan.source === 'manual' ? undefined : (exIdx) => setChangeModal({
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
          </>
          )}

          {/* ── Enlace discreto: generar semana nueva desde cero (oculto en modo manual) ── */}
          {currentPlan.source !== 'manual' && (
            <Pressable
              onPress={() => setResetWeekOpen(true)}
              style={[styles.resetWeekLink, isGenerating && styles.resetWeekLinkDisabled]}
              disabled={isGenerating}
              hitSlop={8}
            >
              <ThemedText themeColor="textSecondary" style={styles.resetWeekLinkText}>
                {t('tabs.training.resetWeek.link')}
              </ThemedText>
            </Pressable>
          )}

          {/* ── Volver al plan automático (Punto 4 — solo en modo manual) ── */}
          {currentPlan.source === 'manual' && (
            <Pressable
              onPress={() => setBackToAutoOpen(true)}
              style={styles.genBtnSecondary}
            >
              <ThemedText style={styles.genBtnSecondaryText}>{t('routineBuilder.backToAutoLink')}</ThemedText>
            </Pressable>
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
          if (profile) replaceExercise(changeModal.dayDbId, changeModal.exIdx, newId, profile);
          setChangeModal(m => ({ ...m, visible: false }));
        }}
      />

      {/* ── ¿Dónde entrenas hoy? (solo location=both) ── */}
      {/* Migrado al store-driven BottomSheetOverlay (piloto #40 parte 2),
          montado sin condicional en _layout.tsx — abierto desde handleStart()
          vía useSheetStore.getState().open(...) */}

      {/* ── ¿Quieres calentar antes de empezar? ── */}
      <VulcanDialog
        visible={warmupPromptOpen}
        onClose={handleWarmupNo}
        title={t('workout.warmup.promptTitle')}
        confirmLabel={t('workout.warmup.yes')}
        cancelLabel={t('workout.warmup.no')}
        onConfirm={handleWarmupYes}
      />

      {/* ── ¿Cuánto tiempo quieres calentar? (chips, mismo estilo que StepLocation/equipment) ── */}
      <Modal
        visible={warmupMinutesOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWarmupMinutesOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setWarmupMinutesOpen(false)}>
          <View style={[StyleSheet.absoluteFill, styles.warmupMinutesBackdrop]} />
        </Pressable>

        <View style={styles.warmupMinutesCenterer} pointerEvents="box-none">
          <ThemedView type="backgroundElement" style={styles.warmupMinutesCard}>
            <ThemedText type="defaultSemiBold" style={styles.warmupMinutesTitle}>
              {t('workout.warmup.minutesTitle')}
            </ThemedText>
            <View style={styles.warmupChipRow}>
              {([5, 10, 15] as const).map((m) => (
                <Pressable key={m} onPress={() => handleWarmupMinutes(m)} style={styles.warmupChipPressable}>
                  <ThemedView type="backgroundSelected" style={styles.warmupChip}>
                    <ThemedText type="defaultSemiBold" style={styles.warmupChipText}>
                      {t(`workout.warmup.min${m}`)}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </View>
          </ThemedView>
        </View>
      </Modal>

      <VulcanDialog
        visible={startError !== ''}
        onClose={() => setStartError('')}
        title="Error al iniciar"
        message={startError}
        confirmLabel="OK"
        onConfirm={() => setStartError('')}
        hideCancel
      />

      {/* ── ¿Generar semana nueva desde cero? (oculto en modo manual) ── */}
      {currentPlan.source !== 'manual' && (
        <VulcanDialog
          visible={resetWeekOpen}
          onClose={() => setResetWeekOpen(false)}
          title={t('tabs.training.resetWeek.title')}
          message={t('tabs.training.resetWeek.msg')}
          confirmLabel={t('tabs.training.resetWeek.confirm')}
          cancelLabel={t('common.cancel')}
          destructive
          onConfirm={async () => {
            if (isGenerating) return;
            setResetWeekOpen(false);
            if (profile) {
              try {
                await generateAndSavePlan(profile);
              } catch (err) {
                console.error('[Training] Error al generar semana nueva:', err);
              }
            }
          }}
        />
      )}

      {/* ── ¿Volver al plan automático? (Punto 4 — solo en modo manual) ── */}
      {currentPlan.source === 'manual' && (
        <VulcanDialog
          visible={backToAutoOpen}
          onClose={() => setBackToAutoOpen(false)}
          title={t('routineBuilder.backToAutoTitle')}
          message={t('routineBuilder.backToAutoMsg')}
          confirmLabel={t('routineBuilder.backToAutoConfirm')}
          cancelLabel={t('common.cancel')}
          destructive
          onConfirm={async () => {
            setBackToAutoOpen(false);
            if (profile) await useWorkoutStore.getState().backToAutoPlan(profile);
          }}
        />
      )}
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
  genBtnSecondary: {
    borderRadius: Spacing.three, borderWidth: 1, borderColor: GREEN + '55',
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    minWidth: 200, alignItems: 'center',
  },
  genBtnSecondaryText: { color: GREEN, fontSize: 15, fontWeight: '600' },

  // Plan header
  planHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  planHeaderLeft:  { gap: 2 },
  planHeaderTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.7 },
  planHeaderSub:   { fontSize: 13 },

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

  // Aviso: día sin ejercicios compuestos de pull
  noPullBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  noPullBannerText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },

  // Aviso: día guardado ya no entrenable (Paso 2b)
  staleDayBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
  },
  staleDayBannerText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },

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
  selectDayBtn:      {
    paddingHorizontal: Spacing.two, paddingVertical: 3,
    borderRadius: Spacing.one, borderWidth: 1, borderColor: GREEN + '44',
  },
  selectDayBtnText:  { fontSize: 11, color: GREEN },
  completedBadge:    {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.two, paddingVertical: 3,
    borderRadius: Spacing.one, borderWidth: 1, borderColor: GREEN + '44',
  },
  completedBadgeText: { fontSize: 11, color: GREEN },
  otherDayCardioSummary: { fontSize: 12, color: AMBER },

  // Cardio card (hoy)
  cardioCard: {
    borderRadius: Spacing.three, padding: Spacing.three,
    flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start',
  },
  cardioPlaceholder: {
    width: 72, height: 72, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  cardioInfo: { flex: 1, gap: 4 },
  cardioName: { fontSize: 15, lineHeight: 20 },
  cardioSubtitle: { fontSize: 12 },
  cardioSummary: { fontSize: 13, fontWeight: '500', color: '#F1F4F1' },

  // Rest indicator
  restRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
  restLine:{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: MUTED + '44' },
  restText:{ fontSize: 12 },

  // Semana completada
  weekCompleteWrap: {
    alignItems: 'center', justifyContent: 'center',
    gap: Spacing.three, paddingVertical: Spacing.five,
  },
  weekCompleteTitle:    { textAlign: 'center', marginTop: Spacing.two },
  weekCompleteSubtitle: { textAlign: 'center', lineHeight: 22, fontSize: 14 },

  // Enlace: generar semana nueva desde cero
  resetWeekLink:         { alignItems: 'center', paddingVertical: Spacing.three, marginTop: Spacing.one },
  resetWeekLinkDisabled: { opacity: 0.6 },
  resetWeekLinkText:     { fontSize: 12, textDecorationLine: 'underline', opacity: 0.8 },

  // Modal de minutos de calentamiento — chips (mismo patrón que
  // locationChip/chipActive de equipment.tsx y StepLocation.tsx)
  warmupMinutesBackdrop: { backgroundColor: 'rgba(0,0,0,0.5)' },
  warmupMinutesCenterer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  warmupMinutesCard: {
    width: '100%', borderRadius: 20,
    padding: Spacing.four, gap: Spacing.three,
  },
  warmupMinutesTitle: { fontSize: 17, textAlign: 'center' },
  warmupChipRow: { flexDirection: 'row', gap: Spacing.two },
  warmupChipPressable: { flex: 1 },
  warmupChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3FBF7F33',
  },
  warmupChipText: { fontSize: 14 },
});
