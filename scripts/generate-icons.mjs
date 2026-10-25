import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create public/icon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#151B23"/>
      <stop offset="100%" stop-color="#0D1117"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="cyan" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="emerald" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect x="16" y="16" width="480" height="480" rx="96" fill="none" stroke="#263040" stroke-width="8"/>

  <!-- Isometric CloudCraft Voxel Plinth & Server Cubes -->
  <!-- Center EC2 Cube (Top Face, Left Face, Right Face) -->
  <g transform="translate(256, 230)">
    <!-- Bottom Shadow -->
    <path d="M 0 150 L 130 75 L 0 0 L -130 75 Z" fill="#000000" opacity="0.4"/>

    <!-- Left Base / Private Subnet Tier -->
    <path d="M -90 40 L 0 92 L 0 140 L -90 88 Z" fill="#1E293B"/>
    <path d="M 0 92 L 90 40 L 90 88 L 0 140 Z" fill="#0F172A"/>
    <path d="M 0 44 L 90 -8 L 0 -60 L -90 -8 Z" fill="#334155"/>

    <!-- Main Voxel Cloud Server -->
    <!-- Top Face -->
    <path d="M 0 -85 L 95 -30 L 0 25 L -95 -30 Z" fill="url(#gold)"/>
    <!-- Left Face -->
    <path d="M -95 -30 L 0 25 L 0 100 L -95 45 Z" fill="#B45309"/>
    <!-- Right Face -->
    <path d="M 0 25 L 95 -30 L 95 45 L 0 100 Z" fill="#78350F"/>

    <!-- Glowing Brass Status Nodes & Network Lines -->
    <circle cx="-50" cy="5" r="7" fill="#FDE68A"/>
    <circle cx="0" cy="34" r="7" fill="#FDE68A"/>
    <circle cx="50" cy="5" r="7" fill="#FDE68A"/>

    <!-- Floating Cyan Packet Orbit -->
    <ellipse cx="0" cy="-30" rx="125" ry="50" fill="none" stroke="url(#cyan)" stroke-width="6" stroke-dasharray="16 12"/>
    <circle cx="108" cy="-5" r="14" fill="#38BDF8"/>

    <!-- Floating Emerald S3 Tier -->
    <circle cx="-100" cy="-45" r="12" fill="#10B981"/>
  </g>

  <!-- AWS Terminal Header Text -->
  <text x="256" y="445" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="34" fill="#F8FAFC" text-anchor="middle" letter-spacing="4">CLOUDCRAFT</text>
  <text x="256" y="475" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="16" fill="#F59E0B" text-anchor="middle" letter-spacing="3">DEVOPS ARCHITECT</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Function to generate raw PNG from pure node buffer with CRC32 & Deflate
function createPNG(size, isMaskable = false) {
  const width = size;
  const height = size;

  // Raw RGBA scanlines: 1 filter byte (0) + width * 4 bytes per row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width / 2 : width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: #151B23 (R: 21, G: 27, B: 35)
      let r = 21;
      let g = 27;
      let b = 35;
      let a = 255;

      if (!isMaskable && dist > radius) {
        // Outside circle/squircle bounds on non-maskable icons
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy)) - (width * 0.38);
        if (cornerDist > 0) {
          const cornerR = Math.sqrt(
            Math.max(0, Math.abs(dx) - width * 0.3) ** 2 +
            Math.max(0, Math.abs(dy) - height * 0.3) ** 2
          );
          if (cornerR > width * 0.18) {
            a = 0;
          }
        }
      }

      // Draw iconic golden isometric block in center
      // Center scale factor based on icon size
      const scale = size / 512;
      const nx = dx / scale;
      const ny = (dy + 20 * scale) / scale;

      // Isometric diamond check for top face
      const isoY = ny;
      const isoX = nx;
      const dDiamond = Math.abs(isoX / 80) + Math.abs(isoY / 46);

      if (dDiamond < 1.0 && isoY < 15) {
        // Amber / Gold top face
        r = 245; g = 158; b = 11;
        if (dDiamond < 0.8) { r = 251; g = 191; b = 36; }
      } else if (nx < 0 && nx > -80 && isoY >= 0 && isoY < 80 + nx * 0.5) {
        // Left face (Dark Amber)
        r = 180; g = 83; b = 9;
      } else if (nx >= 0 && nx < 80 && isoY >= 0 && isoY < 80 - nx * 0.5) {
        // Right face (Deep Bronze)
        r = 120; g = 53; b = 15;
      }

      // Orbiting cyan node
      const dNode = Math.sqrt((nx - 90) ** 2 + (ny + 10) ** 2);
      if (dNode < 16) {
        r = 56; g = 189; b = 248; // Signal Cyan
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress with deflate
  const compressed = zlib.deflateSync(rawData);

  // PNG File Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);

    const typeBuf = Buffer.from(type);
    const body = Buffer.concat([typeBuf, data]);

    const crcBuf = Buffer.alloc(4);
    crcBuf.writeInt32BE(crc32(body), 0);

    return Buffer.concat([len, body, crcBuf]);
  }

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// CRC32 implementation for PNG chunks
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return crc ^ -1;
}

// Write out all PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, false));

console.log('Successfully generated all PWA icons in /public:');
console.log('- icon.svg');
console.log('- pwa-192x192.png');
console.log('- pwa-512x512.png');
console.log('- pwa-maskable-512x512.png');
console.log('- apple-touch-icon.png');
