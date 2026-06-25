import { useState } from 'react';
import {
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useProgressStore, type WeightEntry } from '@/store/progress.store';
import { kgToLb } from '@/lib/units';
import { SimpleLineChart } from './SimpleLineChart';
import { AddWeightModal } from './AddWeightModal';

type Units = 'metric' | 'imperial';

interface Props {
  units: Units;
}

function formatDate(dateStr: string, t: (key: string) => string, lang: string): string {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (dateStr === today) return t('tabs.progress.today');
  if (dateStr === yesterday) return t('tabs.progress.yesterday');
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
  });
}

export function WeightTab({ units }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { weightEntries, deleteWeight } = useProgressStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WeightEntry | null>(null);

  const isImperial = units === 'imperial';
  const unitLabel = isImperial ? 'lb' : 'kg';

  function displayWeight(kg: number): string {
    const val = isImperial ? kgToLb(kg) : kg;
    return val.toFixed(1);
  }

  const chartData = [...weightEntries]
    .slice(0, 30)
    .reverse()
    .map((e) => ({
      date: e.date,
      value: isImperial ? kgToLb(e.weightKg) : e.weightKg,
    }));

  const lastEntry = weightEntries[0];
  const prevEntry = weightEntries[1];
  const change =
    lastEntry && prevEntry
      ? (isImperial ? kgToLb(lastEntry.weightKg) : lastEntry.weightKg) -
        (isImperial ? kgToLb(prevEntry.weightKg) : prevEntry.weightKg)
      : null;

  function confirmDelete(entry: WeightEntry) {
    setDeleteTarget(entry);
  }

  if (weightEntries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="scale" size={52} color={theme.textSecondary} />
        <ThemedText type="defaultSemiBold" style={styles.emptyText}>
          {t('tabs.progress.weight.noEntries')}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.emptySub}>
          {t('tabs.progress.weight.noEntriesSub')}
        </ThemedText>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: theme.accent }]}
        >
          <ThemedText style={{ color: theme.textOnAccent, fontWeight: '600' }}>
            + {t('tabs.progress.weight.addEntry')}
          </ThemedText>
        </TouchableOpacity>
        <AddWeightModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          units={units}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary card */}
      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.summaryLeft}>
          <ThemedText themeColor="textSecondary" style={styles.summaryLabel}>
            {t('tabs.progress.weight.lastEntry')}
          </ThemedText>
          <ThemedText style={styles.summaryWeight}>
            {displayWeight(lastEntry.weightKg)}{' '}
            <ThemedText style={styles.summaryUnit}>{unitLabel}</ThemedText>
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.summaryDate}>
            {formatDate(lastEntry.date, t, i18n.language)}
          </ThemedText>
        </View>
        {change !== null && (
          <View style={styles.changeContainer}>
            <ThemedText
              style={[
                styles.changeText,
                { color: change < 0 ? theme.accent : theme.amber },
              ]}
            >
              {change > 0 ? '+' : ''}
              {change.toFixed(1)} {unitLabel}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.changeLabel}>
              {t('tabs.progress.weight.change')}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Chart */}
      {chartData.length >= 2 && (
        <View style={[styles.chartCard, { backgroundColor: theme.backgroundElement }]}>
          <SimpleLineChart
            data={chartData}
            color={theme.accent}
            labelColor={theme.textSecondary}
            height={120}
          />
        </View>
      )}

      {/* List */}
      <FlatList
        data={weightEntries}
        keyExtractor={(item) => String(item.id)}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            onLongPress={() => confirmDelete(item)}
            style={[styles.entryRow, { backgroundColor: theme.backgroundElement }]}
          >
            <View>
              <ThemedText style={styles.entryWeight}>
                {displayWeight(item.weightKg)}{' '}
                <ThemedText themeColor="textSecondary" style={styles.entryUnit}>
                  {unitLabel}
                </ThemedText>
              </ThemedText>
              {item.notes ? (
                <ThemedText themeColor="textSecondary" style={styles.entryNotes}>
                  {item.notes}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText themeColor="textSecondary" style={styles.entryDate}>
              {formatDate(item.date, t, i18n.language)}
            </ThemedText>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
        )}
      />

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[styles.fab, { backgroundColor: theme.accent }]}
      >
        <ThemedText style={{ color: theme.textOnAccent, fontSize: 28, lineHeight: 32 }}>+</ThemedText>
      </TouchableOpacity>

      <AddWeightModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        units={units}
      />

      <VulcanDialog
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('tabs.progress.deleteEntry')}
        message={t('tabs.progress.deleteConfirm')}
        confirmLabel={t('tabs.progress.confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteWeight(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyText: { textAlign: 'center' },
  emptySub: { textAlign: 'center', fontSize: 14 },
  addBtn: { marginTop: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 12 },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  summaryLeft: { gap: 2 },
  summaryLabel: { fontSize: 12 },
  summaryWeight: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  summaryUnit: { fontSize: 18, fontWeight: '400' },
  summaryDate: { fontSize: 13 },
  changeContainer: { alignItems: 'flex-end' },
  changeText: { fontSize: 20, fontWeight: '600' },
  changeLabel: { fontSize: 12 },
  chartCard: {
    borderRadius: 14,
    padding: Spacing.two,
    marginBottom: Spacing.two,
    overflow: 'hidden',
  },
  list: { flex: 1 },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 10,
    marginBottom: 2,
  },
  entryWeight: { fontSize: 17, fontWeight: '600' },
  entryUnit: { fontSize: 14, fontWeight: '400' },
  entryNotes: { fontSize: 12, marginTop: 2 },
  entryDate: { fontSize: 13 },
  separator: { height: 2 },
  fab: {
    position: 'absolute',
    bottom: Spacing.three,
    right: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
