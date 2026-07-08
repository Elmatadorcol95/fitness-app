// Script de prueba AISLADO para selectExercisesForDayByMuscle() (Sub-paso 2,
// Fase 0-A). No toca plan-generator.ts ni workout.store.ts — solo ejercita el
// algoritmo nuevo contra una base de datos SQLite en memoria (ver
// scripts/test-support/mock-db.ts para el motivo de por qué hace falta).
//
// Ejecutar con:
//   npx tsx scripts/test-muscle-selection.ts
import './test-support/mock-db-cache-inject.cjs';

import { selectExercisesForDayByMuscle, type MuscleSelectedExercise } from '@/lib/muscleBasedSelection';
import { getTargetsForDayType } from '@/lib/muscleTargets';
import { getUsedExerciseIds, markExerciseUsed } from '@/lib/muscleUsage';
import { EXERCISES } from '@/lib/exercises';

function line(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

function summarize(results: MuscleSelectedExercise[]) {
  for (const r of results) {
    console.log(
      `  [${r.isCompound ? 'compuesto' : 'aislamiento'}] target=${r.targetKey.padEnd(16)} -> ${r.exercise.id} (${r.exercise.name.es})`,
    );
  }
}

function checkNoDuplicateIds(results: MuscleSelectedExercise[], label: string): boolean {
  const ids = results.map(r => r.exercise.id);
  const uniq = new Set(ids);
  const ok = uniq.size === ids.length;
  console.log(`  [check] ningún id repetido en "${label}": ${ok ? 'OK' : 'FALLO — ' + ids.join(',')}`);
  return ok;
}

function checkMaxSlots(results: MuscleSelectedExercise[], targetKey: string, max: number, label: string): boolean {
  const count = results.filter(r => r.targetKey === targetKey).length;
  const ok = count <= max;
  console.log(`  [check] "${targetKey}" <= ${max} en "${label}": ${ok ? `OK (${count})` : `FALLO (${count})`}`);
  return ok;
}

// Verifica el tope general (MAX_EXERCISES_PER_TARGET=3 en muscleBasedSelection.ts,
// no exportado — se replica el valor aquí solo para el check, no la lógica)
// sobre TODOS los targets presentes en el resultado, no solo uno concreto.
function checkAllCaps(results: MuscleSelectedExercise[], max: number, label: string): boolean {
  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.targetKey, (counts.get(r.targetKey) ?? 0) + 1);
  let ok = true;
  for (const [key, count] of counts) {
    if (count > max) {
      console.log(`  [check] tope general (${max}) respetado en "${label}": FALLO — "${key}" tiene ${count}`);
      ok = false;
    }
  }
  if (ok) console.log(`  [check] tope general (${max}) respetado en "${label}": OK (máximo visto: ${Math.max(...counts.values())})`);
  return ok;
}

// Falla si CUALQUIER ejercicio del resultado tiene category 'cardio' o
// 'mobility' — esas dos categorías nunca deben aparecer en generación de
// fuerza (mismo criterio que el sistema viejo garantizaba siempre).
function checkNoCardioOrMobility(results: MuscleSelectedExercise[], label: string): boolean {
  const bad = results.filter(r => r.exercise.category === 'cardio' || r.exercise.category === 'mobility');
  const ok = bad.length === 0;
  console.log(`  [check] sin cardio/mobility en "${label}": ${ok ? 'OK' : 'FALLO — ' + bad.map(r => `${r.exercise.id}(${r.exercise.category})`).join(', ')}`);
  return ok;
}

// Verifica (reimplementado de forma independiente, sin llamar a la lógica
// interna de muscleBasedSelection.ts) que la category real de cada ejercicio
// elegido corresponde al componente de día del dayType en el que se generó:
// push->'push'; pull->'pull'; legs/lower->'legs'|'core'; upper->la
// sourceCategory del target concreto (no ambas); full_body->cualquiera de
// las 4. Falla explícitamente si encuentra un desajuste.
function checkCategoryAlignment(results: MuscleSelectedExercise[], dayType: string, label: string): boolean {
  const targets = getTargetsForDayType(dayType as any);
  let ok = true;
  for (const r of results) {
    const target = targets.find(t => t.key === r.targetKey);
    let expected: string[];
    if (dayType === 'push') expected = ['push'];
    else if (dayType === 'pull') expected = ['pull'];
    else if (dayType === 'legs' || dayType === 'lower') expected = ['legs', 'core'];
    else if (dayType === 'full_body') expected = ['push', 'pull', 'legs', 'core'];
    else if (dayType === 'upper') expected = target ? [target.sourceCategory] : [];
    else expected = [];
    if (!expected.includes(r.exercise.category)) {
      console.log(`  [check] alineación de categoría FALLO en "${label}": target=${r.targetKey} id=${r.exercise.id} category=${r.exercise.category} esperado=${expected.join('|')}`);
      ok = false;
    }
  }
  if (ok) console.log(`  [check] alineación de categoría en "${label}": OK`);
  return ok;
}

function coverageReport(results: MuscleSelectedExercise[], dayType: string) {
  const targets = getTargetsForDayType(dayType as any);
  console.log('  Cobertura por target:');
  for (const t of targets) {
    const count = results.filter(r => r.targetKey === t.key).length;
    console.log(`    - ${t.key.padEnd(18)} (prioridad ${t.bonusPriority}${t.maxSlots ? ', maxSlots=' + t.maxSlots : ''}): ${count} ejercicio(s)${count === 0 ? '  <-- SIN COBERTURA' : ''}`);
  }
}

async function main() {
  let allOk = true;

  // ── Escenario 1: upper, gimnasio completo, 45 min y 90 min ────────────────
  line('ESCENARIO 1a — upper / gimnasio completo / 45 min (compounds=3, isolations=2)');
  const upper45 = await selectExercisesForDayByMuscle('upper', [], true, { compounds: 3, isolations: 2 }, new Set());
  summarize(upper45);
  coverageReport(upper45, 'upper');
  allOk = checkNoDuplicateIds(upper45, 'upper 45min') && allOk;
  allOk = checkMaxSlots(upper45, 'antebrazo', 1, 'upper 45min') && allOk;
  allOk = checkNoCardioOrMobility(upper45, 'upper 45min') && allOk;
  allOk = checkCategoryAlignment(upper45, 'upper', 'upper 45min') && allOk;
  const priority1Upper = getTargetsForDayType('upper').filter(t => t.bonusPriority === 1);
  for (const t of priority1Upper) {
    const covered = upper45.some(r => r.targetKey === t.key);
    console.log(`  [check] prioridad 1 "${t.key}" cubierto a 45min: ${covered ? 'OK' : 'FALLO'}`);
    allOk = covered && allOk;
  }

  line('ESCENARIO 1b — upper / gimnasio completo / 90 min (compounds=4, isolations=4)');
  const upper90 = await selectExercisesForDayByMuscle('upper', [], true, { compounds: 4, isolations: 4 }, new Set());
  summarize(upper90);
  coverageReport(upper90, 'upper');
  allOk = checkNoDuplicateIds(upper90, 'upper 90min') && allOk;
  allOk = checkMaxSlots(upper90, 'antebrazo', 1, 'upper 90min') && allOk;
  allOk = checkNoCardioOrMobility(upper90, 'upper 90min') && allOk;
  allOk = checkCategoryAlignment(upper90, 'upper', 'upper 90min') && allOk;
  for (const t of priority1Upper) {
    const covered = upper90.some(r => r.targetKey === t.key);
    console.log(`  [check] prioridad 1 "${t.key}" cubierto a 90min: ${covered ? 'OK' : 'FALLO'}`);
    allOk = covered && allOk;
  }
  const priority2Upper = getTargetsForDayType('upper').filter(t => t.bonusPriority === 2);
  const priority2CoveredCount = priority2Upper.filter(t => upper90.some(r => r.targetKey === t.key)).length;
  console.log(`  [reporte] prioridad 2 cubiertos a 90min: ${priority2CoveredCount}/${priority2Upper.length} (no forzado a ser 100% — ver informe)`);

  // ── Escenario 2: legs, equipamiento de casa mínimo (solo sliders) ─────────
  line('ESCENARIO 2 — legs / equipment=["sliders"] / isGym=false / 60 min (compounds=3, isolations=3)');
  const legsSliders = await selectExercisesForDayByMuscle('legs', ['sliders'], false, { compounds: 3, isolations: 3 }, new Set());
  summarize(legsSliders);
  coverageReport(legsSliders, 'legs');
  allOk = checkNoDuplicateIds(legsSliders, 'legs sliders') && allOk;
  allOk = checkMaxSlots(legsSliders, 'antebrazo', 1, 'legs sliders') && allOk; // legs no tiene antebrazo; check trivial de control
  allOk = checkNoCardioOrMobility(legsSliders, 'legs sliders') && allOk;
  allOk = checkCategoryAlignment(legsSliders, 'legs', 'legs sliders') && allOk;

  // ── Escenario 3: simular uso previo agotando "antebrazo" a mano ───────────
  line('ESCENARIO 3 — simular ciclo agotado de antebrazo (forearms) y verificar reset');
  const antebrazoTarget = getTargetsForDayType('pull').find(t => t.key === 'antebrazo')!;
  const forearmExercises = EXERCISES.filter(e => antebrazoTarget.muscleGroups.some(m => e.primaryMuscles.includes(m)));
  console.log(`  Ejercicios de "antebrazo" (forearms) en el catálogo: ${forearmExercises.length} ->`, forearmExercises.map(e => e.id));

  for (const ex of forearmExercises) {
    await markExerciseUsed(ex); // marcado manual, FUERA de selectExercisesForDayByMuscle (punto B)
  }
  const usedBefore = await getUsedExerciseIds('forearms');
  console.log(`  [antes] getUsedExerciseIds('forearms') tras marcar todos manualmente: ${usedBefore.size} de ${forearmExercises.length}`);

  const pullAfterExhaustion = await selectExercisesForDayByMuscle('pull', [], true, { compounds: 4, isolations: 4 }, new Set());
  summarize(pullAfterExhaustion);
  const antebrazoPick = pullAfterExhaustion.find(r => r.targetKey === 'antebrazo');
  console.log(`  [check] "antebrazo" recibió un pick pese al ciclo agotado: ${antebrazoPick ? 'OK -> ' + antebrazoPick.exercise.id : 'FALLO'}`);
  allOk = !!antebrazoPick && allOk;

  const usedAfter = await getUsedExerciseIds('forearms');
  console.log(`  [check] getUsedExerciseIds('forearms') quedó vacío tras el reset (resetMuscleCycle se activó): ${usedAfter.size === 0 ? 'OK' : 'FALLO (' + usedAfter.size + ' aún marcados)'}`);
  allOk = (usedAfter.size === 0) && allOk;

  allOk = checkNoDuplicateIds(pullAfterExhaustion, 'pull tras agotar antebrazo') && allOk;
  allOk = checkMaxSlots(pullAfterExhaustion, 'antebrazo', 1, 'pull tras agotar antebrazo') && allOk;
  allOk = checkNoCardioOrMobility(pullAfterExhaustion, 'pull tras agotar antebrazo') && allOk;
  allOk = checkCategoryAlignment(pullAfterExhaustion, 'pull', 'pull tras agotar antebrazo') && allOk;

  // ── Escenario 5: forzar la conversión explícita de compuesto sobrante ─────
  line('ESCENARIO 5 — push / gimnasio completo / counts a mano {compounds:5, isolations:1} (forzar desbalance)');
  const push5c1i = await selectExercisesForDayByMuscle('push', [], true, { compounds: 5, isolations: 1 }, new Set());
  summarize(push5c1i);
  coverageReport(push5c1i, 'push');
  const pechoCount = push5c1i.filter(r => r.targetKey === 'pecho').length;
  console.log(`  [check] "pecho" topado en 3: ${pechoCount === 3 ? 'OK (3)' : 'FALLO (' + pechoCount + ')'}`);
  allOk = (pechoCount === 3) && allOk;
  const isolationCount = push5c1i.filter(r => !r.isCompound).length;
  console.log(`  [reporte] total de ejercicios de aislamiento en el resultado: ${isolationCount} (counts.isolations pedido era 1 — cualquier exceso solo puede venir de la conversión de compoundLeft, ver log "[muscleBasedSelection] compoundLeft..." arriba)`);
  allOk = checkNoDuplicateIds(push5c1i, 'push counts a mano') && allOk;
  allOk = checkMaxSlots(push5c1i, 'antebrazo', 1, 'push counts a mano') && allOk; // push no tiene antebrazo; check trivial de control
  allOk = checkNoCardioOrMobility(push5c1i, 'push counts a mano') && allOk;
  allOk = checkCategoryAlignment(push5c1i, 'push', 'push counts a mano') && allOk;

  // ── Escenario 5b: mismo desbalance pero con margen suficiente para superar
  // el tope de pecho y forzar compoundLeft > 0 real hacia la conversión ──────
  line('ESCENARIO 5b — push / gimnasio completo / counts a mano {compounds:6, isolations:1} (forzar evidencia positiva)');
  const push6c1i = await selectExercisesForDayByMuscle('push', [], true, { compounds: 6, isolations: 1 }, new Set());
  summarize(push6c1i);
  coverageReport(push6c1i, 'push');
  const pechoCount6 = push6c1i.filter(r => r.targetKey === 'pecho').length;
  console.log(`  [check] "pecho" topado en 3: ${pechoCount6 === 3 ? 'OK (3)' : 'FALLO (' + pechoCount6 + ')'}`);
  allOk = (pechoCount6 === 3) && allOk;
  const isolationCount6 = push6c1i.filter(r => !r.isCompound).length;
  console.log(`  [reporte] total de ejercicios de aislamiento en el resultado: ${isolationCount6} (counts.isolations pedido era 1 — cualquier exceso viene de la conversión de compoundLeft, ver log "[muscleBasedSelection] compoundLeft..." arriba)`);
  console.log(`  [check] la conversión aportó aislamiento extra: ${isolationCount6 > 1 ? 'OK (+' + (isolationCount6 - 1) + ')' : 'FALLO (sin exceso)'}`);
  allOk = (isolationCount6 > 1) && allOk;
  allOk = checkNoDuplicateIds(push6c1i, 'push counts a mano 6c1i') && allOk;
  allOk = checkMaxSlots(push6c1i, 'antebrazo', 1, 'push counts a mano 6c1i') && allOk; // push no tiene antebrazo; check trivial de control
  allOk = checkNoCardioOrMobility(push6c1i, 'push counts a mano 6c1i') && allOk;
  allOk = checkCategoryAlignment(push6c1i, 'push', 'push counts a mano 6c1i') && allOk;

  // ── Escenario 6: lower debe comportarse igual que legs ────────────────────
  line('ESCENARIO 6 — lower vs legs / gimnasio completo / 60 min (compounds=3, isolations=3)');
  const legsTargetsList  = getTargetsForDayType('legs');
  const lowerTargetsList = getTargetsForDayType('lower');
  console.log(`  [check] getTargetsForDayType('lower') === getTargetsForDayType('legs') (misma referencia): ${lowerTargetsList === legsTargetsList ? 'OK' : 'FALLO'}`);
  const sameKeys = JSON.stringify(legsTargetsList.map(t => t.key)) === JSON.stringify(lowerTargetsList.map(t => t.key));
  console.log(`  [check] mismos 7 targets (cuadriceps, isquiotibiales, gluteos, pantorrilla, aductores, core_estabilidad, abs_flexion): ${sameKeys ? 'OK' : 'FALLO'} -> ${JSON.stringify(legsTargetsList.map(t => t.key))}`);
  allOk = sameKeys && allOk;

  const legsGym  = await selectExercisesForDayByMuscle('legs',  [], true, { compounds: 3, isolations: 3 }, new Set());
  const lowerGym = await selectExercisesForDayByMuscle('lower', [], true, { compounds: 3, isolations: 3 }, new Set());
  console.log('  Resultado "legs":');
  summarize(legsGym);
  console.log('  Resultado "lower":');
  summarize(lowerGym);
  coverageReport(legsGym, 'legs');

  const normalize = (rs: MuscleSelectedExercise[]) => JSON.stringify(rs.map(r => ({ t: r.targetKey, id: r.exercise.id, c: r.isCompound })));
  const identical = normalize(legsGym) === normalize(lowerGym);
  console.log(`  [check] resultado idéntico en estructura entre "legs" y "lower": ${identical ? 'OK' : 'FALLO'}`);
  allOk = identical && allOk;
  allOk = checkNoDuplicateIds(legsGym, 'legs gym 60min') && allOk;
  allOk = checkNoDuplicateIds(lowerGym, 'lower gym 60min') && allOk;
  allOk = checkAllCaps(legsGym, 3, 'legs gym 60min') && allOk;
  allOk = checkAllCaps(lowerGym, 3, 'lower gym 60min') && allOk;
  allOk = checkNoCardioOrMobility(legsGym, 'legs gym 60min') && allOk;
  allOk = checkNoCardioOrMobility(lowerGym, 'lower gym 60min') && allOk;
  allOk = checkCategoryAlignment(legsGym, 'legs', 'legs gym 60min') && allOk;
  allOk = checkCategoryAlignment(lowerGym, 'lower', 'lower gym 60min') && allOk;

  // ── Escenario 7: full_body con equipamiento de casa mixto ─────────────────
  line('ESCENARIO 7 — full_body / equipment=["dumbbells","mat"] / isGym=false / 45 min (compounds=3, isolations=2)');
  const fullBody = await selectExercisesForDayByMuscle('full_body', ['dumbbells', 'mat'], false, { compounds: 3, isolations: 2 }, new Set());
  summarize(fullBody);
  coverageReport(fullBody, 'full_body');
  const fbTargets = getTargetsForDayType('full_body');
  const fbCovered = fbTargets.filter(t => fullBody.some(r => r.targetKey === t.key));
  const fbUncovered = fbTargets.filter(t => !fullBody.some(r => r.targetKey === t.key));
  console.log(`  [reporte] targets de FULL_BODY_TARGETS cubiertos: ${fbCovered.length}/${fbTargets.length} (presupuesto total=5 para 6 targets — al menos 1 queda fuera por aritmética, no necesariamente por equipamiento)`);
  console.log(`  [reporte] sin cobertura: ${fbUncovered.length ? fbUncovered.map(t => t.key).join(', ') : '(ninguno)'}`);
  allOk = checkNoDuplicateIds(fullBody, 'full_body casa mixta') && allOk;
  allOk = checkAllCaps(fullBody, 3, 'full_body casa mixta') && allOk;
  allOk = checkNoCardioOrMobility(fullBody, 'full_body casa mixta') && allOk;
  allOk = checkCategoryAlignment(fullBody, 'full_body', 'full_body casa mixta') && allOk;

  line(allOk ? 'RESULTADO GLOBAL: TODOS LOS CHECKS OK' : 'RESULTADO GLOBAL: HAY CHECKS QUE FALLARON — ver arriba');
  process.exitCode = allOk ? 0 : 1;
}

main();
