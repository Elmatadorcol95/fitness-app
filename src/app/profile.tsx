import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore } from '@/store/profile.store';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { cmToFtIn, kgToLb } from '@/lib/units';
import { db, schema } from '@/db';
import { supabase } from '@/lib/supabase';
import { AchievementsSection } from '@/components/gamification/AchievementsSection';
import { useGamificationStore } from '@/store/gamification.store';

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';

const GOAL_DEFS: Record<string, { iconName: string; color: string; labelKey: string }> = {
  strength:    { iconName: 'barbell-outline', color: GREEN, labelKey: 'onboarding.goal.strength' },
  hypertrophy: { iconName: 'body-outline',    color: GREEN, labelKey: 'onboarding.goal.hypertrophy' },
  fat_loss:    { iconName: 'flame-outline',   color: AMBER, labelKey: 'onboarding.goal.fat_loss' },
};

const LOCATION_DEFS: Record<string, { iconName: string; labelKey: string }> = {
  gym:  { iconName: 'barbell-outline', labelKey: 'onboarding.location.gym' },
  home: { iconName: 'home-outline',    labelKey: 'onboarding.location.home' },
  both: { iconName: 'repeat-outline',  labelKey: 'onboarding.location.both' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.wrap}>
      <ThemedText style={sectionStyles.title}>{title}</ThemedText>
      <ThemedView type="backgroundElement" style={sectionStyles.card}>
        {children}
      </ThemedView>
    </View>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={rowStyles.wrap}>
      <ThemedText themeColor="textSecondary" style={rowStyles.label}>{label}</ThemedText>
      {typeof value === 'string' ? (
        <ThemedText type="defaultSemiBold" style={rowStyles.value}>{value}</ThemedText>
      ) : (
        <View style={rowStyles.valueNode}>{value}</View>
      )}
    </View>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { profile } = useProfileStore();
  const theme = useTheme();

  // Definido antes del null-check para que sea accesible en ambas ramas
  const resetGamification = useGamificationStore(s => s.resetAll);

  const handleSignOut = () => {
    Alert.alert(
      t('tabs.profile.signOut'),
      t('tabs.profile.signOutMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('tabs.profile.signOutConfirm'),
          style: 'destructive',
          onPress: async () => {
            console.log('[Profile] signOut — isAuthenticated antes:', !!useAuthStore.getState().session);
            try {
              await db.delete(schema.profile);
              useProfileStore.getState().setProfile(null);
              await resetGamification();
              await supabase.auth.signOut();
              console.log('[Profile] supabase.auth.signOut() completado');
            } catch (e) {
              console.error('[Profile] signOut error:', e);
            } finally {
              // Garantizamos limpieza del store aunque signOut falle o el evento
              // SIGNED_OUT no llegue (ej. error de red o sesión ya inválida).
              console.log('[Profile] finally — forzando setAuthState(null, null)');
              console.log('[Profile] session en store después de signOut:', useAuthStore.getState().session?.user?.email ?? null);
              useAuthStore.getState().setAuthState(null, null);
            }
          },
        },
      ],
    );
  };

  // Sin perfil: estado vacío con botón de reinicio siempre accesible
  if (!profile) {
    return (
      <ThemedView style={emptyStyles.root}>
        <Ionicons name="person-circle-outline" size={64} color="#9DA89F" />
        <ThemedText themeColor="textSecondary" style={emptyStyles.msg}>
          {t('tabs.profile.noProfile')}
        </ThemedText>
        <Pressable onPress={handleSignOut} style={emptyStyles.btn}>
          <Ionicons name="log-out-outline" size={16} color="#9DA89F" />
          <ThemedText style={emptyStyles.btnText}>{t('tabs.profile.signOut')}</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const isImperial = profile.units === 'imperial';

  const heightStr = profile.heightCm
    ? isImperial
      ? (() => { const { ft, inches } = cmToFtIn(profile.heightCm!); return `${ft}'${inches}"`; })()
      : `${Math.round(profile.heightCm)} cm`
    : '—';

  const weightStr = profile.weightKg
    ? isImperial ? `${kgToLb(profile.weightKg)} lb` : `${profile.weightKg} kg`
    : '—';

  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment ?? '[]'); } catch { return []; }
  })();

  const goals = [profile.goalPrimary, profile.goalSecondary].filter(Boolean) as string[];
  const goalNode = (
    <View style={{ gap: 4, alignItems: 'flex-end' }}>
      {goals.map((goal) => {
        const def = GOAL_DEFS[goal];
        if (!def) return (
          <ThemedText key={goal} type="defaultSemiBold" style={rowStyles.value}>{goal}</ThemedText>
        );
        return (
          <View key={goal} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Ionicons name={def.iconName as any} size={14} color={def.color} />
            <ThemedText type="defaultSemiBold" style={{ fontSize: 14, color: def.color }}>
              {t(def.labelKey)}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );

  const locDef = LOCATION_DEFS[profile.location];
  const locationNode = locDef ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
      <Ionicons name={locDef.iconName as any} size={14} color={theme.text} />
      <ThemedText type="defaultSemiBold" style={rowStyles.value}>
        {t(locDef.labelKey)}
      </ThemedText>
    </View>
  ) : profile.location;

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Avatar e identificador ── */}
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {profile.name.charAt(0).toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText type="subtitle">{profile.name}</ThemedText>
          </View>

          {/* ── Objetivo ── */}
          <Section title={t('tabs.profile.goalSection')}>
            <Row label={t('onboarding.summary.goal')} value={goalNode} />
          </Section>

          {/* ── Entrenamiento ── */}
          <Section title={t('tabs.profile.trainingSection')}>
            <Row label={t('onboarding.schedule.daysPerWeek')} value={`${profile.daysPerWeek} ${t('onboarding.schedule.days')}`} />
            <Row label={t('onboarding.schedule.minutesPerSession')} value={`${profile.minutesPerSession} ${t('onboarding.schedule.min')}`} />
            <Row label={t('onboarding.summary.location')} value={locationNode} />
          </Section>

          {/* ── Datos físicos ── */}
          <Section title={t('tabs.profile.physicalSection')}>
            {profile.birthDate ? (
              <Row
                label={t('onboarding.physical.birthDate')}
                value={(() => {
                  const [y, m, d] = profile.birthDate!.split('-').map(Number);
                  const today = new Date();
                  let age = today.getFullYear() - y;
                  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
                  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}  (${age} ${t('onboarding.physical.yearsOld')})`;
                })()}
              />
            ) : null}
            <Row label={t('onboarding.physical.height')} value={heightStr} />
            <Row label={t('onboarding.physical.weight')} value={weightStr} />
            <Row label={t('onboarding.summary.units')} value={isImperial ? 'Imperial (lb, ft)' : 'Métrico (kg, cm)'} />
          </Section>

          {/* ── Equipamiento ── */}
          <View style={sectionStyles.wrap}>
            <View style={styles.equipHeader}>
              <ThemedText style={sectionStyles.title}>
                {t('tabs.profile.equipmentSection')}
              </ThemedText>
              <Pressable
                onPress={() => router.push('/equipment' as any)}
                style={styles.editEquipBtn}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={15} color="#3FBF7F" />
                <ThemedText style={styles.editEquipText}>{t('equipment.editBtn')}</ThemedText>
              </Pressable>
            </View>
            <ThemedView type="backgroundElement" style={sectionStyles.card}>
              {equipment.length > 0 ? (
                <View style={styles.chips}>
                  {equipment.map((e) => (
                    <ThemedView key={e} type="backgroundSelected" style={styles.chip}>
                      <ThemedText style={styles.chipText}>
                        {t(`onboarding.location.equipmentItems.${e}`, { defaultValue: e })}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </View>
              ) : (
                <ThemedText themeColor="textSecondary" style={styles.gymEquipNote}>
                  {t('onboarding.location.gymNote')}
                </ThemedText>
              )}
            </ThemedView>
          </View>

          {/* ── Lesiones ── */}
          {profile.injuries ? (
            <Section title={t('onboarding.injuries.title')}>
              <ThemedText style={styles.injuriesText}>{profile.injuries}</ThemedText>
            </Section>
          ) : null}

          {/* ── Logros ── */}
          <AchievementsSection />

          {/* ── Cerrar sesión ── */}
          <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={16} color="#9DA89F" />
            <ThemedText style={styles.signOutText}>{t('tabs.profile.signOut')}</ThemedText>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.four, paddingBottom: BottomTabInset + Spacing.four, gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.two, marginTop: Spacing.four, marginBottom: Spacing.two },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#3FBF7F',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: '#04261A' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  chip: { borderRadius: Spacing.two, paddingHorizontal: Spacing.two, paddingVertical: 4 },
  chipText: { fontSize: 13 },
  equipHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  editEquipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editEquipText: { fontSize: 13, color: '#3FBF7F' },
  gymEquipNote: { fontSize: 13 },
  injuriesText: { fontSize: 14, lineHeight: 20 },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.three, marginTop: Spacing.two },
  signOutText: { fontSize: 14, color: '#9DA89F' },
});

const sectionStyles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  title: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6, paddingHorizontal: 4 },
  card: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
});

const emptyStyles = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, paddingHorizontal: Spacing.five },
  msg:     { fontSize: 15, textAlign: 'center' },
  btn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: Spacing.two, marginTop: Spacing.two },
  btnText: { fontSize: 14, color: '#9DA89F' },
});

const rowStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  label: { fontSize: 14, flex: 1 },
  value: { fontSize: 14, textAlign: 'right', flex: 1 },
  valueNode: { flex: 1, alignItems: 'flex-end' },
});
