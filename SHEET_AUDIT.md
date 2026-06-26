# SHEET_AUDIT — VulcanBottomSheet: diagnóstico del doble toque

## 1. Código fuente completo del componente

**Archivo:** `src/components/ui/VulcanBottomSheet.tsx`

```tsx
import { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SheetOption<T extends string | number> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: T) => void;
  options: SheetOption<T>[];
  selectedValue?: T;
  title?: string;
  cancelLabel?: string;
}

export function VulcanBottomSheet<T extends string | number>({
  visible,
  onClose,
  onSelect,
  options,
  selectedValue,
  title,
  cancelLabel = 'Cancelar',
}: Props<T>) {
  const { height: SH } = useWindowDimensions();
  const colors = useTheme();

  const translateY = useRef(new Animated.Value(SH)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SH,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOp, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }, [SH, backdropOp, onClose, translateY]);

  useEffect(() => {
    if (visible) {
      translateY.setValue(SH);                     // ← valor JS = SH (fuera de pantalla)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          stiffness: 220,
          damping: 22,
          mass: 1,
          useNativeDriver: true,                   // ← hilo nativo; JS NO actualiza en cada frame
        }),
        Animated.timing(backdropOp, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();                                  // ← sin callback al terminar
    }
  }, [SH, backdropOp, translateY, visible]);

  function handleSelect(value: T) {
    onSelect(value);
    dismiss();
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss}>

      {/* BACKDROP — cubre TODA la pantalla, incluida el área del sheet */}
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOp }]} />
      </Pressable>

      {/* SHEET — hermano del backdrop; z-order mayor por ser el último hijo */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.backgroundElement },
          { transform: [{ translateY }] },
        ]}
        // ← NO tiene pointerEvents ni control de interactividad durante animación
      >
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.textSecondary }]} />
        </View>

        {title ? (
          <ThemedText style={[styles.sheetTitle, { color: colors.textSecondary }]}>
            {title}
          </ThemedText>
        ) : null}

        {/* AQUÍ EL SOSPECHOSO PRINCIPAL ↓ — no keyboardShouldPersistTaps */}
        <ScrollView bounces={false} style={{ maxHeight: SH * 0.55 }}>
          {options.map((opt) => {
            const active = opt.value === selectedValue;
            return (
              <Pressable
                key={String(opt.value)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.background },
                  pressed && { backgroundColor: colors.backgroundSelected },
                ]}
                onPress={() => handleSelect(opt.value)}
              >
                <ThemedText
                  style={[
                    styles.rowLabel,
                    active && { color: colors.accent, fontWeight: '600' },
                  ]}
                >
                  {opt.label}
                </ThemedText>
                {active ? (
                  <Ionicons name="checkmark" size={20} color={colors.accent} />
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.cancelBtn,
            { backgroundColor: colors.background },
            pressed && { opacity: 0.7 },
          ]}
          onPress={dismiss}
        >
          <ThemedText style={[styles.cancelLabel, { color: colors.textSecondary }]}>
            {cancelLabel}
          </ThemedText>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
```

### Árbol de renderizado (simplificado)

```
Modal (visible, transparent, animationType="none")
├── Pressable (absoluteFill, onPress=dismiss)      ← backdrop, z-order MENOR
│   └── Animated.View (absoluteFill, opacity=backdropOp)
└── Animated.View (position:absolute, bottom:0, transform:translateY)  ← sheet, z-order MAYOR
    ├── View (handle)
    ├── ThemedText? (title)
    ├── ScrollView (bounces=false)   ← SIN keyboardShouldPersistTaps
    │   └── Pressable × N (onPress=handleSelect)
    └── Pressable (cancelBtn, onPress=dismiss)
```

---

## 2. Flujo de un toque — paso a paso

1. El usuario toca una opción dentro del `ScrollView`.
2. React Native inicializa la secuencia de responder táctil (`onStartShouldSetResponder`).
3. **El `ScrollView` negocia la respuesta** para determinar si el gesto va a ser un scroll o un tap.
4. Si el `ScrollView` cede el responder al `Pressable` hijo, se activa `onPress`.
5. `onPress` llama `handleSelect(opt.value)`.
6. `handleSelect` llama, en el mismo frame:
   - `onSelect(value)` → confirma la selección en el padre (ej. `updateDraft({...})`)
   - `dismiss()` → inicia animación de cierre → al terminar llama `onClose()` → padre pone `visible=false`
7. El Modal desaparece.

**Punto crítico:** no hay estado intermedio. No hay un botón "Confirmar" ni un `useEffect` que lea la selección después. El valor queda guardado en el padre en el paso 6 y el Modal se cierra en ese mismo toque. Si el `Pressable` hijo **no recibe el evento**, el ciclo nunca arranca.

---

## 3. Sospechosos concretos

### 3-A. `keyboardShouldPersistTaps` en el ScrollView

**¿Hay ScrollView envolviendo las opciones?** Sí. Línea 109:
```tsx
<ScrollView bounces={false} style={{ maxHeight: SH * 0.55 }}>
```

**¿Tiene `keyboardShouldPersistTaps`?** **NO.** No aparece en ninguna parte del componente. El valor por defecto de React Native es `'never'`.

**¿Qué implica `'never'`?**  
Cita de la documentación oficial de React Native:
> *"When the keyboard is up, tapping outside of the focused text input dismisses the keyboard. When this happens, children won't receive the tap."*

Con `'never'`, el primer toque en el `ScrollView` **cuando el teclado está visible** hace dos cosas:
1. Descarta el teclado del sistema.
2. **Absorbe el evento**: el `Pressable` hijo no recibe `onPress`.

El segundo toque sí llega al hijo (el teclado ya está cerrado).

**¿Aplica aunque el sheet no tenga TextInput?**  
Sí. Lo que importa es si hay algún `TextInput` **en cualquier parte de la pantalla subyacente** que tenga foco activo cuando el sheet se abre. En `StepPhysical` (donde vive el selector de día/mes/año) hay dos `TextInput` activos: los steppers de altura y peso. Si el usuario los tocó antes de abrir el sheet, el teclado puede seguir visible cuando aparece el `ScrollView` del sheet. Resultado: primer toque → descarta teclado y no selecciona nada.

### 3-B. pointerEvents condicionado a la animación

**¿El contenedor/backdrop tiene `pointerEvents` condicionado?**  
No hay ningún `pointerEvents` en el código. Ni el backdrop `Animated.View` ni el sheet `Animated.View` tienen `pointerEvents` declarado.

**¿Puede el primer toque caer mientras el sheet aún anima?**  
Potencialmente sí, pero es un contribuyente secundario, no el principal:

- La animación de apertura usa `useNativeDriver: true` con un spring (`stiffness:220, damping:22`).
- Con driver nativo, la animación corre en el hilo nativo. El valor JS de `translateY` se fija en `SH` con `setValue(SH)` al inicio y **no se actualiza frame a frame** en el hilo JS durante la animación; solo recupera `toValue=0` cuando el spring se estabiliza.
- En Android, el hit-testing (detección de toques) puede usar la posición del hilo JS (que dice "translateY=SH", es decir, fuera de pantalla) en lugar de la posición visual real que está mostrando el hilo nativo.
- Si el usuario toca rápido (antes de que el spring se estabilice y el callback actualice el valor JS), el toque puede caer "en el vacío" desde la perspectiva del hit-test del lado JS, y el backdrop (absoluteFill) podría absorberlo.
- Sin embargo, si el backdrop lo absorbe, llama a `dismiss()`, lo cual debería cerrar el sheet. Como el sheet permanece abierto, este mecanismo **no es el responsable principal** del síntoma "primer toque no hace nada".

### 3-C. Estado intermedio (doble paso: setSelected + confirmar)

**¿Hay estado intermedio?** No. El flujo es directo:
```
Pressable.onPress → handleSelect(value) → onSelect(value) + dismiss()
```
No hay `setSelected()` que un segundo elemento lea después. `onSelect` confirma la selección y `dismiss()` la cierra en el mismo toque sincrónico. No hay re-render problemático en el camino del evento.

---

## 4. Ejemplo de cableado: selector de días en StepSchedule

Este es el caso más limpio: pantalla sin ningún `TextInput`.

**StepSchedule.tsx (fragmento):**
```tsx
// Estado local que controla la visibilidad del sheet
const [daysOpen, setDaysOpen] = useState(false);

// Opciones
const dayOptions: SheetOption<number>[] = DAYS.map((d) => ({
  value: d,
  label: `${d} ${d === 1 ? t('...day') : t('...days')}`,
}));

// Trigger que abre el sheet
<Pressable onPress={() => setDaysOpen(true)}>
  <ThemedText>{dayLabel(draft.daysPerWeek)}</ThemedText>
  <Ionicons name="chevron-down" ... />
</Pressable>

// El sheet
<VulcanBottomSheet
  visible={daysOpen}
  onClose={() => setDaysOpen(false)}       // ← cierra el sheet
  onSelect={(v) => updateDraft({ daysPerWeek: v })}  // ← guarda el valor
  options={dayOptions}
  selectedValue={draft.daysPerWeek}
  title={t('onboarding.schedule.daysPerWeek')}
  cancelLabel={t('common.cancel')}
/>
```

**Flujo cuando el usuario toca "4 días":**
1. `Pressable.onPress` dentro del sheet → `handleSelect(4)` en VulcanBottomSheet
2. `onSelect(4)` → `updateDraft({ daysPerWeek: 4 })` → Zustand store actualizado
3. `dismiss()` → animación de cierre → `onClose()` → `setDaysOpen(false)` → `visible=false` → Modal oculto

No hay teclado de por medio. La selección se confirma en el **mismo toque** sin estado intermedio. Esto descarta el sospechoso C para este caso.

---

## 5. Veredicto

**Responsable principal: `keyboardShouldPersistTaps` no declarado (default `'never'`).**

El `ScrollView` de línea 109 nunca declara `keyboardShouldPersistTaps`. Con el valor por defecto `'never'`, cuando cualquier `TextInput` de la pantalla subyacente tiene foco (y el teclado virtual está visible), el primer toque en el `ScrollView` descarta el teclado sin dejar que el `Pressable` hijo procese el evento. El segundo toque (ya sin teclado) sí llega al hijo. Esto explica el 100% de los casos reportados en `StepPhysical` (donde los steppers de altura y peso son `TextInput` que suelen tener foco antes de abrir el selector de fecha).

**Caso sin teclado (StepSchedule, training.tsx):** La misma ausencia del prop puede causar que el `ScrollView` retenga brevemente el responder táctil para evaluar si el gesto es un scroll, y en ese instante el `Pressable` hijo no recibe el evento. Es un comportamiento menos documentado pero reproducible en Android cuando `keyboardShouldPersistTaps` no está explícitamente en `'handled'` o `'always'`.

**Responsable secundario: spring + native driver sin pointerEvents guard.** Si el usuario toca muy rápido (antes de que el spring se estabilice), el hit-test del lado JS puede no coincidir con la posición visual del sheet (Android, native driver). Pero como el sheet permanece abierto tras el primer toque (en lugar de cerrarse), este mecanismo no es el responsable del síntoma típico.

**Descartado: estado intermedio.** No existe; la selección y el cierre ocurren síncronamente en el mismo toque.

**Orden de probabilidad:**
1. `keyboardShouldPersistTaps` faltante → principal (activo en todas las pantallas con TextInput; también problemático en Android sin teclado)
2. Spring native driver sin pointerEvents guard → secundario (solo si el tap es muy rápido)
3. Backdrop Pressable interceptando → descartado (causaría cierre del sheet, no silencio)

---

## Archivos leídos

| Archivo | Propósito |
|---|---|
| `src/components/ui/VulcanBottomSheet.tsx` | Código fuente completo del componente auditado |
| `src/components/onboarding/StepPhysical.tsx` | Caso real: selectores de día/mes/año (con TextInputs en pantalla) |
| `src/components/onboarding/StepSchedule.tsx` | Caso real: selector de días/minutos (sin TextInputs) |

Búsquedas adicionales:
- Grep de `VulcanBottomSheet` en todo `src/` → encontró 5 archivos consumidores
- Grep de `keyboardShouldPersistTaps` y `ScrollView` en el componente → confirmó ausencia del prop
- Grep de `handleDayChange|handleMonthChange|handleYearChange` en StepPhysical → confirmó flujo directo sin estado intermedio

**Ningún archivo fue modificado.**
