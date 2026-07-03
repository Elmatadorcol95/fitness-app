# Auditoría E-3 — Filtro de ejercicios para `location='home'`

**Solo diagnóstico — ningún archivo de código fue modificado.**

---

## 1. Funciones relevantes (verbatim)

### 1.1 `canDoAtHome()` y `getAlternatives()` — [src/lib/exercises.ts:626-659](src/lib/exercises.ts#L626-L659)

```typescript
/** Verdadero si el usuario puede hacer el ejercicio con su equipamiento en casa. */
export function canDoAtHome(exerciseId: string, homeEquipment: string[]): boolean {
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return true;
  if (ex.equipment.length === 0) return true; // peso corporal, siempre disponible
  return ex.equipment.every(eq => homeEquipment.includes(eq));
}

/**
 * Devuelve ejercicios alternativos al indicado, filtrados por equipamiento disponible
 * y ordenados por mayor solapamiento muscular. Reutilizada en ChangeExerciseModal y
 * en el filtro ligero de sesión (E-3).
 */
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

### 1.2 `canDoExercise()` (filtro en la GENERACIÓN del plan) — [src/lib/plan-generator.ts:78-82](src/lib/plan-generator.ts#L78-L82)

```typescript
function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}
```

Uso en `generatePlan()` — [src/lib/plan-generator.ts:202,210](src/lib/plan-generator.ts#L202-L210):

```typescript
const isGym  = profile.location === 'gym' || profile.location === 'both';
...
const days: PlanDayData[] = split.map((dayType, i) => ({
  dayIndex: i,
  dayType,
  exercises: selectExercisesForDay(dayType, equipment, isGym, counts, scheme, i),
}));
```

`selectExercisesForDay` (línea 126) llama `EXERCISES.filter(e => canDoExercise(e, equipment, isGym))` para construir el pool disponible antes de elegir compuestos/aislamientos.

### 1.3 Filtro E-3 en vivo (`doStartSession`) — [src/app/training.tsx:149-226](src/app/training.tsx#L149-L226)

```typescript
async function doStartSession(context: 'gym' | 'home' | null) {
  if (!currentPlan) return;
  const activeIdx  = currentPlan.activeDayIndex % currentPlan.days.length;
  let   sessionDay = currentPlan.days[activeIdx];

  // ── E-3: Filtro ligero para contexto de casa ─────────────────────────────
  // Solo si el usuario eligió "En casa" en el Alert de E-2.
  // Para gym o sin contexto, el plan queda intacto.
  const noAltIndices: number[] = [];
  if (context === 'home') {
    const homeEquipment = parseEquipment(profile?.equipment);

    // Cuenta usos para no repetir el mismo sustituto más de 2 veces.
    // Incluimos los ejercicios que ya pasan canDoAtHome (sin sustituir).
    const usageCount = new Map<string, number>();
    for (const ex of sessionDay.exercises) {
      if (canDoAtHome(ex.exerciseId, homeEquipment)) {
        usageCount.set(ex.exerciseId, (usageCount.get(ex.exerciseId) ?? 0) + 1);
      }
    }

    const filteredExercises = sessionDay.exercises.map((ex, i) => {
      if (canDoAtHome(ex.exerciseId, homeEquipment)) return ex;

      const alts = getAlternatives(ex.exerciseId, homeEquipment, false);
      if (alts.length === 0) {
        noAltIndices.push(i);
        return ex;
      }

      // 1. Mejor alternativa con menos de 2 usos (por solapamiento muscular)
      let chosen = alts.find(a => (usageCount.get(a.id) ?? 0) < 2);

      // 2. Búsqueda ampliada: cualquier ejercicio de casa de la misma categoría
      //    con menos de 2 usos (evita una 3.ª repetición forzada)
      if (!chosen) {
        const srcEx = EXERCISES.find(e => e.id === ex.exerciseId);
        if (srcEx) {
          const broader = EXERCISES.filter(e =>
            e.id !== ex.exerciseId &&
            e.category === srcEx.category &&
            (e.equipment.length === 0 || e.equipment.every(eq => homeEquipment.includes(eq))),
          );
          chosen = broader.find(a => (usageCount.get(a.id) ?? 0) < 2);
        }
      }

      // 3. Último recurso: la menos usada entre las alternativas primarias
      const winner = chosen ?? alts.reduce((min, a) =>
        (usageCount.get(a.id) ?? 0) < (usageCount.get(min.id) ?? 0) ? a : min,
      );

      usageCount.set(winner.id, (usageCount.get(winner.id) ?? 0) + 1);
      return { ...ex, exerciseId: winner.id, isCompound: winner.isCompound };
    });
    sessionDay = { ...sessionDay, exercises: filteredExercises };
  }

  console.log('[Training] doStartSession — context:', context, 'day:', sessionDay.dayType);
  setTrainingContext(context);
  setIsStarting(true);
  try {
    await startSession(currentPlan.id, sessionDay);
    // Marcar los ejercicios sin alternativa en casa con una nota visible
    if (noAltIndices.length > 0) {
      const noteText = t('workout.session.noHomeAlt');
      for (const idx of noAltIndices) {
        updateNote(idx, noteText);
      }
    }
    console.log('[Training] startSession OK — swaps:', sessionDay.exercises.length - noAltIndices.length, 'no-alt:', noAltIndices.length);
  } catch (err) {
    console.error('[Training] startSession ERROR:', err);
    setStartError(String(err instanceof Error ? err.message : err));
  } finally {
    setIsStarting(false);
  }
}
```

### 1.4 El único punto de entrada que decide el `context` — [src/app/training.tsx:228-235](src/app/training.tsx#L228-L235)

```typescript
function handleStart() {
  if (!currentPlan) return;
  if (profile?.location === 'both') {
    setWhereOpen(true);
  } else {
    void doStartSession(null);
  }
}
```

Este es **el único call site de `doStartSession`** en todo el árbol de componentes (confirmado por grep de `doStartSession(` en `src/`), y **el único call site de `setTrainingContext(`** en todo el proyecto es `training.tsx:208`, que recibe exactamente el `context` que `handleStart()`/el `VulcanBottomSheet` de "¿Dónde entrenas hoy?" le pasan.

---

## 2. Cadena de origen de `location`

1. `profile.location` se guarda en SQLite (`text('location').notNull()`, [src/db/schema.ts:15](src/db/schema.ts#L15)) con los valores literales `'home' | 'gym' | 'both'` (ver `LOCATIONS` en `StepLocation.tsx:8`).
2. `useProfileStore()` expone `profile` con ese mismo valor, leído tal cual desde SQLite — no se detectó ninguna transformación, `?? 'gym'` por defecto, ni pérdida de valor en el camino (`training.tsx:106` — `const { profile } = useProfileStore();`).
3. `training.tsx` usa `profile.location` en DOS sitios con criterios **distintos**:
   - Línea 127: `const isGym = profile?.location === 'gym' || profile?.location === 'both';` (usado solo para la UI, ej. `bwLabel`, no para el filtro E-3).
   - Línea 230: `if (profile?.location === 'both') { setWhereOpen(true); } else { void doStartSession(null); }` — **esta es la única rama que decide si `context` puede llegar a ser `'home'`.**

Es decir: **`profile.location` se lee correctamente y sin pérdida de datos**. El problema no está en la lectura del perfil, sino en que `handleStart()` solo traduce `location==='both'` en una posible elección de `context='home'` vía el `VulcanBottomSheet`. Para `location==='home'` puro, el valor de `context` que llega a `doStartSession` y a `setTrainingContext` es siempre **`null`**, nunca `'home'`.

---

## 3. ¿Se ejecuta el filtro con condición mal escrita, o nunca se invoca?

**Confirmado: nunca se invoca para usuarios con `location==='home'` puro.**

La condición exacta que decide si el bloque de sustitución corre es:

```typescript
// training.tsx:158
if (context === 'home') {
  ... // todo el bloque de sustitución E-3
}
```

`context` es el parámetro de `doStartSession(context)`, y el único lugar que le puede asignar el string `'home'` es el `onSelect` del `VulcanBottomSheet` ("¿Dónde entrenas hoy?"), que **solo se muestra si `profile.location === 'both'`** (`handleStart()`, línea 230). Para todo perfil con `location === 'home'` (sin ser `'both'`), `handleStart()` cae en la rama `else` y llama `doStartSession(null)` — nunca `doStartSession('home')`.

No es un typo de comparación de strings (no compara contra `'casa'`, `'Home'`, etc. — el string `'home'` en sí está bien escrito en el `if`). Es, tal como se sospechaba, **una rama que solo cubre el caso `'both'` y no tiene ninguna rama equivalente para el caso `'home'` puro**. El código fue diseñado así intencionalmente para E-2/E-3 ("Solo aparece si `profile.location === 'both'`", según `CLAUDE.md`), pero eso significa que el bloque de sustitución de equipamiento en vivo **nunca corre** para el segmento de usuarios "solo casa".

---

## 4. ¿Qué falla exactamente cuando el filtro no se invoca?

Para `location==='home'` puro, la protección contra ejercicios incompatibles con el equipamiento del usuario depende **enteramente** de que la generación del plan (`generatePlan()` → `canDoExercise()`, sección 1.2) haya filtrado correctamente en el momento en que el plan fue creado/regenerado. Esa parte del código **sí** usa `profile.location` correctamente (`isGym = location==='gym'||'both'` → `false` para `'home'`), así que un plan recién generado para un usuario `'home'` no debería contener ejercicios que requieran equipamiento no declarado.

El problema aparece cuando el equipamiento del usuario **cambia después** de que el plan ya fue generado y **el usuario no regenera el plan** (la regeneración es una oferta, no automática — ver `equipment.tsx`, sección "Al guardar: ... ofrece regenerar el plan"). En ese escenario:

- Un usuario `'both'` que hoy elige "Entrenar en casa" SÍ obtiene la re-sustitución en vivo (E-3 corre, `canDoAtHome`/`getAlternatives` reemplazan ejercicios de gym por alternativas de casa, o los marcan con "Sin equivalente en casa").
- Un usuario `'home'` puro en la misma situación (equipamiento desactualizado en un plan viejo) **no tiene ninguna red de seguridad en tiempo de sesión** — el plan almacenado se usa tal cual, sin pasar nunca por `canDoAtHome`/`getAlternatives`, porque `context` nunca es `'home'` para él.

En resumen: el filtro, cuando se ejecuta (usuarios `'both'` en modo casa), hace lo correcto (no se detectó lógica de comparación invertida ni condición de equipamiento mal escrita dentro del bloque). El fallo es de **cobertura**: los usuarios `location==='home'` puro quedan completamente fuera de esta corrección en vivo, dependiendo 100% de que la generación inicial del plan siga siendo válida.

---

## 5. Límite físico (sin ejercicios de peso corporal puro para espalda/dorsales o bíceps) — ¿hay fallback?

Se repasó el catálogo completo de `EXERCISES` (`src/lib/exercises.ts`) filtrando por `equipment.length === 0` (peso corporal puro) y `category === 'pull'`:

| id | primaryMuscles | isCompound |
|---|---|---|
| `superman` | back, glutes | false |
| `ytw_prone` | back, shoulders | false |
| `snow_angel_prone` | back, shoulders | false |

**No existe ningún ejercicio `category:'pull'` con `equipment: []` que sea compuesto**, y **ninguno tiene `biceps` ni `lats` como `primaryMuscles`** (todos los movimientos de dominada/remo/curl requieren `pullupBar`, `dumbbells`, `barbellPlates`, `trx`, `resistanceBands` o `cableMachine`).

Rastreando qué pasa en `selectExercisesForDay()` (`plan-generator.ts:118-189`) cuando `equipment = []` e `isGym = false`, para un día `'pull'`:

- `pickRoundRobin(true, counts.compounds)` (compuestos) construye `pools` filtrando `category==='pull' && isCompound===true` sobre el `available` ya filtrado por `canDoExercise` → **pool vacío**. El `while` interno detecta `pools[p].length === 0` para el único pool, hace `continue`, `anyPicked` queda `false`, y **rompe el bucle en la primera iteración** (`plan-generator.ts:168-177`). Resultado: `compounds = []`.
- `pickRoundRobin(false, counts.isolations)` sí encuentra `superman`, `ytw_prone`, `snow_angel_prone` (pool no vacío) y rellena con esos.

**No hay ningún fallback explícito** (no hay mensaje de aviso, no hay sustitución por un ejercicio de otra categoría, no hay `throw`, no hay relleno con un placeholder). El día `'pull'` (o el bloque `'pull'` dentro de un día `'upper'`) para un usuario `location==='home'` con **cero equipamiento registrado** queda silenciosamente con:
- 0 ejercicios compuestos de tirón.
- Como mucho 2-3 ejercicios de aislamiento centrados en espalda/hombros/glúteos, **sin ningún trabajo directo de bíceps ni de dorsal ancho (lats)**.

Este comportamiento es consistente con el límite físico ya documentado (no existen movimientos de bíceps/dorsal ancho sin ningún accesorio), pero confirma que **el generador no compensa el hueco de ninguna manera** — simplemente entrega un día más corto/incompleto sin señalarlo al usuario ni en el plan ni en la UI de `training.tsx`.

---

## 6. Hipótesis de causa raíz (HIPÓTESIS, no conclusión verificada en runtime/dispositivo)

La sospecha original ("el filtro nunca se ejecuta correctamente para `location='home'`") es **parcialmente correcta y parcialmente una simplificación**:

- **Confirmado por lectura de código:** el filtro E-3 en vivo (`canDoAtHome`/`getAlternatives` dentro de `doStartSession`) **nunca se invoca** para usuarios con `location==='home'` puro, porque `handleStart()` solo ofrece la pregunta "¿Dónde entrenas hoy?" (y por tanto solo puede producir `context==='home'`) cuando `profile.location==='both'`. Es exactamente el patrón "un `if` que solo cubre `'gym'`/`'both'` y no tiene rama para `'home'`" que se sospechaba, aunque en este caso la rama que falta es la de disparar el filtro, no una comparación de string incorrecta.
- **Hipótesis (sin verificar en dispositivo):** en la práctica esto probablemente no se nota en la mayoría de los casos, porque `generatePlan()` (sección 1.2) sí filtra correctamente por equipamiento de casa en el momento de generar/regenerar el plan. El impacto real del hueco de cobertura se limitaría a un escenario más estrecho: usuario `'home'` que **cambia su equipamiento** (quita o añade ítems en "Mi equipamiento") y **no acepta regenerar el plan** cuando la app se lo ofrece — en ese caso, a diferencia de los usuarios `'both'`, no existe ninguna corrección de emergencia en tiempo de sesión.
- **Hallazgo adicional, también hipótesis de impacto (el código lo confirma, pero no se validó en un dispositivo real):** independientemente del punto anterior, cualquier usuario `'home'` con equipamiento insuficiente para trabajar espalda/bíceps (en el caso extremo, cero equipamiento) recibirá días `pull`/`upper` con cero ejercicios compuestos de tirón y ningún trabajo directo de bíceps o dorsal ancho, sin ningún aviso ni fallback — esto ocurre ya en `generatePlan()`, es independiente del bug de `handleStart()`/E-3, y coincide con el límite físico documentado del catálogo de ejercicios.

No se modificó ningún archivo de código para esta auditoría.
