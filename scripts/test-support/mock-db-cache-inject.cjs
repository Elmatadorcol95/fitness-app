// Preload (--require) que sustituye src/db/index.ts por mock-db.ts SOLO para
// scripts de prueba aislados corridos con tsx. Motivo completo en mock-db.ts.
//
// tsx resuelve los imports de este proyecto (sin "type":"module" en
// package.json) a través de require() de CommonJS, así que interceptar en
// require.cache — por la ruta absoluta resuelta de src/db/index.ts — evita
// que el import real llegue nunca a expo-sqlite/react-native.
require('tsx/cjs');

const path = require('path');
const Module = require('module');

const targetPath = path.resolve(__dirname, '../../src/db/index.ts');
const mock = require('./mock-db.ts');

const fakeModule = new Module(targetPath, null);
fakeModule.filename = targetPath;
fakeModule.loaded = true;
fakeModule.exports = mock;
require.cache[targetPath] = fakeModule;
