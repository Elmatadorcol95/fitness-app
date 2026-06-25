import { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  confirmLabel: string;
  onConfirm: () => void;
  cancelLabel?: string;
  destructive?: boolean;
  hideCancel?: boolean;
}

export function VulcanDialog({
  visible,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  cancelLabel = 'Cancelar',
  destructive = false,
  hideCancel = false,
}: Props) {
  const colors = useTheme();

  const scale      = useRef(new Animated.Value(0.88)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [backdropOp, onClose, scale]);

  useEffect(() => {
    if (visible) {
      scale.setValue(0.88);
      backdropOp.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          stiffness: 280,
          damping: 18,
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
  }, [backdropOp, scale, visible]);

  function handleConfirm() {
    onConfirm();
    dismiss();
  }

  const confirmBg   = destructive ? colors.amber : colors.accent;
  const confirmText = colors.textOnAccent;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOp }]} />
      </Pressable>

      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.backgroundElement },
            { opacity: backdropOp, transform: [{ scale }] },
          ]}
        >
          <ThemedText style={styles.cardTitle}>{title}</ThemedText>

          {message ? (
            <ThemedText style={[styles.cardMsg, { color: colors.textSecondary }]}>
              {message}
            </ThemedText>
          ) : null}

          <View style={styles.btnRow}>
            {!hideCancel && (
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  { backgroundColor: colors.background },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={dismiss}
              >
                <ThemedText style={[styles.btnLabel, { color: colors.textSecondary }]}>
                  {cancelLabel}
                </ThemedText>
              </Pressable>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: confirmBg },
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleConfirm}
            >
              <ThemedText style={[styles.btnLabel, { color: confirmText, fontWeight: '700' }]}>
                {confirmLabel}
              </ThemedText>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: '#000',
  },
  centerer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  cardMsg: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnLabel: {
    fontSize: 15,
  },
});
