import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface Props {
  size?: number;
}

/**
 * Símbolo de Vulcan: yunque verde + chispa ámbar.
 * Úsalo en estados vacíos de cualquier pantalla.
 */
export function VulcanSymbol({ size = 64 }: Props) {
  const sparkSize = Math.round(size * 0.3);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Math.round(size * 0.08) }}>
      <MaterialCommunityIcons name="anvil" size={size} color="#3FBF7F" />
      <MaterialCommunityIcons
        name="star-four-points"
        size={sparkSize}
        color="#F2B450"
        style={{ marginBottom: Math.round(size * 0.15) }}
      />
    </View>
  );
}
