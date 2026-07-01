import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface Props { width: number }

export function BarbellIcon({ width }: Props) {
  const height = width * (50 / 80);
  return (
    <Svg viewBox="0 0 80 50" width={width} height={height}>
      <Rect x={6}  y={21} width={68} height={6}  rx={3}   fill="#3FBF7F" />
      <Rect x={3}  y={10} width={8}  height={28} rx={2.5} fill="#3FBF7F" />
      <Rect x={13} y={15} width={7}  height={18} rx={2}   fill="#3FBF7F" />
      <Rect x={69} y={10} width={8}  height={28} rx={2.5} fill="#3FBF7F" />
      <Rect x={60} y={15} width={7}  height={18} rx={2}   fill="#3FBF7F" />
    </Svg>
  );
}

export function DumbbellIcon({ width }: Props) {
  const height = width * (40 / 50);
  return (
    <Svg viewBox="0 0 50 40" width={width} height={height}>
      <Rect x={13} y={16} width={24} height={8}  rx={4}   fill="#3FBF7F" />
      <Rect x={4}  y={8}  width={10} height={24} rx={3.5} fill="#3FBF7F" />
      <Rect x={36} y={8}  width={10} height={24} rx={3.5} fill="#3FBF7F" />
    </Svg>
  );
}

export function KettlebellIcon({ width }: Props) {
  const height = width * (52 / 50);
  return (
    <Svg viewBox="0 0 50 52" width={width} height={height}>
      <Path d="M15 10 Q15 1 25 1 Q35 1 35 10" fill="none" stroke="#3FBF7F" strokeWidth={5.5} strokeLinecap="round" />
      <Circle cx={25} cy={32} r={19} fill="#3FBF7F" />
    </Svg>
  );
}
