import { useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, StyleSheet, TextInput, View, useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { VulcanVolcano } from '@/components/VulcanVolcano';
import { VulcanHammerIcon } from '@/components/icons/VulcanHammerIcon';
import { BarbellIcon, DumbbellIcon, KettlebellIcon } from '@/components/icons/VulcanGymIcons';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const VOLCANO_W = Dimensions.get('window').width * 0.54;
const VOLCANO_H = VOLCANO_W * (300 / 440);

interface Props { onRegister: () => void }

function mapError(code?: string): string {
  if (!code) return 'auth.login.error.generic';
  if (code.includes('invalid_credentials') || code.includes('Invalid login'))
    return 'auth.login.error.invalidCredentials';
  if (code.includes('Email not confirmed') || code.includes('email_not_confirmed'))
    return 'auth.login.error.emailNotConfirmed';
  return 'auth.login.error.generic';
}

export function LoginForm({ onRegister }: Props) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme === 'unspecified' ? 'dark' : scheme];

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (e) setError(t(mapError(e.message)));
  };

  const input = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected }];

  return (
    <ThemedView style={styles.root}>
      <View style={styles.volcanoWrap}>
        <View style={{ position: 'relative', width: VOLCANO_W, height: VOLCANO_H }}>
          <VulcanVolcano width={VOLCANO_W} />

          <View style={{ position: 'absolute', left: VOLCANO_W * 0.012, top: -VOLCANO_H * 0.283 }}>
            <VulcanHammerIcon width={VOLCANO_W * 0.167} />
          </View>

          <View style={{ position: 'absolute', left: VOLCANO_W * 0.841, top: -VOLCANO_H * 0.198, transform: [{ rotate: '-6deg' }] }}>
            <BarbellIcon width={VOLCANO_W * 0.193} />
          </View>

          <View style={{ position: 'absolute', left: VOLCANO_W * 0.937, top: -VOLCANO_H * 0.047, transform: [{ rotate: '10deg' }] }}>
            <DumbbellIcon width={VOLCANO_W * 0.122} />
          </View>

          <View style={{ position: 'absolute', left: VOLCANO_W * 0.802, top: VOLCANO_H * 0.085, transform: [{ rotate: '-4deg' }] }}>
            <KettlebellIcon width={VOLCANO_W * 0.109} />
          </View>
        </View>
      </View>
      <ThemedText style={styles.logo}>VULCAN</ThemedText>
      <ThemedText type="subtitle" style={styles.title}>{t('auth.login.title')}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.sub}>{t('auth.login.subtitle')}</ThemedText>

      <View style={styles.form}>
        <TextInput
          style={input}
          placeholder={t('auth.login.email')}
          placeholderTextColor={colors.textSecondary}
          value={email} onChangeText={setEmail}
          keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
        />
        <TextInput
          style={input}
          placeholder={t('auth.login.password')}
          placeholderTextColor={colors.textSecondary}
          value={password} onChangeText={setPassword}
          secureTextEntry returnKeyType="done" onSubmitEditing={handleLogin}
        />

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable style={[styles.btn, { opacity: loading ? 0.7 : 1 }]} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#04261A" />
            : <ThemedText style={styles.btnText}>{t('auth.login.submit')}</ThemedText>}
        </Pressable>

        <Pressable onPress={onRegister}>
          <ThemedText themeColor="textSecondary" style={styles.link}>
            {t('auth.login.noAccount')}{' '}
            <ThemedText style={styles.linkAccent}>{t('auth.login.register')}</ThemedText>
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.five },
  volcanoWrap: { alignItems: 'center', marginTop: 40, marginBottom: 20 },
  logo:        { fontSize: 28, fontWeight: '900', letterSpacing: 3, color: '#3FBF7F', textAlign: 'center', marginBottom: Spacing.four },
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
