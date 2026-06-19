import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ACHIEVEMENT_DEFS, useGamificationStore, type AchievementId } from '@/store/gamification.store';
import { Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const MUTED = '#9DA89F';
const BG    = '#141A17';

// Chispa individual animada
function Spark({ delay, angle, dist }: { delay: number; angle: number; dist: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [anim, delay]);

  const rad = (angle * Math.PI) / 180;
  const x = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(rad) * dist] });
  const y = anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(rad) * dist] });
  const opacity = anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] });
  const scale   = anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1.2, 0.5] });

  return (
    <Animated.View style={[styles.spark, { transform: [{ translateX: x }, { translateY: y }, { scale }], opacity }]} />
  );
}

// Sparks burst al desvloquear
function SparkBurst({ active }: { active: boolean }) {
  if (!active) return null;
  const SPARKS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  return (
    <View style={styles.sparkContainer} pointerEvents="none">
      {SPARKS.map((angle, i) => (
        <Spark key={angle} angle={angle} dist={70 + (i % 3) * 20} delay={i * 30} />
      ))}
    </View>
  );
}

interface OverlayProps {
  achievementId: AchievementId;
  onDismiss: () => void;
}

function AchievementCard({ achievementId, onDismiss }: OverlayProps) {
  const { t } = useTranslation();
  const def = ACHIEVEMENT_DEFS.find(d => d.id === achievementId);
  if (!def) return null;

  // Escala de entrada
  const scale   = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 100, friction: 7, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Auto-dismiss después de 3.5 s
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
        {/* Chispas */}
        <SparkBurst active />

        {/* Ícono */}
        <View style={styles.iconRing}>
          <Ionicons name={def.iconName as any} size={40} color={GREEN} />
        </View>

        {/* Textos */}
        <ThemedText style={styles.forgedLabel}>
          {t('achievement.forged')}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.name}>
          {t(def.nameKey)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.desc}>
          {t(def.descKey)}
        </ThemedText>

        {/* Toca para cerrar */}
        <ThemedText themeColor="textSecondary" style={styles.tapToDismiss}>
          {t('achievement.tapToDismiss')}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

// ── Componente raíz — lee la cola y encadena logros ──────────────────────────

export function AchievementCelebrationOverlay() {
  const { celebrationQueue, popCelebration } = useGamificationStore();
  const current = celebrationQueue[0];

  if (!current) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <AchievementCard
        key={current} // Monta un componente nuevo por cada logro (reinicia animación)
        achievementId={current}
        onDismiss={popCelebration}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1C231F',
    borderRadius: 24,
    padding: Spacing.five ?? 24,
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.four,
    borderWidth: 1.5,
    borderColor: GREEN + '55',
    shadowColor: GREEN,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    minWidth: 260,
  },
  iconRing: {
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: GREEN + '22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: GREEN + '55',
    marginBottom: Spacing.one,
  },
  forgedLabel: {
    fontSize: 13,
    color: AMBER,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 20,
    color: '#F1F4F1',
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tapToDismiss: {
    fontSize: 11,
    marginTop: Spacing.two,
    opacity: 0.5,
  },

  // Sparks
  sparkContainer: {
    position: 'absolute',
    top: '50%', left: '50%',
    width: 0, height: 0,
  },
  spark: {
    position: 'absolute',
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: AMBER,
  },
});
