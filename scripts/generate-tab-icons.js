/**
 * Genera los iconos PNG para las pestañas de Vulcan.
 * Ejecutar con: node scripts/generate-tab-icons.js
 * Los iconos se renderizan como "template" (silueta blanca),
 * así el sistema los colorea según el estado activo/inactivo.
 */

const sharp = require('sharp');
const path  = require('path');

const W = '#FFFFFF';  // blanco: el OS aplicará el tinte de la tab bar

const ICONS = {
  // ── Hoy: rayo/centella (energía, Vulcan) ─────────────────────────────────
  today: `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <path d="M34 4 L14 34 h12 L18 56 L48 26 H36 Z" fill="${W}"/>
  </svg>`,

  // ── Historial: reloj ──────────────────────────────────────────────────────
  history: `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="30" r="22" fill="none" stroke="${W}" stroke-width="4"/>
    <line x1="30" y1="30" x2="30" y2="14" stroke="${W}" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="30" y1="30" x2="42" y2="38" stroke="${W}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="30" cy="30" r="2.5" fill="${W}"/>
  </svg>`,

  // ── Progreso: barras ascendentes ─────────────────────────────────────────
  progress: `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <rect x="6"  y="36" width="12" height="18" rx="3" fill="${W}"/>
    <rect x="24" y="22" width="12" height="32" rx="3" fill="${W}"/>
    <rect x="42" y="10" width="12" height="44" rx="3" fill="${W}"/>
    <line x1="4" y1="56" x2="56" y2="56" stroke="${W}" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  // ── Perfil: silueta persona ───────────────────────────────────────────────
  profile: `<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
    <circle cx="30" cy="20" r="12" fill="${W}"/>
    <path d="M8 56 C8 38 52 38 52 56" fill="${W}"/>
  </svg>`,
};

const SIZES = [1, 2, 3];  // @1x, @2x, @3x

(async () => {
  const outDir = path.join(__dirname, '..', 'assets', 'images', 'tabIcons');

  for (const [name, svg] of Object.entries(ICONS)) {
    const buf = Buffer.from(svg);
    for (const scale of SIZES) {
      const size = 30 * scale;  // 30 pt base → 30, 60, 90 px
      const suffix = scale === 1 ? '' : `@${scale}x`;
      const file = path.join(outDir, `${name}${suffix}.png`);
      await sharp(buf).resize(size, size).png().toFile(file);
      console.log(`✓  tabIcons/${name}${suffix}.png  (${size}×${size})`);
    }
  }

  console.log('\n🔨  Iconos de pestañas generados correctamente.');
})();
