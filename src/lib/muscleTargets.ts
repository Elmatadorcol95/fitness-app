import type { MuscleGroup } from './exercises';
import type { DayType } from './plan-generator';

export interface MuscleTarget {
  key: string;                  // ej. 'espalda', 'biceps', 'core_estabilidad'
  muscleGroups: MuscleGroup[];  // uno o varios valores reales del catálogo que satisfacen este objetivo
  bonusPriority: number;        // 1 = recibe hueco extra primero, 2 = después
  maxSlots?: number;            // si se define, nunca recibe más de este número de huecos (ej. antebrazo=1)
  // Categoría de origen del target — de qué lista viene (PUSH_TARGETS/PULL_TARGETS/
  // LEGS_TARGETS/FULL_BODY_TARGETS). Se usa para alinear la elegibilidad por
  // category en días 'upper', donde un mismo día mezcla targets de dos listas
  // distintas y cada uno debe restringirse a su propia categoría de origen.
  sourceCategory: 'push' | 'pull' | 'legs' | 'core';
}

export const PUSH_TARGETS: MuscleTarget[] = [
  { key: 'pecho', muscleGroups: ['chest'], bonusPriority: 1, sourceCategory: 'push' },
  { key: 'hombros', muscleGroups: ['shoulders'], bonusPriority: 2, sourceCategory: 'push' },
  { key: 'triceps', muscleGroups: ['triceps'], bonusPriority: 2, sourceCategory: 'push' },
];

export const PULL_TARGETS: MuscleTarget[] = [
  { key: 'espalda', muscleGroups: ['back', 'lats'], bonusPriority: 1, sourceCategory: 'pull' },
  { key: 'biceps', muscleGroups: ['biceps'], bonusPriority: 2, sourceCategory: 'pull' },
  { key: 'trapecio', muscleGroups: ['traps'], bonusPriority: 2, sourceCategory: 'pull' },
  { key: 'antebrazo', muscleGroups: ['forearms'], bonusPriority: 2, maxSlots: 1, sourceCategory: 'pull' },
];

export const LEGS_TARGETS: MuscleTarget[] = [
  { key: 'cuadriceps', muscleGroups: ['quads'], bonusPriority: 1, sourceCategory: 'legs' },
  { key: 'isquiotibiales', muscleGroups: ['hamstrings'], bonusPriority: 1, sourceCategory: 'legs' },
  { key: 'gluteos', muscleGroups: ['glutes'], bonusPriority: 2, sourceCategory: 'legs' },
  { key: 'pantorrilla', muscleGroups: ['calves'], bonusPriority: 2, sourceCategory: 'legs' },
  { key: 'aductores', muscleGroups: ['adductors'], bonusPriority: 2, sourceCategory: 'legs' },
  { key: 'core_estabilidad', muscleGroups: ['core'], bonusPriority: 2, sourceCategory: 'core' },
  { key: 'abs_flexion', muscleGroups: ['abs'], bonusPriority: 2, sourceCategory: 'core' },
];

export const FULL_BODY_TARGETS: MuscleTarget[] = [
  { key: 'pecho', muscleGroups: ['chest'], bonusPriority: 1, sourceCategory: 'push' },
  { key: 'espalda', muscleGroups: ['back', 'lats'], bonusPriority: 1, sourceCategory: 'pull' },
  { key: 'hombros', muscleGroups: ['shoulders'], bonusPriority: 2, sourceCategory: 'push' },
  { key: 'cuadriceps', muscleGroups: ['quads'], bonusPriority: 1, sourceCategory: 'legs' },
  { key: 'isquios_gluteos', muscleGroups: ['hamstrings', 'glutes'], bonusPriority: 1, sourceCategory: 'legs' },
  { key: 'core', muscleGroups: ['core'], bonusPriority: 2, sourceCategory: 'core' },
];

export function getTargetsForDayType(dayType: DayType): MuscleTarget[] {
  switch (dayType) {
    case 'push':
      return PUSH_TARGETS;
    case 'pull':
      return PULL_TARGETS;
    case 'legs':
      return LEGS_TARGETS;
    case 'upper':
      return [...PUSH_TARGETS, ...PULL_TARGETS];
    case 'lower':
      return LEGS_TARGETS;
    case 'full_body':
      return FULL_BODY_TARGETS;
  }
}

// ── Prioridades musculares (Fase 0-B-1) ──────────────────────────────────────
// Único sitio donde se decide si un target está "priorizado": lo está si
// CUALQUIERA de sus muscleGroups aparece en la lista de prioridades del usuario.
// Vive aquí (no en muscleBasedSelection.ts) porque es lógica pura del dominio
// MuscleTarget, junto a las listas que consulta. Con priorities=[] devuelve
// siempre false —`some` sobre `[].includes(mg)` es false—, así que anteponer
// los priorizados a cualquier lista es un no-op mientras el usuario no fije
// ninguna prioridad (caso universal hoy, sin UI).
export function targetIsPrioritized(target: MuscleTarget, priorities: MuscleGroup[]): boolean {
  return target.muscleGroups.some(mg => priorities.includes(mg));
}

// Resuelve una key suelta (p. ej. las de SECOND_COMPOUND_ORDER) a su MuscleTarget
// canónico buscándola en las cuatro listas. Devuelve el primer match: las keys
// duplicadas entre listas (pecho/espalda/cuadriceps) tienen los MISMOS
// muscleGroups en todas, así que el resultado de targetIsPrioritized no depende
// de cuál se resuelva.
const ALL_TARGETS: MuscleTarget[] = [
  ...PUSH_TARGETS, ...PULL_TARGETS, ...LEGS_TARGETS, ...FULL_BODY_TARGETS,
];

export function findTargetByKey(key: string): MuscleTarget | undefined {
  return ALL_TARGETS.find(t => t.key === key);
}
