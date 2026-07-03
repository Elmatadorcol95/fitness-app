# Auditoría: Logros sin series reales + catch vacío en equipment.tsx

**Solo diagnóstico — ningún archivo fue modificado.**

---

## SECCIÓN 1 — Logro concedido sin series reales completadas

### 1.1 Flujo de "finalizar entrenamiento"

La cadena de llamadas es:

```
session.tsx :: handleFinish()
  └─► doFinish()                    [líneas 271-277]
        ├─► finishSession()         [session.store.ts, líneas 461-522]
        ├─► unlockAchievement('personal_record')  [solo si hasPR]
        ├─► recordWorkout(today)    [gamification.store.ts, líneas 99-131]
        └─► advanceDayIndex()
```

### 1.2 Código verbatim: `doFinish` — sin guard de series

```typescript
// session.tsx, líneas 271-277
const doFinish = useCallback(async () => {
  const today = new Date().toISOString().split('T')[0];
  const { hasPR } = await finishSession();
  if (hasPR) unlockAchievement('personal_record');
  recordWorkout(today);        // ← llamada INCONDICIONAL
  await advanceDayIndex();
}, [finishSession, unlockAchievement, recordWorkout, advanceDayIndex]);
```

`recordWorkout(today)` se llama siempre, independientemente de si el usuario
completó alguna serie.

### 1.3 Código verbatim: `recordWorkout` — concede los 6 logros basados en contador

```typescript
// gamification.store.ts, líneas 99-131
recordWorkout: async (date: string) => {
  const { streak, longestStreak, totalWorkouts, lastWorkoutDate, unlockAchievement } = get();
  const newTotal = totalWorkouts + 1;          // ← siempre +1, sin verificar series

  let newStreak: number;
  if (!lastWorkoutDate) {
    newStreak = 1;
  } else {
    const diffDays = Math.round(
      (new Date(date).getTime() - new Date(lastWorkoutDate).getTime()) / 86_400_000,
    );
    if (diffDays === 0) newStreak = streak;
    else if (diffDays === 1) newStreak = streak + 1;
    else newStreak = 1;
  }
  const newLongest = Math.max(longestStreak, newStreak);

  await Promise.all([
    setMeta('streak', String(newStreak)),
    setMeta('longest_streak', String(newLongest)),
    setMeta('total_workouts', String(newTotal)),
    setMeta('last_workout_date', date),
  ]);
  set({ streak: newStreak, longestStreak: newLongest, totalWorkouts: newTotal, lastWorkoutDate: date });

  const unlocked = new Set(get().unlockedAchievements);
  if (newTotal >= 1)  await autoUnlock('first_spark',    unlocked, unlockAchievement);
  if (newTotal >= 10) await autoUnlock('apprentice',     unlocked, unlockAchievement);
  if (newTotal >= 25) await autoUnlock('journeyman',     unlocked, unlockAchievement);
  if (newTotal >= 50) await autoUnlock('master',         unlocked, unlockAchievement);
  if (newStreak >= 7)  await autoUnlock('incandescent',  unlocked, unlockAchievement);
  if (newStreak >= 30) await autoUnlock('tempered_steel', unlocked, unlockAchievement);
},
```

Ninguna condición aquí verifica si el entrenamiento tuvo series reales.

### 1.4 ¿Existe en el flujo una verificación de "al menos una serie real"?

Sí existe, pero únicamente dentro de `finishSession()` para el cálculo de
progresión y detección de PR:

```typescript
// session.store.ts, líneas 509-514
const result = await runProgressionAfterSession(planId, exercises.map(ex => ({
  exerciseId:    ex.exerciseId,
  planRepsMin:   ex.planRepsMin,
  planRepsMax:   ex.planRepsMax,
  planSets:      ex.planSets,
  completedSets: ex.sets.filter(s => s.completed).map(s => ({    // ← SÍ filtra
    actualReps: s.actualReps, weightKg: s.weightKg, rir: s.rir
  })),
})));
hasPR = result.hasPR;
```

Este filtro `s.completed` sí protege el logro `personal_record`: si no hay
series completadas, `completedSets` está vacío y `hasPR` devuelve `false`.

**El filtro no se aplica a `recordWorkout()`** porque esa llamada es
posterior, independiente y sin parámetro de series completadas.

### 1.5 Tabla: todos los logros y su guard de series reales

| Logro | Condición de desbloqueo | ¿Guard de series reales? |
|---|---|---|
| `first_spark` | `newTotal >= 1` en `recordWorkout()` | **NO** |
| `apprentice` | `newTotal >= 10` en `recordWorkout()` | **NO** |
| `journeyman` | `newTotal >= 25` en `recordWorkout()` | **NO** |
| `master` | `newTotal >= 50` en `recordWorkout()` | **NO** |
| `incandescent` | `newStreak >= 7` en `recordWorkout()` | **NO** |
| `tempered_steel` | `newStreak >= 30` en `recordWorkout()` | **NO** |
| `personal_record` | `hasPR === true` devuelto por `finishSession()` | **SÍ** — vía `filter(s => s.completed)` en la progresión |

### 1.6 Hipótesis de causa raíz

**Hipótesis (no conclusión):** El bug es de diseño, no de descuido de
implementación. `recordWorkout()` se diseñó como contador de sesiones
_iniciadas y guardadas_, no de series _completadas_. El guardado de la sesión
en `workoutSessions` (`db.insert(workoutSessions)`) tampoco requiere series:
se inserta igualmente aunque no haya datos en `sessionSets`. El flujo nunca
conectó el "¿completaste algo?" con el "¿cuento este entreno?".

El patrón afecta a los 6 logros basados en contador/racha y es estructural:
no hay un punto de decisión común que pueda simplemente añadir la condición;
hay que decidir en `doFinish()` si llamar a `recordWorkout()` o no, basándose
en el número de series completadas antes de llamarla.

---

## SECCIÓN 2 — `catch {}` vacío en equipment.tsx

### 2.1 Todos los bloques try/catch en el flujo de regeneración

#### Bloque A — `handleSave` (líneas 84-91): `try/finally`, sin catch

```typescript
// equipment.tsx, líneas 84-91
setSaving(true);
try {
  await updateEquipmentAndLocation(location, equipment);
  pendingProfile.current = { ...profile, location, equipment: JSON.stringify(equipment) };
  setRegenOpen(true);
} finally {
  setSaving(false);   // ← solo garantiza que el spinner se apaga
}
```

No hay `catch`. Un error en `updateEquipmentAndLocation` (fallo de SQLite,
constraint, etc.) burbujea como `Promise` no manejada. El efecto visible: el
spinner desaparece (`finally`) pero el diálogo de regeneración nunca abre y
el usuario no recibe ningún mensaje de error.

#### Bloque B — `onConfirm` del VulcanDialog (líneas 198-203): **catch vacío real**

```typescript
// equipment.tsx, líneas 198-203
onConfirm={async () => {
  setRegenOpen(false);
  if (pendingProfile.current) {
    try { await generateAndSavePlan(pendingProfile.current); } catch {}   // ← VACÍO
  }
  useProfileStore.getState().closeEquipment();
}}
```

Este `catch {}` es el hallazgo principal. No hay `console.error`, no hay
estado de error, no hay propagación.

### 2.2 ¿Qué operaciones ocurren dentro de ese `try` y qué podría fallar?

`generateAndSavePlan()` ejecuta, en orden, en `workout.store.ts` (líneas 107-168):

1. `db.update(workoutPlans).set({ isActive: 0 })` — desactiva TODOS los planes activos.
2. `generatePlan(profile)` — algoritmo de generación (puede lanzar si el perfil
   está incompleto o un valor es inesperado).
3. `db.insert(workoutPlans).values(...)` — crea el nuevo plan.
4. `db.select()...from(workoutPlans)...` — recupera el plan recién insertado.
5. Bucle `for (const day of plan.days)` → `db.insert(planDays).values(...)` — inserta
   cada día del ciclo.
6. `db.select()...from(planDays)...` — relectura de filas para obtener IDs.
7. `saveActiveDayIndex(0)` — escribe en `gamification_meta`.
8. `set({ currentPlan: ... })` — actualiza el store en memoria.

Si cualquier operación de los pasos 2-8 falla después del paso 1, el resultado
es un estado inconsistente: **todos los planes anteriores están desactivados y
el nuevo no existe o está incompleto**. El usuario vería la pestaña Entreno
sin plan, sin ningún mensaje de error.

### 2.3 ¿Fue intencional el catch vacío?

No hay comentario ni variable que sugiera intencionalidad. El patrón más
probable es que el `catch {}` se añadió para evitar que un error de
regeneración impidiera cerrar la pantalla (`closeEquipment()` está fuera del
try), pero se omitió el logging por descuido. No hay código muerto ni
`TODO` alrededor.

### 2.4 El mismo patrón en archivos relacionados

| Archivo | Catch vacío | Contexto |
|---|---|---|
| `session.store.ts:100` | `} catch {}` | `saveCustomRest()` — falla al guardar preferencia de descanso en SQLite. Poco crítico: solo afecta al valor recordado entre sesiones. |
| `session.store.ts:517` | `} catch {}` | `runProgressionAfterSession()` — falla en el cálculo de progresión o en la escritura a `exercise_targets`. Si falla, se pierden los datos de progresión de la sesión silenciosamente. Moderadamente crítico. |
| `session.store.ts:497` | `} catch { try { ... } catch (err2) { console.error(...) } }` | Fallback de inserción de serie (sin columnas nuevas si fallan). El catch _interno_ sí loguea. **No vacío.** |
| `session.store.ts:89-93` | `} catch { return null; }` | `getCustomRest()` — operación de lectura; devolver null es un fallback razonable. **No un descuido.** |
| `session.store.ts:112-114` | `} catch { return {...} }` | `getLastSetData()` — operación de lectura; fallback razonable. **No un descuido.** |
| `session.store.ts:125-127` | `} catch { return {...} }` | `getTargetFromProgression()` — lectura; fallback razonable. **No un descuido.** |

**Resumen:** El `catch {}` verdaderamente problemático (sin logging ni fallback)
aparece en tres lugares:
1. `equipment.tsx:201` — regeneración de plan (mayor impacto: estado inconsistente).
2. `session.store.ts:100` — guardar preferencia de descanso (bajo impacto).
3. `session.store.ts:517` — progresión de cargas (impacto moderado: pérdida silenciosa de datos de entrenamiento).

---

## SECCIÓN 3 — Datos disponibles para umbrales duales (logros 100% / racha 50%)

### 3.1 ¿Hay acceso al total planeado y completado antes de llamar a `recordWorkout()`?

**No** en el punto donde se llama `recordWorkout()`. La razón es que
`finishSession()` termina con `set({ ...EMPTY_STATE })`, que vacía `exercises`
antes de devolver el control a `doFinish()`:

```typescript
// session.store.ts, líneas 520-521
set({ ...EMPTY_STATE });   // ← exercises = [] a partir de aquí
return { hasPR };
```

```typescript
// session.tsx, líneas 272-277
const doFinish = useCallback(async () => {
  const today = new Date().toISOString().split('T')[0];
  const { hasPR } = await finishSession();   // EMPTY_STATE ya aplicado
  if (hasPR) unlockAchievement('personal_record');
  recordWorkout(today);   // exercises ya vacías en el store
  await advanceDayIndex();
}, [...]);
```

**Sí** dentro de `finishSession()`, ANTES del `set({ ...EMPTY_STATE })`.
La desestructuración al inicio del método captura las series completas:

```typescript
// session.store.ts, líneas 461-466  — VERBATIM
finishSession: async () => {
  const { planId, planDayId, startTime, exercises } = get();
  //                                    ^^^^^^^^^
  //  Aquí exercises tiene la estructura completa con todos los sets.
  //  La siguiente expresión daría los totales que necesitamos:
  //    total planeado:   exercises.reduce((a, ex) => a + ex.sets.length, 0)
  //    total completado: exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0)
  const durationSeconds = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
  ...
```

Estructura completa de `ExerciseState` (verbatim de `session.store.ts`, líneas 23-34):

```typescript
export interface ExerciseState {
  exerciseId: string;
  restSeconds: number;
  sets: SetState[];      // ← array con TODOS los sets (completados y no)
  note: string;
  lastReps: number | null;
  lastWeightKg: number | null;
  planRepsMin: number;
  planRepsMax: number;
  planSets: number;      // ← número de sets según el plan (fuente de verdad del planificador)
  targetRir: number;
}

export interface SetState {
  setNumber: number;
  targetReps: number;
  actualReps: number;
  weightKg: number;
  rir: number;
  completed: boolean;    // ← flag de la serie
  coachReason?: string;
}
```

Para un umbral "al menos 1 serie completada" o "X% de las series planeadas",
la información está disponible dentro de `finishSession()`. La forma más
limpia sería que `finishSession()` devuelva `{ hasPR, completedSetsTotal }`
(o un boolean `hasAnyRealWork`) y que `doFinish()` lo use para decidir si
llamar a `recordWorkout()`.

### 3.2 Usos de `totalWorkouts` en todo el proyecto

| Archivo | Línea | Uso |
|---|---|---|
| `gamification.store.ts` | 37, 74, 92, 100-101, 119, 122, 159 | Definición, init, lectura DB, cálculo, persistencia, reset |
| `history.tsx` | 247 | `useGamificationStore(s => s.totalWorkouts)` — dep reactiva para recargar el historial al terminar entreno |
| `history.tsx` | 308 | En el array de deps del `useEffect` — no se muestra |
| `StreakWidget.tsx` | 25, 55-57 | **Mostrado al usuario** — número grande junto a ícono barbell en pantalla Hoy |
| `RecapModal.tsx` | 58, 105, 124, 172-173 | **Mostrado al usuario** — tarjeta "Entrenamientos" en el resumen mensual/semanal; también controla el texto de elogio |

`totalWorkouts` aparece visible en la UI en dos lugares: `StreakWidget` (pantalla Hoy)
y `RecapModal` (resumen). Un entreno registrado sin series reales infla ambos contadores.

### 3.3 Usos de `streak` y `longestStreak` en todo el proyecto

| Variable | Archivo | Línea | Uso |
|---|---|---|---|
| `streak` | `gamification.store.ts` | 35, 72, 83, 90, 100, 110-112, 117, 122, 159 | Definición, init, lectura DB, cálculo, persistencia, reset |
| `streak` | `StreakWidget.tsx` | 25, 33, 41-46 | **Mostrado al usuario** — número grande con ícono llama (animada por tamaño) en pantalla Hoy |
| `streak` | `RecapModal.tsx` | 58, 104, 125, 177-180 | **Mostrado al usuario** — tarjeta racha en resumen; controla texto de elogio |
| `longestStreak` | `gamification.store.ts` | 36, 73, 84, 91, 100, 114, 118, 122, 159 | Definición, init, lectura DB, cálculo, persistencia, reset |
| `longestStreak` | (ningún otro archivo) | — | **Nunca mostrado al usuario.** Solo se persiste en `gamification_meta` como `longest_streak`. No se lee en ningún componente ni pantalla. |

### 3.4 Fiabilidad del flag `completed` en una serie

El flag puede quedar `true` con datos "vacíos" en ciertos casos límite. El
código de la Pressable de la marca (verbatim de `session.tsx`, líneas 147-161):

```typescript
// session.tsx, líneas 147-161
<Pressable onPress={() => {
  const rVal = parseInt(repsStr, 10);
  if (!isNaN(rVal) && rVal > 0) onChangeReps(rVal);   // ← reps > 0 requerido
  const kVal = parseFloat(kgStr);
  if (!isNaN(kVal) && kVal >= 0) onChangeWeight(kVal); // ← kVal >= 0, acepta 0
  const rirVal = parseInt(rirStr, 10);
  if (!isNaN(rirVal) && rirVal >= 0) onChangeRir(rirVal);
  onComplete();
}} style={[styles.checkBtn, completed && styles.checkBtnDone]}>
```

Y en `completeSet()` (verbatim de `session.store.ts`, líneas 350-389):

```typescript
// session.store.ts, líneas 350-357
completeSet: (exIdx, setIdx) => {
  const exercises    = [...get().exercises];
  const ex           = { ...exercises[exIdx] };
  const sets         = [...ex.sets];
  const wasCompleted = sets[setIdx].completed;

  sets[setIdx] = { ...sets[setIdx], completed: !wasCompleted };  // toggle puro
  ...
```

**Análisis:**
- El toggle es puro: `completed = !wasCompleted`. No hay validación de contenido.
- La Pressable sí flushea los campos antes de `onComplete()`, pero la validación
  de reps exige `rVal > 0`, mientras que la de kg solo exige `kVal >= 0`.
- **Caso susceptible (ejercicio cargado, primera sesión):** Si el usuario no
  escribe nada en el campo kg (queda en `0` por `buildSetState` cuando no hay
  historial) y marca la serie, `completed = true` con `weightKg = 0`.
- **Caso normal (peso corporal):** `weightKg = 0` es legítimo, la serie
  completada tiene significado real.
- **Reps:** `buildSetState` inicializa `actualReps: targetReps` (≈ 10), así que
  incluso sin editar el campo, las reps son coherentes con el plan.

Conclusión: `completed = true` con `weightKg = 0` en ejercicios cargados es
posible pero corresponde al escenario de calibración (primera sesión). No es
un vector fiable para detectar "serie fantasma", ya que algunos ejercicios
cargados usan 0 kg legítimamente (ej. peso corporal asistido).

---

## SECCIÓN 4 — Historial: granularidad de series, no de sesión

### 4.1 ¿Se insertan todas las series o solo las completadas?

Se insertan **todas las series**, completadas o no. Verbatim de
`session.store.ts`, líneas 486-503:

```typescript
// session.store.ts, líneas 486-503
let setsCount = 0;
for (const ex of exercises) {
  for (const s of ex.sets) {           // ← itera TODAS las series sin filtro
    const base = {
      sessionId: session.id, exerciseId: ex.exerciseId, setNumber: s.setNumber,
      targetReps: s.targetReps, actualReps: s.actualReps, weightKg: s.weightKg,
      completed: s.completed ? 1 : 0,  // ← el flag se persiste, pero no filtra
      createdAt: Date.now(),
    };
    try {
      await db.insert(sessionSets).values({ ...base, weightTargetKg: s.weightKg, perceivedEffort: s.rir });
    } catch {
      try { await db.insert(sessionSets).values(base); } catch (err2) {
        console.error('[Session] ERROR serie:', err2);
      }
    }
    setsCount++;
  }
}
```

### 4.2 Consulta y agrupación en la pantalla de historial

**Carga de resumen** (`history.tsx`, líneas 258-300) — sin filtro por `completed`
en la query, pero sí en la agregación:

```typescript
// history.tsx, líneas 269-278 — query sin filtro completed
const setRows = await db
  .select({
    sessionId: sessionSets.sessionId,
    exerciseId: sessionSets.exerciseId,
    actualReps: sessionSets.actualReps,
    weightKg:   sessionSets.weightKg,
    completed:  sessionSets.completed,
  })
  .from(sessionSets)
  .where(inArray(sessionSets.sessionId, ids));   // ← todas las series de esas sesiones

// history.tsx, líneas 280-291 — agrupación
for (const r of setRows) {
  if (!exBySession[r.sessionId]) exBySession[r.sessionId] = new Set();
  exBySession[r.sessionId].add(r.exerciseId);    // ← SIN filtro completed → cualquier
                                                  //   ejercicio con sets (incluso vacíos)
                                                  //   queda en el Set
  if (r.completed) {                             // ← setsCompleted y volume SÍ filtran
    setsBySession[r.sessionId] = (setsBySession[r.sessionId] ?? 0) + 1;
    const vol = (r.weightKg ?? 0) * (r.actualReps ?? 0);
    volBySession[r.sessionId] = (volBySession[r.sessionId] ?? 0) + vol;
  }
}
```

**Carga de detalle expandible** (`history.tsx`, `loadDetails()`, líneas 147-183) —
también sin filtro en la query, pero con filtro en el render:

```typescript
// history.tsx, líneas 149-158 — query sin filtro
const rows = await db
  .select({ exerciseId, setNumber, actualReps, weightKg, completed })
  .from(sessionSets)
  .where(eq(sessionSets.sessionId, session.id));   // ← todas las series
```

```typescript
// history.tsx, líneas 94-95 — ExerciseDetailRow: sí filtra para el resumen
const completedSets = detail.sets.filter(s => s.completed);
const setsStr = completedSets.length > 0
  ? (...)
  : (lang === 'es' ? 'Sin completar' : 'Not completed');   // ← muestra etiqueta, no oculta
```

### 4.3 ¿Fix de inserción o de consulta?

La inserción de todas las series (completadas y no) es **intencionada y correcta**:
sirve al algoritmo de progresión y al coach. El `completed` flag ya está en
la tabla para discriminarlas. **No hay que tocar la inserción.**

El problema es de **renderizado**: `ExerciseDetailRow` se muestra para
cada ejercicio en `details`, incluyendo los que tienen 0 series completadas,
mostrando "Sin completar". Lo que debe cambiar es el filtrado de la lista
antes de renderizar, por ejemplo en `loadDetails()`:

```typescript
// Propuesta (no implementada aún) — tras construir exerciseOrder/byExercise:
setDetails(
  exerciseOrder
    .map(id => ({ exerciseId: id, sets: byExercise[id], volume: ... }))
    .filter(d => d.sets.some(s => s.completed))   // ← excluir ejercicios sin ninguna serie real
);
```

### 4.4 ¿Un ejercicio con 0 series completadas desaparecería con un filtro simple?

**Sí, automáticamente.** No existen registros separados de "ejercicio
intentado" en `session_sets` o en ninguna otra tabla. La única presencia de
un ejercicio en una sesión son sus filas en `session_sets`. Si todas esas
filas tienen `completed = 0`, el filtro `d.sets.some(s => s.completed)`
devuelve `false` y el ejercicio queda excluido del array `details`. No hace
falta lógica adicional ni limpieza de datos.

---

## SECCIÓN 5 — Viabilidad de transacción para equipment.tsx

### 5.1 Versiones

| Librería | Versión (package.json) |
|---|---|
| `drizzle-orm` | `^0.45.2` |
| `expo-sqlite` | `~56.0.4` |
| `drizzle-kit` | `^0.31.10` (solo tooling, no runtime) |

La base de datos se inicializa en `src/db/index.ts`:

```typescript
// src/db/index.ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';

export const sqlite = SQLite.openDatabaseSync('fitness.db');
export const db = drizzle(sqlite, { schema });
```

### 5.2 ¿Soporta `db.transaction()`? ¿Hay precedente?

`drizzle-orm/expo-sqlite` expone `db.transaction(async (tx) => { ... })`
desde versiones anteriores a la 0.45.x. La API es:

```typescript
await db.transaction(async (tx) => {
  await tx.update(workoutPlans).set({ isActive: 0 });
  await tx.insert(workoutPlans).values({ ... });
  // Si cualquier operación falla, el rollback es automático
});
```

**Sin embargo, no hay ningún precedente de uso en el proyecto.** El grep de
`db.transaction` en `src/` devuelve cero resultados. Todos los flujos actuales
(generación de plan, inserción de series, progresión) ejecutan las operaciones
DB de forma secuencial sin transacción.

Esto significa que:
1. La API existe y funciona con las versiones instaladas.
2. No hay riesgo de incompatibilidad conocida (expo-sqlite 56 + drizzle 0.45).
3. No hay que añadir ninguna dependencia ni recompilar.
4. Habría que verificar en un dispositivo real que `openDatabaseSync` (en lugar de
   `openDatabaseAsync`) es compatible con el API de transacciones de Drizzle en
   expo-sqlite 56, ya que algunas versiones previas del driver solo soportaban
   transacciones con la versión asíncrona.

### 5.3 Schema de `workoutPlans`: ¿algún constraint sobre `isActive`?

Verbatim de `src/db/schema.ts`, líneas 82-90:

```typescript
export const workoutPlans = sqliteTable('workout_plans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  goalPrimary: text('goal_primary').notNull(),
  goalSecondary: text('goal_secondary'),
  daysPerWeek: integer('days_per_week').notNull(),
  minutesPerSession: integer('minutes_per_session').notNull(),
  isActive: integer('is_active').notNull().default(1),
  generatedAt: integer('generated_at').notNull(),
});
```

**No hay `UNIQUE` ni ningún otro constraint sobre `isActive`.** Varias filas
pueden tener `isActive = 1` simultáneamente (de hecho, un plan recién creado
se inserta con `default(1)` antes de que los planes viejos sean desactivados,
si se usara el orden inverso). El constraint no complica usar una transacción:

- Estrategia actual: desactivar primero (UPDATE), luego insertar → sin overlap
- Estrategia alternativa (más segura): insertar nuevo plan, luego desactivar
  viejos excluyendo el recién creado → también funciona sin constraint

Ambas estrategias son viables dentro de una transacción. La única diferencia
semántica sería el breve momento entre operaciones donde `isActive = 1` podría
tener más de una fila (en la estrategia alternativa), pero sin UNIQUE eso es
inofensivo.

---

## SECCIÓN 6 — Historial no se refresca tras sesión <50%

**Contexto:** tras el refactor de hoy que separó el gating de logros (100%)
del contador de racha/esfuerzo visible (≥50%), `recordWorkout()` ya no se
llama para sesiones con menos del 50% de series completadas. Se observó que
esas sesiones se guardan correctamente en `workout_sessions` pero no aparecen
de inmediato en la pantalla de Historial; solo aparecen (todas de golpe) en
cuanto se termina una sesión posterior con ≥50%.

### 6.1 Mecanismo exacto de recarga del historial

Es un `useEffect` estándar de React (no `useFocusEffect`, no listener de
navegación). El grep de `useFocusEffect` en `history.tsx` y en **todo el
proyecto** no devuelve resultados — este patrón no se usa en ningún archivo
de Vulcan.

Verbatim de `history.tsx`, componente `HistoryScreen`, líneas 243-308:

```typescript
// history.tsx, líneas 243-308 — VERBATIM
export default function HistoryScreen() {
  const { t, i18n } = useTranslation();
  const lang = normLang(i18n.language);

  const totalWorkouts = useGamificationStore(s => s.totalWorkouts);
  const { profile }   = useProfileStore();
  const isImperial    = profile?.units === 'imperial';
  const isDbReady     = useProfileStore(s => s.isDbReady);

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!isDbReady) return;
    (async () => {
      setLoading(true);
      try {
        const rows = await db
          .select()
          .from(workoutSessions)
          .orderBy(desc(workoutSessions.id))
          .limit(50);

        if (rows.length === 0) { setSessions([]); return; }

        const ids = rows.map(r => r.id);
        const setRows = await db
          .select({
            sessionId: sessionSets.sessionId,
            exerciseId: sessionSets.exerciseId,
            actualReps: sessionSets.actualReps,
            weightKg:   sessionSets.weightKg,
            completed:  sessionSets.completed,
          })
          .from(sessionSets)
          .where(inArray(sessionSets.sessionId, ids));

        const exBySession:  Record<number, Set<string>> = {};
        const setsBySession:Record<number, number> = {};
        const volBySession: Record<number, number> = {};
        for (const r of setRows) {
          if (!exBySession[r.sessionId]) exBySession[r.sessionId] = new Set();
          exBySession[r.sessionId].add(r.exerciseId);
          if (r.completed) {
            setsBySession[r.sessionId] = (setsBySession[r.sessionId] ?? 0) + 1;
            const vol = (r.weightKg ?? 0) * (r.actualReps ?? 0);
            volBySession[r.sessionId] = (volBySession[r.sessionId] ?? 0) + vol;
          }
        }

        setSessions(rows.map(r => ({
          id:              r.id,
          date:            r.date,
          durationSeconds: r.durationSeconds ?? null,
          exerciseIds:     Array.from(exBySession[r.id] ?? new Set()),
          setsCompleted:   setsBySession[r.id] ?? 0,
          totalVolume:     volBySession[r.id] ?? 0,
        })));
      } catch (err) {
        console.error('[History] error:', err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [totalWorkouts, isDbReady]);
```

### 6.2 ¿Las dependencias incluyen algo del store de gamificación?

**Sí.** El array de dependencias es `[totalWorkouts, isDbReady]`
(`history.tsx:308`). `totalWorkouts` es un selector directo de
`useGamificationStore` (`history.tsx:247`):

```typescript
const totalWorkouts = useGamificationStore(s => s.totalWorkouts);
```

`isDbReady` viene de `useProfileStore` y se fija una sola vez al arrancar la
app (`profile.store.ts:59,64` — `isDbReady: false` inicial, `setDbReady`
lo pone en `true` tras las migraciones); no cambia por sesión. En la práctica,
la única dependencia que vuelve a disparar el efecto **después del arranque**
es `totalWorkouts`.

No hay ninguna suscripción directa a la tabla `workout_sessions` ni a ningún
store de sesión/entreno (`session.store.ts`, `workout.store.ts`). El array de
`sessions` en pantalla se recalcula únicamente cuando `totalWorkouts` cambia
de valor.

### 6.3 ¿`recordWorkout()` se llamaba siempre antes del refactor de hoy?

**Sí, confirmado.** Antes del refactor de hoy, `doFinish()` en `session.tsx`
llamaba `recordWorkout(today)` de forma incondicional al terminar cualquier
sesión, sin importar cuántas series se hubieran completado (ver SECCIÓN 1.2
de este mismo documento, y confirmado también en la conversación de hoy antes
del cambio). Y dentro de `recordWorkout()`, `newTotal = totalWorkouts + 1`
también era incondicional (SECCIÓN 1.3) — cualquier sesión finalizada, tuviera
o no series reales, incrementaba `totalWorkouts` en 1.

**Es más que plausible, es la causa confirmada:** el refresco del historial
nunca dependió de "¿hay una sesión nueva en la tabla `workout_sessions`?"
sino de "¿cambió `totalWorkouts`?". Antes de hoy ambas condiciones coincidían
siempre (toda sesión terminada disparaba las dos), por lo que el acoplamiento
indebido era invisible. Tras el refactor de hoy, `recordWorkout()` —y por
tanto el cambio de `totalWorkouts`— solo ocurre si `completedSets / plannedSets
>= 0.5`. Una sesión <50% queda guardada en SQLite pero no incrementa
`totalWorkouts`, así que el `useEffect` de `history.tsx` nunca se re-dispara
para ella. La sesión existe en la base de datos desde el primer momento; el
problema es puramente de re-renderizado en pantalla, no de persistencia.

Cuando llega una sesión posterior que sí alcanza ≥50%, `totalWorkouts` cambia,
el efecto se dispara, y como la query siempre trae **las últimas 50 sesiones
completas** (`orderBy(desc(workoutSessions.id)).limit(50)`, sin filtro
incremental), aparecen de golpe tanto la sesión nueva como todas las <50%
pendientes que quedaron "invisibles" mientras tanto.

### 6.4 ¿Existe otro punto que debería disparar el refresco y nunca se conectó?

**Sí.** `doFinish()` llama a `advanceDayIndex()` (`workout.store.ts:196-202`)
de forma **incondicional**, sin importar el porcentaje de series completadas
— a diferencia de `recordWorkout()`, esta llamada no tiene ningún guard de
`ratio >= 0.5`:

```typescript
// session.tsx — doFinish() actual
const doFinish = useCallback(async () => {
  const today = new Date().toISOString().split('T')[0];
  const { hasPR, completedSets, plannedSets } = await finishSession();
  if (hasPR) unlockAchievement('personal_record');

  const ratio = plannedSets > 0 ? completedSets / plannedSets : 0;
  if (ratio >= 0.5) {
    const perfect = plannedSets > 0 && completedSets === plannedSets;
    recordWorkout(today, { perfect });
  }

  await advanceDayIndex();   // ← SIEMPRE se ejecuta, sin guard de ratio
}, [finishSession, unlockAchievement, recordWorkout, advanceDayIndex]);
```

```typescript
// workout.store.ts, líneas 196-202 — VERBATIM
advanceDayIndex: async () => {
  const { currentPlan } = get();
  if (!currentPlan) return;
  const next = currentPlan.activeDayIndex + 1;
  await saveActiveDayIndex(next);
  set({ currentPlan: { ...currentPlan, activeDayIndex: next } });
},
```

`currentPlan.activeDayIndex` (en `useWorkoutStore`) cambia en **toda** sesión
finalizada, sin excepción — es decir, sería una señal más fiable que
`totalWorkouts` para disparar el refresco del historial, ya que no depende
del umbral de gamificación.

**Sin embargo, `history.tsx` no importa ni se suscribe a `useWorkoutStore`
en ningún punto** (grep de `useWorkoutStore` en `history.tsx` → cero
resultados). Esta señal, aunque existe y es incondicional, nunca se conectó
al historial.

**Conclusión:** el acoplamiento del refresco del historial a `totalWorkouts`
no es una regresión introducida hoy — es un acoplamiento indebido preexistente
que **siempre existió** desde que se implementó `history.tsx` (Lote A+B, ver
"Estado actual" en `CLAUDE.md`). El refactor de hoy no rompió nada que
funcionara por diseño; simplemente **dejó de enmascarar** un bug estructural
que ya estaba ahí: el historial nunca tuvo un mecanismo de refresco propio
(ni `useFocusEffect`, ni suscripción a `workoutSessions`/`useWorkoutStore`,
ni polling) — tomó prestado, de forma no intencional, el cambio de estado de
otro store cuyo propósito es completamente distinto (gamificación).

---

## SECCIÓN 7 — Cliente Drizzle: inicialización y atomicidad de `.transaction()`

**Solo diagnóstico — ningún archivo de código fue modificado. Esta sección se añadió únicamente a este audit.**

### 7.1 Ubicación e inicialización verbatim

Único punto de inicialización en todo el proyecto: `src/db/index.ts` (archivo completo, 9 líneas):

```typescript
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const sqlite = SQLite.openDatabaseSync('fitness.db');
export const db = drizzle(sqlite, { schema });

export { schema };
```

- Driver: `expo-sqlite` v56.0.4 (confirmado en `node_modules/expo-sqlite/package.json`).
- ORM: `drizzle-orm` v0.45.2 (confirmado en `node_modules/drizzle-orm/package.json`).
- Conexión **síncrona** (`openDatabaseSync`), no `openDatabaseAsync`. No hay ningún otro archivo en el proyecto que llame a `drizzle(...)` (`grep -r "drizzle("` → único hit en `src/db/index.ts`).

### 7.2 ¿El objeto `db` expone `.transaction()` directamente?

**Sí.** Cadena de tipos verificada en `node_modules/drizzle-orm`:

- `drizzle()` (`expo-sqlite/driver.d.ts:8`) devuelve `ExpoSQLiteDatabase<TSchema> & { $client: SQLiteDatabase }`.
- `ExpoSQLiteDatabase` (`expo-sqlite/driver.d.ts:5`) extiende `BaseSQLiteDatabase<'sync', SQLiteRunResult, TSchema>`.
- `BaseSQLiteDatabase.transaction()` (`sqlite-core/db.d.ts:251`) existe como método de instancia:
  ```typescript
  transaction<T>(transaction: (tx: SQLiteTransaction<TResultKind, TRunResult, TFullSchema, TSchema>) => Result<TResultKind, T>, config?: SQLiteTransactionConfig): Result<TResultKind, T>;
  ```
- Implementación (`sqlite-core/db.cjs:318-320`) — delega tal cual a la sesión:
  ```javascript
  transaction(transaction, config) {
    return this.session.transaction(transaction, config);
  }
  ```

Por tanto `db.transaction((tx) => { ... })` es una llamada válida y disponible sin ningún wrapper adicional. Con `TResultKind = 'sync'`, `Result<'sync', T>` se resuelve a `T` (no `Promise<T>`) — es decir, el callback del cliente debe ser **síncrono**, y `db.transaction()` devuelve el valor directamente, no una promesa.

### 7.3 Implementación real de `.transaction()` para este driver

`node_modules/drizzle-orm/expo-sqlite/session.cjs` (`ExpoSQLiteSession.transaction`, líneas 53-64), verbatim:

```javascript
transaction(transaction, config = {}) {
  const tx = new ExpoSQLiteTransaction("sync", this.dialect, this, this.schema);
  this.run(import_sql.sql.raw(`begin${config?.behavior ? " " + config.behavior : ""}`));
  try {
    const result = transaction(tx);
    this.run(import_sql.sql`commit`);
    return result;
  } catch (err) {
    this.run(import_sql.sql`rollback`);
    throw err;
  }
}
```

Y para transacciones anidadas, `ExpoSQLiteTransaction.transaction()` (líneas 66-81) usa `savepoint` / `release savepoint` / `rollback to savepoint` reales en vez de `begin`/`commit`/`rollback`.

`this.run(...)` no es una simulación: pasa por `prepareQuery()` (línea 41-52), que llama a `this.client.prepareSync(query.sql)` — es decir, ejecuta SQL real (`begin`, `commit`, `rollback`) contra la conexión SQLite síncrona de `expo-sqlite` vía `stmt.executeSync(...)`.

**Conclusión sobre atomicidad:** el mecanismo es sólido para este setup.
- Es SQL real (`BEGIN`/`COMMIT`/`ROLLBACK`/`SAVEPOINT`), no un contador o bandera en memoria.
- Si el callback `transaction(tx)` lanza una excepción síncrona, el `catch` ejecuta `rollback` real antes de relanzar el error — sí hay ROLLBACK genuino.
- Como `openDatabaseSync` es una conexión síncrona de un solo hilo JS y todas las llamadas dentro de `run()`/`prepareSync()`/`executeSync()` son bloqueantes, no puede haber otra escritura intercalada entre el `begin` y el `commit`/`rollback` de esa misma transacción — no existe una ventana de interleaving que rompa la atomicidad.

**Única advertencia real encontrada (no documentada en ningún README/CHANGELOG de `drizzle-orm` ni de `expo-sqlite`; es una inferencia directa de la firma de tipos, no un hallazgo citado en la documentación oficial):**
El callback de `db.transaction()` debe ser estrictamente **síncrono** para este driver (`TResultKind = 'sync'`). Si en el futuro se escribiera `db.transaction(async (tx) => { await algo(); tx.insert(...) })`, `transaction(tx)` devolvería una `Promise` inmediatamente, esa promesa se ignora como valor de retorno síncrono, y la línea `this.run(sql\`commit\`)` se ejecutaría **antes** de que el `await` interno se resolviera — el commit ocurriría sin esperar el trabajo asíncrono, rompiendo la atomicidad esperada. Esto **no es una limitación documentada por drizzle-orm/expo-sqlite**, sino un riesgo estructural inherente a mezclar un callback async con una API tipada como síncrona en JavaScript/TypeScript (TypeScript no lo bloquearía en tiempo de compilación en todos los casos, dependiendo de cómo se infiera `T`).

**Verificación de exposición actual al riesgo:** `grep -rn "\.transaction(" --include="*.ts" --include="*.tsx"` en `src/` → **cero resultados**. El proyecto **no usa `db.transaction()` en ningún punto actual del código** (todas las inserciones/actualizaciones observadas en sesiones anteriores del audit — `finishSession`, `runProgressionAfterSession`, etc. — se hacen con llamadas `db.insert()`/`db.update()` sueltas, sin envolver en una transacción). Por tanto el riesgo del punto anterior es **teórico/preventivo** para este proyecto en su estado actual, no un bug activo.

### 7.4 Resumen

| Pregunta | Respuesta |
|---|---|
| ¿Dónde se inicializa `drizzle(...)`? | `src/db/index.ts:6`, único punto en el repo |
| ¿`db.transaction()` existe directamente? | Sí, heredado de `BaseSQLiteDatabase` |
| ¿Es atómico (BEGIN/COMMIT/ROLLBACK reales)? | Sí — SQL real vía `prepareSync`/`executeSync`, con `ROLLBACK` genuino en el `catch` |
| ¿Alguna limitación conocida documentada oficialmente? | Ninguna encontrada en README/CHANGELOG de `drizzle-orm` o `expo-sqlite` |
| ¿Algún riesgo estructural no documentado? | Sí: el callback debe ser síncrono; un callback `async` rompería la atomicidad (commit antes de que termine el await) |
| ¿Se usa `db.transaction()` hoy en el proyecto? | No — cero usos en `src/`, riesgo puramente preventivo |
