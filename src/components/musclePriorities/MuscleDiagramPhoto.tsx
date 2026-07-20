import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';

// Exportado — importado por el paso 3c (pantalla real de prioridades).
export type MuscleRegionId =
  | 'chest' | 'shoulders' | 'biceps' | 'quads' | 'core_abdomen'
  | 'back' | 'triceps' | 'glutes' | 'hamstrings' | 'calves';

// Fondo con foto real + zonas de toque calibrables encima.

interface MuscleDiagramPhotoProps {
  view: 'front' | 'back';
  selected: MuscleRegionId[];
  onRegionPress: (id: MuscleRegionId) => void;
  calibrationMode?: boolean;
  // 520 es simplemente el valor por defecto de maxHeight (mismo alto fijo
  // que usaba el wrapper original de MuscleDiagram.tsx).
  maxHeight?: number;
}

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const TEXT_ON_GREEN = '#04261A';

// Aspect ratio real de cada foto — no forzar el mismo entre vistas.
export const FRONT_ASPECT = 516 / 1482;
export const BACK_ASPECT = 522 / 1388;

export interface ZoneDef {
  id: MuscleRegionId;
  key: string; // único por elipse — visible como etiqueta en calibrationMode
  cx: number; cy: number; rx: number; ry: number;
}

// Coordenadas de partida (estimadas, se recalibran después) — unidades 0-100
// = porcentaje del contenedor, tal cual las diste.
export const FRONT_ZONES: ZoneDef[] = [
  { id: 'shoulders', key: 'shoulders_r', cx: 18.5, cy: 23.6, rx: 7.24, ry: 4.9 },
  { id: 'shoulders', key: 'shoulders_l', cx: 81.5, cy: 23.6, rx: 7.24, ry: 4.9 },
  { id: 'chest', key: 'chest_r', cx: 39, cy: 26.5, rx: 10, ry: 6.5 },
  { id: 'chest', key: 'chest_l', cx: 61, cy: 26.5, rx: 10, ry: 6.5 },
  { id: 'biceps', key: 'biceps_r', cx: 16.4, cy: 32.6, rx: 5.6, ry: 5.5 },
  { id: 'biceps', key: 'biceps_l', cx: 83.6, cy: 32.6, rx: 5.6, ry: 5.5 },
  { id: 'core_abdomen', key: 'core_abdomen', cx: 50, cy: 39, rx: 14, ry: 11 },
  { id: 'quads', key: 'quads_r', cx: 31.24, cy: 57.6, rx: 11.74, ry: 12.5 },
  { id: 'quads', key: 'quads_l', cx: 68.76, cy: 57.6, rx: 11.74, ry: 12.5 },
];

export const BACK_ZONES: ZoneDef[] = [
  { id: 'back', key: 'back', cx: 50, cy: 29, rx: 20, ry: 13.5 },
  { id: 'triceps', key: 'triceps_r', cx: 17.5, cy: 31, rx: 6, ry: 7.5 },
  { id: 'triceps', key: 'triceps_l', cx: 82.5, cy: 31, rx: 6, ry: 7.5 },
  { id: 'glutes', key: 'glutes_r', cx: 36.6, cy: 48.2, rx: 10.61, ry: 7 },
  { id: 'glutes', key: 'glutes_l', cx: 63.4, cy: 48.2, rx: 10.61, ry: 7 },
  { id: 'hamstrings', key: 'hamstrings_r', cx: 33.6, cy: 63.6, rx: 9, ry: 9 },
  { id: 'hamstrings', key: 'hamstrings_l', cx: 66.4, cy: 63.6, rx: 9, ry: 9 },
  { id: 'calves', key: 'calves_r', cx: 31.9, cy: 78, rx: 7.2, ry: 9.2 },
  { id: 'calves', key: 'calves_l', cx: 68.1, cy: 78, rx: 7.2, ry: 9.2 },
];

export function MuscleDiagramPhoto({
  view, selected, onRegionPress, calibrationMode = true, maxHeight = 520,
}: MuscleDiagramPhotoProps) {
  const zones = view === 'front' ? FRONT_ZONES : BACK_ZONES;
  const aspectRatio = view === 'front' ? FRONT_ASPECT : BACK_ASPECT;
  const imageSource = view === 'front'
    ? require('@/assets/images/musclePriorities/front.webp')
    : require('@/assets/images/musclePriorities/back.webp');

  const width = maxHeight * aspectRatio;

  return (
    <View style={[styles.container, { width, height: maxHeight }]}>
      <Image
        source={imageSource}
        resizeMode="contain"
        style={{ position: 'absolute', top: 0, left: 0, width, height: maxHeight }}
      />

      <Svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        width={width}
        height={maxHeight}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {!calibrationMode && (
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={AMBER} stopOpacity={0.7875} />
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
    position: 'relative',
    alignSelf: 'center',
  },
});
