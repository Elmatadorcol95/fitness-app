import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EXERCISES, getExerciseName, type Exercise } from '@/lib/exercises';
import { muscleLabel, equipmentLabel } from '@/components/workout/ExerciseCard';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

const GREEN = '#3FBF7F';
const MUTED = '#9DA89F';
const AMBER = '#F2B450';

const CATEGORY_COLORS: Record<string, string> = {
  push: GREEN, pull: AMBER, legs: '#5BD897', core: GREEN, cardio: AMBER, full_body: GREEN,
};

function getAlternatives(currentId: string, equipment: string[], isGym: boolean): Exercise[] {
  const current = EXERCISES.find(e => e.id === currentId);
  if (!current) return [];

  return EXERCISES.filter(ex => {
    if (ex.id === currentId) return false;
    if (ex.category !== current.category) return false;

    // Para gimnasio: todos los ejercicios del mismo grupo son válidos
    // Para casa: solo los que el usuario puede hacer con su equipo
    const canDo = isGym
      ? true
      : ex.equipment.length === 0 || ex.equipment.every(eq => equipment.includes(eq));
    if (!canDo) return false;

    return ex.primaryMuscles.some(m => current.primaryMuscles.includes(m));
  }).sort((a, b) => {
    // Ordenar: mismos músculos primarios primero
    const aOverlap = a.primaryMuscles.filter(m => current.primaryMuscles.includes(m)).length;
    const bOverlap = b.primaryMuscles.filter(m => current.primaryMuscles.includes(m)).length;
    return bOverlap - aOverlap;
  });
}

interface Props {
  visible: boolean;
  currentExerciseId: string;
  userEquipment: string[];
  isGym: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
  lang?: string;
  changeExTitle: string;
  noAlternativesText: string;
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
}: Props) {
  const theme = useTheme();
  const normalizedLang = (lang.startsWith('fr') ? 'fr' : lang.startsWith('es') ? 'es' : 'en') as 'es' | 'en' | 'fr';
  const alternatives = getAlternatives(currentExerciseId, userEquipment, isGym);

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
  empty:        {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  emptyText:    { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
