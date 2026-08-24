// Wrapper seguro para expo-notifications — mismo patrón que haptics.ts/sounds.ts:
// require() diferido dentro de cada función para que un módulo nativo no
// compilado no rompa el arranque; cualquier fallo es un no-op silencioso.
//
// #27: notificación local de fin de descanso cuando la app está en segundo
// plano. Usa el sonido por defecto del sistema (Opción 1) — sin `sound`
// personalizado en el contenido y sin canal propio de Android: Paso 0
// confirmó en los .d.ts instalados que `channelId` es siempre opcional
// (`channelId?: string`) en TODOS los triggers programables, tanto en la
// capa pública como en la nativa — nada en el sistema de tipos exige crear
// un canal antes de programar. No se crea ninguno.
//
// #38: la opción "Nativo de Android" del selector de sonido reutiliza esta
// misma pieza para primer plano — dispara la MISMA notificación (banner +
// sonido del canal de respaldo de expo-notifications), pero con trigger:null
// (entrega inmediata, confirmado válido por el tipo NotificationTriggerInput)
// en vez de programada a futuro. Requiere registerNotificationHandler() para
// que el banner se muestre con la app abierta — sin handler, el comportamiento
// por defecto de expo-notifications es NO mostrar nada en primer plano.

async function withNotifications<T>(
  fn: (N: typeof import('expo-notifications')) => Promise<T>,
): Promise<T | null> {
  try {
    const N = require('expo-notifications');
    return await fn(N);
  } catch {
    return null;
  }
}

/**
 * Pide permiso de notificaciones. Se puede llamar en cada montaje de
 * sesión sin problema — el sistema operativo no vuelve a mostrar el
 * diálogo si el usuario ya respondió antes (otorgado o denegado), así que
 * no hace falta guardar ningún flag propio de "ya se pidió".
 */
export function requestNotificationPermission(): Promise<void | null> {
  return withNotifications(async N => {
    await N.requestPermissionsAsync();
  });
}

/**
 * Programa la notificación de fin de descanso para dispararse dentro de
 * `secondsFromNow` segundos (calculado por el llamador contra
 * restTimerEndAt, no aquí). Devuelve el id de la notificación programada,
 * o null si algo falló (permiso denegado, módulo no compilado, etc.).
 * Sin `sound` en el contenido: se queda con el sonido por defecto del
 * sistema para esta notificación.
 */
export async function scheduleRestDoneNotification(
  secondsFromNow: number,
  title: string,
  body: string,
): Promise<string | null> {
  return withNotifications(N =>
    N.scheduleNotificationAsync({
      content: { title, body },
      trigger: {
        type: N.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(secondsFromNow)),
      },
    }),
  );
}

/** Cancela una notificación programada por su id. No-op si id es null. */
export async function cancelScheduledNotification(id: string | null): Promise<void> {
  if (!id) return;
  await withNotifications(N => N.cancelScheduledNotificationAsync(id));
}

/**
 * Registra el handler de comportamiento en primer plano. Sin esto, con la
 * app abierta, expo-notifications no muestra nada (comportamiento por
 * defecto documentado en el propio paquete) — necesario para que
 * playNativeRestDoneAlert() se vea/oiga con la app en uso, no solo en
 * segundo plano. Se llama una única vez desde _layout.tsx al arrancar.
 */
export function registerNotificationHandler(): Promise<void | null> {
  return withNotifications(async N => {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  });
}

/**
 * Dispara la notificación nativa de Android inmediatamente (trigger: null),
 * con la app en primer plano. Mismo canal de respaldo que ya usa
 * scheduleRestDoneNotification — sin `sound` ni `channelId` propios.
 */
export async function playNativeRestDoneAlert(title: string, body: string): Promise<void> {
  await withNotifications(N =>
    N.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    }),
  );
}
