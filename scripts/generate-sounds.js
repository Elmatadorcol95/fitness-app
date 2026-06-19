/**
 * Genera archivos MP3 de silencio válidos en assets/sounds/.
 * Reemplaza estos archivos con sonidos reales antes del EAS Build final.
 * Formato: MPEG1 Layer3, 128 kbps, 44100 Hz, mono.
 * Frame size = floor(144 * 128000 / 44100) = 417 bytes por frame.
 */
const fs   = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });

// Cabecera de frame MPEG1 L3: FF FB 90 64
// FF FB = sync + MPEG1 + Layer3 + sin CRC
// 90   = bitrate index 9 (128 kbps) << 4 | sample index 0 (44100 Hz) << 2
// 64   = sin padding, modo mono (channel_mode=3)
const frameHeader = Buffer.from([0xFF, 0xFB, 0x90, 0x64]);
const frameData   = Buffer.alloc(413, 0x00); // 417 - 4 = 413 bytes de silencio
const frame       = Buffer.concat([frameHeader, frameData]);

// 8 frames ≈ 0.21 s de silencio — suficiente para cualquier decodificador
const mp3 = Buffer.concat([frame, frame, frame, frame, frame, frame, frame, frame]);

for (const name of ['rest-done.mp3', 'achievement.mp3']) {
  const dest = path.join(dir, name);
  fs.writeFileSync(dest, mp3);
  console.log(`Creado: ${name} (${mp3.length} bytes)`);
}
console.log('Listo. Reemplaza estos archivos con sonidos reales antes del build final.');
