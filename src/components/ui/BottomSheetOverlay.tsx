import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAndroidBack } from '@/hooks/use-android-back';
import { useSheetStore } from '@/store/sheet.store';

// Piloto de #40 (parte 2): mismo mecanismo de animación que
// VulcanBottomSheet.tsx (translateY + backdropOp, Animated con
// useNativeDriver) pero SIN <Modal> — montado sin condicional en
// _layout.tsx, mismo patrón que AchievementCelebrationOverlay (store-driven,
// `if (!request) return null` cuando no hay ninguna solicitud activa). El
// <Modal transparent> de VulcanBottomSheet tarda 1-2.5s en crear/destruir la
// ventana del sistema en Android en cada apertura (SHEET_LAG_AUDIT.md); al
// vivir siempre montado, esa ventana ya existe y el primer toque responde
// de inmediato.
export function BottomSheetOverlay() {
  const request = useSheetStore(s => s.request);
  const close = useSheetStore(s => s.close);
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
    ]).start(() => close());
  }, [SH, backdropOp, close, translateY]);

  useAndroidBack(!!request, dismiss);

  useEffect(() => {
    if (request) {
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
  }, [SH, backdropOp, translateY, request]);

  if (!request) return null;

  const handleSelect = (value: string | number) => {
    request.onSelect(value);
    dismiss();
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
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

        {request.title ? (
          <ThemedText style={[styles.sheetTitle, { color: colors.textSecondary }]}>
            {request.title}
          </ThemedText>
        ) : null}

        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: SH * 0.55 }}>
          {request.options.map((opt) => {
            const active = opt.value === request.selectedValue;
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
            {request.cancelLabel ?? 'Cancelar'}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </View>
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
