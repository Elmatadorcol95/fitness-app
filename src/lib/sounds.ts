// Wrapper seguro para expo-audio.
// Usa require() diferido dentro de cada función para que un módulo nativo
// no compilado no rompa el arranque — igual que haptics.ts.
// Los MP3 en assets/sounds/ son placeholders; reemplázalos antes del EAS Build final.

// undefined = sin intentar; null = falló la inicialización
let _restDone: any = undefined;
let _achievement: any = undefined;

function loadPlayer(source: number): any {
  // require() dentro de try captura el error de módulo nativo no compilado
  const { createAudioPlayer } = require('expo-audio');
  return createAudioPlayer(source);
}

/** Reproduce el sonido de fin de descanso. No-op si expo-audio no está compilado. */
export function playRestDone(): void {
  try {
    if (_restDone === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _restDone = loadPlayer(require('../../assets/sounds/rest-done.mp3'));
    }
    if (!_restDone) return;
    _restDone.seekTo(0);
    _restDone.play();
  } catch {
    _restDone = null; // marca como fallido para no reintentar
  }
}

/** Reproduce el sonido de logro desbloqueado. No-op si expo-audio no está compilado. */
export function playAchievement(): void {
  try {
    if (_achievement === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _achievement = loadPlayer(require('../../assets/sounds/achievement.mp3'));
    }
    if (!_achievement) return;
    _achievement.seekTo(0);
    _achievement.play();
  } catch {
    _achievement = null;
  }
}
