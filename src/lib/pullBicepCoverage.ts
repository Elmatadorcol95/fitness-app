import { EXERCISES, type EquipmentKey } from './exercises';

// Equipamiento que efectivamente destraba al menos un ejercicio compuesto de
// categoría 'pull' — derivado dinámicamente del catálogo, no hardcodeado.
export function getBackEnablingKeys(): Set<EquipmentKey> {
  return new Set(
    EXERCISES.filter(e => e.category === 'pull' && e.isCompound).flatMap(e => e.equipment),
  );
}

// Equipamiento que efectivamente destraba al menos un ejercicio que trabaja bíceps.
export function getBicepEnablingKeys(): Set<EquipmentKey> {
  return new Set(
    EXERCISES.filter(e => e.primaryMuscles.includes('biceps')).flatMap(e => e.equipment),
  );
}

export function getPullCoverage(userEquipment: EquipmentKey[]): { hasBackVariety: boolean; hasBicepWork: boolean } {
  const backKeys = getBackEnablingKeys();
  const bicepKeys = getBicepEnablingKeys();
  return {
    hasBackVariety: userEquipment.some(k => backKeys.has(k)),
    hasBicepWork: userEquipment.some(k => bicepKeys.has(k)),
  };
}
