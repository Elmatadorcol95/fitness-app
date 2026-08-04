import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VulcanSymbol } from '@/components/icons/VulcanSymbol';
import { Spacing } from '@/constants/theme';

interface Props {
  error: Error;
  onRetry: () => void;
}

export function MigrationErrorScreen({ error, onRetry }: Props) {
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.root}>
      <VulcanSymbol size={56} />

      <ThemedText type="subtitle" style={styles.title}>
        {t('migrations.errorTitle')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.msg}>
        {t('migrations.errorMsg')}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.errorBox}>
        <ScrollView>
          <ThemedText type="code" themeColor="textSecondary">
            {error.message}
          </ThemedText>
        </ScrollView>
      </ThemedView>

      <View style={styles.actions}>
        <Pressable style={styles.btnMain} onPress={onRetry}>
          <ThemedText style={styles.btnMainText}>{t('migrations.retryButton')}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  title:       { textAlign: 'center' },
  msg:         { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  errorBox:    { borderRadius: Spacing.three, padding: Spacing.three, width: '100%', maxHeight: 160 },
  actions:     { gap: Spacing.two, width: '100%', alignItems: 'center' },
  btnMain:     { backgroundColor: '#3FBF7F', borderRadius: Spacing.two, paddingVertical: Spacing.two + 6, width: '100%', alignItems: 'center' },
  btnMainText: { color: '#04261A', fontWeight: '700', fontSize: 16 },
});
