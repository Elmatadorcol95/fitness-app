# Auditoría + Fix: Ausencia de espalda en el plan de 4 días

> Generado con Claude Code el 2026-06-26. Incluye el fix aplicado.

---

## 1. PLANTILLA DE 4 DÍAS — Código literal

**Archivo:** `src/lib/plan-generator.ts`

```typescript
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
```

**Plantilla de 4 días literal:**
```
Día 1: 'upper'
Día 2: 'lower'
Día 3: 'upper'
Día 4: 'lower'
```

No existe ningún día de tipo `'pull'` en la plantilla de 4 días. La espalda solo puede aparecer si la selección del día `upper` la incluye — la plantilla no la garantiza por sí sola.

Las categorías asignadas a cada tipo de día se definen en `selectExercisesForDay`:
```typescript
const cats: ExerciseCategory[] =
  dayType === 'upper' ? ['push', 'pull'] :
  dayType === 'lower' ? ['legs', 'core']  :
  [dayType as ExerciseCategory];
```

| Tipo día | Categorías | ¿Pull/espalda garantizado? |
|---|---|---|
| `upper` | `['push', 'pull']` | Solo con la selección correcta |
| `lower` | `['legs', 'core']` | No |
| `push` | `['push']` | No |
| `pull` | `['pull']` | ✅ Sí — única categoría |
| `full_body` | push+pull+legs vía safePick | ✅ Sí — garantizado |

---

## 2. SELECCIÓN POR DÍA — Función completa y el bug

**Archivo:** `src/lib/plan-generator.ts`

### Función completa (incluyendo el fix ya aplicado)

```typescript
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
    // ← rama full_body: no tocada, usa safePick por categoría (garantiza pull)
    ...
  } else {
    const cats: ExerciseCategory[] =
      dayType === 'upper' ? ['push', 'pull'] :
      dayType === 'lower' ? ['legs', 'core']  :
      [dayType as ExerciseCategory];

    const pickRoundRobin = (isCompound: boolean, limit: number): Exercise[] => {
      const pools = cats.map(cat =>
        available.filter(e => e.category === cat && e.isCompound === isCompound),
      );
      const result: Exercise[] = [];
      const indices = pools.map(() => 0);
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
  }
  ...
}
```

### Por qué el código anterior fallaba

La selección original era:
```typescript
compounds  = available.filter(e => cats.includes(e.category) && e.isCompound).slice(0, counts.compounds);
isolations = available.filter(e => cats.includes(e.category) && !e.isCompound).slice(0, counts.isolations);
```

Con `isGym=true`, `sortGymFirst` preserva el orden del array `EXERCISES` dentro de cada grupo de prioridad. Los compuestos push gym-priority aparecen antes que los pull gym-priority (porque la sección push precede a la sección pull en el array). Los primeros 4 compuestos push+pull son:

```
1. db_bench_press   (push)
2. db_overhead_press (push)
3. barbell_bench_press (push)
4. barbell_overhead_press (push)
5. db_row           (pull) ← primero con back/lats como primario
```

Con `counts.compounds = 3` (45-60 min) o `= 4` (75-90 min), `.slice(0, N)` se detiene antes de llegar a `db_row`. Resultado: cero pull en el día upper.

### Por qué el fix lo resuelve

`pickRoundRobin` separa el pool combinado en sub-pools por categoría y toma 1 de cada uno por vuelta:

| Slot | Cat. elegida | Ejercicio elegido |
|---|---|---|
| 1 | push | db_bench_press |
| 2 | **pull** | **db_row** ← ✅ primer pull ya en slot 2 |
| 3 | push | db_overhead_press |
| 4 | **pull** | **barbell_row** (si 75+ min) |

Con `counts.isolations = 2` y `upper`:
- Slot 1: db_lateral_raise (push) — antes ocupaba slots 1 y 2
- Slot 2: **db_bicep_curl (pull)** ← ✅ bíceps garantizado desde 45 min

**Días de una sola categoría no cambian:** `cats = ['push']` → un único pool → el bucle toma `push[0], push[1]...` — idéntico a `.slice(0, N)`.

**`lower` también mejora:** `cats = ['legs', 'core']` → alternará legs/core en los aislamientos, garantizando al menos 1 ejercicio de core incluso con 2 slots.

### ¿Puede un día quedar vacío o a medias?

Sí — si un pool está vacío (p.ej. no hay compuestos de `core` disponibles), el bucle `anyPicked` detecta el agotamiento y sale. El plan puede tener menos ejercicios de los esperados para ese día. No hay validación posterior que lo rechace; se guarda tal cual. Esto ya era así antes del fix y no cambia.

---

## 3. PLAN ACTUAL GUARDADO

La base de datos expo-sqlite vive en el dispositivo físico; no hay `.db` accesible desde el PC. Reconstrucción analítica con los parámetros del usuario (4 días, `location='both'` → `isGym=true`, 45-60 min → compounds=3, isolations=2-3):

### Antes del fix (plan original guardado)

| Día | Tipo | Compuestos (primarios) | Aislamientos (primarios) |
|---|---|---|---|
| 1 | upper | db_bench_press (chest), db_overhead_press (shoulders), barbell_bench_press (chest) | db_lateral_raise (shoulders), db_fly (chest) |
| 2 | lower | goblet_squat (quads/glutes), barbell_squat (quads/glutes), db_romanian_deadlift (hamstrings/glutes) | leg_curl (hamstrings), leg_extension (quads) |
| 3 | upper | **idéntico al día 1** — `.slice()` no usa `offset` fuera de `full_body` | **idéntico al día 1** |
| 4 | lower | **idéntico al día 2** | **idéntico al día 2** |

**back/lats como primario: ausente en toda la semana.**

### Con el fix (generación nueva)

| Día | Tipo | Compuestos | Aislamientos |
|---|---|---|---|
| 1 | upper | db_bench_press (chest), **db_row (back/lats)**, db_overhead_press (shoulders) | db_lateral_raise (shoulders), **db_bicep_curl (biceps)** |
| 2 | lower | goblet_squat (quads/glutes), barbell_squat (quads/glutes), db_romanian_deadlift (hamstrings/glutes) | leg_curl (hamstrings), **plank (core)** |
| 3 | upper | **idéntico al día 1** (offset no diferencia los dos upper — tema aparte) | **idéntico al día 1** |
| 4 | lower | **idéntico al día 2** | **idéntico al día 2** |

**back/lats garantizado al menos 1 vez por día upper** (db_row en slot 2 de compuestos).

---

## 4. TRAZADO — ¿Plantilla o configuración?

**Veredicto (b): bug de lógica de la selección, específico del split de 4 días.**

Con los mismos parámetros, una generación nueva anterior al fix producía el mismo plan sin espalda. El plan guardado es coherente con lo que el generador habría producido en cualquier momento.

### Comparativa de splits

| Split | Plantilla | Día pull explícito | ¿Espalda garantizada? |
|---|---|---|---|
| 3 días | `['push', 'pull', 'legs']` | ✅ Día 2 | ✅ Siempre |
| **4 días (original)** | `['upper','lower','upper','lower']` | ❌ Ninguno | ❌ Nunca (sin fix) |
| **4 días (con fix)** | ídem | ❌ Ninguno | ✅ Al menos 1 db_row por upper |
| 5 días | `['push','pull','legs','upper','lower']` | ✅ Día 2 | ✅ Sí (día pull + upper mejorado) |

El fallo era específico de 4 días porque es el único split sin día `'pull'` dedicado que además usaba el camino `else` con `.slice()`.

---

## DISPARADORES DE GENERACIÓN DE PLAN (solo lectura)

Todos los lugares que llaman a `generateAndSavePlan`:

### 1. Pestaña Entreno — estado sin plan
**Archivo:** `src/app/training.tsx`, línea 263

```typescript
onPress={() => profile && generateAndSavePlan(profile)}
```

**Disparador:** El usuario va a la pestaña Entreno y no existe ningún plan activo en SQLite. Aparece el botón "Generar plan" (`workout.noplan.button`) y el usuario lo pulsa.

**Nota importante:** El onboarding (`OnboardingFlow.tsx`) **NO llama a `generateAndSavePlan`**. Solo inserta el perfil en SQLite. El primer plan se genera siempre por este botón, la primera vez que el usuario abre la pestaña Entreno tras terminar el onboarding.

### 2. Pestaña Entreno — "Regenerar plan"
**Archivo:** `src/app/training.tsx`, línea 453

```typescript
onConfirm={() => { if (profile) generateAndSavePlan(profile); }}
```

**Disparador:** El usuario pulsa el botón "Regenerar plan" (texto pequeño, esquina derecha del encabezado del plan) → aparece VulcanDialog → pulsa confirmar.

### 3. Ajustes → "Mi equipamiento" — tras guardar equipamiento
**Archivo:** `src/app/equipment.tsx`, línea 201

```typescript
try { await generateAndSavePlan(pendingProfile.current); } catch {}
```

**Disparador:** El usuario guarda cambios en "Mi equipamiento" → VulcanDialog "¿Quieres regenerar tu plan?" → pulsa "Sí". Usa `pendingProfile.current` (el perfil con el nuevo equipamiento ya persistido en SQLite).

### 4. WorkoutCard (componente legacy, pestaña Hoy)
**Archivo:** `src/components/workout/WorkoutCard.tsx`, línea 70

```typescript
onPress={() => profile && generateAndSavePlan(profile)}
```

**Disparador:** Si WorkoutCard se monta sin plan activo, muestra un botón "Generar plan". Este componente fue reemplazado por `TodayBanner` en la pestaña Hoy pero el código aún existe. Solo se activaría si WorkoutCard se usara en alguna pantalla.

### ¿Qué acciones NO regeneran el plan?

| Acción | ¿Regenera plan? |
|---|---|
| Completar el onboarding | ❌ No |
| Cambiar días/minutos en ajustes | ❌ No (no existe ese ajuste separado aún) |
| Cambiar objetivos en ajustes | ❌ No |
| Cambiar equipamiento + responder "No" al diálogo | ❌ No |
| Iniciar sesión / cerrar sesión | ❌ No |

---

## Archivos leídos / modificados

| Archivo | Acción |
|---|---|
| `src/lib/plan-generator.ts` | ✏️ Modificado — solo la rama `else` de `selectExercisesForDay` |
| `src/lib/exercises.ts` | 👁 Leído — orden del array para verificar posición de push vs pull |
| `src/app/training.tsx` | 👁 Leído — disparadores 1 y 2 |
| `src/app/equipment.tsx` | 👁 Leído — disparador 3 |
| `src/components/workout/WorkoutCard.tsx` | 👁 Leído — disparador 4 (legacy) |
| `src/components/onboarding/OnboardingFlow.tsx` | 👁 Leído — confirma que NO genera plan |
| `src/store/workout.store.ts` | 👁 Leído — implementación de `generateAndSavePlan` |
