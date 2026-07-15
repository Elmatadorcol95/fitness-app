import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

import type { MuscleRegionId } from './MuscleDiagram';

// Exploración paralela a MuscleDiagram.tsx (SVG puro, ya validado) — NO lo
// reemplaza. Fondo con foto real + zonas de toque calibrables encima, para
// comparar ambas opciones antes de decidir cuál usa la pantalla real (3c).

interface MuscleDiagramPhotoProps {
  view: 'front' | 'back';
  selected: MuscleRegionId[];
  onRegionPress: (id: MuscleRegionId) => void;
  calibrationMode?: boolean;
}

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const TEXT_ON_GREEN = '#04261A';

// Aspect ratio real de cada foto — no forzar el mismo entre vistas.
const FRONT_ASPECT = 516 / 1482;
const BACK_ASPECT = 522 / 1388;

interface ZoneDef {
  id: MuscleRegionId;
  key: string; // único por elipse — visible como etiqueta en calibrationMode
  cx: number; cy: number; rx: number; ry: number;
}

// Coordenadas de partida (estimadas, se recalibran después) — unidades 0-100
// = porcentaje del contenedor, tal cual las diste.
const FRONT_ZONES: ZoneDef[] = [
  { id: 'shoulders', key: 'shoulders_r', cx: 18, cy: 19, rx: 11, ry: 6 },
  { id: 'shoulders', key: 'shoulders_l', cx: 82, cy: 19, rx: 11, ry: 6 },
  { id: 'chest', key: 'chest_r', cx: 39, cy: 26, rx: 12, ry: 7 },
  { id: 'chest', key: 'chest_l', cx: 61, cy: 26, rx: 12, ry: 7 },
  { id: 'biceps', key: 'biceps_r', cx: 12, cy: 32, rx: 7, ry: 9 },
  { id: 'biceps', key: 'biceps_l', cx: 88, cy: 32, rx: 7, ry: 9 },
  { id: 'core_abdomen', key: 'core_abdomen', cx: 50, cy: 40, rx: 15, ry: 9 },
  { id: 'quads', key: 'quads_r', cx: 36, cy: 60, rx: 11, ry: 12 },
  { id: 'quads', key: 'quads_l', cx: 64, cy: 60, rx: 11, ry: 12 },
];

const BACK_ZONES: ZoneDef[] = [
  { id: 'back', key: 'back', cx: 50, cy: 25, rx: 22, ry: 13 },
  { id: 'triceps', key: 'triceps_r', cx: 12, cy: 30, rx: 7, ry: 9 },
  { id: 'triceps', key: 'triceps_l', cx: 88, cy: 30, rx: 7, ry: 9 },
  { id: 'glutes', key: 'glutes_r', cx: 40, cy: 44, rx: 11, ry: 7 },
  { id: 'glutes', key: 'glutes_l', cx: 60, cy: 44, rx: 11, ry: 7 },
  { id: 'hamstrings', key: 'hamstrings_r', cx: 37, cy: 59, rx: 11, ry: 10 },
  { id: 'hamstrings', key: 'hamstrings_l', cx: 63, cy: 59, rx: 11, ry: 10 },
  { id: 'calves', key: 'calves_r', cx: 37, cy: 78, rx: 9, ry: 9 },
  { id: 'calves', key: 'calves_l', cx: 63, cy: 78, rx: 9, ry: 9 },
];

export function MuscleDiagramPhoto({
  view, selected, onRegionPress, calibrationMode = true,
}: MuscleDiagramPhotoProps) {
  const zones = view === 'front' ? FRONT_ZONES : BACK_ZONES;
  const aspectRatio = view === 'front' ? FRONT_ASPECT : BACK_ASPECT;
  const imageSource = view === 'front'
    ? require('@/assets/images/musclePriorities/front.webp')
    : require('@/assets/images/musclePriorities/back.webp');

  return (
    <View style={[styles.container, { aspectRatio }]}>
      <Image source={imageSource} resizeMode="contain" style={StyleSheet.absoluteFill} />

      <Svg viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        {!calibrationMode && (
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
              <Stop offset="100%" stopColor={AMBER} stopOpacity={0} />
            </RadialGradient>
          </Defs>
        )}

        {zones.map((z) => {
          const isSelected = selected.includes(z.id);
          const handlePress = () => onRegionPress(z.id);

          if (calibrationMode) {
            // Visible para calibrar: relleno verde a baja opacidad + borde +
            // etiqueta con el id. Cada elipse es un Ellipse real con su
            // propio onPress — nunca <Use> para nada tocable.
            return (
              <G key={z.key}>
                <Ellipse
                  cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                  fill={GREEN}
                  fillOpacity={0.25}
                  stroke={isSelected ? AMBER : GREEN}
                  strokeWidth={0.5}
                  onPress={handlePress}
                />
                <SvgText
                  x={z.cx}
                  y={z.cy}
                  fontSize={3}
                  fill={TEXT_ON_GREEN}
                  textAnchor="middle"
                  onPress={handlePress}
                >
                  {z.key}
                </SvgText>
              </G>
            );
          }

          // Modo real: elipse invisible (solo área táctil) + resplandor
          // ámbar con degradado radial cuando la región está seleccionada.
          // El resplandor va DEBAJO de la elipse tocable para que esta
          // siga recibiendo el toque sin interferencia visual ni táctil.
          return (
            <G key={z.key}>
              {isSelected && (
                <Ellipse
                  cx={z.cx} cy={z.cy} rx={z.rx * 1.25} ry={z.ry * 1.25}
                  fill="url(#glowGrad)"
                />
              )}
              <Ellipse
                cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry}
                fill="transparent"
                onPress={handlePress}
              />
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
});
