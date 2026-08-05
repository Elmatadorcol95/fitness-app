import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Intercepta el boton/gesto atras de Android mientras `active` sea true.
 * Necesario porque las pantallas de la app son overlays con flags de
 * Zustand, no rutas de navegacion — Android no sabe que existen.
 * Los manejadores se ejecutan en orden inverso al registro, asi que un
 * dialogo montado dentro de una pantalla intercepta antes que ella.
 */
export function useAndroidBack(active: boolean, onBack: () => void) {
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [active, onBack]);
}
