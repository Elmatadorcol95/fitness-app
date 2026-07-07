# Auditoría de alcanzabilidad — Lote 11 (máquinas de gimnasio)

**Tipo:** Auditoría de solo lectura. Ningún archivo de código fue modificado.
**Fuentes:** `src/lib/plan-generator.ts`, `src/lib/exercises.ts`,
`src/components/workout/ChangeExerciseModal.tsx`, `CLAUDE.md`, ejecución real
(no simulada) de `generatePlan()` y `getAlternatives()` con `tsx` contra 336
perfiles de usuario de gimnasio.
**Fecha:** 2026-07-07.

**Conclusión corta:** la advertencia citada es **parcialmente correcta, pero no
por la razón que da**. El contenido del Lote 11 **sí está "conectado"** —
`canDoExercise()` y `getAlternatives()` lo tratan como perfectamente
seleccionable para un usuario de gimnasio, sin cambio de código alguno. Pero
existe un problema real y distinto, no mencionado por la advertencia: las 10
`EquipmentKey` nuevas nunca se añadieron a `GYM_EQUIP_PRIORITY`
(`plan-generator.ts:84`), así que **la generación automática de plan nunca
las selecciona** — se comprobó ejecutando el generador real contra 336
combinaciones de perfil (0 apariciones). La **sustitución manual de
ejercicio** ("Cambiar ejercicio"), en cambio, sí las muestra siempre — también
comprobado ejecutando el código real (15/15 casos positivos).

---

## 1. `canDoExercise()` — rastreo de los 3 ejercicios pedidos

Código completo, `src/lib/plan-generator.ts:78-82`:

```ts
function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}
```

Para `isGym === true` la función **retorna `true` en la primera línea, sin
mirar `ex.equipment` en absoluto**. No importa qué `EquipmentKey` tenga el
ejercicio — nueva o vieja, del Lote 11 o del Lote 1.

Los 3 ejercicios pedidos, tal como están en `exercises.ts`:

```ts
// línea 2079
{ id: 'smith_squat', category: 'legs', isCompound: true, ..., equipment: ['smithMachine'] }

// línea 2116
{ id: 'assisted_pullup', category: 'pull', isCompound: true, ..., equipment: ['assistedMachine'] }

// línea 2146
{ id: 'pec_deck_fly', category: 'push', isCompound: false, ..., equipment: ['pecDeckMachine'] }
```

Los tres tienen `category` en `{'push','pull','legs'}` (nunca `'cardio'` ni
`'mobility'`) y ninguno usa `isTimeBased`, `movementPhase` ni
`relevantDayTypes` — no llevan ninguna marca especial que los excluya de los
días de fuerza. **`canDoExercise(ex, equipment, true)` devuelve `true` para
los tres.** Esto responde la pregunta 1 tal como se pidió: sí, se tratan como
seleccionables.

Sin embargo — y esto es la parte que la pregunta 1 no cubre pero que resulta
decisiva para la pregunta 4 — "pasar `canDoExercise`" no es lo mismo que "ser
elegido". Ver sección 4.

---

## 2. ¿Las 10 `EquipmentKey` nuevas necesitan registro adicional?

**No.** `EquipmentKey` es un tipo unión de TypeScript puro (string literals):

```ts
// src/lib/exercises.ts:8-16
export type EquipmentKey =
  | 'dumbbells' | 'barbellPlates' | 'kettlebells'
  | 'resistanceBands' | 'miniGluteBands' | 'pullupBar' | 'parallettes'
  | 'rings' | 'trx' | 'adjustableBench' | 'plioBox' | 'medicineBall'
  | 'fitball' | 'abRoller' | 'jumpRope' | 'mat' | 'foamRoller'
  | 'sliders' | 'weightedVest'
  | 'cableMachine' | 'legPressMachine' | 'cardioMachine' | 'calfMachine' | 'hipAdductorMachine'
  | 'smithMachine' | 'assistedMachine' | 'abMachine' | 'hipAbductorMachine' | 'pecDeckMachine'
  | 'tBarRowMachine' | 'hipThrustMachine' | 'chestPressMachine' | 'shoulderPressMachine' | 'seatedRowMachine';
```

No existe representación en tiempo de ejecución de este tipo — es borrado por
el compilador. Todo el código que compara equipamiento lo hace con
comparación de strings normal (`.includes()`, `.every()`), así que cualquier
string que coincida con el union funciona igual de bien para una `EquipmentKey`
"vieja" o "nueva". Búsqueda de todo el proyecto (`src/`) que referencia estas
10 claves por nombre — solo 2 archivos:

- `src/lib/exercises.ts` — donde se definen y se usan en los objetos `Exercise`.
- `src/components/workout/ExerciseCard.tsx` — el mapa `EQUIPMENT_SHORT` de
  etiquetas es/en/fr para mostrarlas en pantalla. Ya contiene las 10 (líneas
  66-75), añadidas en el propio Lote 11 según el registro de `CLAUDE.md`
  ("Huecos silenciosos de `EQUIPMENT_SHORT`... y las 10 máquinas del Lote 11" —
  confirmado presente, no es una promesa sin cumplir).

Las otras dos listas de equipamiento del proyecto son:

- `HOME_EQUIPMENT` (`StepLocation.tsx`, `equipment.tsx`): la lista de casillas
  de equipamiento de **casa** en onboarding/Ajustes. Deliberadamente **no**
  incluye las 10 claves nuevas — es correcto, porque son equipamiento de
  gimnasio implícito, igual que `cableMachine`/`legPressMachine` desde la
  Fase E-4 (`profile.equipment` nunca las necesita; un usuario de gimnasio
  las tiene todas por `isGym === true`, un usuario de casa nunca las tendría
  disponibles de todos modos).
- `GYM_EQUIP_PRIORITY` (`plan-generator.ts:84`): **esta es la única lista
  real que faltaba actualizar** — ver sección 4. No es un requisito para que
  el generador "reconozca" las claves (`canDoExercise` no la usa), sino para
  el **orden** en que aparecen dentro de cada categoría.

**Conclusión de la pregunta 2:** no hace falta ningún registro para que el
sistema de tipos o `canDoExercise`/`getAlternatives` reconozcan las 10 claves.
Sí existe una lista (`GYM_EQUIP_PRIORITY`) que de hecho no se actualizó, pero
su efecto no es "no reconocer" el equipamiento — es enterrarlo en el orden de
selección (sección 4).

---

## 3. Origen literal del texto de la advertencia

Búsqueda de la frase citada ("no son alcanzables todavía", "no conectado a la
UI/generador") en **todos** los `.md` de la raíz del proyecto: aparece **una
sola vez**, en `CLAUDE.md`, dentro de la propia entrada de "Estado actual"
que cerró la sesión del Lote 2-11 (líneas ~896-902):

```markdown
- Pendiente sin resolver, anotado para retomar:
    ...
    - Los ~198 ejercicios nuevos (cardio, movilidad, core con equipo, TRX/
      anillas/paralelas de fuerza, kettlebells de empuje, aductores, chaleco
      lastrado, máquinas de gimnasio) **no son alcanzables todavía desde
      ningún flujo de la app** (generación de plan, sustitución de
      ejercicios) — el catálogo de datos está completo pero no conectado a
      la UI/generador. Conectarlo es trabajo futuro, fuera de este
      mini-proyecto (que era solo de catálogo de datos).
```

No aparece en ningún audit `.md` dedicado (`CATALOG_COMPLETENESS_AUDIT.md`,
`MUSCLEGROUP_IMPACT_AUDIT.md`, etc.) — no es un hallazgo de una auditoría
específica, es un resumen final escrito directamente en `CLAUDE.md`.

Ese resumen es, además, **internamente contradictorio con el párrafo
inmediatamente anterior en el mismo documento**, que dice:

```markdown
- Verificado y reconfirmado en cada lote (no una sola vez): `'cardio'` y
  `'mobility'` quedan excluidos de la generación de días de fuerza en
  `plan-generator.ts` por las whitelists ya existentes (`allIso` en días
  `full_body`; `cats` derivado de `DayType`, que nunca vale `'cardio'` ni
  `'mobility'`, en el resto). **`plan-generator.ts` no fue tocado en ningún
  lote (2 al 11)** — confirmado con `git diff --quiet` al cierre de cada uno.
```

Es decir: el propio `CLAUDE.md` documenta, párrafo arriba, que **solo**
`cardio`/`mobility` quedan excluidos por diseño y que `plan-generator.ts`
nunca cambió — lo cual implica que la lógica de filtro por categoría
(push/pull/legs/core), que ya existía antes del Lote 2, sigue aplicándose
igual a cualquier ejercicio nuevo etiquetado con esas categorías. El bloque
de "Pendiente sin resolver" generaliza esa exclusión real y estrecha
(cardio/mobility) a **los ~198 ejercicios nuevos completos**, sin distinguir
categoría — una sobregeneralización de la nota correcta que sí aplicaba a
lotes anteriores, aplicada sin matices al cierre del Lote 11.

**Evidencia de que la sobregeneralización es real y no solo retórica:**
`isTimeBased`, `movementPhase` y `relevantDayTypes` (los campos que sí marcan
contenido de cardio/movilidad) no tienen **ningún** consumidor fuera de
`exercises.ts` en todo `src/` (búsqueda `grep` sin resultados en otros
archivos) — esos ~82 ejercicios nuevos de cardio/movilidad efectivamente no
están conectados a nada. Pero esto no dice nada sobre los ejercicios de
categoría `push`/`pull`/`legs`/`core` del mismo rango de lotes, que no llevan
esas marcas y pasan por el mismo `canDoExercise`/`getAlternatives` que
cualquier ejercicio del catálogo original.

---

## 4. ¿Es alcanzable HOY el contenido de fuerza del Lote 11 para un usuario de gimnasio?

**Respuesta dividida por flujo — comprobada ejecutando el código real (no
simulada a mano), con `tsx` sobre `src/lib/plan-generator.ts` y
`src/lib/exercises.ts` sin modificar nada:**

### 4a. Generación automática de plan — **NO alcanzable hoy**

Se ejecutó `generatePlan()` real para las 15 combinaciones de objetivo
(`strength`/`hypertrophy`/`fat_loss`, con y sin secundario) × 7 valores de
`daysPerWeek` (1-7) × 8 valores de `minutesPerSession` (15-120) = **336
perfiles de gimnasio** (`location: 'gym'`), y se buscó cualquier aparición de
los 15 ejercicios del Lote 11 que usan alguna de las 10 `EquipmentKey`
nuevas en exclusiva:

```
smith_squat, smith_bench_press, smith_shoulder_press, smith_row, smith_lunge,
assisted_pullup, assisted_dip, ab_machine_crunch, seated_hip_abductor_machine,
pec_deck_fly, t_bar_row, hip_thrust_machine,
machine_chest_press, machine_overhead_press, machine_row  (recategorizados en Lote 11)
```

**Resultado real: 0 apariciones en las 336 combinaciones.**

**Causa raíz, con código:**

```ts
// plan-generator.ts:84
const GYM_EQUIP_PRIORITY = new Set(['barbellPlates', 'cableMachine', 'legPressMachine', 'dumbbells', 'kettlebells']);

// plan-generator.ts:87-93
function sortGymFirst(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const aScore = a.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    const bScore = b.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    return bScore - aScore;
  });
}
```

`GYM_EQUIP_PRIORITY` **nunca se amplió** con las 10 claves del Lote 11. Para
un usuario de gimnasio, `available = sortGymFirst(rawAvailable)`
(línea 127) coloca primero **todo** ejercicio con barra/cable/prensa/
mancuerna/kettlebell, y deja el resto (peso corporal y las 10 máquinas
nuevas) en el mismo bloque de prioridad baja, en el orden original del
array.

Luego, tanto `pickRoundRobin` (días de una/dos categorías) como la rama
`full_body` seleccionan usando `offset = dayIndex` (rango 0-6, ya que
`daysPerWeek` ≤ 7) y `limit = counts.compounds/isolations` (rango 2-5,
`getExerciseCounts`). Eso significa que el índice máximo del pool que se
llega a tocar es `offset + limit - 1 ≤ 6 + 5 - 1 = 10`. Se midió la posición
real de estos ejercicios dentro de sus pools (`push`/`pull`/`legs`,
compuestos) tras `sortGymFirst`:

| Categoría | Tamaño del pool | Posición del ejercicio Lote 11 |
|---|---|---|
| push (compuestos) | 22 | `smith_bench_press` → índice 19 |
| pull (compuestos) | 18 | `assisted_pullup` → índice 16 |
| legs (compuestos) | 27 | `smith_squat` → índice 24 |

Ningún perfil probado alcanza esos índices (máximo 10) — por eso el resultado
empírico es 0/336 y no depende de qué objetivo, días o minutos elija el
usuario. Esto **no es un problema de conexión** (canDoExercise ya los admite)
sino un **problema de orden**: son el único bloque de contenido "de
gimnasio" que quedó fuera de `GYM_EQUIP_PRIORITY` y, además, se añadió al
final del archivo (por eso también quedan al final del pool sin ordenar de
un usuario de casa, aunque para casa el punto es discutible porque
normalmente no tienen `smithMachine`/`assistedMachine`/etc. en su
equipamiento de todos modos).

### 4b. Sustitución manual de ejercicio ("Cambiar ejercicio") — **SÍ alcanzable hoy**

`getAlternatives()` (`exercises.ts:2195-2216`), usada por
`ChangeExerciseModal`, **no** pasa por `sortGymFirst` ni por
`GYM_EQUIP_PRIORITY`. Para `isGym === true` devuelve, sin límite de
cantidad, **todo** el catálogo que comparta categoría y al menos un músculo
primario con el ejercicio actual, ordenado solo por solapamiento muscular:

```ts
const canDo = isGym
  ? true
  : ex.equipment.length === 0 || ex.equipment.every(eq => equipment.includes(eq));
```

`ChangeExerciseModal` renderiza la lista completa en un `FlatList` sin
truncar (`data={alternatives}`, sin `.slice`).

Se ejecutó `getAlternatives(siblingId, [], true)` real para los 15
ejercicios, partiendo de un ejercicio "hermano" natural de barra/polea/
mancuerna de la misma categoría y músculo. **Resultado: 15/15 aparecen en la
lista de alternativas.**

```
smith_squat                    ← barbell_squat            : true (35 alternativas)
smith_bench_press              ← barbell_bench_press       : true (18 alternativas)
smith_shoulder_press           ← barbell_overhead_press    : true (14 alternativas)
smith_row                      ← barbell_row               : true (20 alternativas)
smith_lunge                    ← barbell_squat             : true (35 alternativas)
assisted_pullup                ← pull_up                   : true (20 alternativas)
assisted_dip                   ← barbell_bench_press       : true (18 alternativas)
ab_machine_crunch              ← crunch                    : true (46 alternativas)
seated_hip_abductor_machine    ← db_hip_thrust             : true (33 alternativas)
pec_deck_fly                   ← barbell_bench_press       : true (18 alternativas)
t_bar_row                      ← barbell_row               : true (20 alternativas)
hip_thrust_machine             ← db_hip_thrust             : true (33 alternativas)
machine_chest_press            ← barbell_bench_press       : true (18 alternativas)
machine_overhead_press         ← barbell_overhead_press    : true (14 alternativas)
machine_row                    ← barbell_row               : true (20 alternativas)
```

Es decir: un usuario de gimnasio que toque "Cambiar ejercicio" sobre
cualquier sentadilla, press de banca, remo, dominada, press de hombro,
crunch o hip thrust de su plan **verá hoy mismo** las variantes en máquina
del Lote 11 entre las opciones — sin ningún cambio de código.

---

## 5. Conclusión explícita

1. **`canDoExercise()` sí trata `smith_squat`, `assisted_pullup` y
   `pec_deck_fly` (y los otros 12 ejercicios de máquina del Lote 11) como
   seleccionables para un usuario de gimnasio** — el atajo `if (isGym) return
   true` los admite sin mirar su `EquipmentKey`.
2. **Las 10 `EquipmentKey` nuevas no requieren ningún registro adicional** en
   ningún enum o lista de validación — `EquipmentKey` no tiene
   representación en tiempo de ejecución, y las únicas listas reales de
   equipamiento del proyecto (`HOME_EQUIPMENT`, `EQUIPMENT_SHORT`) ya están
   correctas (la primera las excluye a propósito, la segunda ya las incluye).
3. **La advertencia citada nace en `CLAUDE.md` mismo**, no en un audit
   dedicado, y generaliza sin matices una exclusión real pero estrecha
   (`cardio`/`mobility`, confirmada como la única exclusión deliberada en
   `plan-generator.ts` y confirmada además porque `isTimeBased`/
   `movementPhase`/`relevantDayTypes` no tienen consumidor en ningún otro
   archivo) a los ~198 ejercicios nuevos completos, incluyendo categorías
   (`push`/`pull`/`legs`/`core`) que la propia sesión ya había verificado
   como alcanzables.
4. **¿Alcanzable hoy, sin cambios, el contenido de fuerza del Lote 11 para un
   usuario de gimnasio?**
   - Por **sustitución de ejercicio**: **Sí** — verificado ejecutando
     `getAlternatives()` real, 15/15 casos.
   - Por **generación automática de plan**: **No** — verificado ejecutando
     `generatePlan()` real contra 336 perfiles, 0/336 apariciones. La causa
     inmediata es que `GYM_EQUIP_PRIORITY` (`plan-generator.ts:84`) nunca se
     amplió con las 10 claves nuevas. **Actualización tras la sección 6:**
     esa causa inmediata no es, sin embargo, el problema de fondo — ver
     sección 6 para el análisis completo, que revisa a la baja el tamaño de
     la "ventana alcanzable" calculada aquí y muestra que el defecto real es
     estructural (el tamaño fijo de la ventana de selección), no una lista
     desactualizada.

---

## 6. `GYM_EQUIP_PRIORITY` — mecanismo exacto, alcance y lectura técnica del fix

### 6.1 Definición verbatim

`src/lib/plan-generator.ts`, líneas 78-93 (incluyo `canDoExercise` justo
arriba porque comparte el bloque y ayuda a ver que son dos mecanismos
distintos):

```ts
function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}

const GYM_EQUIP_PRIORITY = new Set(['barbellPlates', 'cableMachine', 'legPressMachine', 'dumbbells', 'kettlebells']);

// Para usuarios de gimnasio: coloca ejercicios con carga antes de los de peso corporal
function sortGymFirst(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const aScore = a.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    const bScore = b.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    return bScore - aScore;
  });
}
```

Son **dos mecanismos separados y consecutivos**: `canDoExercise` decide
*quién entra* al pool (para gimnasio, todos); `GYM_EQUIP_PRIORITY`/
`sortGymFirst` deciden *en qué orden* queda ese pool ya admitido. Las 10
claves del Lote 11 pasan el primer filtro sin problema (sección 1) — el
punto de fallo está enteramente en el segundo mecanismo.

### 6.2 Cómo se consume — ¿ordena, filtra, o algo más?

**Ordena. No filtra — ningún ejercicio se descarta aquí.** El punto de
consumo es `plan-generator.ts:126-127`:

```ts
const rawAvailable = EXERCISES.filter(e => canDoExercise(e, equipment, isGym));
const available = isGym ? sortGymFirst(rawAvailable) : rawAvailable;
```

`available` (ya ordenado) es la única fuente de la que se construyen los
pools por categoría, tanto en la rama `full_body` como en la rama normal
(`pickRoundRobin`, líneas 161-179):

```ts
const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
  const pools = cats.map(cat =>
    available.filter(e => e.category === cat && e.isCompound === isCompound),
  );
  const result: Exercise[] = [];
  const starts = pools.map(pool => pool.length > 0 ? offset % pool.length : 0);
  const taken  = pools.map(() => 0);
  while (result.length < limit) {
    let anyPicked = false;
    for (let p = 0; p < pools.length && result.length < limit; p++) {
      if (pools[p].length === 0) continue;
      result.push(pools[p][(starts[p] + taken[p]) % pools[p].length]);
      taken[p]++;
      anyPicked = true;
    }
    if (!anyPicked) break;
  }
  return result;
};
```

`pools[p]` se construye filtrando `available` (que ya viene ordenado por
`sortGymFirst`) por categoría — el orden interno de cada pool es
exactamente el orden que dejó `sortGymFirst`. La combinación con
`offset`/`limit` es directa: `starts[p] = offset % pool.length` fija el
punto de partida dentro del pool YA ORDENADO, y el bucle `while` avanza
`taken[p]` de 1 en 1 hasta cubrir `limit` elementos, leyendo
`pool[(start + taken) % pool.length]`. Es decir: **la prioridad decide el
orden del pool; el offset decide desde qué punto de ese pool ya ordenado se
empieza a leer; el limit decide cuántos se leen.** Los tres se combinan
multiplicativamente: un ejercicio solo se selecciona si su posición en el
pool ordenado cae dentro de `[start, start + limit - 1] (mod poolLength)`.

(La rama `full_body`, líneas 131-150, usa el mismo `available` ordenado con
`safePick`/`slice` — mecanismo distinto en la forma pero con el mismo efecto:
lee una ventana pequeña y fija a partir de `offset`.)

### 6.3 ¿Es un subconjunto? ¿Qué pasa con lo que no está en la lista?

**Es un subconjunto pequeño — 5 de las 34 `EquipmentKey` existentes.**
Union completo (`exercises.ts:8-16`):

```ts
export type EquipmentKey =
  | 'dumbbells' | 'barbellPlates' | 'kettlebells'
  | 'resistanceBands' | 'miniGluteBands' | 'pullupBar' | 'parallettes'
  | 'rings' | 'trx' | 'adjustableBench' | 'plioBox' | 'medicineBall'
  | 'fitball' | 'abRoller' | 'jumpRope' | 'mat' | 'foamRoller'
  | 'sliders' | 'weightedVest'
  | 'cableMachine' | 'legPressMachine' | 'cardioMachine' | 'calfMachine' | 'hipAdductorMachine'
  | 'smithMachine' | 'assistedMachine' | 'abMachine' | 'hipAbductorMachine' | 'pecDeckMachine'
  | 'tBarRowMachine' | 'hipThrustMachine' | 'chestPressMachine' | 'shoulderPressMachine' | 'seatedRowMachine';
```

`GYM_EQUIP_PRIORITY` solo contiene `barbellPlates`, `cableMachine`,
`legPressMachine`, `dumbbells`, `kettlebells` — **29 de las 34 claves
quedan fuera**, entre ellas las 19 de equipamiento de casa
(`resistanceBands`, `trx`, `rings`, `mat`, etc.) y **las otras 3 claves de
gimnasio que ya existían antes del Lote 11** (`cardioMachine`, `calfMachine`,
`hipAdductorMachine`, del Lote 8) además de las 10 del Lote 11.

**Qué pasa con lo que no está en la lista:** no se descarta ni se excluye
del pool — `sortGymFirst` es un `Array.prototype.sort`, que es **estable**
en el motor de JS de Node/Hermes usado aquí (garantizado por la spec desde
ES2019). Cualquier ejercicio cuyo equipamiento no tenga ninguna clave en
`GYM_EQUIP_PRIORITY` recibe `score = 0` — el mismo score que un ejercicio de
peso corporal (`equipment: []`) — y **conserva su posición relativa
original dentro de ese bloque de score 0**, que es simplemente el orden en
que aparece en el array `EXERCISES` (o sea, el orden de declaración en
`exercises.ts`). No hay "van al final de forma aleatoria" ni "se
descartan": van al final **en bloque**, y dentro de ese bloque, en el mismo
orden en que están escritos en el archivo. Como el Lote 11 se escribió al
final del archivo (líneas 2077-2172, de un archivo de ~2217 líneas), sus
ejercicios terminan siendo los **últimos** dentro del bloque de baja
prioridad — la posición dentro de ese bloque, no la ausencia de
"reconocimiento", es la causa mecánica de la sección 4a.

### 6.4 Lectura técnica: ¿lista desactualizada o problema estructural?

**El problema es estructural. Añadir las 10 claves a `GYM_EQUIP_PRIORITY`
NO resolvería la mayoría de los casos**, y el defecto de fondo no nace en el
Lote 11 — ya existía y afecta a la mayor parte del catálogo. Evidencia,
ejecutando el código real (no una suposición):

**(a) El offset real por categoría es más pequeño de lo que asumí en la
sección 4a.** Ahí usé un rango genérico `offset ≤ 6`. Revisando
`getSplit()` (`plan-generator.ts:65-76`), el offset es el **índice del día**
donde esa categoría aparece, y varía por categoría según el split:

| Categoría | Offsets posibles (todos los `daysPerWeek` 1-7) | Offset máximo |
|---|---|---|
| `push` (solo o dentro de `upper`) | {0,1,2,3} | 3 |
| `pull` (solo o dentro de `upper`) | {0,1,2,3,4} | 4 |
| `legs` (solo o dentro de `lower`) | {0,1,2,3,4,5} | 5 |

Con `limit` máximo 5 (compuestos, minutos > 90) o 4 (aislamiento), el índice
máximo del pool que la generación automática **puede llegar a tocar**, para
cualquier combinación de objetivo/días/minutos, es:

| Pool | Índice máximo teórico alcanzable |
|---|---|
| push compuestos | 3+5-1 = 7 |
| push aislamiento | 3+4-1 = 6 |
| pull compuestos | 4+5-1 = 8 |
| pull aislamiento | 4+4-1 = 7 |
| legs compuestos | 5+5-1 = 9 |
| legs aislamiento | 5+4-1 = 8 |

**(b) Confirmado ejecutando `generatePlan()` real sobre los mismos 336
perfiles de la sección 4a**, midiendo el índice máximo realmente usado
dentro de cada pool ordenado (con la `GYM_EQUIP_PRIORITY` actual, sin
modificar nada):

```
push_c: poolSize=22  maxIndexUsed=7   ejercicios distintos vistos=8/22   (36%)
push_i: poolSize=16  maxIndexUsed=6   ejercicios distintos vistos=7/16   (44%)
pull_c: poolSize=18  maxIndexUsed=8   ejercicios distintos vistos=9/18   (50%)
pull_i: poolSize=19  maxIndexUsed=7   ejercicios distintos vistos=8/19   (42%)
legs_c: poolSize=27  maxIndexUsed=9   ejercicios distintos vistos=10/27  (37%)
legs_i: poolSize=28  maxIndexUsed=8   ejercicios distintos vistos=8/28   (29%)
core_c: poolSize=1   maxIndexUsed=0   ejercicios distintos vistos=1/1    (100%)
core_i: poolSize=61  maxIndexUsed=5   ejercicios distintos vistos=5/61   (8%)
```

Coincide exactamente con el límite teórico de (a) — **ninguna combinación
de objetivo/días/minutos hace que la generación automática mire más allá
de esos índices**, para ninguna categoría. Esto **no es específico del
Lote 11**: en `core` aislamiento (que no tiene ningún ejercicio del Lote 11
— son estiramientos/planchas/etc. de lotes anteriores), solo 5 de 61
ejercicios (8%) son alcanzables alguna vez por generación automática, y en
`legs` aislamiento solo 8 de 28 (29%). El Lote 11 es la manifestación más
visible del problema (porque además cae en el bloque de prioridad baja),
pero el techo de la ventana ya limitaba el catálogo **antes** del Lote 11.

**(c) Simulé qué pasaría si se añadieran las 10 claves nuevas a
`GYM_EQUIP_PRIORITY`** (sin tocar el archivo real — cálculo aparte,
reconstruyendo `sortGymFirst` con un Set ampliado sobre los mismos datos de
`EXERCISES`). Los 15 ejercicios del Lote 11 sí suben de posición (porque
ahora compiten en el bloque de score=1 en vez del de score=0), pero siguen
ordenados **al final de ese nuevo bloque** (mismo motivo: `sort` estable +
Lote 11 declarado al final del archivo). Resultado, comparando contra el
índice máximo alcanzable de (a):

| Ejercicio | Pool | Índice con prioridad ampliada | Índice máx. alcanzable | ¿Quedaría reachable? |
|---|---|---|---|---|
| `machine_chest_press` | push_c (máx 7) | 5 | 7 | Sí |
| `machine_overhead_press` | push_c (máx 7) | 6 | 7 | Sí (al límite) |
| `smith_bench_press` | push_c (máx 7) | 11 | 7 | **No** |
| `smith_shoulder_press` | push_c (máx 7) | 12 | 7 | **No** |
| `assisted_dip` | push_c (máx 7) | 13 | 7 | **No** |
| `pec_deck_fly` | push_i (máx 6) | 8 | 6 | **No** |
| `machine_row` | pull_c (máx 8) | 7 | 8 | Sí |
| `smith_row` | pull_c (máx 8) | 8 | 8 | Sí (al límite exacto) |
| `assisted_pullup` | pull_c (máx 8) | 9 | 8 | **No** |
| `t_bar_row` | pull_c (máx 8) | 10 | 8 | **No** |
| `smith_squat` | legs_c (máx 9) | 9 | 9 | Sí (al límite exacto) |
| `smith_lunge` | legs_c (máx 9) | 10 | 9 | **No** |
| `hip_thrust_machine` | legs_c (máx 9) | 11 | 9 | **No** |
| `seated_hip_abductor_machine` | legs_i (máx 8) | 9 | 8 | **No** |

**Solo 5 de 14 quedarían dentro de rango (y 2 de esos 5 justo en el límite
exacto, es decir, solo alcanzables con la combinación más extrema de
días/minutos posible)**. Los otros 9 seguirían sin ser generables jamás,
aunque se "arregle" la lista de prioridad. (`ab_machine_crunch`, categoría
`core` aislamiento con pool de 61, no se incluye en la tabla porque con
prioridad ampliada su índice pasaría a depender del resto del bloque
`core`, pero dado que el pool `core_i` actual solo deja ver 5 de 61 en el
mejor caso, es extremadamente improbable que entre en rango.)

**Conclusión de la sección 6:** el fix correcto **no es** simplemente añadir
las 10 claves a `GYM_EQUIP_PRIORITY` — eso arreglaría como mucho un tercio
de los casos del Lote 11 (y de forma frágil, solo para perfiles con el
`daysPerWeek`/`minutesPerSession` más altos) y **no tocaría en absoluto** el
mismo problema en `core` (8% alcanzable), `legs` aislamiento (29%) u otras
categorías. El defecto real es que `offset` (acotado por cuántas veces
aparece cada categoría en `getSplit()`, máximo 3-5) y `limit`
(`getExerciseCounts()`, máximo 4-5) definen una **ventana de lectura fija y
determinista** que no escala con el tamaño del pool — fue razonable cuando
el catálogo tenía 81 ejercicios (pools de ~5-8 por categoría, ventana
cercana al 100%) pero deja fuera a la mayoría de un catálogo de 279 (pools
de 16-61, ventana del 8%-50%). Además, al no haber ninguna semilla o
rotación entre regeneraciones (`selectExercisesForDay` es una función pura
del perfil), el mismo usuario, con el mismo perfil, **nunca** verá nada
fuera de esa ventana por más veces que regenere el plan. Cualquier decisión
de alcance para el fix debería partir de este hallazgo — la lista de
prioridad es, como mucho, uno de los síntomas, no la causa raíz.

---

## 7. `offset`, `pickRoundRobin`, aleatoriedad y determinismo — antes de tocar nada

### 7.1 Cómo se calcula y se "pasa" `offset` a `pickRoundRobin`

**No se pasa como parámetro de `pickRoundRobin` — se captura por clausura**
desde el parámetro `offset` de la función contenedora `selectExercisesForDay`.
Cadena completa, verbatim:

`src/lib/plan-generator.ts`, dentro de `generatePlan` (líneas 207-211):

```ts
const days: PlanDayData[] = split.map((dayType, i) => ({
  dayIndex: i,
  dayType,
  exercises: selectExercisesForDay(dayType, equipment, isGym, counts, scheme, i),
}));
```

`i` es el índice ordinal dentro del array que devuelve `getSplit(daysPerWeek)`
(líneas 65-76) — es decir, el **día de la semana dentro del ciclo**, no un
valor aleatorio ni derivado del perfil ni de la fecha. Para
`getSplit(4) = ['upper','lower','upper','lower']`, `i` vale 0,1,2,3 en ese
orden — los dos días `'upper'` reciben `i = 0` y `i = 2`.

Ese `i` entra a `selectExercisesForDay` como el parámetro `offset`
(firma, líneas 118-125):

```ts
function selectExercisesForDay(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  scheme: RepScheme,
  offset: number,
): PlannedExercise[] {
```

Y dentro de esa misma función, `pickRoundRobin` es una función interna
(closure) declarada en el cuerpo de `selectExercisesForDay` (línea 161):
`offset` no aparece en su lista de parámetros — la función simplemente lee
la variable `offset` del entorno léxico que la contiene (ver 7.2, línea
166). **No hay indirección adicional: `offset === i === dayIndex`,
siempre.**

### 7.2 `pickRoundRobin` y `sortGymFirst` — definición completa; origen de `limit`

Verbatim, `src/lib/plan-generator.ts:84-93` y `161-182`:

```ts
const GYM_EQUIP_PRIORITY = new Set(['barbellPlates', 'cableMachine', 'legPressMachine', 'dumbbells', 'kettlebells']);

// Para usuarios de gimnasio: coloca ejercicios con carga antes de los de peso corporal
function sortGymFirst(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const aScore = a.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    const bScore = b.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    return bScore - aScore;
  });
}
```

```ts
const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
  const pools = cats.map(cat =>
    available.filter(e => e.category === cat && e.isCompound === isCompound),
  );
  const result: Exercise[] = [];
  const starts = pools.map(pool => pool.length > 0 ? offset % pool.length : 0);
  const taken  = pools.map(() => 0);
  while (result.length < limit) {
    let anyPicked = false;
    for (let p = 0; p < pools.length && result.length < limit; p++) {
      if (pools[p].length === 0) continue;
      result.push(pools[p][(starts[p] + taken[p]) % pools[p].length]);
      taken[p]++;
      anyPicked = true;
    }
    if (!anyPicked) break;
  }
  return result;
};

compounds  = pickRoundRobin(true,  counts.compounds);
isolations = pickRoundRobin(false, counts.isolations);
```

`limit` es simplemente el parámetro formal que recibe cada llamada:
`counts.compounds` o `counts.isolations`. Su origen, verbatim
(`plan-generator.ts:55-63`):

```ts
function getExerciseCounts(minutes: number): { compounds: number; isolations: number } {
  if (minutes <= 20) return { compounds: 2, isolations: 1 };
  if (minutes <= 30) return { compounds: 2, isolations: 2 };
  if (minutes <= 45) return { compounds: 3, isolations: 2 };
  if (minutes <= 60) return { compounds: 3, isolations: 3 };
  if (minutes <= 75) return { compounds: 4, isolations: 3 };
  if (minutes <= 90) return { compounds: 4, isolations: 4 };
  return { compounds: 5, isolations: 4 };
}
```

**`counts` (y por tanto `limit`) depende ÚNICAMENTE de
`profile.minutesPerSession`.** No depende de `daysPerWeek` (que solo decide
`getSplit()`, es decir, cuántos días hay y qué `dayType` tiene cada uno —
no cuántos ejercicios por día) ni del "número de series del día": las
series por ejercicio (`sets`) vienen de una fuente completamente distinta,
`scheme.compoundSets`/`scheme.isolationSets`, calculadas en `getRepScheme`
(líneas 38-53) a partir de `goalPrimary`/`goalSecondary` — un eje
independiente que no interactúa con `counts`/`limit` en ningún punto del
código. En resumen: **minutos → cuántos ejercicios distintos; objetivo →
cuántas series por ejercicio; días/semana → qué patrón de `dayType` y qué
`offset` recibe cada día.** Tres ejes ortogonales, ninguno se combina con
otro para ampliar o reducir la ventana de selección.

### 7.3 ¿Existe hoy algún mecanismo de aleatoriedad o semilla?

**No, en ningún punto de `plan-generator.ts`.** Búsqueda explícita en todo
el archivo de `Math.random`, `Date.now`, `hash`, `seed`, `Math.floor`:
única coincidencia, línea 218, dentro del `return` de `generatePlan`:

```ts
return {
  goalPrimary:       profile.goalPrimary,
  goalSecondary:     profile.goalSecondary ?? null,
  daysPerWeek:       profile.daysPerWeek,
  minutesPerSession: profile.minutesPerSession,
  generatedAt:       Date.now(),
  days,
};
```

`Date.now()` se usa **solo** para poner una marca de tiempo de metadata en
el objeto de plan ya construido — se ejecuta *después* de que `days` (con
todos los ejercicios ya seleccionados) está completo, y ese valor nunca se
lee de vuelta hacia `selectExercisesForDay`, `pickRoundRobin` ni ninguna
otra función de selección. No hay ningún generador de números
pseudoaleatorios, ningún hash derivado del perfil o de la fecha, ninguna
semilla explícita ni implícita. Toda la selección de ejercicios es 100%
determinista en función de los 6 campos de entrada de `generatePlan`
(`goalPrimary`, `goalSecondary`, `daysPerWeek`, `minutesPerSession`,
`location`, `equipment`). Esto es relevante antes de introducir cualquier
variación nueva: hoy no hay ninguna infraestructura de aleatoriedad/rotación
de la que partir — habría que construirla desde cero, y cualquier diseño
nuevo interactuaría con el mecanismo de la sección 7.4, no lo reemplazaría
automáticamente.

### 7.4 Mecanismo exacto de la variedad entre dos días `'upper'` del mismo plan

Este comportamiento fue diagnosticado y su fix documentado en
`VARIATION_AUDIT.md` (auditoría de sesión anterior, catálogo de 78
ejercicios en ese momento). Verbatim de ese documento, el estado **antes**
del fix (`VARIATION_AUDIT.md:54-72`):

```javascript
const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
  const pools = cats.map(cat =>
    available.filter(e => e.category === cat && e.isCompound === isCompound),
  );
  const result: Exercise[] = [];
  const indices = pools.map(() => 0);   // ← siempre empieza en 0, offset ignorado
  ...
```

Y la recomendación (`VARIATION_AUDIT.md:174-179`):

```javascript
// Antes (igual para todos los días):
const indices = pools.map(() => 0);

// Después (desplaza el inicio según el offset del día):
const indices = pools.map(pool => pool.length > 0 ? offset % pool.length : 0);
```

**El código actual (sección 7.2) ya tiene ese fix aplicado** — `starts =
pools.map(pool => pool.length > 0 ? offset % pool.length : 0)` es
exactamente la línea recomendada (solo renombrada de `indices` a `starts`,
más el array `taken` añadido para llevar la cuenta de cuántos elementos se
han tomado de cada pool al recorrer varias vueltas del `while`).

**El mecanismo, explicado:** dos días del mismo `dayType` (p. ej. los dos
`'upper'` de un split de 4 días) llaman a `selectExercisesForDay` con
`offset` distinto (0 y 2 — sección 7.1). Ambas llamadas recomputan
`available` de forma independiente (mismo `EXERCISES`, mismo
`canDoExercise`, mismo `sortGymFirst` — el pool ordenado es idéntico en
ambas llamadas, porque nada dentro de esa reconstrucción depende de
`offset`). Lo único que cambia entre las dos llamadas es
`starts[p] = offset % pool.length`: con offset=0 arranca en el índice 0 del
pool ya ordenado, con offset=2 arranca en el índice 2. Como el pool es el
mismo pero el punto de lectura difiere, los ejercicios elegidos difieren
(mientras el pool tenga más de 2 elementos distintos entre esas dos
posiciones — ver el caso límite de peso corporal en
`VARIATION_AUDIT.md:113-117`, donde un pool de tamaño 2 hace que `offset=0`
y `offset=2` colapsen al mismo índice vía `2 % 2 = 0`).

**Verificación empírica, ejecutando `generatePlan()` real** (perfil
`hypertrophy`+`fat_loss`, 4 días/semana, 60 min, gimnasio):

```
Día 0 (upper, offset=0) → db_bench_press, db_row, db_overhead_press,
                           db_lateral_raise, db_bicep_curl, db_fly
Día 2 (upper, offset=2) → barbell_bench_press, db_deadlift, barbell_overhead_press,
                           db_tricep_extension, barbell_curl, db_front_raise
¿Idénticos? → false
```

**Riesgo concreto de tocar `offset` o el ordenamiento:**

- **Riesgo directo (el que rompe este comportamiento):** cualquier cambio
  que haga que dos ocurrencias del mismo `dayType` terminen recibiendo el
  mismo `offset` efectivo — por ejemplo, sustituir `i` por un valor
  constante por semana, por `i % algo` mal calculado, o por cualquier
  esquema de "ventana ampliada" que ignore de qué día específico viene la
  llamada — **reintroduce exactamente el bug original que
  `VARIATION_AUDIT.md` diagnosticó y que ya está corregido.** Es el riesgo
  más probable si el fix de la sección 6 (ampliar `GYM_EQUIP_PRIORITY` o
  rediseñar la ventana) se implementa tocando cómo se deriva `offset` en
  lugar de solo la prioridad/orden.
- **Riesgo indirecto (cambiar el ordenamiento, no el offset):** modificar
  `sortGymFirst`/`GYM_EQUIP_PRIORITY` (p. ej. para resolver la sección 6)
  **no rompe por sí solo** la variedad entre días del mismo tipo, porque esa
  variedad depende de que `offset` difiera entre las dos llamadas, no del
  criterio de orden — mientras el pool siga teniendo suficientes elementos
  distintos entre las posiciones `start` de cada offset, seguirá habiendo
  variedad. El riesgo aparece si el nuevo criterio de orden **no es
  determinista** (p. ej., si se usara `Math.random()` dentro del
  comparador de `sort`): (1) rompería el determinismo confirmado en 7.5,
  porque `available` se recalcula de cero en cada llamada a
  `selectExercisesForDay` (una por día) y ya no sería estable entre
  regeneraciones; (2) `Array.prototype.sort` con un comparador no
  determinista/no transitivo es un comportamiento no garantizado por la
  spec (V8 asume un "consistent comparator"), lo que podría producir
  resultados inconsistentes entre sí, no solo distintos a través del
  tiempo; y (3), de forma contraintuitiva, un orden aleatorio podría
  **coincidir por azar** en ambas llamadas para el mismo `dayType` y
  eliminar la variedad que hoy provee el `offset`, en vez de ampliarla.
  Cualquier fix de la ventana de selección debería mantener `sortGymFirst`
  (o su reemplazo) puramente determinista en función de los datos del
  ejercicio, no del momento en que se llama.

### 7.5 ¿Regenerar el plan (mismo perfil, mismo equipamiento) es determinista?

**Sí, 100% determinista para los días y ejercicios.** Confirmado
ejecutando `generatePlan()` real 5 veces seguidas con el mismo objeto de
perfil (`hypertrophy`+`fat_loss`, 4 días/semana, 60 min, gimnasio,
`equipment: '[]'`):

```
5 regeneraciones con el MISMO perfil, ¿días/ejercicios idénticos? true
generatedAt varía entre corridas? sí (timestamps distintos, esperado)
```

Lo único que cambia entre una regeneración y la siguiente es el campo de
metadata `generatedAt` (marca de tiempo de cuándo se generó el plan, ver
7.3) — el contenido real (`days`, con todos los `exerciseId`/`sets`/`reps`/
`restSeconds` de cada día) es exactamente igual, siempre, para el mismo
perfil y equipamiento. Esto es consistente con 7.3 (sin aleatoriedad) y con
el hallazgo de la sección 6: como no hay rotación ni semilla, un usuario
que regenere su plan repetidamente **nunca** verá nada distinto a lo que ya
vio la primera vez — ni para explorar contenido fuera de la ventana
alcanzable (sección 6) ni por ninguna otra razón.

---

## 8. Código verbatim — `getExerciseCounts`, `sortGymFirst`, `pickRoundRobin`

`src/lib/plan-generator.ts:55-63`:

```ts
function getExerciseCounts(minutes: number): { compounds: number; isolations: number } {
  if (minutes <= 20) return { compounds: 2, isolations: 1 };
  if (minutes <= 30) return { compounds: 2, isolations: 2 };
  if (minutes <= 45) return { compounds: 3, isolations: 2 };
  if (minutes <= 60) return { compounds: 3, isolations: 3 };
  if (minutes <= 75) return { compounds: 4, isolations: 3 };
  if (minutes <= 90) return { compounds: 4, isolations: 4 };
  return { compounds: 5, isolations: 4 };
}
```

`src/lib/plan-generator.ts:84-93`:

```ts
const GYM_EQUIP_PRIORITY = new Set(['barbellPlates', 'cableMachine', 'legPressMachine', 'dumbbells', 'kettlebells']);

// Para usuarios de gimnasio: coloca ejercicios con carga antes de los de peso corporal
function sortGymFirst(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const aScore = a.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    const bScore = b.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    return bScore - aScore;
  });
}
```

`src/lib/plan-generator.ts:161-179`:

```ts
    const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
      const pools = cats.map(cat =>
        available.filter(e => e.category === cat && e.isCompound === isCompound),
      );
      const result: Exercise[] = [];
      const starts = pools.map(pool => pool.length > 0 ? offset % pool.length : 0);
      const taken  = pools.map(() => 0);
      while (result.length < limit) {
        let anyPicked = false;
        for (let p = 0; p < pools.length && result.length < limit; p++) {
          if (pools[p].length === 0) continue;
          result.push(pools[p][(starts[p] + taken[p]) % pools[p].length]);
          taken[p]++;
          anyPicked = true;
        }
        if (!anyPicked) break;
      }
      return result;
    };
```

---

## 9. Volcado completo verbatim de `src/lib/plan-generator.ts`

Archivo completo, línea 1 a línea 222, sin omitir nada. Dividido en 3
bloques solo por longitud — es continuo, sin saltos.

### Bloque 1/3 — líneas 1-98

```ts
import { EXERCISES, type Exercise, type ExerciseCategory } from './exercises';

export type DayType = 'full_body' | 'push' | 'pull' | 'legs' | 'upper' | 'lower';
export type GoalKey  = 'strength' | 'hypertrophy' | 'fat_loss';

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  reps: string;         // "8-12", "3-5", "60s"
  restSeconds: number;
  isCompound: boolean;
}

export interface PlanDayData {
  dayIndex: number;
  dayType: DayType;
  exercises: PlannedExercise[];
}

export interface GeneratedPlan {
  goalPrimary: string;
  goalSecondary: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  generatedAt: number;
  days: PlanDayData[];
}

interface RepScheme {
  compoundSets: number;
  compoundReps: string;
  compoundRest: number;
  isolationSets: number;
  isolationReps: string;
  isolationRest: number;
}

function getRepScheme(primary: GoalKey, secondary?: GoalKey | null): RepScheme {
  if (primary === 'strength') {
    return secondary === 'hypertrophy'
      ? { compoundSets: 4, compoundReps: '4-6', compoundRest: 150, isolationSets: 3, isolationReps: '8-10', isolationRest: 90 }
      : { compoundSets: 4, compoundReps: '3-5', compoundRest: 180, isolationSets: 3, isolationReps: '6-8', isolationRest: 120 };
  }
  if (primary === 'hypertrophy') {
    return secondary === 'fat_loss'
      ? { compoundSets: 4, compoundReps: '10-12', compoundRest: 75, isolationSets: 3, isolationReps: '12-15', isolationRest: 45 }
      : { compoundSets: 4, compoundReps: '8-12', compoundRest: 90, isolationSets: 3, isolationReps: '10-15', isolationRest: 60 };
  }
  // fat_loss
  return secondary === 'strength'
    ? { compoundSets: 3, compoundReps: '5-8', compoundRest: 120, isolationSets: 3, isolationReps: '12-15', isolationRest: 60 }
    : { compoundSets: 3, compoundReps: '12-15', compoundRest: 60, isolationSets: 3, isolationReps: '15-20', isolationRest: 45 };
}

function getExerciseCounts(minutes: number): { compounds: number; isolations: number } {
  if (minutes <= 20) return { compounds: 2, isolations: 1 };
  if (minutes <= 30) return { compounds: 2, isolations: 2 };
  if (minutes <= 45) return { compounds: 3, isolations: 2 };
  if (minutes <= 60) return { compounds: 3, isolations: 3 };
  if (minutes <= 75) return { compounds: 4, isolations: 3 };
  if (minutes <= 90) return { compounds: 4, isolations: 4 };
  return { compounds: 5, isolations: 4 };
}

function getSplit(daysPerWeek: number): DayType[] {
  switch (daysPerWeek) {
    case 1: return ['full_body'];
    case 2: return ['full_body', 'full_body'];
    case 3: return ['push', 'pull', 'legs'];
    case 4: return ['upper', 'lower', 'upper', 'lower'];
    case 5: return ['push', 'pull', 'legs', 'upper', 'lower'];
    case 6: return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    case 7: return ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'full_body'];
    default: return ['full_body'];
  }
}

function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}

const GYM_EQUIP_PRIORITY = new Set(['barbellPlates', 'cableMachine', 'legPressMachine', 'dumbbells', 'kettlebells']);

// Para usuarios de gimnasio: coloca ejercicios con carga antes de los de peso corporal
function sortGymFirst(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => {
    const aScore = a.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    const bScore = b.equipment.some(e => GYM_EQUIP_PRIORITY.has(e)) ? 1 : 0;
    return bScore - aScore;
  });
}

function safePick<T>(arr: T[], index: number): T | undefined {
  if (!arr.length) return undefined;
  return arr[index % arr.length];
}
```

### Bloque 2/3 — líneas 100-183

```ts
// Solo la barra con discos acepta rangos de fuerza bajos (3-5, 4-6 reps)
const BARBELL_EQUIP = new Set(['barbellPlates']);

// Mancuerna/cable/máquina/kettlebell/peso corporal: mínimo 8-12 reps aunque el objetivo sea fuerza
function getEffectiveReps(exercise: Exercise, planReps: string): string {
  const parts   = planReps.split('-');
  const maxReps = parseInt(parts[parts.length - 1] ?? parts[0], 10);
  if (!isNaN(maxReps) && maxReps < 8) {
    if (exercise.equipment.some(e => BARBELL_EQUIP.has(e))) return planReps; // barra: respeta el esquema
    return '8-12'; // todo lo demás: mínimo 8-12
  }
  return planReps;
}

function buildPlanned(exs: Exercise[], sets: number, reps: string, rest: number, isCompound: boolean): PlannedExercise[] {
  return exs.map(e => ({ exerciseId: e.id, sets, reps: getEffectiveReps(e, reps), restSeconds: rest, isCompound }));
}

function selectExercisesForDay(
  dayType: DayType,
  equipment: string[],
  isGym: boolean,
  counts: { compounds: number; isolations: number },
  scheme: RepScheme,
  offset: number,
): PlannedExercise[] {
  const rawAvailable = EXERCISES.filter(e => canDoExercise(e, equipment, isGym));
  const available = isGym ? sortGymFirst(rawAvailable) : rawAvailable;
  let compounds: Exercise[];
  let isolations: Exercise[];

  if (dayType === 'full_body') {
    const pushC = available.filter(e => e.category === 'push' && e.isCompound);
    const pullC = available.filter(e => e.category === 'pull' && e.isCompound);
    const legsC = available.filter(e => e.category === 'legs' && e.isCompound);
    const chosen: Exercise[] = [];
    const p = safePick(pushC, offset); if (p) chosen.push(p);
    const q = safePick(pullC, offset); if (q) chosen.push(q);
    const l = safePick(legsC, offset); if (l) chosen.push(l);
    if (counts.compounds > 3) {
      const extras = [...pushC, ...pullC, ...legsC].filter(e => !chosen.includes(e));
      chosen.push(...extras.slice(0, counts.compounds - 3));
    }
    compounds = chosen.slice(0, counts.compounds);
    const allIso = available.filter(e =>
      (['push', 'pull', 'legs', 'core'] as ExerciseCategory[]).includes(e.category) && !e.isCompound,
    );
    isolations = allIso.slice(offset % Math.max(allIso.length, 1), offset % Math.max(allIso.length, 1) + counts.isolations);
    if (isolations.length < counts.isolations) {
      isolations = allIso.slice(0, counts.isolations);
    }
  } else {
    const cats: ExerciseCategory[] =
      dayType === 'upper' ? ['push', 'pull'] :
      dayType === 'lower' ? ['legs', 'core']  :
      [dayType as ExerciseCategory];

    // Round-robin: toma 1 ejercicio de cada categoría por vuelta para garantizar
    // que días multi-categoría (upper=push+pull, lower=legs+core) cubran todas las
    // categorías asignadas antes de repetir la primera. Días de una sola categoría
    // (push/pull/legs) se comportan igual que antes: el único pool agota los slots.
    const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
      const pools = cats.map(cat =>
        available.filter(e => e.category === cat && e.isCompound === isCompound),
      );
      const result: Exercise[] = [];
      const starts = pools.map(pool => pool.length > 0 ? offset % pool.length : 0);
      const taken  = pools.map(() => 0);
      while (result.length < limit) {
        let anyPicked = false;
        for (let p = 0; p < pools.length && result.length < limit; p++) {
          if (pools[p].length === 0) continue;
          result.push(pools[p][(starts[p] + taken[p]) % pools[p].length]);
          taken[p]++;
          anyPicked = true;
        }
        if (!anyPicked) break;
      }
      return result;
    };

    compounds  = pickRoundRobin(true,  counts.compounds);
    isolations = pickRoundRobin(false, counts.isolations);
  }

  return [
    ...buildPlanned(compounds,  scheme.compoundSets,  scheme.compoundReps,  scheme.compoundRest,  true),
    ...buildPlanned(isolations, scheme.isolationSets, scheme.isolationReps, scheme.isolationRest, false),
  ];
}
```

### Bloque 3/3 — líneas 191-222

```ts
export function generatePlan(profile: {
  goalPrimary: string;
  goalSecondary?: string | null;
  daysPerWeek: number;
  minutesPerSession: number;
  location: string;
  equipment: string;
}): GeneratedPlan {
  const equipment: string[] = (() => {
    try { return JSON.parse(profile.equipment) as string[]; } catch { return []; }
  })();
  const isGym  = profile.location === 'gym' || profile.location === 'both';
  const scheme = getRepScheme(profile.goalPrimary as GoalKey, profile.goalSecondary as GoalKey | null);
  const counts = getExerciseCounts(profile.minutesPerSession);
  const split  = getSplit(profile.daysPerWeek);

  const days: PlanDayData[] = split.map((dayType, i) => ({
    dayIndex: i,
    dayType,
    exercises: selectExercisesForDay(dayType, equipment, isGym, counts, scheme, i),
  }));

  return {
    goalPrimary:       profile.goalPrimary,
    goalSecondary:     profile.goalSecondary ?? null,
    daysPerWeek:       profile.daysPerWeek,
    minutesPerSession: profile.minutesPerSession,
    generatedAt:       Date.now(),
    days,
  };
}
```

---

## 10. `back` vs `lats` y `core` vs `abs` en `primaryMuscles` — ¿taxonomía consistente o solapada?

Datos obtenidos ejecutando un filtro real sobre `EXERCISES` (279 ejercicios
totales), sin modificar nada.

### 10.1 `back` vs `lats` — conteos y ejemplos

| Tag | Total con el tag en `primaryMuscles` |
|---|---|
| `back` | **34** |
| `lats` | **21** |

**5 ejemplos de `back`:**
- `pull_up` — Dominada prona
- `inverted_row` — Remo invertido
- `db_row` — Remo con mancuerna
- `barbell_row` — Remo con barra
- `db_deadlift` — Peso muerto con mancuernas

**5 ejemplos de `lats`:**
- `pull_up` — Dominada prona
- `chin_up` — Dominada supina
- `inverted_row` — Remo invertido
- `db_row` — Remo con mancuerna
- `barbell_row` — Remo con barra

(Los primeros ejemplos de ambas listas coinciden porque, como muestra 10.3,
la mayoría de los ejercicios con uno de los dos tags también tiene el otro.)

### 10.2 `core` vs `abs` — conteos y ejemplos

| Tag | Total con el tag en `primaryMuscles` |
|---|---|
| `core` | **69** |
| `abs` | **49** |

**5 ejemplos de `core`:**
- `plank` — Plancha
- `side_plank` — Plancha lateral
- `leg_raise` — Elevación de piernas
- `russian_twist` — Giro ruso
- `dead_bug` — Dead bug

**5 ejemplos de `abs`:**
- `plank` — Plancha
- `side_plank` — Plancha lateral
- `crunch` — Crunch abdominal
- `leg_raise` — Elevación de piernas
- `russian_twist` — Giro ruso

### 10.3 ¿Aparecen juntos en el mismo `primaryMuscles`?

**Sí, en ambos pares, y en la mayoría de los casos — no es la excepción.**

| Par | Ejercicios con AMBOS a la vez | % sobre el tag menos frecuente |
|---|---|---|
| `back` + `lats` | **16** | 16/21 = 76% de todos los `lats` también tienen `back` |
| `core` + `abs` | **43** | 43/49 = 88% de todos los `abs` también tienen `core` |

Lista completa de los 16 con `back`+`lats` juntos:

```
pull_up, inverted_row, db_row, barbell_row, trx_row, lat_pulldown,
cable_row, machine_row, dead_hang, scapular_pullup, childs_pose,
ring_row, weighted_vest_pullup, smith_row, assisted_pullup, t_bar_row
```

Muestra de los 43 con `core`+`abs` juntos (lista completa disponible, aquí
una selección representativa de patrones de movimiento distintos):

```
plank, side_plank, leg_raise, russian_twist, dead_bug, mountain_climber,
mountain_climbers, ab_roller, hanging_knee_raise, cable_woodchop,
cable_dead_bug, db_side_bend, trx_plank, trx_fallout, fitball_plank,
slider_body_saw, ring_lsit, parallette_lsit, weighted_vest_plank
```

### 10.4 ¿Hay un patrón real, o es inconsistente?

**`back`/`lats`: NO hay una separación limpia "remo horizontal = back" vs.
"dominada/jalón vertical = lats".** El bloque de "ambos juntos" (16
ejercicios) contradice esa hipótesis directamente — contiene **tanto** remos
horizontales (`barbell_row`, `db_row`, `cable_row`, `machine_row`,
`t_bar_row`, `ring_row`, `smith_row`, `inverted_row`) **como** dominadas y
jalones verticales (`pull_up`, `lat_pulldown`, `dead_hang`,
`scapular_pullup`, `weighted_vest_pullup`, `assisted_pullup`). Ambos
patrones de movimiento reciben el mismo par de tags indistintamente.

Lo que sí distingue el residuo (los que llevan un tag pero no el otro) es
otra cosa:

- **`back` sin `lats` (18 ejercicios):** dos grupos, ninguno relacionado con
  el plano de movimiento. (a) Cadena posterior donde `back` acompaña a
  glúteo/isquios, no a dorsal — `db_deadlift`, `barbell_deadlift`
  (`primaryMuscles: ['back','hamstrings','glutes']`). (b) Movilidad/trabajo
  escapular donde `back` es una etiqueta genérica de "espalda alta" sin
  intención de aislar dorsal — `cat_cow`, `thoracic_open_book`,
  `downdog_to_cobra`, `scapular_retraction`, `band_pull_apart`,
  `prone_swimmers`, `foam_roll_upper_back`, `thread_the_needle_static`,
  `supine_spinal_twist`, `cobra_sphinx_stretch`, `superman`, `ytw_prone`,
  `snow_angel_prone`, `trx_y_raise`.
- **`lats` sin `back` (5 ejercicios):** `chin_up`, `band_straight_arm_pulldown`,
  `lat_stretch_dynamic`, `lat_stretch_static`, `weighted_vest_chinup` — este
  grupo sí es consistente: son movimientos que aíslan específicamente el
  dorsal (jalón de brazos rectos, estiramientos de dorsal) o variantes de
  dominada con agarre supino.

**Hallazgo puntual, no pedido pero relevante:** `pull_up` (agarre prono) y
`chin_up` (agarre supino) — el mismo patrón de movimiento con una sola
variación de agarre — están etiquetados de forma diferente a propósito, no
por inconsistencia: `pull_up.primaryMuscles = ['lats','back']` con
`secondaryMuscles: ['biceps','core']`, mientras que
`chin_up.primaryMuscles = ['biceps','lats']` con
`secondaryMuscles: ['back','core']` — el bíceps sube a primario y la
espalda baja a secundario en la variante supina. Esto se repite de forma
idéntica en el par `weighted_vest_pullup`/`weighted_vest_chinup`, lo que
descarta que sea ruido: es una distinción anatómica real y aplicada de
forma sistemática (el agarre supino implica más bíceps), no una
inconsistencia de etiquetado.

**Conclusión `back`/`lats`:** el catálogo NO usa `back` y `lats` como
sinónimos intercambiables al azar, pero tampoco como un par que codifique
plano de movimiento (horizontal/vertical). El patrón real es: **la mayoría
de los ejercicios de tirón compuesto (remo o dominada/jalón) llevan ambos
tags juntos, de forma redundante**; `lats` en solitario se reserva para un
grupo pequeño y consistente de movimientos que aíslan el dorsal
específicamente; `back` en solitario se usa como etiqueta genérica de
"espalda"/cadena posterior/trabajo escapular en ejercicios que no son
tirones de dorsal (peso muerto, movilidad). El único eje que sí se aplica
con disciplina real es agarre prono vs. supino en dominadas (`pull_up` vs.
`chin_up`), no el eje horizontal/vertical planteado en la pregunta.

**`core`/`abs`: patrón bastante más consistente.** Los 6 ejercicios con
`abs` sin `core` son, sin excepción, la familia "crunch": `crunch`,
`cable_crunch`, `cable_reverse_crunch`, `weighted_crunch`, `fitball_crunch`,
`ab_machine_crunch` — flexión abdominal aislada y directa, sin componente
de estabilización. Los 26 ejercicios con `core` sin `abs` son movimientos de
estabilización/anti-rotación/acarreo o cardio/movilidad donde la flexión
abdominal directa no es la acción principal: `farmers_carry`,
`suitcase_carry`, `kb_farmer_carry`, `kb_suitcase_carry`, `turkish_getup`,
`kb_windmill`, `kb_halo`, `kb_around_the_world`, `pallof_press_band`,
`cable_pallof_press` (anti-rotación/acarreo), más `burpee`, `burpees`,
`jumping_jacks`, `high_knees`, `bear_crawl`, `shadow_boxing`,
`inchworm_walkout`, `torso_twists`, `cat_cow`, `thoracic_open_book`,
`plank_shoulder_taps`, `supine_spinal_twist`, `cobra_sphinx_stretch`,
`med_ball_slam`, `jump_rope` (cardio/movilidad). Los 43 con ambos juntos son
mayoritariamente planchas y variantes anti-extensión/anti-rotación
dinámicas (`plank`, `side_plank`, `dead_bug`, `russian_twist`,
`mountain_climber(s)`, y toda la familia TRX/fitball/slider/anillas/
paralelas de plancha).

**Conclusión `core`/`abs`:** aquí sí hay un patrón claro e interpretable —
`abs` en solitario = flexión abdominal directa y aislada (familia crunch);
`core` en solitario = estabilización, anti-rotación, acarreo cargado o
cardio/movilidad donde el abdomen no es el motor principal del movimiento;
ambos juntos = planchas y ejercicios anti-movimiento que trabajan las dos
cosas a la vez. Es una taxonomía más disciplinada que la de `back`/`lats`.

(Nota al margen, no pedida: `'core'` existe simultáneamente como valor de
`ExerciseCategory` y como valor de `MuscleGroup` — son dos conceptos
distintos con el mismo nombre literal. No afecta a este análisis porque
aquí solo se contó `primaryMuscles`, pero es una fuente potencial de
confusión al leer el código o el catálogo sin este contexto.)

---

## 11. Mapa de propagación — llamadores de `generatePlan()` y `selectExercisesForDay()`

Búsqueda en todo `src/` (y confirmado que `generatePlan`/`selectExercisesForDay`
no se importan ni se referencian fuera de `src/` en ningún script o archivo
de proyecto).

### 11.1 Cada lugar donde se llama a `generatePlan(`

**Un solo lugar en todo el proyecto:**

| Archivo | Línea | ¿Usa `await`? |
|---|---|---|
| `src/store/workout.store.ts` | 112 | **No** (llamada síncrona: `const plan = generatePlan(profile);`) |

Confirmado también por import: `generatePlan` (el valor en tiempo de
ejecución, no el tipo) solo se importa en un archivo de todo `src/`:

```
src/store/workout.store.ts:5: import { generatePlan, type PlannedExercise, type DayType } from '@/lib/plan-generator';
```

El resto de archivos que referencian `plan-generator` (`exercises.ts`,
`training.tsx`, `WorkoutCard.tsx`, `ExerciseCard.tsx`, `muscleTargets.ts`)
solo importan **tipos** (`type PlannedExercise`, `type DayType`) — ninguno
importa ni puede llamar a la función `generatePlan` en tiempo de ejecución.

### 11.2 Cada lugar donde se llama a `selectExercisesForDay(`

**Confirmado: solo dentro de `generatePlan`, ninguna otra llamada existe.**

| Archivo | Línea | Contexto |
|---|---|---|
| `src/lib/plan-generator.ts` | 118 | Definición (`function selectExercisesForDay(...)`) |
| `src/lib/plan-generator.ts` | 210 | Única llamada, dentro de `generatePlan` |

`selectExercisesForDay` **no lleva `export`** (verbatim, sección 9,
bloque 2/3) — no es solo que hoy nadie más la llame, es que ningún otro
archivo del proyecto *podría* importarla aunque quisiera, porque el módulo
no la expone. La cadena de llamadas para esta función termina en el mismo
archivo donde se define.

### 11.3 Propagación de `async`/`await` desde `generatePlan()` hacia arriba

**Nivel 0 — el llamador directo ya es `async`, el `await` es gratis.**

`workout.store.ts:107-112`:

```ts
generateAndSavePlan: async (profile: Profile) => {
  set({ isGenerating: true });
  try {
    // Genera el plan en memoria ANTES de tocar la DB. Si falla aquí, no
    // hay nada que limpiar: los planes existentes siguen intactos.
    const plan = generatePlan(profile);
```

`generateAndSavePlan` ya es `async (profile: Profile) => Promise<void>` (así
declarado también en la interfaz `WorkoutState`, línea 34:
`generateAndSavePlan: (profile: Profile) => Promise<void>;`). Si
`generatePlan` pasara a ser `async function generatePlan(...): Promise<GeneratedPlan>`,
aquí solo haría falta anteponer `await` — **cero propagación** en este nivel:
la función contenedora ya soporta `await` sin ningún cambio de firma.

**Nivel 1 — los 3 llamadores de `generateAndSavePlan(`:**

Búsqueda de `generateAndSavePlan(` (invocación, no la declaración de tipo)
en todo `src/`:

| Archivo | Línea | Código | ¿Ya es `async`/`await`? |
|---|---|---|---|
| `src/app/equipment.tsx` | 223 | `await generateAndSavePlan(pendingProfile.current);` | **Sí** — dentro de `onConfirm={async () => {...}}` (línea 219) |
| `src/app/training.tsx` | 263 | `onPress={() => profile && generateAndSavePlan(profile)}` | **No** — arrow function síncrona, promesa no esperada |
| `src/components/workout/WorkoutCard.tsx` | 70 | `onPress={() => profile && generateAndSavePlan(profile)}` | **No** — mismo patrón, promesa no esperada |

Detalle de cada uno:

- **`equipment.tsx`** (líneas 212-230): el `onConfirm` de `<VulcanDialog>` ya
  es `async () => { ... await generateAndSavePlan(...) ... }`, con
  `try/catch` propio que loguea el error (`console.error('[Equipment] Error
  al regenerar plan:', err)`). Este nivel ya está completamente propagado —
  no requeriría ningún cambio.
- **`training.tsx`** (líneas 261-270) y **`WorkoutCard.tsx`** (líneas 69-83):
  ambos son el `onPress` de un `<Pressable>` que dispara la generación del
  primer plan cuando `!currentPlan`. Ninguno de los dos usa `await` ni
  `.catch()` — es una llamada "fire-and-forget" típica de un handler de UI.
  La actualización visual (`isGenerating`) llega por el estado de Zustand,
  no por esperar la promesa, así que hoy funciona sin `await`. Si
  `generatePlan` pasa a ser async, esto **sigue compilando igual sin cambios**
  (llamar una función `async` sin `await` es válido en TS/JS — la promesa
  queda "flotando"); lo único que NO cambia ni mejora ni empeora es el manejo
  de errores, que ya hoy no está cubierto en estos dos sitios (un error
  dentro de `generateAndSavePlan` ya se propaga hoy como promesa rechazada
  sin capturar en estos dos `onPress` — esto es preexistente, no algo que
  introduciría el cambio a async en `generatePlan`).

**Fin de la cadena.** Ninguno de los tres sitios del Nivel 1 tiene, a su vez,
un llamador que necesite volverse `async`: los tres son manejadores de
eventos de React (`onPress`/`onConfirm`) — el límite natural donde termina
la propagación, porque un componente de React no puede ser `async` y React
no exige que sus handlers lo sean. No hay Nivel 2.

**Resumen del mapa:**

```
generatePlan()                                  [síncrona hoy]
  └─ workout.store.ts:112  (dentro de generateAndSavePlan, YA async)  → await gratis
       └─ generateAndSavePlan()                 [ya async, Promise<void>]
            ├─ equipment.tsx:223   → await generateAndSavePlan(...)   [YA propagado]
            ├─ training.tsx:263    → generateAndSavePlan(...) sin await  [límite de UI, no requiere cambio]
            └─ WorkoutCard.tsx:70  → generateAndSavePlan(...) sin await  [límite de UI, no requiere cambio]
```

**Conclusión:** convertir `generatePlan` (y por tanto `selectExercisesForDay`,
que solo se llama desde dentro de ella) a `async` requiere tocar exactamente
**un** punto de la cadena para que compile sin romper nada — anteponer
`await` en `workout.store.ts:112` — porque su único llamador ya es una
función `async`. No hace falta propagar el cambio a ningún nivel superior;
los tres consumidores de `generateAndSavePlan` ya están en el estado
correcto para su propio patrón de uso (uno con `await` explícito, dos como
disparo de UI sin esperar la promesa, ambos válidos en TypeScript con o sin
que `generatePlan` sea async por dentro).
