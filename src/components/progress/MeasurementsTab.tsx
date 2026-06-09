import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import {
  useProgressStore,
  type MeasurementField,
  type MeasurementEntry,
} from '@/store/progress.store';
import { useProfileStore } from '@/store/profile.store';
import type { Goal } from '@/store/profile.store';
import { cmToIn } from '@/lib/units';
import { SimpleLineChart } from './SimpleLineChart';
import { AddMeasurementModal } from './AddMeasurementModal';
import { MeasurementPickerModal } from './MeasurementPickerModal';

type Units = 'metric' | 'imperial';

interface Props {
  units: Units;
}

function getFieldValue(entry: MeasurementEntry, field: MeasurementField): number | null {
  const raw = entry[field as keyof MeasurementEntry];
  return typeof raw === 'number' ? raw : null;
}

function displayValue(
  cmValue: number,
  field: MeasurementField,
  units: Units
): string {
  if (field === 'bodyFatPct') return cmValue.toFixed(1);
  const val = units === 'imperial' ? cmToIn(cmValue) : cmValue;
  return val.toFixed(1);
}

function unitFor(field: MeasurementField, units: Units): string {
  if (field === 'bodyFatPct') return '%';
  return units === 'imperial' ? 'in' : 'cm';
}

type GoodDirection = 'up' | 'down' | 'neutral';

// Medidas donde SUBIR es bueno (músculo) y donde BAJAR es bueno (grasa).
const UP_IS_GOOD: MeasurementField[] = ['shoulders', 'chest', 'arm', 'thigh', 'calf'];
const DOWN_IS_GOOD: MeasurementField[] = ['waist', 'hip', 'bodyFatPct'];

/**
 * Dirección "buena" de una medida según el objetivo principal.
 * Las medidas musculares y de grasa tienen dirección fija; cuello y antebrazo
 * son neutros salvo que el objetivo principal incline la balanza:
 *  - fuerza/hipertrofia → priorizar ganar músculo (subir es bueno).
 *  - fat_loss → priorizar perder grasa (bajar es bueno).
 */
function goodDirection(field: MeasurementField, primaryGoal?: Goal): GoodDirection {
  if (UP_IS_GOOD.includes(field)) return 'up';
  if (DOWN_IS_GOOD.includes(field)) return 'down';
  // neck, forearm → neutros, pero el objetivo principal puede darles sentido
  if (primaryGoal === 'fat_loss') return 'down';
  if (primaryGoal === 'strength' || primaryGoal === 'hypertrophy') return 'up';
  return 'neutral';
}

export function MeasurementsTab({ units }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { measurements, activeFields, setActiveFields } = useProgressStore();
  const primaryGoal = useProfileStore((s) => s.profile?.goalPrimary as Goal | undefined);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [expandedField, setExpandedField] = useState<MeasurementField | null>(null);

  function getEntriesForField(field: MeasurementField) {
    return measurements
      .filter((m) => getFieldValue(m, field) !== null)
      .map((m) => ({
        date: m.date,
        value: getFieldValue(m, field)!,
      }));
  }

  // entries[0] = más reciente; entries[último] = PRIMERO registrado.
  function getDiff(field: MeasurementField): number | null {
    const entries = getEntriesForField(field);
    if (entries.length < 2) return null;
    const latest = entries[0].value;
    const first = entries[entries.length - 1].value;
    return latest - first;
  }

  function getTrend(field: MeasurementField): string {
    const diff = getDiff(field);
    if (diff === null) return '';
    if (diff > 0.05) return t('tabs.progress.measurements.trend.up');
    if (diff < -0.05) return t('tabs.progress.measurements.trend.down');
    return t('tabs.progress.measurements.trend.same');
  }

  function getTrendColor(field: MeasurementField): string {
    const diff = getDiff(field);
    if (diff === null || Math.abs(diff) <= 0.05) return theme.textSecondary;
    const dir = goodDirection(field, primaryGoal);
    if (dir === 'neutral') return theme.textSecondary;
    const goingUp = diff > 0;
    const isGood = (dir === 'up' && goingUp) || (dir === 'down' && !goingUp);
    return isGood ? theme.accent : theme.amber;
  }

  if (activeFields.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="body-outline" size={52} color={theme.textSecondary} />
        <ThemedText type="defaultSemiBold" style={styles.emptyText}>
          {t('tabs.progress.measurements.noFieldsSelected')}
        </ThemedText>
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={[styles.chooseBtn, { backgroundColor: theme.accent }]}
        >
          <ThemedText style={{ color: theme.textOnAccent, fontWeight: '600' }}>
            {t('tabs.progress.measurements.chooseMeasurements')}
          </ThemedText>
        </TouchableOpacity>
        <MeasurementPickerModal
          visible={pickerVisible}
          current={activeFields}
          onSave={(fields) => { setActiveFields(fields); setPickerVisible(false); }}
          onClose={() => setPickerVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Customize button */}
      <TouchableOpacity
        onPress={() => setPickerVisible(true)}
        style={[styles.customizeRow, { backgroundColor: theme.backgroundElement }]}
      >
        <ThemedText themeColor="textSecondary" style={styles.customizeText}>
          {t('tabs.progress.measurements.customize')}
        </ThemedText>
        <ThemedText themeColor="textSecondary">›</ThemedText>
      </TouchableOpacity>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {activeFields.map((field) => {
          const entries = getEntriesForField(field);
          const latest = entries[0];
          const isExpanded = expandedField === field;

          return (
            <TouchableOpacity
              key={field}
              onPress={() => setExpandedField(isExpanded ? null : field)}
              style={[styles.fieldCard, { backgroundColor: theme.backgroundElement }]}
              activeOpacity={0.8}
            >
              <View style={styles.fieldHeader}>
                <View>
                  <ThemedText themeColor="textSecondary" style={styles.fieldName}>
                    {t(`tabs.progress.measurements.fields.${field}`)}
                  </ThemedText>
                  {latest ? (
                    <ThemedText style={styles.fieldValue}>
                      {displayValue(latest.value, field, units)}{' '}
                      <ThemedText themeColor="textSecondary" style={styles.fieldUnit}>
                        {unitFor(field, units)}
                      </ThemedText>
                    </ThemedText>
                  ) : (
                    <ThemedText themeColor="textSecondary" style={styles.fieldNoData}>
                      —
                    </ThemedText>
                  )}
                </View>
                <View style={styles.fieldRight}>
                  {entries.length >= 2 && (
                    <ThemedText
                      style={[styles.trend, { color: getTrendColor(field) }]}
                    >
                      {getTrend(field)}
                    </ThemedText>
                  )}
                  <ThemedText themeColor="textSecondary" style={styles.expandChevron}>
                    {isExpanded ? '∧' : '∨'}
                  </ThemedText>
                </View>
              </View>

              {isExpanded && entries.length >= 2 && (
                <View style={styles.chartWrapper}>
                  <SimpleLineChart
                    data={[...entries]
                      .reverse()
                      .slice(-20)
                      .map((e) => ({
                        date: e.date,
                        value:
                          field === 'bodyFatPct'
                            ? e.value
                            : units === 'imperial'
                              ? cmToIn(e.value)
                              : e.value,
                      }))}
                    color={theme.amber}
                    labelColor={theme.textSecondary}
                    height={100}
                  />
                </View>
              )}

              {isExpanded && entries.length === 0 && (
                <ThemedText themeColor="textSecondary" style={styles.noData}>
                  {t('tabs.progress.measurements.noEntries')}
                </ThemedText>
              )}
            </TouchableOpacity>
          );
        })}

        {/* bottom spacer for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        onPress={() => setAddModalVisible(true)}
        style={[styles.fab, { backgroundColor: theme.accent }]}
      >
        <ThemedText style={{ color: theme.textOnAccent, fontSize: 28, lineHeight: 32 }}>+</ThemedText>
      </TouchableOpacity>

      <AddMeasurementModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        units={units}
        activeFields={activeFields}
      />

      <MeasurementPickerModal
        visible={pickerVisible}
        current={activeFields}
        onSave={(fields) => { setActiveFields(fields); setPickerVisible(false); }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  emptyText: { textAlign: 'center' },
  chooseBtn: { marginTop: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.two, borderRadius: 12 },
  customizeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 10,
    marginBottom: Spacing.two,
  },
  customizeText: { fontSize: 14 },
  list: { flex: 1 },
  fieldCard: {
    borderRadius: 12,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldName: { fontSize: 12, marginBottom: 2 },
  fieldValue: { fontSize: 22, fontWeight: '600' },
  fieldUnit: { fontSize: 14, fontWeight: '400' },
  fieldNoData: { fontSize: 22, fontWeight: '600' },
  fieldRight: { alignItems: 'flex-end', gap: 4 },
  trend: { fontSize: 20, fontWeight: '700' },
  expandChevron: { fontSize: 12 },
  chartWrapper: { marginTop: Spacing.two },
  noData: { marginTop: Spacing.two, textAlign: 'center', fontSize: 13 },
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
