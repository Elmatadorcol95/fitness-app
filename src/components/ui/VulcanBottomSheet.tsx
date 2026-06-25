import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SheetOption<T extends string | number> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: T) => void;
  options: SheetOption<T>[];
  selectedValue?: T;
  title?: string;
  cancelLabel?: string;
}

export function VulcanBottomSheet<T extends string | number>({
  visible,
  onClose,
  onSelect,
  options,
  selectedValue,
  title,
  cancelLabel = 'Cancelar',
}: Props<T>) {
  const { height: SH } = useWindowDimensions();
  const colors = useTheme();

  const translateY = useRef(new Animated.Value(SH)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SH,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [SH, backdropOp, onClose, translateY]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SH);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          stiffness: 220,
          damping: 22,
          mass: 1,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [SH, backdropOp, translateY, visible]);

  function handleSelect(value: T) {
    onSelect(value);
    dismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOp }]} />
      </Pressable>

      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.backgroundElement },
          { transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
        </View>

        {title ? (
          <ThemedText style={[styles.sheetTitle, { color: colors.textSecondary }]}>
            {title}
          </ThemedText>
        ) : null}

        <ScrollView bounces={false} style={{ maxHeight: SH * 0.55 }}>
          {options.map((opt) => {
            const active = opt.value === selectedValue;
            return (
              <Pressable
                key={String(opt.value)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.background },
                  pressed && { backgroundColor: colors.backgroundSelected },
                ]}
                onPress={() => handleSelect(opt.value)}
              >
                <ThemedText
                  style={[
                    styles.rowLabel,
                    active && { color: colors.accent, fontWeight: '600' },
                  ]}
                >
                  {opt.label}
                </ThemedText>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.cancelBtn,
            { backgroundColor: colors.background },
            pressed && { opacity: 0.7 },
          ]}
          onPress={dismiss}
        >
          <ThemedText style={[styles.cancelLabel, { color: colors.textSecondary }]}>
            {cancelLabel}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 28,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 16,
  },
  cancelBtn: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
});
