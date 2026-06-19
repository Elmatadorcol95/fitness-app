import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { gte, inArray } from 'drizzle-orm';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VulcanSymbol } from '@/components/icons/VulcanSymbol';
import { Spacing } from '@/constants/theme';
import { useGamificationStore } from '@/store/gamification.store';
import { useProfileStore } from '@/store/profile.store';
import { db } from '@/db';
import { weightLog, workoutSessions, sessionSets, type WeightEntry } from '@/db/schema';
import { kgToLb } from '@/lib/units';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';

type Period = 'month' | 'week';

function getMonthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

function StatCard({
  iconName, iconColor, value, label,
}: { iconName: string; iconColor: string; value: string; label: string }) {
  return (
    <ThemedView type="backgroundSelected" style={stat.card}>
      <Ionicons name={iconName as any} size={24} color={iconColor} />
      <ThemedText style={stat.value}>{value}</ThemedText>
      <ThemedText themeColor="textSecondary" style={stat.label}>{label}</ThemedText>
    </ThemedView>
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function RecapModal({ visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');
  const [periodWeights, setPeriodWeights] = useState<WeightEntry[]>([]);
  const [periodVolume, setPeriodVolume]   = useState<number>(0); // kg total

  const { streak, totalWorkouts, unlockedAchievements } = useGamificationStore();
  const { profile } = useProfileStore();
  const isImperial = profile?.units === 'imperial';
  const statsRef = useRef<View>(null);

  useEffect(() => {
    if (!visible) return;
    const start = period === 'month' ? getMonthStart() : getWeekStart();
    // Peso corporal del período
    db.select()
      .from(weightLog)
      .where(gte(weightLog.date, start))
      .then(rows => setPeriodWeights(rows.sort((a, b) => a.date.localeCompare(b.date))));
    // Volumen total levantado en el período (Σ series×reps×peso)
    (async () => {
      try {
        const sessions = await db
          .select({ id: workoutSessions.id })
          .from(workoutSessions)
          .where(gte(workoutSessions.date, start));
        if (sessions.length === 0) { setPeriodVolume(0); return; }
        const ids = sessions.map(s => s.id);
        const setsData = await db
          .select({ weightKg: sessionSets.weightKg, actualReps: sessionSets.actualReps, completed: sessionSets.completed })
          .from(sessionSets)
          .where(inArray(sessionSets.sessionId, ids));
        const vol = setsData
          .filter(s => s.completed)
          .reduce((acc, s) => acc + (s.weightKg ?? 0) * (s.actualReps ?? 0), 0);
        setPeriodVolume(vol);
      } catch { setPeriodVolume(0); }
    })();
  }, [visible, period]);

  const weightChange = periodWeights.length >= 2
    ? periodWeights[periodWeights.length - 1].weightKg - periodWeights[0].weightKg
    : null;

  function weightStr(): string {
    if (weightChange === null) return t('recap.stats.noWeightData');
    const raw = isImperial ? kgToLb(Math.abs(weightChange)) : Math.abs(weightChange);
    const unit = isImperial ? ' lb' : ' kg';
    return `${weightChange >= 0 ? '+' : '−'}${Number(raw).toFixed(1)}${unit}`;
  }

  function weightIcon(): string {
    if (weightChange === null) return 'scale-outline';
    return weightChange <= 0 ? 'trending-down-outline' : 'trending-up-outline';
  }

  function weightColor(): string {
    if (weightChange === null) return MUTED;
    const goalFatLoss = profile?.goalPrimary === 'fat_loss';
    if (weightChange < 0) return goalFatLoss ? GREEN : AMBER;
    return goalFatLoss ? AMBER : GREEN;
  }

  function volumeStr(): string {
    if (periodVolume <= 0) return '—';
    const val  = isImperial ? kgToLb(periodVolume) : periodVolume;
    if (val >= 1000) return `${(val / 1000).toFixed(1)} t`;
    return `${Math.round(val)} ${isImperial ? 'lb' : 'kg'}`;
  }

  const now = new Date();
  const monthName = now.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });

  const title = period === 'month'
    ? t('recap.monthly.title', { month: monthName })
    : t('recap.weekly.title');

  function praiseKey(): string {
    if (streak >= 7) return 'recap.praise.streak';
    if (totalWorkouts >= 1) return 'recap.praise.started';
    return 'recap.praise.begin';
  }

  async function handleShare() {
    // Intenta capturar como imagen (requiere react-native-view-shot + expo-sharing en el build)
    try {
      const { captureRef } = require('react-native-view-shot');
      const Sharing = require('expo-sharing');
      const uri: string = await captureRef(statsRef, { format: 'png', quality: 0.92 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' });
        return;
      }
    } catch {}
    // Fallback: compartir texto
    await Share.share({
      message: t('recap.share.text', {
        period: period === 'month' ? monthName : t('recap.weekly.title'),
        workouts: totalWorkouts > 0 ? totalWorkouts : '—',
        streak,
        weightChange: weightStr(),
        achievements: unlockedAchievements.length,
      }),
    });
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ThemedView style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Cerrar */}
          <View style={styles.handle}>
            <Pressable onPress={onClose} hitSlop={16}>
              <Ionicons name="chevron-down" size={28} color={MUTED} />
            </Pressable>
          </View>

          {/* Toggle semana / mes */}
          <View style={styles.toggle}>
            {(['week', 'month'] as Period[]).map(p => (
              <Pressable
                key={p}
                onPress={() => setPeriod(p)}
                style={[styles.toggleBtn, period === p && styles.toggleBtnActive]}
              >
                <ThemedText style={[styles.toggleText, period === p && styles.toggleTextActive]}>
                  {t(p === 'week' ? 'recap.weekly.tab' : 'recap.monthly.tab')}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Contenido capturado como imagen al compartir */}
          <View ref={statsRef} style={styles.captureArea}>
            <View style={styles.brand}>
              <VulcanSymbol size={60} />
              <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {period === 'month' ? t('recap.monthly.subtitle') : t('recap.weekly.subtitle')}
              </ThemedText>
            </View>

            <View style={styles.grid}>
              <StatCard
                iconName="barbell-outline"
                iconColor={totalWorkouts > 0 ? GREEN : MUTED}
                value={totalWorkouts > 0 ? String(totalWorkouts) : '—'}
                label={t('recap.stats.workouts')}
              />
              <StatCard
                iconName={streak > 0 ? 'flame' : 'flame-outline'}
                iconColor={streak > 0 ? AMBER : MUTED}
                value={String(streak)}
                label={t('recap.stats.streak')}
              />
              <StatCard
                iconName={weightIcon()}
                iconColor={weightColor()}
                value={weightStr()}
                label={t('recap.stats.weightChange')}
              />
              <StatCard
                iconName="trophy-outline"
                iconColor={unlockedAchievements.length > 0 ? AMBER : MUTED}
                value={String(unlockedAchievements.length)}
                label={t('recap.stats.achievements')}
              />
              <StatCard
                iconName="barbell-outline"
                iconColor={periodVolume > 0 ? GREEN : MUTED}
                value={volumeStr()}
                label={t('recap.stats.volume')}
              />
            </View>

            <ThemedView type="backgroundElement" style={styles.quoteCard}>
              <Ionicons name="flame-outline" size={16} color={AMBER} />
              <ThemedText style={styles.quote}>{t(praiseKey())}</ThemedText>
            </ThemedView>
          </View>

          {/* Botón compartir (fuera del área capturada) */}
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Ionicons name="share-outline" size={18} color="#04261A" />
            <ThemedText style={styles.shareBtnText}>{t('recap.share.button')}</ThemedText>
          </Pressable>

        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 48,
    gap: Spacing.four,
  },
  handle: {
    alignItems: 'center',
    paddingTop: Spacing.three,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#1C231F',
    borderRadius: Spacing.two,
    padding: 3,
    alignSelf: 'center',
  },
  toggleBtn: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 6,
    borderRadius: Spacing.one + 2,
  },
  toggleBtnActive: {
    backgroundColor: '#3FBF7F',
  },
  toggleText: {
    fontSize: 13,
    color: MUTED,
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#04261A',
    fontWeight: '700',
  },
  captureArea: {
    gap: Spacing.four,
    backgroundColor: '#141A17',
    borderRadius: Spacing.three,
    padding: Spacing.two,
  },
  brand: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quoteCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: AMBER,
  },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
    flex: 1,
  },
  shareBtn: {
    backgroundColor: GREEN,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#04261A',
  },
});

const stat = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
});
