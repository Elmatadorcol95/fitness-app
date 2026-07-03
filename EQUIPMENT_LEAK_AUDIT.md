# Auditoría: fuga de "Curl de bíceps" (dumbbells) con `equipment=['bodyweight']` en sesión `home`

**Solo diagnóstico — ningún archivo fue modificado.**

---

## 1. El ejercicio y su equipamiento real

`id: 'db_bicep_curl'` (nombre `es: "Curl de bíceps"`) — [src/lib/exercises.ts:203-209](src/lib/exercises.ts#L203-L209):

```typescript
{
  id: 'db_bicep_curl',
  name: { es: 'Curl de bíceps', en: 'Bicep curl', fr: 'Curl biceps haltères' },
  category: 'pull', isCompound: false, difficulty: 'beginner',
  primaryMuscles: ['biceps'], secondaryMuscles: ['forearms'],
  equipment: ['dumbbells'],
},
```

**Confirmado: requiere `dumbbells`.** No hay ninguna variante bodyweight de este ejercicio en el catálogo (ver también `EXERCISES.filter(e => e.category==='pull' && e.equipment.length===0)` → solo `superman`, `ytw_prone`, `snow_angel_prone`, ninguno con `biceps` en `primaryMuscles` — ya documentado en auditorías previas).

---

## 2. ¿El plan fue regenerado después del último cambio de equipamiento?

**No se puede confirmar ni descartar con los datos que la app guarda hoy — hallazgo en sí mismo.**

- `workout_plans.generated_at` existe (`schema.ts:89`, `generatedAt: integer('generated_at').notNull()`) y sí registra cuándo se generó el plan actualmente activo.
- **`profile` NO tiene ninguna columna de tipo `updated_at`/`equipment_updated_at`** (`schema.ts:3-20`): solo existe `createdAt`, fijado una única vez en el onboarding (`OnboardingFlow.tsx`, `insert` inicial) y **nunca vuelto a tocar**. Confirmado en `profile.store.ts:69-78`, `updateEquipmentAndLocation()`:
  ```typescript
  updateEquipmentAndLocation: async (location, equipment) => {
    const current = get().profile;
    if (!current) return;
    const equipmentJson = JSON.stringify(equipment);
    await db
      .update(profileTable)
      .set({ location, equipment: equipmentJson })
      .where(eq(profileTable.id, current.id));
    set({ profile: { ...current, location, equipment: equipmentJson } });
  }
  ```
  No hay ningún `updatedAt`/timestamp en el `.set(...)`. Cada vez que el usuario cambia su equipamiento (desde `equipment.tsx` o desde `StepLocation` en un onboarding nuevo), SQLite sobrescribe el valor de `equipment` sin dejar rastro de CUÁNDO ocurrió ese cambio.

**Consecuencia**: no existe ninguna columna en la base de datos que permita comparar "fecha del último cambio de equipamiento" contra `workoutPlans.generatedAt`. Es imposible, con el esquema actual, determinar de forma programática si el plan activo es anterior o posterior al último cambio de equipamiento — solo se podría inferir por lógica externa (por ejemplo, si el usuario recuerda haber cambiado equipamiento y no haber aceptado la oferta de regenerar el plan en `equipment.tsx`, que es opcional vía `VulcanDialog`, sección "Al guardar... ofrece regenerar el plan").

**Esto por sí solo ya es compatible con la hipótesis "plan desactualizado"**: si el plan fue generado cuando el perfil tenía `dumbbells` (o cuando `location==='gym'`) y el usuario luego cambió a `equipment=['bodyweight']` sin aceptar la regeneración ofrecida, el plan almacenado seguiría conteniendo `db_bicep_curl` sin que nada en la app lo detecte o corrija automáticamente — no habría manera de comprobar esto en retrospectiva porque no se guarda cuándo cambió el equipamiento.

---

## 3. `canDoExercise()` — lógica de generación del plan (verbatim)

[src/lib/plan-generator.ts:78-82](src/lib/plan-generator.ts#L78-L82):

```typescript
function canDoExercise(ex: Exercise, equipment: string[], isGym: boolean): boolean {
  if (isGym) return true;
  if (ex.equipment.length === 0) return true;
  return ex.equipment.every(eq => equipment.includes(eq));
}
```

Uso en `generatePlan()` — [plan-generator.ts:202](src/lib/plan-generator.ts#L202):

```typescript
const isGym  = profile.location === 'gym' || profile.location === 'both';
```

**Punto crítico**: para `location==='both'`, `isGym` es **siempre `true`** en tiempo de generación — independientemente del contenido real de `profile.equipment`. Eso significa que `canDoExercise()` devuelve `true` para **todos** los ejercicios del catálogo (incluido `db_bicep_curl`) cuando `location==='both'`, sin mirar siquiera el array de equipamiento. Esto es coherente con el diseño documentado (el plan base para "ambos" asume acceso a gimnasio completo; la adaptación a "hoy entreno en casa" se delega al filtro E-3 en vivo — ver sección 4), **pero es la primera pieza de la cadena que permite que `db_bicep_curl` termine en el plan almacenado de un usuario `'both'` con `equipment=['bodyweight']`, incluso con un plan recién generado, sin ninguna staleness de por medio.**

Para `location==='home'` puro, en cambio, `isGym=false` y `canDoExercise` sí filtra correctamente por `equipment.every(...)` — un plan **recién generado** para un usuario `'home'` puro con `equipment=['bodyweight']` no debería poder contener `db_bicep_curl` (`['dumbbells'].every(eq => ['bodyweight'].includes(eq))` → `false`). Para este segmento de usuarios, la única vía de fuga sería un plan desactualizado (sección 2).

---

## 4. Filtro E-3 en vivo — rama "sin alternativa" (verbatim)

[src/app/training.tsx:170-203](src/app/training.tsx#L170-L203), dentro de `doStartSession()`, bloque `if (context === 'home')`:

```typescript
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
```

Y la única consecuencia visible de `noAltIndices` — [training.tsx:211-219](src/app/training.tsx#L211-L219):

```typescript
await startSession(currentPlan.id, sessionDay);
// Marcar los ejercicios sin alternativa en casa con una nota visible
if (noAltIndices.length > 0) {
  const noteText = t('workout.session.noHomeAlt');
  for (const idx of noAltIndices) {
    updateNote(idx, noteText);
  }
}
```

**Respuesta directa a la pregunta**: cuando un ejercicio no es realizable con el equipamiento actual (`!canDoAtHome`) **y** `getAlternatives()` devuelve un array vacío, el código:

- **NO lo elimina** de la sesión.
- **NO lanza ningún error ni bloquea el arranque de la sesión.**
- **Lo deja tal cual** (`return ex;` — mismo `exerciseId`, en este caso `db_bicep_curl`, con `equipment:['dumbbells']` intacto).
- Solo guarda el índice en `noAltIndices` para, después de que la sesión ya arrancó, adjuntarle una **nota de texto libre** (`updateNote(idx, t('workout.session.noHomeAlt'))` → "Sin equivalente en casa con tu equipamiento") al campo `note` de ese ejercicio en el store de sesión.

Es decir: **fail-open, silencioso** en el sentido de que el ejercicio incompatible sigue siendo completamente funcional en la UI de la sesión (tabla de series, pesos, etc.) — la única señal de que algo no encaja es una nota de texto secundaria que el usuario puede no leer, no un bloqueo ni una sustitución forzada por un ejercicio bodyweight genérico.

**Verificación de por qué `getAlternatives()` devuelve `[]` para `db_bicep_curl` con `equipment=['bodyweight']`**: `getAlternatives()` (`exercises.ts:638-659`) busca, dentro de `category==='pull'`, ejercicios con solapamiento en `primaryMuscles` (`['biceps']`) y equipamiento compatible. Los únicos `pull` bodyweight del catálogo (`superman`, `ytw_prone`, `snow_angel_prone`) tienen `primaryMuscles: ['back', ...]`/`['back','shoulders']` — **ninguno incluye `'biceps'`** — por lo que el filtro `ex.primaryMuscles.some(m => current.primaryMuscles.includes(m))` no encuentra ningún candidato. `alts.length === 0` es el resultado esperado y correcto dado el catálogo actual; el problema no es un bug en `getAlternatives()`, es que la rama "sin alternativa" de `doStartSession()` no tiene ningún plan B más allá de la nota de texto.

Nota adicional de contexto: los banners ámbar de "poca variedad de espalda/sin bíceps" añadidos en sesiones anteriores de este chat (`StepLocation.tsx`, `equipment.tsx`, `training.tsx`, `session.tsx`) son puramente informativos — **no filtran ni eliminan ningún ejercicio**. Coexisten con esta fuga sin corregirla: el usuario podría ver el banner "sin ejercicios de bíceps por falta de equipamiento" y, al mismo tiempo, tener `db_bicep_curl` (que requiere `dumbbells`) todavía presente en su sesión en vivo por esta misma rama fail-open.

---

## 5. Hipótesis de causa raíz (HIPÓTESIS, no confirmada en dispositivo)

Hay dos mecanismos independientes que pueden producir exactamente el síntoma reportado, y con los datos actuales **no es posible saber cuál ocurrió en este caso concreto** (por la falta de timestamp de equipamiento, sección 2):

- **Hipótesis A — plan desactualizado (staleness)**: el plan activo fue generado en un momento en que `profile.equipment` incluía `dumbbells` (o `profile.location` era `'gym'`), y el usuario cambió su equipamiento a `['bodyweight']` después, sin aceptar la oferta de regenerar el plan en `equipment.tsx`. El plan almacenado sigue teniendo `db_bicep_curl` desde su generación original. Esto **no sería un bug nuevo** — es exactamente el escenario para el que existe la advertencia de regenerar el plan tras cambiar equipamiento, y es coherente con `CLAUDE.md` ("Si el equipamiento cambia respecto al anterior, ofrecer regenerar el plan").

- **Hipótesis B — fuga estructural para `location==='both'`, independiente de cualquier staleness**: si el perfil es `location==='both'`, `canDoExercise()` siempre evalúa `isGym=true` en generación (sección 3), así que el plan base **siempre** puede incluir `db_bicep_curl` sin importar cuán reciente sea la generación ni cuál sea el equipamiento de casa declarado — el diseño delega la corrección al filtro E-3 en tiempo de sesión. Pero ese filtro, cuando no encuentra alternativa bodyweight válida (como es el caso de cualquier ejercicio de bíceps, sección 4), **deja pasar el ejercicio original sin cambios**, solo con una nota de texto. En este escenario, la fuga ocurriría **siempre** que un usuario `'both'` con `equipment=['bodyweight']` entrene "en casa" y su día incluya cualquier ejercicio de bíceps o de espalda sin alternativa bodyweight — sin necesidad de que el plan esté desactualizado.

Para un usuario `location==='home'` puro (no `'both'`), la Hipótesis B no aplicaría a un plan recién generado (`canDoExercise` sí filtra correctamente ahí), así que si el usuario reportante tiene `location==='home'` puro, la Hipótesis A (staleness) sería la explicación más probable; si tiene `location==='both'`, la Hipótesis B es plausible incluso sin staleness. **No se verificó en este audit cuál es el `location` real del perfil del usuario que reportó el síntoma** — sería el primer dato a pedir para descartar una de las dos hipótesis.

No se modificó ningún archivo para esta auditoría.
