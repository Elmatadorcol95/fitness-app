import { Dimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

interface Props { width?: number }

export function VulcanVolcano({ width = SW * 0.54 }: Props) {
  const height = width * (300 / 440);

  return (
    <Svg viewBox="-20 -55 440 300" width={width} height={height}>
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="55%" r="50%">
          <Stop offset="0%"   stopColor="#FFD98A" stopOpacity={0.95} />
          <Stop offset="45%"  stopColor="#F2B450" stopOpacity={0.55} />
          <Stop offset="100%" stopColor="#F2B450" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="lava" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor="#FFD98A" />
          <Stop offset="30%"  stopColor="#F2B450" />
          <Stop offset="62%"  stopColor="#E8622F" />
          <Stop offset="100%" stopColor="#C22F1E" />
        </LinearGradient>
      </Defs>

      {/* Cuerpo principal del volcán */}
      <Polygon points="-10,224 68,132 96,150 150,58 168,72 205,4 242,72 260,58 314,150 342,132 400,224" fill="#3FBF7F" />
      {/* Sombra derecha */}
      <Polygon points="205,4 242,72 260,58 314,150 342,132 400,224 250,224 220,110" fill="#2E8C5B" opacity={0.32} />
      {/* Brillo izquierdo */}
      <Polygon points="-10,224 68,132 96,150 150,58 168,72 205,4 205,224" fill="#5BD897" opacity={0.13} />

      {/* Halo de calor en la cima */}
      <Circle cx={205} cy={16} r={30} fill="url(#glow)" />

      {/* Cráter oscuro */}
      <Polygon points="191,10 205,3 219,11 213,24 197,24" fill="#141A17" />

      {/* Columna de lava principal */}
      <Path d="M205 8 Q199 -14 205 -36 Q212 -14 205 8 Z" fill="url(#lava)" />

      {/* Gotas de lava alrededor del cráter */}
      <Circle cx={178} cy={-2}  r={4}   fill="#E8622F" />
      <Circle cx={234} cy={-4}  r={3.4} fill="#F2B450" />
      <Circle cx={168} cy={16}  r={2.8} fill="#F7C97A" />
      <Circle cx={244} cy={18}  r={3}   fill="#D9542B" />
      <Circle cx={205} cy={-38} r={2.6} fill="#FFD98A" />

      {/* Riachuelo de lava por el flanco — cuerpo grueso */}
      <Path
        d="M204 24 C199 48, 208 62, 199 88 C191 112, 174 122, 170 150 C167 174, 176 190, 171 224"
        fill="none" stroke="url(#lava)" strokeWidth={13} strokeLinecap="round"
      />
      {/* Riachuelo de lava — núcleo brillante */}
      <Path
        d="M204 24 C199 48, 208 62, 199 88 C191 112, 174 122, 170 150 C167 174, 176 190, 171 224"
        fill="none" stroke="#FFD98A" strokeWidth={3.5} strokeLinecap="round" opacity={0.7}
      />
      {/* Ramal lateral */}
      <Path
        d="M182 140 Q170 148 165 162"
        fill="none" stroke="#E8622F" strokeWidth={3.2} strokeLinecap="round" opacity={0.75}
      />
    </Svg>
  );
}
