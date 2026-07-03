# Auditoría: viabilidad de un aviso "sin equipamiento de tirón" (pull/lats/bíceps)

**Solo diagnóstico — ningún archivo fue modificado.**

Contexto: `E3_HOME_FILTER_AUDIT.md` (sección 5) ya confirmó que un usuario `location='home'`
con equipamiento insuficiente puede recibir días `pull`/`upper` con 0 ejercicios
compuestos y sin trabajo directo de bíceps/dorsal ancho, sin ningún aviso. Esta
auditoría explora DÓNDE sería viable insertar ese aviso, sin implementarlo todavía.

---

## 1. ¿El onboarding captura equipamiento, o solo `equipment.tsx` (E-1)?

**El onboarding SÍ captura equipamiento — no es exclusivo de `equipment.tsx`.**

Orden de pasos del onboarding, `OnboardingFlow.tsx:25`:

```typescript
const STEPS = [StepWelcome, StepPhysical, StepGoal, StepSchedule, StepLocation, StepInjuries, StepSummary];
```

`StepLocation` es el **paso 5 de 7** (índice 4). Dentro de ese mismo paso, si el usuario elige
`home` o `both`, se muestra la cuadrícula completa de equipamiento (`StepLocation.tsx:86-113`,
lista `HOME_EQUIPMENT` en líneas 11-32). `equipment.tsx` (Fase E-1, en Ajustes) **reutiliza esta
misma lista y lógica** para permitir editarla después de terminar el onboarding — no es una
segunda fuente de datos, ambas pantallas leen/escriben `profile.equipment` (JSON en SQLite).

### ¿Dónde sería más natural insertar el aviso?

Hay dos puntos razonables, con objetivos distintos:

- **Dentro de `StepLocation` (onboarding, paso 5)**: en el momento en que el usuario
  desmarca/nunca marca ningún ítem de la lista `pullupBar`, `trx`, `resistanceBands`
  (ver sección 2), se podría mostrar un aviso similar al `gymNote` ya existente
  (`StepLocation.tsx:78-84`, mismo patrón visual) indicando que sin ese equipamiento
  el plan tendrá menos variedad de ejercicios de espalda/bíceps. **Ventaja**: se ve
  antes de generar el plan, cuando el usuario todavía puede decidir marcar algo.
  **Limitación**: en ese punto el generador de planes (`plan-generator.ts`) aún no ha
  corrido, así que el aviso sería una heurística estática ("si no tienes X, Y o Z,
  es probable que..."), no una certeza sobre el plan real que se generará (los días
  concretos dependen también de `daysPerWeek`/`minutesPerSession`, que se capturan en
  el paso anterior, `StepSchedule`).
- **Tras el onboarding, la primera vez que se genera un plan** (o cada vez que se
  regenera, incluyendo desde `equipment.tsx`): en este punto sí se conoce el
  `GeneratedPlan` real (`generatePlan()` en `plan-generator.ts:191-221`), así que se
  puede inspeccionar cada `PlanDayData` y saber con certeza si algún día `pull`/`upper`
  quedó con 0 ejercicios compuestos (ver sección 3). **Ventaja**: exacto, sin falsos
  positivos/negativos. **Limitación**: llega después de que el usuario ya avanzó todo
  el onboarding, es un aviso reactivo en vez de preventivo.

**Conclusión de esta sección (no es una recomendación de implementación, solo el
mapeo de opciones pedido)**: el aviso PODRÍA vivir en `StepLocation` como heurística
temprana, pero el punto con datos 100% fiables es después de generar el plan
(sección 3) — idealmente ambos, uno como advertencia temprana y otro como
confirmación exacta.

---

## 2. IDs de equipamiento que habilitan ejercicios de categoría `pull` (colgarse/tirar)

### 2.1 Catálogo completo de equipamiento

`EquipmentKey` — [src/lib/exercises.ts:6-12](src/lib/exercises.ts#L6-L12):

```typescript
export type EquipmentKey =
  | 'dumbbells' | 'barbellPlates' | 'kettlebells'
  | 'resistanceBands' | 'miniGluteBands' | 'pullupBar' | 'parallettes'
  | 'rings' | 'trx' | 'adjustableBench' | 'plioBox' | 'medicineBall'
  | 'fitball' | 'abRoller' | 'jumpRope' | 'mat' | 'foamRoller'
  | 'sliders' | 'weightedVest'
  | 'cableMachine' | 'legPressMachine';
```

`HOME_EQUIPMENT` (lista mostrada al usuario en onboarding y en `equipment.tsx`) —
[src/components/onboarding/StepLocation.tsx:11-32](src/components/onboarding/StepLocation.tsx#L11-L32):

```typescript
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
];
```

(`'bodyweight'` es cosmético — no es un `EquipmentKey` real, no se usa en ningún
`Exercise.equipment[]` del catálogo; ver nota en `CLAUDE.md` FASE E-1: "su valor es
cosmético, los ejercicios PC tienen equipment:[] y siempre están disponibles".
`cableMachine` y `legPressMachine` tampoco aparecen en `HOME_EQUIPMENT` — son
implícitos de gimnasio, según la nota "PENDIENTE FASE E-4" de `CLAUDE.md`.)

### 2.2 Cuáles de estos IDs habilitan efectivamente ejercicios `category:'pull'`

Verificado cruzando cada `EquipmentKey` contra `EXERCISES.filter(e => e.category === 'pull')`
en `src/lib/exercises.ts`:

| EquipmentKey | ¿Habilita algún ejercicio `pull`? | Ejercicios que lo usan (categoría pull) |
|---|---|---|
| `pullupBar` | **Sí** | `pull_up`, `chin_up`, `inverted_row`, (+ `hanging_knee_raise`, categoría `core`) |
| `trx` | **Sí** | `trx_row` |
| `resistanceBands` | **Sí** | `face_pull_band`, `band_curl` |
| `dumbbells` | **Sí** | `db_row`, `db_deadlift`, `db_bicep_curl`, `hammer_curl` |
| `barbellPlates` | **Sí** | `barbell_row`, `barbell_deadlift`, `barbell_curl` |
| `kettlebells` | **Sí** | `kb_swing` |
| `cableMachine` (gym) | **Sí** | `lat_pulldown`, `cable_row`, `machine_row`, `cable_face_pull`, `cable_curl` |
| `rings` | **No** | Ninguno — en el catálogo actual `rings` solo se usa en `ring_dip` (categoría `push`) |
| `parallettes` | **No** | Solo `dip` (categoría `push`) |
| `miniGluteBands` | **No** | Solo `lateral_band_walk` (categoría `legs`) |

**Nota importante**: de los ítems que el usuario típicamente asociaría con "colgarse/tirar"
(barra de dominadas, TRX, bandas, anillas), **`rings` está en la lista de equipamiento
pero NO destraba ningún ejercicio de tirón en el catálogo actual** — solo fondos en
anillas (empuje). Esto es relevante si se diseña la heurística de la sección 1: no
basta con comprobar "¿tiene algo de la categoría colgarse?", hay que comprobar
específicamente `pullupBar`, `trx`, `resistanceBands`, `dumbbells`, `barbellPlates`,
`kettlebells` (o, más robusto, derivarlo dinámicamente de
`EXERCISES.filter(e => e.category==='pull' && e.isCompound)` en vez de hardcodear
una lista de IDs, para no desincronizarse si el catálogo cambia).

---

## 3. Pantalla del día de entreno — ¿hay un punto claro para detectar "0 compuestos"?

**Sí, hay un punto claro y ya usado para leer el día activo del plan.**

`src/app/training.tsx:273-278`:

```typescript
// ── Plan activo ──────────────────────────────────────────────────────────────
const activeIdx  = currentPlan.activeDayIndex % currentPlan.days.length;
const today      = currentPlan.days[activeIdx];
const otherDays  = currentPlan.days.filter((_, i) => i !== activeIdx);
const estMin     = estimateDuration(today.exercises);
const totalSets_ = countSets(today.exercises);
```

`today` es un `StoredPlanDay` (`workout.store.ts:12-17`) con `dayType: DayType` y
`exercises: PlannedExercise[]`, y cada `PlannedExercise` ya trae `isCompound: boolean`
calculado en la generación (`plan-generator.ts:114-116`, `buildPlanned()`). Es decir,
justo después de la línea 275 se podría calcular, sin ninguna consulta adicional:

```typescript
const hasNoCompoundPull =
  (today.dayType === 'pull' || today.dayType === 'upper') &&
  !today.exercises.some(ex => ex.isCompound && /* pertenece al bloque pull del día */);
```

(el matiz entre paréntesis es que un día `'upper'` mezcla `push` + `pull` — para
distinguir qué ejercicios del día son "del bloque pull" haría falta cruzar
`ex.exerciseId` contra `EXERCISES.find(...).category === 'pull'`, ya que
`PlannedExercise` no guarda la categoría directamente, solo `isCompound`).

El bloque de renderizado inmediatamente después (líneas 300-342: cabecera del día +
`today.exercises.map(...)` con `ExerciseCard`) es el lugar natural para insertar un
banner de aviso, siguiendo el mismo patrón visual que ya existe en la pantalla de
sesión (`session.tsx`, banner de calibración — ver sección 4) o el `gymNote` del
onboarding: un `View` con icono `information-circle-outline` en ámbar, justo antes o
después de la cabecera `dayHeader` (línea 301-324) y antes de la lista de
`ExerciseCard`.

También existe el mismo patrón de datos en `OtherDayCard` (líneas 64-100, usado para
"Tu ciclo" con los demás días del plan) — cada `day: StoredPlanDay` que se le pasa
tiene la misma forma, así que la misma comprobación podría aplicarse ahí para avisar
sobre días futuros del ciclo, no solo el día activo.

**Conclusión**: sí existe un punto de datos claro (`today`/`day.exercises`, ya
disponibles con `isCompound` resuelto) tanto para el día activo como para los demás
días del ciclo, sin necesitar tocar `plan-generator.ts` ni el store.

---

## 4. Patrones i18n existentes para avisos informativos similares

Se identificaron **dos patrones distintos ya en uso**, ambos vigentes en el código actual:

### 4.1 Patrón A — claves i18n en `es.json`/`en.json`/`fr.json`

Ejemplo real, aviso de "sin equivalente en casa" (filtro E-3):

| Idioma | Archivo | Clave | Valor |
|---|---|---|---|
| es | `src/i18n/locales/es.json:407` | `workout.session.noHomeAlt` | `"Sin equivalente en casa con tu equipamiento"` |
| en | `src/i18n/locales/en.json:407` | `workout.session.noHomeAlt` | `"No home alternative for your equipment"` |
| fr | `src/i18n/locales/fr.json:407` | `workout.session.noHomeAlt` | `"Pas d'équivalent à domicile avec votre équipement"` |

Y el aviso de equipamiento completo de gimnasio (onboarding, `StepLocation.tsx:81`):

| Idioma | Clave | Valor |
|---|---|---|
| es | `onboarding.location.gymNote` | `"✓ Equipamiento completo del gimnasio disponible. ¡Perfecto!"` |
| en | `onboarding.location.gymNote` | `"✓ Full gym equipment available. Perfect!"` |
| fr | `onboarding.location.gymNote` | `"✓ Équipement complet de salle disponible. Parfait !"` |

Este patrón se usa con `t('namespace.clave')` y es el estándar para textos que
aparecen en pantallas con `useTranslation()` ya integrado (como `training.tsx`, que
ya usa `t(...)` extensamente).

### 4.2 Patrón B — texto inline por idioma, sin clave JSON

Ejemplo real, banner de calibración en la sesión en vivo — `src/app/session.tsx:411-423`:

```typescript
{/* Banner de calibración — primera vez con este ejercicio cargado */}
{currentEx?.lastWeightKg === null && isLoadedExercise && (
  <View style={styles.calibBanner}>
    <Ionicons name="information-circle-outline" size={15} color={AMBER} />
    <ThemedText style={styles.calibText}>
      {lang === 'es'
        ? 'Primera vez — indica tu peso de partida ↑ El coach ajustará las siguientes series.'
        : lang === 'fr'
        ? 'Première fois — indique ton poids de départ ↑ Le coach ajustera les séries suivantes.'
        : 'First time — enter your starting weight ↑ The coach will adjust the next sets.'}
    </ThemedText>
  </View>
)}
```

Con su estilo visual asociado (`session.tsx:865-871`):

```typescript
calibBanner: {
  flexDirection: 'row', alignItems: 'flex-start', gap: 6,
  backgroundColor: AMBER + '14', borderRadius: Spacing.two,
  borderLeftWidth: 3, borderLeftColor: AMBER,
  paddingHorizontal: Spacing.three, paddingVertical: Spacing.two,
},
calibText: { flex: 1, fontSize: 12, color: AMBER, lineHeight: 18 },
```

Este segundo patrón (texto condicional por `lang` en vez de clave JSON) es el que se
usa para avisos "dinámicos"/contextuales dentro de pantallas de entrenamiento en vivo,
mientras que el patrón A (claves JSON) es el usado para textos estáticos de UI
(botones, títulos, notas fijas).

### 4.3 Estilo visual común a ambos

En los dos casos, el aviso informativo comparte el mismo lenguaje visual:
icono `information-circle-outline` (o similar) en `AMBER` (`#F2B450`), fondo
`AMBER + '14'` (ámbar muy transparente), borde izquierdo de 3px en ámbar sólido,
texto en ámbar. Es el mismo "vocabulario" que ya usa `coachReason` (texto ámbar
cursivo bajo cada fila de serie) y `progressionReason` en `ExerciseCard`. Cualquier
aviso nuevo sobre "equipamiento insuficiente para pull/bíceps/dorsal" seguiría este
mismo lenguaje visual para mantener coherencia con el resto de la app.

Para `training.tsx` específicamente, dado que la pantalla **ya usa `useTranslation()`
y `t(...)` en todos sus textos** (a diferencia de `session.tsx`, que mezcla ambos
patrones), el patrón A (clave i18n en `es.json`/`en.json`/`fr.json`, ej. bajo un
namespace nuevo como `workout.pullEquipmentWarning` o similar) sería el más
consistente con el resto de esa pantalla — aunque el patrón B (inline por `lang`)
también es un precedente válido y ya existente en la base de código para avisos de
este tipo.

---

No se modificó ningún archivo de código para esta auditoría.
