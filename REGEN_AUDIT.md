# REGEN_AUDIT — "Regenerar plan" en pestaña Entreno no funciona

## 1. El botón

**Archivo:** `src/app/training.tsx`

```tsx
// Línea 301-303 — botón en la cabecera del plan
<Pressable onPress={handleRegen} disabled={isGenerating} style={styles.regenBtn}>
  <ThemedText style={styles.regenBtnText}>{t('tabs.training.regen')}</ThemedText>
</Pressable>
```

El handler `handleRegen` (línea 238-240) hace **solo una cosa**:

```javascript
function handleRegen() {
  setRegenOpen(true);
}
```

Eso abre el `VulcanDialog` para pedir confirmación:

```tsx
// Líneas 445-454
<VulcanDialog
  visible={regenOpen}
  onClose={() => setRegenOpen(false)}
  title={t('tabs.training.regen')}
  message={t('tabs.training.regenConfirm')}
  confirmLabel={t('tabs.training.regenOk')}
  cancelLabel={t('tabs.training.regenCancel')}
  destructive
  onConfirm={() => { if (profile) generateAndSavePlan(profile); }}
/>
```

---

## 2. El diálogo de confirmar

**Archivo:** `src/components/ui/VulcanDialog.tsx`

El botón "Sí, regenerar" llama a `handleConfirm` (líneas 71-74):

```javascript
function handleConfirm() {
  onConfirm();   // ← llama al callback del padre
  dismiss();     // ← inicia la animación de salida
}
```

Y `dismiss` (líneas 35-48) ejecuta la animación (~180 ms) y al terminar llama
a `onClose()` — que en `training.tsx` es `() => setRegenOpen(false)`.

### Traza paso a paso al pulsar "Sí, regenerar"

```
1. Usuario pulsa "Sí, regenerar"
2. handleConfirm() se ejecuta
3. onConfirm() se invoca:
       → if (profile) generateAndSavePlan(profile)
       → generateAndSavePlan devuelve una Promise<void>
       → la Promise NO se captura, NO se await-ea
       → control regresa inmediatamente
4. dismiss() arranca la animación de salida (~180 ms)
5. ~180 ms después → onClose() → setRegenOpen(false) → diálogo cierra
6. La Promise de generateAndSavePlan sigue corriendo en background
   (si no lanzó antes de la primera await)
```

`generateAndSavePlan` en `workout.store.ts` (líneas 107-168):

```javascript
generateAndSavePlan: async (profile: Profile) => {
  set({ isGenerating: true });
  try {
    await db.update(workoutPlans).set({ isActive: 0 });
    const plan = generatePlan(profile);   // ← síncrono, puede lanzar
    await db.insert(workoutPlans).values({ ... });
    // ... más operaciones asíncronas
    set({ currentPlan: { ... } });        // ← actualiza el store
  } finally {
    set({ isGenerating: false });         // ← siempre limpia el flag
  }
},
```

Crítico: **no hay `catch`**. Si la función falla, el error se propaga al
llamador. Si el llamador no tiene `await`, el error se convierte en un
`Unhandled Promise Rejection` que React Native silencia en producción
(el `finally` sí corre → `isGenerating` vuelve a `false`, pero el plan
no se actualiza).

---

## 3. Comparación lado a lado

| Aspecto | `equipment.tsx` (FUNCIONA) | `training.tsx` (FALLA) |
|---|---|---|
| Fuente del perfil | `pendingProfile.current` (ref explícita con datos actualizados) | `profile` del hook `useProfileStore()` |
| Cierre explícito del diálogo | `setRegenOpen(false)` al **inicio** de onConfirm | Solo vía `dismiss()` → `onClose()` 180 ms después |
| `await` sobre la generación | **Sí** (`await generateAndSavePlan(...)`) | **No** (fire-and-forget) |
| Gestión de errores | `try { ... } catch {}` | **Ninguna** |
| Acción posterior | `closeEquipment()` cierra la pantalla | Nada |

Código en equipment.tsx (líneas 198-204):

```javascript
onConfirm={async () => {
  setRegenOpen(false);                        // cierra antes de generar
  if (pendingProfile.current) {
    try { await generateAndSavePlan(pendingProfile.current); } catch {}
  }
  useProfileStore.getState().closeEquipment();
}}
```

Código en training.tsx (línea 453):

```javascript
onConfirm={() => { if (profile) generateAndSavePlan(profile); }}
```

---

## 4. Sospechosos concretos

### (a) ¿El onConfirm está realmente conectado?

**Sí, está conectado.** `VulcanDialog.handleConfirm` llama a `onConfirm()`
antes de `dismiss()`. `onConfirm` ejecuta `generateAndSavePlan(profile)`.
No hay función vacía ni desconexión.

### (b) ¿Depende de un valor de estado desactualizado?

Posiblemente. `profile` se obtiene de `useProfileStore()` **sin selector**,
lo que significa que el cierre captura el objeto `profile` del último render.
Sin embargo, para un usuario que ya tiene plan (ha completado el onboarding),
`profile` no debería ser `null`. Lo que SÍ es un problema es que el cierre
captura `generateAndSavePlan` de `useWorkoutStore()` también sin selector.
Zustand garantiza que las funciones-acción son referencias estables, pero el
componente re-renderiza al cambiar `isGenerating` (porque destruye el store
entero sin selector), creando nuevas funciones por closure en el JSX — aunque
en este caso concreto no provoca un bug de valor.

### (c) ¿Falta algún parámetro?

**Éste es el sospechoso principal.** El `onConfirm` llama
`generateAndSavePlan(profile)` sin `await` y sin try/catch. Si
`generatePlan(profile)` lanza (p.ej., un campo de perfil nulo —
`daysPerWeek`, `minutesPerSession`, `goalPrimary`) o si falla cualquier
operación de base de datos (`db.update`, `db.insert`), la promesa rechaza.
Nadie la atrapa. El `finally` resetea `isGenerating: false`. El diálogo se
cierra (vía `dismiss`). El usuario ve exactamente "no ocurre nada":

```
generateAndSavePlan(profile)   →  Promise rechazada
  ↓ nadie la await-ea
Unhandled Promise Rejection    →  silenciada en producción
finally: set({ isGenerating: false })
onClose: setRegenOpen(false)   →  diálogo cierra
UI: sin cambio en currentPlan
```

En `equipment.tsx`, el `try { ... } catch {}` captura cualquier error y la
pantalla de equipamiento se cierra de todas formas con `closeEquipment()`.
El usuario ve que la pantalla cierra, lo que puede confundirlo con "funcionó",
aunque el plan también fallara ahí.

---

## 5. Veredicto

**Causa más probable:** `generateAndSavePlan(profile)` en `training.tsx` se
llama sin `await` y sin gestión de errores. Si la función rechaza (por
cualquier error en `generatePlan(profile)` o en las operaciones de SQLite),
la promesa se convierte en un Unhandled Rejection silenciado. El diálogo cierra
por la animación de salida, y el usuario ve que nada cambia. No hay indicador
de fallo visible porque tampoco hay spinner en el botón "Regenerar plan"
cuando `isGenerating=true`.

**El fix está en (a) + (b): conectar bien el onConfirm (añadir `await` y
cerrar el diálogo explícitamente) y copiar el patrón de `equipment.tsx`:**

```javascript
// Propuesta de fix en training.tsx
onConfirm={async () => {
  setRegenOpen(false);                     // cierra antes
  if (profile) {
    try { await generateAndSavePlan(profile); } catch {}
  }
}}
```

Una recomendación adicional: añadir un `ActivityIndicator` al botón
"Regenerar plan" cuando `isGenerating=true` para que el usuario vea que
algo está ocurriendo — idéntico al patrón ya usado en el botón "Generar plan"
de la pantalla "sin plan".

---

## Archivos leídos

| Archivo | Motivo |
|---|---|
| `src/app/training.tsx` | Código del botón, handler, VulcanDialog cableado |
| `src/app/equipment.tsx` | Camino que funciona: onConfirm completo |
| `src/components/ui/VulcanDialog.tsx` | `handleConfirm` y flujo de dismiss |
| `src/store/workout.store.ts` | `generateAndSavePlan`: try/finally sin catch |
| `src/app/_layout.tsx` | Contexto del overlay pattern (referencia) |

**Ningún archivo fue modificado.**
