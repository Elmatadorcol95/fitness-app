import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useProgressStore, type MeasurementField } from '@/store/progress.store';
import { inToCm } from '@/lib/units';
import { hapticsLight } from '@/lib/haptics';

type Units = 'metric' | 'imperial';

interface Props {
  visible: boolean;
  onClose: () => void;
  units: Units;
  activeFields: MeasurementField[];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatDateLabel(dateStr: string, t: (key: string) => string, lang: string): string {
  const today = todayStr();
  const yesterday = shiftDate(today, -1);
  if (dateStr === today) return t('tabs.progress.today');
  if (dateStr === yesterday) return t('tabs.progress.yesterday');
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(lang, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AddMeasurementModal({ visible, onClose, units, activeFields }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { addMeasurement } = useProgressStore();

  const [values, setValues] = useState<Partial<Record<MeasurementField, string>>>({});
  const [dateStr, setDateStr] = useState(todayStr());
  const [saving, setSaving] = useState(false);

  const isImperial = units === 'imperial';
  const lengthUnit = isImperial ? 'in' : 'cm';

  function unitFor(field: MeasurementField) {
    return field === 'bodyFatPct' ? '%' : lengthUnit;
  }

  function setValue(field: MeasurementField, val: string) {
    setValues((prev) => ({ ...prev, [field]: val }));
  }

  async function handleSave() {
    const data: Record<string, number | string> = { date: dateStr };
    let hasAny = false;

    for (const field of activeFields) {
      const raw = values[field];
      if (!raw) continue;
      const num = parseFloat(raw.replace(',', '.'));
      if (isNaN(num) || num < 0) continue;

      if (field === 'bodyFatPct') {
        data[field] = Math.min(num, 100);
      } else {
        data[field] = isImperial ? inToCm(num) : num;
      }
      hasAny = true;
    }

    if (!hasAny) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await addMeasurement(data as any);
      await hapticsLight();
      setValues({});
      setDateStr(todayStr());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setValues({});
    setDateStr(todayStr());
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {t('tabs.progress.measurements.addEntry')}
          </ThemedText>

          {/* Date selector */}
          <View style={styles.dateRow}>
            <TouchableOpacity
              onPress={() => setDateStr(shiftDate(dateStr, -1))}
              style={[styles.dateArrowBtn, { backgroundColor: theme.background }]}
            >
              <ThemedText style={styles.arrow}>‹</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.dateLabel}>
              {formatDateLabel(dateStr, t, i18n.language)}
            </ThemedText>
            <TouchableOpacity
              onPress={() => {
                const next = shiftDate(dateStr, 1);
                if (next <= todayStr()) setDateStr(next);
              }}
              style={[styles.dateArrowBtn, { backgroundColor: theme.background }]}
            >
              <ThemedText style={styles.arrow}>›</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.fieldList}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.grid}>
              {activeFields.map((field) => (
                <View
                  key={field}
                  style={[
                    styles.fieldCard,
                    { backgroundColor: theme.background, borderColor: theme.accent + '30' },
                  ]}
                >
                  <ThemedText themeColor="textSecondary" style={styles.fieldLabel}>
                    {t(`tabs.progress.measurements.fields.${field}`)}
                  </ThemedText>
                  <View style={styles.fieldInputRow}>
                    <TextInput
                      style={[styles.fieldInput, { color: theme.text }]}
                      value={values[field] ?? ''}
                      onChangeText={(v) => setValue(field, v)}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <ThemedText themeColor="textSecondary" style={styles.fieldUnit}>
                      {unitFor(field)}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={handleClose}
              style={[styles.btn, { borderWidth: 1, borderColor: theme.textSecondary + '50' }]}
            >
              <ThemedText themeColor="textSecondary">{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.btn, { backgroundColor: theme.accent }]}
            >
              <ThemedText style={{ color: theme.textOnAccent, fontWeight: '600' }}>
                {saving ? t('common.loading') : t('common.save')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.four,
    paddingBottom: Spacing.five + 8,
    maxHeight: '85%',
  },
  title: { fontSize: 18, marginBottom: Spacing.two, textAlign: 'center' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.three,
  },
  dateArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontSize: 22, lineHeight: 26 },
  dateLabel: { fontSize: 15, fontWeight: '500', minWidth: 130, textAlign: 'center' },
  fieldList: { maxHeight: 320, marginBottom: Spacing.three },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  fieldCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
  },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  fieldInputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 2 },
  fieldUnit: { fontSize: 13, marginLeft: 4 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
