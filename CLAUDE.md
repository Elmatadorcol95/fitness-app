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
  * src/lib/plan-generator.ts: algoritmo con splits PPL/full/upper-lower,
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
- Siguiente: FASE 7 — In-app purchase (OBLIGATORIA antes de publicar).
- Pendiente obligatorio: FASE 7 — In-app purchase.
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
- FASE D — Deloads automáticos, gráfica de fuerza (1RM) en pestaña Progreso,
  calentamientos sugeridos basados en el peso objetivo.

## IMPORTANTE
Actualiza la sección "Estado actual" al final de cada sesión, anotando qué se 
completó y cuál es el siguiente paso.
