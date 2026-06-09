import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';

interface ChartPoint {
  date: string; // YYYY-MM-DD
  value: number;
}

interface SimpleLineChartProps {
  data: ChartPoint[];
  color: string;
  height?: number;
  /** Color para las etiquetas de los ejes. */
  labelColor?: string;
  /** Decimales a mostrar en el eje Y. */
  decimals?: number;
}

/** 'YYYY-MM-DD' → 'dd/mm' */
function ddmm(date: string): string {
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}`;
}

const GUTTER_LEFT = 36;
const GUTTER_BOTTOM = 16;
const PAD_TOP = 10;
const PAD_RIGHT = 10;

export function SimpleLineChart({
  data,
  color,
  height = 120,
  labelColor = '#9DA89F',
  decimals = 1,
}: SimpleLineChartProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (data.length < 2) {
    return <View style={{ height, width: '100%' }} onLayout={onLayout} />;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mid = (min + max) / 2;
  const range = max - min || 1;

  const plotW = Math.max(0, width - GUTTER_LEFT - PAD_RIGHT);
  const plotH = height - PAD_TOP - GUTTER_BOTTOM;

  const points = data.map((d, i) => ({
    x: GUTTER_LEFT + (i / (data.length - 1)) * plotW,
    y: PAD_TOP + plotH - ((d.value - min) / range) * plotH,
  }));

  // Etiquetas de eje X: primera, media (si hay ≥3) y última fecha.
  const xLabelIndices =
    data.length >= 3 ? [0, Math.floor((data.length - 1) / 2), data.length - 1] : [0, data.length - 1];

  return (
    <View style={{ height, width: '100%', overflow: 'hidden' }} onLayout={onLayout}>
      {width > 0 && (
        <>
          {/* Eje Y: máximo, medio, mínimo */}
          {[
            { v: max, y: PAD_TOP },
            { v: mid, y: PAD_TOP + plotH / 2 },
            { v: min, y: PAD_TOP + plotH },
          ].map((lbl, i) => (
            <Text
              key={`y${i}`}
              style={{
                position: 'absolute',
                left: 0,
                top: lbl.y - 6,
                width: GUTTER_LEFT - 4,
                textAlign: 'right',
                fontSize: 9,
                color: labelColor,
              }}
            >
              {lbl.v.toFixed(decimals)}
            </Text>
          ))}

          {/* Líneas guía horizontales tenues */}
          {[PAD_TOP, PAD_TOP + plotH / 2, PAD_TOP + plotH].map((y, i) => (
            <View
              key={`g${i}`}
              style={{
                position: 'absolute',
                left: GUTTER_LEFT,
                top: y,
                width: plotW,
                height: 1,
                backgroundColor: labelColor,
                opacity: 0.12,
              }}
            />
          ))}

          {/* Segmentos de la línea */}
          {points.slice(0, -1).map((p, i) => {
            const p2 = points[i + 1];
            const dx = p2.x - p.x;
            const dy = p2.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            return (
              <View
                key={`l${i}`}
                style={{
                  position: 'absolute',
                  left: (p.x + p2.x) / 2 - len / 2,
                  top: (p.y + p2.y) / 2 - 1,
                  width: len,
                  height: 2,
                  backgroundColor: color,
                  opacity: 0.75,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}

          {/* Puntos */}
          {points.map((p, i) => (
            <View
              key={`d${i}`}
              style={{
                position: 'absolute',
                left: p.x - 4,
                top: p.y - 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: color,
              }}
            />
          ))}

          {/* Eje X: fechas dd/mm */}
          {xLabelIndices.map((idx, i) => {
            const px = points[idx].x;
            return (
              <Text
                key={`x${i}`}
                style={{
                  position: 'absolute',
                  top: height - GUTTER_BOTTOM + 2,
                  left: px - 24,
                  width: 48,
                  textAlign: i === 0 ? 'left' : i === xLabelIndices.length - 1 ? 'right' : 'center',
                  fontSize: 9,
                  color: labelColor,
                }}
              >
                {ddmm(data[idx].date)}
              </Text>
            );
          })}
        </>
      )}
    </View>
  );
}
