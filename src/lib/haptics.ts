// Wrapper seguro para expo-haptics.
// Si el módulo no está en el build actual, las llamadas son no-ops silenciosos.

async function withHaptics(fn: (H: typeof import('expo-haptics')) => Promise<void>) {
  try {
    const H = require('expo-haptics');
    await fn(H);
  } catch {}
}

/** Toque sutil — confirmar entrada de dato */
export function hapticsLight() {
  return withHaptics(H => H.impactAsync(H.ImpactFeedbackStyle.Light));
}

/** Toque medio — completar serie de entrenamiento */
export function hapticsMedium() {
  return withHaptics(H => H.impactAsync(H.ImpactFeedbackStyle.Medium));
}

/** Notificación de éxito — guardar dato, desbloquear logro */
export function hapticsSuccess() {
  return withHaptics(H => H.notificationAsync(H.NotificationFeedbackType.Success));
}
