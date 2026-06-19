import { useState } from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { type ProgressPhoto } from '@/store/progress.store';

interface Props {
  visible: boolean;
  photos: ProgressPhoto[]; // sorted desc by date — photos[0] is newest
  onClose: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const IMAGE_HEIGHT = SCREEN_WIDTH * 1.25;

export function BeforeAfterSlider({ visible, photos, onClose }: Props) {
  const { t } = useTranslation();

  // oldest = before, newest = after
  const before = photos[photos.length - 1];
  const after = photos[0];

  const sliderX = useSharedValue(SCREEN_WIDTH / 2);

  const afterClipStyle = useAnimatedStyle(() => ({
    width: Math.max(0, Math.min(sliderX.value, SCREEN_WIDTH)),
  }));

  const dividerStyle = useAnimatedStyle(() => ({
    left: Math.max(0, Math.min(sliderX.value, SCREEN_WIDTH)) - 1,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    left: Math.max(0, Math.min(sliderX.value, SCREEN_WIDTH)) - 24,
  }));

  // e.x is relative to the GestureDetector view = full container
  const panGesture = Gesture.Pan().onUpdate((e) => {
    sliderX.value = Math.max(0, Math.min(e.x, SCREEN_WIDTH));
  });

  const [beforeErr, setBeforeErr] = useState(false);
  const [afterErr, setAfterErr] = useState(false);

  if (!before || !after || before.id === after.id) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>{t('tabs.progress.photos.compare')}</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <ThemedText style={styles.closeText}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Gesture wraps the full image container */}
        <GestureDetector gesture={panGesture}>
          <View style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}>
            {/* Before image — underneath */}
            {!beforeErr ? (
              <Image
                source={{ uri: before.localUri }}
                style={[styles.imageAbs, { width: SCREEN_WIDTH, height: IMAGE_HEIGHT }]}
                contentFit="cover"
                onError={() => setBeforeErr(true)}
              />
            ) : (
              <View style={[styles.imageAbs, styles.placeholder, { width: SCREEN_WIDTH, height: IMAGE_HEIGHT }]}>
                <ThemedText style={styles.placeholderText}>Sin imagen</ThemedText>
              </View>
            )}

            {/* After image — clipped on top */}
            <Animated.View style={[styles.imageAbs, { height: IMAGE_HEIGHT, overflow: 'hidden' }, afterClipStyle]}>
              {!afterErr ? (
                <Image
                  source={{ uri: after.localUri }}
                  style={{ width: SCREEN_WIDTH, height: IMAGE_HEIGHT }}
                  contentFit="cover"
                  onError={() => setAfterErr(true)}
                />
              ) : (
                <View style={[styles.placeholder, { width: SCREEN_WIDTH, height: IMAGE_HEIGHT }]}>
                  <ThemedText style={styles.placeholderText}>Sin imagen</ThemedText>
                </View>
              )}
            </Animated.View>

            {/* Divider */}
            <Animated.View style={[styles.divider, { height: IMAGE_HEIGHT }, dividerStyle]} />

            {/* Drag handle */}
            <Animated.View style={[styles.handle, handleStyle]}>
              <ThemedText style={styles.handleArrows}>{'‹›'}</ThemedText>
            </Animated.View>

            {/* Labels */}
            <View style={styles.labelLeft} pointerEvents="none">
              <ThemedText style={styles.labelTitle}>{t('tabs.progress.photos.before')}</ThemedText>
              <ThemedText style={styles.labelDate}>{before.date}</ThemedText>
            </View>
            <View style={styles.labelRight} pointerEvents="none">
              <ThemedText style={styles.labelTitle}>{t('tabs.progress.photos.after')}</ThemedText>
              <ThemedText style={styles.labelDate}>{after.date}</ThemedText>
            </View>
          </View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.four,
    width: '100%',
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#fff' },
  closeBtn: { position: 'absolute', right: Spacing.four, top: 56 },
  closeText: { fontSize: 20, color: '#fff' },
  imageAbs: { position: 'absolute', top: 0, left: 0 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' },
  placeholderText: { color: '#aaa' },
  divider: { position: 'absolute', top: 0, width: 2, backgroundColor: '#fff' },
  handle: {
    position: 'absolute',
    top: IMAGE_HEIGHT / 2 - 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  handleArrows: { fontSize: 18, color: '#000', letterSpacing: -4 },
  labelLeft: {
    position: 'absolute',
    bottom: Spacing.three,
    left: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: Spacing.two,
    borderRadius: 8,
  },
  labelRight: {
    position: 'absolute',
    bottom: Spacing.three,
    right: Spacing.three,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: Spacing.two,
    borderRadius: 8,
  },
  labelTitle: { color: '#fff', fontSize: 12, fontWeight: '700' },
  labelDate: { color: '#ccc', fontSize: 11, marginTop: 1 },
});
