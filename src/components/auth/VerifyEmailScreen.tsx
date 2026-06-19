import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props { email: string; onBack: () => void }

export function VerifyEmailScreen({ email, onBack }: Props) {
  const { t } = useTranslation();
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    await supabase.auth.resend({ type: 'signup', email });
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  };

  return (
    <ThemedView style={styles.root}>
      <ThemedText style={styles.logo}>VULCAN</ThemedText>
      <Ionicons name="mail-outline" size={56} color="#3FBF7F" />
      <ThemedText type="subtitle" style={styles.title}>{t('auth.verifyEmail.title')}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.msg}>
        {t('auth.verifyEmail.message', { email })}
      </ThemedText>

      <View style={styles.actions}>
        <Pressable style={styles.btnSecondary} onPress={handleResend}>
          <ThemedText style={styles.btnSecondaryText}>
            {resent ? t('auth.verifyEmail.resendSuccess') : t('auth.verifyEmail.resend')}
          </ThemedText>
        </Pressable>
        <Pressable onPress={onBack}>
          <ThemedText style={styles.link}>{t('auth.verifyEmail.backToLogin')}</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  logo:            { fontSize: 28, fontWeight: '900', letterSpacing: 10, color: '#3FBF7F' },
  title:           { textAlign: 'center' },
  msg:             { textAlign: 'center', fontSize: 15, lineHeight: 22 },
  actions:         { gap: Spacing.two, width: '100%', alignItems: 'center', marginTop: Spacing.two },
  btnSecondary:    { borderWidth: 1.5, borderColor: '#3FBF7F', borderRadius: Spacing.two, paddingVertical: Spacing.two + 4, width: '100%', alignItems: 'center' },
  btnSecondaryText:{ color: '#3FBF7F', fontWeight: '600', fontSize: 15 },
  link:            { color: '#9DA89F', fontSize: 14, marginTop: Spacing.one },
});
