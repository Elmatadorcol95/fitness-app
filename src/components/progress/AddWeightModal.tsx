import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { useProgressStore } from '@/store/progress.store';
import { lbToKg } from '@/lib/units';
import { hapticsLight } from '@/lib/haptics';

type Units = 'metric' | 'imperial';

interface Props {
  visible: boolean;
  onClose: () => void;
  units: Units;
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

export function AddWeightModal({ visible, onClose, units }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { addWeight } = useProgressStore();

  const [weightStr, setWeightStr] = useState('');
  const [dateStr, setDateStr] = useState(todayStr());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [weightError, setWeightError] = useState('');

  const unitLabel = units === 'metric' ? 'kg' : 'lb';

  async function handleSave() {
    const raw = parseFloat(weightStr.replace(',', '.'));
    if (!raw || raw <= 0 || isNaN(raw)) {
      setWeightError(t('tabs.progress.weight.invalidValue'));
      return;
    }
    setWeightError('');
    const kg = units === 'imperial' ? lbToKg(raw) : raw;
    setSaving(true);
    try {
      await addWeight(kg, dateStr, notes.trim());
      await hapticsLight();
      setWeightStr('');
      setNotes('');
      setDateStr(todayStr());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setWeightStr('');
    setNotes('');
    setDateStr(todayStr());
    setWeightError('');
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
            {t('tabs.progress.weight.addEntry')}
          </ThemedText>

          <ThemedText themeColor="textSecondary" style={styles.label}>
            {t('tabs.progress.weight.value')} ({unitLabel})
          </ThemedText>
          <View
            style={[
              styles.inputRow,
              { borderColor: weightError ? '#E05C5C' : theme.accent + '40', backgroundColor: theme.background },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={weightStr}
              onChangeText={(v) => { setWeightStr(v); if (weightError) setWeightError(''); }}
              keyboardType="decimal-pad"
              placeholder={units === 'metric' ? '75.0' : '165.3'}
              placeholderTextColor={theme.textSecondary}
              autoFocus
            />
            <ThemedText themeColor="textSecondary" style={styles.unitSuffix}>
              {unitLabel}
            </ThemedText>
          </View>
          {weightError ? (
            <ThemedText style={styles.errorText}>{weightError}</ThemedText>
          ) : null}

          <ThemedText themeColor="textSecondary" style={styles.label}>
            {t('tabs.progress.weight.date')}
          </ThemedText>
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

          <ThemedText themeColor="textSecondary" style={styles.label}>
            {t('tabs.progress.weight.notes')}
          </ThemedText>
          <TextInput
            style={[
              styles.notesInput,
              { color: theme.text, borderColor: theme.accent + '40', backgroundColor: theme.background },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('tabs.progress.weight.notesPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={2}
          />

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
  },
  title: { fontSize: 18, marginBottom: Spacing.three, textAlign: 'center' },
  label: { fontSize: 13, marginBottom: Spacing.one, marginTop: Spacing.two },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    height: 52,
    marginBottom: Spacing.two,
  },
  input: { flex: 1, fontSize: 22, fontWeight: '600' },
  unitSuffix: { fontSize: 16, marginLeft: Spacing.two },
  errorText: { fontSize: 12, color: '#E05C5C', marginTop: 4 },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  dateArrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { fontSize: 22, lineHeight: 26 },
  dateLabel: { fontSize: 16, fontWeight: '500', minWidth: 140, textAlign: 'center' },
  notesInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.two,
    fontSize: 15,
    minHeight: 56,
    textAlignVertical: 'top',
    marginBottom: Spacing.three,
  },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
