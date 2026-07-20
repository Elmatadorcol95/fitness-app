# Auditoría de solo lectura — Fase 0-B-1, Paso 3 (pantalla de prioridades musculares)

Ningún archivo de código fue modificado para producir este documento.

---

## 1. `EquipmentScreen` completo (`src/app/equipment.tsx`, 303 líneas)

**Cómo se monta**: NO es una ruta de Expo Router — es una bandera Zustand
tipo overlay. `equipment.tsx` en sí no contiene lógica de montaje (eso vive
en `_layout.tsx`, fuera del alcance de este archivo); dentro de este archivo
solo se ve cómo se **cierra** (`useProfileStore.getState().closeEquipment()`,
líneas 110, 214, 228-229) y cómo se **abre** desde otro punto (sección 2 de
este documento, en `profile.tsx`, vía `openEquipment()`).

```tsx
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { VulcanDialog } from '@/components/ui/VulcanDialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useProfileStore, type Location } from '@/store/profile.store';
import { useWorkoutStore } from '@/store/workout.store';
import { Spacing } from '@/constants/theme';
import { type EquipmentKey } from '@/lib/exercises';
import { getPullCoverage } from '@/lib/pullBicepCoverage';

const AMBER = '#F2B450';

const LOCATIONS: Location[] = ['home', 'gym', 'both'];

// Misma lista que StepLocation — 'bodyweight' se muestra pero no afecta al filtro
// de ejercicios (los ejercicios de peso corporal tienen equipment:[] siempre disponibles)
const HOME_EQUIPMENT = [
  'bodyweight',
  'dumbbells',
  'barbellPlates',
  'kettlebells',
  'resistanceBands',
  'miniGluteBands',
  'pullupBar',
  'parallettes',
  'rings',
  'trx',
  'adjustableBench',
  'plioBox',
  'medicineBall',
  'fitball',
  'abRoller',
  'jumpRope',
  'mat',
  'foamRoller',
  'sliders',
  'weightedVest',
] as const;

export default function EquipmentScreen() {
  const { t } = useTranslation();
  const { profile, updateEquipmentAndLocation } = useProfileStore();
  const generateAndSavePlan = useWorkoutStore((s) => s.generateAndSavePlan);

  const initialEquipment: string[] = (() => {
    try { return JSON.parse(profile?.equipment ?? '[]') as string[]; } catch { return []; }
  })();
  const initialLocation: Location = (profile?.location as Location) ?? 'gym';

  const [location, setLocation] = useState<Location>(initialLocation);
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
  const [saving, setSaving] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const pendingProfile = useRef<typeof profile>(null);

  const isGym = location === 'gym';
  const { hasBackVariety, hasBicepWork } = getPullCoverage(equipment as EquipmentKey[]);
  const pullWarningKey: string | null =
    isGym || (hasBackVariety && hasBicepWork)   ? null :
    !hasBackVariety && !hasBicepWork            ? 'onboarding.location.noBackVarietyOrBicepNote' :
    !hasBackVariety                             ? 'onboarding.location.noBackVarietyNote' :
    'onboarding.location.noBicepWorkNote';

  const handleLocationChange = (loc: Location) => {
    setLocation(loc);
    if (loc === 'gym') setEquipment([]);
  };

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
    );
  };

  const hasChanged =
    location !== initialLocation ||
    JSON.stringify([...equipment].sort()) !== JSON.stringify([...initialEquipment].sort());

  const handleSave = async () => {
    if (!profile) { useProfileStore.getState().closeEquipment(); return; }
    if (!hasChanged) { useProfileStore.getState().closeEquipment(); return; }

    setSaving(true);
    try {
      await updateEquipmentAndLocation(location, equipment);
      pendingProfile.current = { ...profile, location, equipment: JSON.stringify(equipment) };
      setRegenOpen(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* Cabecera */}
        <View style={styles.header}>
          <Pressable onPress={() => useProfileStore.getState().closeEquipment()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#9DA89F" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            {t('equipment.title')}
          </ThemedText>
          <View style={styles.backBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Selector de lugar */}
          <View style={styles.locationRow}>
            {LOCATIONS.map((loc) => (
              <ThemedView
                key={loc}
                type={location === loc ? 'backgroundSelected' : 'backgroundElement'}
                style={[styles.locationChip, location === loc && styles.chipActive]}
                onTouchEnd={() => handleLocationChange(loc)}
              >
                <ThemedText
                  type={location === loc ? 'defaultSemiBold' : 'default'}
                  style={styles.chipText}
                >
                  {t(`onboarding.location.${loc}`)}
                </ThemedText>
              </ThemedView>
            ))}
          </View>

          {/* Nota de gimnasio */}
          {isGym && (
            <ThemedView type="backgroundElement" style={styles.gymNote}>
              <ThemedText style={styles.gymNoteText}>
                {t('onboarding.location.gymNote')}
              </ThemedText>
            </ThemedView>
          )}

          {/* Lista de equipamiento para casa / ambos */}
          {!isGym && (
            <>
              <ThemedText style={styles.equipLabel}>
                {t('onboarding.location.equipment')}
              </ThemedText>
              <View style={styles.equipGrid}>
                {HOME_EQUIPMENT.map((item) => {
                  const selected = equipment.includes(item);
                  return (
                    <ThemedView
                      key={item}
                      type={selected ? 'backgroundSelected' : 'backgroundElement'}
                      style={[styles.equipChip, selected && styles.equipChipActive]}
                      onTouchEnd={() => toggleEquipment(item)}
                    >
                      <ThemedText
                        type={selected ? 'defaultSemiBold' : 'default'}
                        style={styles.equipText}
                      >
                        {t(`onboarding.location.equipmentItems.${item}`)}
                      </ThemedText>
                    </ThemedView>
                  );
                })}
              </View>

              {/* Aviso: poca variedad de espalda o sin trabajo de bíceps con el equipamiento actual */}
              {pullWarningKey && (
                <View style={styles.noPullBanner}>
                  <Ionicons name="information-circle-outline" size={15} color={AMBER} />
                  <ThemedText style={styles.noPullBannerText}>
                    {t(pullWarningKey)}
                    {location === 'both' ? ' ' + t('onboarding.location.homeDaysQualifier') : ''}
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Botón Guardar */}
        <View style={styles.footer}>
          <Pressable
            style={[styles.saveBtn, !hasChanged && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanged || saving}
          >
            {saving ? (
              <ActivityIndicator color="#04261A" />
            ) : (
              <ThemedText type="defaultSemiBold" style={styles.saveBtnText}>
                {t('common.save')}
              </ThemedText>
            )}
          </Pressable>
        </View>

      </SafeAreaView>

      <VulcanDialog
        visible={regenOpen}
        onClose={() => { setRegenOpen(false); useProfileStore.getState().closeEquipment(); }}
        title={t('equipment.regenTitle')}
        message={t('equipment.regenMsg')}
        confirmLabel={t('equipment.regenYes')}
        cancelLabel={t('equipment.regenNo')}
        onConfirm={async () => {
          setRegenOpen(false);
          if (pendingProfile.current) {
            try {
              await generateAndSavePlan(pendingProfile.current);
            } catch (err) {
              console.error('[Equipment] Error al regenerar plan:', err);
            }
          }
          useProfileStore.getState().closeEquipment();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  title: { flex: 1, textAlign: 'center', fontSize: 18 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  locationRow: { flexDirection: 'row', gap: Spacing.two },
  locationChip: {
    flex: 1,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: { borderColor: '#3FBF7F33' },
  chipText: { fontSize: 14 },
  gymNote: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginTop: Spacing.one,
  },
  gymNoteText: { textAlign: 'center', fontSize: 14 },
  equipLabel: { fontSize: 15, marginTop: Spacing.one },
  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one + 2 },
  equipChip: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  equipChipActive: { borderColor: '#3FBF7F44' },
  equipText: { fontSize: 13 },
  noPullBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: AMBER + '14', borderRadius: Spacing.two,
    borderLeftWidth: 3, borderLeftColor: AMBER,
    paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
    marginTop: Spacing.one,
  },
  noPullBannerText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  saveBtn: {
    backgroundColor: '#3FBF7F',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two + 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#04261A' },
});
```

**Resumen de los cuatro elementos pedidos, con línea exacta:**
- Estado local: `location`/`equipment` (líneas 61-62), inicializados desde
  `profile` (líneas 56-59).
- `hasChanged`: líneas 86-88 — compara `location` contra el valor inicial y
  los arrays de equipamiento ordenados y serializados (para ignorar el
  orden).
- Acción de guardar: `handleSave` (líneas 90-102) — persiste con
  `updateEquipmentAndLocation`, guarda una copia del perfil resultante en
  `pendingProfile.current` (`useRef`, no state) y abre el diálogo de
  regenerar.
- Diálogo de regenerar plan: líneas 212-230 — `VulcanDialog` con
  `onConfirm` async que llama `generateAndSavePlan(pendingProfile.current)`
  y cierra la pantalla en el `finally` implícito (tras el `try/catch`,
  siempre cierra).

---

## 2. Punto de entrada — `profile.tsx`

Bloque exacto donde el usuario abre `EquipmentScreen` hoy
(`src/app/profile.tsx:195-222`):

```tsx
          {/* ── Equipamiento ── */}
          <View style={sectionStyles.wrap}>
            <View style={styles.equipHeader}>
              <ThemedText style={sectionStyles.title}>
                {t('tabs.profile.equipmentSection')}
              </ThemedText>
              <Pressable
                onPress={() => useProfileStore.getState().openEquipment()}
                style={styles.editEquipBtn}
                hitSlop={8}
              >
                <Ionicons name="create-outline" size={15} color="#3FBF7F" />
                <ThemedText style={styles.editEquipText}>{t('equipment.editBtn')}</ThemedText>
              </Pressable>
            </View>
            <ThemedView type="backgroundElement" style={sectionStyles.card}>
              {equipment.length > 0 ? (
                <View style={styles.chips}>
                  {equipment.map((e) => (
                    <ThemedView key={e} type="backgroundSelected" style={styles.chip}>
                      <ThemedText style={styles.chipText}>
                        {t(`onboarding.location.equipmentItems.${e}`, { defaultValue: e })}
                      </ThemedText>
                    </ThemedView>
                  ))}
                </View>
              ) : (
                <ThemedText themeColor="textSecondary" style={styles.gymEquipNote}>
```

Estilos del botón (`profile.tsx:277-278`):
```ts
  editEquipBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editEquipText: { fontSize: 13, color: '#3FBF7F' },
```

Patrón exacto a clonar: una `Section` con título + `Pressable` a la derecha
(icono `create-outline` + texto verde `#3FBF7F`, tamaño 15/13px) que llama
`useProfileStore.getState().openEquipment()` — para prioridades musculares
sería el mismo patrón con una acción `openMusclePriorities()` nueva (no
existe todavía) y una sección propia debajo de "Equipamiento" o donde se
decida.

---

## 3. `react-native-svg` — versión y uso de `onPress`

Versión exacta (`package.json:44`):
```json
    "react-native-svg": "15.15.4",
```

**Archivos que importan primitivos de `react-native-svg`** (grep de
`from 'react-native-svg'` en todo `src/`) — solo 4, todos decorativos:
```
src\components\VulcanVolcano.tsx:2:import Svg, { Circle, Defs, LinearGradient, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
src\components\VulcanSplash.tsx:11:import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';
src\components\icons\VulcanGymIcons.tsx:1:import Svg, { Circle, Path, Rect } from 'react-native-svg';
src\components\icons\VulcanHammerIcon.tsx:1:import Svg, { Circle, G, Line, Polygon, Rect } from 'react-native-svg';
```

**Grep de `onPress` dentro de cada uno de esos 4 archivos — cero resultados
en los cuatro:**
```
$ grep -n onPress src/components/VulcanVolcano.tsx
(sin resultados)
$ grep -n onPress src/components/VulcanSplash.tsx
(sin resultados)
$ grep -n onPress src/components/icons/VulcanGymIcons.tsx
(sin resultados)
$ grep -n onPress src/components/icons/VulcanHammerIcon.tsx
(sin resultados)
```

Confirmado: no existe ningún uso de `onPress` sobre `Path`, `G`, `Circle` ni
ningún otro elemento de `react-native-svg` en el proyecto hoy. Los 4 usos de
la librería son 100% decorativos (splash, logo, iconos de gimnasio/martillo).
Cualquier interacción táctil sobre una silueta corporal SVG para la pantalla
de prioridades sería la primera vez que se hace en este proyecto — sin
precedente que copiar.

---

## 4. `MuscleGroup` — tipo completo

`src/lib/exercises.ts:3-6`, sin cambios respecto a antes del catálogo de 285
ejercicios (la expansión del catálogo añadió ejercicios y grupos musculares
ya cubiertos por este tipo, pero no añadió ningún valor nuevo al tipo en sí):

```ts
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'
  | 'lats' | 'traps' | 'forearms' | 'abs' | 'adductors';
```

15 valores — estos son, tal cual, los que el usuario podrá marcar para
priorizar (sujeto a la decisión pendiente, ya señalada en
`PRIORITY_ENGINE_AUDIT.md` sección 3, de si se expone `MuscleGroup` directo
o se agrupa por `MuscleTarget.key`, ej. `'espalda'` = `['back','lats']`).
