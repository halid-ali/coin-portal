// Renders the header logo (amber coin with a euro sign) as the app icons in headless Edge:
// public/icons/*.png (web app manifest, iOS home screen) and public/favicon.ico (16, 32 and 48 px
// PNGs inside). Run again when the logo changes. Windows with Edge; from src/web:
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

// The logo of header.html: bg-linear-to-br from-amber-300 to-amber-500, ring-amber-600/20,
// text-amber-950, bold, euro sign at text-sm in a size-8 circle
const DRAW = `(size, coin, bg, fontRatio) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
  const d = size * coin, r = d / 2, cx = size / 2, cy = size / 2;
  const grad = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, '#fcd34d');
  grad.addColorStop(1, '#f59e0b');
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = grad; g.fill();
  const ring = Math.max(1, d / 32);
  g.beginPath(); g.arc(cx, cy, r - ring / 2, 0, Math.PI * 2);
  g.lineWidth = ring; g.strokeStyle = 'rgba(217, 119, 6, 0.2)'; g.stroke();
  g.fillStyle = '#451a03';
  g.font = 'bold ' + d * fontRatio + 'px "Segoe UI", system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  const m = g.measureText('€');
  // Center the glyph's ink, not its line box
  const y = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  const x = cx + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
  g.fillText('€', x, y);
  return c.toDataURL('image/png').split(',')[1];
}`;

const LIGHT_BG = '#fffbeb'; // amber-50
const ICONS = [
  // Browser tab; the euro sign a bit larger, so it stays readable at 16 px
  { file: 'favicon-16.png', size: 16, coin: 1, font: 0.62 },
  { file: 'favicon-32.png', size: 32, coin: 1, font: 0.56 },
  { file: 'favicon-48.png', size: 48, coin: 1, font: 0.5 },
  // Manifest "any": transparent, the coin is the icon
  { file: 'icon-192.png', size: 192, coin: 0.98, font: 0.5 },
  { file: 'icon-512.png', size: 512, coin: 0.98, font: 0.5 },
  // Manifest "maskable": full bleed, the coin inside the safe zone (a circle of 80 %)
  { file: 'icon-maskable-192.png', size: 192, coin: 0.66, font: 0.5, bg: LIGHT_BG },
  { file: 'icon-maskable-512.png', size: 512, coin: 0.66, font: 0.5, bg: LIGHT_BG },
  // iOS home screen: no transparency (it would turn black), iOS rounds the corners itself
  { file: 'apple-touch-icon.png', size: 180, coin: 0.78, font: 0.5, bg: LIGHT_BG },
];

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
    const expr = `(${DRAW})(${icon.size}, ${icon.coin}, ${JSON.stringify(icon.bg ?? null)}, ${icon.font})`;
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
  console.log('written: favicon.ico, icons/' + fs.readdirSync(iconDir).join(', icons/'));
} finally {
  ws?.close();
  edge.kill();
  await sleep(1500);
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
  } catch {}
}
