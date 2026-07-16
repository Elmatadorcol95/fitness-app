// TEMPORAL — spike paso 3b, se reemplaza en paso 3c.
import { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MuscleDiagram, type MuscleRegionId } from '@/components/musclePriorities/MuscleDiagram';
import { MuscleDiagramPhoto } from '@/components/musclePriorities/MuscleDiagramPhoto';
import { useMuscleDiagramDebugStore } from '@/store/muscleDiagramDebugStore';

const GREEN = '#3FBF7F';
const MAX_SELECTED = 2;

export default function MuscleDiagramDebugScreen() {
  const [view, setView] = useState<'front' | 'back'>('front');
  const [usePhoto, setUsePhoto] = useState(false);
  const [selected, setSelected] = useState<MuscleRegionId[]>([]);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  function firePulse() {
    pulseAnim.setValue(1);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }

  // Toggle si ya está seleccionada; añade si hay hueco (<2); si ya hay 2 y se
  // toca una tercera región distinta, no cambia la selección — solo pulso.
  function handleRegionPress(id: MuscleRegionId) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(r => r !== id);
      if (prev.length < MAX_SELECTED) return [...prev, id];
      firePulse();
      return prev;
    });
  }

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Diagrama corporal (temporal)
          </ThemedText>

          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, view === 'front' && styles.tabActive]}
              onPress={() => setView('front')}
            >
              <ThemedText style={view === 'front' ? styles.tabTextActive : styles.tabText}>
                Frontal
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.tab, view === 'back' && styles.tabActive]}
              onPress={() => setView('back')}
            >
              <ThemedText style={view === 'back' ? styles.tabTextActive : styles.tabText}>
                Trasera
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.tab, usePhoto && styles.tabActive]}
              onPress={() => setUsePhoto((v) => !v)}
            >
              <ThemedText style={usePhoto ? styles.tabTextActive : styles.tabText}>
                Ver con foto
              </ThemedText>
            </Pressable>
          </View>

          {usePhoto ? (
            <View style={styles.diagramPhotoWrap}>
              <MuscleDiagramPhoto view={view} selected={selected} onRegionPress={handleRegionPress} />
            </View>
          ) : (
            <View style={styles.diagramWrap}>
              <MuscleDiagram view={view} selected={selected} onRegionPress={handleRegionPress} />
            </View>
          )}

          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <ThemedText type="defaultSemiBold" style={styles.counter}>
              {selected.length}/{MAX_SELECTED} seleccionados
            </ThemedText>
          </Animated.View>
          <ThemedText themeColor="textSecondary" style={styles.list}>
            {selected.length > 0 ? selected.join(', ') : '(ninguno)'}
          </ThemedText>

          <Pressable
            style={styles.closeBtn}
            onPress={() => useMuscleDiagramDebugStore.getState().close()}
          >
            <ThemedText type="defaultSemiBold" style={styles.closeBtnText}>Cerrar</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  title: { fontSize: 16 },
  tabRow: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10,
    borderWidth: 1, borderColor: GREEN + '55',
  },
  tabActive: { backgroundColor: GREEN + '22' },
  tabText: { fontSize: 13 },
  tabTextActive: { fontSize: 13, fontWeight: '700', color: GREEN },
  diagramWrap: { width: 200, height: 520 },
  diagramPhotoWrap: { height: 520 },
  counter: { fontSize: 15 },
  list: { fontSize: 13 },
  closeBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: GREEN,
  },
  closeBtnText: { color: '#04261A' },
});
