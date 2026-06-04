import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, useColorScheme, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Props { onBack: () => void; onSuccess: (email: string) => void }

function mapError(msg: string): string {
  if (msg.includes('already registered') || msg.includes('User already registered'))
    return 'auth.register.error.emailInUse';
  if (msg.includes('Password should be'))
    return 'auth.register.error.weakPassword';
  return 'auth.register.error.generic';
}

export function RegisterForm({ onBack, onSuccess }: Props) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    setError('');
    if (password.length < 8) { setError(t('auth.register.error.weakPassword')); return; }
    if (password !== confirm) { setError(t('auth.register.error.passwordMismatch')); return; }
    setLoading(true);
    const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
    setLoading(false);
    if (e) { setError(t(mapError(e.message))); return; }
    onSuccess(email.trim());
  };

  const input = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }];

  return (
    <ThemedView style={styles.root}>
      <ThemedText style={styles.logo}>VULCAN</ThemedText>
      <ThemedText type="subtitle" style={styles.title}>{t('auth.register.title')}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.sub}>{t('auth.register.subtitle')}</ThemedText>

      <View style={styles.form}>
        <TextInput
          style={input}
          placeholder={t('auth.register.email')}
          placeholderTextColor={colors.textSecondary}
          value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
        />
        <TextInput
          style={input}
          placeholder={t('auth.register.password')}
          placeholderTextColor={colors.textSecondary}
          value={password} onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={input}
          placeholder={t('auth.register.confirmPassword')}
          placeholderTextColor={colors.textSecondary}
          value={confirm} onChangeText={setConfirm}
          secureTextEntry returnKeyType="done" onSubmitEditing={handleRegister}
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable style={[styles.btn, { opacity: loading ? 0.7 : 1 }]} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#04261A" />
            : <ThemedText style={styles.btnText}>{t('auth.register.submit')}</ThemedText>}
        </Pressable>

        <Pressable onPress={onBack}>
          <ThemedText themeColor="textSecondary" style={styles.link}>
            {t('auth.register.hasAccount')}{' '}
            <ThemedText style={styles.linkAccent}>{t('auth.register.login')}</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.five },
  logo:       { fontSize: 28, fontWeight: '900', letterSpacing: 10, color: '#3FBF7F', textAlign: 'center', marginBottom: Spacing.four },
  title:      { textAlign: 'center' },
  sub:        { textAlign: 'center', fontSize: 14, marginTop: Spacing.one, marginBottom: Spacing.four },
  form:       { gap: Spacing.two },
  input:      { borderWidth: 1, borderRadius: Spacing.two, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 4, fontSize: 16 },
  error:      { color: '#F2B450', fontSize: 13, textAlign: 'center' },
  btn:        { backgroundColor: '#3FBF7F', borderRadius: Spacing.two, paddingVertical: Spacing.two + 6, alignItems: 'center', marginTop: Spacing.one },
  btnText:    { color: '#04261A', fontWeight: '700', fontSize: 16 },
  link:       { textAlign: 'center', fontSize: 14, marginTop: Spacing.two },
  linkAccent: { color: '#3FBF7F', fontWeight: '600' },
});
