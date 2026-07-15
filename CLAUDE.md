@AGENTS.md

# Proyecto: Vulcan — App de fitness y nutrición

## Resumen
App móvil (Android + iOS) llamada **Vulcan**. Para entrenar en casa y en 
gimnasio, con planes personalizables por reglas, seguimiento de progreso, 
peso corporal y nutrición por texto. Funciona OFFLINE. Se publicará en App 
Store y Google Play. El usuario depende 100% de Claude Code y no programa: 
explica cada paso en lenguaje sencillo y di qué comandos ejecutar.

## Marca e identidad
- **Nombre**: Vulcan (reemplaza cualquier referencia a "FitApp").
- **Logo**: martillo de herrero golpeando un yunque. La cabeza del martillo 
  es PERPENDICULAR al mango. El conjunto está inclinado ~45° apuntando hacia 
  abajo y a la derecha. Colores: martillo y yunque en verde (#3FBF7F), mango 
  en verde claro (#5BD897), chispa en ámbar (#F2B450).
- **Modo principal**: oscuro. Modo claro opcional.
- **Paleta de color**:
  * Fondo:            #141A17
  * Superficies/cards:#1C231F
  * Acento (botones): #3FBF7F  (verde esmeralda — SOLO botones de acción y logros)
  * Verde claro:      #5BD897  (detalles, mango del martillo)
  * Secundario:       #F2B450  (ámbar — progreso y datos)
  * Texto principal:  #F1F4F1
  * Texto atenuado:   #9DA89F
  * Texto sobre verde:#04261A
  * Cumple WCAG AA en todos los contrastes.

## Animación de carga (Lottie o Reanimated)
Bucle ~1.3 s sobre fondo #141A17:
- Yunque clásico en #3FBF7F en la parte baja.
- Martillo: mango en #5BD897, cabeza en #3FBF7F, cabeza PERPENDICULAR al mango,
  conjunto inclinado ~45°.
- Movimiento: el martillo pivota sobre el extremo superior del mango, se alza
  y baja a golpear el yunque manteniendo SIEMPRE la inclinación de 45°.
  Leve rebote tras el impacto.
- Al impactar: chispas en #F2B450 que aparecen y se desvanecen.
- Debajo: texto "Vulcan", mensaje rotativo ("Forjando tu plan…",
  "Templando los datos…") y barra de progreso fina en #3FBF7F.
- Uso: SOLO en cargas reales (primer arranque, generar plan). Resto: indicadores
  discretos para que la app no parezca lenta.
- El usuario puede pasar un archivo HTML de referencia con la animación exacta.

## Stack (fijo)
- Expo (React Native) + TypeScript + Expo Router
- Base de datos local offline: expo-sqlite con Drizzle ORM
- Estado: Zustand
- i18n: i18next + expo-localization (es, en, fr al inicio; ampliable)
- Gráficas: react-native-chart-kit o victory-native
- Compilación para tiendas: EAS Build
- **Backend**: Supabase (solo para auth y validación de pagos; offline-first)
- Unidades: el usuario elige métrico (kg/cm) o imperial (lb/ft). Guardar 
  internamente en métrico y convertir solo al mostrar.

## Módulos (orden actualizado)
1. Perfil y onboarding (completado en Fase 2; pendiente mejoras en Fase 4).
2. Entrenamiento: planes por reglas/plantillas según el perfil, editables.
   Base local de 60-80 ejercicios etiquetados por equipamiento.
3. Progresión con sobrecarga progresiva y gráficas.
4. Peso corporal y objetivos configurables.
5. Nutrición solo por texto (USDA offline + Open Food Facts online).
6. **Progreso**: fotos privadas + medidas corporales + peso (una sola pestaña).
7. **Auth y pagos**: Supabase Auth (email+contraseña+verificación) + compra 
   única de por vida (validada en servidor).

## Decisiones de diseño del onboarding (Fase 4)
- **Paso 3 – Objetivos**: elegir hasta 2 de 3 (Fuerza / Hipertrofia / Pérdida 
  de grasa). El usuario marca cuál es PRINCIPAL y cuál SECUNDARIO. El generador 
  de planes usa las reglas del objetivo principal como base y las ajusta hacia 
  el secundario. Combinaciones definidas:
  * Fuerza + Hipertrofia: series de fuerza (3-5 reps pesadas) + bloque de 
    hipertrofia (8-12 reps). Descansos: 2-3 min.
  * Hipertrofia + Pérdida de grasa: volumen moderado (10-15 reps), descansos 
    cortos (60-90 s), algo de cardio metabólico al final.
  * Fuerza + Pérdida de grasa: trabajo de fuerza mantenido (3-5 reps) con 
    déficit calórico; volumen total reducido para evitar sobreentrenamiento.
- **Paso 4 – Horario**: menús desplegables. Días: 1-7. Minutos: 15 a 120 en 
  intervalos de 15. El generador se adapta a cualquier combinación.
- **Paso 5 – Equipamiento**:
  * GIMNASIO → asumir equipamiento completo, no preguntar nada más.
  * CASA → mostrar lista para marcar: peso corporal (base), mancuernas, barra 
    con discos, kettlebells, bandas de resistencia, mini-bands de glúteo, barra 
    de dominadas, barras paralelas/paraletas, anillas de gimnasia, TRX, banco 
    ajustable, cajón pliométrico/step, balón medicinal, fitball, rueda 
    abdominal, comba, esterilla, rodillo de espuma, sliders, chaleco lastrado.
  * Cada ejercicio en la BD etiquetado por equipamiento requerido.

## Registro y modelo de pago (Supabase)
- **Auth**: correo + contraseña vía Supabase Auth. Verificación por email 
  obligatoria antes de acceder a la app.
- **Prueba gratuita**: 14 días con todas las funciones. Fecha de inicio 
  guardada en Supabase (no en el dispositivo, para evitar trampa con el reloj).
- **Compra única de por vida**: in-app purchase NO consumible. Al terminar el 
  trial, pantalla de desbloqueo (no app muerta). El estado de la compra se 
  valida en el servidor.
- **Offline**: solo se necesita internet para registrarse y validar la compra.
  Todo lo demás funciona sin conexión.
- Las claves de Supabase y de pagos van en variables de entorno, nunca en el 
  código cliente.

## Módulo Progreso (Fase 8)
### Fotos de progreso
- Máximo 1 foto al día.
- PRIVACIDAD: fotos guardadas SOLO en el teléfono, cifradas, NUNCA subidas 
  a servidor salvo activación explícita del usuario. Indicarlo en la UI.
- Captura guiada: silueta/fantasma de la foto anterior superpuesta para 
  alinear pose, ángulo y luz. Poses: frente, perfil, espalda.
- Vista: deslizador antes/después entre dos fechas + cuadrícula de línea 
  de tiempo.
### Medidas corporales
- El usuario elige qué medidas seguir: cuello, hombros, pecho, cintura, 
  cadera, brazo, antebrazo, muslo, pantorrilla, % de grasa.
- Respeta el sistema de unidades elegido.
- Gráfica de evolución por medida. Idealmente silueta corporal interactiva 
  o lista con mini-gráfica de tendencia.

## Lote de mejoras visuales y de motivación (aprobado)
### Íconos y emojis
- Reemplazar TODOS los emojis de sistema por íconos vectoriales de @expo/vector-icons
  (ya en el build — sin recompilación).
- Paleta: verde #3FBF7F, ámbar #F2B450, blanco suave #F1F4F1.
- En estados vacíos usar símbolo Vulcan (martillo + yunque + chispa) bien centrado.
- Tab bar, pantalla Hoy, progreso, perfil, historial: sin emojis.

### Gráfica de medidas
- Eje X: fecha de cada medida (formato dd/mm), orden cronológico.
- Eje Y: valor de la medida.

### Flecha de tendencia (medidas)
- Compara el valor más reciente con el PRIMERO registrado (no con el anterior).
- Color según objetivo principal del usuario:
  * Medidas donde bajar es bueno (cintura, cadera, % grasa, peso): bajar=verde, subir=ámbar.
  * Medidas donde subir es bueno (brazo, pecho, hombros, muslo, pantorrilla):
    subir=verde, bajar=ámbar. Cuello y antebrazo = neutro.
  * Si objetivo principal = fuerza/hipertrofia: prioriza "subir músculo".
  * Si objetivo principal = fat_loss: prioriza "bajar grasa/cintura".

### Motivación y gamificación (tema herrero)
- Racha de entrenamiento: días consecutivos, con ícono de brasa/fuego ámbar que crece.
- Logros temáticos desbloqueables:
  * "Primera chispa" = 1er entrenamiento
  * "Aprendiz de herrero" = 10 entrenamientos
  * "Oficial" = 25 entrenamientos
  * "Maestro herrero" = 50 entrenamientos
  * "Forja incandescente" = racha de 7 días
  * "Acero templado" = racha de 30 días
  * "Récord personal" = nuevo PR en cualquier ejercicio
- Insignias: íconos planos en paleta Vulcan.
- Celebración PR: animación de chispas (misma que el logo) al batir récord.

### Frases motivadoras diarias (voz original de Vulcan)
- Lista de ~30 frases originales con tema herrero/forja. NO citas de terceros.
- Rotación diaria (por día del año), sin repetición hasta agotar el ciclo.
- Mostrar en pantalla Hoy al abrir la app.
- Ejemplos aprobados: "El hierro no se forja en frío.", "Cada repetición templa
  tu temple.", "Hoy golpeas; mañana eres acero.", "La fragua no descansa, tú tampoco hoy."

### Recapitulativo mensual y semanal — "Tu forja de [mes]"
- Pantalla/tarjeta con logo y paleta Vulcan que resume el mes:
  entrenamientos, volumen total, racha, cambio de peso/medidas, récords, logros.
- Versión semanal (mini).
- Se puede compartir como imagen (sin datos sensibles, con permiso del usuario).
- Tono: divertido y didáctico.

### Anillos de macros y temporizador
- Anillos de macros del día (proteína y calorías vs. objetivo), estilo anillos de
  actividad, en verde/ámbar. Implementar con puro RN/Reanimated (sin react-native-svg
  para evitar recompilación).
- Temporizador de descanso entre series con animación del martillo.

### Háptica (requiere recompilación)
- expo-haptics: vibración sutil al completar serie, guardar y desbloquear logro.
- Agrupar con cualquier otro módulo nativo pendiente en UNA sola recompilación.

## Equipamiento del usuario (Fases E-1/E-2/E-3)

### FUNCIÓN 1 — Pantalla "Mi equipamiento" en Ajustes (Fase E-1)
- Misma lista del onboarding (StepLocation). Lee/escribe **únicamente** en
  `profile.equipment` (JSON string en SQLite) — única fuente de la verdad.
- Muestra la ubicación actual (gym / casa / ambos) y, si no es solo gym, la
  lista de casillas de equipamiento en casa con su estado actual.
- Al guardar: persiste en `profile` + actualiza el profile store. Si el
  equipamiento cambia respecto al anterior, ofrecer regenerar el plan.
- El catálogo de ejercicios y `ChangeExerciseModal` ya usan `profile.equipment`
  en tiempo real; no hace falta re-generar solo para que el intercambio funcione.

### PENDIENTE FASE E-4 — Priorizar máquinas en accesorios (gym)
- `cableMachine` y `legPressMachine` se asumen disponibles si `location='gym'|'both'`
  pero NO están en la lista de equipamiento del perfil (ni en `HOME_EQUIPMENT` del
  onboarding). Para E-4: añadirlos como EquipmentKey implícito de gym y usarlos para
  priorizar ejercicios de cable/máquina en los bloques accesorios cuando el usuario
  elige entrenar en gym. Resolver antes de implementar si se añaden al perfil o se
  infieren desde `location`.

### FUNCIÓN 2 — "¿Dónde entrenas hoy?" (Fases E-2 y E-3)
- **Solo aparece si `profile.location === 'both'`**. Si solo gym o solo casa,
  arranca directo sin preguntar.
- Pregunta antes de `startSession()`: "¿Dónde entrenas hoy? Gym / Casa".
  La respuesta se guarda en el session store como `trainingContext: 'gym' | 'home'`
  (volátil, no persiste entre sesiones).
- **Filtro ligero** (no duplica planes):
  * `trainingContext === 'home'`: para cada ejercicio del plan que requiere
    equipo de gym y el usuario no lo tiene en casa, buscar alternativa con
    `getAlternatives()` pasando `isGym=false` y el equipamiento casero del perfil.
    Si no hay alternativa válida, marcar el ejercicio con nota "Sin equivalente
    en casa" (no inventar ejercicio imposible).
  * `trainingContext === 'gym'`: plan sin cambios (isGym=true); en el generador
    los básicos con barra/mancuerna son columna vertebral; máquinas solo en
    accesorios. Comportamiento ya existente.
- La sustitución del Fase E-3 ocurre al iniciar la sesión, antes de que el
  usuario vea la pantalla de sesión (o durante el startSession, no como pop-up
  por ejercicio).

## Reglas de trabajo
- Trabajar por fases, aprobando una a la vez antes de seguir.
- Antes de instalar librerías nuevas, explicar qué son y por qué.
- Claves de API en variables de entorno, nunca en el código del cliente.
- Incluir descargo: la app no da consejo médico.
- Al final de cada sesión, actualizar "Estado actual".
- Marcar siempre si un cambio es solo JS (recarga) o requiere recompilar el build.
- Agrupar TODOS los módulos nativos en una sola recompilación al final.
- **Migraciones Drizzle — `when` es funcional, no decorativo**: el campo `when`
  de cada entrada en `src/db/migrations/meta/_journal.json` lo usa el migrador
  (`drizzle-orm/expo-sqlite`) como `created_at` en la tabla de control
  `__drizzle_migrations`, y decide si una migración se aplica comparándolo
  contra el `when` MÁS ALTO ya registrado en el dispositivo — no es solo un
  registro informativo. Las entradas 0002-0008 tienen timestamps sintéticos de
  2025 (no son fechas reales de creación; las 7 se commitearon el mismo día en
  2026 — ver commit `9dd6e49`). Toda migración nueva debe generar su `when`
  con un `Date.now()` real ejecutado en el momento de crearla y verificar
  explícitamente que supere el máximo de TODAS las entradas existentes, no
  solo la de índice más alto (hoy ese máximo lo tiene la entrada 1, no la 8).
  Si no se cumple, la migración nueva nunca se aplicará en ningún dispositivo
  que ya tenga migraciones previas instaladas.

## Estado actual
- Hecho: estructura base de Expo.
- Hecho: FASE 1 — infraestructura (drizzle, zustand, i18n, carpetas, unidades).
- Hecho: FASE 2 — Onboarding completo de 7 pasos, esquema SQLite, 
  migraciones, store de perfil, traducciones es/en/fr.
- Hecho: corrección en _layout.tsx (import useMigrations). App corre en 
  teléfono real con EAS Development Build.
- Hecho: FASE 3 — Marca Vulcan:
  * app.json: nombre "Vulcan", slug "vulcan", scheme "vulcan", fondo oscuro
  * constants/theme.ts: paleta completa oscura/clara con accent, amber, etc.
  * Traducciones actualizadas (FitApp → Vulcan en es/en/fr)
  * components/VulcanSplash.tsx: animación de carga con martillo, yunque,
    chispas ámbar y barra de progreso (Reanimated, ~1.3 s en bucle)
  * _layout.tsx: usa VulcanSplash mientras carga, elimina ActivityIndicator
  * scripts/generate-icon.js: genera icon.png, android-icon-foreground.png
    y splash-icon.png con sharp desde el SVG del logo
  * themed-text.tsx: añadido tipo 'defaultSemiBold'
- Hecho: FASE 4 — Onboarding V2:
  * Esquema DB: goal → goalPrimary + goalSecondary (migración manual 0001)
  * store: goals: Goal[] (índice 0=principal, 1=secundario)
  * StepGoal: selección de hasta 2 objetivos con badges Principal/Secundario
  * StepSchedule: dropdowns nativos con @react-native-picker/picker
    (días 1-7, minutos 15-120 en saltos de 15)
  * StepLocation: gimnasio → mensaje de equipo completo sin más preguntas;
    casa/ambos → lista de 20 items de equipamiento
  * StepSummary y OnboardingFlow actualizados para los nuevos campos
  * Traducciones completas es/en/fr con todos los equipamientos y badges
- Hecho: FASE 5 — Navegación principal:
  * 4 pestañas reales: Hoy (⚡), Historial (🕐), Progreso (📈), Perfil (👤)
  * Iconos generados con sharp (scripts/generate-tab-icons.js)
  * index.tsx: pantalla Hoy con saludo, fecha, resumen de objetivo y plan,
    placeholder para entrenamientos
  * history.tsx: pantalla Historial (estado vacío, contenido en Fase 9)
  * progress.tsx: pantalla Progreso (estado vacío, contenido en Fase 8)
  * profile.tsx: pantalla Perfil con todos los datos reales del usuario
    (objetivo, plan, físico, equipamiento, lesiones) leídos desde SQLite
  * app-tabs.tsx: 4 triggers con iconos y etiquetas i18n; color acento verde
  * Traducciones completas es/en/fr para todas las pantallas
- Hecho: FASE 6 — Supabase Auth:
  * Proyecto Supabase: nerxwfvlvgjdjtlczuly.supabase.co
  * Tabla user_status con RLS + trigger on_auth_user_created en Supabase
  * src/lib/supabase.ts: cliente con almacenamiento en memoria (sin nativo).
    Migrar a expo-secure-store en el próximo EAS build (ya añadido a app.json)
  * src/store/auth.store.ts: session, userStatus, isAuthLoading
  * src/components/auth/: AuthFlow, LoginForm, RegisterForm,
    VerifyEmailScreen, PaywallScreen
  * _layout.tsx: flujo completo — splash → auth → paywall → onboarding → tabs
  * Traducciones completas es/en/fr para auth y paywall
  * NOTA: sesión no persiste al cerrar la app (in-memory storage);
    se corregirá con expo-secure-store en el siguiente build
- Hecho: deep linking de verificación de email:
  * emailRedirectTo: 'vulcan://auth/callback' en signUp
  * src/app/auth/callback.tsx: ruta Expo Router que procesa el código PKCE
    (exchangeCodeForSession) y redirige a / al terminar
  * _layout.tsx: usa usePathname(); devuelve <Slot /> para /auth/callback
    para que Expo Router pueda renderizar la ruta
- Hecho: FASE 8 — Módulo Progreso:
  * 4 tablas nuevas en SQLite: weight_log, body_measurements, progress_photos,
    measurement_prefs (migración 0002_progress_module.sql)
  * src/store/progress.store.ts: Zustand store completo
  * src/components/progress/: WeightTab, MeasurementsTab, PhotosTab,
    BeforeAfterSlider, AddWeightModal, AddMeasurementModal,
    MeasurementPickerModal, SimpleLineChart
  * EAS Build completado (2026-06-05) con expo-image-picker, expo-file-system,
    expo-secure-store, expo-crypto
- Hecho: correcciones de bugs (sesión 2026-06-08/09):
  * Bucle infinito auth ("Maximum update depth exceeded"):
    - auth.store.ts: nueva acción setAuthState(session, userStatus) que hace
      un solo set() atómico en vez de tres separados.
    - _layout.tsx: selectores individuales de Zustand en vez de suscripción
      al store completo; onAuthStateChange usa setAuthState.
    - auth/callback.tsx: usa <Redirect href="/"> en vez de router.replace()
      dentro de un efecto, añadido useRef guard para evitar doble ejecución.
  * Error "FileSystem.documentDirectory es null" en fotos de progreso:
    - En Expo SDK 56, expo-file-system cambió su API por defecto (orientada a
      objetos). La API antigua está en expo-file-system/legacy.
    - PhotosTab.tsx: cambiado import a expo-file-system/legacy. Sin recompilación.
- Hecho: MEJORA A — Íconos uniformes (JS, recarga):
  * Nuevo componente src/components/icons/VulcanSymbol.tsx: yunque verde +
    chispa ámbar para estados vacíos y pantallas de marca.
  * Todos los emojis del sistema reemplazados por @expo/vector-icons:
    - index.tsx: GoalChip con Ionicons barbell/body/flame; StatBox acepta
      ReactNode; icono de ubicación; VulcanSymbol en placeholder de entreno.
    - profile.tsx: Row acepta ReactNode; objetivos y ubicación con iconos.
    - history.tsx: Ionicons time-outline en estado vacío.
    - WeightTab.tsx: MaterialCommunityIcons scale en estado vacío.
    - MeasurementsTab.tsx: Ionicons body-outline en estado vacío.
    - PhotosTab.tsx: Ionicons lock-closed (privacidad) + camera-outline (vacío).
    - StepGoal.tsx: Ionicons por objetivo en lugar del mapa de emojis.
    - StepSummary.tsx: nombres de objetivos sin prefijo emoji.
    - PaywallScreen.tsx: VulcanSymbol en lugar de ⚒️.
    - VerifyEmailScreen.tsx: Ionicons mail-outline en lugar de 📬.
  * Solo quedan ✓ y ✕ (símbolos Unicode estándar de UI, no emojis).
- Hecho: correcciones de auth (sesión 2026-06-09):
  * Bucle infinito definitivo resuelto con patrón "overlay":
    - _layout.tsx: <AppTabs /> siempre montado; AuthFlow, OnboardingFlow,
      PaywallScreen y VulcanSplash son Views absolutas encima (absoluteFillObject).
    - Eliminado usePathname() del layout raíz (suscribía al store de navegación
      de Expo Router y causaba re-renders al montar/desmontar NativeTabs).
    - Deep link vulcan://auth/callback manejado con Linking en _layout.tsx;
      ya no se usa la ruta src/app/auth/callback.tsx para esto.
  * Validación de sesión con getUser() al arranque:
    - INITIAL_SESSION de onAuthStateChange se ignora (no confiamos en sesión
      de memoria sin verificar).
    - Al arrancar se llama supabase.auth.getUser() contra el servidor. Si la
      cuenta fue borrada en Supabase, devuelve error → setAuthState(null, null)
      → aparece AuthFlow. Evita que una sesión en memoria de una cuenta borrada
      salte directo a la app.
  * Pestaña Perfil con profile = null:
    - profile.tsx: ya no devuelve null (pantalla negra). Muestra estado vacío
      con ícono y botón "Cerrar sesión / reiniciar" siempre accesible.
    - handleSignOut movido antes del null-check; borra perfil de SQLite, limpia
      store y llama supabase.auth.signOut().
- Hecho: diagnóstico de auth + fix cierre de sesión (sesión 2026-06-09):
  * _layout.tsx: logs [Auth] en onAuthStateChange, startup getUser y
    setAuthState; StyleSheet.absoluteFillObject → absoluteFill (fix TS).
  * profile.tsx: handleSignOut usa finally para llamar setAuthState(null, null)
    siempre (aunque signOut() falle o el evento SIGNED_OUT no llegue).
    Añadidos logs [Profile] antes/después de signOut para diagnóstico.
- Hecho: BUG — nombres de objetivos sin traducir (sesión 2026-06-09):
  * index.tsx y profile.tsx usaban 'onboarding.goals.*' (con 's') pero las
    claves en los JSON son 'onboarding.goal.*' (sin 's'). Corregido con
    replace_all en ambos archivos.
- Hecho: Rediseño StepPhysical + fix campo numérico (sesión 2026-06-09):
  * StepPhysical.tsx reescrito completamente (solo JS, recarga):
    - Steppers +/- para altura y peso: elimina el bug de edición numérica.
    - Segmented control horizontal para género con iconos (male/female/people).
    - Año de nacimiento: campo de texto con estado local (sin reformateo en
      cada tecla); edad calculada en tiempo real al lado (ej. "→ 30 años");
      validación solo al salir del campo con mensaje amable.
    - Toggle inline de unidades (kg·cm / lb·ft) en la propia pantalla.
    - Íconos planos (@expo/vector-icons) junto a cada etiqueta.
    - Borde verde (#3FBF7F) al enfocar el campo de año.
  * ProgressBar.tsx: fill en verde acento #3FBF7F (antes theme.text).
  * Traducciones es/en/fr: añadidas claves birthYearError y ageHint.
- Hecho: mejoras StepPhysical — fecha y stepper editable (sesión 2026-06-09):
  * Nueva migración 0003_birth_date.sql: ALTER TABLE profile ADD COLUMN birth_date TEXT.
  * schema.ts: añadido birthDate (text). profile.store.ts: birthDate?: string.
  * OnboardingFlow.tsx: insert usa birthDate en vez de birthYear.
  * StepPhysical.tsx reescrito: fecha de nacimiento con 3 Pickers en fila
    (día/mes/año, ya instalado @react-native-picker/picker); edad calculada
    dinámicamente respetando si el cumpleaños ya pasó este año. Stepper con
    TextInput editable en el centro: toca para escribir el número directo,
    valida/convierte al salir del campo; +/- siguen funcionando para ajuste fino.
  * profile.tsx: muestra birthDate en formato dd/mm/yyyy + (N años).
  * Traducciones es/en/fr: keys birthDate, ageHint, yearsOld.
- Hecho: MEJORA B — Gráfica y tendencias de medidas (JS, recarga):
  * SimpleLineChart.tsx: añadidos ejes. Eje X con fechas dd/mm (primera,
    media y última, orden cronológico). Eje Y con máx/medio/mín y líneas
    guía tenues. Nuevos props labelColor y decimals. WeightTab usa el eje.
  * MeasurementsTab.tsx: la tendencia ahora compara el valor MÁS RECIENTE con
    el PRIMER registro (antes comparaba con el penúltimo). Color según
    objetivo principal (goalPrimary):
    - UP_IS_GOOD (hombros, pecho, brazo, muslo, pantorrilla): subir=verde
      acento, bajar=ámbar.
    - DOWN_IS_GOOD (cintura, cadera, % grasa): bajar=verde, subir=ámbar.
    - Neutros (cuello, antebrazo): grises, salvo que el objetivo principal
      sea fat_loss (bajar=bueno) o fuerza/hipertrofia (subir=bueno).
  * El gráfico de medidas convierte a las unidades del usuario (cm→in) en el
    eje Y; bodyFatPct se muestra tal cual.
- Hecho: MEJORA C — Frases motivadoras diarias (JS, recarga):
  * 30 frases originales con tema herrero/forja en es/en/fr (clave motd.quotes).
  * Rotación diaria por día del año (getDayOfYear() % 30); sin repetición hasta
    agotar el ciclo de 30 días.
  * Tarjeta "Forja del día" en pantalla Hoy: borde izquierdo ámbar, icono
    flame-outline, título en mayúsculas, frase en cursiva.
- Hecho: MEJORA D — Gamificación (JS, recarga):
  * Migración 0004_gamification.sql: tablas achievements + gamification_meta.
  * gamification.store.ts: racha (streak), racha máxima, total entrenamientos,
    desbloqueo automático de 7 logros al llamar recordWorkout() desde FASE 9.
  * StreakWidget: tarjeta en pantalla Hoy con llama que crece con la racha
    (outline/muted=0, small amber=1-6d, medium=7-29d, large=30d+) y contador
    de entrenos totales en verde.
  * AchievementsSection: cuadrícula en Perfil con los 7 logros Vulcan;
    desbloqueados con borde verde y color vivo, bloqueados grises con candado.
  * resetAll() en handleSignOut del Perfil (limpia SQLite + store).
  * FASE 9 debe llamar recordWorkout(date) y unlockAchievement('personal_record')
    para conectar los datos reales.
- Hecho: MEJORA E — Recap mensual/semanal (JS, recarga):
  * RecapModal.tsx: modal completo con toggle Semana/Mes. Datos: entrenos
    totales, racha actual, cambio de peso del período (consulta directa a DB),
    logros desbloqueados. Frase motivadora contextual (3 niveles).
  * Botón banner "Ver mi forja de [mes]" en pantalla Hoy (color ámbar, borde
    sutil, icono martillo). Abre el modal al tocarlo.
  * Compartir: Share.share() de React Native (texto formateado, sin módulo nativo).
    Imagen compartible se añadirá en MEJORA F junto con la recompilación nativa.
  * Traducciones completas es/en/fr (clave recap.*).
- Hecho: FASE 9a — Módulo Entrenamiento — base + generador (JS, recarga):
  * Migración 0005_training_module.sql: 5 tablas — workout_plans, plan_days,
    workout_sessions, session_sets, exercise_maxes.
  * src/lib/exercises.ts: catálogo 62 ejercicios (es/en/fr, músculos, equipo).
  * src/lib/plan-generator.ts: algoritmo con splits PPL/full_body (upper/lower
    eliminados de la tabla de splits en sesión posterior — ver "Estado actual"),
    esquemas de reps por objetivo, filtro por equipamiento disponible.
  * src/store/workout.store.ts: Zustand + SQLite — generateAndSavePlan,
    loadCurrentPlan, advanceDayIndex, resetAll.
  * src/components/workout/WorkoutCard.tsx: tarjeta en pantalla Hoy (reemplazada
    en FASE A por TodayBanner).
  * i18n es/en/fr: clave workout.* completa.
- Hecho: BUG — race condition "no such table: workout_plans":
  * workout.store.ts: loadCurrentPlan() captura el error "no such table" sin
    lanzarlo (deja isLoaded=false para que _layout.tsx reintente).
  * _layout.tsx: tras migrationsReady, llama loadCurrentPlan() con certeza de
    que todas las tablas existen. Garantiza carga correcta aunque WorkoutCard
    monte antes de que useMigrations termine.
- Hecho: MEJORA F — Háptica + sesión persistente (parcial — pendiente EAS Build):
  * src/lib/haptics.ts: wrapper seguro con require() + try/catch. No crashea si el
    módulo no está en el build actual. 3 niveles: light (guardar dato), success (logro).
  * AddWeightModal, AddMeasurementModal, PhotosTab: hapticsLight() al guardar.
  * gamification.store.ts: hapticsSuccess() al desbloquear logro.
  * supabase.ts: migrado de memoria a expo-secure-store (ya compilado). Sesión
    ahora persiste al cerrar la app. sanitizeKey() para compatibilidad de claves.
  * RecapModal: captureRef (react-native-view-shot) + expo-sharing para imagen;
    fallback automático a Share.share() de texto si el módulo no está disponible.
  ⚠️ PENDIENTE EAS BUILD: ejecutar los comandos de abajo para compilar los nuevos
     módulos nativos: expo-haptics, react-native-view-shot, expo-sharing.
- ~~MEJORA F — Háptica (nativo, recompilar)~~ ✓ Código listo — pendiente EAS Build.
- Hecho: FASE A — Estructura pestaña Entrenamiento (JS, recarga):
  * Nueva pestaña "Entreno" (2.ª posición): icono mancuerna generado con sharp.
    Orden final: Hoy · Entreno · Historial · Progreso · Perfil.
  * src/app/training.tsx: pantalla completa del ciclo de entrenamiento.
    - Tarjeta de cabecera con plan info + botón "Regenerar plan" (con Alert).
    - Una tarjeta por día del ciclo, expandible al tocar.
    - Día activo resaltado con borde verde y badge "HOY"; se auto-expande al abrir.
    - Por ejercicio: nombre, series×reps, descanso, botón "Cambiar".
    - Indicador de días de descanso al final.
  * src/components/workout/TodayBanner.tsx: banner compacto en pantalla Hoy.
    Muestra "Hoy te toca: Empuje · Día 1 de 3" con botón "Ver →" que navega
    a la pestaña Entreno. Reemplaza WorkoutCard en index.tsx.
  * src/components/workout/ChangeExerciseModal.tsx: modal tipo pageSheet con
    lista de ejercicios alternativos filtrados por: misma categoría, músculos
    solapados y equipamiento compatible con el perfil del usuario. Al seleccionar
    uno, persiste el cambio en SQLite y actualiza el store.
  * workout.store.ts: StoredPlanDay ahora incluye dbId (clave primaria de
    plan_days). Nueva acción replaceExercise(dayDbId, exerciseIndex, newExId).
  * Migración 0006_rpe.sql: añade weight_target_kg (REAL) y perceived_effort
    (INTEGER/RPE 1-10) a session_sets. Sin UI todavía; estructura lista para FASE 9b.
  * Traducciones es/en/fr: claves tabs.training.* y workout.todayBanner.*.
- Hecho: FASE 9b — Sesión de entrenamiento en vivo (JS, recarga):
  * src/store/session.store.ts: Zustand in-memory store completo.
    - startSession(day): carga último peso de cada ejercicio desde DB (paralelo).
    - completeSet(): vibración + inicia temporizador de descanso automático.
    - addSet / removeSet / updateNote / replaceExercise.
    - finishSession(): guarda en workout_sessions + session_sets (weight_target_kg
      y perceived_effort=RIR). Usa columnas de migración 0006.
    - cancelSession(): limpia el store sin guardar.
    - tickRestTimer(): llamado cada segundo desde un setInterval en SessionScreen.
  * src/components/workout/ExerciseCard.tsx: tarjeta de ejercicio con placeholder
    de color por categoría (empuje/jalón/piernas), nombre, músculos, equipamiento
    y resumen "X series · R reps · P kg". Menú ⋯ → Cambiar ejercicio. Tap → guía.
  * src/app/exercise/[id].tsx: pantalla de detalle de ejercicio. Hero con icono
    grande, chips de categoría/dificultad/compuesto, músculos primarios/secundarios,
    equipamiento. Instrucciones: "próximamente".
  * src/app/training.tsx — REDISEÑO COMPLETO (PARTE 1):
    - Cabecera de plan (días/sem, min/sesión) + botón "Regenerar plan".
    - Cabecera del día activo con badge HOY, icono, nombre, ~min y total series.
    - Tarjetas ExerciseCard para cada ejercicio del día activo con último peso.
    - Botón grande verde "Iniciar entrenamiento" → startSession() + push /session.
    - Sección "Tu ciclo": días restantes como tarjetas condensadas expandibles
      que muestran ejercicios reales (con getExerciseName) y botón Cambiar.
    - ChangeExerciseModal integrado para cualquier día del ciclo.
    - Redirige automáticamente a /session si ya hay sesión activa al montar.
  * src/app/session.tsx — NUEVA PANTALLA (PARTE 2):
    - Header fijo: cronómetro (00:00:00, actualizado cada seg) + "Finalizar".
    - Carrusel horizontal de ejercicios (icono de categoría + nombre, 2 líneas).
      Se desplaza automáticamente al ejercicio actual.
    - Hero del ejercicio actual: icono grande en color de categoría + nombre +
      músculos + equipamiento.
    - Fila de acciones: Guía (→ /exercise/[id]), Intercambiar (ChangeExerciseModal),
      Historial (Alert con últimos reps/kg), Nota (TextInput inline).
    - Tabla de series: # | Reps | Kg | RIR | ✓
      * TextInput numérico para Reps y Kg, editables; RIR en ámbar.
      * ✓ = Pressable circular que marca serie completa (vibración + temporizador).
    - Temporizador de descanso: cuenta regresiva prominente en ámbar cuando corre;
      botón "Omitir". Botón "Descanso: Xs" para iniciar manualmente.
    - Botones + / - Serie. Navegación Anterior/Siguiente entre ejercicios.
    - Finalizar: Alert → finishSession() → recordWorkout() → advanceDayIndex() → back.
    - Cancelar / BackHandler Android: Alert → cancelSession() → back.
  * Gamificación integrada: recordWorkout(today) al finalizar sesión.
  * Progresión de cargas: pendiente (FASE C). Solo se guardan datos por ahora.
  * Traducciones es/en/fr: claves workout.session.* completas.
  * JS only — solo recarga en Expo Go / EAS Dev.
- Hecho: LOTE A+B — Mejoras sesión en vivo e historial (JS, recarga):
  * A1) history.tsx reescrita: consulta workout_sessions + session_sets con Drizzle;
    tarjetas expandibles con fecha localizada, duración, series completadas y
    lista de ejercicios. Se recarga al cambiar totalWorkouts (gamification store).
  * A2) SetRow: toggle checkmark (desmarcar serie ya marcada). Campos siempre
    editables, sin bloqueo por completed.
  * A3) handleFinish cuenta series incompletas; si pending > 0 muestra Alert de
    aviso con conteo antes de finalizar.
  * A4) Cabecera RIR con ícono "?" → Alert con explicación. Color dinámico:
    0-1=rojo, 2-3=verde, 4+=gris.
  * A5) Músculos y equipamiento traducidos via muscleLabel()/equipmentLabel().
  * A6) Botón Guía abre ExerciseGuideModal (Modal nativo) con hero, chips de
    músculos y equipamiento. No usa router.push (incompatible con overlay).
  * PARTE B) coachReason mostrado bajo cada fila de set (ámbar cursivo) cuando
    el algoritmo sugiere ajuste de peso/reps para la siguiente serie.
  * Nuevas claves i18n: finishIncompleteTitle, finishIncompleteMsg, rirHelpTitle,
    rirHelpBody en es/en/fr.
- Hecho: FASE C — Algoritmo de progresión de cargas (JS, recarga):
  * Migración 0007_progression.sql: tabla exercise_targets (plan_id + exercise_id
    únicos) con target_sets, target_reps_min, target_reps_max, target_weight_kg,
    target_rir, progression_reason, sessions_below_range, session_count.
  * src/lib/progression.ts: algoritmo puro + helpers DB.
    - computeNextTargets(): función PURA testeable, implementa doble progresión
      + RIR con 5 reglas:
      1. Calibración (sesión 1): fija el peso de trabajo real.
      2. Subir reps: en rango pero sin llegar al tope → +1 rep objetivo.
      3. Subir peso: tope en TODAS las series Y RIR ≥ objetivo → +2.5/2/4 kg
         (barra/mancuerna/kettlebell). Peso corporal → sugerir variación difícil.
      4. Mantener: tope al límite (RIR bajo) → consolidar sin subir.
      5. Bajar peso: 2 sesiones seguidas por debajo del mínimo → −10%.
    - estimateOneRepMax(kg, reps): Epley (peso × (1 + reps/30)).
    - runProgressionAfterSession(planId, exercises): guarda nuevos targets en
      exercise_targets; calcula 1RM por ejercicio; actualiza exercise_maxes si
      hay récord (PR); devuelve { hasPR }.
    - getExerciseTargetsForPlan(planId): carga todos los targets del plan activo.
  * session.store.ts actualizado:
    - startSession(planId, day): carga targets de exercise_targets para pre-rellenar
      peso/reps en la sesión; fallback a última sesión registrada.
    - ExerciseState: añadidos planRepsMin, planRepsMax, planSets (datos del plan).
    - finishSession(): llama runProgressionAfterSession() tras guardar; devuelve
      { hasPR } en vez de void.
  * session.tsx: si hasPR=true → unlockAchievement('personal_record').
  * training.tsx: carga exercise_targets del plan y los muestra en ExerciseCard:
    - Peso objetivo (del algoritmo) en lugar del último peso registrado.
    - Razón de progresión en texto ámbar cursiva bajo el resumen.
  * ExerciseCard.tsx: prop optional progressionReason (texto ámbar 11px).
- Hecho: LOTE G — Mejoras sesión, historial, coach y gamificación (JS, recarga):
  * §1 Descanso por tipo + ajustable: migración 0008 (exercise_rest_prefs). Descanso
    por defecto: 180s barra compuesto, 120s compuesto cargado, 90s compuesto PC, 60s
    aislamiento. Botones −15s/+15s en el timer de descanso y en el botón "Descanso:Xs".
    El ajuste se guarda en SQLite y se recupera en la siguiente sesión.
  * §2 Historial detallado: tarjetas expandibles con detalle por ejercicio ("3×10 · 40
    kg" o "4×12 · PC"), volumen total en ámbar, fecha completa con año, duración.
  * §3 Coach determinista: reescrito computeCoach. Para ejercicios cargados: siempre
    calcula con Epley y muestra razón si las reps se salen del rango o el RIR difiere;
    solo omite si el peso sugerido es igual al actual Y las reps están en rango. Para
    peso corporal: ajuste de reps cuando falla el mínimo o supera con RIR≥4.
  * §4 Intercambio + equipamiento de gimnasio: 16 nuevos ejercicios (polea/máquina)
    con equipment keys cableMachine y legPressMachine. Plan-generator ordena primero
    los ejercicios de gimnasio cuando isGym=true. ChangeExerciseModal muestra músculos
    y equipo traducidos; para gimnasio incluye todos los ejercicios del mismo grupo.
  * §5 Recap mejorado: consulta volumen total del período (Σ series×reps×peso). Si no
    hay registros de peso, muestra "Registra tu peso" en lugar de "—". Tarjeta extra
    de volumen total.
  * §6 Tarjeta de logro (overlay): gamification.store tiene celebrationQueue[]. Al
    desbloquear un logro se encola. AchievementCelebrationOverlay (nuevo componente)
    lee la cola y muestra un overlay con animación de entrada, chispas ámbar y auto-
    dismiss a los 3.5 s. Logros múltiples se encadenan. Está encima de todo en layout.
  * §7 Sonido/vibración: pendiente EAS Build (ver abajo).
- Hecho: LOTE H — Ejercicios de gimnasio + coach + descanso escribible (JS, recarga):
  * §A Bug isGym: plan-generator.ts, session.tsx y training.tsx usaban solo
    location==='gym'. Corregido a location==='gym' || location==='both'. Ahora
    los usuarios con "ambos" ven ejercicios de cable/máquina en su plan y en
    ChangeExerciseModal.
  * §B computeCoach bodyweight corregido:
    - Eliminado mensaje "mantén X" (no aplica a peso corporal).
    - Nueva lógica: bajo mínimo → apunta a safeTarget; al tope o por encima →
      "Te quedó fácil → prueba variante difícil" (RIR≥2) o "progresando bien"
      (RIR<2). Se cubre el hueco donde RIR 3 antes caía a null sin mensaje.
    - completeSet: siempre limpia coachReason en la siguiente serie aunque hint
      sea null, para evitar mensajes obsoletos de series anteriores.
  * §C Descanso escribible: área de descanso idle rediseñada. El tiempo en
    segundos es un TextInput ámbar editable directamente. Botón ▶ a la derecha
    inicia el timer. ±15s siguen como ajuste rápido. El valor se persiste por
    ejercicio en SQLite (mismo mecanismo que §1 del LOTE G).
- Hecho: LOTE I — Sesión en vivo, coach y detalle de ejercicio (JS, recarga):
  * §1 Reps por defecto: getEffectiveReps en plan-generator.ts solo permite esquemas
    de fuerza bajos (3-5) en barra con discos (BARBELL_EQUIP). Máquina/mancuerna/
    cable/kettlebell siempre arrancan en 8-12. startSession aplica effMin/effMax y
    usa el punto medio (~10) como valor inicial cuando no hay datos de progresión.
  * §2 Calibración: banner ámbar "Pon tu peso de partida / El coach ajustará las
    siguientes series" cuando el ejercicio cargado no tiene historial (lastWeightKg=null).
  * §3 Descanso visible: restEditInput ensanchado de 56→72px para que "180" quepa.
  * §4 Coach mejorado: rir default buildSetState 2→3 (más neutro). Dos mejoras en
    computeCoach cargado: (a) cap 30% en vez de 15% cuando reps > 1.3×planRepsMax y
    RIR≥3 (salto más decidido); (b) dentro del rango con RIR≥4 → sugiere +1 incremento
    aunque el peso calculado coincida. El RIR mostrado en el mensaje es siempre el que
    el usuario introdujo.
  * §5 Recap: eliminada la tarjeta "Volumen total" (confusa). El grid pasa de 5 a 4
    tarjetas: Entrenamientos, Racha, Cambio de peso, Logros.
  * §6 Evolución por ejercicio (exercise/[id].tsx): si el ejercicio tiene historial,
    muestra: etiqueta del gráfico (1RM estimado Epley para cargados, reps para peso
    corporal), mini-gráfica de tendencia (SimpleLineChart, ≥2 sesiones), lista de las
    últimas 6 sesiones con fecha localizada + mejor serie + badge "★ PR" dorado.
    Respeta sistema de unidades (kg/lb).
- Hecho: correcciones post-LOTE I (sesión 2026-06-22, JS, recarga):
  * restEditInput.height 36→44 px + textAlignVertical:'center' en session.tsx:
    el número de segundos en modo edición ya no se corta por arriba/abajo.
  * computeCoach — piso mínimo garantizado (session.store.ts):
    - Bug: Epley con pesos bajos y pocas reps redondeaba al mismo peso actual.
    - Fix: si done.rir>=3 && suggested<=done.weightKg → forzar subida proporcional
      al RIR: 3-4→+1 inc, 5-6→+2 inc, 7+→+3 inc.
    - Mensajes reescritos con peso DESTINO explícito ("sube a 12 kg", no "↑ 8 kg").
    - Auto-relleno de reps+kg en la siguiente serie siempre trae un peso mayor
      al actual cuando la serie fue fácil.
- Hecho: FASE E-1 — "Mi equipamiento" en Ajustes (JS, recarga):
  * profile.store.ts: nueva acción updateEquipmentAndLocation(location, equipment)
    que actualiza profile.location + profile.equipment en SQLite y en el store.
  * src/app/equipment.tsx: pantalla nueva con misma UI que StepLocation.
    - Selector de ubicación (home/gym/both) + lista de casillas para casa/ambos.
    - 'bodyweight' se muestra pero su valor es cosmético (los ejercicios PC tienen
      equipment:[] y siempre están disponibles, independientemente de esta casilla).
    - Al cambiar a gym, borra el equipamiento (igual que StepLocation).
    - Botón "Guardar" activo solo si hubo cambios; al guardar ofrece regenerar el plan.
  * profile.tsx: sección Equipamiento siempre visible con botón "Editar equipamiento".
    Gym users ven la nota "Equipamiento completo"; home/both ven sus chips.
  * Traducciones es/en/fr: claves equipment.title/editBtn/regenTitle/regenMsg/regenYes/regenNo.
- Hecho: FASE E-2 — "¿Dónde entrenas hoy?" — pregunta de contexto (JS, recarga):
  * session.store.ts: trainingContext: 'gym' | 'home' | null + setTrainingContext().
    Se limpia automáticamente al finalizar o cancelar sesión (vía EMPTY_STATE).
  * training.tsx: handleStart() intercepta el flujo para usuarios con
    location==='both'. Muestra Alert con opciones "Gimnasio / En casa" antes de
    llamar a startSession(). Para solo-gym o solo-casa, arranca directo sin Alert.
    setTrainingContext() se llama ANTES de startSession().
  * session.tsx: badge discreto (icono + texto) en la barra de header cuando
    trainingContext no es null. Visible solo para usuarios "ambos".
  * Traducciones es/en/fr: claves workout.session.whereTitle/whereMsg/whereGym/whereHome.
- Hecho: FASE E-3 — Filtro ligero de ejercicios en sesión (JS, recarga):
  * exercises.ts: exportadas getAlternatives() y canDoAtHome() como funciones
    compartidas. ChangeExerciseModal ya no define su propia copia local.
  * training.tsx: doStartSession() aplica el filtro cuando context==='home':
    - Por cada ejercicio del plan, comprueba canDoAtHome(id, homeEquipment).
    - Si no está disponible en casa: busca la mejor alternativa con
      getAlternatives(id, homeEquipment, false) (mismo grupo muscular, mismo equipo).
    - Si hay alternativa: reemplaza el exerciseId silenciosamente.
    - Si no hay alternativa: mantiene el original y, tras startSession(), añade
      una nota "Sin equivalente en casa" al ejercicio (visible en la sesión).
    - Para context==='gym' o null: plan sin cambios.
  * Traducciones es/en/fr: clave workout.session.noHomeAlt.
- Hecho: LOTE UI — Componentes propios Vulcan (JS, recarga) — PASO 1 completado:
  * src/components/ui/VulcanBottomSheet.tsx: hoja genérica que sube desde abajo.
    Animación spring con React Native Animated (NO Reanimated), fondo oscurecido
    con fade, opción activa marcada en verde esmeralda con tick, botón cancelar al pie.
    Props: visible, onClose, onSelect, options (SheetOption<T>), selectedValue, title, cancelLabel.
    Genérico T extends string | number — sirve para cualquier lista de opciones.
  * src/components/ui/VulcanDialog.tsx: diálogo centrado propio.
    Entrada con scale + opacity con React Native Animated (NO Reanimated). Botón
    confirmar en esmeralda o ámbar si destructive=true. Props: visible, onClose,
    title, message, confirmLabel, onConfirm, cancelLabel, destructive.
  * StepSchedule.tsx: selector de días por semana migrado a VulcanBottomSheet.
    Selector de minutos sigue en Picker nativo (se migrará en PASO 2 tras validación).
  * PASO 2 completado: VulcanBottomSheet/VulcanDialog propagados a:
    - StepSchedule.tsx: minutesPerSession migrado (Picker nativo eliminado).
    - training.tsx: "¿Dónde entrenas hoy?" → VulcanBottomSheet; "¿Regenerar plan?" → VulcanDialog.
    - session.tsx: "¿Finalizar?" / "¿Finalizar sin completar?" / "¿Cancelar sesión?" → VulcanDialog.
    - Corregido bug TypeScript pre-existente: justifyContent duplicado en restBox (session.tsx).
    - Corregido absoluteFillObject → absoluteFill en AchievementCelebrationOverlay.tsx.
- Hecho: BUG — crash Reanimated "invalidTransform" + martillo estático (JS, recarga):
  * Causa raíz del crash: VulcanSplash.tsx usaba strings SVG en useAnimatedProps
    (`rotate(angle, cx, cy)`, `scale(...)`). Reanimated 4 los pasaba por processTransform
    en worklet → ERROR_MESSAGES.invalidTransform. Fix intermedio (commit 72bf868):
    cambió a `{ rotation: hammerRot.value }` + originX/originY como JSX props.
  * Causa raíz del martillo estático (diagnosticada con HAMMER_ANIM_AUDIT.md):
    La prop shorthand `rotation` de react-native-svg requiere procesamiento en el hilo JS
    para convertirse en transform matrix; Reanimated la actualiza en la UI thread, saltándose
    ese procesamiento → nodo nativo nunca recibe el transform → martillo siempre en -42°.
  * Fix definitivo (sesión 2026-06-30): hammerProps usa transform array RN/CSS con
    patrón translate→rotate→translate para codificar el pivote (121,60):
    `transform: [{ translateX:121 },{ translateY:60 },{ rotate:\`${hammerRot.value}deg\` },{ translateX:-121 },{ translateY:-60 }]`
    Eliminadas originX/originY del JSX (ya no se usan). Sin recompilación.
- Hecho: BUG — tira de ejercicios en sesión (JS, recarga):
  * Ítem activo se estiraba a toda la altura de la FlatList (alignItems:'stretch' por defecto).
    Fix: height:90 en carouselItem (todos los ítems, no en la FlatList), alignItems:'flex-start'
    en el contentContainerStyle del carrusel, flexShrink:0 en la FlatList.
  * Nombres truncados con "...": añadido adjustsFontSizeToFit + minimumFontScale={0.75} en
    el ThemedText del carrusel.
  * Hueco grande entre tira y tarjeta del ejercicio: eliminado bodyScroll:{ flex:1 } del
    ScrollView (causaba reparto elástico de espacio). Añadido paddingTop:8 en body
    contentContainerStyle para una separación fija y compacta de 8 px.
- Hecho: BUG E-3 — sustitutos repetidos en sesión de casa (JS, recarga):
  * Causa raíz: doStartSession usaba alts[0] para CADA ejercicio sin llevar registro de
    qué sustitutos ya se habían asignado → varios ejercicios de gym (barbell + cable + máquina)
    mapeaban al mismo sustituto (push_up, pike_push_up), que aparecía hasta 3 veces.
  * Fix en training.tsx doStartSession (contexto 'home'):
    1. Map<string,number> usageCount que pre-cuenta los ejercicios que ya pasan canDoAtHome.
    2. Al sustituir: busca primero alternativa con usageCount < 2 (solapamiento muscular).
    3. Si todas al límite: búsqueda ampliada — cualquier ejercicio de casa de la misma
       categoría con usageCount < 2 (evita la 3.ª repetición forzada).
    4. Último recurso: la menos usada de las alternativas primarias.
    5. Resultado típico: Flexión ×2, Flexión en pica ×2, Flexión estrecha ×1 — ninguna ×3.
  * Diagnóstico aceptado y síntoma A descartado como bug (barra en equipamiento casa = correcto).
  * Síntoma C (historial) era consecuencia de B; al eliminar duplicados, el historial
    queda consistente sin cambios adicionales.
- Hecho: sesión 2026-06-30 — Splash screen polish + animación martillo (JS, recarga):
  * letterSpacing ajustado:
    - VulcanSplash "Vulcan": 1.5 → 0.75 (menos extendido).
    - 4 pantallas de auth "VULCAN" (LoginForm, RegisterForm, PaywallScreen,
      VerifyEmailScreen): 10 → 3 en cada una (independientes, sin componente compartido).
  * Auditoría de la animación en HAMMER_ANIM_AUDIT.md (solo lectura):
    diagnóstico completo del historial git, causa raíz del martillo estático y
    las chispas pequeñas.
  * Fix rotación martillo: transform array RN/CSS con pivote (121,60) codificado
    mediante translate→rotate→translate-back. Ver entrada BUG arriba.
  * Modo debug temporal en VulcanSplash.tsx (un solo flag para revertir):
    - `export const DEBUG_SPLASH = true` → splash siempre visible + SPLASH_SLOWMO=3
      (×3 duraciones del martillo; chispas y barra sin cambio).
    - _layout.tsx: `stillLoading = DEBUG_SPLASH || ...` para bloquear el descarte.
    - `const DEBUG_SPARK_POS = true` → Circle rojo r=4 en (180,111) como marcador fijo.
  * Chispas mejoradas:
    - Posición del grupo: translate(165,107) → translate(180,111), alineado con golpe.
    - Marcador rojo actualizado a (180,111).
    - SPARK_SIZE: 1.6 → 2.0 (escala estática envolviendo líneas/círculos).
    - Sincronización con el golpe (455ms): sparkOp espera 420ms, flash en 35ms,
      apagado en 240ms, silencio 605ms (total 1300ms). sparkScale expande en el impacto.
    - 12 elementos nuevos (8 Line + 4 Circle) con rojos cálidos: #E8743B, #D9542B,
      #F2934A, distribuidos en el mismo rango ±24 unidades. Total: 40 elementos.
  ⚠️ DEBUG_SPLASH=true y DEBUG_SPARK_POS=true están ACTIVOS. Cambiar ambos a false
     antes de cualquier build de producción o release.
- Hecho: sesión 2026-07-02 — Historial + gating de logros/racha (JS, recarga):
  * FIX historial — ejercicios "Sin completar": `history.tsx` `loadDetails()`
    ahora filtra `.filter(d => d.sets.some(s => s.completed))` al construir
    `details`, así un ejercicio solo aparece en el desplegable si tuvo al
    menos una serie marcada como completada. No cambia cómo se insertan las
    series en SQLite (eso sigue guardando todas, completadas o no).
  * REFACTOR — separación logros (100%) vs. racha/contador visible (≥50%):
    - `session.store.ts` `finishSession()`: además de `hasPR`, ahora devuelve
      `completedSets` (series reales marcadas completed en toda la sesión) y
      `plannedSets` (suma de `ex.planSets` del plan original — NO de las
      series en vivo, para no penalizar sets añadidos con el botón "+ Serie").
    - `session.tsx` `doFinish()`: calcula `ratio = completedSets/plannedSets`.
      Solo llama a `recordWorkout(today, { perfect })` si `ratio >= 0.5`
      (antes era incondicional). `perfect = completedSets >= plannedSets`
      (>=, no ===, para cubrir series extra completadas por encima del plan).
      `advanceDayIndex()` sigue siendo incondicional, sin cambios.
    - `gamification.store.ts`: nuevo campo `perfectWorkouts` (persistido en
      `gamification_meta` con clave `perfect_workouts`, cargado en
      `loadGamification()`, reseteado en `resetAll()`). `recordWorkout(date,
      { perfect })` sigue subiendo `totalWorkouts` con cualquier llamada
      (contador de esfuerzo visible, StreakWidget/RecapModal) y `streak` con
      la misma lógica de siempre; `perfectWorkouts` solo sube si
      `perfect === true`. Los 4 logros por contador (`first_spark`,
      `apprentice`, `journeyman`, `master`) ahora usan `newPerfectTotal` en
      vez de `newTotal`. `incandescent` (racha≥7) y `tempered_steel`
      (racha≥30) sin cambios, siguen usando `newStreak`.
    - Verificado: `recordWorkout(` solo se llama desde `doFinish()` en todo
      el proyecto — sin otros call sites que romper.
  * FIX raíz — historial no se refrescaba tras sesión <50%: causa era que
    `history.tsx` recargaba `workout_sessions` en un `useEffect` cuya única
    dependencia real era `totalWorkouts` (de `useGamificationStore`), un
    acoplamiento accidental que solo funcionaba porque antes de este refactor
    `recordWorkout()` era incondicional. Reemplazado por
    `useFocusEffect(useCallback(() => {...}, [isDbReady]))` importado de
    `expo-router` (NO `@react-navigation/native`, que no está instalado en
    el proyecto — `expo-router` lo re-exporta y es el patrón que ya usan
    `useRouter`/`Link`/`Redirect` en el resto del código). El historial ahora
    se recarga cada vez que la pestaña Historial recibe el foco, sin depender
    de ningún store externo. `isDbReady` sigue como guard interno.
  * Auditoría completa del diagnóstico previo (incl. el hallazgo de que
    `advanceDayIndex()` — incondicional — habría sido una señal de refresco
    más fiable que nunca se conectó) documentada en
    `ACHIEVEMENTS_EQUIPMENT_AUDIT.md`, SECCIÓN 6.
  * Todo el lote es JS puro, sin módulos nativos — solo recarga.
- Hecho: sesión 2026-07-03 — Robustez plan + gating de logros/racha (JS, recarga):
  * `generateAndSavePlan()` (`workout.store.ts`) reordenado para no dejar nunca
    al usuario sin plan activo: genera el plan en memoria antes de tocar la
    DB; inserta el plan nuevo SIN desactivar los viejos; si falla cualquier
    parte de la inserción, limpia solo lo que el propio intento nuevo llegó a
    crear (con `generatedAt` como respaldo si el `select` posterior al insert
    fallara y `savedPlan` quedara `null`) y relanza el error; solo desactiva
    los planes anteriores (`ne(workoutPlans.id, savedPlan.id)`) tras verificar
    éxito completo. `equipment.tsx` ya no traga el error de regeneración en
    silencio — lo loguea con `console.error`.
- Hecho: sesión 2026-07-03 — Aviso de cobertura espalda/bíceps por equipamiento
  (JS, recarga):
  * Bug de cobertura E-3 corregido: `handleStart()` (`training.tsx`) ahora
    pasa `context='home'` también para `profile.location==='home'` puro (antes
    solo lo hacía para `'both'`), activando el filtro en vivo para todos los
    usuarios que entrenan en casa.
  * Nuevo `src/lib/pullBicepCoverage.ts`: `getBackEnablingKeys()` /
    `getBicepEnablingKeys()` / `getPullCoverage()` — derivan dinámicamente del
    catálogo (`EXERCISES`) qué `EquipmentKey` destraban ejercicios compuestos
    de categoría `pull` o ejercicios que trabajan bíceps. Sin listas
    hardcodeadas.
  * Banners ámbar (icono `information-circle-outline`, fondo `AMBER+'14'`,
    borde izquierdo ámbar) con 3 variantes de mensaje según falte espalda,
    bíceps o ambos, en 4 puntos:
    - `StepLocation.tsx` (onboarding, paso equipamiento) y `equipment.tsx`
      (Ajustes): heurística estática sobre `profile.equipment`, con cláusula
      extra "esto solo afecta tus días en casa" cuando `location==='both'`.
    - `training.tsx` (día activo del ciclo): heurística exacta cruzando
      `today.exercises` contra el catálogo (`category==='pull' && isCompound`,
      `primaryMuscles.includes('biceps')`), solo para `dayType` `pull`/`upper`.
    - `session.tsx` (sesión en vivo): misma heurística que `training.tsx`
      pero sobre los ejercicios YA sustituidos por el filtro E-3, y solo
      cuando `trainingContext==='home'` (cruza `planDayId` contra
      `useWorkoutStore().currentPlan.days` para obtener el `dayType`, ya que
      `ExerciseState` no lo guarda).
    - Claves i18n nuevas es/en/fr: `onboarding.location.noBackVarietyNote` /
      `noBicepWorkNote` / `noBackVarietyOrBicepNote` / `homeDaysQualifier`,
      y `workout.today.noBackVariety` / `noBicepWork` / `noBackVarietyOrBicep`
      / `homeEmptyDay`.
  * FIX de fuga real (no solo aviso): en `doStartSession()` (`training.tsx`),
    cuando un ejercicio no es realizable en casa y `getAlternatives()` no
    encuentra ningún sustituto (ej. "Curl de bíceps" con `equipment:
    ['bodyweight']` — no existe ejercicio de bíceps sin equipo en el
    catálogo), el ejercicio ahora se **excluye** del día (antes se dejaba
    pasar sin cambios con solo una nota de texto — ver
    `EQUIPMENT_LEAK_AUDIT.md`). Eliminados el mecanismo `noAltIndices` +
    `updateNote(...)` y la clave i18n `workout.session.noHomeAlt` (sin otros
    usos en el proyecto). Salvaguarda añadida: si tras filtrar un día queda
    con 0 ejercicios, no se arranca la sesión — se muestra
    `workout.today.homeEmptyDay` en el diálogo de error ya existente de
    `training.tsx` y el usuario se queda en esa pantalla en vez de entrar a
    una sesión en blanco (antes se habría quedado atascado en un
    "Cargando…" sin salida, `session.tsx:330-338`).
  * Documentado en `E3_HOME_FILTER_AUDIT.md`, `PULL_EQUIPMENT_WARNING_AUDIT.md`
    y `EQUIPMENT_LEAK_AUDIT.md` (auditorías de solo lectura, en la raíz).
- Hecho: sesión 2026-07-06 — Auditorías de catálogo + mini-proyecto de expansión
  del catálogo de ejercicios (Lotes 2-11), JS puro, sin recompilación:
  * Auditorías de solo lectura (raíz del proyecto, sin modificar código):
    `CATALOG_COMPLETENESS_AUDIT.md` (inventario completo por equipo/músculo;
    huecos sin equipo confirmados: bíceps/dorsal ya conocidos + trapecio,
    antebrazo, isquios y pantorrilla como hallazgos nuevos; "aductores" no
    existía ni como `MuscleGroup`) y `MUSCLEGROUP_IMPACT_AUDIT.md` (sin ningún
    `Record<MuscleGroup,...>` exhaustivo en el proyecto, a diferencia de
    `ExerciseCategory`; `muscleLabel()` es la única función de traducción de
    músculos, `ExerciseCard.tsx`, y vive fuera del sistema i18next).
  * `src/lib/exercises.ts` creció de 81 a **279 ejercicios** en 10 lotes
    temáticos: cardio (gym+casa), movilidad-calentamiento, movilidad-
    enfriamiento, core con equipo, TRX/anillas/paralelas de fuerza,
    kettlebells de empuje, isquios/pantorrilla/prensa/antebrazo/trapecio,
    aductores, chaleco lastrado, y máquinas de gimnasio faltantes + 1
    corrección estructural.
  * Tipos ampliados:
    - `ExerciseCategory`: + `'mobility'` (`'cardio'` ya existía, solo
      infrautilizado — 1 ejercicio).
    - `Exercise`: + `isTimeBased?`, `defaultDurationSeconds?`,
      `movementPhase?: 'warmup'|'cooldown'|'both'`,
      `relevantDayTypes?: DayType[]` (import `type` de `plan-generator.ts`;
      sin ciclo real en runtime al ser type-only).
    - `MuscleGroup`: + `'adductors'`, con su entrada añadida en
      `MUSCLE_LABELS` (`ExerciseCard.tsx`) en el mismo lote que la introdujo
      (cierra el hueco silencioso que había detectado el audit).
    - `EquipmentKey`: 21 → **34** (+ cardioMachine, calfMachine,
      hipAdductorMachine, smithMachine, assistedMachine, abMachine,
      hipAbductorMachine, pecDeckMachine, tBarRowMachine, hipThrustMachine,
      chestPressMachine, shoulderPressMachine, seatedRowMachine). Ninguna
      añadida a `HOME_EQUIPMENT` — todas implícitas de gimnasio, igual que
      `cableMachine`/`legPressMachine`.
  * Verificado y reconfirmado en cada lote (no una sola vez): `'cardio'` y
    `'mobility'` quedan excluidos de la generación de días de fuerza en
    `plan-generator.ts` por las whitelists ya existentes (`allIso` en días
    `full_body`; `cats` derivado de `DayType`, que nunca vale `'cardio'` ni
    `'mobility'`, en el resto). **`plan-generator.ts` no fue tocado en ningún
    lote (2 al 11)** — confirmado con `git diff --quiet` al cierre de cada uno.
  * Hallazgos relevantes detectados durante el proceso (preexistentes o
    corregidos sobre la marcha, no bugs introducidos por estos lotes):
    - `mountain_climber` (catálogo original, Fase 9a) es el único
      `category:'core'` con `isCompound:true` — alcanzable hoy solo en días
      `lower` (splits de 4-5 días/semana) como "compuesto" de pierna, con el
      esquema de sets/reps pesado. Señalado, no corregido (fuera de alcance
      de este mini-proyecto).
    - `leg_press` ya existía en el catálogo original bajo `legPressMachine`
      — el Lote 8 lo detectó antes de duplicarlo y solo añadió el accesorio
      nuevo (`leg_press_calf_press`).
    - Corrección estructural (Lote 11): `machine_chest_press`,
      `machine_overhead_press` y `machine_row` estaban mal etiquetados con
      `equipment:['cableMachine']` (son máquinas selectorizadas dedicadas,
      no polea) → recategorizados a `chestPressMachine`/
      `shoulderPressMachine`/`seatedRowMachine` respectivamente.
    - Huecos silenciosos de `EQUIPMENT_SHORT` (`ExerciseCard.tsx`) detectados
      y cerrados: `cardioMachine`, `calfMachine`, `hipAdductorMachine`, y las
      10 máquinas del Lote 11.
    - `heel_dig_isometric_hold` (Lote 8): ajuste posterior para añadirle
      `isTimeBased:true, defaultDurationSeconds:20`, que faltaba en la
      especificación original del lote.
  * Verificado en cada lote: `sort | uniq -d` sobre todos los IDs del
    catálogo (sin duplicados en ningún punto) y `npx tsc --noEmit` limpio.
  * Pendiente sin resolver, anotado para retomar:
    - `EQUIPMENT_SHORT.weightedVest` sigue diciendo "Chaleco" (no "Chaleco
      lastrado" como se sugirió en el Lote 10) — a la espera de confirmación.
    - Los ~198 ejercicios nuevos (cardio, movilidad, core con equipo, TRX/
      anillas/paralelas de fuerza, kettlebells de empuje, aductores, chaleco
      lastrado, máquinas de gimnasio) **no son alcanzables todavía desde
      ningún flujo de la app** (generación de plan, sustitución de
      ejercicios) — el catálogo de datos está completo pero no conectado a
      la UI/generador. Conectarlo es trabajo futuro, fuera de este
      mini-proyecto (que era solo de catálogo de datos).
- Hecho: sesión 2026-07-07 — FASE 0-A completa: generador de planes reescrito
  para elegir ejercicios por músculo objetivo en vez de por categoría+ronda
  fija, ya conectado de verdad a `generatePlan()`. Trabajo por sub-pasos,
  cada uno auditado y verificado antes de seguir (ver `LOTE11_REACHABILITY_AUDIT.md`,
  secciones 1-12, para el rastro completo de diagnóstico que motivó esta fase
  y toda la evidencia de verificación).
  * **Sub-paso 1 — esquema y objetivos musculares**:
    - Migración manual `0009_muscle_exercise_usage.sql` (tabla
      `muscle_exercise_usage`: `muscle`+`exercise_id` como clave primaria
      compuesta, `used_at`) siguiendo el mismo patrón manual que 0001-0008
      (`drizzle-kit generate` no es viable hoy — falla en modo no interactivo
      por el drift de snapshots desde la migración 0000; confirmado
      intentándolo). Bug real encontrado y corregido en el propio proceso:
      el `when` de cada entrada de `_journal.json` es funcional (decide si
      una migración se aplica, comparándose contra el máximo ya registrado
      en el dispositivo, no contra la de índice más alto) — documentado como
      regla nueva en "Reglas de trabajo".
    - `src/lib/muscleTargets.ts`: `MuscleTarget` (key, muscleGroups,
      bonusPriority, maxSlots opcional, `sourceCategory`) + `PUSH_TARGETS`/
      `PULL_TARGETS`/`LEGS_TARGETS`/`FULL_BODY_TARGETS` + `getTargetsForDayType()`.
    - `src/lib/muscleUsage.ts`: `getUsedExerciseIds`/`markExerciseUsed`/
      `resetMuscleCycle` sobre la tabla nueva (rotación persistente entre
      semanas, separada del `excludeIds` de una sola generación).
  * **Sub-paso 2 — algoritmo por músculo, validado en aislamiento**:
    `src/lib/muscleBasedSelection.ts` — `selectExercisesForDayByMuscle()`,
    dos pasadas: (1) mínimo garantizado por target consumiendo presupuesto
    TOTAL combinado (compuestos+aislamientos, con cruce de bolsa si hace
    falta); (2) bonos con lo que sobre (compuesto: orden fijo cíclico
    pecho→espalda→cuádriceps→isquiotibiales; aislamiento: por prioridad,
    respetando topes). Tope general de 3 ejercicios por target
    (`MAX_EXERCISES_PER_TARGET`) salvo `maxSlots` propio (antebrazo=1). Solo
    categorías `push`/`pull`/`legs`/`core` (cardio/mobility/full_body
    excluidos siempre). Probado con `scripts/test-muscle-selection.ts` (8
    escenarios) contra una BD SQLite real en memoria (`scripts/test-support/`,
    vía `node:sqlite` + `drizzle-orm/sqlite-proxy`, porque `expo-sqlite` no
    puede cargarse fuera del runtime de Expo).
  * **Sub-paso 3 — conexión real a `plan-generator.ts`** (primera vez que se
    tocó ese archivo en toda la sesión): `selectExercisesForDay()` reescrito
    para delegar en `selectExercisesForDayByMuscle()`; `generatePlan()` ahora
    es secuencial (`for...of` + `await`, no `Promise.all`) con un
    `Set<string>` de ejercicios ya usados en la semana (`excludeIds`) que
    garantiza variedad real entre días del mismo tipo (antes dependía de
    `offset`+orden del catálogo, ver auditoría secciones 6-9). Eliminados
    `GYM_EQUIP_PRIORITY`, `sortGymFirst`, `safePick` (confirmado sin otros
    usos). `canDoExercise` ahora exportada. `workout.store.ts:112` con
    `await`. Verificado con `scripts/test-full-plan-generation.ts` (plan real
    de 4 días y de 3 días).
  * **Corrección de datos + alineación por categoría** (post-auditoría
    sección 12): 5 ejercicios tenían `category` mal puesta desde su creación
    (`wrist_curl_db`/`reverse_wrist_curl_db`/`plate_pinch_hold`/`zottman_curl`:
    `core`→`pull`; `copenhagen_plank`: `core`→`legs`). Además, el algoritmo
    por músculo no restringía por `category` del día (solo por
    `primaryMuscles`), dejando colar ejercicios de una categoría en el día
    equivocado (ej. `ytw_prone`, `category:'pull'`, elegido para el target
    `hombros` en un día `push`). Corregido en `muscleBasedSelection.ts`
    (`allowedCategoriesFor(dayType, target)`) usando el campo nuevo
    `sourceCategory` en `MuscleTarget` (de qué lista viene cada target —
    nunca adivinado por nombre). Ningún target perdió cobertura tras el
    ajuste en los 10 escenarios de prueba; el único efecto real fue un día
    `push` con equipamiento mínimo (`mat`) pasando de 4 a 3 ejercicios (el
    target seguía cubierto por otro ejercicio ya elegible).
  * Todo JS puro — sin módulos nativos, no requiere recompilar. `npx tsc
    --noEmit` limpio en cada paso. Los dos scripts de prueba
    (`scripts/test-muscle-selection.ts`, `scripts/test-full-plan-generation.ts`)
    quedan en el repo como regresión rápida para la próxima sesión.
  * Pendiente para retomar (Fase 0-B o siguiente):
    - `markExerciseUsed()` NO se llama todavía desde ningún flujo real — la
      tabla `muscle_exercise_usage` existe y se lee, pero nadie escribe en
      ella todavía en producción. Falta conectarla a `finishSession()` (ver
      nota en Sub-paso 1 original) para que la rotación persistente entre
      semanas empiece a funcionar de verdad.
    - `console.log('[muscleBasedSelection] compoundLeft...')` en
      `muscleBasedSelection.ts` es instrumentación de depuración añadida a
      petición durante las pruebas — sigue activa, no se ha limpiado.
    - Auditoría completa de los 19 ejercicios con cruce `category`/músculo
      "intuitivo" detectados (sección 12 del audit): solo se corrigieron los
      5 sin justificación (grupos c/d del audit); los otros 14 (deadlifts,
      face pulls, etc., grupos a/b) se dejaron como están por tener
      justificación real de programación (ver audit para el detalle).
- Hecho: sesión 2026-07-08 — conexión de `markExerciseUsed()` a `finishSession()`
  (JS, recarga): cierra el hilo suelto que había quedado pendiente de la Fase
  0-A. En `session.store.ts` `finishSession()`, justo después de guardar
  `sessionSets` y antes del bloque de progresión/PR, un recorrido paralelo por
  `exercises` llama a `markExerciseUsed(exercise)` (buscado en `EXERCISES` por
  `exerciseId`) para cada ejercicio con al menos una serie completada
  (`ex.sets.some(s => s.completed)` — mismo criterio de siempre, sin gating
  por el ratio de logros/racha). Envuelto en su propio try/catch con
  `console.error` para que un fallo aquí nunca rompa el guardado de la sesión.
  Ejercicio no encontrado en catálogo → se salta sin fallar. Verificado con
  `git diff` que `hasPR`/`completedSets`/`plannedSets`/`runProgressionAfterSession`
  no cambiaron ni una línea. La rotación persistente de `muscle_exercise_usage`
  entre semanas ya funciona de verdad en producción.
- Hecho: sesión 2026-07-08 — UI de cierre de semana (JS, recarga):
  * `gamification.store.ts`: nuevo campo `daysTrainedThisWeek` (persistido en
    `gamification_meta` con clave `days_trained_this_week`, mismo patrón que
    `perfectWorkouts`). Nuevas acciones `incrementDaysTrainedThisWeek()` /
    `resetDaysTrainedThisWeek()`. Añadido también a `resetAll()` para que el
    store en memoria no quede con un valor obsoleto tras un borrado completo.
  * `session.tsx` `doFinish()`: dentro del mismo bloque `if (ratio >= 0.5)` que
    ya llama a `recordWorkout()`, ahora también llama a
    `incrementDaysTrainedThisWeek()` — mismo criterio del 50%, sin duplicar el
    cálculo del ratio.
  * `workout.store.ts` `generateAndSavePlan()`: justo después de
    `saveActiveDayIndex(0)`, llama a
    `useGamificationStore.getState().resetDaysTrainedThisWeek()` — cada plan
    nuevo arranca la semana en 0 días entrenados.
  * `training.tsx`: `weekComplete = daysTrainedThisWeek >= currentPlan.days.length`.
    Si es `true`, sustituye "Tu ciclo" + tarjeta del día + ejercicios por una
    vista "¡Semana completada! 🎉" con botón "Generar entrenamiento de la
    próxima semana" (mismo patrón `generateAndSavePlan(profile)` que
    `equipment.tsx`). Enlace discreto "¿Prefieres empezar de cero? Generar
    semana nueva" SIEMPRE visible (esté o no completa la semana), con
    `VulcanDialog` de confirmación destructivo antes de regenerar. Ambos
    disparadores de regeneración (botón principal y enlace) quedaron
    protegidos contra doble disparo: el enlace tiene `disabled={isGenerating}`
    + estilo atenuado, y su `onConfirm` tiene un guard `if (isGenerating)
    return;` adicional (bug real detectado y corregido — el enlace no
    comprobaba `isGenerating` en la versión original).
  * Traducciones es/en/fr añadidas bajo `tabs.training.weekComplete.*` y
    `tabs.training.resetWeek.*`.
  * Verificado en cada paso: `npx tsc --noEmit` limpio y `git diff` confirma
    que ninguna línea de la lógica de logros/racha/PR (`recordWorkout`,
    `hasPR`, `ratio`, `perfect`, los `autoUnlock(...)`) cambió — solo
    adiciones.
- Hecho: sesión 2026-07-08 — FASE 1b Paso 1: generador de calentamiento,
  construido y probado en aislamiento (JS, recarga):
  * `src/lib/warmupGenerator.ts`: `generateWarmup(dayType, equipment, isGym,
    totalMinutes)` — apertura de cardio fija (180s máquina en gym / 60s
    bodyweight en casa, ignora el `defaultDurationSeconds` original de esos
    ejercicios) + relleno de movilidad. Pool de movilidad:
    `category==='mobility'` y `movementPhase` `warmup`/`both` (excluye
    explícitamente `cooldown`), filtrado por `canDoExercise()` (importada de
    `plan-generator.ts`) y combinando el pool general (sin
    `relevantDayTypes`) con el específico del día (push→push, pull→pull,
    legs/lower→legs, upper→push+pull, full_body→solo general). Recorre el
    pool en orden sumando duraciones hasta igualar o superar el tiempo
    restante; si se agota, repite desde el principio (round-robin efímero,
    sin tocar `muscle_exercise_usage`).
  * `scripts/test-warmup-generator.ts`: 4 escenarios verificados contra el
    catálogo real (vía el mismo mock de `@/db` que ya usan los scripts de la
    Fase 0-A, necesario porque `plan-generator.ts` importa transitivamente
    `@/db`): push/gym 5-10-15 min (apertura siempre cardioMachine a 180s,
    nunca `cooldown`), legs/casa `['mat']` 10 min (apertura 60s, respeta
    equipamiento), full_body/casa 5 min (solo pool general), upper/casa
    `['mat']` 15 min (pool de 18 únicos, genera 28 ítems → confirma
    repetición round-robin sin crash).
- Hecho: sesión 2026-07-08 — FASE 1b Paso 2: flujo de entrada al
  calentamiento (JS, recarga):
  * `src/store/warmup.store.ts`: store Zustand efímero (`items`,
    `currentIndex`, `setWarmup`/`advance`/`reset`) — sin persistencia, vive
    solo en memoria.
  * `training.tsx`: la antigua `doStartSession(context)` se renombró a
    `startRealSession(context)` sin tocar ni una línea de su cuerpo (E-3,
    manejo de errores, `startSession`); la nueva `doStartSession(context)` es
    un wrapper fino que abre `VulcanDialog` "¿Quieres calentar antes de
    empezar?". "No" → `startRealSession(pendingContext)` (comportamiento 100%
    idéntico al anterior, verificado con `git diff`). "Sí" → modal propio con
    3 chips (5/10/15 min, `Pressable` envolviendo `ThemedView`, mismo
    `borderRadius`/`borderColor`/`fontSize` que los chips
    "Casa/Gimnasio/Ambos" de `equipment.tsx`/`StepLocation.tsx`) → llama a
    `generateWarmup(dayType, equipment, warmupIsGym, minutos)`
    (`warmupIsGym = pendingContext !== 'home'`, cubre tanto `null` —gym
    puro— como `'gym'` —both eligiendo gym—) → `setWarmup(items)` → navega a
    `/warmup`.
  * `src/app/warmup.tsx`: placeholder simple ("Calentamiento — Paso 3
    pendiente" + botón `router.back()`, mismo patrón que el botón de volver
    de `exercise/[id].tsx`). La pantalla de foco real (recorrer los
    `WarmupItem` con temporizador) queda para el Paso 3 — no construida
    todavía.
  * Traducciones es/en/fr bajo `workout.warmup.*`.
  * Nota técnica: hubo que regenerar `.expo/types/router.d.ts` (arrancando
    `expo start` unos segundos) para que TypeScript reconociera la ruta nueva
    `/warmup` — archivo generado, gitignored, sin relación con código de
    producción.
  * Verificado: `npx tsc --noEmit` limpio en cada paso; `git diff` confirma
    que `startRealSession` es copia exacta del antiguo `doStartSession` salvo
    el nombre.
- Hecho: sesión 2026-07-09 — FASE 1b Paso 3 completa + fix de raíz en
  `VulcanDialog` (commit `6560593`):
  * `warmup.tsx` convertido de ruta (`router.push('/warmup')`) a overlay
    Zustand — mismo patrón que `session.tsx`/`equipment.tsx`. `_layout.tsx`
    monta `<WarmupScreen />` en un `View` absoluto cuando
    `useWarmupStore(s => s.active)` es `true`.
  * `warmup.store.ts`: `setWarmup(items)` → `start(items, dayType, equipment,
    isGym)` (guarda el contexto de generación, necesario para que
    "Intercambiar" busque en el mismo pool) + `active: boolean` + `end()`
    (antes `reset()`).
  * `training.tsx`: nuevo `useEffect` que detecta la transición
    `isWarmupActive: true → false` y en ese momento (y solo en ese momento)
    llama a `startRealSession(pendingContext)` — el camino "No, gracias" al
    calentamiento sigue arrancando la sesión por su cuenta sin pasar por el
    store de calentamiento, así que esta transición nunca se dispara para él.
  * `warmupGenerator.ts`: nueva `getWarmupAlternative(currentExerciseId,
    dayType, equipment, isGym, excludeIds)` — determinista (sin
    `Math.random()`), mismo pool que generó el ítem original (cardio o
    movilidad), primer candidato no usado ya en la rutina.
  * **Fix de raíz en `VulcanDialog.tsx`**: `onConfirm` disparaba `onClose`
    automáticamente como efecto colateral de `dismiss()` (150-180ms después),
    lo cual causaba un bug real — confirmar "¿quieres calentar?" en
    `training.tsx` terminaba invocando `startRealSession` por el camino de
    `onClose`, no del flujo de calentamiento. Nueva `dismissAfterConfirm()`
    (misma animación, sin llamar `onClose()`); `handleConfirm()` la usa en
    vez de `dismiss()`. Auditados los 14 usos del componente en el proyecto
    (`LOTE11_REACHABILITY_AUDIT.md` sección 13): 13/14 ya reseteaban su
    propia bandera `visible` dentro de `onConfirm`; el único caso que no lo
    hacía (`profile.tsx` "Cerrar sesión" → `doSignOut`) se corrigió en el
    mismo commit añadiendo `setSignOutOpen(false)` al inicio de `doSignOut`.
  * Verificado con `npx tsc --noEmit` limpio.
- Hecho: sesión 2026-07-09 — Rediseño de calentamiento: foco secuencial →
  checklist con lista completa (commit `ae1c187`):
  * Cambio de diseño (decisión del usuario tras probar el Paso 3 en
    dispositivo): en vez de mostrar un ejercicio a la vez, `warmup.tsx`
    ahora muestra la lista completa de ítems como checklist, cada uno con
    su propio cronómetro independiente.
  * Nuevo `src/components/warmup/TimedChecklistItem.tsx`: tarjeta compacta
    reutilizable (ícono+color por categoría cardio/mobility, badge de
    categoría, cronómetro mm:ss, botón play/pause, checkbox de completado,
    botón intercambiar) — deliberadamente distinta de `ExerciseCard`
    (pensada para lista, no para una tarjeta grande de foco único). Marcada
    explícitamente como reutilizable para la futura Fase 2 (estiramiento).
  * Mutex de cronómetro: un solo `runningIndex` en `warmup.tsx` — solo el
    ítem activo decrementa cada segundo; el resto queda pausado tal cual al
    cambiar de ítem activo (dos `useEffect` separados: uno decrementa,
    el otro detecta la transición a 0 y dispara side effects).
  * Auto-marcado al llegar a 0: reutiliza `hapticsSuccess()` +
    `playRestDone()` (el mismo sonido/vibración del fin de descanso en
    `session.tsx`, sin duplicar el mecanismo) y marca el ítem como
    completado automáticamente.
  * `warmup.store.ts`: `currentIndex` + `advance()` eliminados (ya no aplica
    con lista completa); `replaceCurrent(exercise)` → `replaceAt(index,
    exercise, durationSeconds)` — la duración ahora la decide `warmup.tsx`
    al intercambiar, no el store.
  * Duración fija preservada en el intercambio del ítem de apertura: al
    intercambiar el ítem 0 (cardio), conserva su duración original (180s
    gym / 60s casa) en vez de adoptar el `defaultDurationSeconds` del nuevo
    ejercicio elegido; el resto de ítems (movilidad) sí adopta el
    `defaultDurationSeconds` del ejercicio nuevo.
  * Header con progreso "`X`/`Y` completados" + botón "Ir a tu entreno"
    (equivalente a `end()`, mismo efecto que el botón "Finalizar" al pie de
    la lista).
  * `npx tsc --noEmit` limpio. Working tree limpio — todo comiteado.
- **FASE 1b — Calentamiento guiado: COMPLETA** (Pasos 1, 2 y 3, más el
  rediseño a checklist). Sin trabajo pendiente conocido en este módulo.
- Hecho: sesión 2026-07-10 — **FASE 2 (Enfriamiento/estiramiento guiado
  post-entreno): COMPLETA**, en 3 pasos + 1 fix (commits `3dba4a4`,
  `642b7a4`, `2c2408c`, `71f5ba4`; JS, recarga):
  * **Paso 1** (`3dba4a4`): `src/lib/cooldownGenerator.ts` — `generateCooldown()`
    y `getCooldownAlternative()`, espejo de `warmupGenerator.ts` pero SIN
    bloque de cardio de apertura (lista homogénea de estiramientos). Filtra
    el catálogo por `movementPhase` `'cooldown'`/`'both'`, `dayType` (vía
    `relevantDayTypes`) y equipamiento (`canDoExercise()`, reutilizada de
    `plan-generator.ts` — se corrigió en verificación un olvido de `isGym`
    que dejaba a los usuarios de gimnasio sin estiramientos con mat/foam
    roller). Round-robin efímero con barajado, sin persistencia.
  * **Paso 2** (`642b7a4`): `src/store/cooldown.store.ts` (espejo de
    `warmup.store.ts` + estado de flujo `promptOpen`/`minutesOpen`/`pending`)
    y `CooldownFlowOverlay.tsx` (diálogo "¿quieres estirar?" + chips de
    minutos 3/5/10/15). Integrado en `doFinish()` de `session.tsx`
    (`promptAfterSession()` justo después de `finishSession()`, antes de
    `unlockAchievement`) usando el `trainingContext` de la sesión (no
    `profile.location`) para `isGym`. `AchievementCelebrationOverlay` se
    abstiene de renderizar mientras el flujo de cooldown está activo (no
    toca `celebrationQueue`, solo pospone su lectura) — evita que la tarjeta
    de logro compita con el diálogo de estirar. Documentado el análisis
    completo de timing/races en `COOLDOWN_INTEGRATION_AUDIT.md` (raíz).
  * **Fix mismo día** (`2c2408c`): el sonido/haptics de logro sonaba en el
    instante del desbloqueo (dentro de `doFinish()`), desincronizado de
    cuándo la tarjeta se mostraba de verdad (podía quedar retenida minutos
    por el gate de cooldown). Movido a un `useEffect` de montaje dentro de
    `AchievementCard` (único uso del componente en el proyecto — verificado
    por grep) — cubre por construcción tanto la siguiente tarjeta de la cola
    como la que estaba retenida por el gate.
  * **Paso 3 y cierre** (`71f5ba4`): `src/app/cooldown.tsx` — pantalla real,
    mismo cronómetro mutex y auto-check con sonido/vibración que
    `warmup.tsx`, reutilizando `TimedChecklistItem` sin tocarlo. Sin rama
    especial de apertura (a diferencia de warmup). Salidas ("Salir" arriba,
    "Finalizar estiramiento" abajo) llaman a `end()` directo, sin
    confirmación — las celebraciones retenidas aparecen solas al cerrar.
    `_layout.tsx`: placeholder inline reemplazado por `<CooldownScreen />`.
  * `npx tsc --noEmit` limpio en los 4 commits. Working tree limpio tras
    cada uno.
- Hecho: sesión 2026-07-10 — Splits sin días upper/lower (JS, recarga):
  * `plan-generator.ts` `getSplit()`: día 4 pasa de
    `['upper','lower','upper','lower']` a `['push','pull','legs','full_body']`;
    día 5 pasa de `['push','pull','legs','upper','lower']` a
    `['push','full_body','pull','full_body','legs']`. Resto de días
    (1/2/3/6/7) sin cambios. Decisión de producto: eliminar upper/lower de
    los splits que se GENERAN, no del tipo `DayType` en sí.
  * Auditado con grep completo de `upper`/`lower` en `src/` antes de tocar
    nada: el único sitio que participa en la generación de planes es
    `getSplit()`. Todo lo demás (`muscleTargets.ts`, `muscleBasedSelection.ts`,
    `warmupGenerator.ts`, `cooldownGenerator.ts`, catálogo de ejercicios,
    iconos/avisos de UI en `training.tsx`/`session.tsx`/`WorkoutCard.tsx`/
    `TodayBanner.tsx`) es capacidad pasiva que consume un `dayType` ya
    asignado — se dejó intacto a propósito para que los planes ya generados
    con días upper/lower sigan renderizándose y entrenándose sin problema;
    solo desaparecen al regenerar el plan.
  * `npx tsc --noEmit` limpio.
- Hecho: sesión 2026-07-10 — **FASE 0-B-1 Paso 1: cimientos de datos para
  prioridades musculares** (commit `a6fa945`; solo persistencia, sin UI ni
  generador tocado):
  * Migración manual `0010_muscle_priorities`: `ALTER TABLE profile ADD
    COLUMN muscle_priorities text NOT NULL DEFAULT '[]'`. Verificada en frío
    con `node:sqlite` ejecutando la cadena real 0000-0010 contra un perfil
    ya existente (sin pérdida de datos) y como instalación limpia.
  * `schema.ts`: `musclePriorities` en la tabla `profile`.
  * `exercises.ts`: `parseMusclePriorities(raw)` — mismo try/catch que las 4
    copias de `parseEquipment` (no tocadas), filtra además cualquier valor
    que no sea un `MuscleGroup` real.
  * `profile.store.ts`: `updateMusclePriorities(priorities)`, espejo de
    `updateEquipmentAndLocation`.
- Hecho: sesión 2026-07-11 — **FASE 0-B-1 Paso 2: conecta musclePriorities
  con la selección de ejercicios** (commit `420fb8c`; sin UI todavía —
  con `musclePriorities=[]` el comportamiento es idéntico al anterior):
  * `muscleTargets.ts`: `targetIsPrioritized(target, priorities)` +
    `findTargetByKey(key)`.
  * `muscleBasedSelection.ts`: nuevo parámetro `musclePriorities` (default
    `[]`). Partición estable (filter+concat, nunca muta) que antepone los
    targets priorizados en la Pasada 1, la Pasada 2 y `SECOND_COMPOUND_ORDER`.
    No toca el mínimo garantizado ni el tope de 3 por músculo. Eliminado el
    `console.log` de depuración de `compoundLeft` que quedaba pendiente
    desde la Fase 0-A.
  * `plan-generator.ts`: `musclePriorities` viaja explícito
    `generatePlan()` → `selectExercisesForDay()` → `selectExercisesForDayByMuscle()`.
  * Scripts de regresión (`test-full-plan-generation.ts`,
    `test-muscle-selection.ts`) actualizados tras el cambio de splits del
    2026-07-10.
- Hecho: sesión 2026-07-15 — Ajuste del tope de corrupción de
  `musclePriorities` (commit `f5887e6`): `slice(0,2)` confundía la defensa
  de datos corruptos con la regla de negocio real (máx. 2 ZONAS
  seleccionadas en la futura pantalla, no 2 valores del array — una zona
  puede agrupar varios `MuscleGroup`, ej. Core/Abdomen = `['core','abs']`).
  Cambiado a `slice(0,6)`, tope generoso solo para datos corruptos; sin
  efecto observable hoy (sigue siendo `[]` para todos los usuarios).
- Hecho: sesión 2026-07-15 — Assets del diagrama muscular (commit
  `73c2d6d`): `assets/images/musclePriorities/front.webp` (516×1482) y
  `back.webp` (522×1388) — fotos reales para la Opción B de la pantalla de
  prioridades (ver más abajo). Nota: se subieron inicialmente con extensión
  duplicada (`front.webp.webp`/`back.webp.webp`); Juan las renombró a mano
  a los nombres correctos antes de que se usaran en código — ese rename
  sigue sin comitear (ver más abajo).
- **FASE 0-B-1 Paso 3 — pantalla de prioridades: EN EXPLORACIÓN, SIN
  COMMIT** (sesión 2026-07-15). Todo lo siguiente está en el working tree,
  sin comitear, a la espera de que Juan decida entre las dos opciones antes
  de seguir:
  * **Descartado y ya limpiado por completo**: spike 3a
    (`useMuscleSpikeStore` + `SvgTouchSpike.tsx`) confirmó con evidencia real
    en dispositivo que **`<Use href="#id">` de `react-native-svg` NO dispara
    su propio `onPress`** — cualquier toque sobre su geometría resuelve al
    elemento original referenciado, sin importar dónde se toque. Regla
    derivada y ya aplicada en todo lo posterior: cualquier forma que
    necesite `onPress` propio debe ser un `Path`/`Ellipse` real con
    coordenadas duplicadas, nunca `<Use>`. El spike se eliminó por completo
    tras confirmar esto (sin rastro en el repo, verificado por grep).
  * **Opción A — `src/components/musclePriorities/MuscleDiagram.tsx`** (SVG
    puro, silueta vectorial dibujada a mano): exporta `MuscleRegionId` (10
    regiones: `chest`, `shoulders`, `biceps`, `quads`, `core_abdomen`,
    `back`, `triceps`, `glutes`, `hamstrings`, `calves`). Cada bilateral son
    2 `Path` reales (derecho + izquierdo derivado negando la X, dejando la Y
    intacta — geometría verificada coordenada por coordenada); cada central,
    1 solo `Path`. Silueta decorativa (piernas/brazos/torso, sin toque) SÍ
    usa `<Use>` para su espejo — ahí no hay riesgo, no llevan `onPress`.
    Además tiene líneas anatómicas decorativas (clavícula, deltoides, surco
    pectoral, etc. — coordenadas exactas dadas por Juan, no inventadas) que
    SÍ pueden usar `<Use>` porque tampoco llevan `onPress`; color casi negro
    `#0F1712`/marrón `#8A5F1E` según la selección de su región. Puramente
    presentacional — sin estado propio, sin store, sin saber nada de
    `MuscleGroup`.
  * **Opción B — `src/components/musclePriorities/MuscleDiagramPhoto.tsx`**
    (foto real de fondo + zonas de toque calibrables): usa
    `front.webp`/`back.webp`, aspect ratio real por vista (516:1482 /
    522:1388, sin forzar igualdad), `<Svg viewBox="0 0 100 100">` encima con
    una `Ellipse` real por zona (coordenadas de partida ESTIMADAS, pendientes
    de recalibrar). Prop `calibrationMode` (default `true`): zonas visibles
    con etiqueta de texto con el id, para ajustar coordenadas viendo la foto
    real. `calibrationMode=false`: zonas invisibles + resplandor con
    degradado radial ámbar en la región seleccionada.
  * **Arnés de debug**: `src/store/muscleDiagramDebugStore.ts` +
    `src/app/muscleDiagramDebug.tsx` (marcado `// TEMPORAL — spike paso 3b,
    se reemplaza en paso 3c`), montado en `_layout.tsx` y accesible desde un
    botón temporal en `profile.tsx`. Pestañas Frontal/Trasera + botón "Ver
    con foto" para alternar entre las dos opciones sin salir de la pantalla,
    reutilizando el mismo estado `selected`/`handleRegionPress` (tope de 2
    zonas, con pulso visual `Animated` si se intenta una 3.ª) para ambas.
  * **Estado del working tree ahora mismo (sin commit)**: modificados
    `_layout.tsx`, `profile.tsx`; nuevos `muscleDiagramDebug.tsx`,
    `muscleDiagramDebugStore.ts`, `src/components/musclePriorities/`
    (`MuscleDiagram.tsx` + `MuscleDiagramPhoto.tsx`); rename sin comitear de
    los dos `.webp`; además queda sin comitear `MUSCLE_SCREEN_AUDIT.md`
    (auditoría de solo lectura de una sesión anterior, sin relación con el
    spike). `npx tsc --noEmit` limpio en cada paso.
- Siguiente inmediato: Juan tiene que ver ambas opciones en Android (usando
  el botón "Diagrama corporal (temporal)" en Perfil → pestaña "Ver con
  foto" para alternar) y decidir Opción A (SVG) vs Opción B (foto +
  calibración) antes de seguir con el Paso 3c real. Si elige la Opción B,
  falta recalibrar las coordenadas estimadas de las zonas contra las fotos
  reales. Una vez decidido: comitear lo elegido, borrar el descartado y el
  arnés de debug, y conectar la pantalla real a `musclePriorities`/
  `profile.store.ts` (Paso 3c). Otros candidatos del roadmap sin tocar:
  FASE D (deloads automáticos + gráfica 1RM en Progreso), FASE 7 (in-app
  purchase).
- Pendiente obligatorio (roadmap): FASE 7 — In-app purchase.
  ⚠️  OBLIGATORIO antes de publicar en tiendas o cuando expire el trial de 14 días.

## Plan de fases

### Completadas
- FASE 1–8 completadas (ver Estado actual).

### Lote visual/motivación (en curso, sin recompilar hasta la última)
- ~~MEJORA A — Íconos uniformes (JS, recarga)~~ ✓ Completado.
- ~~MEJORA B — Gráfica y tendencias de medidas (JS, recarga)~~ ✓ Completado.
- ~~MEJORA C — Frases motivadoras diarias (JS, recarga)~~ ✓ Completado.
- ~~MEJORA D — Gamificación (JS, recarga)~~ ✓ Completado.
- ~~MEJORA E — Recap mensual/semanal~~ ✓ Completado.
- ~~MEJORA F — Háptica~~ ✓ Código listo — pendiente EAS Build.
- ~~FASE 9a — Base de datos entrenamiento + generador de planes~~ ✓ Completado.
- ~~FASE A — Pestaña Entrenamiento + vista ciclo + cambio ejercicios~~ ✓ Completado.
- ~~FASE 9b — Sesión en vivo: cronómetro, tabla series, RIR, descanso~~ ✓ Completado.
- ~~FASE C — Algoritmo de progresión de cargas~~ ✓ Completado.
- ~~LOTE G — Mejoras sesión + historial + coach + gamificación~~ ✓ Completado (JS, recarga).

### Pendientes principales
- FASE 7 — In-app purchase (OBLIGATORIA antes de publicar).
- ~~FASE 9c — Historial de sesiones~~ ✓ Completado (Lote A+B).
- ~~FASE E-1 — "Mi equipamiento" en Ajustes~~ ✓ Completado (JS, recarga).
- ~~FASE E-2 — "¿Dónde entrenas hoy?" pregunta de contexto~~ ✓ Completado (JS, recarga).
- ~~FASE E-3 — Filtro ligero de ejercicios en sesión~~ ✓ Completado (JS, recarga).
- ~~LOTE UI PASO 2 — Propagar VulcanBottomSheet/VulcanDialog~~ ✓ Completado (JS, recarga).
- ~~FASE 1b — Calentamiento guiado antes de la sesión~~ ✓ Completado (Pasos
  1-3 + rediseño a checklist con `TimedChecklistItem`, JS, recarga).
- ~~FASE 2 — Enfriamiento/estiramiento guiado post-entreno~~ ✓ Completado
  (generador + store + flujo de diálogo + gate de celebraciones + pantalla
  real, JS, recarga).
- FASE 0-B-1 — Motor de priorización muscular: Pasos 1-2 completos (datos +
  conectado al generador, sin UI). Paso 3 (pantalla) EN EXPLORACIÓN — Opción
  A (SVG) vs Opción B (foto + calibración), pendiente decisión de Juan.
- FASE D — Deloads automáticos, gráfica de fuerza (1RM) en pestaña Progreso.

## IMPORTANTE
Actualiza la sección "Estado actual" al final de cada sesión, anotando qué se 
completó y cuál es el siguiente paso.

## Funcionalidad futura: Social (amigos y constancia) — DISEÑO, NO IMPLEMENTAR

### Principios (obligatorios cuando se construya)
- **Offline-first se mantiene.** Lo social requiere conexión y servidor (Supabase). 
  Si no hay red, la parte social simplemente no carga, pero el entrenamiento propio 
  sigue funcionando offline como siempre. Una caída de red NUNCA debe romper la app.
- **Privacidad por diseño.** Amistades mutuas y consentidas (solicitud → aceptación), 
  siempre revocables. Solo se comparten señales de CONSTANCIA (frecuencia y rachas). 
  NUNCA se comparten pesos, RIR, progreso ni datos corporales.
- **Seguridad en servidor.** Políticas RLS (Row Level Security) en Supabase para que 
  ningún usuario pueda leer datos de quien no es su amigo. No es opcional.

### Fase S-1 — Identidad y amigos
- Perfil mínimo con nombre de usuario único y localizable.
- Buscar usuario, enviar solicitud, aceptar o rechazar.
- Amistad mutua y consentida. Poder eliminar a un amigo.

### Fase S-2 — Muro de constancia (solo lectura)
- De cada amigo se ve solo: entrenamientos esta semana, entrenamientos este mes, 
  racha actual.
- Solo las señales acordadas; nada de rendimiento ni datos corporales.
- Cada usuario puede activar/desactivar que sus amigos vean su constancia.

### Fase S-3 — Rutina compartida (más adelante, fase aparte)
- Un amigo propone un entrenamiento; le llega al receptor como PROPUESTA.
- El receptor la revisa y debe ACEPTARLA antes de que entre en su plan. Nunca 
  sobrescribe el plan del receptor sin su consentimiento.

### Estado
Diseño aprobado. Construir solo DESPUÉS de validar el build actual en teléfono físico 
(coach con RIR real, peso onboarding→seguimiento, filtro gym/casa, sonido, icono). 
Atacar en orden S-1 → S-2 → S-3, una fase a la vez.
