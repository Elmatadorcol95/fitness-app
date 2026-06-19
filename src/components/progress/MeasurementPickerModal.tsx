import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { ALL_MEASUREMENT_FIELDS, type MeasurementField } from '@/store/progress.store';

interface Props {
  visible: boolean;
  current: MeasurementField[];
  onSave: (fields: MeasurementField[]) => void;
  onClose: () => void;
}

export function MeasurementPickerModal({ visible, current, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [selected, setSelected] = useState<Set<MeasurementField>>(new Set(current));

  function toggle(field: MeasurementField) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }

  function handleSave() {
    const ordered = ALL_MEASUREMENT_FIELDS.filter((f) => selected.has(f));
    onSave(ordered);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            {t('tabs.progress.measurements.pickerTitle')}
          </ThemedText>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {ALL_MEASUREMENT_FIELDS.map((field) => {
              const isSelected = selected.has(field);
              return (
                <TouchableOpacity
                  key={field}
                  onPress={() => toggle(field)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isSelected
                        ? theme.accent + '20'
                        : theme.background,
                      borderColor: isSelected ? theme.accent : theme.textSecondary + '30',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? theme.accent : 'transparent',
                        borderColor: isSelected ? theme.accent : theme.textSecondary,
                      },
                    ]}
                  >
                    {isSelected && (
                      <ThemedText style={{ color: theme.textOnAccent, fontSize: 12, lineHeight: 18 }}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={styles.fieldName}>
                    {t(`tabs.progress.measurements.fields.${field}`)}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.btn, { borderWidth: 1, borderColor: theme.textSecondary + '50' }]}
            >
              <ThemedText themeColor="textSecondary">{t('common.cancel')}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.btn, { backgroundColor: theme.accent }]}
            >
              <ThemedText style={{ color: theme.textOnAccent, fontWeight: '600' }}>
                {t('common.save')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '80%',
  },
  title: { fontSize: 18, marginBottom: Spacing.three, textAlign: 'center' },
  list: { marginBottom: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldName: { fontSize: 15 },
  buttons: { flexDirection: 'row', gap: Spacing.two },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
