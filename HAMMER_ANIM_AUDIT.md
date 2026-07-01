# Auditoría: Animación del martillo — VulcanSplash.tsx

> Diagnóstico de solo lectura. Ningún archivo fue modificado.  
> Fecha: 2026-06-30

---

## 1. Historial git del archivo

```
72bf868  junio25
d67b002  feat: E-1/E-2/E-3 equipamiento, sonido, hápticos, progresión
c428aee  feat: fase 3 — marca Vulcan (paleta oscura, animación de carga, icono)
```

Hay **tres versiones** del archivo. El historial es corto pero decisivo.

### Commit c428aee — Creación original (Fase 3)

El martillo se implementó con **`Animated.View` + `useAnimatedStyle`** (sin SVG para el martillo). La API es estándar, probada y casi con certeza funcionaba:

```ts
// Shared value con rango de 60°
const RAISED = -65;
const IMPACT =  -5;
const swing  = useSharedValue(RAISED);

// Animación: sube → impacto → rebote → repite en ~1.3 s
swing.value = withRepeat(
  withSequence(
    withTiming(IMPACT,      { duration: 420, easing: Easing.in(Easing.quad) }),
    withTiming(IMPACT + 12, { duration: 80 }),
    withTiming(IMPACT,      { duration: 100 }),
    withDelay(100, withTiming(RAISED, { duration: 600, easing: Easing.out(Easing.quad) })),
  ),
  -1, false,
);

// Consumo correcto para Animated.View
const hammerAnim = useAnimatedStyle(() => ({
  transform: [{ rotate: `${45 + swing.value}deg` }],
}));

// Render: Animated.View estándar
<Animated.View style={[styles.hammerWrap, hammerAnim]}>
  <View style={styles.handle} />
  <View style={styles.head} />
</Animated.View>
```

Las chispas eran cinco `View` circulares con `opacity` animada. Simples y funcionales.

**Conclusión: hay evidencia sólida de que la animación original SÍ estaba diseñada para funcionar**, usando la vía canónica de Reanimated para `View`.

---

### Commit d67b002 — Cambio que rompió la animación (rotura confirmada)

Se reemplazó toda la implementación RN/View por **SVG puro** (`react-native-svg`). El martillo pasó a ser un `AnimatedG` (de Reanimated) sobre paths SVG. El valor compartido cambió de nombre y rango:

```ts
// ANTES: swing RAISED=-65 → IMPACT=-5 (60° de oscilación)
// DESPUÉS: hammerRot  -42 → 0 (42° de oscilación)

const hammerProps = useAnimatedProps(() => ({
  transform: `rotate(${hammerRot.value}, 121, 60)`,  // ← string SVG de 3 args
}));

const sparkInnerProps = useAnimatedProps(() => ({
  transform: `scale(${sparkScale.value})`,            // ← string SVG
}));
```

El problema: Reanimated 4 pasa los props de `useAnimatedProps` por `processTransform` en worklet. El formato SVG `rotate(angle, cx, cy)` con 3 argumentos **no es CSS** y no es reconocido por `processTransform` → lanzaba el error `invalidTransform` en la UI thread de forma continua incluso tras desmontar el splash.

El crash fue documentado en CLAUDE.md: *"Reanimated 4 pasa strings de transform por processTransform (worklet), que internamente llama ERROR_MESSAGES.invalidTransform".*

---

### Commit 72bf868 — Corrección del crash (pero no de la animación)

Para eliminar el crash se cambió a props individuales de react-native-svg:

```diff
- const hammerProps = useAnimatedProps(() => ({
-   transform: `rotate(${hammerRot.value}, 121, 60)`,
- }));
+ const hammerProps = useAnimatedProps(() => ({
+   rotation: hammerRot.value,
+ }));

- const sparkInnerProps = useAnimatedProps(() => ({
-   transform: `scale(${sparkScale.value})`,
- }));
+ const sparkInnerProps = useAnimatedProps(() => ({
+   scale: sparkScale.value,
+ }));

- <AnimatedG animatedProps={hammerProps}>
+ <AnimatedG animatedProps={hammerProps} originX={121} originY={60}>
```

El crash desapareció. La CLAUDE.md lo registra como "cero errores de worklet". **Pero en ningún momento se verificó visualmente que el martillo se moviera.** El registro confirma solo la ausencia de errores en consola, no la animación en pantalla.

---

## 2. Estado actual de la animación del martillo

### Cadena completa: declaración → animación → consumo

| Paso | Código | Archivo / línea |
|------|--------|-----------------|
| **Declara** | `const hammerRot = useSharedValue(-42)` | línea 32 |
| **Anima** | `hammerRot.value = withRepeat(withSequence(...), -1, false)` dentro de `useEffect(() => {}, [])` | líneas 41-50 |
| **Consume** | `useAnimatedProps(() => ({ rotation: hammerRot.value }))` | líneas 87-89 |
| **Aplica** | `<AnimatedG animatedProps={hammerProps} originX={121} originY={60}>` | línea 126 |

### ¿La animación se dispara?

Sí. El `useEffect` tiene `deps: []` → corre exactamente una vez al montar, asignando `withRepeat` a `hammerRot.value`. No hay condición que lo impida.

### ¿El valor animado llega al componente?

Aquí está el problema. Ver sección 3.

---

## 3. Puntos de fallo identificados

### A. ¿Falta directiva `'worklet'`?

**No.** El callback de `useAnimatedProps` es implícitamente tratado como worklet por Reanimated 3/4. No se requiere la directiva manual.

### B. ¿El `useEffect` se ejecuta? ¿Dependencias correctas?

**Sí se ejecuta.** `deps: []` es correcto para una animación de bucle infinito que arranca al montar y nunca necesita re-ejecutarse. El efecto no tiene cleanup para las animaciones, pero `withRepeat(-1)` en un shared value se detiene automáticamente al desmontar el componente animado.

### C. ¿La animación se inicia pero no se aplica? — **FALLO PRINCIPAL CONFIRMADO**

Aquí está el problema central.

`Animated.createAnimatedComponent(G)` crea un componente SVG animado donde Reanimated puede actualizar props en la UI thread. Sin embargo, en react-native-svg, las props **"shorthand"** como `rotation`, `scale`, `translateX`, `translateY` **no son props nativas del nodo SVG** — son conveniences de JavaScript que el bridge de react-native-svg procesa en el hilo JS para generar finalmente un atributo `transform` (string o matriz) que sí va al nodo nativo.

El flujo normal (sin Reanimated):
```
JS: <G rotation={45} originX={121} originY={60} />
  → react-native-svg JS bridge procesa rotation+originX+originY
  → genera transform matrix en JS
  → envía matrix al nodo nativo SVG
```

El flujo con Reanimated + `useAnimatedProps`:
```
UI thread: animatedProps = { rotation: hammerRot.value }
  → Reanimated intenta setear prop `rotation` directamente en el nodo nativo
  → react-native-svg nunca recibe el valor en su JS bridge
  → el nodo nativo nunca actualiza su transform
  → martillo estático en la posición de rotación inicial (-42°)
```

En cambio, `opacity` y `width` **sí son props nativas directas** de los elementos SVG, por eso la barra de progreso y el parpadeo de opacidad de las chispas funcionan. Solo las props que requieren procesamiento JS fallan.

`originX` y `originY` son deprecadas en react-native-svg y en la práctica se ignoran. Ni siquiera llegarían a combinarse con el `rotation` aunque este funcionara.

### D. ¿El `useAnimatedStyle` está conectado al elemento correcto?

No aplica al código actual. La versión actual usa `useAnimatedProps`, no `useAnimatedStyle`. El `AnimatedG` que tiene `animatedProps={hammerProps}` es exactamente el que envuelve todos los paths del martillo (líneas 126-139). El binding en sí es correcto.

### E. ¿Hay valores a 0 o transform mal construido que haga movimiento nulo?

- El rango de animación es de -42° a 0° → 42 grados de oscilación. Visualmente significativo si funcionara.
- Si `rotation` se aplicara alrededor del origen (0,0) en lugar de (121,60), el martillo se desplazaría fuera del canvas pero habría movimiento visible.
- No hay un valor a 0 que anule el movimiento; el problema es que el prop no llega al nodo, no que llegue con valor incorrecto.

---

## 4. Chispas — por qué se ven pequeñas

### Cómo se renderizan

Las chispas son 17 `Line` y 11 `Circle` dentro de `AnimatedG`:

- **Grupo externo** (`sparkGroupProps` → `opacity`): controla visibilidad/fade. Funciona (opacity es prop nativa).
- **Grupo interno** (`sparkInnerProps` → `scale`): escala todo el conjunto. **No funciona** (mismo problema que `rotation`).

### Valor que las hace pequeñas

```ts
const sparkScale = useSharedValue(0.4);  // valor inicial
```

Como el prop `scale` no se anima (mismo problema que `rotation`), **el grupo de chispas queda permanentemente a escala 0.40**.

El rango animado previsto era:
- inicio: 0.40
- pico: 1.28  (117 ms después del flash de opacidad)
- regreso: 0.40

A escala 0.40, las líneas más largas del grupo miden ~22 SVG units × 0.40 = 8.8 SVG units efectivas. En un viewBox de 300 de ancho renderizado a todo el ancho de pantalla (ej. 390 px): **≈ 11 px de longitud**, que es casi invisible.

Incluso a escala 1.0 pleno serían ~28 px de largo — pequeñas pero visibles. El problema es la combinación de escala bloqueada en 0.40 + tamaño base ya modesto.

---

## 5. Hipótesis de causa raíz

> Marcadas como hipótesis. La verificación definitiva requiere test en dispositivo físico con logs de la UI thread.

### H1 — `rotation`/`scale` como animated props no llegan al nodo nativo de react-native-svg *(probabilidad: ALTA)*

Las props shorthand de react-native-svg requieren procesamiento en el hilo JS para convertirse en un `transform` matrix que el nodo SVG nativo entiende. Reanimated actualiza props en la UI thread, saltándose ese procesamiento. Resultado: el shared value se anima en memoria, pero el nodo visual nunca lo recibe. El martillo queda en la posición inicial (-42°, que el SVG interno ya lleva al aspecto "en reposo").

Evidencia: la barra de progreso (`width` en `AnimatedRect`) y la opacidad de las chispas (`opacity` en `AnimatedG`) sí funcionan porque son props nativas directas. Solo las props que pasan por el JS bridge de rnsvg fallan.

### H2 — `originX`/`originY` deprecadas + no coordinadas con `animatedProps` *(probabilidad: MEDIA)*

Incluso si `rotation` funcionara parcialmente, el pivot (121, 60) definido por `originX`/`originY` como props estáticas de JSX podría no combinarse correctamente con el `rotation` animado que llega por separado vía `animatedProps`. El resultado sería rotación alrededor de (0,0) del canvas SVG → martillo volando fuera del viewport → visualmente estático aunque técnicamente animado.

### H3 — `AnimatedG` creado con Reanimated no tiene soporte real para props SVG de transformación *(probabilidad: MEDIA)*

`Animated.createAnimatedComponent(G)` de Reanimated funciona bien para props que son "pass-through" al nodo nativo (opacity, width, x, y…). Para props que requieren lógica en JS (transform shorthands), el componente animado de Reanimated no dispara el código JS de react-native-svg. La solución canónica de la comunidad para animar SVGs con Reanimated es usar `useAnimatedProps` con la prop `transform` como una **cadena SVG válida simple** (solo `rotate(angle)`, no `rotate(angle, cx, cy)`) o bien usar la integración específica `react-native-svg` + `react-native-reanimated` mediante el helper `useAnimatedSVGRef` (disponible en versiones recientes).

---

## Resumen ejecutivo

| Elemento | Estado | Causa |
|----------|--------|-------|
| Martillo (rotación) | ❌ Estático en -42° | `rotation` prop no llega al nodo nativo SVG via Reanimated |
| Chispas (escala) | ❌ Bloqueadas en 0.40 | `scale` prop mismo problema |
| Chispas (opacidad) | ✅ Parpadean | `opacity` es prop nativa directa |
| Barra de progreso | ✅ Se mueve | `width` es prop nativa directa |
| Animación original (c428aee) | ✅ Habría funcionado | Usaba `Animated.View` + `useAnimatedStyle` — API canónica correcta |
| Rotura introducida en | d67b002 | Migración a SVG con `useAnimatedProps` + shorthand props |
| Crash eliminado en | 72bf868 | Cambio a `rotation`/`scale` props — no crashea, pero tampoco anima |
