# Auditoría de solo lectura — Fase 0-B-1 (motor de priorización muscular)

Ningún archivo de código fue modificado para producir este documento.

---

## 1. Esquema de perfil — tabla y patrón de `equipment`

Definición Drizzle completa (`src/db/schema.ts:3-23`):

```ts
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  birthYear: integer('birth_year'),
  birthDate: text('birth_date'),
  gender: text('gender'),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  goalPrimary: text('goal_primary').notNull(),
  goalSecondary: text('goal_secondary'),
  daysPerWeek: integer('days_per_week').notNull(),
  minutesPerSession: integer('minutes_per_session').notNull(),
  location: text('location').notNull(),
  equipment: text('equipment').notNull().default('[]'),
  injuries: text('injuries').default(''),
  units: text('units').notNull().default('metric'),
  createdAt: integer('created_at').notNull(),
});

export type Profile = typeof profile.$inferSelect;
export type NewProfile = typeof profile.$inferInsert;
```

`equipment` es `text` (columna SQLite de texto plano), `NOT NULL`, con
`default('[]')` — se guarda como un **string JSON serializado** (un array de
`EquipmentKey`/`string`), no como columna estructurada ni tabla aparte. Este
es el patrón candidato exacto para una futura columna `musclePriorities`
(mismo tipo de columna, mismo default `'[]'`, mismo mecanismo de
serialización).

**Deserialización — `parseEquipment` (dos copias idénticas, una por archivo,
patrón ya duplicado en el proyecto en vez de compartido):**

```ts
// src/app/training.tsx:42-44
function parseEquipment(raw?: string): string[] {
  try { return JSON.parse(raw ?? '[]') as string[]; } catch { return []; }
}
```

```ts
// src/app/session.tsx:52-54
function parseEquipment(raw?: string): string[] {
  try { return JSON.parse(raw ?? '[]') as string[]; } catch { return []; }
}
```

Variante inline (IIFE, sin nombre de función) en dos sitios más:

```ts
// src/app/equipment.tsx:56-58
const initialEquipment: string[] = (() => {
  try { return JSON.parse(profile?.equipment ?? '[]') as string[]; } catch { return []; }
})();
```

```ts
// src/lib/plan-generator.ts:129-131 (dentro de generatePlan)
const equipment: string[] = (() => {
  try { return JSON.parse(profile.equipment) as string[]; } catch { return []; }
})();
```

**Serialización (escritura) — `updateEquipmentAndLocation` en
`src/store/profile.store.ts:69-78`:**

```ts
updateEquipmentAndLocation: async (location, equipment) => {
  const current = get().profile;
  if (!current) return;
  const equipmentJson = JSON.stringify(equipment);
  await db
    .update(profileTable)
    .set({ location, equipment: equipmentJson })
    .where(eq(profileTable.id, current.id));
  set({ profile: { ...current, location, equipment: equipmentJson } });
},
```

Y en `src/app/equipment.tsx:96-97`, cómo se llama y cómo se prepara el
objeto en memoria para regenerar el plan sin releer la DB:

```ts
await updateEquipmentAndLocation(location, equipment);
pendingProfile.current = { ...profile, location, equipment: JSON.stringify(equipment) };
```

---

## 2. Flujo de `bonusPriority` — el gancho para las prioridades del usuario

Interfaz completa (`src/lib/muscleTargets.ts:4-14`):

```ts
export interface MuscleTarget {
  key: string;                  // ej. 'espalda', 'biceps', 'core_estabilidad'
  muscleGroups: MuscleGroup[];  // uno o varios valores reales del catálogo que satisfacen este objetivo
  bonusPriority: number;        // 1 = recibe hueco extra primero, 2 = después
  maxSlots?: number;            // si se define, nunca recibe más de este número de huecos (ej. antebrazo=1)
  // Categoría de origen del target — de qué lista viene (PUSH_TARGETS/PULL_TARGETS/
  // LEGS_TARGETS/FULL_BODY_TARGETS). Se usa para alinear la elegibilidad por
  // category en días 'upper', donde un mismo día mezcla targets de dos listas
  // distintas y cada uno debe restringirse a su propia categoría de origen.
  sourceCategory: 'push' | 'pull' | 'legs' | 'core';
}
```

`bonusPriority` hoy es un valor **estático, hardcodeado por target** en las
listas `PUSH_TARGETS`/`PULL_TARGETS`/`LEGS_TARGETS`/`FULL_BODY_TARGETS`
(`muscleTargets.ts:16-46`) — no depende del usuario en absoluto todavía.

**Dónde se consume — `src/lib/muscleBasedSelection.ts`:**

Ordenamiento inicial por `bonusPriority` (línea 60):
```ts
const targets = [...getTargetsForDayType(dayType)].sort((a, b) => a.bonusPriority - b.bonusPriority);
```

**Pasada 1 — mínimo garantizado** (líneas 154-186), recorre `targets` ya
ordenado por `bonusPriority` y da a cada uno exactamente 1 ejercicio:
```ts
// ── Pasada 1 — mínimo garantizado, sin excepción ─────────────────────────
// Recorre TODOS los targets del día en su orden de lista (ya viene
// ordenado por bonusPriority) y le da a cada uno EXACTAMENTE 1 ejercicio,
// consumiendo del presupuesto TOTAL combinado (compounds+isolations), no
// de cada bolsa por separado: si la bolsa preferida no tiene cupo o
// candidato, se cruza a la otra bolsa mientras quede presupuesto total.
for (const t of targets) {
  if (compoundUsed + isolationUsed >= totalBudget) break;
  if (slotsLeft(t) <= 0) continue;

  let assigned = false;

  // Preferencia normal: compuesto si su bolsa tiene cupo; si no, aislamiento.
  if (!assigned && compoundUsed < counts.compounds) {
    if (await tryAssign(t, true)) { compoundUsed++; assigned = true; }
  }
  if (!assigned && isolationUsed < counts.isolations) {
    if (await tryAssign(t, false)) { isolationUsed++; assigned = true; }
  }
  // Cruce: la bolsa preferida no tenía cupo o candidato — prueba la otra
  // bolsa igualmente, ya que el presupuesto TOTAL (comprobado arriba) aún
  // tiene margen. Esto es lo que garantiza que nadie quede en cero mientras
  // exista cualquier hueco disponible, sea de la bolsa que sea.
  if (!assigned) {
    if (await tryAssign(t, true)) { compoundUsed++; assigned = true; }
  }
  if (!assigned) {
    if (await tryAssign(t, false)) { isolationUsed++; assigned = true; }
  }
  // Si sigue sin asignar, este target no tiene NINGÚN candidato elegible
  // (ni compuesto ni aislamiento) — hueco estructural (equipamiento/uso),
  // no se fuerza nada.
}
```

**Pasada 2 — bonos cíclicos, exactamente el bloque donde `bonusPriority`
decide quién recibe los huecos sobrantes** (líneas 188-224 — este es el
gancho principal para inyectar prioridades del usuario):
```ts
// ── Pasada 2 — bonos, solo con lo que sobre ──────────────────────────────
let compoundLeft  = counts.compounds  - compoundUsed;
let isolationLeft = counts.isolations - isolationUsed;

// Huecos de compuesto sobrantes: orden fijo, repitiendo la lista tantas
// vueltas como haga falta hasta agotar los huecos o que una vuelta completa
// no logre asignar nada (mismo patrón que el bucle de aislamiento de abajo).
while (compoundLeft > 0) {
  let assignedAny = false;
  for (const key of SECOND_COMPOUND_ORDER) {
    if (compoundLeft <= 0) break;
    const t = priority1.find(pt => pt.key === key);
    if (!t || slotsLeft(t) <= 0) continue;
    if (await tryAssign(t, true)) { compoundLeft--; assignedAny = true; }
  }
  if (!assignedAny) break;
}

// Lo que sobre de compuesto (por tope de target o lista agotada) se
// convierte en aislamiento, para que el bucle de abajo lo reparta entre
// el resto de targets por bonusPriority en vez de perderlo.
console.log('[muscleBasedSelection] compoundLeft antes de convertir a aislamiento:', compoundLeft);
isolationLeft += compoundLeft;
compoundLeft = 0;

// Huecos de aislamiento sobrantes: a los targets restantes por
// bonusPriority (1 antes que 2 — el orden de `targets` ya lo refleja),
// respetando maxSlots en todo momento.
while (isolationLeft > 0) {
  let assignedAny = false;
  for (const t of targets) {
    if (isolationLeft <= 0) break;
    if (slotsLeft(t) <= 0) continue;
    if (await tryAssign(t, false)) { isolationLeft--; assignedAny = true; }
  }
  if (!assignedAny) break;
}

return results;
```

Nota: `SECOND_COMPOUND_ORDER` (línea 15) es un orden **fijo** hardcodeado
(`['pecho', 'espalda', 'cuadriceps', 'isquiotibiales']`) para el bono de
compuestos — otro punto que una futura priorización de usuario tendría que
poder reordenar o puentear, no solo el `bonusPriority` numérico de cada
target.

`priority1` (línea 139): `const priority1 = targets.filter(t => t.bonusPriority === 1);` — filtra sobre el mismo array ya ordenado.

---

## 3. Valores canónicos de `MuscleGroup`

Tipo completo (`src/lib/exercises.ts:3-6`):

```ts
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'
  | 'lats' | 'traps' | 'forearms' | 'abs' | 'adductors';
```

15 valores. Estos son los candidatos crudos a priorizar; nótese que no
coinciden 1:1 con los `key` de `MuscleTarget` (ej. `espalda` combina
`['back', 'lats']`, `isquios_gluteos` combina `['hamstrings', 'glutes']`) —
habría que decidir si el usuario prioriza por `MuscleGroup` directo o por
`MuscleTarget.key` (más alineado con lo que ve el algoritmo).

---

## 4. Cómo llega el perfil al generador hoy

`generatePlan()` recibe un objeto con forma parcial de `Profile`
(`src/lib/plan-generator.ts:121-135`):

```ts
export async function generatePlan(profile: {
  goalPrimary: string;
  goalSecondary?: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  location: string;
  equipment: string;
}): Promise<GeneratedPlan> {
  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment) as string[]; } catch { return []; }
  })();
  const isGym  = profile.location === 'gym' || profile.location === 'both';
  const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
  const counts = getExerciseCounts(profile.minutesPerSession);
  const split  = getSplit(profile.daysPerWeek);
```

Y baja hasta `selectExercisesForDayByMuscle()` a través de
`selectExercisesForDay()` (`plan-generator.ts:103-119`):

```ts
async function selectExercisesForDay(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  scheme: RepScheme,
  excludeIds: Set<string>,
): Promise<PlannedExercise[]> {
  const selected = await selectExercisesForDayByMuscle(dayType, equipment, isGym, counts, excludeIds);
```

Firma real de `selectExercisesForDayByMuscle` (`muscleBasedSelection.ts:53-59`):
```ts
export async function selectExercisesForDayByMuscle(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  excludeIds: Set<string>,
): Promise<MuscleSelectedExercise[]> {
```

**Quién llama a `generatePlan()` con el perfil real** —
`src/store/workout.store.ts:108-113`:
```ts
generateAndSavePlan: async (profile: Profile) => {
  set({ isGenerating: true });
  try {
    // Genera el plan en memoria ANTES de tocar la DB. Si falla aquí, no
    // hay nada que limpiar: los planes existentes siguen intactos.
    const plan = await generatePlan(profile);
```

`profile: Profile` es el tipo inferido directamente de la tabla Drizzle
(`typeof profile.$inferSelect`) — es decir, **cualquier columna nueva que se
añada al esquema (ej. `musclePriorities`) ya viaja automáticamente dentro de
este mismo objeto** sin cambiar la firma de `generateAndSavePlan`. Lo que sí
haría falta es: (a) añadir el campo al tipo parcial que acepta
`generatePlan()` (hoy no incluye `musclePriorities` porque no existe), y (b)
pasarlo explícitamente hacia `selectExercisesForDayByMuscle()` (hoy no tiene
parámetro para ello — sería un parámetro nuevo en ambas firmas).

---

## 5. Dónde viviría la UI provisional

**Paso simple de onboarding, de selección** — `StepGoal.tsx` completo
(`src/components/onboarding/StepGoal.tsx`), selección múltiple con
distinción primario/secundario, leyendo/escribiendo el draft de Zustand:

```tsx
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProfileStore, type Goal } from '@/store/profile.store';

const GOALS: Goal[] = ['strength', 'hypertrophy', 'fat_loss'];

const GOAL_DEFS: Record<Goal, { iconName: string; color: string }> = {
  strength:    { iconName: 'barbell-outline', color: '#3FBF7F' },
  hypertrophy: { iconName: 'body-outline',    color: '#3FBF7F' },
  fat_loss:    { iconName: 'flame-outline',   color: '#F2B450' },
};

export function StepGoal() {
  const { t } = useTranslation();
  const { draft, updateDraft } = useProfileStore();

  const handleTap = (goal: Goal) => {
    const current = draft.goals;
    const isPrimary   = current[0] === goal;
    const isSecondary = current[1] === goal;

    if (isPrimary) {
      updateDraft({ goals: current[1] ? [current[1]] : [] });
    } else if (isSecondary) {
      updateDraft({ goals: [current[0]] });
    } else if (current.length === 0) {
      updateDraft({ goals: [goal] });
    } else if (current.length === 1) {
      updateDraft({ goals: [current[0], goal] });
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        {t('onboarding.goal.title')}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.instruction}>
        {t('onboarding.goal.instruction')}
      </ThemedText>

      {GOALS.map((goal) => {
        const isPrimary   = draft.goals[0] === goal;
        const isSecondary = draft.goals[1] === goal;
        const isSelected  = isPrimary || isSecondary;
        const def = GOAL_DEFS[goal];

        return (
          <ThemedView
            key={goal}
            type={isSelected ? 'backgroundSelected' : 'backgroundElement'}
            style={[styles.card, isSelected && styles.cardSelected]}
            onTouchEnd={() => handleTap(goal)}
          >
            <Ionicons name={def.iconName as any} size={30} color={def.color} />
            <View style={styles.cardText}>
              <ThemedText type="defaultSemiBold">{t(`onboarding.goal.${goal}`)}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.desc}>
                {t(`onboarding.goal.${goal}Desc`)}
              </ThemedText>
            </View>
            {isPrimary && (
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>{t('onboarding.goal.primaryBadge')}</ThemedText>
              </View>
            )}
            {isSecondary && (
              <View style={[styles.badge, styles.badgeSecondary]}>
                <ThemedText style={[styles.badgeText, styles.badgeSecondaryText]}>
                  {t('onboarding.goal.secondaryBadge')}
                </ThemedText>
              </View>
            )}
          </ThemedView>
        );
      })}
    </View>
  );
}
```

`draft`/`updateDraft` viven en `useProfileStore` (store de Zustand,
separado del `profile` ya persistido) — el patrón de onboarding acumula
cambios en `draft` y solo los escribe a SQLite al final del flujo
(`OnboardingFlow`/`StepSummary`, no mostrado aquí porque no se pidió).

**`EquipmentScreen` completo** (`src/app/equipment.tsx`) — cómo se edita el
perfil FUERA del onboarding, con estado local propio inicializado desde
`profile`, un botón "Guardar" habilitado solo si `hasChanged`, y un diálogo
posterior para ofrecer regenerar el plan:

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

const HOME_EQUIPMENT = [ /* 20 items, ver archivo original */ ] as const;

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
        {/* Cabecera con botón atrás + título */}
        {/* ScrollView: selector de ubicación (chips) + grid de equipamiento (chips toggle) */}
        {/* Footer: botón "Guardar", deshabilitado si !hasChanged */}
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
```

(Versión abreviada por espacio — el archivo real tiene 303 líneas; el bloque
`onTouchEnd`/chip-grid es idéntico en estructura al de `equipment` línea por
línea, ver `equipment.tsx:158-177` para el patrón exacto de toggle
multi-selección que una UI de prioridades musculares reutilizaría tal cual.)

Patrón clave a replicar para `musclePriorities`: `EquipmentScreen` mantiene
estado LOCAL (`useState`) inicializado desde `profile`, compara con el valor
inicial (`hasChanged`) para habilitar "Guardar", y solo persiste a SQLite +
store al confirmar — mismo patrón que serviría para editar prioridades
musculares fuera del onboarding.

---

## 6. Estado de migraciones

Última entrada de `src/db/migrations/meta/_journal.json`:

```json
{
  "idx": 9,
  "version": "6",
  "when": 1783420441053,
  "tag": "0009_muscle_exercise_usage",
  "breakpoints": true
}
```

`_journal.json` completo tiene 10 entradas (idx 0-9). El `when` de la
entrada 9 (`1783420441053`) es, además, el **máximo `when` de todas las
entradas existentes** (los idx 2-8 tienen timestamps sintéticos ~1749-1750
millones, muy por debajo; idx 0 y 1 tienen ~1780 millones, también por
debajo de 1783420441053).

**La próxima migración manual sería índice 10** (`00010_...` o `0010_...`,
siguiendo el patrón de nombre de 4 dígitos ya usado: `0000`...`0009`), y su
`when` deberá generarse con un `Date.now()` real ejecutado al crearla,
verificando explícitamente que supere `1783420441053` (el máximo actual) —
regla ya documentada en CLAUDE.md bajo "Reglas de trabajo".
