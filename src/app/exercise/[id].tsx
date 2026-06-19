import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { and, eq } from 'drizzle-orm';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SimpleLineChart } from '@/components/progress/SimpleLineChart';
import { EXERCISES, type ExerciseCategory } from '@/lib/exercises';
import { muscleLabel } from '@/components/workout/ExerciseCard';
import { db } from '@/db';
import { sessionSets, workoutSessions } from '@/db/schema';
import { useProfileStore } from '@/store/profile.store';
import { kgToLb } from '@/lib/units';
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

type HistoryEntry = {
  date: string;          // YYYY-MM-DD
  bestReps: number;
  bestKg: number;
  value: number;         // 1RM estimado (cargado) o max reps (peso corporal)
};

function epley(kg: number, reps: number): number {
  return kg * (1 + reps / 30);
}

function ddmm(date: string): string {
  const p = date.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}` : date;
}

function formatListDate(dateStr: string, lang: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const locale = lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : 'en-US';
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch { return ddmm(dateStr); }
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language.startsWith('es') ? 'es' : i18n.language.startsWith('fr') ? 'fr' : 'en') as 'es' | 'en' | 'fr';

  const isDbReady = useProfileStore(s => s.isDbReady);
  const profile   = useProfileStore(s => s.profile);
  const isImperial = profile?.units === 'imperial';

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const exercise = EXERCISES.find(e => e.id === id);
  const isBodyweight = !exercise || exercise.equipment.length === 0
    || !exercise.equipment.some(e => ['barbellPlates', 'dumbbells', 'kettlebells', 'cableMachine', 'legPressMachine', 'weightedVest'].includes(e));

  useEffect(() => {
    if (!isDbReady || !id) return;
    (async () => {
      try {
        const rows = await db
          .select({
            date:       workoutSessions.date,
            actualReps: sessionSets.actualReps,
            weightKg:   sessionSets.weightKg,
          })
          .from(sessionSets)
          .innerJoin(workoutSessions, eq(sessionSets.sessionId, workoutSessions.id))
          .where(and(eq(sessionSets.exerciseId, id), eq(sessionSets.completed, 1)));

        // Agrupar por fecha y calcular mejor serie del día
        const byDate: Record<string, Array<{ reps: number; kg: number }>> = {};
        for (const r of rows) {
          const reps = r.actualReps ?? 0;
          const kg   = r.weightKg   ?? 0;
          if (reps <= 0) continue;
          if (!byDate[r.date]) byDate[r.date] = [];
          byDate[r.date].push({ reps, kg });
        }

        const entries: HistoryEntry[] = Object.entries(byDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, sets]) => {
            if (isBodyweight) {
              const maxReps = Math.max(...sets.map(s => s.reps));
              return { date, bestReps: maxReps, bestKg: 0, value: maxReps };
            } else {
              // Mejor serie = la que da el 1RM más alto con Epley
              let bestE1rm = 0, bestReps = 0, bestKg = 0;
              for (const s of sets) {
                if (s.kg <= 0) continue;
                const e = epley(s.kg, s.reps);
                if (e > bestE1rm) { bestE1rm = e; bestReps = s.reps; bestKg = s.kg; }
              }
              return { date, bestReps, bestKg, value: bestE1rm };
            }
          })
          .filter(e => e.value > 0);

        setHistory(entries);
      } catch {}
    })();
  }, [isDbReady, id, isBodyweight]);

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
    ? { dumbbells: 'Mancuernas', barbellPlates: 'Barra y discos', kettlebells: 'Kettlebells', pullupBar: 'Barra dominadas', parallettes: 'Paralelas', rings: 'Anillas', trx: 'TRX', adjustableBench: 'Banco', resistanceBands: 'Bandas', miniGluteBands: 'Mini-bands', plioBox: 'Cajón pliométrico', medicineBall: 'Balón medicinal', fitball: 'Fitball', abRoller: 'Rueda abdominal', jumpRope: 'Comba', mat: 'Esterilla', foamRoller: 'Rodillo', sliders: 'Sliders', weightedVest: 'Chaleco lastrado', cableMachine: 'Polea', legPressMachine: 'Prensa' }
    : lang === 'fr'
    ? { dumbbells: 'Haltères', barbellPlates: 'Barre et disques', kettlebells: 'Kettlebells', pullupBar: 'Barre de traction', parallettes: 'Barres parallèles', rings: 'Anneaux', trx: 'TRX', adjustableBench: 'Banc', resistanceBands: 'Élastiques', miniGluteBands: 'Mini-bandes', plioBox: 'Caisse plio', medicineBall: 'Médecine-ball', fitball: 'Fitball', abRoller: 'Roue abdominale', jumpRope: 'Corde à sauter', mat: 'Tapis', foamRoller: 'Rouleau', sliders: 'Sliders', weightedVest: 'Gilet lesté', cableMachine: 'Poulie', legPressMachine: 'Presse' }
    : { dumbbells: 'Dumbbells', barbellPlates: 'Barbell', kettlebells: 'Kettlebells', pullupBar: 'Pull-up bar', parallettes: 'Parallettes', rings: 'Rings', trx: 'TRX', adjustableBench: 'Bench', resistanceBands: 'Resistance bands', miniGluteBands: 'Mini bands', plioBox: 'Plyo box', medicineBall: 'Medicine ball', fitball: 'Fitball', abRoller: 'Ab roller', jumpRope: 'Jump rope', mat: 'Mat', foamRoller: 'Foam roller', sliders: 'Sliders', weightedVest: 'Weighted vest', cableMachine: 'Cable', legPressMachine: 'Leg press' };

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

  // Historial
  const histLabel  = lang === 'es' ? 'Tu evolución' : lang === 'fr' ? 'Ta progression' : 'Your progress';
  const chartLabel = isBodyweight
    ? (lang === 'es' ? 'Reps máx. por sesión' : lang === 'fr' ? 'Reps max par séance' : 'Max reps per session')
    : (lang === 'es' ? '1RM estimado (Epley)' : lang === 'fr' ? '1RM estimé (Epley)' : 'Estimated 1RM (Epley)');
  const prLabel    = lang === 'es' ? '★ PR' : '★ PR';
  const unitLabel  = isImperial ? 'lb' : 'kg';

  const prValue = history.length > 0 ? Math.max(...history.map(h => h.value)) : 0;

  const chartData = history.map(h => ({ date: h.date, value: h.value }));

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

          {/* ── Historial ───────────────────────────────────────────────────── */}
          {history.length >= 1 && (
            <InfoCard label={histLabel}>
              {/* Etiqueta del gráfico */}
              <ThemedText themeColor="textSecondary" style={styles.chartLabel}>
                {chartLabel}
              </ThemedText>

              {/* Gráfica de tendencia (solo si hay ≥2 puntos) */}
              {history.length >= 2 && (
                <SimpleLineChart
                  data={chartData}
                  color={catColor}
                  height={110}
                  labelColor={MUTED}
                  decimals={isBodyweight ? 0 : 1}
                />
              )}

              {/* Lista de las últimas sesiones (más reciente primero) */}
              <View style={styles.histList}>
                {[...history].reverse().slice(0, 6).map(h => {
                  const isPR = h.value === prValue && prValue > 0;
                  const dateStr = formatListDate(h.date, lang);

                  let setStr: string;
                  if (isBodyweight) {
                    setStr = `${h.bestReps} reps`;
                  } else {
                    const displayKg = isImperial ? kgToLb(h.bestKg).toFixed(1) : String(h.bestKg);
                    const e1rmDisp  = isImperial ? kgToLb(h.value).toFixed(1) : h.value.toFixed(1);
                    setStr = `${displayKg} ${unitLabel} × ${h.bestReps}  ·  ~1RM ${e1rmDisp} ${unitLabel}`;
                  }

                  return (
                    <View key={h.date} style={styles.histRow}>
                      <ThemedText themeColor="textSecondary" style={styles.histDate}>{dateStr}</ThemedText>
                      <ThemedText style={styles.histSet}>{setStr}</ThemedText>
                      {isPR && (
                        <View style={styles.prBadge}>
                          <ThemedText style={styles.prText}>{prLabel}</ThemedText>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </InfoCard>
          )}
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

  // Historial
  chartLabel: { fontSize: 11, marginBottom: 2 },
  histList:   { gap: 6, marginTop: Spacing.one },
  histRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  histDate:   { fontSize: 12, width: 52, flexShrink: 0 },
  histSet:    { fontSize: 12, flex: 1 },
  prBadge:    { backgroundColor: AMBER + '28', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  prText:     { fontSize: 10, fontWeight: '700', color: AMBER },
});
