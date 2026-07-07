// Sustituto de src/db/index.ts SOLO para pruebas aisladas por tsx.
//
// src/db/index.ts usa expo-sqlite, que depende de react-native y no puede
// cargarse fuera del runtime de Expo/Metro (react-native/index.js usa sintaxis
// Flow que esbuild/tsx no puede parsear). Este archivo ofrece el mismo shape
// ({ db, schema }) pero respaldado por node:sqlite (nativo de Node, en
// memoria), usando el driver oficial drizzle-orm/sqlite-proxy contra el mismo
// schema.ts real del proyecto — mismas tablas, mismo query builder, mismos
// operadores (eq/and/etc.), solo cambia el motor de ejecución SQL.
//
// Se activa vía scripts/test-support/mock-db-cache-inject.cjs, que inyecta
// este módulo en require.cache bajo la ruta resuelta de src/db/index.ts
// únicamente para el proceso de prueba. Ningún archivo de producción se
// modifica ni se entera de que existe este archivo.
// @ts-expect-error — moduleResolution:"bundler" (tsconfig de Expo) no resuelve
// los tipos de módulos node: aunque @types/node los incluya; solo afecta a
// este script de prueba, no se compila/empaqueta con la app.
import { DatabaseSync } from 'node:sqlite';
import { drizzle } from 'drizzle-orm/sqlite-proxy';
import * as schema from '../../src/db/schema';

const sqlite = new DatabaseSync(':memory:');
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS muscle_exercise_usage (
    muscle text NOT NULL,
    exercise_id text NOT NULL,
    used_at integer NOT NULL,
    PRIMARY KEY(muscle, exercise_id)
  );
`);

export const db = drizzle(async (sql, params, method) => {
  const stmt = sqlite.prepare(sql);
  stmt.setReturnArrays(true);
  if (method === 'run') {
    stmt.run(...params);
    return { rows: [] };
  }
  if (method === 'get') {
    const row = stmt.get(...params);
    return { rows: row ? [row] : [] };
  }
  const rows = stmt.all(...params);
  return { rows };
}, { schema });

export { schema };
