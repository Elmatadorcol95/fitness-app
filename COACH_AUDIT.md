# COACH_AUDIT — El coach solo ajusta la primera transición (serie 1→2)

## 1. Lógica del coach: dónde vive y qué la dispara

**Archivo:** `src/store/session.store.ts`  
**Función:** acción `completeSet` (líneas 350–389)

```javascript
completeSet: (exIdx, setIdx) => {
  const exercises    = [...get().exercises];
  const ex           = { ...exercises[exIdx] };
  const sets         = [...ex.sets];
  const wasCompleted = sets[setIdx].completed;

  sets[setIdx] = { ...sets[setIdx], completed: !wasCompleted };

  if (!wasCompleted) {                          // ← rama "marcar nueva"
    hapticsLight();
    const doneSt  = sets[setIdx];              // serie recién completada
    const nextIdx = sets.findIndex((s, i) => i > setIdx && !s.completed);

    if (nextIdx !== -1) {
      const hint = computeCoach(
        { actualReps: doneSt.actualReps, weightKg: doneSt.weightKg, rir: doneSt.rir },
        sets[nextIdx].weightKg, sets[nextIdx].actualReps,
        ex.planRepsMin, ex.planRepsMax, equip, ex.targetRir,
      );
      sets[nextIdx] = {
        ...sets[nextIdx],
        coachReason: hint?.reason,
        ...(hint
          ? { actualReps: hint.reps, ...(hint.kg > 0 ? { weightKg: hint.kg } : {}) }
          : {}),      // ← si hint === null, no toca nada en nextIdx
      };
    }
    set({ exercises, restTimerSeconds: ex.restSeconds, restTimerRunning: true });
  }
},
```

El bloque `if (!wasCompleted)` se ejecuta **cada vez** que el usuario marca una
serie nueva, sin importar qué número de serie sea. **No hay índice fijo ni
condición "solo serie 1".** El coach corre en cada transición n → n+1.

---

## 2. Índices: ¿hay algo hardcodeado?

No. Los dos índices son dinámicos:

```javascript
const doneSt  = sets[setIdx];                                         // la recién marcada
const nextIdx = sets.findIndex((s, i) => i > setIdx && !s.completed); // la siguiente sin completar
```

Para un ejercicio de 4 series:
- Marca serie 0 → `nextIdx = 1` ✓
- Marca serie 1 → `nextIdx = 2` ✓
- Marca serie 2 → `nextIdx = 3` ✓
- Marca serie 3 → `nextIdx = -1` (no hay siguiente) → coach no corre (correcto)

El coach **intenta correr** en cada transición. No hay hardcoding del índice.

---

## 3. Lectura del valor: ¿llega al coach el valor correcto?

**Sí, para la serie marcada.** El Pressable del checkmark en `SetRow`
(session.tsx, líneas 147–155) hace un "flush" síncrono de los campos locales
antes de llamar a `onComplete()`:

```javascript
<Pressable onPress={() => {
  const rVal = parseInt(repsStr, 10);
  if (!isNaN(rVal) && rVal > 0) onChangeReps(rVal);      // → updateSetField(...)
  const kVal = parseFloat(kgStr);
  if (!isNaN(kVal) && kVal >= 0) onChangeWeight(kVal);   // → updateSetField(...)
  const rirVal = parseInt(rirStr, 10);
  if (!isNaN(rirVal) && rirVal >= 0) onChangeRir(rirVal); // → updateSetField(...)
  onComplete();                                            // → completeSet(...)
}}>
```

Zustand `set()` es síncrono. Cuando `completeSet` llama a `get().exercises`,
los tres campos ya están confirmados en el store. **No hay problema de
no-confirmación en los valores de la serie que se acaba de marcar.**

El problema no está aquí.

---

## 4. kg=0 en la serie 3: ¿el coach no se ejecutó o ejecutó y devolvió 0?

**El coach se ejecuta, pero devuelve `null`.** Veamos por qué.

### Inicialización

`startSession` construye TODAS las series con `buildSetState`:

```javascript
sets: Array.from({ length: ex.sets }, (_, s) =>
  buildSetState(s, targetInit, lastData.weightKg),
),
```

```javascript
function buildSetState(index, targetReps, lastWeightKg) {
  return { ..., weightKg: lastWeightKg ?? 0, ... };
}
```

Cuando el ejercicio no tiene historial (`lastWeightKg = null`):
→ **todas las series arrancan con `weightKg = 0`.**

### Transición 1→2 (funciona)

El usuario entra kg=20, hace serie 1 (ej. 10 reps, 20 kg, RIR=3).
`computeCoach` calcula e1RM ≈ 28.67, sugiere 22 kg.
`hint = { reps: 8, kg: 22, reason: "Fácil → sube a 22 kg" }`.
`hint.kg = 22 > 0` → `sets[1].weightKg = 22`. ✓ **El usuario ve 22 kg en serie 2.**

### Transición 2→3 (no funciona)

El usuario hace serie 2 exactamente como el coach sugirió: 8 reps, 22 kg, RIR=3.

`computeCoach({ actualReps:8, weightKg:22, rir:3 }, nextKg=0, nextReps=10, 8, 12, 'dumbbell', 3)`:

```
effectiveReps = max(8+3, 1) = 11
e1rm   = 22 × (1 + 11/30) = 30.07
idealKg = 30.07 / (1 + (8+2)/30) = 22.55
inc    = 2  → rounded = 22
maxSwing = max(22×0.15, 2) = 3.3
suggested = max(22-3.3, min(22+3.3, 22)) = 22

serieDura = (rir=3 < targetRir=3)? NO. (rir=3 <= 1)? NO. → false
done.rir=3 > targetRir=3? NO → piso mínimo no aplica
isUp = 22 > 22? NO
isDown = 22 < 22? NO
actualReps=8 en rango [8,12] ✓
→ última línea: return null  // "En rango y en objetivo: sin cambio"
```

`hint = null`. El bloque de actualización de `sets[nextIdx]`:

```javascript
...(hint ? { actualReps: hint.reps, ...(hint.kg > 0 ? {...} : {}) } : {})
// hint === null → spread vacío → sets[2] NO se modifica
```

**Serie 3 se queda con `weightKg=0` (valor de inicialización)** y
`actualReps=10` (el `targetInit` genérico, no el 8 que el coach puso en serie 2).

El coach **no devuelve 0** — devuelve `null`. La serie 3 muestra 0 porque nadie
le ha sobreescrito el valor de `buildSetState`. La raíz es la combinación de:

1. Sin historial → `buildSetState` inicializa `weightKg=0` en todas las series.
2. El coach devuelve `null` cuando la sesión va "según el plan".
3. El código de `completeSet` no propaga el peso de la serie actual a la siguiente
   cuando `hint === null`.

---

## 5. Veredicto

**El coach sí corre en cada transición** — no hay índice fijo ni condición de
"solo una vez". La causa real es **la falta de propagación cuando `hint === null`**:
`computeCoach` devuelve `null` cuando la serie fue exactamente como se esperaba
(reps en rango, RIR igual al objetivo), y en ese caso el código de `completeSet`
no toca la siguiente serie, que conserva su `weightKg=0` de inicialización.

La primera transición funciona porque el usuario introdujo un peso real en la
serie 1 vacía, el coach lo proyecta hacia arriba y devuelve un `hint !== null`,
sobreescribiendo el 0 de la serie 2. La segunda transición falla porque la serie 2
ya ejecutó el plan correctamente y el coach dice "sin cambio" (null), dejando la
serie 3 en 0.

**Recomendación:** en `completeSet`, cuando `hint === null` (sin cambio de
coach), igualar siempre `weightKg` de la siguiente serie al peso de la serie
recién completada si la siguiente tiene `weightKg=0`. Es decir, usar el peso
actual como baseline antes de aplicar la sugerencia del coach, en lugar de
dejarlo sin tocar cuando el coach no tiene nada que decir.

---

## Archivos leídos

| Archivo | Motivo |
|---|---|
| `src/store/session.store.ts` | Código completo de `completeSet`, `computeCoach`, `buildSetState`, `startSession` |
| `src/app/session.tsx` | Código completo de `SetRow` — flush del checkmark, estado local vs. store, `useEffect` de sync |

**Ningún archivo fue modificado.**
