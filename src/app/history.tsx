import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { desc, eq, inArray } from 'drizzle-orm';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { db } from '@/db';
import { workoutSessions, sessionSets } from '@/db/schema';
import { getExerciseName, EXERCISES } from '@/lib/exercises';
import { muscleLabel } from '@/components/workout/ExerciseCard';
import { useGamificationStore } from '@/store/gamification.store';
import { useProfileStore } from '@/store/profile.store';
import { kgToLb } from '@/lib/units';
import { BottomTabInset, Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const BG2   = '#1C231F';

type Lang = 'es' | 'en' | 'fr';

function normLang(l: string): Lang {
  return l.startsWith('es') ? 'es' : l.startsWith('fr') ? 'fr' : 'en';
}

type SetRow = {
  exerciseId: string;
  setNumber: number;
  actualReps: number | null;
  weightKg: number | null;
  completed: number;
};

type ExerciseDetail = {
  exerciseId: string;
  sets: SetRow[];
  volume: number; // kg total
};

type SessionSummary = {
  id: number;
  date: string;
  durationSeconds: number | null;
  setsCompleted: number;
  totalVolume: number;
  exerciseIds: string[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null, lang: Lang): string {
  if (!seconds || seconds < 10) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}

function formatDate(dateStr: string, lang: Lang): string {
  try {
    const d = new Date(dateStr + 'T12:00:00');
    const locale = lang === 'es' ? 'es-ES' : lang === 'fr' ? 'fr-FR' : 'en-US';
    // Fecha completa con día de semana, número, mes y año
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatVolume(kg: number, isImperial: boolean, lang: Lang): string {
  if (kg <= 0) return '—';
  const val  = isImperial ? kgToLb(kg) : kg;
  const unit = isImperial ? 'lb' : 'kg';
  const formatted = val >= 1000
    ? `${(val / 1000).toFixed(1)} t`
    : `${Math.round(val)} ${unit}`;
  return formatted;
}

// ── ExerciseDetail row ────────────────────────────────────────────────────────

function ExerciseDetailRow({ detail, lang, isImperial }: {
  detail: ExerciseDetail;
  lang: Lang;
  isImperial: boolean;
}) {
  const ex   = EXERCISES.find(e => e.id === detail.exerciseId);
  const name = getExerciseName(detail.exerciseId, lang);
  const completedSets = detail.sets.filter(s => s.completed);
  const isBodyweight  = !ex || ex.equipment.some(e =>
    ['barbellPlates', 'dumbbells', 'kettlebells', 'weightedVest', 'cableMachine', 'legPressMachine'].includes(e),
  ) === false;

  // "3×10 · 40 kg" or "4×12 · PC"
  const setsStr = completedSets.length > 0
    ? (() => {
        const reps   = completedSets[0]?.actualReps ?? 0;
        const allSameReps = completedSets.every(s => s.actualReps === reps);
        const kg     = completedSets[0]?.weightKg ?? 0;
        const allSameKg  = completedSets.every(s => s.weightKg === kg);
        const setsN = completedSets.length;

        if (isBodyweight) {
          const repStr = allSameReps ? `${setsN}×${reps}` : `${setsN} series`;
          return `${repStr} · PC`;
        }
        const weightStr = allSameKg
          ? `${isImperial ? kgToLb(kg).toFixed(1) : kg} ${isImperial ? 'lb' : 'kg'}`
          : (lang === 'es' ? 'peso variable' : lang === 'fr' ? 'poids variable' : 'variable weight');
        const repStr = allSameReps ? `${setsN}×${reps}` : `${setsN} series`;
        return `${repStr} · ${weightStr}`;
      })()
    : (lang === 'es' ? 'Sin completar' : lang === 'fr' ? 'Non complété' : 'Not completed');

  return (
    <View style={detailStyles.row}>
      <View style={detailStyles.dot} />
      <ThemedText style={detailStyles.name} numberOfLines={1}>{name}</ThemedText>
      <ThemedText themeColor="textSecondary" style={detailStyles.sets}>{setsStr}</ThemedText>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 3 },
  dot:   { width: 5, height: 5, borderRadius: 3, backgroundColor: GREEN + '88', flexShrink: 0 },
  name:  { flex: 1, fontSize: 13 },
  sets:  { fontSize: 12, flexShrink: 0 },
});

// ── SessionCard ───────────────────────────────────────────────────────────────

function SessionCard({ session, lang, isImperial }: {
  session: SessionSummary;
  lang: Lang;
  isImperial: boolean;
}) {
  const [expanded, setExpanded]           = useState(false);
  const [details, setDetails]             = useState<ExerciseDetail[]>([]);
  const [detailsLoaded, setDetailsLoaded] = useState(false);

  const loadDetails = useCallback(async () => {
    if (detailsLoaded) return;
    try {
      const rows = await db
        .select({
          exerciseId: sessionSets.exerciseId,
          setNumber:  sessionSets.setNumber,
          actualReps: sessionSets.actualReps,
          weightKg:   sessionSets.weightKg,
          completed:  sessionSets.completed,
        })
        .from(sessionSets)
        .where(eq(sessionSets.sessionId, session.id));

      // Agrupar por ejercicio manteniendo el orden de aparición
      const exerciseOrder: string[] = [];
      const byExercise: Record<string, SetRow[]> = {};
      for (const r of rows) {
        if (!byExercise[r.exerciseId]) {
          byExercise[r.exerciseId] = [];
          exerciseOrder.push(r.exerciseId);
        }
        byExercise[r.exerciseId].push(r as SetRow);
      }

      setDetails(exerciseOrder.map(id => {
        const sets = byExercise[id];
        const volume = sets.reduce((acc, s) => {
          const kg = s.weightKg ?? 0;
          const reps = s.actualReps ?? 0;
          return acc + kg * reps;
        }, 0);
        return { exerciseId: id, sets, volume };
      }));
    } catch {}
    setDetailsLoaded(true);
  }, [session.id, detailsLoaded]);

  function handleToggle() {
    if (!expanded) loadDetails();
    setExpanded(v => !v);
  }

  const volStr = formatVolume(session.totalVolume, isImperial, lang);
  const durStr = formatDuration(session.durationSeconds, lang);

  return (
    <Pressable onPress={handleToggle} style={styles.card}>
      {/* Cabecera */}
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View style={styles.dateIcon}>
            <Ionicons name="barbell-outline" size={18} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold" style={styles.dateText} numberOfLines={2}>
              {formatDate(session.date, lang)}
            </ThemedText>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={12} color={MUTED} />
              <ThemedText themeColor="textSecondary" style={styles.metaText}>{durStr}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.metaSep}>·</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.metaText}>
                {session.setsCompleted} {lang === 'fr' ? 'séries' : lang === 'es' ? 'series' : 'sets'}
              </ThemedText>
              {session.totalVolume > 0 && (
                <>
                  <ThemedText themeColor="textSecondary" style={styles.metaSep}>·</ThemedText>
                  <ThemedText style={[styles.metaText, { color: AMBER }]}>{volStr}</ThemedText>
                </>
              )}
            </View>
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
      </View>

      {/* Detalle expandible */}
      {expanded && (
        <View style={styles.cardBody}>
          {details.map(d => (
            <ExerciseDetailRow
              key={d.exerciseId}
              detail={d}
              lang={lang}
              isImperial={isImperial}
            />
          ))}
        </View>
      )}
    </Pressable>
  );
}

// ── HistoryScreen ─────────────────────────────────────────────────────────────

export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const lang = normLang(i18n.language);

  const totalWorkouts = useGamificationStore(s => s.totalWorkouts);
  const { profile }   = useProfileStore();
  const isImperial    = profile?.units === 'imperial';
  const isDbReady     = useProfileStore(s => s.isDbReady);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!isDbReady) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await db
          .select()
          .from(workoutSessions)
          .orderBy(desc(workoutSessions.id))
          .limit(50);

        if (rows.length === 0) { setSessions([]); return; }

        const ids = rows.map(r => r.id);
        const setRows = await db
          .select({
            sessionId: sessionSets.sessionId,
            exerciseId: sessionSets.exerciseId,
            actualReps: sessionSets.actualReps,
            weightKg:   sessionSets.weightKg,
            completed:  sessionSets.completed,
          })
          .from(sessionSets)
          .where(inArray(sessionSets.sessionId, ids));

        const exBySession:  Record<number, Set<string>> = {};
        const setsBySession:Record<number, number> = {};
        const volBySession: Record<number, number> = {};
        for (const r of setRows) {
          if (!exBySession[r.sessionId]) exBySession[r.sessionId] = new Set();
          exBySession[r.sessionId].add(r.exerciseId);
          if (r.completed) {
            setsBySession[r.sessionId] = (setsBySession[r.sessionId] ?? 0) + 1;
            const vol = (r.weightKg ?? 0) * (r.actualReps ?? 0);
            volBySession[r.sessionId] = (volBySession[r.sessionId] ?? 0) + vol;
          }
        }

        setSessions(rows.map(r => ({
          id:              r.id,
          date:            r.date,
          durationSeconds: r.durationSeconds ?? null,
          exerciseIds:     Array.from(exBySession[r.id] ?? new Set()),
          setsCompleted:   setsBySession[r.id] ?? 0,
          totalVolume:     volBySession[r.id] ?? 0,
        })));
      } catch (err) {
        console.error('[History] error:', err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [totalWorkouts, isDbReady]);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="subtitle" style={styles.title}>
          {t('tabs.history.title')}
        </ThemedText>

        {loading ? (
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {t('common.loading')}
          </ThemedText>
        ) : sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={52} color={MUTED} />
            <ThemedText type="defaultSemiBold" style={styles.emptyText}>
              {t('tabs.history.empty')}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptySub}>
              {t('tabs.history.emptySub')}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={s => String(s.id)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <SessionCard session={item} lang={lang} isImperial={isImperial} />
            )}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  safe:         { flex: 1, paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset },
  title:        { marginTop: Spacing.four, marginBottom: Spacing.three },
  centeredText: { textAlign: 'center', marginTop: 60 },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingBottom: BottomTabInset },
  emptyText:    { textAlign: 'center' },
  emptySub:     { textAlign: 'center', fontSize: 14 },
  list:         { gap: Spacing.two, paddingBottom: Spacing.four },
  card:         {
    backgroundColor: BG2, borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.three,
    borderWidth: 1, borderColor: '#FFFFFF0A',
  },
  cardHeader:   { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  cardLeft:     { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, flex: 1 },
  dateIcon:     { width: 36, height: 36, borderRadius: 10, backgroundColor: GREEN + '20', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dateText:     { fontSize: 14, fontWeight: '600' },
  metaRow:      { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  metaText:     { fontSize: 12 },
  metaSep:      { fontSize: 12 },
  cardBody:     { marginTop: Spacing.two, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#FFFFFF14', gap: 1 },
});
