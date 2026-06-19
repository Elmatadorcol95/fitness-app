import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useProfileStore } from '@/store/profile.store';
import { useTheme } from '@/hooks/use-theme';
import { cmToFtIn, kgToLb, lbToKg } from '@/lib/units';

const GREEN    = '#3FBF7F';
const AMBER    = '#F2B450';
const GREEN_BG = 'rgba(63,191,127,0.12)';

// ── Rangos y pasos ───────────────────────────────────────────────────────────
const H_MIN = 100; const H_MAX = 250;
const W_MIN = 30;  const W_MAX = 300;
const H_STEP_CM = 1;
const H_STEP_IN = 2.54;  // 1 pulgada
const W_STEP_KG = 0.5;
const W_STEP_LB = 0.4536; // 1 libra

const YEAR_MIN    = 1930;
const YEAR_MAX    = new Date().getFullYear() - 10;
const DEF_YEAR    = 1990;
const DEF_MONTH   = 1;
const DEF_DAY     = 1;
const DEF_HEIGHT  = 170;
const DEF_WEIGHT  = 70;

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysInMonth(year: number, month: number): number {
  // month is 1-indexed; new Date(year, month, 0) gives last day of that month
  return new Date(year, month, 0).getDate();
}

// Short month names using the device locale derived from i18n language
function monthNames(lang: string): string[] {
  const locale = lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'es';
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, i, 1))
  );
}

function calcAge(year: number, month: number, day: number): number {
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day)) {
    age--;
  }
  return Math.max(0, age);
}

function fmtHeight(cm: number, imperial: boolean): string {
  if (imperial) {
    const { ft, inches } = cmToFtIn(cm);
    return `${ft}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

function fmtWeight(kg: number, imperial: boolean): string {
  if (imperial) return `${Math.round(kgToLb(kg))} lb`;
  const rounded = Math.round(kg * 2) / 2;
  return rounded % 1 === 0 ? `${rounded} kg` : `${rounded.toFixed(1)} kg`;
}

// Valor numérico simple para el TextInput de edición
function editableHeight(cm: number, imperial: boolean): string {
  return imperial ? String(Math.round(cm / 2.54)) : String(Math.round(cm));
}

function editableWeight(kg: number, imperial: boolean): string {
  if (imperial) return String(Math.round(kgToLb(kg)));
  const rounded = Math.round(kg * 2) / 2;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

// ── Stepper con centro editable ───────────────────────────────────────────────
interface EditableStepperProps {
  displayValue: string; // valor formateado (ej. "5'10\"" o "175 cm")
  editValue:    string; // valor numérico para editar (ej. "70" o "175")
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
  onCommit: (text: string) => void;
}

function EditableStepper({ displayValue, editValue, onDec, onInc, canDec, canInc, onCommit }: EditableStepperProps) {
  const theme  = useTheme();
  const [focused,  setFocused]  = useState(false);
  const [rawText,  setRawText]  = useState('');

  const handleFocus = () => {
    setRawText(editValue);
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
    onCommit(rawText);
  };

  return (
    <View style={stepperStyles.row}>
      <Pressable
        style={[stepperStyles.btn, { backgroundColor: theme.backgroundElement }, !canDec && stepperStyles.dimmed]}
        onPress={onDec}
        disabled={!canDec}
      >
        <ThemedText style={stepperStyles.symbol}>−</ThemedText>
      </Pressable>

      <TextInput
        style={[
          stepperStyles.center,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: focused ? GREEN : 'transparent',
            fontFamily: undefined,
          },
        ]}
        value={focused ? rawText : displayValue}
        onChangeText={setRawText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        textAlign="center"
        returnKeyType="done"
        onSubmitEditing={handleBlur}
        selectTextOnFocus
      />

      <Pressable
        style={[stepperStyles.btn, { backgroundColor: theme.backgroundElement }, !canInc && stepperStyles.dimmed]}
        onPress={onInc}
        disabled={!canInc}
      >
        <ThemedText style={stepperStyles.symbol}>+</ThemedText>
      </Pressable>
    </View>
  );
}

// ── Etiqueta de campo con ícono ───────────────────────────────────────────────
function FieldLabel({ iconName, label }: { iconName: string; label: string }) {
  return (
    <View style={styles.labelRow}>
      <Ionicons name={iconName as any} size={15} color={AMBER} />
      <ThemedText themeColor="textSecondary" style={styles.labelText}>{label}</ThemedText>
    </View>
  );
}

// ── Géneros ────────────────────────────────────────────────────────────────────
const GENDERS = [
  { key: 'male',   iconName: 'male-outline',   lk: 'onboarding.physical.male' },
  { key: 'female', iconName: 'female-outline', lk: 'onboarding.physical.female' },
  { key: 'other',  iconName: 'people-outline', lk: 'onboarding.physical.other' },
] as const;

// ── Componente principal ───────────────────────────────────────────────────────
export function StepPhysical() {
  const { t, i18n } = useTranslation();
  const scheme  = useColorScheme() ?? 'dark';
  const colors  = Colors[scheme === 'unspecified' ? 'dark' : scheme];
  const theme   = useTheme();
  const { draft, updateDraft } = useProfileStore();
  const imperial = draft.units === 'imperial';

  // ── Estado local: selector de fecha ──────────────────────────────────────
  const initDate = (() => {
    if (draft.birthDate) {
      const [y, m, d] = draft.birthDate.split('-').map(Number);
      return { year: y, month: m, day: d };
    }
    return { year: DEF_YEAR, month: DEF_MONTH, day: DEF_DAY };
  })();

  const [selYear,  setSelYear]  = useState(initDate.year);
  const [selMonth, setSelMonth] = useState(initDate.month);
  const [selDay,   setSelDay]   = useState(initDate.day);

  const maxDay = daysInMonth(selYear, selMonth);
  const MONTHS = monthNames(i18n.language);
  const YEARS  = Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MAX - i);

  const saveDateToDraft = (y: number, m: number, d: number) => {
    const clampedDay = Math.min(d, daysInMonth(y, m));
    const mm = String(m).padStart(2, '0');
    const dd = String(clampedDay).padStart(2, '0');
    updateDraft({ birthDate: `${y}-${mm}-${dd}` });
  };

  const handleYearChange = (y: number) => {
    const clampedDay = Math.min(selDay, daysInMonth(y, selMonth));
    setSelYear(y);
    setSelDay(clampedDay);
    saveDateToDraft(y, selMonth, clampedDay);
  };

  const handleMonthChange = (m: number) => {
    const clampedDay = Math.min(selDay, daysInMonth(selYear, m));
    setSelMonth(m);
    setSelDay(clampedDay);
    saveDateToDraft(selYear, m, clampedDay);
  };

  const handleDayChange = (d: number) => {
    setSelDay(d);
    saveDateToDraft(selYear, selMonth, d);
  };

  const age = draft.birthDate
    ? calcAge(selYear, selMonth, selDay)
    : null;

  // ── Altura ────────────────────────────────────────────────────────────────
  const heightCm = draft.heightCm ?? DEF_HEIGHT;
  const hStep    = imperial ? H_STEP_IN : H_STEP_CM;

  const decHeight = () =>
    updateDraft({ heightCm: Math.max(H_MIN, +(heightCm - hStep).toFixed(1)) });
  const incHeight = () =>
    updateDraft({ heightCm: Math.min(H_MAX, +(heightCm + hStep).toFixed(1)) });

  const commitHeight = (text: string) => {
    const n = parseFloat(text);
    if (isNaN(n)) return;
    const cm = imperial ? +(n * 2.54).toFixed(1) : n;
    updateDraft({ heightCm: Math.min(H_MAX, Math.max(H_MIN, cm)) });
  };

  // ── Peso ──────────────────────────────────────────────────────────────────
  const weightKg = draft.weightKg ?? DEF_WEIGHT;
  const wStep    = imperial ? W_STEP_LB : W_STEP_KG;

  const decWeight = () =>
    updateDraft({ weightKg: Math.max(W_MIN, +(weightKg - wStep).toFixed(2)) });
  const incWeight = () =>
    updateDraft({ weightKg: Math.min(W_MAX, +(weightKg + wStep).toFixed(2)) });

  const commitWeight = (text: string) => {
    const n = parseFloat(text);
    if (isNaN(n)) return;
    const kg = imperial ? lbToKg(n) : n;
    updateDraft({ weightKg: Math.min(W_MAX, Math.max(W_MIN, +kg.toFixed(2))) });
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.container}
    >
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.physical.title')}
      </ThemedText>

      {/* ── Toggle de unidades ── */}
      <View style={styles.unitsRow}>
        {(['metric', 'imperial'] as const).map((u) => {
          const active = draft.units === u;
          return (
            <Pressable
              key={u}
              style={[styles.unitChip, active && styles.unitChipActive]}
              onPress={() => updateDraft({ units: u })}
            >
              <ThemedText style={[styles.unitChipText, active && styles.unitChipTextActive]}>
                {u === 'metric' ? 'kg · cm' : 'lb · ft'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Fecha de nacimiento ── */}
      <View style={styles.field}>
        <View style={styles.labelRowSpaced}>
          <FieldLabel iconName="calendar-outline" label={t('onboarding.physical.birthDate')} />
          {age !== null && (
            <ThemedText themeColor="textSecondary" style={styles.ageHint}>
              {t('onboarding.physical.ageHint', { age })}
            </ThemedText>
          )}
        </View>

        <View style={styles.dateRow}>
          {/* Día */}
          <ThemedView type="backgroundElement" style={[styles.datePicker, { flex: 1 }]}>
            <Picker
              selectedValue={selDay}
              onValueChange={handleDayChange}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.textSecondary}
              itemStyle={{ color: colors.text, fontSize: 15 }}
            >
              {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                <Picker.Item key={d} label={String(d)} value={d} color={colors.text} />
              ))}
            </Picker>
          </ThemedView>

          {/* Mes */}
          <ThemedView type="backgroundElement" style={[styles.datePicker, { flex: 1.2 }]}>
            <Picker
              selectedValue={selMonth}
              onValueChange={handleMonthChange}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.textSecondary}
              itemStyle={{ color: colors.text, fontSize: 15 }}
            >
              {MONTHS.map((name, i) => (
                <Picker.Item key={i} label={name} value={i + 1} color={colors.text} />
              ))}
            </Picker>
          </ThemedView>

          {/* Año */}
          <ThemedView type="backgroundElement" style={[styles.datePicker, { flex: 1.1 }]}>
            <Picker
              selectedValue={selYear}
              onValueChange={handleYearChange}
              style={[styles.picker, { color: colors.text }]}
              dropdownIconColor={colors.textSecondary}
              itemStyle={{ color: colors.text, fontSize: 15 }}
            >
              {YEARS.map((y) => (
                <Picker.Item key={y} label={String(y)} value={y} color={colors.text} />
              ))}
            </Picker>
          </ThemedView>
        </View>
      </View>

      {/* ── Género ── */}
      <View style={styles.field}>
        <FieldLabel iconName="people-outline" label={t('onboarding.physical.gender')} />
        <View style={styles.genderRow}>
          {GENDERS.map(({ key, iconName, lk }) => {
            const active = draft.gender === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.genderChip,
                  { backgroundColor: active ? GREEN_BG : theme.backgroundElement },
                  active && styles.genderChipActive,
                ]}
                onPress={() => updateDraft({ gender: key })}
              >
                <Ionicons name={iconName as any} size={16} color={active ? GREEN : theme.textSecondary} />
                <ThemedText
                  style={[styles.genderText, { color: active ? GREEN : theme.textSecondary }]}
                  type={active ? 'defaultSemiBold' : 'default'}
                >
                  {t(lk)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Altura ── */}
      <View style={styles.field}>
        <FieldLabel iconName="resize-outline" label={t('onboarding.physical.height')} />
        <EditableStepper
          displayValue={fmtHeight(heightCm, imperial)}
          editValue={editableHeight(heightCm, imperial)}
          onDec={decHeight}
          onInc={incHeight}
          canDec={heightCm > H_MIN}
          canInc={heightCm < H_MAX}
          onCommit={commitHeight}
        />
      </View>

      {/* ── Peso ── */}
      <View style={styles.field}>
        <FieldLabel iconName="barbell-outline" label={t('onboarding.physical.weight')} />
        <EditableStepper
          displayValue={fmtWeight(weightKg, imperial)}
          editValue={editableWeight(weightKg, imperial)}
          onDec={decWeight}
          onInc={incWeight}
          canDec={weightKg > W_MIN}
          canInc={weightKg < W_MAX}
          onCommit={commitWeight}
        />
      </View>
    </ScrollView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { gap: Spacing.three, paddingBottom: Spacing.two },
  title: { textAlign: 'center', marginBottom: Spacing.one },
  unitsRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 2,
  },
  unitChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  unitChipActive: { backgroundColor: GREEN },
  unitChipText: { fontSize: 13, color: '#9DA89F' },
  unitChipTextActive: { color: '#04261A', fontWeight: '600' },
  field: { gap: Spacing.one + 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  labelRowSpaced: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  labelText: { fontSize: 13 },
  ageHint: { fontSize: 13 },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.one + 2,
  },
  datePicker: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
    ...Platform.select({
      ios: { height: 120 },
    }),
  },
  picker: {
    width: '100%',
    ...Platform.select({
      ios: { height: 120 },
    }),
  },
  genderRow: { flexDirection: 'row', gap: Spacing.two },
  genderChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
  },
  genderChipActive: {
    borderWidth: 1,
    borderColor: GREEN,
  },
  genderText: { fontSize: 13 },
});

const stepperStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'stretch' },
  btn: {
    width: 50,
    height: 50,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    height: 50,
    borderRadius: Spacing.two,
    borderWidth: 1.5,
    fontSize: 17,
    fontWeight: '600',
  },
  symbol: { fontSize: 24, lineHeight: 28 },
  dimmed: { opacity: 0.3 },
});
