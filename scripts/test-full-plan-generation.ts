// Script de verificación funcional del SISTEMA CONECTADO (Sub-paso 3, Fase 0-A).
// Distinto del script del Sub-paso 2 (test-muscle-selection.ts, que prueba
// selectExercisesForDayByMuscle() aislada): este prueba generatePlan() /
// selectExercisesForDay() reales de plan-generator.ts, ya conectados.
//
// Ejecutar con:
//   npx tsx scripts/test-full-plan-generation.ts
import './test-support/mock-db-cache-inject.cjs';

import { generatePlan, type PlanDayData } from '@/lib/plan-generator';
import { EXERCISES } from '@/lib/exercises';
import { PUSH_TARGETS, PULL_TARGETS, LEGS_TARGETS, getTargetsForDayType } from '@/lib/muscleTargets';

function line(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

function idsOf(exercises: { exerciseId: string }[]): string[] {
  return exercises.map(e => e.exerciseId);
}

// Verifica (reimplementado de forma independiente, sin llamar a la lógica
// interna de muscleBasedSelection.ts) que la category real de cada ejercicio
// del plan corresponde al componente de día de su dayType: push->'push';
// pull->'pull'; legs/lower->'legs'|'core'; full_body->cualquiera de las 4.
// PlannedExercise no conserva el targetKey (se pierde en selectExercisesForDay
// al pasar por buildPlanned), así que para 'upper' se infieren los targets
// PLAUSIBLES por solapamiento de primaryMuscles y se acepta si la category
// coincide con la sourceCategory de AL MENOS UNO de esos targets plausibles
// — no es tan preciso como el check del Sub-paso 2 (que sí tiene el target
// real), pero es la mejor verificación posible desde fuera con los datos
// que el plan expone.
function checkCategoryAlignment(days: PlanDayData[], label: string): boolean {
  let ok = true;
  for (const day of days) {
    const targets = getTargetsForDayType(day.dayType);
    for (const pe of day.exercises) {
      const ex = EXERCISES.find(e => e.id === pe.exerciseId);
      if (!ex) continue;
      let expected: string[];
      if (day.dayType === 'push') expected = ['push'];
      else if (day.dayType === 'pull') expected = ['pull'];
      else if (day.dayType === 'legs' || day.dayType === 'lower') expected = ['legs', 'core'];
      else if (day.dayType === 'full_body') expected = ['push', 'pull', 'legs', 'core'];
      else if (day.dayType === 'upper') {
        const plausible = targets.filter(t => t.muscleGroups.some(m => ex.primaryMuscles.includes(m)));
        expected = plausible.map(t => t.sourceCategory);
      } else {
        expected = [];
      }
      if (!expected.includes(ex.category)) {
        console.log(`  [check] alineación de categoría FALLO en "${label}": día ${day.dayIndex} (${day.dayType}) id=${ex.id} category=${ex.category} esperado=${expected.join('|') || '(ninguno plausible)'}`);
        ok = false;
      }
    }
  }
  if (ok) console.log(`  [check] alineación de categoría en "${label}": OK`);
  return ok;
}

async function main() {
  let allOk = true;

  // ── Check 1: plan de 4 días (upper/lower/upper/lower), gym, 60 min ────────
  line('CHECK 1 — Plan 4 días (upper/lower/upper/lower) / gimnasio completo / 60 min');
  const plan4 = await generatePlan({
    goalPrimary: 'hypertrophy',
    goalSecondary: null,
    daysPerWeek: 4,
    minutesPerSession: 60,
    location: 'gym',
    equipment: '[]',
  });

  for (const day of plan4.days) {
    console.log(`  Día ${day.dayIndex} (${day.dayType}): ${idsOf(day.exercises).join(', ')}`);
  }

  const upperDays = plan4.days.filter(d => d.dayType === 'upper');
  const lowerDays = plan4.days.filter(d => d.dayType === 'lower');
  console.log(`  [info] días 'upper' encontrados: ${upperDays.length}, días 'lower' encontrados: ${lowerDays.length}`);

  const upperIdsA = idsOf(upperDays[0].exercises);
  const upperIdsB = idsOf(upperDays[1].exercises);
  const upperIdentical = JSON.stringify(upperIdsA) === JSON.stringify(upperIdsB);
  console.log(`  [check] los dos días 'upper' NO son idénticos: ${!upperIdentical ? 'OK' : 'FALLO — ambos son ' + JSON.stringify(upperIdsA)}`);
  allOk = !upperIdentical && allOk;

  const lowerIdsA = idsOf(lowerDays[0].exercises);
  const lowerIdsB = idsOf(lowerDays[1].exercises);
  const lowerIdentical = JSON.stringify(lowerIdsA) === JSON.stringify(lowerIdsB);
  console.log(`  [check] los dos días 'lower' NO son idénticos: ${!lowerIdentical ? 'OK' : 'FALLO — ambos son ' + JSON.stringify(lowerIdsA)}`);
  allOk = !lowerIdentical && allOk;

  // ── Check 2: ningún ejercicio del plan es cardio/mobility/full_body ──────
  line('CHECK 2 — Ningún ejercicio del plan de 4 días es cardio/mobility/full_body');
  const badCategoryExercises: { day: number; dayType: string; id: string; category: string }[] = [];
  for (const day of plan4.days) {
    for (const ex of day.exercises) {
      const catalogEx = EXERCISES.find(e => e.id === ex.exerciseId);
      if (!catalogEx) {
        console.log(`  !! exerciseId no encontrado en EXERCISES: ${ex.exerciseId} (día ${day.dayIndex})`);
        continue;
      }
      if (catalogEx.category === 'cardio' || catalogEx.category === 'mobility' || catalogEx.category === 'full_body') {
        badCategoryExercises.push({ day: day.dayIndex, dayType: day.dayType, id: ex.exerciseId, category: catalogEx.category });
      }
    }
  }
  const check2Ok = badCategoryExercises.length === 0;
  console.log(`  [check] sin cardio/mobility/full_body en todo el plan: ${check2Ok ? 'OK' : 'FALLO'}`);
  if (!check2Ok) {
    for (const b of badCategoryExercises) console.log(`    - día ${b.day} (${b.dayType}): ${b.id} (${b.category})`);
  }
  allOk = check2Ok && allOk;

  const check2bOk = checkCategoryAlignment(plan4.days, 'plan 4 días (upper/lower)');
  allOk = check2bOk && allOk;

  // ── Check 3: cobertura semanal básica de targets push+pull+legs ──────────
  line('CHECK 3 — Cobertura semanal: cada target de push+pull+legs recibe algo en algún día');
  const allWeekIds = new Set(plan4.days.flatMap(d => idsOf(d.exercises)));
  const allWeekExercises = [...allWeekIds].map(id => EXERCISES.find(e => e.id === id)!).filter(Boolean);
  const strengthTargets = [...PUSH_TARGETS, ...PULL_TARGETS, ...LEGS_TARGETS];

  let allTargetsCovered = true;
  for (const t of strengthTargets) {
    const covered = allWeekExercises.some(e => t.muscleGroups.some(m => e.primaryMuscles.includes(m)));
    console.log(`    - ${t.key.padEnd(18)}: ${covered ? 'OK' : 'SIN COBERTURA EN TODA LA SEMANA'}`);
    if (!covered) allTargetsCovered = false;
  }
  console.log(`  [check] todos los targets push+pull+legs cubiertos en la semana: ${allTargetsCovered ? 'OK' : 'FALLO'}`);
  allOk = allTargetsCovered && allOk;

  // ── Check 4: plan de 3 días (push/pull/legs), equipamiento mínimo de casa ─
  line('CHECK 4 — Plan 3 días (push/pull/legs) / equipment=["mat"] / isGym=false / 30 min');
  let plan3: Awaited<ReturnType<typeof generatePlan>> | null = null;
  let crashed = false;
  try {
    plan3 = await generatePlan({
      goalPrimary: 'fat_loss',
      goalSecondary: null,
      daysPerWeek: 3,
      minutesPerSession: 30,
      location: 'home',
      equipment: '["mat"]',
    });
  } catch (err) {
    crashed = true;
    console.log('  !! CRASH generando el plan:', err);
  }
  console.log(`  [check] generatePlan() no crashea con equipamiento mínimo: ${!crashed ? 'OK' : 'FALLO'}`);
  allOk = !crashed && allOk;

  if (plan3) {
    for (const day of plan3.days) {
      console.log(`  Día ${day.dayIndex} (${day.dayType}): ${idsOf(day.exercises).join(', ') || '(vacío)'}`);
    }
    const weekIds3 = new Set(plan3.days.flatMap(d => idsOf(d.exercises)));
    const weekExercises3 = [...weekIds3].map(id => EXERCISES.find(e => e.id === id)!).filter(Boolean);
    console.log('  Cobertura de targets con equipamiento mínimo (mat):');
    for (const t of strengthTargets) {
      const covered = weekExercises3.some(e => t.muscleGroups.some(m => e.primaryMuscles.includes(m)));
      console.log(`    - ${t.key.padEnd(18)}: ${covered ? 'cubierto' : 'SIN COBERTURA (esperable con equipamiento tan limitado)'}`);
    }
    allOk = checkCategoryAlignment(plan3.days, 'plan 3 días (push/pull/legs, mat)') && allOk;
  }

  line(allOk ? 'RESULTADO GLOBAL: TODOS LOS CHECKS OK' : 'RESULTADO GLOBAL: HAY CHECKS QUE FALLARON — ver arriba');
  process.exitCode = allOk ? 0 : 1;
}

main();
