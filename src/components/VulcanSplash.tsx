import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
import { ThemedText } from '@/components/themed-text';

const AnimatedG    = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const { width: SW } = Dimensions.get('window');

const BG       = '#141A17';
const GREEN    = '#3FBF7F';
const TEXT     = '#F1F4F1';
const TEXT_DIM = '#9DA89F';

// SVG viewBox del archivo de marca: 300×360. Mostramos solo la zona del logo
// (los 250px superiores) y renderizamos el texto/barra como elementos RN.
const SVG_VW = 300;
const SVG_VH = 250;
const SVG_W  = SW;
const SVG_H  = SW * SVG_VH / SVG_VW;

export function VulcanSplash() {
  const hammerRot  = useSharedValue(-42);
  const sparkOp    = useSharedValue(0);
  const sparkScale = useSharedValue(0.4);
  const barW       = useSharedValue(16);

  useEffect(() => {
    // Martillo — ciclo de 1300 ms (idéntico al SMIL del HTML de marca)
    // keyTimes: 0 | 0.35 | 0.44 | 0.56 | 1  →  0 | 455 | 572 | 728 | 1300 ms
    // ángulos:  -42 | 0 | -8 | -3 | -42
    hammerRot.value = withRepeat(
      withSequence(
        withTiming(  0, { duration: 455, easing: Easing.bezier(0.30, 0, 0.70, 1) }),
        withTiming( -8, { duration: 117, easing: Easing.bezier(0.40, 0, 0.60, 1) }),
        withTiming( -3, { duration: 156, easing: Easing.bezier(0.40, 0, 0.60, 1) }),
        withTiming(-42, { duration: 572, easing: Easing.bezier(0.45, 0, 0.55, 1) }),
      ),
      -1,
      false,
    );

    // Chispas — opacity: keyTimes 0;0.33;0.40;0.64;1  →  0|429|520|832|1300 ms
    sparkOp.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 429 }),
        withTiming(1, { duration:  91 }),
        withTiming(0, { duration: 312 }),
        withTiming(0, { duration: 468 }),
      ),
      -1,
      false,
    );

    // Chispas — scale: keyTimes 0;0.33;0.42;0.64;1  →  0|429|546|832|1300 ms
    sparkScale.value = withRepeat(
      withSequence(
        withTiming(0.40, { duration: 429 }),
        withTiming(1.15, { duration: 117 }),
        withTiming(1.28, { duration: 286 }),
        withTiming(0.40, { duration: 468 }),
      ),
      -1,
      false,
    );

    // Barra de progreso — 2400 ms ida/vuelta (del HTML de marca)
    barW.value = withRepeat(
      withSequence(
        withTiming(164, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming( 16, { duration: 1200, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      ),
      -1,
      false,
    );
  }, []);

  const hammerProps = useAnimatedProps(() => ({
    rotation: hammerRot.value,
  }));

  const sparkGroupProps = useAnimatedProps(() => ({
    opacity: sparkOp.value,
  }));

  const sparkInnerProps = useAnimatedProps(() => ({
    scale: sparkScale.value,
  }));

  const barProps = useAnimatedProps(() => ({
    width: barW.value,
  }));

  return (
    <View style={styles.root}>

      {/* Logo animado — paths exactos del archivo assets/brand/vulcan-animado-nuevo.html */}
      <Svg viewBox={`0 0 ${SVG_VW} ${SVG_VH}`} width={SVG_W} height={SVG_H}>
        <G transform="translate(0, 8)">

          {/* Yunque */}
          <G transform="translate(150,150) scale(0.62) translate(-158,-155)">
            <Path d="M128 178 L240 178 L262 206 L262 214 L214 214 L214 207 L154 207 L154 214 L106 214 L106 206 Z" fill="#3FBF7F"/>
            <Path d="M152 126 C161 144 161 162 140 180 L228 180 C208 162 208 144 216 126 Z" fill="#3FBF7F"/>
            <Path d="M138 96 L252 96 L252 126 L138 126 Z" fill="#3FBF7F"/>
            <Path d="M120 104 L138 104 L138 126 L120 126 Z" fill="#3FBF7F"/>
            <Path d="M120 105 Q82 104 54 112 Q86 120 120 124 Z" fill="#3FBF7F"/>
            <Path d="M120 124 L152 124 L152 130 L122 132 Z" fill="#2E8C5B"/>
            <Path d="M216 124 L252 124 L250 132 L216 130 Z" fill="#2E8C5B"/>
            <Path d="M128 178 L240 178 L237 184 L131 184 Z" fill="#2E8C5B"/>
            <Rect x={140} y={96} width={112} height={7} rx={3} fill="#5BD897"/>
            <Rect x={121} y={104} width={17} height={5} rx={2} fill="#5BD897"/>
            <Path d="M120 105 Q86 105 58 112 Q86 114 120 115 Z" fill="#5BD897" opacity={0.85}/>
          </G>

          {/* Martillo — rota alrededor del pivote (121, 60) */}
          <AnimatedG animatedProps={hammerProps} originX={121} originY={60}>
            <G transform="translate(170,112) rotate(108) scale(0.58) translate(-220,-104)">
              <G transform="rotate(-6 160 130)">
                <Path d="M150 114 C148 152 147 184 147 200 Q147 216 160 216 Q173 216 173 200 C173 184 172 152 170 114 Z" fill="#5BD897"/>
                <Path d="M170 114 C172 152 173 184 173 200 Q173 210 165 214 C169 204 167 152 161 114 Z" fill="#2E8C5B" opacity={0.5}/>
                <Ellipse cx={160} cy={206} rx={13} ry={9} fill="#5BD897"/>
                <Path d="M112 82 L138 60 L188 60 Q220 60 220 76 L220 102 Q220 120 188 120 L138 120 L112 96 Z" fill="#3FBF7F"/>
                <Ellipse cx={158} cy={90} rx={10} ry={17} fill="#2E8C5B" opacity={0.4}/>
                <Path d="M112 96 L138 120 L188 120 Q212 120 218 108 L216 118 Q210 124 188 124 L138 124 L112 102 Z" fill="#2E8C5B" opacity={0.5}/>
                <Path d="M116 84 L138 64 L188 64 Q210 64 216 71 L188 67 L140 67 L120 86 Z" fill="#5BD897" opacity={0.9}/>
                <Rect x={210} y={70} width={8} height={34} rx={4} fill="#5BD897"/>
              </G>
            </G>
          </AnimatedG>

          {/* Chispas — estallan en el impacto */}
          <AnimatedG animatedProps={sparkGroupProps}>
            <G transform="translate(165, 107)">
              <AnimatedG animatedProps={sparkInnerProps}>
                <Line x1={-3.7}  y1={2.1}  x2={-14.9} y2={8.6}  stroke="#F2B450" strokeWidth={2.5} strokeLinecap="round"/>
                <Line x1={-6.0}  y1={1.9}  x2={-15.6} y2={5.1}  stroke="#FFD98A" strokeWidth={2.4} strokeLinecap="round"/>
                <Line x1={-3.8}  y1={0.3}  x2={-16.2} y2={1.1}  stroke="#F2B450" strokeWidth={2.2} strokeLinecap="round"/>
                <Line x1={-3.3}  y1={-0.6} x2={-21.0} y2={-3.7} stroke="#F2B450" strokeWidth={2.8} strokeLinecap="round"/>
                <Line x1={-6.2}  y1={-2.9} x2={-22.2} y2={-10.3} stroke="#F2B450" strokeWidth={2.4} strokeLinecap="round"/>
                <Line x1={-4.2}  y1={-3.3} x2={-16.5} y2={-12.9} stroke="#F2B450" strokeWidth={3.0} strokeLinecap="round"/>
                <Line x1={-3.2}  y1={-4.1} x2={-10.5} y2={-13.4} stroke="#FFD98A" strokeWidth={2.2} strokeLinecap="round"/>
                <Line x1={-1.3}  y1={-3.2} x2={-7.4}  y2={-18.2} stroke="#F2B450" strokeWidth={2.7} strokeLinecap="round"/>
                <Line x1={-0.5}  y1={-3.4} x2={-3.3}  y2={-23.3} stroke="#F2B450" strokeWidth={1.9} strokeLinecap="round"/>
                <Line x1={0.7}   y1={-5.1} x2={2.2}   y2={-15.8} stroke="#F2B450" strokeWidth={1.7} strokeLinecap="round"/>
                <Line x1={1.9}   y1={-4.6} x2={8.6}   y2={-21.3} stroke="#F7C97A" strokeWidth={2.7} strokeLinecap="round"/>
                <Line x1={3.3}   y1={-4.2} x2={13.4}  y2={-17.2} stroke="#F2B450" strokeWidth={2.0} strokeLinecap="round"/>
                <Line x1={4.7}   y1={-3.4} x2={15.1}  y2={-11.0} stroke="#FFD98A" strokeWidth={2.4} strokeLinecap="round"/>
                <Line x1={4.7}   y1={-1.7} x2={18.9}  y2={-6.9}  stroke="#FFD98A" strokeWidth={2.2} strokeLinecap="round"/>
                <Line x1={6.9}   y1={-0.5} x2={16.7}  y2={-1.2}  stroke="#F7C97A" strokeWidth={2.2} strokeLinecap="round"/>
                <Line x1={3.5}   y1={0.8}  x2={21.8}  y2={4.6}   stroke="#FFD98A" strokeWidth={1.7} strokeLinecap="round"/>
                <Line x1={2.9}   y1={1.6}  x2={20.6}  y2={11.0}  stroke="#F7C97A" strokeWidth={2.7} strokeLinecap="round"/>
                <Circle cx={-11.2} cy={-13.7} r={1.8} fill="#F7C97A"/>
                <Circle cx={-11.7} cy={2.8}   r={1.5} fill="#FFD98A"/>
                <Circle cx={7.0}   cy={-8.9}  r={2.2} fill="#FFD98A"/>
                <Circle cx={7.5}   cy={-23.8} r={1.8} fill="#FFD98A"/>
                <Circle cx={-11.7} cy={-21.8} r={1.1} fill="#F7C97A"/>
                <Circle cx={-13.6} cy={-19.1} r={1.8} fill="#F2B450"/>
                <Circle cx={11.4}  cy={-5.9}  r={1.5} fill="#F7C97A"/>
                <Circle cx={20.7}  cy={3.0}   r={1.3} fill="#F7C97A"/>
                <Circle cx={5.5}   cy={-28.9} r={2.3} fill="#FFD98A"/>
                <Circle cx={-15.4} cy={-11.3} r={1.6} fill="#F7C97A"/>
                <Circle cx={12.7}  cy={4.1}   r={1.4} fill="#F2B450"/>
                <Circle cx={-8.5}  cy={-5.4}  r={1.7} fill="#F7C97A"/>
                <Circle cx={7.2}   cy={-15.4} r={1.3} fill="#FFD98A"/>
              </AnimatedG>
            </G>
          </AnimatedG>

        </G>
      </Svg>

      {/* Texto y barra — idéntico al HTML de marca */}
      <View style={styles.bottom}>
        <ThemedText style={styles.appName}>Vulcan</ThemedText>
        <ThemedText style={styles.msg}>Forjando tu plan…</ThemedText>
        <View style={styles.barOuter}>
          <Svg viewBox="0 0 180 6" width={180} height={6}>
            <Rect x={0} y={0} width={180} height={6} rx={3} fill="#243029"/>
            <AnimatedRect x={0} y={0} height={6} rx={3} fill={GREEN} animatedProps={barProps}/>
          </Svg>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  appName: {
    fontSize: 30,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: TEXT,
  },
  msg: {
    fontSize: 13.5,
    color: TEXT_DIM,
  },
  barOuter: {
    marginTop: 4,
  },
});
