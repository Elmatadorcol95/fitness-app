import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props { daysOver: number }

export function PaywallScreen({ daysOver }: Props) {
  const { t } = useTranslation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <ThemedView style={styles.root}>
      <ThemedText style={styles.logo}>VULCAN</ThemedText>
      <ThemedText style={styles.icon}>⚒️</ThemedText>

      <ThemedText type="subtitle" style={styles.title}>{t('auth.paywall.title')}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.sub}>
        {t('auth.paywall.subtitle')}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.offerCard}>
        <ThemedText type="defaultSemiBold" style={styles.offerTitle}>
          {t('auth.paywall.offer')}
        </ThemedText>
        <ThemedText style={styles.price}>{t('auth.paywall.price')}</ThemedText>
      </ThemedView>

      <View style={styles.actions}>
        <Pressable style={styles.btnMain}>
          <ThemedText style={styles.btnMainText}>{t('auth.paywall.cta')}</ThemedText>
        </Pressable>
        <ThemedText themeColor="textSecondary" style={styles.ctaNote}>
          {t('auth.paywall.ctaNote')}
        </ThemedText>
        <Pressable onPress={handleLogout}>
          <ThemedText style={styles.logout}>{t('auth.paywall.logout')}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  logo:        { fontSize: 28, fontWeight: '900', letterSpacing: 10, color: '#3FBF7F' },
  icon:        { fontSize: 56 },
  title:       { textAlign: 'center' },
  sub:         { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  offerCard:   { borderRadius: Spacing.three, padding: Spacing.four, alignItems: 'center', gap: Spacing.one, width: '100%' },
  offerTitle:  { fontSize: 17 },
  price:       { fontSize: 22, fontWeight: '700', color: '#3FBF7F' },
  actions:     { gap: Spacing.two, width: '100%', alignItems: 'center' },
  btnMain:     { backgroundColor: '#3FBF7F', borderRadius: Spacing.two, paddingVertical: Spacing.two + 6, width: '100%', alignItems: 'center', opacity: 0.5 },
  btnMainText: { color: '#04261A', fontWeight: '700', fontSize: 16 },
  ctaNote:     { fontSize: 12 },
  logout:      { color: '#9DA89F', fontSize: 14, marginTop: Spacing.two },
});
