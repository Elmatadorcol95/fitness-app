@AGENTS.md

# Proyecto: App de fitness y nutrición

## Resumen
App móvil (Android + iOS) para entrenar en casa y en gimnasio, con planes 
personalizables por reglas, seguimiento de progreso, peso corporal y 
nutrición por texto. Funciona OFFLINE. Se publicará en App Store y Google Play.
El usuario depende 100% de Claude Code y no programa: explica cada paso en 
lenguaje sencillo y di qué comandos ejecutar.

## Stack (fijo)
- Expo (React Native) + TypeScript + Expo Router
- Base de datos local offline: expo-sqlite con Drizzle ORM
- Estado: Zustand
- i18n: i18next + expo-localization (es, en, fr al inicio; ampliable)
- Gráficas: react-native-chart-kit o victory-native
- Compilación para tiendas: EAS Build
- Sin backend ni cuentas al inicio (un solo usuario local), pero la capa de 
  datos debe permitir añadir sincronización en la nube en el futuro.
- Unidades: el usuario elige métrico (kg/cm) o imperial (lb/ft). Guardar 
  internamente en métrico y convertir solo al mostrar.

## Módulos (en este orden)
1. Perfil y onboarding (datos, objetivo: fuerza/hipertrofia/pérdida de grasa, 
   días/semana, minutos/sesión, lugar, equipamiento, lesiones).
2. Entrenamiento: planes por reglas/plantillas según el perfil, totalmente 
   editables. Base local de 60-80 ejercicios (casa y gym, con alternativas 
   para casa).
3. Progresión y recomendaciones por reglas de sobrecarga progresiva, con 
   gráficas.
4. Peso corporal y objetivos configurables (ej. "perder X kg", "X g proteína").
5. Nutrición SOLO por texto (sin foto). Base local USDA para offline + Open 
   Food Facts online para marcas, con capa de abstracción.

## Reglas de trabajo
- Trabajar por fases, aprobando una a la vez antes de seguir.
- Antes de instalar librerías nuevas, explicar qué son y por qué.
- Claves de API en variables de entorno, nunca en el código del cliente.
- Incluir descargo: la app no da consejo médico.

## Estado actual
- Hecho: estructura base de Expo.
- Hecho: FASE 1 — instaladas expo-sqlite, drizzle-orm, drizzle-kit, zustand, 
  i18next, react-i18next, expo-localization. Carpetas: db/, store/, i18n/, lib/.
  Utilidades de conversión métrico/imperial en lib/units.ts.
- Hecho: FASE 2 — Onboarding completo de 7 pasos:
  * src/db/schema.ts — tabla profile con Drizzle ORM
  * src/db/migrations/ — migración SQL generada con drizzle-kit
  * babel.config.js — plugin inline-import para archivos .sql
  * src/store/profile.store.ts — Zustand store con draft del onboarding
  * src/components/onboarding/ — 7 pasos: Welcome, Physical, Goal,
    Schedule, Location, Injuries, Summary + ProgressBar + OnboardingFlow
  * src/app/_layout.tsx — carga perfil de SQLite al arrancar;
    muestra onboarding si no hay perfil, app principal si sí hay
  * Traducciones completas en es, en y fr
- Hecho: corrección de error en _layout.tsx — import de useMigrations
  apuntaba a 'drizzle-orm/expo-sqlite' en lugar de
  'drizzle-orm/expo-sqlite/migrator'. App corre en teléfono real con
  EAS Development Build (SDK 56 no está en Expo Go público todavía).
- Siguiente: FASE 3 — Pantalla principal de la app (tabs reales: Hoy,
  Historial, Progreso, Perfil) y reemplazar las pantallas demo de Expo.

## IMPORTANTE
Actualiza la sección "Estado actual" al final de cada sesión, anotando qué se 
completó y cuál es el siguiente paso.
