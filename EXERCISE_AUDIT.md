# Auditoría: Filtro "En casa" (E-3) — Diagnóstico de ejercicios no disponibles

> Generado con Claude Code el 2026-06-26. Solo lectura — no se modificó ningún archivo.

---

## 1. EQUIPAMIENTO GUARDADO — ¿Cómo y dónde persiste?

### Flujo completo desde la pantalla "Mi equipamiento"

**Archivo:** `src/app/equipment.tsx`

```
Estado local (React):
  const [location, setLocation] = useState<Location>(initialLocation);
  const [equipment, setEquipment] = useState<string[]>(initialEquipment);
```

Los toggles individuales solo actualizan **estado local de React** (línea 70-74):

```js
const toggleEquipment = (item: string) => {
  setEquipment((prev) =>
    prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item],
  );
};
```

**No se persiste nada al marcar/desmarcar.** El guardado ocurre exclusivamente cuando el usuario pulsa el botón "Guardar" (`handleSave`, líneas 80-92):

```js
const handleSave = async () => {
  if (!profile) { useProfileStore.getState().closeEquipment(); return; }
  if (!hasChanged) { useProfileStore.getState().closeEquipment(); return; }

  setSaving(true);
  try {
    await updateEquipmentAndLocation(location, equipment);  // ← persiste aquí
    pendingProfile.current = { ...profile, location, equipment: JSON.stringify(equipment) };
    setRegenOpen(true);  // ← después pregunta si regenerar el plan
  } finally {
    setSaving(false);
  }
};
```

### La función que persiste en SQLite

**Archivo:** `src/store/profile.store.ts`, líneas 69-78

```js
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

**¿El guardado es síncrono o depende de un evento?**
- Es **asíncrono pero bloqueante** dentro de `handleSave` (se usa `await`).
- El guardado en SQLite y la actualización del store de Zustand ocurren ANTES de mostrar el diálogo de regeneración.
- Si el usuario pulsa el botón y el `await` completa sin error, el equipamiento YA está persistido aunque luego pulse "No" a regenerar el plan.

**¿Hay valores por defecto si el guardado falla?**
- `handleSave` tiene un `try/finally` pero NO captura errores del `await updateEquipmentAndLocation()`. Si falla, el error se propaga y el estado de SQLite y el store quedan como estaban antes. No hay fallback que guarde un valor incorrecto.
- Valor inicial de `equipment` en el draft de onboarding: `[]` (array vacío).

### ¿Cuándo se vuelve a leer el equipamiento en la pantalla de entrenamiento?

**Archivo:** `src/app/training.tsx`, línea 127:

```js
const equipment = parseEquipment(profile?.equipment);
```

donde `profile` viene de `useProfileStore()` (suscripción reactiva de Zustand). Como `updateEquipmentAndLocation` llama `set({ profile: ... })`, cualquier componente suscrito ve el valor nuevo en el siguiente render, sin necesidad de reiniciar la app.

---

## 2. ¿CUÁNDO SE APLICA EL FILTRO "CASA"?

### (a) Generación del plan (plan-generator.ts)

El filtro de equipamiento se aplica **al generar el plan**, en `selectExercisesForDay` (líneas 118-164 de `plan-generator.ts`):

```js
const rawAvailable = EXERCISES.filter(e => canDoExercise(e, equipment, isGym));
```

donde `isGym = profile.location === 'gym' || profile.location === 'both'`.

**Implicación crítica:** Si `location='both'`, `isGym=true` y **todos los ejercicios pasan** la criba (incluyendo cableMachine y legPressMachine). El plan queda guardado en `plan_days.exercises` como JSON con esos ejercicios. Cambiar el equipamiento después NO modifica el plan guardado a menos que el usuario regenere explícitamente.

### (b) Filtro ligero E-3 (al iniciar sesión)

El filtro E-3 se aplica en `doStartSession(context)` de `training.tsx` (líneas 150-206), y **solo cuando `context === 'home'`**:

```js
if (context === 'home') {
  const homeEquipment = parseEquipment(profile?.equipment);
  // ... búsqueda de sustitutos ...
}
```

### ¿Cuándo se llama `doStartSession` con `context='home'`?

**Archivo:** `src/app/training.tsx`, función `handleStart` (líneas 229-236):

```js
function handleStart() {
  if (!currentPlan) return;
  if (profile?.location === 'both') {
    setWhereOpen(true);   // muestra el dialog "¿Dónde entrenas hoy?"
  } else {
    void doStartSession(null);  // ← location='home' TAMBIÉN entra aquí
  }
}
```

**BUG CRÍTICO detectado:** Si el usuario tiene `location='home'` (solo casa, sin gym), `handleStart` llama `doStartSession(null)`. El E-3 nunca llega a ejecutarse porque:

```js
if (context === 'home') {   // context es null → este bloque no entra JAMÁS
  // filtro...
}
```

El filtro E-3 solo funciona para usuarios con `location='both'` que pulsan "En casa" en el dialog. Los usuarios con `location='home'` nunca reciben filtrado.

### Resumen: ¿cuándo hace falta regenerar el plan?

| Situación | ¿Plan correcto? | ¿Filtro E-3 activo? |
|---|---|---|
| location='home', plan generado con bodyweight | ✅ Plan correcto | ❌ Filtro nunca corre |
| location='home', plan generado antes de cambiar equipo | ❌ Plan desactualizado | ❌ Filtro nunca corre |
| location='both', elige gym | ✅ Plan con gym | ❌ No aplica |
| location='both', elige home | ⚠️ Plan con gym, E-3 intenta sustituir | ✅ Filtro corre, pero puede fallar |

---

## 3. TABLA COMPLETA DE EJERCICIOS

### Categoría: PUSH — Compuestos

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| push_up | Flexión de brazos | chest, triceps | `[]` (peso corporal) |
| pike_push_up | Flexión en pica | shoulders, triceps | `[]` |
| db_bench_press | Press banca con mancuernas | chest | `['dumbbells']` |
| db_overhead_press | Press militar con mancuernas | shoulders | `['dumbbells']` |
| barbell_bench_press | Press de banca con barra | chest | `['barbellPlates']` |
| barbell_overhead_press | Press militar con barra | shoulders | `['barbellPlates']` |
| dip | Fondos en paralelas | chest, triceps | `['parallettes']` |
| ring_dip | Fondos en anillas | chest, triceps | `['rings']` |
| trx_push_up | Flexión en TRX | chest, triceps | `['trx']` |

### Categoría: PUSH — Aislamiento

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| db_lateral_raise | Elevación lateral | shoulders | `['dumbbells']` |
| db_fly | Aperturas con mancuernas | chest | `['dumbbells']` |
| db_tricep_extension | Extensión de tríceps | triceps | `['dumbbells']` |
| close_grip_push_up | Flexión cerrada | triceps | `[]` (peso corporal) |
| band_lateral_raise | Elevación lateral con banda | shoulders | `['resistanceBands']` |
| db_front_raise | Elevación frontal | shoulders | `['dumbbells']` |

### Categoría: PULL — Compuestos

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| pull_up | Dominada prona | lats, back | `['pullupBar']` |
| chin_up | Dominada supina | biceps, lats | `['pullupBar']` |
| inverted_row | Remo invertido | back, lats | `['pullupBar']` |
| db_row | Remo con mancuerna | back, lats | `['dumbbells']` |
| barbell_row | Remo con barra | back, lats | `['barbellPlates']` |
| db_deadlift | Peso muerto con mancuernas | back, hamstrings, glutes | `['dumbbells']` |
| barbell_deadlift | Peso muerto con barra | back, hamstrings, glutes | `['barbellPlates']` |
| kb_swing | Swing con kettlebell | glutes, hamstrings | `['kettlebells']` |
| trx_row | Remo en TRX | back, lats | `['trx']` |

### Categoría: PULL — Aislamiento

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| db_bicep_curl | Curl de bíceps | biceps | `['dumbbells']` |
| hammer_curl | Curl martillo | biceps, forearms | `['dumbbells']` |
| barbell_curl | Curl con barra | biceps | `['barbellPlates']` |
| face_pull_band | Face pull con banda | shoulders, traps | `['resistanceBands']` |
| band_curl | Curl con banda | biceps | `['resistanceBands']` |

### Categoría: LEGS — Compuestos

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| squat_bodyweight | Sentadilla libre | quads, glutes | `[]` |
| goblet_squat | Sentadilla copa | quads, glutes | `['dumbbells']` |
| barbell_squat | Sentadilla con barra | quads, glutes | `['barbellPlates']` |
| lunge | Zancada | quads, glutes | `[]` |
| db_lunge | Zancada con mancuernas | quads, glutes | `['dumbbells']` |
| db_romanian_deadlift | Peso muerto rumano | hamstrings, glutes | `['dumbbells']` |
| barbell_romanian_deadlift | Peso muerto rumano con barra | hamstrings, glutes | `['barbellPlates']` |
| hip_thrust_bodyweight | Hip thrust | glutes | `[]` |
| db_hip_thrust | Hip thrust con mancuerna | glutes | `['dumbbells', 'adjustableBench']` |
| bulgarian_split_squat | Sentadilla búlgara | quads, glutes | `['adjustableBench']` |
| step_up | Subida al cajón | quads, glutes | `['plioBox']` |
| kb_goblet_squat | Sentadilla copa con kettlebell | quads, glutes | `['kettlebells']` |

### Categoría: LEGS — Aislamiento

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| glute_bridge | Puente de glúteos | glutes | `[]` |
| calf_raise | Elevación de talones | calves | `[]` |
| lateral_band_walk | Paso lateral con banda | glutes | `['miniGluteBands']` |
| glute_kickback_band | Patada de glúteo con banda | glutes | `['resistanceBands']` |
| sumo_squat | Sentadilla sumo | quads, glutes | `[]` |

### Categoría: CORE

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| plank | Plancha | core, abs | `[]` |
| side_plank | Plancha lateral | core, abs | `[]` |
| crunch | Crunch abdominal | abs | `[]` |
| leg_raise | Elevación de piernas | abs, core | `[]` |
| russian_twist | Giro ruso | abs, core | `[]` |
| dead_bug | Dead bug | core, abs | `[]` |
| mountain_climber | Escalador | core, abs | `[]` |
| ab_roller | Rueda abdominal | abs, core | `['abRoller']` |
| hanging_knee_raise | Rodillas al pecho en barra | abs, core | `['pullupBar']` |

### Categoría: FULL BODY / CARDIO

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| burpee | Burpee | core, chest, quads | `[]` |
| jump_rope | Comba | calves, core | `['jumpRope']` |
| box_jump | Salto al cajón | quads, glutes | `['plioBox']` |
| kb_thruster | Thruster con kettlebell | quads, shoulders | `['kettlebells']` |
| med_ball_slam | Lanzamiento de balón medicinal | core, back | `['medicineBall']` |

### Categoría: GYM — PUSH (polea/máquina)

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| incline_barbell_press | Press inclinado con barra | chest | `['barbellPlates', 'adjustableBench']` |
| cable_fly | Aperturas en polea | chest | `['cableMachine']` |
| machine_chest_press | Press pectoral en máquina | chest | `['cableMachine']` |
| cable_lateral_raise | Elevación lateral en polea | shoulders | `['cableMachine']` |
| cable_tricep_pushdown | Jalón de tríceps en polea | triceps | `['cableMachine']` |
| machine_overhead_press | Press de hombros en máquina | shoulders | `['cableMachine']` |

### Categoría: GYM — PULL (polea/máquina)

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| lat_pulldown | Jalón al pecho en polea | lats, back | `['cableMachine']` |
| cable_row | Remo en polea baja | back, lats | `['cableMachine']` |
| machine_row | Remo en máquina | back, lats | `['cableMachine']` |
| cable_face_pull | Face pull en polea | shoulders, traps | `['cableMachine']` |
| cable_curl | Curl de bíceps en polea | biceps | `['cableMachine']` |

### Categoría: GYM — LEGS (máquinas)

| id | Nombre (es) | Músculos primarios | Equipamiento requerido |
|---|---|---|---|
| leg_press | Prensa de piernas | quads, glutes | `['legPressMachine']` |
| hack_squat | Sentadilla hack | quads, glutes | `['legPressMachine']` |
| leg_curl | Curl femoral en máquina | **hamstrings** | `['legPressMachine']` |
| leg_extension | Extensión de cuádriceps | quads | `['legPressMachine']` |
| seated_calf_raise | Elevación de talones sentado | calves | `['legPressMachine']` |
| cable_hip_abduction | Abducción de cadera en polea | glutes | `['cableMachine']` |

---

## 4. LÓGICA: canDoAtHome y getAlternatives

**Archivo:** `src/lib/exercises.ts`

### canDoAtHome (líneas 598-603)

```js
export function canDoAtHome(exerciseId: string, homeEquipment: string[]): boolean {
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return true;
  if (ex.equipment.length === 0) return true; // peso corporal, siempre disponible
  return ex.equipment.every(eq => homeEquipment.includes(eq));
}
```

Nota: esta función es equivalente a `canDoExercise` del plan-generator para `isGym=false`.

### getAlternatives (líneas 610-631)

```js
export function getAlternatives(
  currentId: string,
  equipment: string[],
  isGym: boolean,
): Exercise[] {
  const current = EXERCISES.find(e => e.id === currentId);
  if (!current) return [];

  return EXERCISES.filter(ex => {
    if (ex.id === currentId) return false;
    if (ex.category !== current.category) return false;
    const canDo = isGym
      ? true
      : ex.equipment.length === 0 || ex.equipment.every(eq => equipment.includes(eq));
    if (!canDo) return false;
    return ex.primaryMuscles.some(m => current.primaryMuscles.includes(m));
  }).sort((a, b) => {
    const aOverlap = a.primaryMuscles.filter(m => current.primaryMuscles.includes(m)).length;
    const bOverlap = b.primaryMuscles.filter(m => current.primaryMuscles.includes(m)).length;
    return bOverlap - aOverlap;
  });
}
```

Criterios de filtrado (para casa):
1. Misma categoría (push/pull/legs/core/etc.)
2. Equipamiento: `equipment=[]` (siempre) o todos sus ítems están en `homeEquipment`
3. Al menos un músculo primario en común con el ejercicio original
4. Se ordena por mayor solapamiento muscular

---

## 5. CONJUNTO DE EQUIPO "EN CASA" — Cómo se construye

**Archivo:** `src/app/training.tsx`, línea 127 y `doStartSession` líneas 160-161:

```js
// En el componente (para ChangeExerciseModal):
const equipment = parseEquipment(profile?.equipment);

// En doStartSession, si context === 'home':
const homeEquipment = parseEquipment(profile?.equipment);
```

`parseEquipment` (training.tsx, líneas 39-41):

```js
function parseEquipment(raw?: string): string[] {
  try { return JSON.parse(raw ?? '[]') as string[]; } catch { return []; }
}
```

Si el usuario marcó SOLO "Peso corporal" en la pantalla de equipamiento, el JSON guardado es `'["bodyweight"]'`, y `homeEquipment = ['bodyweight']`.

**Punto crítico:** `'bodyweight'` NO es una `EquipmentKey` en el catálogo. Ningún ejercicio tiene `equipment: ['bodyweight']`. Los ejercicios de peso corporal tienen `equipment: []`. Por tanto:
- `canDoAtHome('push_up', ['bodyweight'])`: `[].every(...)` = `true` ✅ (correcto)
- `canDoAtHome('db_row', ['bodyweight'])`: `['dumbbells'].every(eq => ['bodyweight'].includes(eq))` = `false` ✅ (correcto, rechaza mancuerna)

La comparación funciona correctamente. El problema no está en la lógica de comparación.

---

## 6. TRAZADO DEL CASO: solo peso corporal → ¿por qué aparecen db_row y leg_curl?

### Datos de entrada

- `profile.equipment = '["bodyweight"]'` → `homeEquipment = ['bodyweight']`
- `profile.location = 'home'` ó `'both'` (ver dos rutas abajo)

---

### RUTA A — location='home' (BUG PRINCIPAL)

**Archivo:** `src/app/training.tsx`, `handleStart` líneas 229-236:

```js
function handleStart() {
  if (!currentPlan) return;
  if (profile?.location === 'both') {
    setWhereOpen(true);
  } else {
    void doStartSession(null);  // ← 'home' llega aquí con context=null
  }
}
```

**`doStartSession(null)`** → el bloque del filtro E-3 nunca ejecuta:

```js
if (context === 'home') {   // null !== 'home' → NUNCA ENTRA
  // ...filtro...
}
```

**Resultado:** Los ejercicios del plan almacenado en `plan_days.exercises` se pasan a `startSession` sin ningún filtrado. Si el plan se generó con `location='gym'` o `'both'` (antes de cambiar a 'home'), o si se generó con equipamiento diferente y el usuario dijo "No" a regenerar, los ejercicios de gym/mancuerna aparecen tal cual.

**Conclusión para location='home':** El filtro E-3 está completamente inoperativo.

---

### RUTA B — location='both', usuario eligió "En casa"

`handleStart()` muestra el dialog → usuario pulsa "En casa" → `doStartSession('home')`.

El filtro SÍ ejecuta. Veamos qué pasa con cada ejercicio problemático:

#### db_row (Remo con mancuerna)

```
canDoAtHome('db_row', ['bodyweight'])
  → ex.equipment = ['dumbbells']
  → ['dumbbells'].every(eq => ['bodyweight'].includes(eq))
  → false  → NECESITA SUSTITUTO
```

```
getAlternatives('db_row', ['bodyweight'], false)
  → categoría: 'pull'
  → Busca ejercicios pull que: equip=[] ó equip⊆['bodyweight'], y primaryMuscles ∩ ['back','lats'] ≠ ∅

  Revisión de todos los ejercicios pull con equip=[]:
    (ninguno — todos los pull requieren pullupBar, dumbbells, barbellPlates, kettlebells, trx, resistanceBands)

  Resultado: []  (cero alternativas)
```

```
En doStartSession:
  alts.length === 0
  → noAltIndices.push(i)
  → return ex  ← se devuelve el db_row ORIGINAL
```

Después de `startSession`:
```js
const noteText = t('workout.session.noHomeAlt');
for (const idx of noAltIndices) {
  updateNote(idx, noteText);  // nota "Sin equivalente en casa"
}
```

**El ejercicio db_row SÍ aparece en la sesión, marcado con la nota "Sin equivalente en casa".**

#### leg_curl (Curl femoral en máquina)

```
canDoAtHome('leg_curl', ['bodyweight'])
  → ex.equipment = ['legPressMachine']
  → false → NECESITA SUSTITUTO
```

```
getAlternatives('leg_curl', ['bodyweight'], false)
  → categoría: 'legs'
  → primaryMuscles del leg_curl: ['hamstrings']
  → Busca legs con equip=[] y primaryMuscles ∩ ['hamstrings'] ≠ ∅

  Ejercicios legs con equip=[]:
    squat_bodyweight → primary: ['quads','glutes']  → 'hamstrings' ∉ → rechazado
    lunge            → primary: ['quads','glutes']  → rechazado
    hip_thrust_bodyweight → primary: ['glutes']     → rechazado
    glute_bridge     → primary: ['glutes']           → rechazado
    calf_raise       → primary: ['calves']           → rechazado
    sumo_squat       → primary: ['quads','glutes']  → rechazado

  Resultado: []  (cero alternativas — ningún ejercicio de peso corporal tiene
                  'hamstrings' como músculo PRIMARIO)
```

```
noAltIndices.push(i) → se mantiene leg_curl con nota "Sin equivalente en casa"
```

**El leg_curl aparece en la sesión, con nota.**

---

### Diagnóstico adicional: ¿Cuándo no aparece la nota?

Si el ejercicio necesita sustituto pero `getAlternatives` devuelve al menos un resultado, se sustituye silenciosamente y NO aparece el ejercicio original. Solo cuando `alts.length === 0` se mantiene el original con nota.

---

## Resumen: hipótesis de causa raíz

**Hipótesis 1 (más probable si location='home'):** El filtro E-3 está completamente bloqueado para usuarios con `location='home'`. `handleStart()` llama `doStartSession(null)` (contexto nulo), y el bloque `if (context === 'home')` nunca ejecuta. El plan guardado en SQLite, que puede haber sido generado con equipamiento anterior (gym o mancuernas), se usa sin ningún filtrado.

**Hipótesis 2 (si location='both' + eligió "En casa"):** El filtro E-3 sí corre, pero la función `getAlternatives` devuelve lista vacía para ejercicios de tracción (pull) con solo peso corporal, porque no existe ningún ejercicio pull en el catálogo con `equipment=[]`. Lo mismo para `leg_curl` (isola de isquiotibiales): ningún ejercicio de piernas con peso corporal tiene 'hamstrings' como músculo primario. Sin alternativas, el original se mantiene y recibe la nota "Sin equivalente en casa" — el ejercicio sigue visible en la sesión.

**Hipótesis 3 (aplica en ambos casos):** El usuario guardó el nuevo equipamiento (solo peso corporal) pero respondió "No" al diálogo de regeneración de plan. El plan sigue teniendo ejercicios del equipamiento anterior. Para location='home', el E-3 no lo corrige nunca (Hipótesis 1). Para location='both' + home, el E-3 intenta corregirlo pero falla por falta de alternativas (Hipótesis 2).

---

## Archivos leídos

- `src/lib/exercises.ts` — catálogo completo, canDoAtHome, getAlternatives
- `src/lib/plan-generator.ts` — canDoExercise, generatePlan, isGym flag
- `src/store/session.store.ts` — startSession, lógica sin filtro propio
- `src/store/profile.store.ts` — updateEquipmentAndLocation, persistencia
- `src/store/workout.store.ts` — generateAndSavePlan, loadCurrentPlan
- `src/app/equipment.tsx` — toggleEquipment, handleSave, flujo de guardado
- `src/app/training.tsx` — handleStart, doStartSession, filtro E-3 completo
