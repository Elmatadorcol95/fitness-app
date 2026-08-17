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
- **Copy en español — tuteo, nunca voseo**: toda la copy visible de la app
  (es.json y cualquier texto nuevo) usa tuteo ("tienes", "elige", "confirma"),
  no voseo ("tenés", "elegí", "confirmá"). Aplica a título, mensajes de
  error, botones, banners — cualquier string dirigido al usuario.

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
- **FASE 0-B-1 Paso 3 — pantalla de prioridades: COMPLETA** (spike
  construido 2026-07-15, comiteado ese mismo día en `40d330c` "15juliofin" —
  ver detalle de working tree más abajo; calibración de la Opción B hecha el
  2026-07-16, comiteada en `4817953` el día 17). Decisión tomada: gana la
  Opción B (foto + etiquetas). Detalle de la exploración conservado abajo
  como historial:
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
    522:1388, sin forzar igualdad). Prop `calibrationMode` (default `true`):
    zonas visibles con etiqueta de texto con el id, para ajustar coordenadas
    viendo la foto real. `calibrationMode=false`: zonas invisibles +
    resplandor con degradado radial ámbar en la región seleccionada.
  * **Arnés de debug**: `src/store/muscleDiagramDebugStore.ts` +
    `src/app/muscleDiagramDebug.tsx` (marcado `// TEMPORAL — spike paso 3b,
    se reemplaza en paso 3c`), montado en `_layout.tsx` y accesible desde un
    botón temporal en `profile.tsx`. Pestañas Frontal/Trasera + botón "Ver
    con foto" para alternar entre las dos opciones sin salir de la pantalla,
    reutilizando el mismo estado `selected`/`handleRegionPress` (tope de 2
    zonas, con pulso visual `Animated` si se intenta una 3.ª) para ambas.
  * **Commit `40d330c` "15juliofin" (2026-07-15)**: incluyó `_layout.tsx`,
    `profile.tsx`, `muscleDiagramDebug.tsx`, `muscleDiagramDebugStore.ts`,
    `MuscleDiagram.tsx`, `MuscleDiagramPhoto.tsx`, el rename de los dos
    `.webp` y `MUSCLE_SCREEN_AUDIT.md` — confirmado con `git show --stat` (la
    entrada anterior de esta sección decía "sin commit"; quedó desactualizada
    un día).
  * **Sesión 2026-07-16 — bug de render + calibración real (sin comitear
    todavía)**: dos bugs de raíz encontrados y corregidos en
    `MuscleDiagramPhoto.tsx` vía diagnóstico `onLayout` temporal (añadido y
    luego eliminado por completo, junto con su equivalente en
    `muscleDiagramDebug.tsx`):
    1. El `<Image>` ignoraba `StyleSheet.absoluteFill` y se renderizaba a su
       tamaño intrínseco (516×1482dp) en vez de ajustarse al contenedor →
       fix: `width`/`height` explícitos (`width = maxHeight * aspectRatio`)
       en vez de depender de `aspectRatio` de estilo.
    2. El `<Svg viewBox="0 0 100 100">` (cuadrado) sufría letterboxing
       (`preserveAspectRatio` por defecto `xMidYMid meet`) sobre una caja
       181×520 → las 18 zonas quedaban comprimidas en un cuadrado centrado
       en vez de repartidas por todo el alto → fix:
       `preserveAspectRatio="none"` + `width`/`height` explícitos (mismos
       números que el `Image`), así las unidades 0-100 vuelven a significar
       "porcentaje de cada eje" tal como se diseñaron.
    * Con el render ya correcto, Juan reemplazó `front.webp`/`back.webp` por
      versiones con fondo transparente (mismas dimensiones — reverificado
      con `sharp`: 516×1482 / 522×1388, `hasAlpha:true`) y midió las 18
      coordenadas reales sobre la foto corregida. `FRONT_ZONES`/`BACK_ZONES`
      reemplazadas con esos valores medidos (antes eran estimaciones).
    * `npx tsc --noEmit` limpio en cada paso de la sesión. Sin commit —
      pendiente de que Juan pruebe en Android antes de comitear.
  * **Sesión 2026-07-17 — rondas finas de calibración + capa de etiquetas
    (commit `4817953`)**: varias rondas sucesivas de ajuste manual de las 18
    elipses de `FRONT_ZONES`/`BACK_ZONES` en `MuscleDiagramPhoto.tsx`
    (hombros, bíceps, pecho, core, cuádriceps, glúteos, isquiotibiales,
    gemelos — cada ronda auditada contra el código real antes de aplicarla,
    con `npx tsc --noEmit` + `git status` verificados en cada paso). Brillo
    ámbar del resplandor subido en dos pasos (0.35→0.525→0.7875).
    - `MuscleDiagramPhoto.tsx`: `FRONT_ZONES`, `BACK_ZONES`, `FRONT_ASPECT`,
      `BACK_ASPECT` y el tipo `ZoneDef` exportados (antes privados del
      módulo) para que el componente nuevo no duplique coordenadas.
    - Nuevo `src/components/musclePriorities/MuscleDiagramLabeled.tsx`:
      envuelve `MuscleDiagramPhoto` (sin modificarla) para la Opción B final
      — diagrama + columna de 140dp de etiquetas externas ancladas a la
      posición real de cada músculo (`labelYPercent` fijo por etiqueta, ya
      no reparto uniforme), línea guía en `Path` con doblez
      horizontal-luego-diagonal hasta el borde de la elipse ancla, texto
      ámbar cuando la zona está en `selected` y gris si no, leyenda fija
      Disponible/Priorizado. `columnGap: GAP` real en el contenedor de fila
      (fix de un hueco fantasma entre el final de la línea y el inicio del
      texto que antes solo maquillaba `paddingLeft`). Etiquetas tocables:
      cada una es un `Pressable` con `onPress={() => onRegionPress(zone.id)}`
      (mismo callback recibido por props, sin estado nuevo) y
      `hitSlop={{top:6,bottom:6,left:8,right:8}}`.
    - `muscleDiagramDebug.tsx`: nuevo interruptor "Calibración"/"Vista final"
      (estado `previewFinal`), visible solo cuando `usePhoto` está activo.
      En "Vista final" renderiza `MuscleDiagramLabeled`; en "Calibración"
      sigue mostrando `MuscleDiagramPhoto` con las elipses/etiquetas de
      depuración de siempre.
    - Todo JS puro, sin módulos nativos. `npx tsc --noEmit` limpio en cada
      edición. Comiteado en `4817953` — **todavía sin `git push`** (pendiente
      de confirmación de Juan).
- Hecho: sesión 2026-07-20 — **Paso 3c-A: eliminación del arnés de
  debug** (commit `02d2236`): borrados por completo
  `src/app/muscleDiagramDebug.tsx` y `src/store/muscleDiagramDebugStore.ts`;
  quitadas las referencias quirúrgicas en `profile.tsx` (import + botón
  "Diagrama corporal (temporal)" + estilos huérfanos) y en `_layout.tsx`
  (import, selector `isMuscleDiagramDebugVisible`, bloque de montaje).
  `npx tsc --noEmit` limpio, validado en Android antes de comitear.
- Hecho: sesión 2026-07-20 — **Paso 3c-B: se resuelve Opción A vs
  Opción B — gana la B** (commit `5dd9178`): `MuscleRegionId` se mueve
  de `MuscleDiagram.tsx` a `MuscleDiagramPhoto.tsx` (ahora exportado
  desde ahí), `MuscleDiagramLabeled.tsx` reapunta su import, y
  `MuscleDiagram.tsx` (Opción A, SVG puro) se borra por completo — blast
  radius confirmado por grep antes de borrar (solo 3 importadores, todos
  ya migrados). `npx tsc --noEmit` limpio.
- Hecho: sesión 2026-07-20 — **Pasos 3c-C a 3c-E: pantalla real
  `MusclePrioritiesScreen`** (commits `0cd7128`, `5e39ec0`, `63dc751`):
  par `musclePrioritiesVisible`/`openMusclePriorities`/
  `closeMusclePriorities` añadido a `profile.store.ts` (mismo patrón que
  `equipmentVisible`); nuevo `src/app/musclePriorities.tsx` — estado
  inicial vía `parseMusclePriorities` + mapeo zona↔grupo
  (`ZONE_TO_GROUPS`/`groupsToZones`/`zonesToGroups`), tabs Frontal/
  Trasera, tope de 2 zonas con pulso (migrado literal del arnés de
  debug ya borrado), guardado real vía `updateMusclePriorities` +
  `VulcanDialog` de regenerar plan (`generateAndSavePlan`).
- Hecho: sesión 2026-07-20 — **Paso 3c-F: montaje + entrada en Perfil +
  pulido** (commit `ff0ed20`): `MusclePrioritiesScreen` montada en
  `_layout.tsx` (mismo patrón overlay que `EquipmentScreen`); nueva
  sección "Prioridad muscular" en `profile.tsx` junto a "Equipamiento";
  i18n `musclePriorities.*` propio en es/en/fr. Ajustes de UX tras
  validación en dispositivo: hint + contador con pulso reubicados ANTES
  del diagrama (antes quedaban ocultos sin hacer scroll); diálogo de
  regenerar reescrito con copy propio (ya no reutiliza los textos de
  "equipamiento actualizado") y reducido a un solo botón "Finalizar"
  (`hideCancel`, `onClose` y `onConfirm` apuntan a la misma función —
  no hay un "no, gracias" legítimo en este flujo).
- Hecho: sesión 2026-07-20 — **Fase 0-B-2: integración en el onboarding,
  opcional** (commits `ce79549`, `b74a460`): nuevo
  `StepMusclePriorities.tsx` (patrón `StepGoal`, sin botón Guardar ni
  diálogo — escribe directo a `draft.musclePriorities` en cada toque);
  campo `musclePriorities: string[]` añadido a `OnboardingDraft`/
  `defaultDraft`; paso insertado en `OnboardingFlow.tsx` entre Lesiones
  y Resumen (`TOTAL_STEPS` 7→8); `canGoNext()` sin tocar — el paso cae
  en su `return true` por defecto, que es el comportamiento "opcional"
  buscado; escritura a SQLite añadida en el `db.insert` de
  `handleNext()`; fila condicional en `StepSummary` (mismo patrón que
  Lesiones). Bug encontrado y corregido durante la validación: el toggle
  de zona llamaba `updateDraft()` (efecto de otro store) dentro del
  updater funcional de `setState`, lo que React marca como error — se
  reescribió para leer `selected` del closure y llamar `updateDraft()`
  en el cuerpo de la función, no dentro del updater.
- Hecho: la funcionalidad de prioridad muscular quedó COMPLETA de punta
  a punta (motor + pantalla de Perfil + onboarding opcional), validada
  en dispositivo real (Fase 0-B-1 y 0-B-2 cerradas en sesiones previas).
- Hecho: **FASE 3 — cardio según objetivo, Pasos 3-A a 3-D** (diseño
  cerrado con Juan; `fat_loss` como principal → ~2 bloques de cardio/día;
  como secundario → 1 bloque, todos los días de entreno):
  * **3-A** — `src/lib/cardioSelection.ts` nuevo: `selectCardioBlocks(slots,
    equipment, isGym, excludeIds)` → `PlannedCardioBlock[]`. Gimnasio: 1
    ejercicio de `category:'cardio'` con `cardioMachine`, bloque fijo de
    600s (`CARDIO_BLOCK_SECONDS`), independiente del `defaultDurationSeconds`
    del catálogo. Casa: circuito acumulado con `canDoExercise()`, sumando
    ejercicios distintos con su propia duración real hasta cubrir
    `slots × CARDIO_BLOCK_SECONDS`. Función aislada, sin conectar a nada
    hasta 3-B.
  * **3-B** — conectado al pipeline de generación y persistencia:
    - Migración manual `0011_plan_days_cardio` (`ALTER TABLE plan_days ADD
      COLUMN cardio text NOT NULL DEFAULT '[]'`), siguiendo el mismo patrón
      manual de 3 puntos de edición (`migrations.js` + `_journal.json` con
      `when` real > máximo anterior + `schema.ts`). Verificada en frío con
      `node:sqlite`, cadena completa 0000→0011, en dos escenarios (instalación
      limpia y perfil/plan ya existentes antes de aplicarla) — sin pérdida
      de datos, columna `cardio` con default `'[]'` confirmado.
    - `plan-generator.ts`: `PlanDayData` gana `cardio: PlannedCardioBlock[]`.
      Nuevas funciones puras `getCardioSlots(goalPrimary, goalSecondary,
      totalSlots)` (2 si `fat_loss` es principal, 1 si es secundario, 0 si
      no aparece, con tope de mitad de los huecos totales del día) y
      `subtractCardioSlots(counts, cardioSlots)` (resta primero de
      `isolations`, luego de `compounds`). Dentro de `generatePlan()`, cada
      día usa `reducedCounts` para la fuerza y genera su cardio por
      separado, compartiendo `usedThisWeek` (mismo `excludeIds`) para que
      cardio y fuerza no se pisen entre sí ni entre días.
    - `workout.store.ts`: `StoredPlanDay` gana `cardio: PlannedCardioBlock[]`.
      Nueva `mapDayRows()` a nivel de módulo que unifica el mapeo que antes
      estaba duplicado en `loadCurrentPlan()` y `generateAndSavePlan()`
      (ambos ahora llaman a la misma función). `generateAndSavePlan()`
      serializa `day.cardio` al insertar en `plan_days`.
    - Verificado en vivo en Android con `console.log` temporal (añadido y
      retirado en el mismo lote, `git diff` confirmado limpio tras
      quitarlo) para los 3 casos: `fat_loss` principal, secundario, y
      ausente (regresión: `cardioSlots=0`, `cardio=[]` en todos los días).
    - Comiteado y pusheado: commit `0888b29`.
  * **3-C** — solo investigación de lectura (sin cambios de código): se
    confirmó que `sessionDayType` en `session.tsx` (línea ~229 antes de
    3-D) se calcula inline, sin `useMemo` ni función auxiliar, cruzando
    `currentPlan?.days.find(d => d.dbId === planDayId)?.dayType` — mismo
    patrón reutilizado para `cardioBlocks` en 3-D. `ExerciseState` (store
    de sesión) no guarda `dayType` ni `cardio` — viven solo del lado de
    `workout.store.ts`.
  * **3-D** — modo cardio "skeleton" en `session.tsx` (entrar/salir,
    duración fija, cuenta regresiva simple, marcar completado; SIN edición
    de duración, SIN modo cronómetro, SIN intercambio — eso es 3-E/3-F):
    - `cardioBlocks` calculado igual que `sessionDayType` (mismo cruce
      `currentPlan.days.find(...).cardio`), pero declarado **antes** del
      bloque de `useState` (línea 198), no junto a `sessionDayType` (que
      quedó más abajo) — ver el bug real de abajo.
    - 4 `useState` nuevos (`showingCardio`, `cardioRunningIndex`,
      `cardioRemaining`, `cardioCompleted`) + 2 `useEffect` copiados
      literalmente del mecanismo mutex de `cooldown.tsx` (decremento por
      segundo del índice corriendo + transición a completado con
      `hapticsSuccess()`/`playRestDone()`, mismo patrón que warmup/cooldown).
    - Reutiliza `TimedChecklistItem` (mismo componente de calentamiento/
      estiramiento) con `swapDisabled={true}` fijo por ahora.
    - Cuerpo del `ScrollView` dividido en `{!showingCardio && (...)}` (todo
      el bloque de ejercicio de fuerza ya existente, sin cambios internos)
      y `{showingCardio && (...)}` (lista de cardio + botón volver). El
      botón "Siguiente" del último ejercicio de fuerza pasa a 3 ramas:
      Siguiente ejercicio → "Ir a cardio" (si `cardioBlocks.length > 0`) →
      nada.
    - Strings i18n usados sin crear todavía (`workout.session.cardioTitle`,
      `backToExercises`, `goToCardio`) — se añaden en 3-G, mostrarán la key
      cruda hasta entonces (esperado).
    - **Bug real encontrado y corregido en el mismo paso** (zona muerta
      temporal): el primer intento colocó `const cardioBlocks = ...` junto
      a `sessionDayType` (más abajo en el archivo) pero los 4 `useState`
      nuevos (que leen `cardioBlocks.map(...)` en su inicializador
      perezoso) quedaron más arriba, en el bloque de `useState` existente
      — `cardioBlocks` se leía antes de declararse. Diagnosticado con
      `tsc` (no lo detecta, closures) y confirmado con Node puro
      (`ReferenceError: Cannot access before initialization`). Se investigó
      además por qué el patrón preexistente análogo (`currentEx` leído en
      `useState(() => ...)` antes de su propia declaración, línea 202) NO
      crashea en producción: `babel-preset-expo` transpila `const`→`var`
      (confirmado transpilando con el `@babel/core` real del proyecto), así
      que no hay TDZ real en el bundle — pero mis líneas SÍ habrían
      crasheado igual, con `TypeError` en `undefined.map()` en vez de
      `ReferenceError`, porque `cardioBlocks.map(...)` no tiene `?.` como sí
      tiene el patrón de `currentEx`. Fix aplicado: `cardioBlocks` movido a
      ANTES de todo el bloque de `useState` (línea 198, antes de `elapsed`),
      sin tocar el orden interno de los `useState` entre sí. Confirmado con
      líneas exactas tras el fix: `cardioBlocks` en 198, `cardioRemaining`
      (el primer consumidor) en 213.
    - Comiteado y pusheado en esta sesión.
- Hecho: sesión 2026-07-22 — **FASE 3 completa (pasos 3-E a 3-K + pulido de
  UI)**: cierra el resto de cardio abierto desde la sesión anterior.
  * **3-E** — duración editable del bloque de cardio de gimnasio: campo
    numérico en minutos (1-60) sobre el bloque de máquina, solo visible
    mientras no está corriendo ni completado (`isGymBlock` filtra por
    `equipment.includes('cardioMachine')` para no aplicarlo a los bloques
    de casa). Corrección de alcance en el mismo paso: el campo NUNCA
    aparece en bloques de circuito de casa (duración fija por ejercicio,
    no editable ahí).
  * **3-F** — rediseño completo de `src/lib/cardioSelection.ts`: nueva
    forma `CardioPlan { gym: PlannedCardioBlock[]; homeSessions:
    HomeCardioSession[] }` (antes un array plano único). Gimnasio: 1 bloque
    de 600s por hueco. Casa: `slots × 2` sesiones de 300s cada una, con
    `restAfterSeconds` (90s por defecto, 0 en la última) entre sesiones del
    mismo día. `CardioCycleState` (`gymCount`/`homeCount`) — pasado por
    referencia a través de TODOS los días de la semana en una misma
    generación — corrige un bug real: al agotar el pool de variedad, antes
    SIEMPRE se repetía el primer ejercicio del catálogo; ahora la
    repetición rota de verdad.
  * **3-G** — `plan-generator.ts`/`workout.store.ts` migrados de
    `PlannedCardioBlock[]` a `CardioPlan` (tipos, `PlanDayData`,
    `StoredPlanDay`, `mapDayRows`). `generatePlan()` crea un único
    `cardioCycle` antes del bucle de días (mismo patrón que `usedThisWeek`).
  * **3-H** — `session.tsx` adaptado a `CardioPlan`: bloque de gimnasio con
    UI homogénea al descanso real entre series (mismo `restBox`/
    `restIdleRow`/`restEditRow`, ±5min en vez de ±15s), bloques de casa
    agrupados por sesión reutilizando `TimedChecklistItem`. `checkBtn`/
    `checkBtnDone`/`formatRest` reutilizados sin duplicar.
  * **3-I** — agrupamiento "Sesión N" + descanso editable (idéntico al de
    gimnasio, ±15s) entre sesiones de casa del mismo día, con auto-inicio:
    un `useEffect` sobre `cardioCompleted` detecta cuándo todos los
    ejercicios de una sesión quedan marcados y arranca el descanso
    siguiente solo (una vez por sesión, vía `sessionRestAutoStarted`).
  * **3-J** — recálculo en vivo (`displayCardio`) cuando `trainingContext`
    (elegido al arrancar la sesión) contradice cómo se generó el cardio del
    día (ej. plan generado para "ambos" con cardio de gimnasio pero el
    usuario elige entrenar en casa hoy): recalcula con `selectCardio()` al
    vuelo, sin persistir el resultado. El `cardio` original (persistido)
    solo se usa para derivar `cardioSlotsForDay`/`wasGymGenerated`; todo el
    resto del componente (estado, efectos, JSX) lee `displayCardio`.
  * **Pulido de UI**: pestaña "Cardio" añadida al `ListFooterComponent` del
    carrusel de ejercicios de arriba (además del botón existente en
    `exNav`, que se mantiene); `isCurr` del carrusel ahora respeta
    `showingCardio` para no resaltar dos ítems a la vez. Botón "Finalizar"
    añadido junto al de cardio en `exNav` (cuando no hay más ejercicios de
    fuerza) y en la vista de cardio (fila "Volver a ejercicios" +
    "Finalizar"), llamando a `handleFinish` sin tocarla.
  * **3-K** — i18n final: 6 claves nuevas bajo `workout.session.*`
    (`cardioTitle`, `backToExercises`, `goToCardio`, `minutesAbbrev`,
    `pause`, `sessionLabel`) en es/en/fr, que hasta este paso mostraban la
    key cruda a propósito.
  * **Tarjetas de resumen de Cardio en `training.tsx`**: tarjeta en la
    pantalla de Entreno (día de hoy, clon visual de `ExerciseCard` —
    mismas dimensiones de placeholder/info/nombre/resumen — pero SIN botón
    "···"/cambiar, intencional) y fila equivalente dentro de `OtherDayCard`
    ("Tu ciclo"), ambas condicionadas a `cardio.gym.length > 0 ||
    cardio.homeSessions.length > 0`. 4 claves i18n adicionales
    (`cardioGymLabel`, `cardioHomeLabel`, `cardioGymSummary`,
    `cardioHomeSummary`) en es/en/fr.
  * Todo JS puro — sin módulos nativos, solo recarga. `npx tsc --noEmit`
    limpio verificado en cada paso (evidencia pegada literal en cada turno
    de la sesión, siguiendo el protocolo "Paso 0" acordado con Juan).
  * Nota de proceso: varios commits de este tramo (`bba3f0b` "3-E a 3-H",
    `caf6fb5` "3-I", `78e9cc0` "auto-inicio", `81caeb9` "3-J", `c2c86f2`
    "3-K") los hizo Juan directamente fuera de esta conversación —
    detectado por `git log`/`git diff --stat` a mitad de sesión, no por el
    propio asistente.
  * Pendiente conocido, sin fecha: el intercambio (swap) de bloques de
    cardio sigue deshabilitado (`swapDisabled={true}` fijo en
    `TimedChecklistItem` para los ítems de cardio). El "modo cronómetro
    libre" como alternativa a la cuenta regresiva, mencionado como posible
    en una nota anterior, no se construyó — quedó superado por el diseño
    final (duración editable en minutos + cuenta regresiva homogénea con
    el descanso de series).
- Hecho: sesión 2026-07-23 — **Feature completo: preferencias de ejercicios
  (like/dislike), capas 1a a 7b**, construido en pasos pequeños con
  verificación "Paso 0" (`npx tsc --noEmit` + `git diff` literal en cada
  turno) y comiteado por Juan directamente fuera de la conversación en
  varios puntos (`7ec800f` a `1ff60d9`, detectado por `git log` a mitad de
  sesión — mismo patrón que en sesiones anteriores):
  * **Capa 1 (paso 1a)** — cimientos: tabla `exercise_preferences`
    (`exercise_id` PK, `preference: 'liked'|'disliked'`, `updated_at`) vía
    migración manual `0012_exercise_preferences.sql` (timestamp real
    `1784799311803`, verificado > máximo anterior `1784623620008` de la
    entrada idx 11); `src/lib/exercisePreferences.ts` — `togglePreference`
    (alterna, sin estado "neutral" explícito: ausencia de fila = neutral),
    `getDislikedIds`/`getLikedIds`/`getAllPreferences`. Verificación en frío
    con `node:sqlite`, cadena 0000→0012, instalación limpia y datos ya
    existentes.
  * **Capa 2a** — `isExerciseUsable()` (nueva, en `plan-generator.ts`:
    `canDoExercise(...) && !dislikedIds.has(ex.id)`) enganchada en el camino
    de generación de fuerza (`muscleBasedSelection.ts`, filtro `available`)
    y cardio (`cardioSelection.ts`, gimnasio y casa). `dislikedIds` se carga
    UNA VEZ en `generatePlan()` y baja por parámetro — mismo patrón que
    `musclePriorities`/`usedThisWeek`.
  * **Capa 2b** — mismo filtro enganchado en calentamiento
    (`warmupGenerator.ts`) y estiramiento (`cooldownGenerator.ts`);
    `dislikedIds` añadido al estado de `warmup.store.ts`/`cooldown.store.ts`
    (se carga al iniciar cada flujo — `cooldown.store.ts` vía
    `chooseMinutes` ahora async, `training.tsx` vía `handleWarmupMinutes`
    ahora async).
  * **Capa 3** — el *like* desempata dentro de `pickBest()`
    (`muscleBasedSelection.ts`): si algún candidato ya elegible tiene like,
    el desempate de siempre (cobertura incidental → orden de catálogo) se
    aplica SOLO entre los favoritos; sin favoritos, comportamiento idéntico
    al anterior. `likedIds` cargado una vez en `generatePlan()` (NO aplica a
    cardio, según lo acordado).
  * **Capa 4** — botones 👍/👎 (Ionicons `thumbs-up`/`thumbs-down`, no
    emoji) + mensaje explicativo en `ChangeExerciseModal.tsx`, cargando/
    alternando preferencias por su cuenta (`getAllPreferences`/
    `togglePreference` al abrirse). Confirmado que el `Pressable` anidado no
    dispara el `onSelect` del `Pressable` padre de la fila (mismo patrón ya
    en uso en `ExerciseCard.tsx` con `menuBtn`).
  * **Capa 5** — mismos botones en `ExerciseCard.tsx` (pantalla Entreno),
    con `preferencesMap` cargado una sola vez en `training.tsx` (mismo
    patrón que `targetMap` de progresión) y pasado por prop
    (`preference`/`onTogglePreference`).
  * **Sesión en vivo** — mismos botones + mismo mensaje explicativo en
    `session.tsx`, justo debajo de la tabla de series y antes de la
    navegación entre ejercicios; `preferencesMap` propio del componente,
    cargado una vez al montar (`useEffect` sin dependencias).
  * **Capa 7a/7b** — pantalla completa `src/app/exercisePreferences.tsx`
    (lista Favoritos/Rechazados con nombre + botones, estado vacío con
    copy propio) montada como overlay en `_layout.tsx` (mismo patrón que
    `EquipmentScreen`/`MusclePrioritiesScreen`, flags
    `exercisePreferencesVisible`/`openExercisePreferences`/
    `closeExercisePreferences` en `profile.store.ts`); nueva sección
    "Preferencias de ejercicios" en `profile.tsx` (clon visual exacto de la
    sección "Prioridad muscular", resumen de texto fijo — sin conteo
    dinámico); i18n `exercisePreferencesSection` (dentro de `tabs.profile`)
    + bloque raíz `exercisePreferences.*` completo en es/en/fr.
  * Todo JS puro — sin módulos nativos, solo recarga. `npx tsc --noEmit`
    limpio verificado en cada paso.
  * Sin trabajo pendiente conocido en este feature.
- Hecho: sesión 2026-08-04 — **Pantalla de error de migraciones + cierre
  del plan de endurecimiento pre-beta** (commit `c03394a`; JS, recarga):
  * Diagnóstico previo (auditoría de solo lectura, sin código): `useMigrations()`
    (`drizzle-orm/expo-sqlite/migrator`) solo expone `{success, error?}` — sin
    ningún estado "en progreso" distinguible del inicial y sin mecanismo de
    retry propio. Si `error` quedaba seteado, `success` nunca pasaba a `true`,
    `stillLoading` quedaba `true` para siempre y `VulcanSplash` giraba
    indefinidamente — sin ningún mensaje, ni para el usuario ni para
    diagnosticar el problema. Tampoco existía en el proyecto ningún
    componente de pantalla de error reutilizable (ni `ErrorBoundary` ni
    equivalente) antes de esta sesión.
  * `_layout.tsx`: la llamada a `useMigrations(db, migrations)` se aisló en
    un componente nuevo, `MigrationRunner` (sin exportar, definido en el
    propio archivo), que no renderiza nada y solo reporta `{success, error}`
    vía `onResult`. `RootLayout` guarda ese resultado en 3 `useState`
    propios (`migrationAttempt`, `migrationsReady`, `migrationsError`) en
    vez de leer el hook directamente. Truco del retry real: `<MigrationRunner
    key={migrationAttempt} .../>` — como `useMigrations` dispara `migrate()`
    dentro de un `useEffect` con deps `[]`, la única forma de re-ejecutarlo
    es forzar un remontaje real del componente que lo llama; cambiar `key`
    logra eso (un simple "reintentar" sin cambiar `key` no habría vuelto a
    correr las migraciones, solo habría re-renderizado con el mismo estado
    de error). El resto de `_layout.tsx` (`stillLoading`, `needsAuth`,
    `needsOnboarding`, `needsPaywall`, el `useEffect` de `console.error`
    ya existente) quedó intacto — confirmado con `git diff` línea por línea
    en cada paso.
  * `src/components/MigrationErrorScreen.tsx` (nuevo): primer componente de
    pantalla de error fatal del proyecto — reutilizable si en el futuro
    aparece otro fallo fatal de arranque (no solo migraciones). Sigue el
    patrón visual ya usado en `PaywallScreen`/estados vacíos (`VulcanSymbol`,
    `ThemedText`/`ThemedView`, botón en `#3FBF7F`): título + mensaje +
    `error.message` crudo en fuente monoespaciada dentro de un `ScrollView`
    (para poder leerlo si llega como reporte del usuario) + botón
    "Reintentar" que limpia `migrationsError` e incrementa `migrationAttempt`.
  * i18n `migrations.errorTitle`/`errorMsg`/`retryButton` en es/en/fr.
  * Método de prueba usado para validar el camino de error (NUNCA
    comiteado): migración temporal `0018_test_fail.sql` con
    `ALTER TABLE tabla_inexistente_xyz ADD COLUMN foo TEXT` — SQLite la
    rechaza al aplicarla, ejercitando el `.catch()` real de `migrate()`.
    Creada con su entrada correspondiente en `_journal.json` (`when` real
    vía `Date.now()`, mayor que el máximo anterior de idx 17) y en
    `migrations.js`, validada en dispositivo físico (splash normal en el
    camino feliz; pantalla de error legible + reintento funcional al
    forzar el fallo) y revertida por completo (los 3 archivos) antes de
    comitear — `git status --short` confirmado limpio de rastro de la 0018
    en cada paso.
  * `npx tsc --noEmit` limpio antes de comitear.
  * **Plan de endurecimiento pre-beta de esta sesión: CERRADO.** Los 4
    puntos:
    1. `exercise_targets` ya no se resetea al regenerar el plan (migración
       0016, ver sección "Progresión de cargas" más abajo).
    2. Rutina manual protegida contra guardar equipamiento/prioridades
       musculares (ver "Guarda de modo manual en Equipamiento y Prioridades
       musculares" en la sección del Constructor de rutina propia).
    3. `profile.plan_mode` eliminada (migración 0017, ver "Refactor:
       profile.planMode eliminado" más abajo).
    4. Pantalla de error de migraciones con reintento real (esta entrada).
- Hecho: sesión 2026-08-04 (continuación) — **Vínculo perfil-auth, guardas
  de entorno/ubicación, timeout de arranque y fix de peso/altura en
  onboarding** (commits `578df30`, `ceaade9`, `da1ae5a`, `931cf20`,
  `c02e028`; JS + 1 migración manual, sin recompilación):
  * **a) Migración 0018 — `profile.auth_user_id`** (commit `578df30`):
    el perfil local (SQLite) no tenía ningún vínculo explícito con el
    usuario de Supabase autenticado — se asumía "una sola fila de perfil
    por dispositivo". Migración `0018_profile_auth_link.sql`: columna
    `auth_user_id` (nullable, índice único — SQLite permite múltiples
    `NULL` en un índice único, así que instalaciones existentes sin
    backfill todavía no rompen nada). `OnboardingFlow.tsx` la graba desde
    `useAuthStore.getState().session?.user.id` al crear el perfil.
    `_layout.tsx`: backfill silencioso si la fila existente tiene
    `auth_user_id === null` (instalación previa a la migración); si no
    coincide con la sesión activa, oculta el perfil sin borrarlo
    (`console.warn('[Profile] auth_user_id no coincide con la sesion
    activa')`) — decisión de qué hacer con datos huérfanos de una cuenta
    anterior queda pendiente y deliberadamente fuera de este cambio.
    Cimiento fundacional para el futuro sistema de amigos (ver sección
    "Funcionalidad futura: Social", en pausa).
    Se detectó y corrigió una condición de carrera real en el mismo
    cambio: el `useEffect` de carga de perfil en `_layout.tsx` debe
    esperar también a `isAuthLoading`, no solo a `migrationsReady` — la
    verificación de sesión es una llamada de red, más lenta que
    comprobar migraciones ya aplicadas; sin esto, `session` podía leerse
    `null` de forma transitoria en cada arranque.
  * **b) Guarda de variables de entorno en `src/lib/supabase.ts`**
    (commit `ceaade9`): `assertCleanEnvValue()` detecta variable
    ausente, primer carácter no imprimible (el patrón exacto de los
    incidentes de bytes de control 0x02 documentados en "Despliegue —
    variantes de app EAS"), y URL que no empieza por `https://` — los 3
    casos fallan con un mensaje que nombra el `.env` y advierte sobre
    `.env.local`. `.env.example` creado y versionado por primera vez
    (no existía ninguno) con las 2 variables reales del proyecto;
    `EXPO_OS` y `APP_VARIANT` descartadas explícitamente por venir
    inyectadas por Expo/EAS, no ser credenciales de usuario.
  * **c) `equipment.tsx` — guarda de conflicto de ubicación** (commit
    `da1ae5a`): con un plan manual activo en un contexto (ej. `'home'`),
    cambiar `profile.location` a un valor que ya no lo incluye (ej.
    `'gym'`) dejaba el plan activo apuntando a un contexto huérfano.
    Hallazgo de auditoría: `handleStart()` (`training.tsx`) decide el
    contexto de sesión leyendo `profile.location`, no
    `currentPlan.context` (mismo patrón de cálculo duplicado ya conocido
    en el proyecto) — con la ubicación desincronizada, el cardio en vivo
    de `session.tsx` podía recalcularse asumiendo gimnasio mientras la
    fuerza seguía siendo la materializada para casa, en la misma sesión,
    sin ningún aviso. Arreglado en el origen en vez de parchear cada
    consumidor: `equipment.tsx` bloquea el guardado con un diálogo
    explicativo (`locationConflictTitle`/`Msg`/`Button`, es/en/fr) si el
    cambio dejaría el contexto activo fuera de la nueva ubicación,
    remitiendo al constructor de rutina o a mantener `'Ambos'`.
    `training.tsx`, `session.tsx` y `routineBuilder.tsx` quedan intactos.
  * **d) Timeout de arranque en la verificación de sesión** (commit
    `931cf20`) — bug crítico reportado por Juan: la app a veces se
    quedaba pegada en el splash al abrir, hacía falta matar el proceso y
    reabrir. Diagnosticado por un patrón de logs que Juan identificó: en
    los arranques rotos, el log `'[Auth] startup getUser'` nunca llegaba
    a aparecer (siempre presente justo tras `INITIAL_SESSION` en los
    arranques sanos) — el patrón `TOKEN_REFRESHED` sin `getUser` señalaba
    la carrera entre el refresco interno del SDK de Supabase y la
    verificación propia contra el servidor. Causa raíz confirmada por
    auditoría: `supabase.auth.getUser()` en `_layout.tsx` no tenía ningún
    timeout — con mala conexión justo en ese instante, la promesa se
    quedaba colgada sin resolver ni rechazar, `isAuthLoading` permanecía
    en `true` para siempre. `withTimeout()` (helper nuevo en
    `_layout.tsx`, `Promise.race` contra un `setTimeout` que rechaza)
    envuelve `getUser()` + la consulta de estado/sesión inicial (15s), y
    la consulta de `user_status` dentro de `onAuthStateChange` (6s, más
    corto porque ahí la sesión ya es válida — si vence, continúa sin el
    enriquecimiento de trial/pago en vez de bloquear). Al vencer el
    timeout de arranque, NUNCA se asume "no autenticado" — pantalla de
    reintento dedicada (`authCheckTimedOut`, reutiliza
    `MigrationErrorScreen` sin duplicarlo) en vez de expulsar al login;
    nuevo estado `authCheckAttempt` fuerza un remontaje real de la
    verificación al pulsar "Reintentar" (mismo patrón `key` que
    `migrationAttempt`). i18n `migrations.connectionErrorMsg` en es/en/fr.
    Validado forzando modo avión en el dispositivo.
  * **e) Onboarding — peso/altura perdidos al avanzar de inmediato**
    (commit `c02e028`) — dos bugs relacionados, reportados por Juan en
    pruebas de la APK preview:
    1. El peso del onboarding nunca aparecía en el historial de Progreso
       sin reiniciar la app: el `useEffect` de `progress.tsx` dependía
       solo de `[isDbReady]`, que se vuelve `true` antes de terminar el
       onboarding (las tabs ya están montadas de fondo bajo el overlay,
       patrón "overlay" de `_layout.tsx`). `loadAll()` corría una sola
       vez con el estado vacío y nunca se repetía. Mismo patrón ya
       resuelto antes en `history.tsx` (sesión 2026-07-02) — aplicado
       aquí igual: `useFocusEffect` + `useCallback`, import de
       `expo-router` (no de `@react-navigation/native`).
    2. El valor tecleado en los campos de peso/altura del onboarding se
       perdía si el usuario pulsaba "Siguiente" inmediatamente después de
       escribir, sin tocar otro punto de la pantalla antes. Causa real:
       el único punto de guardado en `EditableStepper` era
       `onBlur`/`onSubmitEditing`, y al desmontarse `StepPhysical` (por
       el avance de paso) ese evento podía no llegar a dispararse — no
       una carrera de milisegundos, el evento se perdía sin más.
       Arreglo de raíz: `EditableStepper` comitea en cada tecla
       (`onChangeText`), no solo al perder el foco; `onBlur`/
       `onSubmitEditing` se mantienen como reafirmación inofensiva. De
       paso, `commitHeight` se alineó con `commitWeight` (coma
       normalizada a punto vía `.replace(',', '.')`, `console.warn` de
       diagnóstico si el texto no es parseable).
    Validado en dispositivo físico: avance inmediato tras escribir (el
    caso que fallaba) para peso y altura, flujo normal sin tocar otro
    sitio (intacto), y el caso más exigente (coma + avance inmediato).
  * **f) Backlog de pruebas de la APK preview** (lista de Juan, ampliada
    en sesiones posteriores a 27 puntos numerados — 17 cerrados, 10
    pendientes. NOTA: esta lista es VIVA — los ítems cerrados en
    sesiones posteriores se marcan aquí mismo con su propia fecha, sin
    reescribir la narrativa de la sesión que los originó:
    1. ¿Las lesiones afectan realmente la generación del plan?
    2. ~~El peso no migraba automáticamente al registro de Progreso, y el
       número tecleado en el peso del onboarding se ignoraba (solo
       contaban los botones +/-).~~ CERRADO 2026-08-04 (ver item e).
    3. ~~El gesto/botón de retroceso nativo de Android no funciona en la
       pantalla de prioridades musculares.~~ CERRADO 2026-08-05 (ver
       entrada "sesión 2026-08-05 (continuación)", item a — en realidad
       afectaba a las 6 pantallas overlay, no solo prioridades
       musculares).
    4. ~~Al salir de un entreno sin terminar, el mensaje solo menciona
       series restantes, no también ejercicios restantes.~~ CERRADO
       2026-08-05 (ver entrada "sesión 2026-08-05 (continuación)",
       item b).
    5. Priorizar máquinas sobre peso corporal en gimnasio.
    6. ~~Retomar ejercicios no completados del día anterior.~~ CERRADO
       2026-08-13 (Étapa 3 del chantier #6+#18, la pieza final y original
       de este punto — `isRestored` en `SetState` + `getRestoredSets()`
       en `session.store.ts`: al reabrir un día parcial, las series ya
       completadas en una sesión anterior del mismo ciclo se restauran de
       solo lectura, con banner ámbar informativo del conteo).
    7. ~~Usuario pide 60 min de entreno, el plan generado dura ~33 min.~~
       CERRADO 2026-08-05 (ver entrada de esa sesión, item b).
    8. Poder cambiar días/duración de entreno después del onboarding.
    9. Revisar si la lista de equipamiento de casa es toda pertinente.
    10. Demasiadas preguntas al iniciar/terminar sesión — preferencias
       por defecto configurables (calentar/estirar/lugar) en modo
       híbrido, sin perder la opción de seguir preguntando todo.
    11. ~~La app a veces se quedaba pegada al arrancar (splash infinito),
       hacía falta matarla y reabrirla.~~ CERRADO 2026-08-04 (ver item d).
    12. ~~Historial fantasma: un día sin ninguna serie completada aparece
       igual en el historial con 0 series.~~ CERRADO 2026-08-05 (ver
       entrada de esa sesión, item a).
    13. ~~Like/dislike de ejercicios sigue apareciendo como opción en
       rutinas del constructor manual, donde no tiene sentido (el
       usuario ya elige el ejercicio a mano).~~ CERRADO 2026-08-07 (ver
       entrada de esa sesión — oculto en las 2 pantallas donde aparecía
       sin condición: sesión en vivo y ExerciseCard en Entreno).
    14. ~~Cuando la app pasa a segundo plano, el cronómetro de descanso se
       detiene y deja de contar.~~ CERRADO 2026-08-07 (ver entrada de esa
       sesión — ancla de timestamp real restTimerEndAt + AppState).
    15. ~~El "coach" en vivo (recomendación de peso/reps entre series) no
       funcionaba bien: peso cayendo a 0 en máquinas de gimnasio nuevas,
       máquina asistida sin lógica propia, RIR ignorado con reps ya en
       rango.~~ CERRADO 2026-08-05 (ver entrada "sesión 2026-08-05
       (continuación)", item c — el hallazgo más importante de la
       sesión).
    16. No hay instrucciones escritas para los ejercicios en el botón
       "Guía" de la sesión en vivo — sigue diciendo "próximamente" (ver
       FASE 9b en "Estado actual").
    17. ~~Si un ejercicio se repite el mismo día (ej. press de hombros en
       máquina dos veces), el peso puesto en la 1.ª vez no migra
       automáticamente a la 2.ª — hay que volver a teclearlo. Debería
       verse la progresión al instante.~~ CERRADO 2026-08-07 (ver entrada
       de esa sesión — completeSet propaga peso/reps/coach a toda
       instancia hermana con el mismo exerciseId).
    18. ~~No se puede elegir libremente qué día entrenar — el orden del
       ciclo (ej. día 1 pull, día 2 push, día 3 legs) es obligatorio, sin
       poder empezar por legs.~~ CERRADO 2026-08-13 — entregado por las
       Étapas 1 a 2c del chantier #6+#18 (2026-08-11/12: selector de día
       directo por id real de `plan_days`, banner de día obsoleto,
       contador semanal real, y bloqueo de reselección de días ya
       completos al 100%). Mantenido abierto a propósito hasta la Étapa 3
       (punto #6, arriba) por decisión de Juan, para cerrar ambos juntos.
    19. El coach asume incrementos de peso de 1 en 1 kg, pero las
       máquinas de gimnasio reales incrementan de 15 en 15 libras (o 10
       en 10, según máquina) — el kg mostrado es la conversión. Los
       discos de barra son de 5 en 5 kg; las mancuernas, de 1 en 1 kg.
       Pendiente: ajustar la granularidad real de EQUIP_INC por tipo de
       equipo, no un único valor por EquipLocal.
    20. ~~El campo de peso (Kg) en la sesión en vivo reselecciona todo el
       texto tras cada tecla, impidiendo escribir números de 2+ dígitos
       sin que se borren los dígitos anteriores.~~ CERRADO 2026-08-07 (ver
       entrada de esa sesión — diagnosticado con logs reales en 2 rondas;
       causa real: onSelectionChange propio deshacía la selección recién
       fijada).
    21. ~~El texto "mantén X kg" en computeCoach es engañoso cuando en
       realidad el peso sugerido sube (rama "bajo mín" de computeCoach,
       session.store.ts — dir solo distingue isDown, nunca contempla
       isUp como caso propio ahí; señalado en auditoría de esta sesión,
       sin corregir).~~ CERRADO 2026-08-07 (ver entrada de esa sesión).
    22. ~~¿runProgressionAfterSession/progression.ts tiene el mismo hueco
       de clasificación de equipamiento que tenía computeCoach?
       CONFIRMADO en auditoría de esta sesión: getEquipmentType()
       (progression.ts:53-59) es AÚN MÁS limitado que el getEquipLocal()
       original de computeCoach — ni siquiera reconoce
       cableMachine/legPressMachine (solo
       barbellPlates/dumbbells/kettlebells), así que cualquier máquina
       cae en 'bodyweight' → getMinIncrement() devuelve 0 →
       roundToIncrement() redondea a la décima más cercana en vez de a
       la granularidad real de la máquina.~~ CERRADO 2026-08-06 (ver
       entrada de esa sesión — unificación final en
       src/lib/equipmentClassification.ts, compartido entre computeCoach
       y computeNextTargets).
    23. ~~weightedVest (chaleco lastrado, 9 ejercicios incl. dominadas y
       fondos lastrados) caía en getEquipLocal como 'bodyweight' pese a
       llevar peso real añadido.~~ CERRADO 2026-08-06 (ver entrada de esa
       sesión — nuevo EquipLocal 'weighted_vest', inc 1kg, sin rama nueva
       en computeCoach).
    24. ~~Las dos funciones replaceExercise (workout.store.ts, botón
       'Cambiar ejercicio' en Entreno; session.store.ts, botón
       'Intercambiar' en vivo) solo cambiaban exerciseId, heredando
       sets/reps/restSeconds/isCompound del ejercicio original.~~ CERRADO
       2026-08-06 (ver entrada de esa sesión — reconstrucción completa
       vía buildPlanned/buildExerciseState, con recorte automático de
       series sobrantes si el nuevo ejercicio pide menos).
    25. ~~El banner de calibración "Primera vez — indica tu peso de
       partida" usaba una tercera lista de equipo hardcodeada en
       session.tsx, desactualizada frente a getEquipLocal (no mostraba
       el banner en máquinas del Lote 11 como pec deck).~~ CERRADO
       2026-08-06 (ver entrada de esa sesión — isLoadedExercise ahora
       deriva de getEquipLocal en vez de mantener su propia copia).
    26. ~~En la rama "bajo el mínimo" de un ejercicio cargado,
       computeCoach devolvía reps: done.actualReps (las reps recién
       falladas) en vez de reps: planRepsMin (el objetivo real) —
       inconsistente con todas las demás ramas de la función. Bug nuevo
       encontrado por Juan validando el #21, no una idea preexistente.~~
       CERRADO 2026-08-07 (ver entrada de esa sesión).
    27. Notificación local puntual con sonido (vía expo-notifications)
       cuando el descanso termina con la app en segundo plano —
       identificada, no implementada. (Nota aparte, no forma parte del
       conteo de 27 puntos: idea "#28" — notificación PERSISTENTE con
       cronómetro en vivo, tipo foreground service — DESCARTADA a
       propósito por Juan el 2026-08-07, demasiado compleja para el
       valor que aporta. No retomar sin petición explícita futura.)
  * Todo verificado con `npx tsc --noEmit` limpio en cada paso de esta
    sesión.
- Hecho: sesión 2026-08-05 — **Historial fantasma + duración real del
  plan** (commits `d326211` y `82d81fc`; JS puro, solo recarga). Dos
  items del backlog de 12 puntos de la APK preview (#12 y #7). Mismo
  protocolo de siempre: auditoría de SOLO LECTURA con código literal
  pegado antes de cada bloque de cambios, cambios acotados a archivos
  explícitamente permitidos, y verificación matemática a mano (cruzada
  con un script Node aislado, fuera del repo) antes de tocar el
  dispositivo:
  * **a) #12 — historial fantasma** (`d326211`): `finishSession()`
    (`session.store.ts`) insertaba en `workoutSessions` de forma
    INCONDICIONAL — abrir una sesión y salir sin completar ni una serie
    dejaba un día "fantasma" de 0 series en el Historial. Confirmado en
    auditoría que no había ningún guard en toda la cadena: ni en
    `handleFinish()`/`doFinish()` (`session.tsx`, el diálogo
    `'incomplete'` es un aviso con botón habilitado, no un bloqueo), ni
    antes del `db.insert`, ni en la consulta de `history.tsx` (que trae
    las 50 sesiones más recientes sin `.where(...)` alguno).
    Fix: si `completedSetsCount === 0` al terminar, se devuelve el estado
    vacío sin tocar la base de datos — sin fila en `workoutSessions`, sin
    `sessionSets`, sin `markExerciseUsed`, sin
    `runProgressionAfterSession`. La lógica para `completedSetsCount > 0`
    quedó intacta (verificado con `git diff`: solo 7 líneas añadidas).
    **DECISIÓN DELIBERADA, no olvido**: `advanceDayIndex()` e
    `incrementDaysFinishedThisWeek()` (`session.tsx:441` y `:443`) siguen
    ejecutándose incondicionalmente también para este caso. Se deja así a
    propósito porque Juan prepara un cambio mayor — poder elegir
    libremente qué día entrenar, en vez del orden secuencial actual —
    que hará obsoleta esta distinción de todas formas.
  * **b) #7 — duración pedida vs. plan generado** (`82d81fc`, 7
    archivos, +109/−35): Juan pedía 60 min de entreno y recibía un plan
    de ~33 min. **Causa raíz**: `getExerciseCounts()` era una tabla fija
    de compuestos/aislamientos por rango de minutos, escrita a mano y
    **nunca calibrada contra `estimateDuration()`** (la fórmula real que
    la propia app usa para MOSTRAR la duración: `sets × (45 + descanso)`
    por ejercicio, en `training.tsx`). Las dos fórmulas no se conocían
    entre sí. Reproducido exactamente en la auditoría (33 min clavados)
    antes de tocar nada.
    - `getExerciseCounts` → **`computeExerciseCounts(minutes,
      goalPrimary, goalSecondary)`**. El rename fue INTENCIONAL, para
      forzar la revisión de cada consumidor (mismo criterio que
      `getAllExerciseTargets` en la migración 0016). Ahora deriva los
      conteos de la fórmula real: añade ejercicios en round-robin
      sesgado 2:1 a compuestos (patrón C,C,I,C,C,I…), aceptando cada uno
      solo mientras ACERQUE el costo acumulado al presupuesto en
      segundos; para en cuanto lo alejaría. Sin techo artificial. Suelo
      obligatorio: nunca `compounds: 0`.
    - **⚠️ 4 consumidores, solo 1 resta cardio — fácil de romper por
      accidente**: `plan-generator.ts` (plan automático),
      `routineTemplates.ts` (`createTemplate`), `routineMaterializer.ts`
      (`materializeTemplate`) y `routineBuilder.tsx`
      (`generateAutoCardioSeed`). **SOLO `generatePlan()` resta cardio
      del presupuesto de fuerza.** Los 3 del constructor manual NO restan
      nada — es la decisión de producto ya existente ("el cardio se
      añade, nunca resta huecos de fuerza" en modo manual), respetada sin
      cambios. Confirmado en auditoría que `subtractCardioSlots` tenía un
      único call site y ni siquiera era exportable.
    - En `generatePlan()`, el cardio se resta ahora en **SEGUNDOS
      REALES** según contexto, no como huecos aproximados:
      `CARDIO_BLOCK_SECONDS` (600s, exportada de `cardioSelection.ts` —
      único cambio en ese archivo, solo el modificador `export`) por slot
      en gimnasio; ~780s por slot en casa (2 sesiones de 300s + su
      descanso de 90s). Con tope: el cardio nunca supera la mitad del
      presupuesto total. `subtractCardioSlots` eliminada (código muerto
      tras el cambio).
    - La reducción de fuerza que sigue compara **DISTANCIAS** antes de
      cada paso ("¿esto acerca o aleja del objetivo?"), no un simple "no
      te pases" — mismo criterio que `computeExerciseCounts`. Sin esto,
      perfiles YA cerca del objetivo empeoraban al reducir: caso real
      detectado en la verificación matemática (no en dispositivo), 90 min
      pedidos → 91.5 min sin reducir vs. 83 min con la reducción ciega
      original.
    - **`estimateCardioDuration()`** nueva en `training.tsx`: el número
      de minutos que ve el usuario en la pantalla del día ahora incluye
      el cardio. Antes solo sumaba la fuerza — el tiempo del bloque de
      cardio no aparecía por ningún lado.
    - `mapDayRows()` (`workout.store.ts`) blindada contra el centinela
      `'[]'` de cardio aún no calculado: `JSON.parse('[]')` devuelve un
      ARRAY vacío, no un objeto `{gym, homeSessions}` — leer `.gym` sobre
      eso revienta. Hasta ahora nadie leía esos campos en el render, así
      que estaba protegido de forma indirecta por cómo filtra
      `trainableDays`; `estimateCardioDuration()` es el primer punto que
      de verdad los lee en CADA render de la pantalla de hoy, así que el
      riesgo dejó de ser teórico.
    - **Verificación matemática con 4 perfiles ANTES de tocar el
      dispositivo** (gym/casa, con/sin cardio, sesiones cortas y largas):
      60min hipertrofia+fat_loss/gym → 58 min; 60min hipertrofia/gym →
      59 min; 45min fat_loss/casa → 44 min; 90min fuerza/gym → 92 min.
      Márgenes de 1-2 min (el de 90 min queda en +2 por la granularidad
      inherente de añadir/quitar un ejercicio entero), frente a los ~27
      min de brecha del bug original.
  * `npx tsc --noEmit` limpio verificado en cada paso de la sesión.
- Hecho: sesión 2026-08-05 (continuación) — **Botón atrás de Android,
  mensaje de sesión incompleta, y saga completa del coach en máquinas de
  gimnasio (#15)** (commits `2817a74` y `228a35f`; JS puro, solo
  recarga). Cierra 3 puntos más del backlog (#3, #4, #15) — mismo
  protocolo de auditoría-antes-de-tocar de toda la sesión:
  * **a) #3 — botón/gesto atrás de Android en overlays** (`2817a74`):
    confirmado que la app monta 6 pantallas overlay controladas por
    flags de Zustand (no rutas de Expo Router) sin ningún manejo del
    botón atrás — solo `SessionScreen` lo tenía (`BackHandler` propio).
    Nuevo hook compartido `useAndroidBack(active, onBack)`
    (`src/hooks/use-android-back.ts`) añadido a las 6:
    `equipment.tsx`, `musclePriorities.tsx`, `exercisePreferences.tsx`,
    `routineBuilder.tsx`, `warmup.tsx`, `cooldown.tsx` — cada una
    reutilizando su propia función de cierre ya existente (la misma que
    su flecha de la app), sin inventar lógica nueva.
    `VulcanDialog`/`VulcanBottomSheet` **NO se tocaron a propósito**:
    la auditoría encontró que ambos ya usan
    `<Modal transparent onRequestClose={dismiss}>` nativo — Android
    intercepta el atrás a nivel de ventana antes de que el
    `BackHandler` de JS entre en juego; añadir el hook ahí habría sido
    redundante y arriesgado (listener duplicado compitiendo con el
    mecanismo nativo). Decisión de producto confirmada explícitamente:
    salir de Prioridades Musculares sin guardar sigue descartando en
    silencio, igual que la flecha — no se añadió confirmación.
  * **b) #4 — mensaje de sesión incompleta** (`2817a74`, mismo commit):
    el diálogo `finishState==='incomplete'` (`session.tsx`) solo
    mencionaba series pendientes. Ahora también cuenta ejercicios
    (`pendingExerciseCount`, cualquiera con al menos 1 serie sin
    completar — `exercises.filter(ex => ex.sets.some(s =>
    !s.completed)).length`), mostrando ambos números. Nota técnica:
    `{{count}}` es una clave reservada por i18next para pluralización
    automática — el segundo número usa `{{exercises}}`, nunca un
    segundo `{{count}}`. 3 idiomas actualizados (`finishIncompleteMsg`
    en es/en/fr).
  * **c) #15 — saga completa del coach en vivo, EL HALLAZGO MÁS
    IMPORTANTE de esta sesión** (`228a35f` — **un único commit, no
    tres**: las 3 correcciones lógicas de abajo se hicieron en pasos
    separados dentro de la conversación, pero nunca se pidió comitear
    entre ellos, así que quedaron fundidas en un solo commit al cierre
    de sesión — confirmado con `git log`/`git show` antes de escribir
    esta entrada, en vez de asumir la premisa original de "3 commits"):
    - **Causa raíz diagnosticada ANTES de tocar código**:
      `getEquipLocal()` (`session.store.ts` — función DISTINTA de
      `getMinIncrement()`/`getEquipmentType()` en `progression.ts`, ver
      hallazgo del punto 22 más abajo) solo reconocía 5 de los 34
      `EquipmentKey` del catálogo (`barbellPlates`, `dumbbells`,
      `kettlebells`, `cableMachine`, `legPressMachine`). Cualquier
      máquina de las 13 añadidas en el Lote 11 (`chestPressMachine`,
      `shoulderPressMachine`, `seatedRowMachine`, `smithMachine`,
      `pecDeckMachine`, `tBarRowMachine`, `hipThrustMachine`,
      `abMachine`, `hipAbductorMachine`, `hipAdductorMachine`,
      `calfMachine`, `assistedMachine`, `cardioMachine`) caía en
      `'bodyweight'` por el `return` final, pese a trackear un
      `weightKg` real → `computeCoach` tomaba la rama de peso corporal
      (`kg: 0` siempre) → `completeSet` (que solo propaga peso si
      `hint.kg > 0`) dejaba el peso caído a 0 en la siguiente serie la
      primera vez que el usuario hacía ese ejercicio (sin historial de
      progresión previo). Diagnosticado con una **simulación a mano de
      los 2 casos exactos reportados por Juan, ANTES de tocar ningún
      código**, reproduciendo sus mensajes palabra por palabra ("6 reps
      (bajo rango) → apunta a 5" y "Te quedó fácil... → prueba variante
      difícil o añade lastre") bajo la hipótesis de clasificación
      errónea — coincidencia exacta, confirmando la causa raíz sin
      ambigüedad antes de escribir el fix.
    - Fix: 12 `EquipmentKey` (11 máquinas + `assistedMachine`, más
      `cardioMachine` por corrección aunque es código muerto — los
      ejercicios `category:'cardio'` nunca entran a
      `exercises: ExerciseState[]`, viven en `PlanDayData.cardio`
      aparte) añadidas a `getEquipLocal()`, todas clasificadas como
      `'machine'` (`inc: 5`) en un primer paso.
    - `assistedMachine` se separó a su propio `EquipLocal`
      (`'assisted'`, `inc: 5`), auditado sin evidencia de peso inverso
      en el catálogo o en el código antes de decidirlo (solo 2
      ejercicios, `assisted_pullup`/`assisted_dip`, sin ningún
      campo/flag especial) — pero la asistencia SÍ es inversa por
      diseño real de la máquina (más asistencia = más fácil), así que
      se le dio una rama dedicada en `computeCoach` en vez de reutilizar
      la fórmula de e1rm (pensada para carga real, no aplica aquí).
      Nunca emite `kg: 0` — piso garantizado en 1 incremento
      (`Math.max(peso - inc, inc)`).
    - La rama `'assisted'` inicial solo miraba `actualReps` para decidir
      si recomendar algo — hueco expuesto por Juan con un caso real (11
      reps dentro de 8-12, RIR 5 → no disparaba nada, porque el RIR
      nunca se miraba con reps ya en rango). Corregido combinando reps Y
      RIR (`tooHard`/`tooEasy`, reutilizando la misma fórmula
      `serieDura = rir < targetRir || rir <= 1` que ya usa la rama
      genérica de equipo cargado) — mismo principio que esa rama
      genérica ya tenía (RIR es señal independiente del rango de reps),
      llevado a la rama nueva.
    - **Confirmado explícitamente en auditoría**: `computeCoach` (ni su
      trigger `completeSet`) NO distingue en ningún punto entre plan
      manual y automático (`planId`/`source` nunca se leen ahí) — el
      bug nunca fue específico de un modo, es general y depende solo de
      qué ejercicio/equipo esté en juego.
  * **d) Backlog ampliado a 22 puntos** (antes 12): `#3`, `#4`, `#7`,
    `#12`, `#15` marcados CERRADOS con fecha (algunos ya lo estaban de
    sesiones previas — verificado antes de duplicar marcas). Añadidos
    `#13`-`#22` con el texto exacto que dio Juan, incluyendo `#18`
    (elegir día de entreno libremente) fusionado explícitamente con el
    `#6` ya existente (mismo cambio, que Juan prepara en paralelo fuera
    de esta sesión) y `#19` (granularidad real de incrementos de peso
    por tipo de máquina — libras vs kg, discos de 5kg, mancuernas de
    1kg — pendiente, `EQUIP_INC` sigue con un valor único por
    `EquipLocal`). **`#22` se investigó y CONFIRMÓ en esta misma
    auditoría** (no quedó como pregunta abierta): `getEquipmentType()`
    (`progression.ts:53-59`) tiene el mismo hueco que tenía
    `computeCoach` — y más amplio, porque ni siquiera reconoce
    `cableMachine`/`legPressMachine` (solo
    `barbellPlates`/`dumbbells`/`kettlebells`) — cualquier máquina cae
    en `'bodyweight'` → `getMinIncrement()` devuelve `0` →
    `roundToIncrement()` (línea 71-74) redondea a la décima más cercana
    en vez de a la granularidad real de la máquina. Sin corregir —
    mismo patrón de fix que `#15`, pendiente para `progression.ts`.
    Total: 22 puntos numerados, 7 cerrados
    (`#2,#3,#4,#7,#11,#12,#15`), 15 pendientes.
  * `npx tsc --noEmit` limpio en cada paso.
- Hecho: sesión 2026-08-06 — **Saga completa de clasificación de
  equipamiento: RIR en peso corporal, weightedVest (#23), replaceExercise
  x2 (#24), banner de calibración (#25), unificación final (#22)**
  (commits `fa193e7`, `13fe334`, `5df25da`, `36dfb1a`, `47ab371`; JS
  puro, sin módulos nativos — solo recarga). Mismo protocolo de
  auditoría-antes-de-tocar de toda la sesión, cada paso verificado con
  `npx tsc --noEmit` limpio y simulaciones a mano (algunas cruzadas con
  Node real, no solo aritmética manual) antes de tocar el dispositivo:
  * **a) RIR en la rama `bodyweight` de `computeCoach`** (`fa193e7`):
    dentro de rango, la rama `bodyweight` siempre devolvía `null` sin
    mirar el RIR — solo reaccionaba al tocar el techo o el mínimo de
    reps. Ahora, dentro de rango: RIR por encima del objetivo empuja el
    objetivo de reps hacia el techo (sin pasarlo); RIR muy bajo avisa
    "mantén" sin cambiar el número (peso corporal puro no tiene una
    palanca de peso que mover). El caso "bajo el mínimo" se deja
    deliberadamente sin mirar el RIR — fallar el rango ya es la señal
    más clara posible. **Decisión de producto confirmada por Juan en la
    validación**: al superar ampliamente el techo de reps con RIR alto,
    el objetivo baja al techo en vez de seguir subiendo — comportamiento
    YA EXISTENTE en `computeCoach` (no de este cambio), revisado y
    mantenido a propósito (evita reps infinitas, empuja a subir
    dificultad real en vez de solo repeticiones).
  * **b) #23 — `weightedVest` clasificado como equipo cargado**
    (`13fe334`): los 9 ejercicios con `weightedVest` (incl.
    `weighted_vest_pullup`/`weighted_vest_chinup`) caían en
    `getEquipLocal` como `'bodyweight'` pese a llevar peso real añadido
    — mismo mecanismo del bug de las máquinas del Lote 11.
    `LOADED_REST` (descanso por defecto) ya trataba `weightedVest` como
    equipo "cargado" — la inconsistencia confirmó que era un olvido, no
    una decisión. A diferencia de `assistedMachine`, no hizo falta
    ninguna rama nueva en `computeCoach`: más peso en el chaleco es más
    difícil, misma dirección que cualquier equipo cargado normal. Nuevo
    `EquipLocal` `'weighted_vest'`, incremento `1kg` (conservador:
    chalecos rígidos suelen venir con peso fijo sin ajuste, los
    modulares de placa/arena ajustan típicamente de 1kg en 1kg).
  * **c) #24 — dos `replaceExercise` distintas no recalculaban nada al
    cambiar de ejercicio** (`5df25da` y `36dfb1a`): `replaceExercise`
    (`workout.store.ts`, botón "Cambiar ejercicio" en Entreno) y
    `replaceExercise` (`session.store.ts`, botón "Intercambiar" en
    vivo) — dos funciones DISTINTAS con el mismo hueco — solo cambiaban
    `exerciseId`, heredando `sets`/`reps`/`restSeconds`/`isCompound` del
    ejercicio ORIGINAL. Como `getAlternatives` no restringe por
    `isCompound`, un intercambio podía cruzar de compuesto a aislamiento
    (o al revés) y de barra a no-barra dentro de la misma `category`,
    dejando reps con un rango bajo indebido, sets con el número
    equivocado, y `restSeconds` heredado salvo que coincidiera
    casualmente con `90`.
    - `workout.store.ts`: `replaceExercise` recibe `profile` nuevo y
      reconstruye el `PlannedExercise` completo con `buildPlanned` (la
      misma función que ya usa el generador automático y el constructor
      manual), según `getRepScheme` del objetivo del usuario y el
      `isCompound` real del ejercicio NUEVO.
    - `session.store.ts`: se extrajo `buildExerciseState()` del cuerpo
      de `startSession` (el cálculo de `effMin`/`effMax`/`targetInit`/
      `restSeconds` que antes vivía inline) para compartirla entre el
      arranque de sesión y el intercambio en vivo — evita una tercera
      implementación del mismo cálculo. `startSession` se refactorizó
      para usarla sin cambiar su comportamiento (verificado por
      regresión, campo por campo, mismo resultado). `replaceExercise`
      (en vivo) ahora recibe `profile` y reconstruye el `ExerciseState`
      completo con `buildPlanned` + `buildExerciseState`.
    - **Decisión de Juan**: si el nuevo ejercicio tiene menos series
      planificadas, las filas sobrantes se recortan automáticamente —
      sale gratis del diseño, porque el array de series se construye
      desde cero con el tamaño correcto en vez de heredarse.
  * **d) #25 — banner de calibración con una tercera lista de equipo
    independiente** (`36dfb1a`, mismo commit que el cierre de
    `session.store.ts` del punto c): investigando un reporte de Juan (el banner
    "Primera vez — indica tu peso de partida" no aparecía en máquinas
    del Lote 11 como pec deck), se encontró que `isLoadedExercise`
    (`session.tsx`) mantenía su PROPIA lista hardcodeada de equipo
    cargado, independiente de `getEquipLocal` — desactualizada desde
    que ese se corrigió para las máquinas del Lote 11 y
    `assistedMachine` (ese fix solo tocó `session.store.ts`, no
    `session.tsx`). En vez de parchear la lista a mano otra vez (se
    desincronizaría de nuevo con el próximo equipo nuevo),
    `getEquipLocal` se exportó desde `session.store.ts` e
    `isLoadedExercise` ahora deriva de ella (`!== 'bodyweight'`) en vez
    de mantener su propia copia.
  * **e) #22 — unificación final: `EquipLocal`/`getEquipLocal`/
    `EQUIP_INC` a un módulo compartido** (`47ab371`): `progression.ts`
    (`getEquipmentType`/`getMinIncrement`, el sistema de progresión de
    FIN de sesión) tenía el mismo hueco que ya se había corregido en
    `computeCoach` — y peor: ni siquiera reconocía
    `cableMachine`/`legPressMachine`. En vez de expandir
    `getEquipmentType` por separado (habría sido la 4.ª copia de la
    misma lógica, tras `getEquipLocal`, el propio `getEquipmentType`, y
    la lista hardcodeada de `session.tsx` ya corregida en el punto d),
    se extrajo `EquipLocal`/`getEquipLocal`/`EQUIP_INC` a un módulo
    nuevo, `src/lib/equipmentClassification.ts`, importado ahora por
    `session.store.ts` y `progression.ts` por igual. Necesario, no solo
    prolijo: `session.store.ts` ya importaba de `progression.ts`, así
    que `progression.ts` importando directo de `session.store.ts`
    habría cerrado un ciclo real.
    - Las Reglas 4 y 2 de `computeNextTargets` quedan intactas (son
      agnósticas a la dirección). Las Reglas 5 (2 fallos seguidos del
      mínimo) y 3 (tocar el techo con buen RIR) ganan una rama para
      `equipmentType === 'assisted'` que invierte la aritmética (subir
      asistencia si falló el mínimo, bajarla si superó el techo con
      buen RIR, nunca menos de 1 incremento) — mismo principio ya
      validado en el coach en vivo.
    - Verificado con 4 simulaciones ejecutadas en Node real (no solo a
      mano): cero regresión para barra/mancuerna/kettlebell/peso
      corporal (mismos 4 valores compartidos de antes, sin cambios);
      máquina normal ahora sí entra en la Regla 5 tras fallar el mínimo
      2 veces (antes nunca se disparaba, `increment` era `0`); máquina
      asistida sube asistencia al fallar el mínimo y la baja al ser
      fácil, con piso en 1 incremento sin llegar nunca a 0.
    - Validado en dispositivo físico a lo largo de varias semanas
      reales de uso: progresión correcta en barra, máquina normal
      subiendo peso al tocar el techo con buen RIR, y máquina asistida
      bajando asistencia correctamente. Un caso de Juan (asistida, 20kg
      RIR5) no bajó como se esperaba en primera instancia —
      diagnosticado en conjunto: las repeticiones no habían tocado el
      techo del rango esa sesión, condición real y buscada de la Regla
      3 (solo actúa si TODAS las series llegaron al máximo), no un bug.
  * **Con esto, las 3 copias independientes de clasificación de equipo
    que existían en el proyecto** (`computeCoach`, el banner de
    calibración, `progression.ts`) **quedan unificadas en una sola
    fuente** (`src/lib/equipmentClassification.ts`).
  * Backlog: `#15` ya estaba cerrado desde la sesión anterior (sin
    duplicar marca); `#22` marcado CERRADO; añadidos `#23`, `#24`,
    `#25` ya CERRADOS con fecha 2026-08-06 (encontrados y arreglados en
    la misma sesión). Nota especial en `#19` (granularidad real de
    incrementos por tipo de equipo — libras vs kg, discos de 5kg,
    mancuernas de 1kg): sigue abierto, pero ahora es más barato de
    resolver — una sola tabla `EQUIP_INC` en un solo archivo en vez de
    varias copias — valores reales pendientes de ajustar según lo que
    reportó Juan con fotos de gimnasio reales.
    **Total: 25 puntos numerados, 11 cerrados
    (`#2,#3,#4,#7,#11,#12,#15,#22,#23,#24,#25`), 14 pendientes
    (`#1,#5,#6,#8,#9,#10,#13,#14,#16,#17,#18,#19,#20,#21`).**
  * `npx tsc --noEmit` limpio en cada paso de esta sesión.
- Hecho: sesión 2026-08-07 — **5 arreglos en sesión en vivo + cronómetro
  de descanso con ancla real** (commits `cd97934`, `9240566`; JS puro,
  sin módulos nativos — solo recarga). Mismo protocolo de
  auditoría-antes-de-tocar de toda la sesión, cada paso verificado con
  `npx tsc --noEmit` limpio y, para el cronómetro, simulación matemática
  antes de tocar el dispositivo:
  * **a) commit `cd97934` — 5 arreglos (session.tsx, session.store.ts,
    ExerciseCard.tsx)**:
    - **#13 — like/dislike oculto en modo manual, en las 2 pantallas
      donde aparecía sin condición**: el primer intento (sesión anterior)
      solo cubrió la sesión en vivo (`session.tsx`); Juan encontró que
      persistía en la tarjeta de Entreno (`ExerciseCard.tsx`). Ambas
      ahora condicionadas por `currentPlan?.source !== 'manual'`
      (`useWorkoutStore` importado en `ExerciseCard.tsx`, no estaba
      disponible antes). Sigue visible en modo automático.
      `ChangeExerciseModal` y la pantalla dedicada de preferencias
      quedan sin tocar a propósito, no decidido todavía. El botón
      conserva efecto real sobre el motor de generación en modo manual
      (sigue filtrando recomendaciones futuras en los puntos ya
      conectados) — se oculta solo de la UI, por decisión de Juan.
    - **#17 — propagación entre instancias repetidas del mismo
      ejercicio**: cuando el mismo ejercicio aparece 2 veces el mismo día
      (2 entradas separadas en `exercises[]`, antes completamente
      aisladas entre sí — confirmado en auditoría previa), completar una
      serie en la 1.ª aparición ahora propaga peso/reps Y la evaluación
      completa de `computeCoach` a la siguiente serie pendiente de cada
      aparición hermana (`exercises.forEach` sobre las que comparten
      `exerciseId`, dentro de `completeSet`) — decisión de Juan: simetría
      total, no solo copia en crudo. Cada instancia conserva su propio
      `planRepsMin`/`planRepsMax`/`targetRir` (nunca se fuerzan desde la
      instancia origen). `equip` se movió fuera del scope local del
      `if (nextIdx !== -1)` para poder reutilizarse en el bloque de
      propagación.
    - **#20 — campo Kg reseleccionaba todo el texto tras cada tecla**:
      diagnosticado con logs reales en dispositivo, en 2 rondas (no solo
      lectura de código). 1.ª hipótesis — control manual de `selection`
      conviviendo con `selectTextOnFocus` — insuficiente por sí sola
      porque ambos peleaban entre sí (`selectTextOnFocus` se reaplicaba
      tras cada cambio). 2.ª ronda de logs reveló la causa real: el
      propio `onSelectionChange` del campo deshacía la selección recién
      fijada, reaccionando a un evento intermedio de Android en vez del
      final. Arreglado quitando `selectTextOnFocus` Y `onSelectionChange`
      por completo — la selección se gestiona solo en `onFocus`
      (selecciona todo el texto a mano) y `onChangeText` (cursor al final
      tras cada tecla), sin escuchar el retorno del sistema.
    - **#21 — texto "mantén X kg" engañoso cuando el peso sugerido en
      realidad sube**: corregido a "sube a X kg" cuando `isUp` (variable
      que ya existía en el mismo bloque de `computeCoach`, sin usar en
      esa rama).
    - **#26 (nuevo) — reps sin actualizar en la rama "bajo el mínimo"**:
      bug encontrado por Juan validando el #21. `computeCoach` devolvía
      `reps: done.actualReps` (las reps recién falladas) en vez de
      `reps: planRepsMin` (el objetivo real) — inconsistente con TODAS
      las demás ramas de la misma función (sobre máximo, serieDura,
      isUp, isDown — todas devuelven `planRepsMin`). Alineado.
  * **b) commit `9240566` — cronómetro de descanso corregido (#14)**:
    `restTimerSeconds` decrementaba 1 en cada tick de un `setInterval`,
    sin ningún anclaje a un reloj real — Android suspende el
    `setInterval` en segundo plano (comportamiento normal del sistema), y
    el tiempo pasado se perdía: al volver, el contador retomaba donde se
    había quedado, no donde debería estar. Añadido `restTimerEndAt`
    (timestamp de fin, `number | null`), calculado al arrancar el timer y
    recalculado en cada tick como
    `Math.round((restTimerEndAt - Date.now()) / 1000)`, en vez de restar
    1 ciegamente. Los 2 puntos que arrancan el timer (`startRestTimer` y
    `completeSet`, que también lo arma por su cuenta al completar una
    serie) y `adjustRest` (±15s) actualizan el ancla junto con el número
    mostrado. `AppState` (primera vez que se usa en el proyecto —
    confirmado por grep, 0 usos previos) añadido en un `useEffect` nuevo
    y separado del `useEffect` del `setInterval` (que sigue corriendo
    igual, cada segundo, ahora solo recalculando en vez de restar) para
    corregir el número en pantalla en el instante de volver a la app, sin
    esperar al siguiente tick natural.
    - Verificado con simulación antes de tocar el dispositivo:
      `startRestTimer(90)` en t=0, 30s de "segundo plano" simulados
      (t=5000 a t=35000, sin ningún tick) — con la lógica nueva, el
      primer tick al volver da 55 (90-35=55, correcto); con la lógica
      vieja habría dado 89 (resta 1 sin importar el tiempo real
      transcurrido), que es el bug reportado por Juan.
  * Validado en dispositivo físico (ambos commits): like/dislike oculto
    en manual en las 2 pantallas y visible en automático; peso y coach
    propagados entre instancias repetidas; campo de peso acepta números
    de 2+ dígitos y sigue seleccionando todo al primer toque; mensaje de
    subida correcto; reps objetivo actualizadas tras fallar el mínimo;
    tiempo real de descanso reflejado al volver de otra app; sonido y
    vibración se disparan correctamente si el descanso terminó durante la
    ausencia; ±15s siguen sincronizados con el ancla nueva.
  * Backlog: `#13`, `#14`, `#17`, `#20`, `#21` marcados CERRADOS con
    fecha 2026-08-07 (ambos commits de esta sesión son del mismo día,
    confirmado por `git log --format=%ad`); añadido `#26` (el bug de
    reps) ya CERRADO con la misma fecha; añadido `#27` (notificación
    local puntual vía `expo-notifications` cuando el descanso termina en
    segundo plano) como pendiente — identificado, no implementado. Idea
    "#28" (notificación PERSISTENTE con cronómetro en vivo, tipo
    foreground service) DESCARTADA a propósito por Juan — demasiado
    compleja para el valor que aporta; no forma parte del conteo de
    puntos numerados, no retomar sin petición explícita futura.
    **Total: 27 puntos numerados, 17 cerrados
    (`#2,#3,#4,#7,#11,#12,#13,#14,#15,#17,#20,#21,#22,#23,#24,#25,#26`),
    10 pendientes (`#1,#5,#6,#8,#9,#10,#16,#18,#19,#27`).**
  * `npx tsc --noEmit` limpio en cada paso de esta sesión.
- Hecho: sesión 2026-08-10 — **Texto honesto de lesiones (#1) + rediseño
  de máquinas de pila en el coach (#19)** (commits `6443ae4`, `1ad40c7`,
  `4ea70ed`; JS puro, sin módulos nativos — solo recarga):
  * **a) #1** (`6443ae4`) — auditoría exhaustiva (`grep` sobre
    `plan-generator.ts` y `muscleBasedSelection.ts`, cero resultados)
    confirmó que `profile.injuries` (texto libre, `StepInjuries.tsx`)
    nunca tuvo ningún efecto sobre la generación del plan — se guarda y
    se muestra de vuelta en 2 pantallas (Resumen del onboarding, Perfil)
    y ahí termina. El subtítulo original prometía "para adaptar tu
    plan", lo cual era falso. **Decisión de Juan**: no construir un
    filtro automático — interpretar texto libre de lesiones para
    excluir ejercicios se acerca a dar consejo médico automatizado,
    terreno que se prefiere no pisar — sino corregir el texto para ser
    honestos sobre qué hace el campo hoy. Nuevo subtítulo (es/en/fr):
    describe el campo como nota personal en el perfil, visible para
    quien el usuario decida compartirlo (ej. un entrenador que adapte
    la rutina) — texto escrito en avance sobre la función de compartir
    real (el sistema de amigos está en pausa, nada es compartible hoy),
    decisión consciente de Juan porque la app solo tiene un usuario (él
    mismo) en este momento. **REVISAR antes de que la beta abra a otros
    usuarios**, para confirmar que compartir perfil ya funcione de
    verdad antes de que alguien más lea este texto.
  * **b) #9** — investigado en la misma sesión, sin cambios de código:
    los 19 items reales de `HOME_EQUIPMENT` (excluyendo `bodyweight`)
    tienen entre 2 y 29 ejercicios asociados cada uno en el catálogo,
    ninguno huérfano. `bodyweight` con 0 ejercicios es intencional (ni
    siquiera es un `EquipmentKey` válido) y ya estaba documentado en el
    propio código — no un descuido. Sin cambios necesarios.
  * **c) #19 — REDISEÑADO, no solo ajustado** (`1ad40c7` + `4ea70ed`):
    `EQUIP_INC` (`equipmentClassification.ts`) le ponía un número fijo
    en kg a `machine`/`cable`/`assisted` que no podía coincidir de forma
    fiable con el bloque real de ninguna máquina concreta (varía por
    máquina/gimnasio/país). Se investigó y descartó convertir solo el
    incremento interno a partir de libras (10lb→4.5kg): Juan encontró un
    diseño mejor. `computeCoach` (`session.store.ts`) y
    `computeNextTargets` (`progression.ts`) ahora, para estos 3 tipos,
    no calculan ningún peso — describen la DIRECCIÓN ("sube/baja al
    siguiente bloque", "sube/baja la asistencia") y dejan que el usuario
    anote el peso real que lee en su máquina, mismo mecanismo que
    `bodyweight` ya usaba (`kg: 0`, el campo conserva su valor hasta que
    el usuario lo actualiza). `assisted` gana un umbral (peso ≤ 5kg) que
    cambia el mensaje a "prueba la variante sin ayuda" en vez de seguir
    pidiendo bajar de bloque. `barbell`/`dumbbell`/`kettlebell`/
    `weighted_vest` no cambian de mecanismo — pero `barbell` y
    `dumbbell` sí ganan sus incrementos reales confirmados por Juan
    (`4ea70ed`, commit separado del rediseño): discos de barra mínimos
    de 2.5kg cargados simétricamente = salto real de 5kg (`2.5→5`);
    mancuernas de 1kg (`2→1`). `kettlebell` (4kg) y `weighted_vest`
    (1kg) ya eran correctos, sin cambio.
    - Verificado exhaustivamente antes del dispositivo: regresión
      confirmada para barra (55kg, idéntico al #22) y mancuerna
      (incremento normal sin tocar la dirección), más 5 simulaciones de
      los casos nuevos (machine/cable/assisted con RIR y reps variados).
    - Validado en dispositivo físico: máquina/cable con mensaje de
      dirección y peso NO auto-rellenado; asistida con el umbral de 5kg
      funcionando; barra y mancuerna sin cambios de mecanismo.
    - Idea de Juan para una sesión futura (**#30**, backlog): que el
      coach "aprenda" el incremento real de cada máquina observando el
      salto que el usuario teclea tras un mensaje de dirección, y
      empiece a sugerir un número concreto por ejercicio. Depende de que
      el #19 ya esté en producción una temporada.
  * **d) Backlog**: `#1`, `#9`, `#19` marcados CERRADOS con fecha
    2026-08-10. Añadido `#29` (soporte real de libras en la sesión en
    vivo — hoy `session.tsx`/`session.store.ts`/`progression.ts` operan
    siempre en kg sin conversión, ver auditoría de esta sesión; alcance
    mapeado pero sin empezar) y `#30` (aprendizaje del incremento real
    por ejercicio, ver punto c) como pendientes nuevos.
    **Total: 29 puntos numerados (la numeración llega hasta #30 — #28
    se descartó antes de asignarse y nunca contó, igual que antes), 20
    cerrados
    (`#1,#2,#3,#4,#7,#9,#11,#12,#13,#14,#15,#17,#19,#20,#21,#22,#23,#24,#25,#26`),
    9 pendientes (`#5,#6,#8,#10,#16,#18,#27,#29,#30`).**
  * `npx tsc --noEmit` limpio en cada paso de esta sesión.
- Hecho: sesión 2026-08-12 — **Paso 2c (#6+#18): bloqueo de reselección de
  días ya completos al 100% en el ciclo actual** (JS puro, sin módulos
  nativos — solo recarga). Precedido de 3 rondas de auditoría de solo
  lectura dentro de la misma conversación (evidencia literal de esquema,
  migraciones y funciones ya existentes antes de escribir una sola línea
  de código nuevo — mismo protocolo "Paso 0" de siempre):
  * **Decisiones tomadas con evidencia, no supuestos**:
    - Sin precedente previo de un ARRAY dentro de `gamification_meta`
      (confirmado con grep antes de decidir el formato) — JSON.stringify/
      parse sí es patrón ya establecido en otras tablas
      (`profile.equipment`, `profile.musclePriorities`), reutilizado aquí
      por primera vez en `gamification_meta`.
    - `generateAndSavePlan`, `activateManualPlan` y `startNextManualCycle`
      reconstruyen `currentPlan` ENTERO sin spread (confirmado línea por
      línea antes de tocarlas) — por eso las 3 necesitan
      `saveCompletedDayIds([])` explícito Y `completedDayIds: []` literal
      en su `set()`; no basta con heredarlo como sí pasa en
      `selectDay()`/`advanceToNextDay()`, que sí usan spread.
    - `selectDay()` confirmado con único llamador real (`OtherDayCard` en
      training.tsx) antes de tocarla.
  * **Qué se construyó**: campo nuevo `completedDayIds: number[]` en
    `StoredPlan` (`workout.store.ts`), clave nueva
    `workout_completed_day_ids` en `gamification_meta` (deliberadamente
    sin la palabra "week" — esto es el CICLO actual del plan, no una
    semana de calendario, misma lección ya aprendida con
    `daysFinishedThisWeek`). Helper único exportado `isDayCompleted(dayId,
    completedDayIds)`, reutilizado en `selectDay()`, `advanceToNextDay()`
    y `OtherDayCard` — nunca reimplementado el `.includes()` por separado
    en ninguno de los tres.
    - `selectDay()`: si el día ya está en `completedDayIds`, no escribe en
      SQLite ni cambia el estado — solo `console.warn`, como segunda
      barrera (la primera es que `OtherDayCard` ya no ofrece el botón para
      un día completo).
    - `advanceToNextDay()`: en vez de saltar siempre al índice
      `(idx+1)%length`, busca cíclicamente desde ahí el primer día NO
      completo — los días PARCIALES sí califican, decisión de producto ya
      tomada, sin tocar. Si los recorre todos y ninguno califica (ciclo
      100% completo), cae exactamente al mismo valor que el código viejo
      — verificado a mano que es un fallback IDÉNTICO, no solo "algún
      valor válido".
    - `markDayCompleted(dayId)`: acción nueva, idempotente, llamada desde
      `doFinish()` en `session.tsx` con el mismo criterio que ya usa
      `perfect` (`plannedSets > 0 && completedSets >= plannedSets` —
      unificado en una sola variable `dayFullyCompleted` en vez de
      duplicar la condición dos veces).
    - `OtherDayCard` (`training.tsx`): prop `isCompleted` nueva —
      sustituye el botón "Elegir" por un badge (ícono `checkmark-circle` +
      texto, claves i18n `tabs.training.dayCompletedBadge` es/en/fr) SOLO
      en el botón de selección; expandir/contraer la tarjeta para ver
      ejercicios sigue funcionando igual.
    - `loadCurrentPlan()`: carga `completedDayIds` en el mismo punto y con
      el mismo mecanismo que ya carga `selectedDayId` (lectura directa de
      `gamification_meta`, antes de que corra `loadGamification()`).
  * **Qué se validó**: 4 trazas manuales con estado inventado y las
    funciones reales (bloqueo directo con warning; avance saltando 3 días
    completos y aterrizando en el único pendiente, desde cualquiera de los
    3 puntos de partida; los 4 días completos cae al fallback IDÉNTICO al
    comportamiento anterior a este cambio; reseteo confirmado con una
    lectura fresca de `gamification_meta` simulando un reinicio de app,
    no solo con la llamada de reseteo). `npx tsc --noEmit` limpio en cada
    paso. Validado en el dispositivo físico de Juan: badge visible en el
    día completo, la tarjeta sigue expandiéndose/contrayéndose con
    normalidad, un día parcial sigue mostrando "Elegir" sin ningún
    bloqueo, y "Semana completada" sigue apareciendo igual que siempre al
    cerrar el ciclo.
  * **Backlog** — pendiente, nada de esto se toca en este commit:
    - Étapa 3 del propio chantier #6+#18 (retomar ejercicios pendientes,
      el ítem #6 de la lista de arriba): confirmado en dispositivo que, al
      reseleccionar un día parcial, la sesión arranca vacía — las series
      ya hechas persisten bien en `session_sets`/historial pero no se
      restauran en la sesión en vivo. Comportamiento esperado, sin
      relación con este commit — Étapa 3 nunca se ha empezado.
    - Añadido **#34**: confirmado en dispositivo por Juan que repetir el
      mismo día varias veces sin tocar los otros cierra la semana igual
      (`daysFinishedThisWeek` cuenta sesiones terminadas, no días
      distintos al 100%). Posible dirección de arreglo anotada para
      cuando se retome: cerrar la semana solo cuando TODOS los días
      entrenables estén en `completedDayIds`.
    - Añadido **#35 (nuevo)**: opción de generar semana nueva de forma
      anticipada, con aviso explícito de progreso pendiente, cuando el
      usuario ya entró a todos los días sin completarlos todos.
    - **Total: 31 puntos numerados en este documento (la numeración de
      Juan llega hasta #35 — #28, #31, #32 y #33 no tienen entrada en
      este documento, mismo criterio ya aplicado a #28 en sesiones
      anteriores), 20 cerrados
      (`#1,#2,#3,#4,#7,#9,#11,#12,#13,#14,#15,#17,#19,#20,#21,#22,#23,#24,#25,#26`),
      11 pendientes
      (`#5,#6,#8,#10,#16,#18,#27,#29,#30,#34,#35`).**
- Hecho: sesión 2026-08-13 — **Étapa 3 (#6+#18): retomar series ya
  completadas al reabrir un día parcial — CIERRA el chantier #6+#18
  COMPLETO** (JS puro, sin módulos nativos — solo recarga). Precedida de
  Paso 0 de solo lectura (código literal de `SetRow`, `handleFinish`/
  cálculo de pendientes, `runProgressionAfterSession()` completa,
  `markExerciseUsed()`) y de una ronda de verificación aparte donde Juan
  pidió el diff completo sin resumir antes de aprobar el diseño:
  * **Causa raíz**: al reseleccionar desde "Tu ciclo" un día con progreso
    parcial (Paso 2b/2c ya permitían volver a él sin bloqueo si no estaba
    al 100%), `startSession()` reconstruía `exercises` solo a partir del
    plan — el trabajo ya guardado en `session_sets`/historial de una
    sesión anterior del mismo ciclo no se reflejaba en la sesión en vivo,
    así que el día "arrancaba vacío" aunque ya tuviera series completadas.
  * **Qué se construyó**:
    - Campo nuevo `isRestored?: boolean` en `SetState` (mismo patrón
      opcional que `coachReason`).
    - `getRestoredSets(planDayId, planId)` en `session.store.ts`: hace
      `join` de `session_sets` con `workout_sessions` filtrando por
      `plan_day_id` y `completed=1`. Filtro de fecha CONDICIONAL: en modo
      automático, ningún filtro extra (`plan_days.dbId` nunca se repite
      entre ciclos — confirmado en auditoría de solo lectura de esta
      misma sesión); en modo manual, se añade
      `workout_sessions.created_at >= generatedAt` del plan activo,
      porque `materializeTemplate` SÍ reutiliza la misma fila de
      `plan_days` entre ciclos (mismo `cycleStart` que ya usa
      `hasSessionForPlanDay` en `routineMaterializer.ts`).
    - `startSession()`: tras construir `exercises` con `buildExerciseState`
      (sin tocarla — la comparte `replaceExercise`), aplica el resultado
      de `getRestoredSets` por `(exerciseId, setNumber)`, marcando
      `completed:true, isRestored:true` y sobrescribiendo
      `actualReps`/`weightKg`/`rir` con lo guardado (nunca `targetReps`,
      que sigue viniendo del plan).
    - `finishSession()`, 4 puntos que ahora excluyen `isRestored`: (1) el
      guard de sesión fantasma (#12) cuenta solo series NUEVAS — un día
      100% restaurado sin trabajo nuevo no crea fila en
      `workout_sessions`, pero el `completedSets` que devuelve en ese
      caso temprano SÍ sigue sumando lo restaurado, para no mentirle al
      ratio que alimenta `dayFullyCompleted`/`markDayCompleted` (Paso 2c);
      (2) el loop de inserción en `session_sets` salta las series
      restauradas (ya existen, insertarlas de nuevo las duplicaría); (3)
      `runProgressionAfterSession` solo recibe series nuevas — la
      progresión y la detección de PR de lo restaurado ya se calcularon
      la vez que se completó de verdad; (4) `markExerciseUsed` solo se
      llama si hay al menos una serie nueva completada.
    - UI (`session.tsx`): `SetRow` con prop `isRestored` — inputs de
      reps/kg/RIR con `editable={false}`, checkbox `disabled`, icono
      candado en vez de check, fila más atenuada que una serie completada
      normal. Banner ámbar no bloqueante (mismo patrón que
      `calibBanner`/`noPullBanner`) con el conteo a nivel de SERIES
      ("Ya completaste X de Y series de este día"), visible solo si hay
      alguna serie restaurada. 3 claves i18n nuevas (es/en/fr).
  * **Qué se validó**: 4 trazas manuales contra el código real (día
    virgen sin cambios de comportamiento; dos sesiones sobre el mismo día
    sin duplicar `session_sets` ni recalcular PR de lo ya evaluado;
    sesión antigua de un ciclo manual ANTERIOR excluida correctamente por
    el filtro `created_at >= generatedAt`; guard de sesión fantasma
    respetado con 4/5 ejercicios restaurados y cero trabajo nuevo, sin
    crear fila en `workout_sessions`). `runProgressionAfterSession()`
    revisada completa a pedido de Juan, confirmando que el corte por
    `completedSets.length === 0` ocurre antes de cualquier cálculo de 1RM/PR.
    `npx tsc --noEmit` limpio en cada paso; `git diff` confirmado acotado
    a los 5 archivos permitidos. Validado en el dispositivo físico de
    Juan: serie ya hecha aparece marcada con candado y no responde al
    toque, banner con el conteo correcto, resto del día completable con
    normalidad, historial sin series duplicadas tras terminar.
  * **CIERRE FORMAL DEL CHANTIER #6+#18**: con esta Étapa 3 quedan
    cerrados también, en la lista maestra de arriba, el punto **#6**
    (retomar ejercicios no completados — entregado íntegro en esta pieza)
    y el punto **#18** (elegir libremente qué día entrenar — entregado en
    las Étapas 1 a 2c, 2026-08-11/12, mantenido abierto a propósito hasta
    que esta última pieza terminara, decisión de Juan).
  * **Pendiente, sin relación con este commit** (constancia únicamente,
    documentados aquí por primera vez con número — **#32**: sospecha de
    bug de fecha UTC en `finishSession`/`getWeekStart` sin confirmar
    todavía; **#33**: columna `workout_sessions.completed` posiblemente
    vestigial, siempre en 1 en la práctica desde `finishSession`; **#36**:
    filas huérfanas de `plan_days` en modo automático — `generateAndSavePlan`
    nunca borra las de un plan desactivado, se acumulan indefinidamente,
    ver sección "Constructor de rutina propia" más abajo) — ninguno
    investigado ni tocado en esta sesión.
    - **Total: 34 puntos numerados en este documento (la numeración de
      Juan llega hasta #36 — #28 y #31 siguen sin entrada, mismo criterio
      de siempre), 22 cerrados
      (`#1,#2,#3,#4,#6,#7,#9,#11,#12,#13,#14,#15,#17,#18,#19,#20,#21,#22,#23,#24,#25,#26`),
      12 pendientes
      (`#5,#8,#10,#16,#27,#29,#30,#32,#33,#34,#35,#36`).**
- **#27 — CERRADO 2026-08-14** (commit `f4d2ca3`
  `wip(coach): notificacion local fin de descanso en 2do plano (#27) —
  pendiente validar en dispositivo`; excepción deliberada de Juan a la
  regla habitual de validar antes de comitear — trabajo empujado a
  propósito para retomarlo desde la otra PC vía `git pull`). Validado en
  dispositivo real en esta sesión — ver confirmación al final de esta
  entrada.
  * Qué se construyó: `expo-notifications` (primer módulo nativo del
    proyecto) programa una notificación local al pasar a segundo plano
    con el timer de descanso corriendo, usando `restTimerEndAt` como
    referencia — sonido por defecto del sistema, sin canal de Android
    propio (Opción 1). `src/lib/notifications.ts` nuevo (mismo patrón
    defensivo que `haptics.ts`/`sounds.ts`); acciones
    `scheduleRestNotification`/`cancelRestNotification` en
    `session.store.ts`; en `session.tsx`, permiso pedido una vez al
    montar sin bloquear render, y rama `background`/`active` en el
    `useEffect` de `AppState` ya existente (cancela SIEMPRE antes de
    `tickRestTimer()` al volver a primer plano). Margen de tolerancia de
    -5s en `scheduleRestNotification` para no perder el aviso si el
    descanso termina en el instante exacto de ir a segundo plano.
  * **PENDIENTE — build nueva de EAS antes de poder probar nada de esto**
    (`eas build --profile preview --platform android` — se puede lanzar
    desde cualquiera de las 2 PCs, el build corre en la nube de Expo, no
    importa cuál lo dispare). Los 3 casos a validar en dispositivo real:
    1. Notificación real al pasar a segundo plano con el descanso
       corriendo.
    2. Volver a primer plano antes de tiempo: no debe sonar nada, y el
       número del descanso en pantalla debe corregirse solo.
    3. Comportamiento correcto tanto si el permiso de notificaciones se
       otorga como si se deniega (sin crashear, sin error visible).
  * `npx tsc --noEmit` limpio en cada paso de la implementación — es lo
    único verificado hasta ahora.
  * **VALIDADO en dispositivo — 2026-08-14** (perfil EAS development).
    Los 3 casos confirmados por Juan: (1) notificación real al pasar a
    segundo plano con el descanso corriendo; (2) volver a primer plano
    antes de tiempo no dispara sonido y el número en pantalla se
    corrige solo; (3) el permiso de notificaciones del sistema se
    maneja sin error tanto si se otorga como si se deniega. Commit de
    implementación: `f4d2ca3`. Este mismo commit (docs, sin cambios de
    código) confirma la validación — no se enmienda `f4d2ca3`, tal como
    se dejó planteado.
- Hecho: sesión 2026-08-14 — confirmación de validación del #27 en
  dispositivo (commit docs, sin cambios de código) + 2 hallazgos nuevos
  de Juan durante esa prueba, documentados sin diseñar nada todavía:
  * **#37 (nuevo, pendiente)** — con una duración de descanso
    personalizada en un ejercicio (ej. 10s), al validar una serie el
    cronómetro arranca con la duración POR DEFECTO (180s) en vez de la
    personalizada. Iniciar el descanso a mano con el botón "play" sí
    respeta la duración personalizada — el problema está solo en el
    arranque automático al completar una serie. Sin relación con el
    #27.
  * **#38 (nuevo, pendiente)** — idea de Juan: dar la opción de
    desactivar el sonido de fin de descanso y dejar solo la vibración,
    y quizás cambiar el sonido por uno nativo de Android.
  * Total actualizado: 36 puntos numerados en este documento (Juan
    llega hasta #38 — #28 y #31 siguen sin entrada, mismo criterio de
    siempre), 23 cerrados
    (`#1,#2,#3,#4,#6,#7,#9,#11,#12,#13,#14,#15,#17,#18,#19,#20,#21,#22,#23,#24,#25,#26,#27`),
    13 pendientes
    (`#5,#8,#10,#16,#29,#30,#32,#33,#34,#35,#36,#37,#38`).
- Hecho: sesión 2026-08-14 (continuación) — **#37 CERRADO**: descanso
  personalizado respeta la duración tipeada + corrige reselección de
  texto (mismo commit que este texto, `fix(coach): descanso
  personalizado respeta duracion tipeada + corrige reseleccion (#37)`):
  * **Causa raíz, dos bugs distintos resueltos en la misma pieza**:
    (a) `completeSet()` (`session.store.ts`) arrancaba el descanso
    leyendo `ex.restSeconds` del store, pero `restInputStr` (pantalla) y
    `ex.restSeconds` (store) eran dos fuentes de verdad separadas, unidas
    solo por `applyRestInput()` en `onEndEditing`/`onSubmitEditing` —
    completar una serie sin sacar el foco del campo usaba el valor
    viejo, no el recién tipeado. (b) al resolver (a) con sincronización
    en vivo por tecla (`setRestSecondsLive`, acción nueva), resurgió el
    bug de reselección de texto ya visto en el **#20** (campo Kg de
    `SetRow`) — mismo síntoma exacto, campo distinto: `selectTextOnFocus`
    se reaplica en cada tecla en Android, no solo al enfocar.
  * **Camino recorrido** (incluida la vuelta en falso, documentada tal
    cual pasó, no escondida): primer intento contra (b) con un guard
    (`isTypingRestRef`) que evitaba un eco redundante de un `useEffect`
    de sincronización — resolvía un problema real pero DISTINTO al
    síntoma visible; validado en dispositivo por Juan, confirmó que no
    arreglaba la reselección. Segunda vuelta: aplicar el patrón EXACTO
    ya usado en el campo Kg (`selection` + recálculo manual en
    `onFocus`/`onChangeText`, sin `selectTextOnFocus`), confirmado línea
    por línea idéntico al de Kg antes de aplicarlo — no una variación
    propia. Las dos piezas conviven en el resultado final: el guard
    sigue siendo necesario (evita el eco real hacia `restInputStr`), el
    patrón de selección (`restSelection`) resuelve el síntoma visible
    que Juan reportó.
  * Nueva acción `setRestSecondsLive(exIdx, seconds)` en
    `session.store.ts` — sincroniza SOLO en memoria (sin escritura a la
    base) en cada tecla, acotada al rango 1-600 ya usado en el resto del
    campo (evita que un valor fuera de rango tipeado a mitad de camino
    contamine el "último valor válido" que lee el fallback de
    `applyRestInput`). `saveCustomRest` exportada para persistir directo
    desde `applyRestInput()` sin pasar por `adjustRest`/su cálculo de
    delta (que con el store ya sincronizado en vivo, siempre habría dado
    0).
  * Validado en dispositivo (recarga con Metro, sin build nueva): tecleo
    de 2+ dígitos sin reselección de texto, ±15s y cambio de ejercicio
    sin cambios de comportamiento, y el caso original del #37 (completar
    una serie sin sacar el foco del campo de descanso) arrancando el
    temporizador con el valor recién tipeado, no con el default.
  * `npx tsc --noEmit` limpio en cada paso.
  * Total actualizado: 24 cerrados
    (`#1,#2,#3,#4,#6,#7,#9,#11,#12,#13,#14,#15,#17,#18,#19,#20,#21,#22,#23,#24,#25,#26,#27,#37`),
    12 pendientes
    (`#5,#8,#10,#16,#29,#30,#32,#33,#34,#35,#36,#38`).
- Hecho: sesión 2026-08-14 (continuación) — **#39, parte 1/2**: hook
  compartido de selección de texto (`src/hooks/use-text-selection.ts`,
  mismo commit que este texto,
  `fix(coach): unifica seleccion de texto en Reps/RIR/cardio + retrofit
  Kg/descanso (#39)`):
  * **Causa raíz**: mismo bug del #20/#37 (`selectTextOnFocus`
    reaplicándose en cada tecla en Android, no solo al enfocar)
    encontrado en auditoría completa del repo en 6 lugares más — 4 en
    `session.tsx` (Reps, RIR, minutos de cardio de gimnasio, segundos de
    cardio de casa), 2 en `routineBuilder.tsx` (minutos/segundos de
    bloque de cardio del constructor manual) y altura/peso del
    onboarding (`StepPhysical.tsx`).
  * **Decisión**: en vez de copiar el parche a mano una cuarta vez, se
    extrajo un hook compartido — `src/hooks/use-text-selection.ts`,
    mismo patrón de ubicación que `use-android-back.ts`. Primitiva
    indexada `useIndexedTextSelection()` (`Record<index, {start,end}>`)
    + envoltorio de campo único `useTextSelection()` que fija índice 0,
    para no duplicar el cálculo entre un campo suelto y un array de
    campos (los 2 de cardio son indexados por bloque/sesión real, no un
    solo campo por pantalla). El hook SOLO encapsula selección
    (seleccionar todo al enfocar, cursor al final al tipear) — la
    validación y el commit de cada campo siguen siendo propias de cada
    uno, sin unificar.
  * **Aplicado** a Reps y RIR (`SetRow`) y a los 2 campos de cardio de
    `session.tsx` (antes sin ningún mecanismo de selección, solo
    `selectTextOnFocus`). **Retrofit** de Kg (#20) y descanso por
    ejercicio (#37) al mismo hook — sin cambio funcional, ambos ya
    tenían su propia implementación local del mismo mecanismo byte a
    byte igual; ahora los 6 campos comparten una sola implementación.
  * **Validado en dispositivo** (recarga con Metro, sin build nueva):
    Reps, RIR, minutos de cardio de gimnasio y segundos de cardio de
    casa sin reselección; Kg y descanso por ejercicio funcionando
    exactamente igual que antes del retrofit.
  * `npx tsc --noEmit` limpio en cada paso.
  * **Pendiente — parte 2/2**: `StepPhysical.tsx` (altura/peso del
    onboarding) ya tiene el mismo fix aplicado y validado en dispositivo
    (misma sesión), pero se comitea en un commit APARTE inmediatamente
    después de este — depende de que este hook ya exista en el
    historial de Git. `routineBuilder.tsx` (los 2 campos de cardio del
    constructor manual) queda sin tocar, pieza futura aparte.
- Hecho: sesión 2026-08-14 (continuación) — **#39, parte 2/2**: retrofit
  de `EditableStepper` (altura/peso del onboarding, `StepPhysical.tsx`)
  al hook compartido, mismo commit que este texto,
  `fix(coach): unifica seleccion de texto en altura/peso del onboarding (#39)`:
  * **Causa raíz**: mismo bug del #20/#37/#39 (`selectTextOnFocus`
    reaplicándose en cada tecla en Android) en `EditableStepper`,
    encontrado en la auditoría completa del repo del #39.
  * **Decisión**: retrofit al hook compartido ya creado y comiteado en
    `f139494` (`src/hooks/use-text-selection.ts`, `useTextSelection()`)
    — sin inventar una implementación local nueva, un solo mecanismo
    para los 7 campos afectados en total (los 6 de `session.tsx` + este).
  * **Validado**: traza a mano confirmando que `sel.moveCursorToEnd()`
    se agrega DESPUÉS de `onCommit(text)` dentro del mismo
    `onChangeText`, sin interferir con el mecanismo del #2 (guardar en
    cada tecla, no solo en `onBlur`) — `onCommit(text)` sigue
    disparándose exactamente igual, antes de la línea nueva. Validado
    en dispositivo (recarga con Metro, sin build nueva): sin
    reselección al escribir 2+ dígitos en altura/peso, y el valor no se
    pierde al tocar "Siguiente" justo después de escribir.
  * `npx tsc --noEmit` limpio.
  * **#39 sigue ABIERTO como punto de backlog** — falta
    `routineBuilder.tsx` (2 campos de cardio del constructor manual,
    mismo hook), última pieza pendiente, commit aparte. No cerrar hasta
    que esa pieza también esté hecha.
- Hecho: sesión 2026-08-14 (continuación) — **#39 CERRADO
  DEFINITIVAMENTE**: última pieza, cardio de `routineBuilder.tsx` (mismo
  commit que este texto,
  `fix(coach): unifica seleccion de texto en cardio de routineBuilder — cierra #39`):
  * **Causa raíz**: los 2 campos de cardio de `routineBuilder.tsx`
    (minutos de bloque de gimnasio, segundos de bloque de casa) tenían
    el mismo bug de reselección de texto en Android que ya se corrigió
    en Kg (#20), duración de descanso (#37), y Reps/RIR/cardio de
    `session.tsx` + altura/peso del onboarding (#39, commits `f139494`
    y `be3c5eb`).
  * **Decisión**: retrofit al mismo hook compartido — pero esta pantalla
    usa claves compuestas de string (`${day.id}-${blockIdx}`, porque
    aquí conviven varios días a la vez, a diferencia de `session.tsx`
    donde solo hay uno en pantalla), así que se ensanchó el tipo del
    índice de `useIndexedTextSelection` de `number` a `string | number`.
    Cambio de tipo puro, cero cambio de comportamiento — en JavaScript
    las claves de un objeto siempre se coaccionan a string por debajo,
    así que `Record<number,...>` nunca fue distinto de
    `Record<string,...>` en tiempo de ejecución, solo una restricción de
    compilación. `tsc` limpio en TODO el proyecto confirma que ningún
    otro punto que ya usa el hook con `number` se vio afectado.
  * **Validado**: traza a mano confirmando que escribir en un bloque no
    afecta la selección de otro (mismo mecanismo ya verificado con
    índices numéricos, ahora con claves string); validado en dispositivo
    (recarga con Metro, sin build nueva): campos de cardio de gimnasio y
    de casa sin reselección, ninguno de los dos afecta al otro.
  * **#39 CERRADO — resumen final**: 3 commits
    (`f139494`, `be3c5eb`, y este) resuelven las 8 apariciones de
    `selectTextOnFocus` que encontró la auditoría completa del repo —
    Kg (`SetRow`, #20) y descanso por ejercicio (#37, ya arreglados
    antes, retrofit al hook en este chantier), Reps y RIR (`SetRow`),
    cardio de gimnasio y cardio de casa de `session.tsx`, altura/peso
    del onboarding (`StepPhysical.tsx`), y estos 2 últimos de
    `routineBuilder.tsx`. Una única implementación
    (`src/hooks/use-text-selection.ts`) detrás de los 8 campos.
  * `npx tsc --noEmit` limpio en cada paso.
- Hecho: sesión 2026-08-17 — **#40 (parte 1/2) — doble-toque en
  VulcanBottomSheet corregido** (mismo commit que este texto,
  `fix(ui): agrega keyboardShouldPersistTaps a VulcanBottomSheet —
  corrige doble-toque (#40 1/2)`; JS puro, solo recarga):
  * **Causa raíz**: ya diagnosticada desde junio en `SHEET_AUDIT.md`
    (documento presente en el repo, nunca antes traducido a código) — el
    `ScrollView` interno de `VulcanBottomSheet.tsx` (línea 109) nunca
    declaraba `keyboardShouldPersistTaps`. Con un teclado abierto en la
    pantalla de fondo (típicamente `StepPhysical`, justo después de
    escribir en altura/peso), el primer toque sobre una opción del sheet
    solo cerraba el teclado — recién el segundo toque, ya sin teclado,
    llegaba al `Pressable` real de la opción.
  * Fix de una línea: `keyboardShouldPersistTaps="handled"` en el
    `ScrollView` de `VulcanBottomSheet.tsx:109` — mismo valor que ya
    usan las otras 4 apariciones del proyecto (`training.tsx`,
    `session.tsx`, `AddMeasurementModal.tsx`, `StepPhysical.tsx`),
    confirmado por grep antes de aplicar, no inventado. `"handled"` y no
    `"always"`: solo el toque sobre una opción real debe atravesar el
    teclado, no cualquier toque en el área vacía del `ScrollView`.
  * Validado en dispositivo: con teclado abierto, esperando
    deliberadamente a que pase el lag de apertura antes de tocar (para
    no confundir este síntoma con el del lag, bug distinto sin tocar en
    esta pieza) — un solo toque selecciona directo. Sin regresión en el
    caso sin teclado.
  * `npx tsc --noEmit` limpio.
  * **#40 sigue ABIERTO** — esto cierra solo la mitad del doble-toque.
    Pendiente la mitad del lag de apertura (2-3s, diagnosticado en
    `SHEET_LAG_AUDIT.md` — el `<Modal transparent>` de Android
    crea/destruye una ventana de sistema en cada apertura). Pieza aparte,
    más delicada: un intento previo de arreglarlo con una vista
    permanente rompió los 3 pickers de fecha (día/mes/año) y se revirtió
    sin llegar a comitearse — confirmado en esta misma sesión con
    auditoría de solo lectura (`git fsck --unreachable` + reflog: no
    existe ningún commit, ni reachable ni dangling, para ese intento; el
    único rastro real es el commit de documentación `925a7e2`, que
    agrega `SHEET_AUDIT.md`/`SHEET_LAG_AUDIT.md` sin ningún cambio de
    código). Retomar revisando primero cómo `AchievementCelebrationOverlay`
    y `AuthFlow` ya resuelven ese mismo patrón de vista permanente en
    `_layout.tsx`, antes de tocar nada.
  * Total actualizado: 25 cerrados
    (`#1,#2,#3,#4,#6,#7,#9,#11,#12,#13,#14,#15,#17,#18,#19,#20,#21,#22,#23,#24,#25,#26,#27,#37,#39`),
    13 pendientes
    (`#5,#8,#10,#16,#29,#30,#32,#33,#34,#35,#36,#38,#40`).
- Pausa: sesión 2026-08-17 (continuación) — **#40 (parte 2, piloto) —
  INTENTO FALLIDO, sin comitear**: eliminar el `<Modal>` de
  `VulcanBottomSheet` como causa del lag de apertura (1-2.5s,
  `SHEET_LAG_AUDIT.md`), migrando SOLO "¿Dónde entrenas hoy?"
  (`training.tsx`) como piloto.
  * **Qué se intentó**: `src/store/sheet.store.ts` (store efímero,
    `request`/`open`/`close`, un solo slot) + nuevo
    `src/components/ui/BottomSheetOverlay.tsx` — mismo mecanismo de
    animación que `VulcanBottomSheet.tsx` (`translateY`/`backdropOp` con
    `Animated`), SIN `Modal` en ningún punto, montado sin condicional en
    `_layout.tsx` junto a `AchievementCelebrationOverlay` (mismo patrón:
    `if (!request) return null` cuando no hay solicitud activa,
    confirmado en auditoría de Paso 0 que es el componente real sin
    `Modal` — `CooldownFlowOverlay`, ofrecido como plantilla alternativa,
    resultó NO servir de referencia para esto: sigue usando `<Modal>`
    por dentro para su picker de minutos). `useAndroidBack(!!request,
    dismiss)` conectado por primera vez a este tipo de componente. Los
    otros 5 usos de `VulcanBottomSheet` (StepPhysical ×3, StepSchedule,
    PhotosTab) quedaron intactos, sin tocar, usando el componente
    original.
  * **Resultado: NO funcionó.** Juan confirmó en dispositivo que el lag
    persiste sin ningún cambio observable, pese a que el diseño eliminaba
    el `Modal` por completo y `npx tsc --noEmit` compilaba limpio. La
    hipótesis de `SHEET_LAG_AUDIT.md` (el `<Modal transparent>` crea/
    destruye una ventana de Android en cada apertura) no se confirmó con
    este cambio — o el mecanismo real es otro, o el nuevo componente no
    tocó la causa real.
  * **Estado del código: SIN comitear.** Vive únicamente en el working
    tree de la máquina `j.gomez` (`src/app/_layout.tsx`,
    `src/app/training.tsx` modificados; `src/store/sheet.store.ts`,
    `src/components/ui/BottomSheetOverlay.tsx` nuevos, sin trackear). No
    disponible en la otra PC de Juan hasta que se retome esta máquina o
    se decida qué hacer con el intento (descartarlo o depurarlo).
  * **Próximo paso recomendado — NO repetir la misma hipótesis con más
    fuerza**: faltan logs reales en el dispositivo (mismo principio que
    ya funcionó para diagnosticar el #37) antes de intentar cualquier
    otro cambio de código a ciegas. Pregunta abierta sin resolver: si el
    problema es realmente el mismo `Modal` que documenta
    `SHEET_LAG_AUDIT.md`, o si hay algo más causando el mismo síntoma que
    este componente nuevo no llegó a tocar.
  * `#40` sigue en la lista de pendientes — sin cambio de conteo respecto
    a la entrada anterior (la mitad del doble-toque sigue cerrada; la
    mitad del lag sigue abierta, y este intento no la cerró).
- Pendiente obligatorio (roadmap): FASE 7 — In-app purchase.
  ⚠️  OBLIGATORIO antes de publicar en tiendas o cuando expire el trial de 14 días.

## Constructor de rutina propia — COMPLETO (cerrado julio 2026)

Feature completa: el usuario puede construir su propia rutina de fuerza +
cardio a mano, en vez de usar el plan generado automáticamente. Convive
con el modo automático vía profile.planMode ('auto'|'manual'), nunca los
dos activos a la vez. TODAS las fases (A a G2) y los 6 puntos de
refinamiento reportados tras validar están cerrados y validados en
dispositivo físico. Sin trabajo pendiente en este feature — lo que sigue
es referencia para quien necesite tocarlo en el futuro.

### Decisiones de producto (no reabrir sin discutirlo con Juan)

- Exclusividad total con el modo automático — nunca ambos a la vez. En
  Entreno el botón se divide en "generar mi plan automáticamente"/"crear
  mi propio plan".
- El plan propio se repite igual cada semana (sin variación semanal).
- Slots de fuerza SIN prerelleno — el usuario elige cada ejercicio a
  propósito (debe sentirse como "construir", no "editar una rutina ya
  hecha").
- Días del constructor: solo push/pull/legs/full_body — upper/lower
  quedan dormidos (mismo DayType del generador automático).
- Libertad total, sin restricciones: sin restricción de grupo muscular
  por tipo de día al añadir un slot; sin excluir ejercicios repetidos ni
  siquiera dentro del mismo día; el picker de cardio de casa no filtra
  por dislikedIds (mismo criterio que el resto del constructor).
- Usuarios location:'both' tienen DOS plantillas independientes (una por
  contexto gym/home) — nunca comparten filas.
- Series/reps editables: pendiente, fuera de alcance de v1.
- Un día con TODOS los slots de fuerza vacíos crea igual su fila
  (exercises:[]), bloqueado por el botón "Iniciar" ya existente, y NO
  cuenta para el ciclo semanal (ver "trainableDays" abajo).

### Esquema (migraciones 0013, 0014, 0015)

- `routine_templates`: una fila por día de la plantilla. context
  ('gym'|'home'), dayIndex, dayType, y **cardio** (text, JSON de
  CardioPlan, NULLABLE — null = usa el cardio automático de siempre; un
  valor real = el usuario configuró el suyo para ese día). Migración
  0015.
- `routine_template_slots`: muscleGroup NOT NULL, exerciseId nullable
  (null = slot sin elegir). sets/repRange/restSeconds/notes existen en
  el esquema pero sin uso en v1.
- `workout_plans` gana (migración 0014) source ('auto'|'manual') y
  context ('gym'|'home'|null, solo relevante si source='manual') — así
  se puede distinguir e identificar el plan manual de un contexto
  específico y reutilizarlo al reactivar en vez de crear uno nuevo cada
  vez (preserva el id de `plan_days` y el historial de sesiones ligado a
  él). La progresión de pesos ya no depende de esto — desde la migración
  0016, `exercise_targets` es independiente del plan (ver sección aparte
  "Progresión de cargas").
- `profile.planMode` ('auto'|'manual') — migración 0013.

### Archivos clave y su responsabilidad

- `src/lib/routineTemplates.ts` — CRUD de la plantilla: createTemplate
  (recomienda muscleGroup por slot reutilizando el motor real
  selectExercisesForDayByMuscle, NUNCA round-robin ciego), getTemplate,
  setSlotExercise, addSlot, removeSlot, setTemplateCardio, deleteTemplate.
- `src/lib/routineMaterializer.ts` — el puente entre la plantilla
  (routine_templates) y el plan real (plan_days):
  - `hasSessionForPlanDay(planDayId, sinceTimestamp)` — un día cuenta
    como "ya entrenado" (y por tanto intocable) solo si tiene una sesión
    DESDE el inicio del ciclo vigente, no "para siempre". Corrige que un
    día entrenado una vez quedara congelado para futuras ediciones.
  - `buildExercisesFromTemplateDay(day, profile)` — función PURA (sin
    DB) que convierte slots en PlannedExercise[]. Reutilizada por
    materializeTemplate, por estimateDayDuration (routineBuilder.tsx) y
    por la sustitución en vivo (training.tsx) — una sola fuente de
    verdad para esta conversión.
  - `materializeTemplate(context, profile, equipment, dislikedIds,
    planId, cycleStart, forceCardioRefreshDayIndex?)` — nunca busca ni
    crea el plan activo por su cuenta (eso lo hacen las 3 acciones de
    workout.store.ts). Nunca reescribe un día ya entrenado en el ciclo
    vigente. Cardio: usa day.cardio (de la plantilla) si existe;
    si no, lo calcula con selectCardio() como siempre. needsCardio
    normalmente solo es true la primera vez (centinela '[]' en
    plan_days.cardio) — forceCardioRefreshDayIndex fuerza el recálculo
    para UN día específico cuando el usuario acaba de editar su cardio
    propio, evitando el mismo problema de "congelado para siempre" que
    ya se corrigió para hasSessionForPlanDay.
  - `findManualPlan(context)` — busca el plan manual de un contexto,
    activo o no, para reactivarlo en vez de duplicar.
- `src/store/workout.store.ts` — StoredPlan incluye source/context.
  3 acciones sobre el modo manual: `activateManualPlan` (crea o
  reactiva, único punto de entrada, resetea generatedAt+índice+
  contador), `syncManualPlanIfActive` (sincroniza tras editar SOLO si
  ese contexto ya es el activo — nunca activa nada sola; devuelve
  skippedDayIndexes para avisar de ediciones que no se reflejarán hasta
  el próximo ciclo), `startNextManualCycle` (mueve generatedAt, para
  "generar próxima semana" en modo manual). `backToAutoPlan(profile)` —
  único punto de entrada para volver a automático (setPlanMode('auto')
  + generateAndSavePlan), usado desde 3 sitios sin duplicar la
  secuencia.
- `src/store/gamification.store.ts` — `daysFinishedThisWeek`, contador
  INDEPENDIENTE de daysTrainedThisWeek/logros. Decisión de Juan: "día
  finalizado" (cierra la semana) ≠ "logro/racha" (sigue exigiendo 50% de
  series de siempre, sin tocar). Se incrementa SIEMPRE al terminar
  sesión.
- `src/app/routineBuilder.tsx` — la pantalla del constructor: selector
  de contexto (solo location:'both'), slots musculares (elegir/quitar/
  añadir/quitar ejercicio), sección de cardio por día (gym: lista plana
  de bloques; casa: sesiones agrupadas con sub-bloques + "duplicar
  sesión anterior" + "generar automáticamente"), botón de activar/"ya
  activa"/nota informativa según corresponda, botón "volver a
  automático".
- `src/app/training.tsx` — pantalla principal de Entreno.
  `trainableDays` (días con ≥1 ejercicio de fuerza) calculado UNA vez y
  compartido por render/startRealSession/handleWarmupMinutes — nunca
  recalculado por separado (lección de esta sesión, ver abajo).
  `resolveEffectiveDay(context)` — la pieza central de la "rutina
  ancla": si el plan es manual y el contexto elegido hoy no es el del
  ancla, y esa plantilla tiene algún día entrenable, sustituye TODO el
  día (ejercicios + dayType + cardio si la plantilla sustituta tiene
  cardio propio) por el de la MISMA posición (índice con módulo, NUNCA
  por tipo de día — la libertad total del constructor rompe cualquier
  correspondencia fiable por tipo). Puramente en memoria, nunca toca
  plan_days ni resetea el ciclo. Si no hay plantilla sustituta válida,
  cae al filtro E-3 de sustitución por equipamiento de siempre.
  Compartida entre el flujo de calentamiento y el arranque real de
  sesión.
- `src/store/session.store.ts` / `src/app/session.tsx` — el
  SessionStore guarda `cardio` y `sessionDayType` como campos PROPIOS,
  poblados en startSession() desde el day ya resuelto por
  resolveEffectiveDay. session.tsx los lee del store, nunca los
  re-deriva buscando por planDayId en el plan del ancla (ver lección
  crítica abajo).

### La "rutina ancla" (Punto 1, para location:'both')

Resuelve la redundancia entre "Activar esta rutina" y la pregunta diaria
"¿dónde entrenas hoy?": una sola rutina ancla activa a la vez (no una
activación por contexto). El contexto que NO es el ancla, si tiene su
propia plantilla con algún día entrenable, se usa por SUSTITUCIÓN EN
VIVO (vía resolveEffectiveDay) cuando el usuario elige entrenar ahí un
día dado — nunca necesita activarse explícitamente. En routineBuilder.tsx,
viendo el contexto que no es el ancla mientras ya hay un plan manual
activo, se muestra solo un texto informativo, sin botón.

### Guarda de modo manual en Equipamiento y Prioridades musculares

`src/app/equipment.tsx` y `src/app/musclePriorities.tsx` comprueban
`currentPlan?.source === 'manual'` (misma señal que ya usa
`resolveEffectiveDay` en training.tsx) antes de llamar a
`generateAndSavePlan`. Bug preexistente hasta esta sesión: con un plan
manual activo, guardar en cualquiera de esas dos pantallas desactivaba el
plan manual y lo sustituía por uno automático sin preguntar. Ahora, en
modo manual, ambas guardan el dato (equipamiento/prioridades) sin tocar
el plan y muestran un diálogo informativo
(`manualNoticeTitle`/`manualNoticeMsg`, es/en/fr) explicando que el plan
no cambia. El diálogo de regeneración existente (modo automático) queda
intacto.

### El cardio editable (Punto 6)

Columna `cardio` en routine_templates (ver esquema arriba). En
routineBuilder.tsx: gimnasio ofrece una lista plana de bloques
(ejercicio de máquina + minutos, 1-60); casa ofrece sesiones agrupadas
(varios ejercicios por sesión + descanso recalculado SIEMPRE al guardar
— 90s todas menos la última, 0 en la última — nunca editable a mano en
el constructor, solo en vivo en session.tsx como siempre). Quitar el
último bloque de gimnasio, o el último bloque de una sesión de casa
(que además elimina la sesión si queda vacía; y si quedan 0 sesiones,
revierte a null), vuelve al cardio automático. "Generar automáticamente"
(ambos contextos) siembra una propuesta inicial con el motor real
(getExerciseCounts+getCardioSlots+selectCardio), editable desde ahí —
sin coordinación de variedad entre días (simplificación consciente, es
un punto de partida de un solo día). "Duplicar sesión anterior" (solo
casa) copia los bloques de la última sesión tal cual.

### Lecciones importantes para quien retome/extienda esto

1. **Cálculos duplicados se desincronizan.** Ocurrió 3 veces en esta
   sesión (trainableDays, el dayType del calentamiento, y casi con el
   cardio también) — cuando dos sitios distintos necesitan derivar el
   mismo dato, extraer SIEMPRE un único helper/función compartida. Nunca
   recalcular "igual pero por separado".

2. **Los centinelas de "calculado una sola vez" necesitan ser
   conscientes del CICLO, no de "para siempre".** hasSessionForPlanDay y
   el cardio de un día materializado en modo manual reutilizan las
   mismas filas de plan_days entre ciclos (a propósito, para no perder
   progresión) — cualquier "esto ya se calculó, no lo toques más" debe
   comparar contra el INICIO DEL CICLO VIGENTE (generatedAt), nunca
   contra "alguna vez en la historia de esta fila".

3. **LA MÁS IMPORTANTE — pasar un dato resuelto por una cadena de
   funciones no garantiza que el consumidor final lo use.** El bug de
   cardio más difícil de esta sesión tuvo DOS capas: resolveEffectiveDay
   (training.tsx) sustituía el cardio correctamente y lo pasaba a
   startSession() — pero session.store.ts descartaba ese valor sin
   guardarlo en ningún campo recuperable, y session.tsx volvía a
   derivarlo por su cuenta buscando por planDayId (=dbId del ANCLA,
   estable a propósito) dentro del plan del ancla — ignorando por
   completo lo que se le había pasado. El primer arreglo (capa 1) pareció
   suficiente pero no lo era; hizo falta un segundo audit para encontrar
   la capa 2. LECCIÓN: cuando un valor "ya resuelto" viaja a través de
   varias capas (función → store → componente), verificar EXPLÍCITAMENTE
   que cada capa intermedia lo propaga en vez de asumir que "pasar el
   dato" es suficiente — sobre todo si existe algún identificador
   estable (como planDayId=dbId del ancla) que un consumidor descuidado
   podría usar para "re-derivar" el dato de una fuente distinta y
   equivocada.

### Backlog general del proyecto (no relacionado con el constructor)

- Funcionalidades sociales S-1/S-2/S-3 — sin empezar, diseñadas hace
  tiempo (ver más arriba en este documento si hace falta el detalle).
- Producción de GIFs/vídeos de ejercicios — pipeline definido
  (Midjourney→Runway/Kling + catálogo Excel), en paralelo, sin código.
- Dos señales distintas responden a "estoy en modo manual":
  `profile.planMode` (intención, persistida) y `currentPlan.source`
  (plan realmente activo). `backToAutoPlan` encapsula
  `setPlanMode('auto') + generateAndSavePlan`, pero `activateManualPlan`
  NO llama a `setPlanMode` — eso lo hace `handleActivate` en
  routineBuilder.tsx por separado. Interruptor asimétrico. Paso
  pendiente: mover `setPlanMode('manual')` dentro de
  `activateManualPlan`.
- Desde Equipamiento se puede cambiar la UBICACIÓN estando en modo
  manual, dejando activo un plan de un contexto que el perfil ya no
  contempla.
- `resetAll` de `workout.store.ts` es código muerto (sin ningún call
  site) y no borra `exercise_targets`.
- `doSignOut` borra perfil y gamificación, pero no planes ni targets: la
  progresión de pesos sobrevive al cierre de sesión.
- E-3 / filtro de equipamiento — VERIFICADO 2026-08-03: NO es deuda.
  Cubierto en dos capas para location:'home' puro — en generación
  (`getProfileSignals` pone `isGym=false`, `canDoExercise` excluye el
  material ausente dentro de `selectExercisesForDayByMuscle`) y en
  arranque de sesión (`handleStart` fuerza `context='home'`, fix del
  2026-07-03). location:'both' es el único caso donde la generación
  asume gimnasio siempre y depende de la sustitución en sesión: diseño
  documentado, no bug. No reinvestigar sin motivo nuevo.
- RESUELTO 2026-08-03 (commits `76035ca`/`d9c038c`): el interruptor
  asimétrico `profile.planMode`/`currentPlan.source` del punto anterior se
  cerró eliminando `planMode` por completo — ver la sección nueva
  "Refactor: profile.planMode eliminado" más abajo. `activateManualPlan` ya
  no necesita sincronizar nada con `setPlanMode` porque `setPlanMode` no
  existe.
- `src/lib/supabase.ts` construye el cliente en ámbito de módulo usando `!`
  de TypeScript sobre las variables de entorno: eso apaga la única
  verificación posible y convierte una variable ausente o corrupta en un
  crash total con un mensaje que no menciona el `.env`. Pendiente: guarda
  explícita al principio del módulo, que además valide que la URL empieza
  por `https://`.
- No existe ningún `.env.example` versionado. Pendiente: crearlo con los
  NOMBRES de las variables y sin valores, para que cualquier PC nueva sepa
  qué necesita.
- `eas-cli` local desactualizado (21.2.0 frente a 21.5.0 disponible).
  Decisión: no actualizar el mismo día en que se validan migraciones;
  hacerlo en una sesión propia.

## Progresión de cargas — exercise_targets reindexada por ejercicio (migración 0016)

`exercise_targets` ya no está indexada por `plan_id` — la clave única
pasa a ser solo `exercise_id`. Migración `0016_exercise_targets_by_exercise.sql`:
reconstruye la tabla, colapsando duplicados por `updated_at` más reciente
(desempate por `id` DESC), y arranca con `DROP TABLE IF EXISTS
exercise_targets_new` para ser idempotente ante un reintento tras fallo
parcial. La tabla original se conserva como `exercise_targets_legacy` (no
declarada en `schema.ts`, sin uso en código).

Consecuencias buscadas:
- La progresión de pesos ya NO se resetea al regenerar el plan
  automático (afecta a los 6 call sites de `generateAndSavePlan`).
- La progresión es común a los contextos gym y home del mismo ejercicio.
- La calibración (`sessionCount === 0`) ocurre una sola vez por
  ejercicio, no una vez por plan.

Firmas cambiadas: `getExerciseTarget(exerciseId)`, `getAllExerciseTargets()`
(antes `getExerciseTargetsForPlan(planId)`), `upsertTarget(exerciseId,
output)`, `runProgressionAfterSession(exercisesData)`,
`getTargetFromProgression(exerciseId)` (todas en `src/lib/progression.ts`
y `src/store/session.store.ts`). La guarda `if (planId !== null)` de
`finishSession` en `session.store.ts` se mantiene a propósito aunque
`planId` ya no se use dentro de la llamada — retirarla es un cambio de
comportamiento pendiente de decidir aparte.

`computeNextTargets` clampa `currentRepsMin` al rango del plan
(`safeCurrentRepsMin = Math.min(Math.max(currentRepsMin, planRepsMin),
planRepsMax)`) para evitar rangos de reps invertidos (ej. 11-8) cuando el
objetivo guardado sobrevive a un cambio de rango de reps del plan.

Verificado con un banco de pruebas SQL aislado fuera del repo (colapso de
duplicados, desempate, NULL preservado, índice único, doble ejecución,
instalación limpia) antes de validar en dispositivo físico desde
instalación limpia.

## Refactor: profile.planMode eliminado — workout_plans.source como única fuente (2026-08-03)

Cierra el punto del "Backlog general del proyecto" (sección "Constructor de
rutina propia" más arriba) sobre el interruptor asimétrico entre
`profile.planMode` y `currentPlan.source`. Las menciones a
`profile.planMode` en el esquema y en `backToAutoPlan` de esa sección
describen el estado PREVIO a este refactor — se dejan sin tocar como
registro histórico; esta sección es la fuente correcta a partir de ahora.

- `profile.plan_mode` ELIMINADA (migración `0017_drop_plan_mode.sql`,
  `ALTER TABLE profile DROP COLUMN plan_mode` — primer uso de `DROP COLUMN`
  en el proyecto; `expo-sqlite` embarca SQLite 3.50.3, muy por encima del
  3.35 mínimo que requiere el comando).
- `workout_plans.source` (`'auto'|'manual'`) es ahora la ÚNICA fuente de
  verdad sobre el modo del plan. `setPlanMode` ya no existe en
  `profile.store.ts`.
- `backToAutoPlan` solo regenera: el plan vuelve a `source='auto'` porque
  `generateAndSavePlan` no pasa `source` y hereda el default del schema. No
  hace falta ningún flag aparte para marcarlo.
- `routineBuilder.tsx` usa `currentPlan?.source === 'manual'`, predicado
  GLOBAL sin comparar `context` (igual que `training.tsx`). Confundirlo con
  `isActiveForContext` escondería el enlace "volver al automático" al mirar
  el contexto que no es el ancla.
- Motivo del refactor: las dos señales podían divergir de verdad.
  `handleActivate` hacía dos escrituras separadas no atómicas
  (`activateManualPlan` + `setPlanMode`) sin `try/catch` común, así que un
  cierre de la app entre ambas dejaba un plan manual activo con
  `planMode='auto'` para siempre, sin ninguna reconciliación al arrancar.
- Verificado en un banco de pruebas SQL aislado, fuera del repo, antes de
  aplicar: las 16 columnas restantes conservan tipo/`NOT NULL`/`DEFAULT`/PK
  intactos, la fila de perfil sobrevive idéntica campo por campo, no hay
  índices/vistas/triggers sobre `profile` que referencien la columna
  (`sqlite_master`), y la re-ejecución de la migración falla de forma
  limpia sin destruir nada.

## Despliegue — variantes de app EAS

Tres variantes conviven en el teléfono de Juan vía app.config.js +
APP_VARIANT (ya no hay app.json estático):
- producción: com.elmatadorcol95.vulcan ("Vulcan")
- preview: com.elmatadorcol95.vulcan.preview ("Vulcan Preview") — build
  independiente para uso diario, sin necesidad del host/Metro
- development: com.elmatadorcol95.vulcan.dev ("Vulcan Dev") — dev client
  de siempre

eas.json enlaza cada perfil a su entorno EAS correspondiente vía
"environment", además de "env":{"APP_VARIANT"} para el identificador.

LECCIÓN IMPORTANTE, no repetir el error: crear variables de entorno en EAS
SIEMPRE con --value "..." --non-interactive, NUNCA con el prompt
interactivo de eas env:create — se detectó (con evidencia a nivel de
bytes, xxd) que el prompt interactivo puede colar un byte de control
invisible (0x02) al inicio del valor pegado, lo que rompe validaciones de
formato (URLs, keys) de forma indetectable a simple vista o incluso con
eas env:get. Costó una sesión entera de diagnóstico la primera vez.

LECCIÓN AMPLIADA (2026-08-03): el mismo byte de control 0x02 apareció
también en un `.env.local` LOCAL (en la 2.ª PC), no solo en variables de
EAS — con los dos valores de Supabase (`EXPO_PUBLIC_SUPABASE_URL` y
`EXPO_PUBLIC_SUPABASE_ANON_KEY`) empezando por 0x02 en la posición 0.
`.env.local` tiene PRIORIDAD sobre `.env` en Expo, así que machacaba los
valores buenos de `.env` sin que nada lo avisara. Síntoma: "Invalid
supabaseUrl" al importar `src/lib/supabase.ts`, lo que tumba `_layout.tsx`
entero y produce en cascada un "Cannot read property 'ErrorBoundary' of
undefined" — el mensaje no menciona el `.env` por ningún lado, así que el
diagnóstico tiene que empezar por ahí a propósito. Solución aplicada:
borrar `.env.local` y arrancar con `--clear`. Lección ampliada: nunca pegar
credenciales en un prompt interactivo de terminal, ni para EAS ni en local.
Para regenerar `.env.local` limpio, usar `eas env:pull --environment <env>`.

DECISIÓN — expo-updates en el perfil "preview": el perfil de build
"preview" declara `channel:"preview"`, pero `expo-updates` NO está
instalado (se retiró a propósito tras romper cosas — ver commit
`3bb39e0`). Por eso `eas build --profile preview` PREGUNTA si instalarlo en
cada build. Responder siempre que NO. El build se completa igual sin el
paquete; lo único que no se puede hacer es enviar actualizaciones OTA, que
no forma parte del flujo actual (distribución manual del APK).

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
- ~~FASE 3 — Cardio según objetivo (pasos 3-A a 3-K)~~ ✓ Completado (JS,
  recarga). Pendiente sin fecha: intercambio (swap) de bloques de cardio,
  hoy deshabilitado a propósito.
- ~~FASE 0-B-1 — Motor de priorización muscular~~ ✓ Completado (Pasos 1-3:
  datos + generador + pantalla real en Perfil y onboarding, Opción B foto+
  etiquetas ganó la exploración).
- ~~Preferencias de ejercicios (like/dislike)~~ ✓ Completado (capas 1a-7b:
  motor de generación + UI en ChangeExerciseModal/ExerciseCard/session.tsx
  + pantalla dedicada en Perfil, JS, recarga).
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
