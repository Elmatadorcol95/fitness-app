import Svg, { G, Path, Ellipse, Use } from 'react-native-svg';

// Exportado — importado por el paso 3c (pantalla real de prioridades).
export type MuscleRegionId =
  | 'chest' | 'shoulders' | 'biceps' | 'quads' | 'core_abdomen'
  | 'back' | 'triceps' | 'glutes' | 'hamstrings' | 'calves';

interface MuscleDiagramProps {
  view: 'front' | 'back';
  selected: MuscleRegionId[];
  onRegionPress: (id: MuscleRegionId) => void;
}

const GREEN = '#3FBF7F';
const AMBER = '#F2B450';
const UNSELECTED_OPACITY = 0.35;

// Área táctil ampliada sin cambiar lo visible: mismo `d`, relleno/trazo
// transparentes con strokeWidth grande. Regla del spike 3a: SIEMPRE un
// Path/Ellipse real por lado, nunca <Use> para nada tocable.
const TOUCH_PAD_WIDTH = 16;

// ── Silueta decorativa (sin toque) — geometría dada, sin reinventar ─────────
// Compartida entre vista frontal y trasera. Las piernas/brazos usan <Use>
// para el espejo porque NO son tocables (solo decorativas); el viewBox
// "-100 0 200 520" está centrado en x=0, así que scale(-1,1) sin translate
// ya mirror-ea correctamente.
function Silhouette() {
  return (
    <G id="sil">
      <Path
        id="legR"
        d="M 8,254 C 16,258 28,259 38,256 L 47,251 C 49,272 47,298 44,322 C 42,346 39,364 37,378 C 36,390 35,400 35,408 C 35,426 34,446 32,464 C 31,474 30,482 30,488 C 36,490 41,494 42,499 C 43,504 40,507 35,507 L 22,507 C 17,507 15,503 16,497 C 17,491 17,486 17,482 C 17,474 16,466 16,458 C 15,442 15,424 16,406 C 16,396 16,386 15,376 C 13,358 11,338 10,316 C 9,296 8,274 8,254 Z"
        fill="#1E2621"
        stroke="#2E3830"
      />
      <Use href="#legR" transform="scale(-1,1)" />
      <Path
        id="armR"
        d="M 57,84 C 71,84 80,92 82,106 C 84,124 82,144 78,164 C 76,174 75,182 74,190 C 72,210 70,230 68,248 L 66,254 C 70,264 70,274 66,282 C 62,288 55,288 53,281 C 51,273 52,263 55,254 L 56,248 C 57,230 58,210 58,194 C 58,184 57,174 56,166 C 53,148 52,126 53,108 C 54,98 54,88 57,84 Z"
        fill="#1E2621"
        stroke="#2E3830"
      />
      <Use href="#armR" transform="scale(-1,1)" />
      <Path
        d="M 0,76 C 22,76 46,78 60,84 C 66,88 68,94 67,102 C 64,118 58,142 52,168 C 48,188 46,202 47,216 C 48,230 52,240 50,252 C 44,258 34,262 22,264 C 14,265 6,266 0,266 C -6,266 -14,265 -22,264 C -34,262 -44,258 -50,252 C -52,240 -48,230 -47,216 C -46,202 -48,188 -52,168 C -58,142 -64,118 -67,102 C -68,94 -66,88 -60,84 C -46,78 -22,76 0,76 Z"
        fill="#1E2621"
        stroke="#2E3830"
      />
      <Path
        d="M -9,50 C -9,62 -10,70 -13,78 L 13,78 C 10,70 9,62 9,50 Z"
        fill="#1E2621"
        stroke="#2E3830"
      />
      <Ellipse cx="0" cy="27" rx="20" ry="27" fill="#1E2621" stroke="#2E3830" />
    </G>
  );
}

// ── Regiones tocables ────────────────────────────────────────────────────────
// Vista frontal
const SHOULDERS_R = 'M 54,86 C 66,84 78,92 80,104 C 81,114 78,122 72,126 C 66,128 60,126 57,118 C 54,110 52,96 54,86 Z';
const SHOULDERS_L = 'M -54,86 C -66,84 -78,92 -80,104 C -81,114 -78,122 -72,126 C -66,128 -60,126 -57,118 C -54,110 -52,96 -54,86 Z';
const CHEST_R = 'M 3,92 L 50,96 C 56,108 56,124 50,134 C 40,144 16,146 5,140 C 2,126 2,106 3,92 Z';
const CHEST_L = 'M -3,92 L -50,96 C -56,108 -56,124 -50,134 C -40,144 -16,146 -5,140 C -2,126 -2,106 -3,92 Z';
const BICEPS_R = 'M 60,110 C 68,108 74,114 75,126 C 76,142 72,156 66,162 C 61,164 57,158 57,146 C 57,132 57,118 60,110 Z';
const BICEPS_L = 'M -60,110 C -68,108 -74,114 -75,126 C -76,142 -72,156 -66,162 C -61,164 -57,158 -57,146 C -57,132 -57,118 -60,110 Z';
const QUADS_R = 'M 12,262 C 24,258 36,258 44,262 C 46,286 44,314 40,338 C 37,356 33,368 28,372 C 22,374 17,368 15,352 C 13,328 11,296 12,262 Z';
const QUADS_L = 'M -12,262 C -24,258 -36,258 -44,262 C -46,286 -44,314 -40,338 C -37,356 -33,368 -28,372 C -22,374 -17,368 -15,352 C -13,328 -11,296 -12,262 Z';
const CORE_ABDOMEN = 'M -30,166 C -30,156 -24,152 -14,152 L 14,152 C 24,152 30,156 30,166 L 30,226 C 30,238 22,244 10,244 L -10,244 C -22,244 -30,238 -30,226 Z';

// Vista trasera
const BACK_CENTRAL = 'M 0,58 C 8,60 18,66 26,72 C 40,78 54,82 60,86 C 64,92 64,98 62,104 C 58,116 52,128 46,142 C 42,156 38,172 34,188 C 30,200 24,208 14,212 L 0,214 L -14,212 C -24,208 -30,200 -34,188 C -38,172 -42,156 -46,142 C -52,128 -58,116 -62,104 C -64,98 -64,92 -60,86 C -54,82 -40,78 -26,72 C -18,66 -8,60 0,58 Z';
const TRICEPS_R = 'M 58,108 C 66,104 74,110 76,122 C 77,138 74,154 68,162 C 62,166 57,160 56,148 C 55,134 55,118 58,108 Z';
const TRICEPS_L = 'M -58,108 C -66,104 -74,110 -76,122 C -77,138 -74,154 -68,162 C -62,166 -57,160 -56,148 C -55,134 -55,118 -58,108 Z';
const GLUTES_R = 'M 4,216 C 16,212 32,214 42,222 C 46,232 46,246 41,256 C 34,264 20,266 10,262 C 4,256 2,236 4,216 Z';
const GLUTES_L = 'M -4,216 C -16,212 -32,214 -42,222 C -46,232 -46,246 -41,256 C -34,264 -20,266 -10,262 C -4,256 -2,236 -4,216 Z';
const HAMSTRINGS_R = 'M 13,284 C 23,280 35,280 42,284 C 44,306 42,330 38,350 C 35,364 31,372 27,374 C 21,375 17,368 16,354 C 14,330 13,306 13,284 Z';
const HAMSTRINGS_L = 'M -13,284 C -23,280 -35,280 -42,284 C -44,306 -42,330 -38,350 C -35,364 -31,372 -27,374 C -21,375 -17,368 -16,354 C -14,330 -13,306 -13,284 Z';
const CALVES_R = 'M 19,400 C 27,394 33,396 36,406 C 38,420 37,438 33,452 C 30,461 26,464 23,460 C 20,454 18,440 17,424 C 17,414 17,406 19,400 Z';
const CALVES_L = 'M -19,400 C -27,394 -33,396 -36,406 C -38,420 -37,438 -33,452 C -30,461 -26,464 -23,460 C -20,454 -18,440 -17,424 C -17,414 -17,406 -19,400 Z';

interface RegionDef {
  id: MuscleRegionId;
  d: string;
  mirrorD?: string; // presente = bilateral; ausente = central, un solo elemento
}

const FRONT_REGIONS: RegionDef[] = [
  { id: 'shoulders', d: SHOULDERS_R, mirrorD: SHOULDERS_L },
  { id: 'chest', d: CHEST_R, mirrorD: CHEST_L },
  { id: 'biceps', d: BICEPS_R, mirrorD: BICEPS_L },
  { id: 'quads', d: QUADS_R, mirrorD: QUADS_L },
  { id: 'core_abdomen', d: CORE_ABDOMEN },
];

const BACK_REGIONS: RegionDef[] = [
  { id: 'back', d: BACK_CENTRAL },
  { id: 'triceps', d: TRICEPS_R, mirrorD: TRICEPS_L },
  { id: 'glutes', d: GLUTES_R, mirrorD: GLUTES_L },
  { id: 'hamstrings', d: HAMSTRINGS_R, mirrorD: HAMSTRINGS_L },
  { id: 'calves', d: CALVES_R, mirrorD: CALVES_L },
];

// Un Path visible (color según selección) + un Path invisible superpuesto
// (fill/stroke transparentes, strokeWidth grande) que amplía el área táctil
// real. Bilateral = misma pareja para el lado derivado (mirrorD), con el
// MISMO onRegionPress(id) en ambos lados.
function RegionShape({ id, d, mirrorD, isSelected, onRegionPress }: {
  id: MuscleRegionId;
  d: string;
  mirrorD?: string;
  isSelected: boolean;
  onRegionPress: (id: MuscleRegionId) => void;
}) {
  const fill = isSelected ? AMBER : GREEN;
  const fillOpacity = isSelected ? 1 : UNSELECTED_OPACITY;
  const handlePress = () => onRegionPress(id);

  return (
    <>
      <Path d={d} fill={fill} fillOpacity={fillOpacity} onPress={handlePress} />
      <Path d={d} fill="transparent" stroke="transparent" strokeWidth={TOUCH_PAD_WIDTH} onPress={handlePress} />
      {mirrorD && (
        <>
          <Path d={mirrorD} fill={fill} fillOpacity={fillOpacity} onPress={handlePress} />
          <Path d={mirrorD} fill="transparent" stroke="transparent" strokeWidth={TOUCH_PAD_WIDTH} onPress={handlePress} />
        </>
      )}
    </>
  );
}

// ── Líneas anatómicas decorativas (sin toque, encima de las zonas tocables) ──
// Refinamiento visual puro: no llevan onPress, no participan en la lógica de
// selección — solo LEEN el mismo booleano de selección de su región para
// elegir color. Pueden usar <Use> para el espejo (a diferencia de las
// regiones tocables) porque aquí no hay riesgo de atribución de toque.
const DECO_INACTIVE = '#0F1712';
const DECO_ACTIVE = '#8A5F1E';
const DECO_STROKE_WIDTH = 1.4;

function DecoLine({ id, d, selected, mirror }: {
  id?: string;
  d: string;
  selected: boolean;
  mirror?: boolean;
}) {
  const color = selected ? DECO_ACTIVE : DECO_INACTIVE;
  return (
    <>
      <Path id={id} d={d} fill="none" stroke={color} strokeWidth={DECO_STROKE_WIDTH} strokeLinecap="round" />
      {mirror && id && (
        <Use
          href={`#${id}`}
          transform="scale(-1,1)"
          fill="none"
          stroke={color}
          strokeWidth={DECO_STROKE_WIDTH}
          strokeLinecap="round"
        />
      )}
    </>
  );
}

// Oblicuo — única forma rellena entre las decorativas (no línea), opacidad
// baja fija en verde de paleta, independiente de cualquier selección.
const OBLIQUE_R = 'M 38,158 C 34,172 33,190 35,206 C 38,214 42,210 43,196 C 44,182 41,168 38,158 Z';
const OBLIQUE_OPACITY = 0.18;

function ObliqueShape() {
  return (
    <>
      <Path id="obliqueR" d={OBLIQUE_R} fill={GREEN} fillOpacity={OBLIQUE_OPACITY} />
      <Use href="#obliqueR" transform="scale(-1,1)" fill={GREEN} fillOpacity={OBLIQUE_OPACITY} />
    </>
  );
}

function FrontDecorations({ isSelected }: { isSelected: (id: MuscleRegionId) => boolean }) {
  return (
    <>
      <DecoLine id="clavicleR" d="M 8,84 C 20,86 34,88 46,88" selected={isSelected('chest')} mirror />
      <DecoLine id="deltoidR" d="M 60,92 C 64,102 66,112 65,122" selected={isSelected('shoulders')} mirror />
      <DecoLine id="pecGrooveR" d="M 8,100 C 20,104 34,104 46,100" selected={isSelected('chest')} mirror />
      <DecoLine id="pecLowerR" d="M 10,138 C 22,142 38,140 48,132" selected={isSelected('chest')} mirror />
      <DecoLine id="bicepsLineR" d="M 63,118 C 66,130 66,146 63,156" selected={isSelected('biceps')} mirror />
      <ObliqueShape />
      <DecoLine d="M 0,156 L 0,240" selected={isSelected('core_abdomen')} />
      <DecoLine d="M -27,184 L 27,184" selected={isSelected('core_abdomen')} />
      <DecoLine d="M -27,212 L 27,212" selected={isSelected('core_abdomen')} />
      <DecoLine id="quadSep1R" d="M 28,266 C 30,298 29,332 26,360" selected={isSelected('quads')} mirror />
      <DecoLine id="quadSep2R" d="M 38,272 C 40,300 38,330 34,354" selected={isSelected('quads')} mirror />
    </>
  );
}

function BackDecorations({ isSelected }: { isSelected: (id: MuscleRegionId) => boolean }) {
  return (
    <>
      <DecoLine id="scapulaR" d="M 12,86 C 26,94 34,106 36,120" selected={isSelected('back')} mirror />
      <DecoLine d="M 0,62 L 0,210" selected={isSelected('back')} />
      <DecoLine d="M -22,72 C -8,86 8,86 22,72" selected={isSelected('back')} />
      <DecoLine id="dorsalR" d="M 30,120 C 26,140 22,160 18,178" selected={isSelected('back')} mirror />
      <DecoLine id="tricepsLine1R" d="M 61,114 C 64,126 64,140 62,150" selected={isSelected('triceps')} mirror />
      <DecoLine id="tricepsLine2R" d="M 68,118 C 70,130 69,142 66,152" selected={isSelected('triceps')} mirror />
      <DecoLine id="gluteFoldR" d="M 10,232 C 20,228 32,230 40,236" selected={isSelected('glutes')} mirror />
      <DecoLine id="hamHead1R" d="M 28,288 C 30,312 29,340 26,364" selected={isSelected('hamstrings')} mirror />
      <DecoLine id="hamHead2R" d="M 36,292 C 38,314 36,340 33,360" selected={isSelected('hamstrings')} mirror />
      <DecoLine id="calfTendonR" d="M 27,402 C 28,418 28,438 27,454" selected={isSelected('calves')} mirror />
      <DecoLine id="soleusVR" d="M 20,436 C 24,442 30,442 34,436" selected={isSelected('calves')} mirror />
    </>
  );
}

// Puramente presentacional — sin estado propio, sin store, sin saber nada
// de MuscleGroup (eso lo traduce quien lo use, en el paso 3c).
export function MuscleDiagram({ view, selected, onRegionPress }: MuscleDiagramProps) {
  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const isSelected = (id: MuscleRegionId) => selected.includes(id);

  return (
    <Svg viewBox="-100 0 200 520" width="100%" height="100%">
      <Silhouette />
      {regions.map(r => (
        <RegionShape
          key={r.id}
          id={r.id}
          d={r.d}
          mirrorD={r.mirrorD}
          isSelected={isSelected(r.id)}
          onRegionPress={onRegionPress}
        />
      ))}
      {view === 'front' ? <FrontDecorations isSelected={isSelected} /> : <BackDecorations isSelected={isSelected} />}
    </Svg>
  );
}
