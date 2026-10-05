// Renders the logo (shared/logo: a coin with a euro sign in round-capped strokes) as the app
// icons in headless Edge: public/icons/*.png (web app manifest, iOS home screen), public/favicon.ico
// (16, 32 and 48 px PNGs inside) and public/favicon.svg (follows the browser's light/dark mode).
// Run again when the logo changes. Windows with Edge; from src/web:
//   node scripts/make-icons.mjs
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const publicDir = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
  'public',
);
const iconDir = path.join(publicDir, 'icons');
fs.mkdirSync(iconDir, { recursive: true });

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9334;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'edge-icons-'));
const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  'about:blank',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The drawing of shared/logo/logo.ts (viewBox 2 2 60 60) and its colors from styles.css: the
// light theme's (dark coin, gold sign) for the icons, the dark theme's in favicon.svg's dark mode
const SIGN_PATH = 'M41.83 22.19A13.2 13.2 0 1 0 41.83 41.81M16 27.7H30.5M16 36.3H30.5';
const LIGHT = { coin: '#1c1f22', sign: '#f2b51e' };
const DARK = { coin: '#f2b51e', sign: '#3b2604' };

const DRAW = `(size, coin, bg, colors, signPath) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
  // The circle (radius 30 of the viewBox) fills the given share of the icon
  const s = (size * coin) / 60;
  g.translate(size / 2 - 32 * s, size / 2 - 32 * s);
  g.scale(s, s);
  g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fillStyle = colors.coin; g.fill();
  g.lineWidth = 4.8; g.lineCap = 'round'; g.strokeStyle = colors.sign;
  g.stroke(new Path2D(signPath));
  return c.toDataURL('image/png').split(',')[1];
}`;

const LIGHT_BG = '#f8fafc'; // the page background (shade-50), as the manifest's background_color
const ICONS = [
  // Browser tab
  { file: 'favicon-16.png', size: 16, coin: 1 },
  { file: 'favicon-32.png', size: 32, coin: 1 },
  { file: 'favicon-48.png', size: 48, coin: 1 },
  // Manifest "any": transparent, the coin is the icon
  { file: 'icon-192.png', size: 192, coin: 0.98 },
  { file: 'icon-512.png', size: 512, coin: 0.98 },
  // Manifest "maskable": full bleed, the coin inside the safe zone (a circle of 80 %)
  { file: 'icon-maskable-192.png', size: 192, coin: 0.66, bg: LIGHT_BG },
  { file: 'icon-maskable-512.png', size: 512, coin: 0.66, bg: LIGHT_BG },
  // iOS home screen: no transparency (it would turn black), iOS rounds the corners itself
  { file: 'apple-touch-icon.png', size: 180, coin: 0.78, bg: LIGHT_BG },
];

// favicon.svg: same drawing, colors by the browser's color scheme
fs.writeFileSync(
  path.join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 2 60 60">
  <style>
    .coin { fill: ${LIGHT.coin} } .sign { stroke: ${LIGHT.sign} }
    @media (prefers-color-scheme: dark) { .coin { fill: ${DARK.coin} } .sign { stroke: ${DARK.sign} } }
  </style>
  <circle class="coin" cx="32" cy="32" r="30"/>
  <path class="sign" d="${SIGN_PATH}" fill="none" stroke-width="4.8" stroke-linecap="round"/>
</svg>
`,
);

let ws;
let id = 0;
const pending = new Map();
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });

try {
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(
        (t) => t.type === 'page',
      );
    } catch {}
  }
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    const p = pending.get(msg.id);
    if (p) {
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    }
  };

  const png = {};
  for (const icon of ICONS) {
    const expr = `(${DRAW})(${icon.size}, ${icon.coin}, ${JSON.stringify(icon.bg ?? null)}, ${JSON.stringify(LIGHT)}, ${JSON.stringify(SIGN_PATH)})`;
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
    png[icon.file] = Buffer.from(r.result.value, 'base64');
    if (!icon.file.startsWith('favicon-')) {
      fs.writeFileSync(path.join(iconDir, icon.file), png[icon.file]);
    }
  }

  // favicon.ico: ICONDIR + one entry per image + the PNG files as they are (Vista+ format)
  const images = ['favicon-16.png', 'favicon-32.png', 'favicon-48.png'].map((f) => png[f]);
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const size = img.readUInt32BE(16); // PNG IHDR width
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt16LE(1, e + 4); // planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(img.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.concat([header, ...images]));
  console.log(
    'written: favicon.ico, favicon.svg, icons/' + fs.readdirSync(iconDir).join(', icons/'),
  );
} finally {
  ws?.close();
  edge.kill();
  await sleep(1500);
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {}
}
