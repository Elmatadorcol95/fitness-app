import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function ProgressScreen() {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ThemedText type="subtitle" style={styles.title}>
          {t('tabs.progress.title')}
        </ThemedText>

        <View style={styles.empty}>
          <ThemedText style={styles.emptyIcon}>📈</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.emptyText}>
            {t('tabs.progress.empty')}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptySub}>
            {t('tabs.progress.emptySub')}
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset },
  title: { marginTop: Spacing.four, marginBottom: Spacing.four },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingBottom: BottomTabInset },
  emptyIcon: { fontSize: 52 },
  emptyText: { textAlign: 'center' },
  emptySub: { textAlign: 'center', fontSize: 14 },
});
