import { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EXERCISES, getAlternatives, getExerciseName, type MuscleGroup } from '@/lib/exercises';
import { getExercisesByMuscleGroup } from '@/lib/muscleBasedSelection';
import { muscleLabel, equipmentLabel } from '@/components/workout/ExerciseCard';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';
import { getAllPreferences, togglePreference, type Preference } from '@/lib/exercisePreferences';
import { useProfileStore } from '@/store/profile.store';

const GREEN = '#3FBF7F';
const MUTED = '#9DA89F';
const AMBER = '#F2B450';
const BLUE  = '#3C87F7';

const CATEGORY_COLORS: Record<string, string> = {
  push: GREEN, pull: AMBER, legs: '#5BD897', core: GREEN, cardio: AMBER, full_body: GREEN, mobility: BLUE,
};


interface Props {
  visible: boolean;
  // null = slot vacío del constructor propio (Fase E) — en ese caso hace
  // falta muscleGroup para recomendar candidatos por músculo en vez de por
  // solapamiento con un ejercicio existente.
  currentExerciseId: string | null;
  userEquipment: string[];
  isGym: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
  lang?: string;
  changeExTitle: string;
  noAlternativesText: string;
  muscleGroup?: MuscleGroup;
  onRemove?: () => void;
}

export function ChangeExerciseModal({
  visible,
  currentExerciseId,
  userEquipment,
  isGym,
  onClose,
  onSelect,
  lang = 'es',
  changeExTitle,
  noAlternativesText,
  muscleGroup,
  onRemove,
}: Props) {
  const theme = useTheme();
  const normalizedLang = (lang.startsWith('fr') ? 'fr' : lang.startsWith('es') ? 'es' : 'en') as 'es' | 'en' | 'fr';
  const alternatives = currentExerciseId === null
    ? getExercisesByMuscleGroup(muscleGroup!, userEquipment, isGym)
    : getAlternatives(currentExerciseId, userEquipment, isGym);
  const isDbReady = useProfileStore(s => s.isDbReady);

  const [preferences, setPreferences] = useState<Map<string, Preference>>(new Map());

  useEffect(() => {
    if (!visible) return;
    if (!isDbReady) return;
    getAllPreferences().then(setPreferences);
  }, [visible, isDbReady]);

  async function handleTogglePreference(exerciseId: string, preference: Preference) {
    await togglePreference(exerciseId, preference);
    setPreferences(prev => {
      const next = new Map(prev);
      if (next.get(exerciseId) === preference) {
        next.delete(exerciseId);
      } else {
        next.set(exerciseId, preference);
      }
      return next;
    });
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>{changeExTitle}</ThemedText>
          <Pressable onPress={onClose} hitSlop={16}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ThemedText themeColor="textSecondary" style={styles.prefHint}>
          <Ionicons name="thumbs-up" size={13} color={GREEN} /> tus favoritos aparecerán con más frecuencia. <Ionicons name="thumbs-down" size={13} color={AMBER} /> no volverán a aparecer en tu plan — puedes deshacerlo cuando quieras desde tu perfil.
        </ThemedText>

        {onRemove && currentExerciseId !== null && (
          <>
            <Pressable
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => { onRemove(); onClose(); }}
            >
              <View style={[styles.catDot, { backgroundColor: AMBER + '22' }]}>
                <Ionicons name="trash-outline" size={18} color={AMBER} />
              </View>
              <View style={styles.itemContent}>
                <ThemedText type="defaultSemiBold" style={styles.itemName}>
                  {normalizedLang === 'es' ? 'Quitar ejercicio' : normalizedLang === 'fr' ? "Retirer l'exercice" : 'Remove exercise'}
                </ThemedText>
              </View>
            </Pressable>
            <View style={[styles.separator, { backgroundColor: theme.background }]} />
          </>
        )}

        {alternatives.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="alert-circle-outline" size={44} color={theme.textSecondary} />
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              {noAlternativesText}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={alternatives}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.background }]} />
            )}
            renderItem={({ item }) => {
              const catColor = CATEGORY_COLORS[item.category] ?? GREEN;
              const musclesStr = item.primaryMuscles
                .slice(0, 3)
                .map(m => muscleLabel(m, normalizedLang))
                .join(' · ');
              const equipStr = item.equipment.length === 0
                ? (normalizedLang === 'es' ? 'Peso corporal' : normalizedLang === 'fr' ? 'Poids du corps' : 'Bodyweight')
                : item.equipment.map(k => equipmentLabel(k, normalizedLang)).join(', ');

              return (
                <Pressable
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                  onPress={() => onSelect(item.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: catColor + '22' }]}>
                    <Ionicons name="barbell-outline" size={18} color={catColor} />
                  </View>
                  <View style={styles.itemContent}>
                    <ThemedText type="defaultSemiBold" style={styles.itemName}>
                      {getExerciseName(item.id, normalizedLang)}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.itemMuscles}>
                      {musclesStr}
                    </ThemedText>
                    <ThemedText style={styles.itemEquip}>
                      {equipStr}
                    </ThemedText>
                  </View>
                  <View style={styles.prefRow}>
                    <Pressable onPress={() => handleTogglePreference(item.id, 'liked')} hitSlop={8} style={styles.prefBtn}>
                      <Ionicons
                        name={preferences.get(item.id) === 'liked' ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={18}
                        color={preferences.get(item.id) === 'liked' ? GREEN : MUTED}
                      />
                    </Pressable>
                    <Pressable onPress={() => handleTogglePreference(item.id, 'disliked')} hitSlop={8} style={styles.prefBtn}>
                      <Ionicons
                        name={preferences.get(item.id) === 'disliked' ? 'thumbs-down' : 'thumbs-down-outline'}
                        size={18}
                        color={preferences.get(item.id) === 'disliked' ? AMBER : MUTED}
                      />
                    </Pressable>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={GREEN} />
                </Pressable>
              );
            }}
          />
        )}
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  header:      {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 18 },
  list:        { paddingBottom: Spacing.four },
  separator:   { height: 1 },
  item:        {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  itemPressed:  { opacity: 0.6 },
  catDot:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemContent:  { flex: 1, gap: 2 },
  itemName:     { fontSize: 15 },
  itemMuscles:  { fontSize: 12 },
  itemEquip:    { fontSize: 11, color: MUTED },
  prefHint: { fontSize: 12, textAlign: 'center', paddingHorizontal: Spacing.four, paddingBottom: Spacing.two, lineHeight: 18 },
  prefRow:  { flexDirection: 'row', gap: 4 },
  prefBtn:  { padding: 4 },
  empty:        {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  emptyText:    { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
