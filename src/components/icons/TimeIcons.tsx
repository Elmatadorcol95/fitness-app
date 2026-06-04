import Svg, { Circle, Line, Path } from 'react-native-svg';

const SW = 1.6; // strokeWidth uniforme en los tres iconos

interface Props {
  size?: number;
  color: string;
}

// ── Amanecer — medio sol sobre el horizonte con rayos ────────────────
// ViewBox 24×24. Centro del sol en (12,18), radio 6, horizonte y=18.
export function SunriseIcon({ size = 30, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Horizonte */}
      <Line
        x1="1" y1="18" x2="23" y2="18"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
      />
      {/* Semicírculo superior */}
      <Path
        d="M 6 18 A 6 6 0 0 0 18 18"
        fill="none" stroke={color} strokeWidth={SW} strokeLinecap="round"
      />
      {/* Rayo superior */}
      <Line
        x1="12" y1="10.5" x2="12" y2="7"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
      />
      {/* Rayo diagonal izquierdo */}
      <Line
        x1="7" y1="13" x2="4.9" y2="10.9"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
      />
      {/* Rayo diagonal derecho */}
      <Line
        x1="17" y1="13" x2="19.1" y2="10.9"
        stroke={color} strokeWidth={SW} strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Sol — círculo con ocho rayos ──────────────────────────────────────
// ViewBox 24×24. Centro (12,12), radio 5. Rayos cada 45°.
export function SunIcon({ size = 30, color }: Props) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const r = (deg * Math.PI) / 180;
    return {
      x1: +(12 + 7   * Math.cos(r)).toFixed(2),
      y1: +(12 + 7   * Math.sin(r)).toFixed(2),
      x2: +(12 + 9.5 * Math.cos(r)).toFixed(2),
      y2: +(12 + 9.5 * Math.sin(r)).toFixed(2),
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={SW} />
      {rays.map((r, i) => (
        <Line
          key={i}
          x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
          stroke={color} strokeWidth={SW} strokeLinecap="round"
        />
      ))}
    </Svg>
  );
}

// ── Luna creciente — path clásico relleno ─────────────────────────────
// ViewBox 24×24. Path estilo Lucide: arco exterior (r=9) + arco interior
// (r=7) que forman la silueta de la luna creciente.
export function MoonIcon({ size = 30, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M 21 12.79 A 9 9 0 1 1 11.21 3 A 7 7 0 0 0 21 12.79 Z"
        fill={color}
      />
    </Svg>
  );
}
