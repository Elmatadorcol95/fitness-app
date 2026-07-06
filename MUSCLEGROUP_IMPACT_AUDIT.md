# Auditoría de impacto de `MuscleGroup`

**Tipo:** Auditoría de solo lectura. Ningún archivo fue modificado.
**Fecha:** 2026-07-06.
**Contexto:** continuación de `CATALOG_COMPLETENESS_AUDIT.md`, que ya encontró que
`ExerciseCategory` tiene 9 objetos `Record<ExerciseCategory, string>` exhaustivos
repartidos en 4 archivos. Este documento repite el mismo análisis para `MuscleGroup`.

---

## 1. Definición del tipo `MuscleGroup`

`src/lib/exercises.ts`, líneas 1-4:

```ts
export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core'
  | 'lats' | 'traps' | 'forearms' | 'abs';
```

14 valores. Usado en la interfaz `Exercise` (líneas 20-21):

```ts
primaryMuscles: MuscleGroup[];
secondaryMuscles: MuscleGroup[];
```

No incluye `'adductors'` (aductores) ni ningún otro valor no listado en la
auditoría anterior.

---

## 2. Búsqueda de `Record<MuscleGroup, ...>` (o patrón equivalente exhaustivo)

**Resultado: ninguno.** Se buscó en todo `src/` el patrón `Record<MuscleGroup`,
además de `MUSCLE_GROUPS`, `ALL_MUSCLES`, `MuscleGroup[]` fuera de la propia
definición de tipo, y `Object.keys/values` sobre algún diccionario de músculos.
La única coincidencia de `MuscleGroup[]` son las dos líneas de la propia
interfaz `Exercise` (20-21) — no hay ningún mapa de UI tipado como
`Record<MuscleGroup, X>` en ningún archivo del proyecto.

Esto contrasta directamente con `ExerciseCategory`, que sí tiene 9 objetos
`Record<ExerciseCategory, string>` en 4 archivos (ver auditoría anterior).
**`MuscleGroup` no tiene ningún equivalente exhaustivo hoy.**

Lo que SÍ existe es un diccionario de traducción, pero tipado de forma laxa
(no exhaustivo) — ver sección 4:

```ts
// src/components/workout/ExerciseCard.tsx:150
const MUSCLE_LABELS: Record<string, { es: string; en: string; fr: string }> = { ... };
```

Al ser `Record<string, ...>` y no `Record<MuscleGroup, ...>`, TypeScript **no
exige** que estén las 14 claves — es exactamente el mismo patrón "laxo" que ya
se identificó para `CATEGORY_COLORS` de `ChangeExerciseModal.tsx` en la
auditoría anterior. Añadir un valor nuevo a `MuscleGroup` (p. ej. `'adductors'`)
**no rompe la compilación** en ningún punto del proyecto.

---

## 3. ¿Hay lógica que itere/filtre sobre TODOS los valores de `MuscleGroup`?

**No se encontró ninguna.** Se revisaron todos los usos de `primaryMuscles` /
`secondaryMuscles` en el proyecto (49 apariciones, casi todas dentro de los
literales de `EXERCISES` en `exercises.ts`). Fuera del catálogo, los únicos
consumidores son:

| Archivo | Línea | Qué hace |
|---|---|---|
| `src/lib/exercises.ts` | 653, 655-656 | `getAlternatives()`: compara `primaryMuscles` de DOS ejercicios concretos para solapamiento (`current.primaryMuscles.includes(m)`) — nunca recorre el union completo, solo arrays de instancia. |
| `src/lib/pullBicepCoverage.ts` | 14 | `.filter(e => e.primaryMuscles.includes('biceps'))` — chequeo de un literal concreto (`'biceps'`), no una iteración sobre todos los valores. |
| `src/app/training.tsx` | 289 | Mismo patrón: `.some(e => e.primaryMuscles.includes('biceps'))`. |
| `src/app/session.tsx` | 234 | Mismo patrón: `.some(e => e.primaryMuscles.includes('biceps'))`. |
| `src/app/session.tsx` | 222, 748, 751, 763, 766 | Renderizan `exercise.primaryMuscles` / `secondaryMuscles` de UN ejercicio ya elegido, mapeando cada elemento con `muscleLabel()`. |
| `src/app/exercise/[id].tsx` | 231-241 | Igual: renderiza los músculos del ejercicio actual, no la lista completa de `MuscleGroup`. |
| `src/components/workout/ExerciseCard.tsx` | 123-126 | Igual, muestra los primeros 3 `primaryMuscles` del ejercicio. |
| `src/components/workout/ChangeExerciseModal.tsx` | 80-83 | Igual, primeros 3 `primaryMuscles` del ejercicio alternativo. |

**No existe** ninguna pantalla de checkboxes de músculos, ningún filtro de
búsqueda "buscar ejercicios por músculo" que enumere el union completo, ni
ningún selector de músculos en el onboarding. Se verificó explícitamente
`StepInjuries.tsx` (paso de lesiones del onboarding) porque era el candidato
más probable a algo así: es un `TextInput` libre (`draft.injuries`), sin
relación con `MuscleGroup` ni con ninguna lista de partes del cuerpo
predefinida.

**Confirmación directa a la pregunta del encargo:** añadir `'adductors'` al
union de `MuscleGroup` **no requeriría tocar ninguna lógica de filtrado o
iteración exhaustiva**, porque no existe ninguna. Los únicos efectos serían:

1. **Ningún ejercicio se vería afectado automáticamente** — haría falta añadir
   `'adductors'` manualmente a `primaryMuscles`/`secondaryMuscles` de los
   ejercicios que correspondan (ej. `sumo_squat`, `cable_hip_abduction`) para
   que el valor aparezca en algún sitio real.
2. **La traducción NO rompe nada, pero queda incompleta en silencio:** como
   `MUSCLE_LABELS` es `Record<string, ...>` (sección 2), `muscleLabel('adductors', lang)`
   compilaría y correría sin error, devolviendo el fallback `?? muscleKey`
   (línea 168 de `ExerciseCard.tsx`) — es decir, mostraría literalmente el
   texto `"adductors"` en la UI hasta que alguien añada la entrada a mano en
   el diccionario.

Esto es un contraste importante con `ExerciseCategory`: ahí añadir un valor
nuevo **sí** rompe la compilación (9 `Record` exhaustivos). Con `MuscleGroup`,
añadir un valor nuevo es "seguro" a nivel de tipos pero silenciosamente
incompleto a nivel de producto — es más fácil olvidarse de traducirlo porque
TypeScript no te obliga a hacerlo.

---

## 4. ¿`muscleLabel()` es la única función de traducción de músculos?

**Sí, es la única.** Se buscó en todo el proyecto cualquier función o
diccionario adicional que tradujera nombres de músculo (variantes de nombre
como `muscleName`, `translateMuscle`, diccionarios con las mismas cadenas
traducidas como `'Isquios'`, `'Cuádriceps'`, `'Trapecio'`) y no apareció
ninguna copia ni función paralela.

- **Definición única:** `src/components/workout/ExerciseCard.tsx`, líneas
  150-169 — diccionario `MUSCLE_LABELS` (línea 150) + función exportada
  `muscleLabel()` (línea 167).
- **Se importa desde 4 archivos** (ninguno redefine su propia versión):
  - `src/app/history.tsx:14`
  - `src/app/exercise/[id].tsx:14`, usada en líneas 232 y 241
  - `src/app/session.tsx:19`, usada en líneas 222, 751, 766
  - `src/components/workout/ChangeExerciseModal.tsx:7`, usada en línea 82
  - (`ExerciseCard.tsx` la define y también la usa internamente, línea 125)

**Nota adicional (no pedida explícitamente, pero relevante):** a diferencia
de casi todo el resto de texto de la app, las etiquetas de músculo **no pasan
por `i18next`** — no hay ninguna clave `muscle.*` en `src/i18n/locales/{es,en,fr}.json`.
Es un diccionario hardcodeado y paralelo al sistema de traducción normal del
proyecto. Esto significa que la pregunta original del encargo ("tocar las
etiquetas i18n") no aplica literalmente: no son etiquetas i18n, son un
`Record<string,...>` local a `ExerciseCard.tsx`. Quien vaya a añadir
`'adductors'` deberá editar ese diccionario directamente, no los JSON de
`src/i18n/locales/`.

---

## Resumen

| Pregunta | Respuesta |
|---|---|
| ¿`Record<MuscleGroup, string>` en algún sitio? | No, ninguno. |
| ¿Algún `Record` tipado sí exhaustivo sobre `MuscleGroup`? | No. |
| ¿Diccionario de traducción de músculos existe? | Sí, pero tipado como `Record<string,...>` (laxo) — no fuerza exhaustividad. |
| ¿Vive en el sistema i18n (`i18next`)? | No — diccionario hardcodeado en `ExerciseCard.tsx`, no en `src/i18n/locales/`. |
| ¿Alguna iteración/filtro sobre TODOS los valores de `MuscleGroup`? | No, ninguna. Solo checks de literales concretos (`'biceps'`) o mapeos sobre arrays de instancia de un ejercicio ya elegido. |
| ¿Pantalla de checkboxes/filtro por músculo? | No existe. `StepInjuries` es texto libre, sin relación con `MuscleGroup`. |
| ¿Añadir `'adductors'` rompe la compilación? | No, en ningún punto. |
| ¿Añadir `'adductors'` tiene efecto real sin más cambios? | No — necesita (a) etiquetar ejercicios reales con `'adductors'` en `exercises.ts`, y (b) añadir la entrada a `MUSCLE_LABELS` a mano, o se mostrará el string crudo `"adductors"` en la UI. |
| ¿`muscleLabel()` es la única función de traducción? | Sí, única definición (`ExerciseCard.tsx:167`), importada en 4 archivos más. |

No se modificó ningún archivo durante esta auditoría.
