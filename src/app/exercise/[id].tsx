import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EXERCISES, type ExerciseCategory } from '@/lib/exercises';
import { muscleLabel } from '@/components/workout/ExerciseCard';
import { BottomTabInset, Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const LIGHT = '#5BD897';
const MUTED = '#9DA89F';

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  push: GREEN, pull: AMBER, legs: LIGHT, core: GREEN, cardio: AMBER, full_body: GREEN,
};
const CATEGORY_ICONS: Record<ExerciseCategory, string> = {
  push: 'arrow-up-circle-outline', pull: 'arrow-down-circle-outline',
  legs: 'walk-outline', core: 'fitness-outline',
  cardio: 'bicycle-outline', full_body: 'infinite-outline',
};

const DIFF_COLOR: Record<string, string> = {
  beginner: GREEN, intermediate: AMBER, advanced: '#FF6B6B',
};

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith('es') ? 'es' : i18n.language.startsWith('fr') ? 'fr' : 'en') as 'es' | 'en' | 'fr';

  const exercise = EXERCISES.find(e => e.id === id);

  if (!exercise) {
    return (
      <ThemedView style={styles.root}>
        <SafeAreaView style={styles.safe}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={GREEN} />
          </Pressable>
          <ThemedText style={styles.notFound}>Ejercicio no encontrado</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const catColor = CATEGORY_COLORS[exercise.category];
  const catIcon  = (CATEGORY_ICONS[exercise.category] ?? 'barbell-outline') as any;
  const name     = exercise.name[lang];
  const diffColor = DIFF_COLOR[exercise.difficulty] ?? MUTED;

  const DIFF_LABELS: Record<string, string> = lang === 'es'
    ? { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado' }
    : lang === 'fr'
    ? { beginner: 'Débutant', intermediate: 'Intermédiaire', advanced: 'Avancé' }
    : { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };

  const CAT_LABELS: Record<ExerciseCategory, string> = lang === 'es'
    ? { push: 'Empuje', pull: 'Jalón', legs: 'Piernas', core: 'Core', cardio: 'Cardio', full_body: 'Cuerpo completo' }
    : lang === 'fr'
    ? { push: 'Poussée', pull: 'Tirage', legs: 'Jambes', core: 'Gainage', cardio: 'Cardio', full_body: 'Corps entier' }
    : { push: 'Push', pull: 'Pull', legs: 'Legs', core: 'Core', cardio: 'Cardio', full_body: 'Full body' };

  const EQUIP_SHORT: Record<string, string> = lang === 'es'
    ? { dumbbells: 'Mancuernas', barbellPlates: 'Barra y discos', kettlebells: 'Kettlebells', pullupBar: 'Barra dominadas', parallettes: 'Paralelas', rings: 'Anillas', trx: 'TRX', adjustableBench: 'Banco', resistanceBands: 'Bandas', miniGluteBands: 'Mini-bands', plioBox: 'Cajón pliométrico', medicineBall: 'Balón medicinal', fitball: 'Fitball', abRoller: 'Rueda abdominal', jumpRope: 'Comba', mat: 'Esterilla', foamRoller: 'Rodillo', sliders: 'Sliders', weightedVest: 'Chaleco lastrado' }
    : lang === 'fr'
    ? { dumbbells: 'Haltères', barbellPlates: 'Barre et disques', kettlebells: 'Kettlebells', pullupBar: 'Barre de traction', parallettes: 'Barres parallèles', rings: 'Anneaux', trx: 'TRX', adjustableBench: 'Banc', resistanceBands: 'Élastiques', miniGluteBands: 'Mini-bandes', plioBox: 'Caisse plio', medicineBall: 'Médecine-ball', fitball: 'Fitball', abRoller: 'Roue abdominale', jumpRope: 'Corde à sauter', mat: 'Tapis', foamRoller: 'Rouleau', sliders: 'Sliders', weightedVest: 'Gilet lesté' }
    : { dumbbells: 'Dumbbells', barbellPlates: 'Barbell', kettlebells: 'Kettlebells', pullupBar: 'Pull-up bar', parallettes: 'Parallettes', rings: 'Rings', trx: 'TRX', adjustableBench: 'Bench', resistanceBands: 'Resistance bands', miniGluteBands: 'Mini bands', plioBox: 'Plyo box', medicineBall: 'Medicine ball', fitball: 'Fitball', abRoller: 'Ab roller', jumpRope: 'Jump rope', mat: 'Mat', foamRoller: 'Foam roller', sliders: 'Sliders', weightedVest: 'Weighted vest' };

  const bwLabel = lang === 'es' ? 'Peso corporal' : lang === 'fr' ? 'Poids du corps' : 'Bodyweight';
  const equipText = exercise.equipment.length === 0
    ? bwLabel
    : exercise.equipment.map(eq => EQUIP_SHORT[eq] ?? eq).join(', ');

  const secLabel    = lang === 'es' ? 'Músculos principales' : lang === 'fr' ? 'Muscles principaux' : 'Primary muscles';
  const secSecLabel = lang === 'es' ? 'Músculos secundarios' : lang === 'fr' ? 'Muscles secondaires' : 'Secondary muscles';
  const equipLabel  = lang === 'es' ? 'Equipamiento' : lang === 'fr' ? 'Équipement' : 'Equipment';
  const diffLabel   = lang === 'es' ? 'Dificultad' : lang === 'fr' ? 'Difficulté' : 'Difficulty';
  const instrLabel  = lang === 'es' ? 'Instrucciones' : lang === 'fr' ? 'Instructions' : 'Instructions';
  const soonLabel   = lang === 'es' ? 'Instrucciones detalladas próximamente.' : lang === 'fr' ? 'Instructions détaillées bientôt disponibles.' : 'Detailed instructions coming soon.';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={GREEN} />
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* Hero placeholder */}
          <View style={[styles.hero, { backgroundColor: catColor + '1A' }]}>
            <Ionicons name={catIcon} size={80} color={catColor} />
          </View>

          {/* Chips row */}
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
              <ThemedText style={[styles.chipText, { color: catColor }]}>
                {CAT_LABELS[exercise.category]}
              </ThemedText>
            </View>
            <View style={[styles.chip, { backgroundColor: diffColor + '22', borderColor: diffColor + '55' }]}>
              <ThemedText style={[styles.chipText, { color: diffColor }]}>
                {DIFF_LABELS[exercise.difficulty]}
              </ThemedText>
            </View>
            {exercise.isCompound && (
              <View style={[styles.chip, { backgroundColor: AMBER + '22', borderColor: AMBER + '55' }]}>
                <ThemedText style={[styles.chipText, { color: AMBER }]}>
                  {lang === 'es' ? 'Compuesto' : lang === 'fr' ? 'Polyarticulaire' : 'Compound'}
                </ThemedText>
              </View>
            )}
          </View>

          {/* Name */}
          <ThemedText type="subtitle" style={styles.name}>{name}</ThemedText>

          {/* Info cards */}
          <InfoCard label={secLabel}>
            <View style={styles.muscleRow}>
              {exercise.primaryMuscles.map(m => (
                <MuscleChip key={m} label={muscleLabel(m, lang)} color={GREEN} />
              ))}
            </View>
          </InfoCard>

          {exercise.secondaryMuscles.length > 0 && (
            <InfoCard label={secSecLabel}>
              <View style={styles.muscleRow}>
                {exercise.secondaryMuscles.map(m => (
                  <MuscleChip key={m} label={muscleLabel(m, lang)} color={MUTED} />
                ))}
              </View>
            </InfoCard>
          )}

          <InfoCard label={equipLabel}>
            <ThemedText style={styles.infoText}>{equipText}</ThemedText>
          </InfoCard>

          {/* Instructions placeholder */}
          <InfoCard label={instrLabel}>
            <ThemedText themeColor="textSecondary" style={styles.infoText}>
              {soonLabel}
            </ThemedText>
          </InfoCard>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.infoCard}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      {children}
    </ThemedView>
  );
}

function MuscleChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.muscleChip, { backgroundColor: color + '22' }]}>
      <ThemedText style={[styles.muscleChipText, { color }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1 },
  safe:       { flex: 1 },
  notFound:   { textAlign: 'center', marginTop: 60 },
  backBtn:    { padding: Spacing.two + 4, marginLeft: Spacing.two },
  scroll:     {
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  hero:       {
    height: 180,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  chip:       {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
  },
  chipText:   { fontSize: 12, fontWeight: '600' },
  name:       { fontSize: 24, fontWeight: '700', marginTop: -Spacing.one },
  infoCard:   { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  infoLabel:  { fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 },
  infoText:   { fontSize: 14, lineHeight: 22 },
  muscleRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  muscleChip: { borderRadius: 20, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  muscleChipText: { fontSize: 12, fontWeight: '500' },
});
