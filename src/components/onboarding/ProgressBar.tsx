import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: Props) {
  const theme = useTheme();
  const progress = current / total;

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      <View
        style={[
          styles.fill,
          { width: `${progress * 100}%`, backgroundColor: theme.text },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: 3,
    borderRadius: 2,
  },
});
