# SHEET_LAG_AUDIT — VulcanBottomSheet: diagnóstico del retraso de 2-3 s

## 1. Qué se ejecuta al abrir (desde `visible=false` → `visible=true`)

**Archivo:** `src/components/ui/VulcanBottomSheet.tsx`

### Orden de ejecución

```
1. React reconcilia el componente con la nueva prop visible=true
2. El <Modal visible={true}> ordena al sistema Android crear una nueva ventana
   transparente (WindowManager.addView) — esto ocurre fuera del hilo JS
3. useEffect() detecta { visible } → corre en el mismo microtask:
     a. translateY.setValue(SH)       ← valor JS = SH, vista JS en reposo
     b. Animated.parallel([spring, timing]).start()  ← sin callback
4. El spring se transfiere al hilo nativo (useNativeDriver:true)
5. El hilo nativo mueve el sheet de translateY=SH → 0 con oscilación
6. El hilo JS vuelve a estar libre — pero el spring JS-side mantiene su
   último valor conocido (SH) hasta que el callback de .start() dispare
```

### Duración del spring (matemáticas)

```
k=220, c=22, m=1
ω₀ = √(220) = 14.83 rad/s
ζ  = 22 / (2×√220) = 0.742  → subamortiguado, oscila
ωd = √(220 − (22/2)²) = √99 = 9.95 rad/s
tasa de decaimiento = ζ·ω₀ = 11.0 /s

Envolvente de posición: SH · e^(−11·t) < restDisplacementThreshold (0.001)
→ t > ln(SH / 0.001) / 11.0
   SH=800px → t > 13.59/11.0 = 1.24 s
   SH=900px → t > 1.25 s
```

El callback `.start(cb)` del spring, donde React Native considera la
animación "en reposo", dispara aproximadamente a los **1.24 segundos** desde
que el sheet se abre (para pantallas de 800 px de alto).

### ¿El spring bloquea los toques?

**No directamente.** La animación de apertura llama `.start()` sin callback:
```javascript
]).start();   // ← sin callback — no hay código esperando a que termine
```
No hay ningún flag interno de React Native que impida toques mientras el
spring está activo. El sheet es teóricamente tocable en cuanto el Modal está
visible. El bloqueo viene de otro mecanismo (ver sección 3).

---

## 2. Coste del contenido en cada apertura

### Inventario de opciones por sheet

| Sheet | Opciones | Componentes montados |
|---|---|---|
| StepSchedule — días | 7 | 7 Pressable + 7 ThemedText = 14 |
| StepSchedule — minutos | 8 | 8 + 8 = 16 |
| StepPhysical — día | ≤31 | ≤31 + 31 = 62 |
| StepPhysical — mes | 12 | 12 + 12 = 24 |
| **StepPhysical — año** | **87** | **87 + 87 = 174** |
| training — dónde entrenas | 2 | 2 + 2 = 4 |
| PhotosTab — fuente | 2 | 2 + 2 = 4 |

`YEAR_MAX = 2026 − 10 = 2016`, `YEAR_MIN = 1930` → **87 opciones exactas**.

### Coste por fila

Cada opción renderiza (sin memoización):

```tsx
<Pressable
  style={({ pressed }) => [...]}    // función nueva en cada render
  onPress={() => handleSelect(opt.value)}  // función nueva en cada render
>
  <ThemedText style={[..., active && {...}]}>
    {opt.label}
  </ThemedText>
  {active ? <Ionicons .../> : null}
</Pressable>
```

**Cada `ThemedText` llama `useTheme()`**, que llama `useColorScheme()` de
React Native (re-exportado literalmente en `src/hooks/use-color-scheme.ts`).
`useColorScheme()` es un hook nativo que suscribe el componente a los eventos
de cambio de esquema de color.

Para el selector de año: **87 suscripciones a `useColorScheme` se registran
en el mismo lote de reconciliación** cuando el Modal se abre.

### ¿Hay imágenes o carga pesada?

No. Solo texto e iconos opcionales. El cuello de botella es la cantidad de
componentes, no el peso individual de cada uno.

### ¿Se recalcula `options` sin memoizar?

Sí, en todos los casos. El padre recrea el array de opciones en cada render:
```jsx
options={YEARS.map((y) => ({ value: y, label: String(y) }))}
```
Esto produce 87 objetos nuevos en cada render del padre. Barato en
asignación, pero fuerza a React a diff 87 nodos del `options.map()` dentro
del sheet.

---

## 3. El Modal y la animación

### Creación de ventana Android en cada apertura

Cuando `visible` pasa de `false` a `true`, React Native hace en Android:
```
WindowManager.addView(reactRootView, windowParams)
```
Esto añade una **nueva ventana superpuesta al WindowManager del sistema**.
Los parámetros incluyen transparencia (`PixelFormat.TRANSPARENT`) y flags de
táctil. El sistema operativo necesita:
1. Registrar la ventana en el sistema de ventanas
2. Configurar la transparencia (costoso en algunas versiones de Android)
3. Habilitar la recepción de eventos táctiles para esa ventana

**Hasta que el sistema completa este registro, los toques en la nueva ventana
no se entregan a los manejadores de React Native.** El contenido aparece
visualmente (el hilo nativo ya está animando el sheet) pero los eventos
táctiles no llegan.

En dispositivos Android de gama media con Android 10-13, esta operación tarda
habitualmente entre 800 ms y 2.5 s. En cada cierre y reapertura se destruye
y recrea la ventana, por lo que el retraso se repite sistemáticamente.

Con `animationType="none"` no hay ninguna transición del sistema que pueda
servir de indicador de cuándo la ventana ya es interactiva.

### ¿El spring sin callback deja estado sin resolver?

La animación de apertura no tiene callback:
```javascript
Animated.parallel([spring, timing]).start();   // sin cb
```
El valor JS de `translateY` se mantiene en `SH` (off-screen) hasta que el
spring se estabiliza (~1.24 s) y el hilo nativo notifica al hilo JS. Esto
implica que **durante ~1.24 segundos, el valor JS dice que el sheet está
fuera de pantalla**, aunque visualmente esté en su posición final.

En Android con native driver, el hit-testing usa la posición **nativa**
(correcta), no la posición JS. Por tanto esto no impide los toques. Pero sí
provoca que `translateY.setValue(SH)` en el cierre anterior todavía sea el
valor "conocido" si el effect se reejercuta.

### Problema de `SH` en las dependencias del useEffect

```javascript
useEffect(() => {
  if (visible) {
    translateY.setValue(SH);
    Animated.parallel([...]).start();
  }
}, [SH, backdropOp, translateY, visible]);  // ← SH aquí
```

`SH` viene de `useWindowDimensions()`. En Android, el tamaño de ventana
cambia cuando el teclado virtual aparece o desaparece (el sistema reduce la
altura de la ventana en modo `adjustResize`). Si el teclado estaba abierto
en la pantalla de debajo y se cierra al abrirse el sheet (comportamiento
habitual en muchos flujos), `SH` cambia, lo cual **dispara el effect por
segunda vez mientras `visible=true`**:

```
1er disparo (visible=true):  translateY.setValue(SH_small)  → spring inicia
2do disparo (SH cambió):     translateY.setValue(SH_large)  → spring REINICIA
```

El segundo spring arranca desde una distancia mayor, alargando el tiempo de
estabilización. Si ocurre durante la ventana de no-interactividad del Modal,
el retraso total se extiende.

---

## 4. Comparativa con el diseño anterior

Confirmado por el diff del commit `72bf868` (junio25):

### Antes (StepSchedule):
```tsx
// Un único componente nativo — todo ocurre en el hilo C++/Java
<Picker
  selectedValue={draft.daysPerWeek}
  onValueChange={(v) => updateDraft({ daysPerWeek: v })}
>
  {DAYS.map(d => <Picker.Item key={d} label={...} value={d} />)}
</Picker>
```
`@react-native-picker/picker` delega la representación al componente nativo
del sistema operativo. El SO muestra un dialog nativo ya optimizado. No
crea ninguna ventana React Native adicional. El dialog nativo es interactivo
inmediatamente.

### Ahora (StepSchedule → VulcanBottomSheet):
```tsx
// Modal propio + ScrollView + N Pressable + N ThemedText
<Modal visible={daysOpen} transparent animationType="none">
  <ScrollView>
    {options.map(opt => <Pressable ...><ThemedText .../></Pressable>)}
  </ScrollView>
</Modal>
```
Se crea una ventana Android nueva, se reconcilia toda la jerarquía JS, y se
esperan N × `useColorScheme` subscriptions. El lag **no existía** con el
picker nativo.

El mismo patrón se introdujo simultáneamente en `training.tsx`, `session.tsx`
y `StepPhysical.tsx` en el mismo commit.

---

## 5. Veredicto

El responsable principal del bloqueo de 2-3 segundos **en todos los sheets**
es el tiempo que Android necesita para registrar la ventana transparente del
`<Modal transparent>` como destino de eventos táctiles. Cada apertura destruye
y recrea esta ventana; el sistema operativo no entrega toques hasta completar
el registro (~1-2.5 s según dispositivo). El contenido aparece visualmente
antes (hilo nativo) pero es físicamente intocable. Esto no depende del número
de opciones, lo que explica el lag también en sheets de 2 opciones.

Para el selector de año (87 opciones), esto se amplifica con el coste de
reconciliar 174 componentes con 87 llamadas a `useColorScheme()`, pero ese
coste es adicional, no la causa raíz.

**Recomendación principal (opción c — cambiar cómo se monta el Modal):**
Eliminar el `<Modal>` y sustituirlo por un `View` posicionado absolutamente
que **viva permanentemente** en el árbol de vistas al nivel de la raíz del
layout (igual que `AchievementCelebrationOverlay` y `AuthFlow` ya lo hacen en
`_layout.tsx`). La visibilidad se controla solo con `transform + pointerEvents`,
sin crear/destruir ventanas nativas. Con este cambio, el primer toque funciona
instantáneamente porque la ventana ya está registrada.

---

## Archivos leídos

| Archivo | Motivo |
|---|---|
| `src/components/ui/VulcanBottomSheet.tsx` | Código fuente del componente |
| `src/components/themed-text.tsx` | Coste de cada fila: llama `useTheme()` |
| `src/hooks/use-theme.ts` | Encadena a `useColorScheme()` |
| `src/hooks/use-color-scheme.ts` | Re-exporta `useColorScheme` de RN |
| `src/components/onboarding/StepSchedule.tsx` | Caso antes/después |
| `src/components/onboarding/StepPhysical.tsx` | Caso con 87 opciones (año) |
| `src/components/progress/PhotosTab.tsx` | Caso con 2 opciones |
| `src/app/training.tsx` | Caso con 2 opciones |

Comandos adicionales:
- `git log --oneline -20` → identificó el commit `72bf868` (junio25) como el
  que introdujo `VulcanBottomSheet` en sustitución del Picker nativo
- `git show 72bf868 -- src/components/onboarding/StepSchedule.tsx` → confirmó
  el diff antes/después completo
- `node -e "..."` → calculó matemáticamente el tiempo de estabilización del
  spring y el conteo de componentes

**Ningún archivo fue modificado.**
