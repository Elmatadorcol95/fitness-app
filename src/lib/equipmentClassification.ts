import { EXERCISES } from '@/lib/exercises';
import { kgToLb, lbToKg } from './units';

export type EquipLocal = 'barbell' | 'dumbbell' | 'kettlebell' | 'cable' | 'machine' | 'assisted' | 'weighted_vest' | 'bodyweight';

export function getEquipLocal(exerciseId: string): EquipLocal {
  const ex = EXERCISES.find(e => e.id === exerciseId);
  if (!ex) return 'bodyweight';
  if (ex.equipment.includes('barbellPlates'))  return 'barbell';
  if (ex.equipment.includes('dumbbells'))      return 'dumbbell';
  if (ex.equipment.includes('kettlebells'))    return 'kettlebell';
  if (ex.equipment.includes('cableMachine'))   return 'cable';
  if (ex.equipment.includes('legPressMachine'))return 'machine';
  // Máquinas selectorizadas de carga añadidas en el Lote 11 del catálogo
  // (ver CLAUDE.md) — antes caían por el 'bodyweight' final de abajo pese
  // a trackear un weightKg real, lo que hacía que computeCoach tomara la
  // rama de peso corporal (kg:0 siempre) y el peso nunca se propagara a
  // la siguiente serie. assistedMachine tiene su PROPIO EquipLocal
  // ('assisted', más abajo) en vez de 'machine': la asistencia es inversa
  // (más peso/asistencia = más fácil), así que computeCoach necesita una
  // rama dedicada, no la fórmula de e1rm pensada para carga real.
  // cardioMachine incluida por corrección — en la práctica nunca llega
  // aquí, porque los ejercicios category:'cardio' nunca entran a
  // exercises: ExerciseState[] (ver PlanDayData.cardio, un campo aparte).
  if (ex.equipment.includes('chestPressMachine'))    return 'machine';
  if (ex.equipment.includes('shoulderPressMachine')) return 'machine';
  if (ex.equipment.includes('seatedRowMachine'))     return 'machine';
  if (ex.equipment.includes('smithMachine'))         return 'machine';
  if (ex.equipment.includes('pecDeckMachine'))       return 'machine';
  if (ex.equipment.includes('tBarRowMachine'))       return 'machine';
  if (ex.equipment.includes('hipThrustMachine'))     return 'machine';
  if (ex.equipment.includes('abMachine'))            return 'machine';
  if (ex.equipment.includes('hipAbductorMachine'))   return 'machine';
  if (ex.equipment.includes('hipAdductorMachine'))   return 'machine';
  if (ex.equipment.includes('calfMachine'))          return 'machine';
  if (ex.equipment.includes('assistedMachine'))      return 'assisted';
  if (ex.equipment.includes('cardioMachine'))        return 'machine';
  if (ex.equipment.includes('weightedVest'))         return 'weighted_vest';
  return 'bodyweight';
}

export const EQUIP_INC: Record<EquipLocal, number> = {
  barbell: 5, dumbbell: 1, kettlebell: 4, cable: 2.5, machine: 5, assisted: 5, weighted_vest: 1, bodyweight: 0,
};

// #29: incrementos "limpios" reales cuando el usuario ve el peso en libras
// (discos de barra de 5 lb por lado = salto de 10; mancuernas de a 5;
// kettlebells de a 5; chaleco de a 2). Se usan SOLO para redondear el número
// que se muestra a un perfil imperial — internamente todo sigue en kg.
export const EQUIP_INC_LB: Record<EquipLocal, number> = {
  barbell: 10, dumbbell: 5, kettlebell: 5, cable: 2.5, machine: 5, assisted: 5, weighted_vest: 2, bodyweight: 0,
};

// #29: redondea un peso (en kg) al incremento "limpio" de su equipo, en la
// escala de la unidad del perfil.
//  - metric:   comportamiento de siempre — múltiplo de EQUIP_INC[equip] en kg
//              (o a 1 decimal si el incremento es 0).
//  - imperial: convierte a lb, redondea al múltiplo de EQUIP_INC_LB[equip], y
//              devuelve el kg equivalente — así el número que se muestre en lb
//              queda limpio (10/5/5/2…) y no un decimal feo por la conversión.
export function roundToCleanIncrement(kg: number, equip: EquipLocal, units: 'metric' | 'imperial'): number {
  if (units === 'imperial') {
    const inc = EQUIP_INC_LB[equip];
    const lb  = kgToLb(kg);
    const roundedLb = inc > 0 ? Math.round(lb / inc) * inc : Math.round(lb * 10) / 10;
    return lbToKg(roundedLb);
  }
  const inc = EQUIP_INC[equip];
  return inc > 0 ? Math.round(kg / inc) * inc : Math.round(kg * 10) / 10;
}
