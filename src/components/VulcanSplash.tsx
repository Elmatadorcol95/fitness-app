import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';

const { width: SW } = Dimensions.get('window');

// ─── Paleta fija (splash siempre oscuro) ─────────────────────────────────────
const BG       = '#141A17';
const GREEN    = '#3FBF7F';
const GREEN_LT = '#5BD897';
const AMBER    = '#F2B450';
const TEXT     = '#F1F4F1';
const TEXT_DIM = '#9DA89F';
const SURFACE  = '#1C231F';

// ─── Dimensiones del martillo ─────────────────────────────────────────────────
const HANDLE_W  = 18;
const HANDLE_H  = 110;
const HEAD_W    = 100;
const HEAD_H    = 34;
// El wrapper tiene su CENTRO en el punto de pivote (parte superior del mango).
// El mango y la cabeza cuelgan desde el centro hacia abajo.
const WRAP      = 240;          // tamaño del cuadrado de rotación
const PIVOT_Y   = WRAP / 2;    // el mango empieza en el centro del wrapper

// Ángulos (positivo = horario en React Native)
const RAISED   = -65;   // martillo levantado (antes del golpe)
const IMPACT   =  -5;   // posición de impacto

const MESSAGES = [
  'Forjando tu plan…',
  'Templando los datos…',
  'Ajustando las cargas…',
  'Calentando motores…',
];

export function VulcanSplash() {
  const [msgIdx, setMsgIdx] = useState(0);

  const swing  = useSharedValue(RAISED);
  const sparks = useSharedValue(0);
  const bar    = useSharedValue(0);

  useEffect(() => {
    // Martillo: sube → baja → rebote → pausa → repite (~1.3 s)
    swing.value = withRepeat(
      withSequence(
        withTiming(IMPACT, { duration: 420, easing: Easing.in(Easing.quad) }),
        withTiming(IMPACT + 12, { duration: 80 }),
        withTiming(IMPACT, { duration: 100 }),
        withDelay(100, withTiming(RAISED, { duration: 600, easing: Easing.out(Easing.quad) })),
      ),
      -1,
      false,
    );

    // Chispas: aparecen en el momento del impacto
    sparks.value = withRepeat(
      withSequence(
        withDelay(380, withTiming(1, { duration: 60 })),
        withTiming(0, { duration: 350 }),
        withDelay(510, withTiming(0, { duration: 0 })),
      ),
      -1,
      false,
    );

    // Barra de progreso: oscila de 0 → 1 → 0 en ~3 s
    bar.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );

    const t = setInterval(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), 1300);
    return () => clearInterval(t);
  }, []);

  const hammerAnim = useAnimatedStyle(() => ({
    // 45° estático del diseño + oscilación animada
    transform: [{ rotate: `${45 + swing.value}deg` }],
  }));

  const sparksAnim = useAnimatedStyle(() => ({ opacity: sparks.value }));

  const barAnim = useAnimatedStyle(() => ({
    width: `${interpolate(bar.value, [0, 1], [0, 100])}%`,
  }));

  return (
    <View style={styles.root}>

      {/* ── Animación: martillo + yunque ── */}
      <View style={styles.scene}>

        {/* El wrapper rota alrededor de su centro = punto de pivote */}
        <Animated.View style={[styles.hammerWrap, hammerAnim]}>
          {/* Mango: empieza en el centro del wrapper y baja */}
          <View style={styles.handle} />
          {/* Cabeza: al final del mango, perpendicular (más ancha) */}
          <View style={styles.head} />
        </Animated.View>

        {/* Chispas en el punto de impacto */}
        <Animated.View style={[styles.sparksWrap, sparksAnim]}>
          <View style={[styles.spark, { width: 10, height: 10, top: 4, left: 8 }]} />
          <View style={[styles.spark, { width:  7, height:  7, top: -6, left: -2 }]} />
          <View style={[styles.spark, { width:  7, height:  7, top: -8, left: 22 }]} />
          <View style={[styles.spark, { width:  5, height:  5, top:  2, left: -14 }]} />
          <View style={[styles.spark, { width:  5, height:  5, top: -14, left: 10 }]} />
        </Animated.View>

        {/* Yunque */}
        <View style={styles.anvilGroup}>
          <View style={styles.anvilTop} />
          <View style={styles.anvilBody} />
          <View style={styles.anvilBase} />
        </View>
      </View>

      {/* ── Texto y barra ── */}
      <View style={styles.bottom}>
        <ThemedText style={styles.appName}>VULCAN</ThemedText>
        <ThemedText style={styles.msg}>{MESSAGES[msgIdx]}</ThemedText>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barAnim]} />
        </View>
      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const SCENE_H     = 300;
// El wrapper se centra en la escena con un offset para que el yunque
// quede justo debajo del impacto
const WRAP_LEFT   = SW / 2 - WRAP / 2 - 50; // ligeramente a la izquierda del centro
const WRAP_TOP    = 30;

// En el punto de impacto (~-5°), el extremo del mango + cabeza llega justo
// encima del yunque. El yunque se posiciona aquí:
const ANVIL_TOP_Y = WRAP_TOP + PIVOT_Y + HANDLE_H + HEAD_H / 2 + 10;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Escena ──
  scene: {
    width: SW,
    height: SCENE_H,
    position: 'relative',
  },

  // ── Martillo ──
  hammerWrap: {
    position: 'absolute',
    width:  WRAP,
    height: WRAP,
    top:    WRAP_TOP,
    left:   WRAP_LEFT,
  },
  handle: {
    position: 'absolute',
    top:  PIVOT_Y,                         // empieza en el centro del wrapper
    left: WRAP / 2 - HANDLE_W / 2,
    width: HANDLE_W,
    height: HANDLE_H,
    backgroundColor: GREEN_LT,
    borderRadius: 4,
  },
  head: {
    position: 'absolute',
    top:  PIVOT_Y + HANDLE_H,             // justo debajo del mango
    left: WRAP / 2 - HEAD_W / 2,
    width: HEAD_W,
    height: HEAD_H,
    backgroundColor: GREEN,
    borderRadius: 6,
  },

  // ── Chispas ──
  sparksWrap: {
    position: 'absolute',
    width: 50,
    height: 50,
    top:  ANVIL_TOP_Y - 30,
    left: SW / 2 + 10,
  },
  spark: {
    position: 'absolute',
    backgroundColor: AMBER,
    borderRadius: 99,
  },

  // ── Yunque ──
  anvilGroup: {
    position: 'absolute',
    alignItems: 'center',
    top:  ANVIL_TOP_Y,
    left: SW / 2 - 110,                   // centrado en la pantalla
  },
  anvilTop: {
    width: 220,
    height: 22,
    backgroundColor: GREEN,
    borderRadius: 5,
  },
  anvilBody: {
    width: 150,
    height: 55,
    backgroundColor: '#2D9966',
    borderRadius: 4,
  },
  anvilBase: {
    width: 180,
    height: 14,
    backgroundColor: GREEN,
    borderRadius: 4,
    marginTop: 2,
  },

  // ── Texto ──
  bottom: {
    alignItems: 'center',
    gap: 10,
    marginTop: 32,
  },
  appName: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 10,
    color: TEXT,
  },
  msg: {
    fontSize: 14,
    color: TEXT_DIM,
    letterSpacing: 0.5,
  },
  barTrack: {
    width: 180,
    height: 3,
    backgroundColor: SURFACE,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    height: 3,
    backgroundColor: GREEN,
    borderRadius: 2,
  },
});
