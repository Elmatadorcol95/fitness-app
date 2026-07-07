import type { MuscleGroup } from './exercises';
import type { DayType } from './plan-generator';

export interface MuscleTarget {
  key: string;                  // ej. 'espalda', 'biceps', 'core_estabilidad'
  muscleGroups: MuscleGroup[];  // uno o varios valores reales del catálogo que satisfacen este objetivo
  bonusPriority: number;        // 1 = recibe hueco extra primero, 2 = después
  maxSlots?: number;            // si se define, nunca recibe más de este número de huecos (ej. antebrazo=1)
}

export const PUSH_TARGETS: MuscleTarget[] = [
  { key: 'pecho', muscleGroups: ['chest'], bonusPriority: 1 },
  { key: 'hombros', muscleGroups: ['shoulders'], bonusPriority: 2 },
  { key: 'triceps', muscleGroups: ['triceps'], bonusPriority: 2 },
];

export const PULL_TARGETS: MuscleTarget[] = [
  { key: 'espalda', muscleGroups: ['back', 'lats'], bonusPriority: 1 },
  { key: 'biceps', muscleGroups: ['biceps'], bonusPriority: 2 },
  { key: 'trapecio', muscleGroups: ['traps'], bonusPriority: 2 },
  { key: 'antebrazo', muscleGroups: ['forearms'], bonusPriority: 2, maxSlots: 1 },
];

export const LEGS_TARGETS: MuscleTarget[] = [
  { key: 'cuadriceps', muscleGroups: ['quads'], bonusPriority: 1 },
  { key: 'isquiotibiales', muscleGroups: ['hamstrings'], bonusPriority: 1 },
  { key: 'gluteos', muscleGroups: ['glutes'], bonusPriority: 2 },
  { key: 'pantorrilla', muscleGroups: ['calves'], bonusPriority: 2 },
  { key: 'aductores', muscleGroups: ['adductors'], bonusPriority: 2 },
  { key: 'core_estabilidad', muscleGroups: ['core'], bonusPriority: 2 },
  { key: 'abs_flexion', muscleGroups: ['abs'], bonusPriority: 2 },
];

export const FULL_BODY_TARGETS: MuscleTarget[] = [
  { key: 'pecho', muscleGroups: ['chest'], bonusPriority: 1 },
  { key: 'espalda', muscleGroups: ['back', 'lats'], bonusPriority: 1 },
  { key: 'hombros', muscleGroups: ['shoulders'], bonusPriority: 2 },
  { key: 'cuadriceps', muscleGroups: ['quads'], bonusPriority: 1 },
  { key: 'isquios_gluteos', muscleGroups: ['hamstrings', 'glutes'], bonusPriority: 1 },
  { key: 'core', muscleGroups: ['core'], bonusPriority: 2 },
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
