/**
 * Genera los iconos de Vulcan en los tamaños que necesitan iOS y Android.
 * Ejecutar con: node scripts/generate-icon.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// ─── SVG del logo Vulcan ───────────────────────────────────────────────────────
// Composición: fondo oscuro · yunque en verde · martillo en 45° · chispas ámbar
const SVG = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Fondo -->
  <rect width="1024" height="1024" fill="#141A17"/>

  <!-- ── YUNQUE ── -->
  <!-- Superficie superior (más ancha) -->
  <rect x="162" y="595" width="700" height="75" rx="14" fill="#3FBF7F"/>
  <!-- Cuerpo central -->
  <rect x="262" y="670" width="500" height="135" rx="14" fill="#2D9966"/>
  <!-- Base inferior -->
  <rect x="212" y="788" width="600" height="48" rx="12" fill="#3FBF7F"/>

  <!-- ── MARTILLO (pivote en 218,250 · rotado 45°) ── -->
  <g transform="rotate(45, 218, 250)">
    <!-- Mango: verde claro, fino y largo -->
    <rect x="204" y="250" width="28" height="385" rx="12" fill="#5BD897"/>
    <!-- Cabeza: verde, ancha, perpendicular al mango -->
    <rect x="104" y="615" width="228" height="70" rx="13" fill="#3FBF7F"/>
  </g>

  <!-- ── CHISPAS ámbar en el punto de impacto (~512,585) ── -->
  <circle cx="512" cy="584" r="13" fill="#F2B450"/>
  <circle cx="476" cy="563" r="8"  fill="#F2B450" opacity="0.82"/>
  <circle cx="549" cy="567" r="9"  fill="#F2B450" opacity="0.87"/>
  <circle cx="493" cy="544" r="6"  fill="#F2B450" opacity="0.70"/>
  <circle cx="533" cy="548" r="6"  fill="#F2B450" opacity="0.65"/>
  <circle cx="464" cy="579" r="5"  fill="#F2B450" opacity="0.60"/>
</svg>
`;

// ─── Tamaños necesarios ────────────────────────────────────────────────────────
const TARGETS = [
  // Expo / iOS principal
  { file: 'assets/images/icon.png',                    size: 1024 },
  // Android adaptive foreground (sin fondo, mismo diseño)
  { file: 'assets/images/android-icon-foreground.png', size: 1024 },
  // Android splash
  { file: 'assets/images/splash-icon.png',             size:  200 },
];

(async () => {
  const buf = Buffer.from(SVG);

  for (const { file, size } of TARGETS) {
    const dest = path.join(__dirname, '..', file);
    await sharp(buf).resize(size, size).png().toFile(dest);
    console.log(`✓  ${file}  (${size}×${size})`);
  }

  console.log('\n🔨  Iconos de Vulcan generados correctamente.');
})();
