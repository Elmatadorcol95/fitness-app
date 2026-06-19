import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useGamificationStore, ACHIEVEMENT_DEFS, type AchievementId } from '@/store/gamification.store';
import { useProfileStore } from '@/store/profile.store';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const SURFACE = '#1C231F';

function iconColor(id: AchievementId): string {
  if (['first_spark', 'incandescent'].includes(id)) return AMBER;
  if (['personal_record'].includes(id)) return AMBER;
  return GREEN;
}

function AchievementCard({ id, iconName, nameKey, descKey, unlocked }: {
  id: AchievementId;
  iconName: string;
  nameKey: string;
  descKey: string;
  unlocked: boolean;
}) {
  const { t } = useTranslation();
  const color = unlocked ? iconColor(id) : MUTED;

  return (
    <ThemedView
      type="backgroundSelected"
      style={[styles.card, unlocked && styles.cardUnlocked]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={iconName as any} size={26} color={color} />
        {!unlocked && (
          <View style={styles.lockOverlay}>
            <Ionicons name="lock-closed" size={12} color={MUTED} />
          </View>
        )}
      </View>
      <ThemedText
        style={[styles.name, { color: unlocked ? '#F1F4F1' : MUTED }]}
        numberOfLines={2}
      >
        {t(nameKey)}
      </ThemedText>
      <ThemedText
        themeColor="textSecondary"
        style={styles.desc}
        numberOfLines={2}
      >
        {t(descKey)}
      </ThemedText>
    </ThemedView>
  );
}

export function AchievementsSection() {
  const { t } = useTranslation();
  const { unlockedAchievements, loadGamification } = useGamificationStore();
  const isDbReady = useProfileStore(s => s.isDbReady);

  useEffect(() => {
    if (!isDbReady) return;
    loadGamification();
  }, [isDbReady]);

  const unlockedSet = new Set(unlockedAchievements);

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>{t('gamification.achievements.title')}</ThemedText>
      <View style={styles.grid}>
        {ACHIEVEMENT_DEFS.map(def => (
          <AchievementCard
            key={def.id}
            id={def.id}
            iconName={def.iconName}
            nameKey={def.nameKey}
            descKey={def.descKey}
            unlocked={unlockedSet.has(def.id)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.one },
  sectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    width: '47%',
    borderRadius: Spacing.two,
    padding: Spacing.two,
    gap: 6,
    alignItems: 'flex-start',
  },
  cardUnlocked: {
    borderWidth: 1,
    borderColor: '#3FBF7F22',
  },
  iconWrap: {
    position: 'relative',
  },
  lockOverlay: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1C231F',
    borderRadius: 8,
    padding: 2,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },
  desc: {
    fontSize: 11,
    lineHeight: 15,
  },
});
