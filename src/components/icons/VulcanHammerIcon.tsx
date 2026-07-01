import Svg, { Circle, G, Line, Polygon, Rect } from 'react-native-svg';

interface Props { width: number }

export function VulcanHammerIcon({ width }: Props) {
  const height = width * (82 / 60);
  return (
    <Svg viewBox="0 0 60 82" width={width} height={height}>
      <Polygon points="2,58 20,52 20,63" fill="#3FBF7F" />
      <Rect x={19} y={51} width={26} height={12} rx={2} fill="#3FBF7F" />
      <Rect x={26} y={62} width={12} height={8} fill="#3FBF7F" />
      <Polygon points="20,69 46,69 53,78 13,78" fill="#3FBF7F" />
      <Line x1={28} y1={46} x2={18} y2={36} stroke="#3FBF7F" strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={32} y1={44} x2={32} y2={30} stroke="#3FBF7F" strokeWidth={2.4} strokeLinecap="round" />
      <Line x1={36} y1={46} x2={46} y2={36} stroke="#3FBF7F" strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={22} cy={44} r={1.8} fill="#3FBF7F" />
      <Circle cx={43} cy={42} r={1.8} fill="#3FBF7F" />
      <G transform="rotate(-18 48 20)">
        <Rect x={44} y={14} width={7} height={30} rx={3.5} fill="#3FBF7F" />
        <Rect x={34} y={4} width={27} height={15} rx={3} fill="#3FBF7F" />
      </G>
    </Svg>
  );
}
