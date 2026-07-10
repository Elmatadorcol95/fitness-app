# Auditoría de integración — Fase 2 Paso 2 (Cooldown)

Auditoría de solo lectura. Ningún archivo de código fue modificado para
producir este documento.

---

## 1. Flujo de cierre de sesión completo

`doFinish()` vive en `src/app/session.tsx:288-301`:

```ts
const doFinish = useCallback(async () => {
  const today = new Date().toISOString().split('T')[0];
  const { hasPR, completedSets, plannedSets } = await finishSession();
  if (hasPR) unlockAchievement('personal_record');

  const ratio = plannedSets > 0 ? completedSets / plannedSets : 0;
  if (ratio >= 0.5) {
    const perfect = plannedSets > 0 && completedSets >= plannedSets;
    recordWorkout(today, { perfect });
    incrementDaysTrainedThisWeek();
  }

  await advanceDayIndex();
}, [finishSession, unlockAchievement, recordWorkout, incrementDaysTrainedThisWeek, advanceDayIndex]);
```

Se dispara desde dos `VulcanDialog` (`session.tsx:637-657`, confirmar finalizar /
finalizar sin completar):

```ts
onConfirm={() => { setFinishState('idle'); void doFinish(); }}
```

### Secuencia exacta (cronológica, cruzando `session.tsx` + `session.store.ts`)

1. **`finishSession()`** (`src/store/session.store.ts:462-539`) — TODO esto
   ocurre *antes* de que `doFinish()` recupere el control:
   1. Inserta la fila en `workout_sessions` (`db.insert(workoutSessions)...`, líneas 470-475).
      Si falla, hace `set({ ...EMPTY_STATE })` y devuelve `hasPR:false` de inmediato (early return, línea 476-480).
   2. Relee la sesión recién creada (`db.select().from(workoutSessions)...`, línea 482).
   3. Inserta **todas** las series de todos los ejercicios en `session_sets`
      (completadas o no — sin filtrar, líneas 487-505).
   4. **`markExerciseUsed()`** (líneas 507-518) — recorre `exercises` y, **solo
      para los que tienen al menos una serie `completed`**
      (`ex.sets.some(s => s.completed)`), busca el `Exercise` en el catálogo y
      llama `await markExerciseUsed(exercise)`. Envuelto en try/catch propio;
      un fallo aquí nunca rompe el resto.
      **Esto ocurre DENTRO del store, no en `doFinish()` — ya terminó para
      cuando `doFinish()` recibe el resultado.**
   5. **Progresión/PR** (líneas 520-532): si `planId !== null`, llama
      `runProgressionAfterSession(planId, ...)` y captura `hasPR`.
   6. Calcula `plannedSets` y `completedSets` (líneas 534-535).
   7. **`set({ ...EMPTY_STATE })`** (línea 537) — pone `isActive: false`. Esto
      es lo que hace que `_layout.tsx` deje de montar `<SessionScreen />` en el
      siguiente render (ver sección 5, mismo mecanismo pero con `isActive` en
      vez de `active`).
   8. Devuelve `{ hasPR, completedSets, plannedSets }` — la promesa se
      resuelve, y **solo entonces** `doFinish()` continúa.

2. **De vuelta en `doFinish()` (`session.tsx`)** — con `isActive` ya en
   `false` y `SessionScreen` ya fuera (o a punto de estarlo) del árbol de
   `_layout.tsx`:
   1. `if (hasPR) unlockAchievement('personal_record')` — acción de
      `gamification.store.ts`, no de `session.tsx`; no depende de que
      `SessionScreen` siga montado.
   2. Calcula `ratio = completedSets / plannedSets`.
   3. Si `ratio >= 0.5`: `recordWorkout(today, { perfect })` (que internamente
      puede llamar `unlockAchievement()` varias veces más — por contador de
      entrenos perfectos o por racha, ver `gamification.store.ts:137-142`) y
      `incrementDaysTrainedThisWeek()`.
   4. `await advanceDayIndex()` — mueve el puntero `activeDayIndex` del plan
      (`workout.store.ts`). Es lo último que ocurre.

### Dónde se calcula el ratio
En `doFinish()`, `session.tsx:293` — **no** en el store. El store solo
devuelve los conteos crudos (`completedSets`, `plannedSets`); la decisión
`>= 0.5` vive en la UI.

### Dónde se disparan logros / racha / daysTrainedThisWeek
Todos en `doFinish()` (`session.tsx:291-297`), **después** de que
`finishSession()` ya resolvió y el store de sesión ya está vacío:
- `unlockAchievement('personal_record')` — condicionado solo a `hasPR`, fuera
  del gate del ratio.
- `recordWorkout()` + `incrementDaysTrainedThisWeek()` — condicionados a
  `ratio >= 0.5`.

### Dónde se llama `markExerciseUsed()`
**No en `doFinish()`.** Vive dentro de `finishSession()`
(`session.store.ts:507-518`), ejecutado antes de la progresión/PR y antes de
vaciar el store. Para cuando `doFinish()` recibe el resultado, ya terminó.

### Cómo se muestran las celebraciones de logros al usuario
**Ni pantalla ni `Modal` nativo ni toast** — es un **overlay React Native
absolutamente posicionado, montado siempre** (no condicionado a que
`SessionScreen` exista):

- `unlockAchievement(id)` (`gamification.store.ts:156-167`) empuja el id a
  `celebrationQueue: AchievementId[]` (estado global del store, no de
  `session.tsx`).
- `AchievementCelebrationOverlay` (`src/components/gamification/AchievementCelebrationOverlay.tsx:113-128`)
  se monta **incondicionalmente** en `_layout.tsx` (ver sección 5) — no detrás
  de ningún flag `isSessionActive`/`isWarmupActive`. Lee `celebrationQueue[0]`;
  si hay algo, renderiza una tarjeta centrada (`AchievementCard`) sobre un
  backdrop opaco (`rgba(0,0,0,0.75)`, `Pressable` a pantalla completa) con
  chispas animadas, auto-dismiss a los 3.5s (`setTimeout(onDismiss, 3500)`,
  línea 76) o al tocar. Al cerrarse, `popCelebration()` saca el primero de la
  cola y, si queda otro, se re-monta (`key={current}`) y repite — logros
  múltiples se encadenan uno tras otro, nunca simultáneos entre sí.
- Es el **último** elemento del árbol en `_layout.tsx`
  (`return (<ThemeProvider>...<AchievementCelebrationOverlay /></ThemeProvider>)`),
  por lo que en React Native (donde el orden del JSX determina el
  apilamiento) queda **por encima de absolutamente todo**, incluida la propia
  `SessionScreen` mientras estuvo activa.

---

## 2. Punto de inserción propuesto para "¿Quieres estirar?"

### Recomendación
**No** insertarlo como estado local (`useState` + `VulcanDialog`) dentro de
`SessionScreen`, aunque cronológicamente encajaría entre el paso 1 (guardar
sesión) y el paso 2.1 (celebraciones) de `doFinish()`. Razón concreta abajo.

El patrón correcto es el mismo que ya usa el sistema de logros: una acción de
store global (ej. `useCooldownStore.getState().promptAfterSession(dayType,
equipment, isGym)`) llamada dentro de `doFinish()` **inmediatamente después**
de `const { hasPR, completedSets, plannedSets } = await finishSession();` y
**antes** de `if (hasPR) unlockAchievement(...)`, más un componente overlay
siempre montado en `_layout.tsx` (espejo de `AchievementCelebrationOverlay`)
que lea esa bandera. Los tres valores necesarios (`sessionDayType`,
`equipment`, `isGym`) **ya están calculados y disponibles** en el cuerpo de
`SessionScreen` antes de `doFinish()`:

```ts
// session.tsx:190-191
const equipment = parseEquipment(profile?.equipment);
const isGym     = profile?.location === 'gym' || profile?.location === 'both';
...
// session.tsx:228
const sessionDayType = currentPlan?.days.find(d => d.dbId === planDayId)?.dayType ?? null;
```

Dato importante: `sessionDayType` se busca por `planDayId` (identificador
estable del día), **no** por `currentPlan.activeDayIndex` (el índice mutable
que `advanceDayIndex()` desplaza al final de `doFinish()`). Por eso sigue
siendo válido sin importar en qué momento del `doFinish()` se lea — no hace
falta capturarlo en una variable aparte antes del `await advanceDayIndex()`.

### Riesgo de carrera de tiempos — SÍ existe, de dos formas distintas

**(a) Estado local de un componente que se está desmontando.**
`finishSession()` termina con `set({ ...EMPTY_STATE })`
(`session.store.ts:537`), que pone `isActive: false` — la misma bandera que
`_layout.tsx` usa (`isSessionActive`) para decidir si `<SessionScreen />` sigue
en el árbol (sección 5). Esa actualización de Zustand ocurre **dentro** de la
promesa que `doFinish()` está esperando, así que para cuando `await
finishSession()` devuelve el control, `isActive` ya es `false` y
`_layout.tsx` ya está programado para dejar de renderizar `SessionScreen` en
su próximo commit — puede que ya haya ocurrido, puede que esté a punto de
ocurrir en el siguiente tick. Si en ese punto `doFinish()` hiciera
`setCooldownPromptOpen(true)` (un `useState` local de `SessionScreen`), esa
actualización se aplicaría a una instancia de componente que ya no forma
parte del árbol activo (o está en vías de desaparecer junto con ella) — el
diálogo nunca llegaría a mostrarse de forma fiable. Es la misma familia de
bug que el de `VulcanDialog`/`onClose` documentado en el proyecto: una pieza
de UI efímera cuya vida depende implícitamente de que su componente
contenedor siga montado, cuando la propia operación que la dispara es la que
está desmontando ese contenedor. La única razón por la que
`unlockAchievement`/`recordWorkout`/`incrementDaysTrainedThisWeek`/
`advanceDayIndex` SÍ funcionan hoy después de este punto es que ninguno toca
estado local de `SessionScreen` — todos escriben en stores globales leídos
por componentes que están montados incondicionalmente (`AppTabs`,
`AchievementCelebrationOverlay`).

**(b) Colisión con `AchievementCelebrationOverlay` si ambos se activan casi
a la vez.** Si el punto de inserción elegido es justo antes de
`unlockAchievement('personal_record')` (para que el diálogo de estirar
aparezca "antes de las celebraciones", como pide la consigna), y la sesión
también desbloqueó un logro, ambas banderas globales (`cooldownPromptOpen` y
`celebrationQueue.length > 0`) quedarían en `true` casi en el mismo tick,
antes de que React vuelva a renderizar. El overlay de logros es
**incondicional** y va **al final** del árbol de `_layout.tsx` — por delante
de cualquier overlay que se añada antes que él en el JSX — con un backdrop
opaco a pantalla completa. Si el nuevo overlay de "quieres estirar" se monta
antes que `<AchievementCelebrationOverlay />` en el JSX, quedaría tapado por
la tarjeta de logro mientras haya alguno en cola (hasta 3.5s por logro,
encadenados). No es un crash, pero sí una colisión de atención al usuario sin
secuenciar explícitamente: hay que decidir a propósito el orden (¿cooldown
primero y logros después, o viceversa?; ¿el overlay de cooldown se abstiene
de aparecer mientras `celebrationQueue` no esté vacía?), no dejarlo al azar
del orden de montaje en el JSX.

---

## 3. Mecanismo de duración del calentamiento (5/10/15)

Todo vive en `src/app/training.tsx`, **no hay persistencia** — se elige de
nuevo cada vez.

**Diálogo "¿Quieres calentar?"** (`training.tsx:560-568`):
```tsx
<VulcanDialog
  visible={warmupPromptOpen}
  onClose={handleWarmupNo}
  title={t('workout.warmup.promptTitle')}
  confirmLabel={t('workout.warmup.yes')}
  cancelLabel={t('workout.warmup.no')}
  onConfirm={handleWarmupYes}
/>
```

**Modal de minutos con chips** (`training.tsx:570-599`, `Modal` nativo
transparente, NO `VulcanBottomSheet`):
```tsx
<Modal visible={warmupMinutesOpen} transparent animationType="fade"
       onRequestClose={() => setWarmupMinutesOpen(false)}>
  <Pressable style={StyleSheet.absoluteFill} onPress={() => setWarmupMinutesOpen(false)}>
    <View style={[StyleSheet.absoluteFill, styles.warmupMinutesBackdrop]} />
  </Pressable>
  <View style={styles.warmupMinutesCenterer} pointerEvents="box-none">
    <ThemedView type="backgroundElement" style={styles.warmupMinutesCard}>
      <ThemedText type="defaultSemiBold" style={styles.warmupMinutesTitle}>
        {t('workout.warmup.minutesTitle')}
      </ThemedText>
      <View style={styles.warmupChipRow}>
        {([5, 10, 15] as const).map((m) => (
          <Pressable key={m} onPress={() => handleWarmupMinutes(m)} style={styles.warmupChipPressable}>
            <ThemedView type="backgroundSelected" style={styles.warmupChip}>
              <ThemedText type="defaultSemiBold" style={styles.warmupChipText}>
                {t(`workout.warmup.min${m}`)}
              </ThemedText>
            </ThemedView>
          </Pressable>
        ))}
      </View>
    </ThemedView>
  </View>
</Modal>
```

**Handlers y cómo el valor llega a `generateWarmup()`** (`training.tsx:246-271`):
```ts
function doStartSession(context: 'gym' | 'home' | null) {
  if (!currentPlan) return;
  setPendingContext(context);
  setWarmupPromptOpen(true);
}

function handleWarmupNo() {
  setWarmupPromptOpen(false);
  void startRealSession(pendingContext);
}

function handleWarmupYes() {
  setWarmupPromptOpen(false);
  setWarmupMinutesOpen(true);
}

function handleWarmupMinutes(minutes: 5 | 10 | 15) {
  setWarmupMinutesOpen(false);
  if (!currentPlan) return;
  const activeIdx = currentPlan.activeDayIndex % currentPlan.days.length;
  const dayType    = currentPlan.days[activeIdx].dayType;
  // pendingContext: 'home' = casa; 'gym' o null (perfil solo-gym) = gimnasio.
  const warmupIsGym = pendingContext !== 'home';
  const items = generateWarmup(dayType, equipment, warmupIsGym, minutes);
  startWarmup(items, dayType, equipment, warmupIsGym);
}
```

`minutes` es un literal `5 | 10 | 15` elegido directamente por el usuario al
tocar un chip — pasa tal cual como cuarto argumento posicional de
`generateWarmup(dayType, equipment, isGym, minutes)`. Ningún valor se guarda
en SQLite ni en Zustand persistente; cada calentamiento se pregunta desde
cero.

Nota: aquí `dayType` **sí** se deriva de `currentPlan.activeDayIndex` (no de
`planDayId`), pero es seguro en este punto porque todavía no se ha llamado a
`advanceDayIndex()` — el índice activo sigue siendo el del día que se está a
punto de entrenar. Esto contrasta con el caso de cooldown (sección 2), donde
`advanceDayIndex()` ya se ejecutó (o está a punto) y por eso conviene
apoyarse en `planDayId`, no en el índice.

---

## 4. `warmup.store.ts` completo (espejo para `cooldown.store.ts`)

```ts
import { create } from 'zustand';
import type { WarmupItem } from '@/lib/warmupGenerator';
import type { DayType } from '@/lib/plan-generator';
import type { Exercise } from '@/lib/exercises';

interface WarmupState {
  items: WarmupItem[];
  active: boolean;
  // Contexto en el que se generó la rutina — necesario para que "Intercambiar"
  // pueda buscar una alternativa en el mismo pool, sin volver a derivarlo de
  // profile.location (que puede no coincidir con el contexto gym/casa
  // elegido para HOY por un usuario "ambos").
  dayType: DayType | null;
  equipment: string[];
  isGym: boolean;
  start: (items: WarmupItem[], dayType: DayType, equipment: string[], isGym: boolean) => void;
  end: () => void;
  // Reemplaza el ejercicio (y su duración) del ítem en `index` — usado por el
  // botón "Intercambiar" de cada tarjeta de la lista. La duración se decide
  // en warmup.tsx (fija para la apertura de cardio, defaultDurationSeconds
  // del nuevo ejercicio para movilidad), no aquí.
  replaceAt: (index: number, exercise: Exercise, durationSeconds: number) => void;
}

// Store efímero: vive solo en memoria mientras la app está abierta. No toca
// SQLite ni AsyncStorage — no hay persistencia entre sesiones ni reinicios.
export const useWarmupStore = create<WarmupState>((set, get) => ({
  items: [],
  active: false,
  dayType: null,
  equipment: [],
  isGym: false,
  start: (items, dayType, equipment, isGym) =>
    set({ items, active: true, dayType, equipment, isGym }),
  end: () => set({ items: [], active: false, dayType: null, equipment: [], isGym: false }),
  replaceAt: (index, exercise, durationSeconds) => {
    const { items } = get();
    if (!items[index]) return;
    const updated = [...items];
    updated[index] = { exercise, durationSeconds };
    set({ items: updated });
  },
}));
```

Para el espejo de cooldown, el equivalente natural sería
`items: CooldownItem[]`, mismo `active`/`dayType`/`equipment`/`isGym`, y
`replaceAt` reutilizando `getCooldownAlternative()` de
`cooldownGenerator.ts` en vez de `getWarmupAlternative()`.

---

## 5. Cómo se monta/oculta `WarmupScreen` en `_layout.tsx`

Bandera y montaje (`src/app/_layout.tsx:163-165` y `210-215`):

```ts
const isSessionActive    = useSessionStore(s => s.isActive);
const isEquipmentVisible = useProfileStore(s => s.equipmentVisible);
const isWarmupActive     = useWarmupStore(s => s.active);
```

```tsx
{/* Pantalla de sesión de entrenamiento — overlay sobre las tabs */}
{isSessionActive && (
  <View style={StyleSheet.absoluteFill}>
    <SessionScreen />
  </View>
)}
{/* Pantalla de equipamiento — overlay sobre las tabs */}
{isEquipmentVisible && (
  <View style={StyleSheet.absoluteFill}>
    <EquipmentScreen />
  </View>
)}
{/* Pantalla de calentamiento — overlay sobre las tabs */}
{isWarmupActive && (
  <View style={StyleSheet.absoluteFill}>
    <WarmupScreen />
  </View>
)}
{/* Overlay de logros — encima de todo, incluido la sesión */}
<AchievementCelebrationOverlay />
```

Mismo patrón "overlay" documentado para auth/onboarding/paywall: `<AppTabs />`
siempre montado; cada pantalla condicional es una `View` absoluta encima,
activada por un selector Zustand primitivo (`s => s.active` / `s => s.isActive`).
Un futuro `CooldownScreen` seguiría exactamente esta misma receta: nuevo
selector `isCooldownActive = useCooldownStore(s => s.active)` + un bloque
`{isCooldownActive && <View style={StyleSheet.absoluteFill}><CooldownScreen /></View>}`,
colocado (por la razón de la sección 2b) **antes** de
`<AchievementCelebrationOverlay />` en el JSX si se quiere que los logros
puedan seguir apareciendo por encima, o después si se prefiere que el
cooldown tenga prioridad visual sobre una celebración en curso.
