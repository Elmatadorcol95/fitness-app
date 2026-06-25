import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { getExerciseName, EXERCISES, type ExerciseCategory } from '@/lib/exercises';
import type { PlannedExercise } from '@/lib/plan-generator';
import { Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const LIGHT = '#5BD897';
const MUTED = '#9DA89F';

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  push:      GREEN,
  pull:      AMBER,
  legs:      LIGHT,
  core:      GREEN,
  cardio:    AMBER,
  full_body: GREEN,
};

const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  push:      'arrow-up-circle-outline',
  pull:      'arrow-down-circle-outline',
  legs:      'walk-outline',
  core:      'fitness-outline',
  cardio:    'bicycle-outline',
  full_body: 'infinite-outline',
};

// Equipamiento que añade carga externa; el resto = peso corporal → muestra 'PC'
const LOADED_EQUIPMENT = new Set(['barbellPlates', 'dumbbells', 'kettlebells', 'weightedVest']);

const EQUIPMENT_SHORT: Record<string, { es: string; en: string; fr: string }> = {
  dumbbells:        { es: 'Mancuernas',   en: 'Dumbbells',    fr: 'Haltères' },
  barbellPlates:    { es: 'Barra',         en: 'Barbell',      fr: 'Barre' },
  kettlebells:      { es: 'Kettlebells',   en: 'Kettlebells',  fr: 'Kettlebells' },
  resistanceBands:  { es: 'Bandas',        en: 'Bands',        fr: 'Élastiques' },
  pullupBar:        { es: 'Barra dominadas',en: 'Pull-up bar', fr: 'Barre traction' },
  parallettes:      { es: 'Paralelas',     en: 'Parallettes',  fr: 'Barres parallèles' },
  rings:            { es: 'Anillas',       en: 'Rings',        fr: 'Anneaux' },
  trx:              { es: 'TRX',           en: 'TRX',          fr: 'TRX' },
  adjustableBench:  { es: 'Banco',         en: 'Bench',        fr: 'Banc' },
  plioBox:          { es: 'Cajón plio',    en: 'Plyo box',     fr: 'Caisse plio' },
  medicineBall:     { es: 'Balón med.',    en: 'Med ball',     fr: 'Médecine-ball' },
  fitball:          { es: 'Fitball',       en: 'Fitball',      fr: 'Fitball' },
  abRoller:         { es: 'Rueda abd.',    en: 'Ab roller',    fr: 'Roue abd.' },
  jumpRope:         { es: 'Comba',         en: 'Jump rope',    fr: 'Corde à sauter' },
  mat:              { es: 'Esterilla',     en: 'Mat',          fr: 'Tapis' },
  foamRoller:       { es: 'Rodillo',       en: 'Foam roller',  fr: 'Rouleau' },
  sliders:          { es: 'Sliders',       en: 'Sliders',      fr: 'Sliders' },
  weightedVest:     { es: 'Chaleco',       en: 'Weighted vest',fr: 'Gilet lesté' },
  miniGluteBands:   { es: 'Mini-bands',    en: 'Mini bands',   fr: 'Mini-bandes' },
  cableMachine:     { es: 'Polea',         en: 'Cable',        fr: 'Poulie' },
  legPressMachine:  { es: 'Máquina',       en: 'Machine',      fr: 'Machine' },
};

interface Props {
  plannedEx: PlannedExercise;
  lastWeightKg: number | null;
  /** Razón de progresión calculada por el algoritmo (mostrada debajo del resumen) */
  progressionReason?: string | null;
  lang: 'es' | 'en' | 'fr';
  onChangeExercise: () => void;
  bodyweightLabel: string;  // "Peso corporal" / "Bodyweight" / "Poids du corps"
}

export function ExerciseCard({ plannedEx, lastWeightKg, progressionReason, lang, onChangeExercise, bodyweightLabel }: Props) {
  const router = useRouter();
  const theme  = useTheme();

  const exercise = EXERCISES.find(e => e.id === plannedEx.exerciseId);
  if (!exercise) return null;

  const catColor = CATEGORY_COLORS[exercise.category];
  const catIcon  = (CATEGORY_ICONS[exercise.category] ?? 'barbell-outline') as any;
  const name     = getExerciseName(exercise.id, lang);

  const equipmentText = exercise.equipment.length === 0
    ? bodyweightLabel
    : exercise.equipment
        .map(eq => EQUIPMENT_SHORT[eq]?.[lang] ?? eq)
        .join(', ');

  const isBodyweight = !exercise.equipment.some(e => LOADED_EQUIPMENT.has(e));
  const weightText   = isBodyweight
    ? 'PC'
    : lastWeightKg !== null ? `${lastWeightKg} kg` : '— kg';

  const summaryText = `${plannedEx.sets} series · ${plannedEx.reps} reps · ${weightText}`;

  function openDetail() {
    router.push(`/exercise/${exercise!.id}` as any);
  }

  return (
    <Pressable
      onPress={openDetail}
      style={({ pressed }) => pressed && { opacity: 0.85 }}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        {/* Imagen placeholder */}
        <View style={[styles.placeholder, { backgroundColor: catColor + '22' }]}>
          <Ionicons name={catIcon} size={34} color={catColor} />
        </View>

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={2}>
              {name}
            </ThemedText>
            <Pressable onPress={onChangeExercise} hitSlop={12} style={styles.menuBtn}>
              <Ionicons name="ellipsis-horizontal" size={20} color={MUTED} />
            </Pressable>
          </View>

          <ThemedText themeColor="textSecondary" style={styles.muscles} numberOfLines={1}>
            {exercise.primaryMuscles
              .slice(0, 3)
              .map(m => muscleLabel(m, lang))
              .join(' · ')}
          </ThemedText>

          <ThemedText themeColor="textSecondary" style={styles.equipment} numberOfLines={1}>
            {equipmentText}
          </ThemedText>

          <View style={[styles.divider, { backgroundColor: theme.background }]} />

          <ThemedText style={styles.summary}>{summaryText}</ThemedText>

          {!!progressionReason && (
            <ThemedText style={styles.progressionReason} numberOfLines={2}>
              {progressionReason}
            </ThemedText>
          )}
        </View>
      </ThemedView>
    </Pressable>
  );
}

// ── Muscle label helper ───────────────────────────────────────────────────────

const MUSCLE_LABELS: Record<string, { es: string; en: string; fr: string }> = {
  chest:      { es: 'Pecho',       en: 'Chest',       fr: 'Poitrine' },
  back:       { es: 'Espalda',     en: 'Back',        fr: 'Dos' },
  shoulders:  { es: 'Hombros',     en: 'Shoulders',   fr: 'Épaules' },
  biceps:     { es: 'Bíceps',      en: 'Biceps',      fr: 'Biceps' },
  triceps:    { es: 'Tríceps',     en: 'Triceps',     fr: 'Triceps' },
  quads:      { es: 'Cuádriceps',  en: 'Quads',       fr: 'Quadriceps' },
  hamstrings: { es: 'Isquios',     en: 'Hamstrings',  fr: 'Ischio-jambiers' },
  glutes:     { es: 'Glúteos',     en: 'Glutes',      fr: 'Fessiers' },
  calves:     { es: 'Gemelos',     en: 'Calves',      fr: 'Mollets' },
  core:       { es: 'Core',        en: 'Core',        fr: 'Gainage' },
  lats:       { es: 'Dorsal',      en: 'Lats',        fr: 'Dorsaux' },
  traps:      { es: 'Trapecio',    en: 'Traps',       fr: 'Trapèzes' },
  forearms:   { es: 'Antebrazos',  en: 'Forearms',    fr: 'Avant-bras' },
  abs:        { es: 'Abdominales', en: 'Abs',         fr: 'Abdominaux' },
};

export function muscleLabel(muscleKey: string, lang: 'es' | 'en' | 'fr'): string {
  return MUSCLE_LABELS[muscleKey]?.[lang] ?? muscleKey;
}

export function equipmentLabel(key: string, lang: 'es' | 'en' | 'fr'): string {
  return EQUIPMENT_SHORT[key]?.[lang] ?? key;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  placeholder: {
    width: 72, height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info:     { flex: 1, gap: 4 },
  nameRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  name:     { flex: 1, fontSize: 15, lineHeight: 20 },
  menuBtn:  { paddingLeft: 4, paddingTop: 1 },
  muscles:  { fontSize: 12 },
  equipment:{ fontSize: 12 },
  divider:  { height: 1, marginVertical: 4 },
  summary:          { fontSize: 13, fontWeight: '500', color: '#F1F4F1' },
  progressionReason:{ fontSize: 11, color: AMBER, fontStyle: 'italic', marginTop: 2 },
});
