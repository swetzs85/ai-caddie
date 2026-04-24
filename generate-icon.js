const sharp = require('sharp');
const path = require('path');

const SIZE = 512;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1B5E20;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2E7D32;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="115%" height="115%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${SIZE}" height="${SIZE}" rx="90" fill="url(#bgGrad)" />

  <!-- Left strap -->
  <path d="M 118 0  L 155 0  L 155 115  L 118 100  Z" fill="#FFFFFF" opacity="0.95" filter="url(#shadow)"/>
  <!-- Right strap -->
  <path d="M 357 0  L 394 0  L 394 100  L 357 115  Z" fill="#FFFFFF" opacity="0.95" filter="url(#shadow)"/>

  <!-- Main bib body — wide flat rectangle -->
  <rect x="80" y="95" width="352" height="370" rx="18" fill="#FFFFFF" filter="url(#shadow)"/>

  <!-- Strap connectors — small rivets -->
  <circle cx="137" cy="108" r="6" fill="#AAAAAA" />
  <circle cx="137" cy="108" r="3" fill="#888888" />
  <circle cx="375" cy="108" r="6" fill="#AAAAAA" />
  <circle cx="375" cy="108" r="3" fill="#888888" />

  <!-- Green inner panel -->
  <rect x="100" y="130" width="312" height="310" rx="12" fill="#1B5E20"/>

  <!-- "ART" text — large white, high contrast -->
  <text x="256" y="290" text-anchor="middle" font-family="Arial Black, Impact, Arial, Helvetica, sans-serif" font-weight="900" font-size="145" fill="#FFFFFF" letter-spacing="6">ART</text>

  <!-- Thin divider -->
  <line x1="145" y1="312" x2="367" y2="312" stroke="#FFFFFF" stroke-width="2.5" opacity="0.5" stroke-linecap="round"/>

  <!-- "THE CADDIE" subtitle — white -->
  <text x="256" y="355" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="38" fill="#FFFFFF" letter-spacing="7" opacity="0.85">THE CADDIE</text>

  <!-- Small golf flag icon -->
  <g transform="translate(256, 382)" opacity="0.6">
    <line x1="0" y1="0" x2="0" y2="35" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    <path d="M 2 2 L 18 10 L 2 18 Z" fill="#FF5252"/>
    <ellipse cx="0" cy="38" rx="10" ry="3" fill="#FFFFFF" opacity="0.3"/>
  </g>
</svg>`;

async function generate() {
  const sizes = [
    { name: 'icon-180.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
  ];

  for (const { name, size } of sizes) {
    const outPath = path.join(__dirname, 'dist', name);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
    console.log('Generated: ' + name + ' (' + size + 'x' + size + ')');
  }

  const assetsPath = path.join(__dirname, 'assets', 'icon.png');
  await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(assetsPath);
  console.log('Generated: assets/icon.png (1024x1024)');
}

generate().catch(e => console.error(e));
