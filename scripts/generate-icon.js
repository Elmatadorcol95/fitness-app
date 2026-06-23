/**
 * Genera los iconos y la imagen de splash de Vulcan a partir de los SVGs definitivos.
 * Ejecutar con: node scripts/generate-icon.js
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT = path.join(__dirname, '..');

const ICON_SVG   = fs.readFileSync(path.join(ROOT, 'assets/brand/vulcan-icono-nuevo.svg'));
const LOGO_SVG   = fs.readFileSync(path.join(ROOT, 'assets/brand/vulcan-logo-nuevo.svg'));

// Para el monochrome Android usamos el mismo SVG del icono (sin fondo de color).
// El sistema Android lo pintará en blanco/gris según el tema.
const ICON_TARGETS = [
  { file: 'assets/images/icon.png',                    w: 1024, h: 1024, src: ICON_SVG },
  { file: 'assets/images/android-icon-foreground.png', w: 1024, h: 1024, src: ICON_SVG },
  { file: 'assets/images/splash-icon.png',             w:  600, h:  720, src: LOGO_SVG },
];

(async () => {
  for (const { file, w, h, src } of ICON_TARGETS) {
    const dest = path.join(ROOT, file);
    await sharp(src).resize(w, h).png().toFile(dest);
    console.log(`✓  ${file}  (${w}×${h})`);
  }
  console.log('\n🔨  Iconos de Vulcan generados correctamente.');
})();
