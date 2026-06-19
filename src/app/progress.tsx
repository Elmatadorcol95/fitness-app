import { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/store/progress.store';
import { useProfileStore } from '@/store/profile.store';
import { WeightTab } from '@/components/progress/WeightTab';
import { MeasurementsTab } from '@/components/progress/MeasurementsTab';
import { PhotosTab } from '@/components/progress/PhotosTab';

type Tab = 'weight' | 'measurements' | 'photos';
const TABS: Tab[] = ['weight', 'measurements', 'photos'];

export default function ProgressScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { loadAll, isLoading } = useProgressStore();
  const { profile } = useProfileStore();
  const [activeTab, setActiveTab] = useState<Tab>('weight');

  useEffect(() => {
    loadAll();
  }, []);

  const units = profile?.units ?? 'metric';

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={[styles.safe, { paddingBottom: BottomTabInset }]}>
        {/* Header */}
        <ThemedText type="subtitle" style={styles.title}>
          {t('tabs.progress.title')}
        </ThemedText>

        {/* Tab bar */}
        <View style={[styles.tabBar, { backgroundColor: theme.backgroundElement }]}>
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabBtn, isActive && { backgroundColor: theme.accent }]}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    isActive && { color: theme.textOnAccent },
                  ]}
                >
                  {t(`tabs.progress.tabs.${tab}`)}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ThemedText themeColor="textSecondary">{t('common.loading')}</ThemedText>
            </View>
          ) : (
            <>
              {activeTab === 'weight' && <WeightTab units={units as 'metric' | 'imperial'} />}
              {activeTab === 'measurements' && <MeasurementsTab units={units as 'metric' | 'imperial'} />}
              {activeTab === 'photos' && <PhotosTab />}
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: Spacing.four },
  title: { marginTop: Spacing.four, marginBottom: Spacing.three },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginBottom: Spacing.three,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 9,
    alignItems: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '500' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
