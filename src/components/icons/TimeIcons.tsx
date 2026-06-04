import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface Props {
  size?: number;
  color: string;
}

// Amanecer — Feather "sunrise", ámbar #F2B450
export function SunriseIcon({ size = 30, color }: Props) {
  return <Feather name="sunrise" size={size} color={color} />;
}

// Sol — Feather "sun", ámbar #F2B450
export function SunIcon({ size = 30, color }: Props) {
  return <Feather name="sun" size={size} color={color} />;
}

// Luna creciente — MaterialCommunityIcons "moon-waning-crescent", blanco suave #F1F4F1
export function MoonIcon({ size = 30, color }: Props) {
  return <MaterialCommunityIcons name="moon-waning-crescent" size={size} color={color} />;
}
