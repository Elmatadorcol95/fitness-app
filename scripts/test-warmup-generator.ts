// Script de prueba AISLADO para generateWarmup() (Fase 1b, Paso 1).
// No toca training.tsx, session.tsx ni ningún archivo de UI — solo ejercita
// warmupGenerator.ts contra el catálogo real de EXERCISES.
//
// warmupGenerator.ts importa plan-generator.ts (canDoExercise), que a su vez
// importa muscleBasedSelection.ts -> muscleUsage.ts -> '@/db' (expo-sqlite,
// depende de react-native y no puede cargarse fuera de Expo/Metro). El mock
// de mock-db-cache-inject.cjs sustituye ese import antes de que ocurra
// (mismo mecanismo que test-muscle-selection.ts).
//
// Ejecutar con:
//   npx tsx scripts/test-warmup-generator.ts
import './test-support/mock-db-cache-inject.cjs';

import { generateWarmup, type WarmupItem } from '@/lib/warmupGenerator';
import type { DayType } from '@/lib/plan-generator';

function line(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(title);
  console.log('='.repeat(70));
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error('FALLO: ' + msg);
  console.log('  OK — ' + msg);
}

function printItems(items: WarmupItem[]) {
  for (const it of items) {
    console.log(
      `    [${it.durationSeconds}s] ${it.exercise.id}` +
      ` (category=${it.exercise.category}, phase=${it.exercise.movementPhase ?? '—'},` +
      ` equipment=[${it.exercise.equipment.join(',')}])`,
    );
  }
  const total = items.reduce((s, i) => s + i.durationSeconds, 0);
  console.log(`    Total cubierto: ${total}s`);
}

// ── Escenario 1: push, gimnasio, 5/10/15 min ─────────────────────────────────
line('Escenario 1 — push, gimnasio, 5/10/15 min');
for (const minutes of [5, 10, 15] as const) {
  console.log(`\n-- push / gym / ${minutes} min --`);
  const items = generateWarmup('push', [], true, minutes);
  printItems(items);

  assert(items.length > 0, 'genera al menos un ítem');
  const first = items[0];
  assert(first.exercise.category === 'cardio', 'el primer ítem es de categoría cardio');
  assert(first.exercise.equipment.includes('cardioMachine'), 'el primer ítem usa cardioMachine');
  assert(first.durationSeconds === 180, 'la apertura de gimnasio dura 180s fijos');

  const rest = items.slice(1);
  assert(
    rest.every(i => i.exercise.category === 'mobility'),
    'el resto de ítems son de categoría mobility',
  );
  assert(
    rest.every(i => i.exercise.movementPhase !== 'cooldown'),
    'ningún ítem tiene movementPhase==="cooldown"',
  );
  assert(
    items.every(i => i.exercise.category === 'cardio' || i.exercise.category === 'mobility'),
    'ningún ítem tiene categoría fuera de cardio/mobility',
  );
}

// ── Escenario 2: legs, casa (equipment: ['mat']), 10 min ─────────────────────
line('Escenario 2 — legs, casa (equipment: ["mat"]), 10 min');
{
  const homeEquipment = ['mat'];
  const items = generateWarmup('legs', homeEquipment, false, 10);
  printItems(items);

  assert(items.length > 0, 'genera al menos un ítem');
  const first = items[0];
  assert(first.exercise.category === 'cardio', 'el primer ítem es de categoría cardio');
  assert(first.exercise.equipment.length === 0, 'el cardio de casa no requiere equipamiento');
  assert(first.durationSeconds === 60, 'la apertura de casa dura 60s fijos');

  const rest = items.slice(1);
  assert(
    rest.every(i => i.exercise.equipment.every(eq => homeEquipment.includes(eq))),
    'ningún ítem de movilidad exige equipamiento fuera de la lista de casa',
  );
  assert(
    rest.every(i => !i.exercise.equipment.includes('resistanceBands')),
    'no aparece resistanceBands (no está en la lista de casa)',
  );
  assert(
    rest.every(i => !i.exercise.equipment.includes('pullupBar')),
    'no aparece pullupBar (no está en la lista de casa)',
  );
}

// ── Escenario 3: full_body, casa, 5 min ──────────────────────────────────────
line('Escenario 3 — full_body, casa, 5 min');
{
  const items = generateWarmup('full_body', ['mat'], false, 5);
  printItems(items);

  assert(items.length > 0, 'genera al menos un ítem');
  const mobilityItems = items.slice(1); // el primero es la apertura de cardio
  assert(
    mobilityItems.every(i => !i.exercise.relevantDayTypes || i.exercise.relevantDayTypes.length === 0),
    'todos los ítems de movilidad son del pool general (sin relevantDayTypes)',
  );
}

// ── Escenario 4: pool pequeño que se agota y repite (upper, casa, 15 min) ────
line('Escenario 4 — upper, casa (equipment: ["mat"]), 15 min — agota el pool y repite');
{
  const homeEquipment = ['mat'];
  const dayType: DayType = 'upper';
  const items = generateWarmup(dayType, homeEquipment, false, 15);
  printItems(items);

  const mobilityItems = items.slice(1);
  const uniqueIds = new Set(mobilityItems.map(i => i.exercise.id));

  console.log(`    Ítems de movilidad generados: ${mobilityItems.length}, ids únicos: ${uniqueIds.size}`);

  assert(mobilityItems.length > 0, 'no crashea y genera ítems de movilidad');
  assert(
    mobilityItems.length > uniqueIds.size,
    'el pool se agotó y repitió al menos un ejercicio (round-robin)',
  );

  const total = items.reduce((s, i) => s + i.durationSeconds, 0);
  assert(total >= 15 * 60, 'el tiempo total cubierto iguala o supera los 15 minutos pedidos');
}

line('TODOS LOS ESCENARIOS PASARON');
