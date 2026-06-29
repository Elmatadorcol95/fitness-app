# VARIATION_AUDIT — Días del mismo tipo en splits repiten ejercicios

## 1. Qué es `offset` y qué valor recibe cada día

**Archivo:** `src/lib/plan-generator.ts` — función `generatePlan` (líneas 206-210):

```javascript
const days: PlanDayData[] = split.map((dayType, i) => ({
  dayIndex: i,
  dayType,
  exercises: selectExercisesForDay(dayType, equipment, isGym, counts, scheme, i),
  //                                                                         ↑
  //                                               offset = i = índice de posición en el split
}));
```

`offset` es simplemente el **índice ordinal del día** en el array del split.
No es aleatorio ni derivado del perfil. Se calcula implícitamente con el `i`
del `.map()`.

### Valores concretos en el split de 4 días

`getSplit(4)` devuelve `['upper', 'lower', 'upper', 'lower']`.

| Posición `i` | `dayType` | `offset` recibido |
|---|---|---|
| 0 | `'upper'` | **0** |
| 1 | `'lower'` | **1** |
| 2 | `'upper'` | **2** |
| 3 | `'lower'` | **3** |

Los dos días `'upper'` reciben offsets **0** y **2**. Los dos `'lower'`
reciben **1** y **3**.

---

## 2. Cómo se usa `offset` dentro de `selectExercisesForDay`

### Rama `full_body` — SÍ usa offset (líneas 131-150)

```javascript
const p = safePick(pushC, offset); // → pushC[offset % pushC.length]
const q = safePick(pullC, offset); // → pullC[offset % pullC.length]
const l = safePick(legsC, offset); // → legsC[offset % legsC.length]
// ...
isolations = allIso.slice(offset % allIso.length, ...); // punto de inicio desplazado
```

`safePick` (línea 97) hace `arr[index % arr.length]`, por lo que el offset
desplaza circularmente el punto de inicio de selección.

### Rama `else` (upper / lower / push / pull / legs) — NO usa offset

```javascript
const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
  const pools = cats.map(cat =>
    available.filter(e => e.category === cat && e.isCompound === isCompound),
  );
  const result: Exercise[] = [];
  const indices = pools.map(() => 0);   // ← siempre empieza en 0, offset ignorado
  while (result.length < limit) {
    let anyPicked = false;
    for (let p = 0; p < pools.length && result.length < limit; p++) {
      if (indices[p] < pools[p].length) {
        result.push(pools[p][indices[p]++]);
        anyPicked = true;
      }
    }
    if (!anyPicked) break;
  }
  return result;
};

compounds  = pickRoundRobin(true,  counts.compounds);
isolations = pickRoundRobin(false, counts.isolations);
```

El parámetro `offset` **se recibe pero nunca se lee** en esta rama. Los dos días
`'upper'` (offset=0 y offset=2) llaman a `pickRoundRobin` con `indices = [0, 0]`
en ambos casos → resultado idéntico → **aquí está la raíz del bug**.

---

## 3. Tamaño de los pools por categoría

### Caso GYM (`isGym=true`, todos los ejercicios disponibles)

| Categoría | Compuestos | Aislamientos |
|---|---|---|
| push | **12** | **9** |
| pull | **12** | **10** |
| legs | **15** | **9** |
| core | **1** | **8** |

Con 12 ejercicios compuestos en push y en pull, hay margen amplio para que
los dos días `'upper'` (offset=0 y offset=2) seleccionen compuestos distintos
en ambos pools.

Con 15 compuestos en legs, los dos días `'lower'` también obtendrían piernas
diferentes. Core compuesto solo tiene 1 ejercicio (`mountain_climber`), así
que ese siempre coincide — pero es un único ejercicio accesorio y no cambia
la percepción de variedad.

### Caso PEOR: solo peso corporal (`equipment=[]`, `isGym=false`)

| Categoría | Compuestos | Aislamientos |
|---|---|---|
| push | **2** (push_up, pike_push_up) | **1** (close_grip_push_up) |
| pull | **0** | **3** (superman, ytw_prone, snow_angel_prone) |
| legs | **4** (squat_bw, lunge, hip_thrust_bw, single_leg_rdl_bw) | **3** |
| core | **1** | **6** |

**Pull compuesto = 0.** El round-robin ya no puede elegir ningún compuesto
de pull — el día `'upper'` solo tiene push compuesto. Con `offset % 2`, los
valores 0 y 2 mapean ambos a índice 0 (`2 % 2 = 0`), así que los dos días
`'upper'` seguirían siendo idénticos incluso con el fix. Este es el límite
del catálogo, no del algoritmo.

Para `'lower'`: legs tiene 4 compuestos. offset=1 → índice 1, offset=3 →
índice 3 → `legs[1]` vs `legs[3]` → **diferentes**. Este caso mejora con
el fix.

---

## 4. Riesgo de cobertura

### Cómo garantiza la cobertura el round-robin actual

El round-robin intercala pools en cada vuelta del `while`:

```
vuelta 1 → push[0], pull[0]
vuelta 2 → push[1], pull[1]
...hasta alcanzar `limit`
```

Antes de que ningún pool se agote, se garantiza **al menos 1 ejercicio de
cada categoría**. Si `limit=3` para un día `'upper'`, la secuencia es
`push[0], pull[0], push[1]`: push y pull ambos cubiertos en los primeros
2 slots.

### ¿Un desplazamiento por offset puede romper la cobertura?

Si se cambia `indices = pools.map(() => 0)` a
`indices = pools.map(pool => pool.length > 0 ? offset % pool.length : 0)`:

- **Gym upper (offset=2):** push inicia en 2 (de 12), pull inicia en 2 (de 12).
  La vuelta 1 toma `push[2], pull[2]`, vuelta 2 toma `push[3], pull[3]`.
  Ambas categorías cubierta desde la 1.ª vuelta. ✓

- **Gym lower (offset=3):** legs inicia en 3 (de 15), core inicia en 0 (de 1,
  ya que `3%1=0`). Cobertura legs + core garantizada. ✓

- **Bodyweight upper (offset=2):** push inicia en `2%2=0`, pull pool vacío.
  Mismo resultado que offset=0 — sin mejora, pero tampoco rompe nada. ✓

- **Pool agotado antes del límite:** Si offset=10 en un pool de 12, el pool
  aporta índices 10 y 11 (2 ejercicios), luego se agota. El round-robin
  detecta `!anyPicked` y sale del bucle. El número de ejercicios seleccionados
  puede ser menor que `limit` si todos los pools se agotan, pero esto ocurre
  **exactamente igual que hoy** cuando los pools son pequeños.

El desplazamiento por offset **no puede eliminar una categoría** porque la
cobertura la garantiza el orden de iteración del round-robin (un pool por
vuelta), no el punto de inicio. Si un pool tenía al menos 1 ejercicio antes
del fix, sigue teniéndolo después.

---

## 5. Recomendación

**La palanca mínima y más limpia es cambiar una sola línea en `pickRoundRobin`:**

```javascript
// Antes (igual para todos los días):
const indices = pools.map(() => 0);

// Después (desplaza el inicio según el offset del día):
const indices = pools.map(pool => pool.length > 0 ? offset % pool.length : 0);
```

`offset` ya existe como parámetro de `selectExercisesForDay` y ya llega con el
valor correcto (0, 1, 2, 3). Este cambio hace que el día 2 (`upper`, offset=2)
empiece a tomar compuestos y aislamientos desde la posición 2 del pool en lugar
de la 0, produciendo ejercicios distintos al día 0 (`upper`, offset=0) mientras
el round-robin sigue garantizando que ambas categorías de cada tipo de día
aparezcan antes de repetir ninguna. El fix afecta **únicamente** la función
interna `pickRoundRobin` y no cambia la API ni las firmas de ninguna función.
Para usuarios de solo peso corporal con pools de 2 elementos, la mejora es
parcial (offset%2 puede seguir resolviendo al mismo índice), pero nunca empeora.

---

## Archivos leídos

| Archivo | Motivo |
|---|---|
| `src/lib/plan-generator.ts` | Código completo de `generatePlan`, `selectExercisesForDay`, `pickRoundRobin`, cálculo de `offset` |
| `src/lib/exercises.ts` | Catálogo completo de 78 ejercicios para contar pools por categoría |

**Ningún archivo fue modificado.**
