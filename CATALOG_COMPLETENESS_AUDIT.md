# Auditoría de completitud del catálogo de ejercicios

**Tipo:** Auditoría de solo lectura. Ningún archivo fue modificado.
**Fuente única:** `src/lib/exercises.ts` (81 ejercicios en `EXERCISES`, líneas 27-616).
**Fecha:** 2026-07-06.

---

## 0. Tipos base (para referencia)

```ts
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'
  | 'lats' | 'traps' | 'forearms' | 'abs';

export type EquipmentKey =
  | 'dumbbells' | 'barbellPlates' | 'kettlebells'
  | 'resistanceBands' | 'miniGluteBands' | 'pullupBar' | 'parallettes'
  | 'rings' | 'trx' | 'adjustableBench' | 'plioBox' | 'medicineBall'
  | 'fitball' | 'abRoller' | 'jumpRope' | 'mat' | 'foamRoller'
  | 'sliders' | 'weightedVest'
  | 'cableMachine' | 'legPressMachine';

export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'full_body';
```

**⚠️ Nota importante para el punto 6 del encargo:** `'cardio'` **ya existe** en el union
de `ExerciseCategory` desde hoy — no haría falta "añadirlo". Solo está muy poco usado
(ver sección 6). `'mobility'` sí sería un valor nuevo.

No existe ningún `MuscleGroup` para aductores. "Aductores" no es solo un hueco de
contenido — ni siquiera está en la taxonomía, así que no se puede ni etiquetar hoy.

---

## 1. Ejercicios agrupados por equipamiento

`EquipmentKey` tiene 21 valores posibles. A continuación cada uno con sus ejercicios
(id — nombre es) y el total. Los ejercicios con `equipment: []` (peso corporal) se
listan como grupo aparte al principio porque no usan ningún `EquipmentKey`.

### Peso corporal (`equipment: []`) — **21**
- push_up — Flexión de brazos
- pike_push_up — Flexión en pica
- close_grip_push_up — Flexión cerrada
- superman — Superman
- ytw_prone — Y-T-W en prono
- snow_angel_prone — Ángeles de nieve invertidos
- squat_bodyweight — Sentadilla libre
- lunge — Zancada
- hip_thrust_bodyweight — Hip thrust
- glute_bridge — Puente de glúteos
- calf_raise — Elevación de talones
- sumo_squat — Sentadilla sumo
- single_leg_rdl_bw — Peso muerto rumano a una pierna
- plank — Plancha
- side_plank — Plancha lateral
- crunch — Crunch abdominal
- leg_raise — Elevación de piernas
- russian_twist — Giro ruso
- dead_bug — Dead bug
- mountain_climber — Escalador
- burpee — Burpee

### `dumbbells` — **14**
- db_bench_press — Press banca con mancuernas
- db_overhead_press — Press militar con mancuernas
- db_lateral_raise — Elevación lateral
- db_fly — Aperturas con mancuernas
- db_tricep_extension — Extensión de tríceps
- db_front_raise — Elevación frontal
- db_row — Remo con mancuerna
- db_deadlift — Peso muerto con mancuernas
- db_bicep_curl — Curl de bíceps
- hammer_curl — Curl martillo
- goblet_squat — Sentadilla copa
- db_lunge — Zancada con mancuernas
- db_romanian_deadlift — Peso muerto rumano
- db_hip_thrust — Hip thrust con mancuerna *(requiere también `adjustableBench`)*

### `barbellPlates` — **8**
- barbell_bench_press — Press de banca con barra
- barbell_overhead_press — Press militar con barra
- barbell_row — Remo con barra
- barbell_deadlift — Peso muerto con barra
- barbell_curl — Curl con barra
- barbell_squat — Sentadilla con barra
- barbell_romanian_deadlift — Peso muerto rumano con barra
- incline_barbell_press — Press inclinado con barra *(requiere también `adjustableBench`)*

### `kettlebells` — **3**
- kb_swing — Swing con kettlebell
- kb_goblet_squat — Sentadilla copa con kettlebell
- kb_thruster — Thruster con kettlebell

### `resistanceBands` — **4**
- band_lateral_raise — Elevación lateral con banda
- face_pull_band — Face pull con banda
- band_curl — Curl con banda
- glute_kickback_band — Patada de glúteo con banda

### `miniGluteBands` — **1**
- lateral_band_walk — Paso lateral con banda

### `pullupBar` — **4**
- pull_up — Dominada prona
- chin_up — Dominada supina
- inverted_row — Remo invertido
- hanging_knee_raise — Rodillas al pecho en barra

### `parallettes` — **1**
- dip — Fondos en paralelas

### `rings` — **1**
- ring_dip — Fondos en anillas

### `trx` — **2**
- trx_push_up — Flexión en TRX
- trx_row — Remo en TRX

### `adjustableBench` — **3** (aparece solo o combinado)
- bulgarian_split_squat — Sentadilla búlgara *(bench SOLO, sin otro equipo)*
- db_hip_thrust — Hip thrust con mancuerna *(bench + `dumbbells`)*
- incline_barbell_press — Press inclinado con barra *(bench + `barbellPlates`)*

### `plioBox` — **2**
- step_up — Subida al cajón
- box_jump — Salto al cajón

### `medicineBall` — **1**
- med_ball_slam — Lanzamiento de balón medicinal

### `fitball` — **0** ⚠️
Ningún ejercicio del catálogo usa este equipo, aunque está en la lista de
equipamiento de casa del onboarding (`HOME_EQUIPMENT`).

### `abRoller` — **1**
- ab_roller — Rueda abdominal

### `jumpRope` — **1**
- jump_rope — Comba

### `mat` — **0** ⚠️
Igual que `fitball`: está en la lista de equipamiento de casa pero ningún ejercicio
lo requiere (ejercicios de suelo como `plank`/`crunch` están tageados `equipment: []`,
no `['mat']`).

### `foamRoller` — **0** ⚠️
Sin ejercicios. Es coherente si su uso previsto es solo movilidad/recuperación,
pero confirma que ese caso de uso no está cubierto por el catálogo actual.

### `sliders` — **0** ⚠️
Sin ejercicios.

### `weightedVest` — **0** ⚠️
Sin ejercicios que lo *requieran* como equipo obligatorio. (Sí aparece mencionado
como equipo "cargado" en una heurística de `session.tsx` línea 212, pero ningún
`Exercise.equipment` lo incluye.)

### `cableMachine` — **11**
- cable_fly — Aperturas en polea
- machine_chest_press — Press pectoral en máquina
- cable_lateral_raise — Elevación lateral en polea
- cable_tricep_pushdown — Jalón de tríceps en polea
- machine_overhead_press — Press de hombros en máquina
- lat_pulldown — Jalón al pecho en polea
- cable_row — Remo en polea baja
- machine_row — Remo en máquina
- cable_face_pull — Face pull en polea
- cable_curl — Curl de bíceps en polea
- cable_hip_abduction — Abducción de cadera en polea

### `legPressMachine` — **5**
- leg_press — Prensa de piernas
- hack_squat — Sentadilla hack
- leg_curl — Curl femoral en máquina
- leg_extension — Extensión de cuádriceps
- seated_calf_raise — Elevación de talones sentado

**Resumen:** de los 21 `EquipmentKey`, **5 no tienen ningún ejercicio asociado**:
`fitball`, `mat`, `foamRoller`, `sliders`, `weightedVest`. Todos son parte de la
lista de equipamiento de casa del onboarding (`StepLocation`/`HOME_EQUIPMENT`), así
que un usuario puede marcarlos como disponibles sin que cambien sus opciones de
ejercicio en absoluto.

---

## 2. Ejercicios agrupados por músculo primario (`primaryMuscles`)

| Músculo | Total (primario) |
|---|---|
| glutes | 25 |
| quads | 15 |
| back | 14 |
| shoulders | 13 |
| chest | 11 |
| core | 11 |
| lats | 9 |
| abs | 9 |
| triceps | 8 |
| hamstrings | 7 |
| biceps | 6 |
| calves | 3 |
| traps | 2 |
| forearms | 1 |

### Detalle por músculo

**chest (11):** push_up, db_bench_press, barbell_bench_press, dip, ring_dip,
trx_push_up, db_fly, burpee, incline_barbell_press, cable_fly, machine_chest_press

**triceps (8):** push_up, pike_push_up, dip, ring_dip, trx_push_up,
db_tricep_extension, close_grip_push_up, cable_tricep_pushdown

**shoulders (13):** pike_push_up, db_overhead_press, barbell_overhead_press,
db_lateral_raise, band_lateral_raise, db_front_raise, face_pull_band, ytw_prone,
snow_angel_prone, kb_thruster, cable_lateral_raise, machine_overhead_press,
cable_face_pull

**biceps (6):** chin_up, db_bicep_curl, hammer_curl, barbell_curl, band_curl,
cable_curl

**back (14):** pull_up, inverted_row, db_row, barbell_row, db_deadlift,
barbell_deadlift, trx_row, superman, ytw_prone, snow_angel_prone, med_ball_slam,
lat_pulldown, cable_row, machine_row

**lats (9):** pull_up, chin_up, inverted_row, db_row, barbell_row, trx_row,
lat_pulldown, cable_row, machine_row

**quads (15):** squat_bodyweight, goblet_squat, barbell_squat, lunge, db_lunge,
bulgarian_split_squat, step_up, kb_goblet_squat, sumo_squat, burpee, box_jump,
kb_thruster, leg_press, hack_squat, leg_extension

**hamstrings (7):** db_romanian_deadlift, barbell_romanian_deadlift, db_deadlift,
barbell_deadlift, kb_swing, single_leg_rdl_bw, leg_curl

**glutes (25):** squat_bodyweight, goblet_squat, barbell_squat, lunge, db_lunge,
hip_thrust_bodyweight, db_hip_thrust, bulgarian_split_squat, step_up,
kb_goblet_squat, glute_bridge, lateral_band_walk, glute_kickback_band, sumo_squat,
db_romanian_deadlift, barbell_romanian_deadlift, db_deadlift, barbell_deadlift,
kb_swing, single_leg_rdl_bw, superman, box_jump, leg_press, hack_squat,
cable_hip_abduction

**calves (3):** calf_raise, seated_calf_raise, jump_rope

**core (11):** plank, side_plank, leg_raise, russian_twist, dead_bug,
mountain_climber, ab_roller, hanging_knee_raise, burpee, jump_rope, med_ball_slam

**abs (9):** plank, side_plank, crunch, leg_raise, russian_twist, dead_bug,
mountain_climber, ab_roller, hanging_knee_raise

**traps (2):** face_pull_band, cable_face_pull

**forearms (1):** hammer_curl

Los 14 `MuscleGroup` declarados tienen al menos 1 ejercicio primario en el catálogo
global (ninguno está en 0 a nivel global). Los huecos reales aparecen al cruzar con
equipamiento — ver sección 3.

---

## 3. Cruce peso corporal × músculo (buscando huecos "sin equipo")

Solo se cuentan los 21 ejercicios con `equipment: []`. "Total" es la referencia del
catálogo completo (sección 2) para dar contexto.

| Músculo | Ejercicios SIN equipo | Total catálogo | Estado |
|---|---|---|---|
| biceps | **0** | 6 | ⚠️ Confirmado — sin opción de bíceps sin equipo |
| lats (dorsal) | **0** | 9 | ⚠️ Confirmado — `inverted_row`/`pull_up`/`chin_up`/`trx_row` requieren `pullupBar` o `trx` |
| traps | **0** | 2 | ⚠️ Nuevo hallazgo — ambos ejercicios de trapecio necesitan banda o polea |
| forearms | **0** | 1 | ⚠️ Nuevo hallazgo — `hammer_curl` es el único, requiere `dumbbells` |
| hamstrings | **1** (single_leg_rdl_bw) | 7 | ⚠️ Nuevo hallazgo — único trabajo de isquios sin equipo, y es un movimiento unipodal avanzado, no una opción "fácil" |
| calves | **1** (calf_raise) | 3 | ⚠️ Nuevo hallazgo — única opción de pantorrilla sin equipo |
| chest | 2 (push_up, burpee) | 11 | OK, holgado |
| triceps | 3 | 8 | OK |
| shoulders | 3 | 13 | OK |
| back (general) | 3 (superman, ytw_prone, snow_angel_prone) | 14 | Ojo: son ejercicios posturales de espalda baja/deltoides posterior, NO de tracción tipo remo — no sustituyen el trabajo de lats |
| quads | 4 | 15 | OK |
| glutes | 7 | 25 | OK |
| core | 7 | 11 | OK |
| abs | 7 | 9 | OK |

**Aductores:** no se puede evaluar — `MuscleGroup` no incluye ningún valor para
aductores, así que ni siquiera hay una etiqueta que buscar (ver sección 0).

**Resumen de huecos sin equipo, de más a menos crítico:** bíceps (0), dorsal/lats
(0), trapecio (0), antebrazo (0), isquiotibiales (1, movimiento avanzado),
pantorrilla (1). Los dos primeros ya estaban identificados; trapecio, antebrazo,
isquios y pantorrilla son hallazgos adicionales de esta auditoría.

---

## 4. ¿Existe ya una "dominada australiana" (inverted row inclinado)?

**Sí, conceptualmente cubierto por `inverted_row`** (líneas 152-158):

```ts
{
  id: 'inverted_row',
  name: { es: 'Remo invertido', en: 'Inverted row', fr: 'Rowing inversé' },
  category: 'pull', isCompound: true, difficulty: 'beginner',
  primaryMuscles: ['back', 'lats'], secondaryMuscles: ['biceps', 'core'],
  equipment: ['pullupBar'],
}
```

Búsqueda de "australian"/"australiana" e "inclinad" en `id`, `name.es`, `name.en`,
`name.fr` en todo el catálogo: **sin resultados adicionales**. `inverted_row` es el
único ejercicio de este patrón de movimiento.

Dos matices a tener en cuenta:

1. **Equipamiento:** `inverted_row` solo está tageado con `pullupBar`, no con
   `trx`. En la práctica una dominada australiana suele hacerse con una barra baja
   (Smith, rack) o con TRX/anillas en ángulo — pero el catálogo ya cubre esa
   variante equivalente por separado como `trx_row` (equipment: `['trx']`,
   mismos `primaryMuscles`). Es decir, el movimiento SÍ está cubierto para dos
   equipos distintos (`pullupBar` → inverted_row, `trx` → trx_row), solo que como
   dos ids distintos en vez de uno con equipamiento alternativo.
2. **Dificultad:** ambos están marcados `difficulty: 'beginner'`, coherente con
   ser la progresión más fácil hacia `pull_up`/`chin_up`. No hay un id explícito
   de "remo invertido con pies elevados" (variante más difícil) — no es un hueco
   señalado por el encargo, solo una observación.

**Conclusión:** no hace falta crear un ejercicio nuevo para este movimiento; ya
existe bajo `inverted_row` (y su prima `trx_row`).

---

## 5. Categorías × equipamiento con 0-1 ejercicios (no solo peso corporal)

Tabla de conteo por categoría y equipamiento (solo equipamientos con ≥1 ejercicio
en el catálogo; se omiten los 5 con 0 ejercicios de la sección 1). "—" = 0.

| Equipamiento | push | pull | legs | core | cardio | full_body |
|---|---|---|---|---|---|---|
| (peso corporal) | 3 | 3 | 7 | 7 | — | 1 |
| dumbbells | 6 | 4 | 4 | — | — | — |
| barbellPlates | 3 | 3 | 2 | — | — | — |
| kettlebells | **—** | 1 | 1 | — | — | 1 |
| resistanceBands | 1 | 2 | 1 | **—** | — | — |
| miniGluteBands | — | — | 1 | — | — | — |
| pullupBar | — | 3 | — | 1 | — | — |
| parallettes | 1 | — | — | — | — | — |
| rings | 1 | — | — | — | — | — |
| trx | 1 | 1 | — | **—** | — | — |
| adjustableBench | 1 | — | 2 | — | — | — |
| plioBox | — | — | 1 | — | — | 1 |
| medicineBall | — | — | — | — | — | 1 |
| abRoller | — | — | — | 1 | — | — |
| jumpRope | — | — | — | — | 1 | — |
| cableMachine | 5 | 5 | 1 | **—** | — | — |
| legPressMachine | — | — | 5 | — | — | — |

**Huecos genuinamente notables (equipamiento versátil que "debería" cubrir la
categoría y no lo hace):**

- **push × kettlebells = 0.** Kettlebells cubre pull/legs/full_body pero no hay
  ningún press/empuje con kettlebell (ej. KB floor press, KB push press).
- **core × cableMachine = 0.** El gimnasio (vía `cableMachine`) no tiene NINGÚN
  ejercicio de core/abdomen (ej. cable crunch, woodchopper), pese a tener 11
  ejercicios en polea/máquina para push/pull/legs.
- **core × dumbbells = 0.** Sin trabajo de core cargado con mancuerna (ej. weighted
  russian twist, suitcase carry).
- **core × resistanceBands = 0.** Sin core con banda (ej. pallof press), pese a
  que bandas ya se usan para push/pull/legs.
- **core × barbellPlates = 0** y **core × kettlebells = 0.** Mismo patrón: cero
  trabajo de core cargado con ningún implemento de peso libre.
- **core × trx = 0.** TRX solo tiene 2 ejercicios totales (push+pull); el uso más
  común de TRX para core (ej. TRX plank/pike) no está representado.

**Equipamientos con un único ejercicio en TODO el catálogo** (punto de fallo único
si el usuario no puede/no quiere hacer justo ese ejercicio): `rings` (ring_dip),
`medicineBall` (med_ball_slam), `abRoller` (ab_roller), `jumpRope` (jump_rope),
y `miniGluteBands` (lateral_band_walk). Si a un usuario con solo ese equipo no le
sirve ese ejercicio concreto (lesión, incomodidad, etc.), el sistema de
sustitución (`getAlternatives`) no tiene ningún otro candidato con ese mismo
equipo — buscará en equipo distinto o dejará el ejercicio sin alternativa (mismo
mecanismo de exclusión de FASE E-3 para el caso "sin equivalente").

---

## 6. Definición actual de `category` y viabilidad de añadir `'cardio'`/`'mobility'`

Ya se muestra en la sección 0:

```ts
export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'full_body';
```

### `'cardio'` ya existe — solo está infrautilizado

Un único ejercicio usa `category: 'cardio'` hoy: `jump_rope`. Ejercicios que
"suenan" a cardio (`burpee`, `box_jump`, `kb_thruster`) están tageados
`'full_body'`, no `'cardio'`. No hace falta ningún cambio de tipo para "añadir"
cardio — ya está en el union; lo que falta es re-etiquetar/añadir ejercicios.

### Añadir `'mobility'` — SÍ sería un valor nuevo, y NO es un cambio trivial

El tipo en sí es un simple string-literal union, así que la línea de tipo cambiaría
sin drama a:

```ts
export type ExerciseCategory = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'full_body' | 'mobility';
```

Pero **NO "sin romper nada existente"**: hay **9 objetos `Record<ExerciseCategory, string>`**
en 4 archivos que son exhaustivos por construcción de TypeScript (`Record<K,V>`
exige TODAS las claves de `K`). Añadir `'mobility'` al union hará que TypeScript
falle a compilar en cada uno de estos hasta que se les añada la clave `mobility`:

| Archivo | Línea | Nombre |
|---|---|---|
| `src/app/session.tsx` | 27 | `CAT_ICONS` |
| `src/app/session.tsx` | 32 | `CAT_COLORS` |
| `src/app/session.tsx` | 696 | `GUIDE_CAT_COLORS` |
| `src/app/session.tsx` | 699 | `GUIDE_CAT_ICONS` |
| `src/app/exercise/[id].tsx` | 26 | `CATEGORY_COLORS` |
| `src/app/exercise/[id].tsx` | 29 | `CATEGORY_ICONS` |
| `src/app/exercise/[id].tsx` | 151 | `CAT_LABELS` (3 ramas internas: es/fr/en) |
| `src/components/workout/ExerciseCard.tsx` | 17 | `CATEGORY_COLORS` |
| `src/components/workout/ExerciseCard.tsx` | 26 | `CATEGORY_ICONS` |

`CAT_LABELS` (exercise/[id].tsx:151) es un caso especial: es un ternario de 3
objetos literales (uno por idioma), así que en la práctica son **3 objetos** que
necesitan la nueva clave, no 1.

**Excepción que NO rompe compilación pero sí queda visualmente incompleta:**
`src/components/workout/ChangeExerciseModal.tsx:15` declara
`CATEGORY_COLORS: Record<string, string>` (tipado laxo, no
`Record<ExerciseCategory, string>`), y se consume con
`CATEGORY_COLORS[item.category] ?? GREEN` (línea 79). Con `'mobility'` esto NO
falla al compilar — simplemente cae al fallback `GREEN` en silencio hasta que se
añada la clave manualmente.

**Wiring funcional (más allá de tipos/UI):** en `src/lib/plan-generator.ts`:
- Línea 145: `(['push', 'pull', 'legs', 'core'] as ExerciseCategory[])` — lista
  hardcodeada usada para elegir accesorios de aislamiento. `'mobility'`/`'cardio'`
  quedarían excluidos de accesorios salvo que se añadan aquí explícitamente.
- Líneas 152-155: `dayType` (el tipo de día del plan: `'push'|'pull'|'legs'|'upper'|'lower'|'full_body'`)
  nunca genera un día `'cardio'` ni `'mobility'` — el generador de planes no sabe
  crear días de esas categorías hoy. Añadir el valor al tipo `ExerciseCategory`
  NO conecta automáticamente ejercicios de esa categoría al generador; sería un
  paso aparte.

**Conclusión práctica:** añadir `'mobility'` (o darle más uso real a `'cardio'`)
es seguro a nivel de tipo, pero implica tocar como mínimo 9-11 objetos de
mapeo UI en 4 archivos para que TypeScript compile, más el wiring del generador
de planes si se espera que el nuevo valor participe en la generación automática
de días. Ninguno de estos cambios se ha hecho en esta auditoría (solo lectura).
