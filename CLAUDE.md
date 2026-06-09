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
- Siguiente: MEJORA C — Frases motivadoras diarias (JS, recarga):
  Lista de 30 frases originales Vulcan, rotación diaria, en pantalla Hoy.
- Pendiente obligatorio: FASE 7 — In-app purchase.
  ⚠️  OBLIGATORIO antes de publicar en tiendas o cuando expire el trial de 14 días.

## Plan de fases

### Completadas
- FASE 1–8 completadas (ver Estado actual).

### Lote visual/motivación (en curso, sin recompilar hasta la última)
- MEJORA A — Íconos uniformes (JS, recarga):
  Reemplazar todos los emojis por @expo/vector-icons; símbolo Vulcan en vacíos.
- MEJORA B — Gráfica y tendencias de medidas (JS, recarga):
  Fechas en eje X; flechas de tendencia con color según objetivo del usuario.
- MEJORA C — Frases motivadoras diarias (JS, recarga):
  Lista de 30 frases originales Vulcan, rotación diaria, mostradas en pantalla Hoy.
- MEJORA D — Gamificación (JS, recarga):
  Racha de entrenamiento, logros temáticos, celebración de PR con chispas.
- MEJORA E — Recap mensual/semanal (JS, recarga):
  Tarjeta "Tu forja de [mes]" + versión semanal mini; compartible como imagen.
- MEJORA F — Háptica (nativo, recompilar):
  expo-haptics: vibración en completar serie, guardar y desbloquear logro.
  ⚠️ Agrupar aquí cualquier otro módulo nativo pendiente.

### Pendientes principales
- FASE 7 — In-app purchase (OBLIGATORIA antes de publicar).
- FASE 9 — Módulo Entrenamiento: base de ejercicios, generador de planes,
  registro de sesiones, temporizador de descanso con martillo.

## IMPORTANTE
Actualiza la sección "Estado actual" al final de cada sesión, anotando qué se 
completó y cuál es el siguiente paso.
