import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { MuscleRegionId } from './MuscleDiagramPhoto';
import {
  BACK_ASPECT,
  BACK_ZONES,
  FRONT_ASPECT,
  FRONT_ZONES,
  MuscleDiagramPhoto,
} from './MuscleDiagramPhoto';

// Envuelve a MuscleDiagramPhoto (sin modificarla) añadiendo etiquetas
// externas con línea guía + leyenda. Todo el toque sigue viviendo en
// MuscleDiagramPhoto — esta capa es puramente decorativa, sin onPress propio.

interface MuscleDiagramLabeledProps {
  view: 'front' | 'back';
  selected: MuscleRegionId[];
  onRegionPress: (id: MuscleRegionId) => void;
  height?: number;
}

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const GRAY = '#9DA89F';

const LABEL_COLUMN_WIDTH = 140;
const GAP = 16;

const FRONT_LABELS = [
  { text: 'Hombros', anchorKey: 'shoulders_l', labelYPercent: 23.6 },
  { text: 'Pecho', anchorKey: 'chest_l', labelYPercent: 28.6 },
  { text: 'Bíceps', anchorKey: 'biceps_l', labelYPercent: 33.6 },
  { text: 'Core / Abdomen', anchorKey: 'core_abdomen', labelYPercent: 39 },
  { text: 'Cuádriceps', anchorKey: 'quads_l', labelYPercent: 57.6 },
];

const BACK_LABELS = [
  { text: 'Espalda', anchorKey: 'back', labelYPercent: 29 },
  { text: 'Tríceps', anchorKey: 'triceps_l', labelYPercent: 34 },
  { text: 'Glúteos', anchorKey: 'glutes_l', labelYPercent: 48 },
  { text: 'Isquiotibiales', anchorKey: 'hamstrings_l', labelYPercent: 63.6 },
  { text: 'Gemelos', anchorKey: 'calves_l', labelYPercent: 78 },
];

export function MuscleDiagramLabeled({
  view, selected, onRegionPress, height = 520,
}: MuscleDiagramLabeledProps) {
  const zones = view === 'front' ? FRONT_ZONES : BACK_ZONES;
  const aspectRatio = view === 'front' ? FRONT_ASPECT : BACK_ASPECT;
  const labelDefs = view === 'front' ? FRONT_LABELS : BACK_LABELS;

  const diagramWidth = height * aspectRatio;
  const midX = diagramWidth + GAP * 0.5;
  const labelStartX = diagramWidth + GAP;
  const totalWidth = labelStartX + LABEL_COLUMN_WIDTH;

  const rows = labelDefs
    .map((def) => {
      const zone = zones.find((z) => z.key === def.anchorKey);
      if (!zone) return null;
      const labelY = (def.labelYPercent / 100) * height;
      const anchorX = ((zone.cx + zone.rx) / 100) * diagramWidth;
      const anchorY = (zone.cy / 100) * height;
      const color = selected.includes(zone.id) ? AMBER : GRAY;
      return { key: def.anchorKey, id: zone.id, text: def.text, labelY, anchorX, anchorY, color };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <View>
      <View style={[styles.row, { width: totalWidth, height }]}>
        <View style={{ width: diagramWidth, height }}>
          <MuscleDiagramPhoto
            view={view}
            selected={selected}
            onRegionPress={onRegionPress}
            calibrationMode={false}
            maxHeight={height}
          />
        </View>

        <View style={{ width: LABEL_COLUMN_WIDTH, height }}>
          {rows.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => onRegionPress(r.id)}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              style={[styles.label, { top: r.labelY - 8 }]}
            >
              <Text style={[styles.labelText, { color: r.color }]}>{r.text}</Text>
            </Pressable>
          ))}
        </View>

        <Svg
          width={totalWidth}
          height={height}
          viewBox={`0 0 ${totalWidth} ${height}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {rows.map((r) => (
            <Path
              key={r.key}
              d={`M ${r.anchorX} ${r.anchorY} L ${midX} ${r.anchorY} L ${labelStartX} ${r.labelY}`}
              stroke={r.color}
              strokeWidth={1}
              fill="none"
            />
          ))}
        </Svg>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: GREEN }]} />
          <Text style={styles.legendText}>Disponible</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: AMBER }]} />
          <Text style={styles.legendText}>Priorizado</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', columnGap: GAP },
  label: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingLeft: 8,
  },
  labelText: {
    fontSize: 13,
  },
  legend: { marginTop: 12, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: GRAY },
});
