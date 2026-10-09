// Stand-in photos of the dev seed (DevDataSeeder), drawn like the app's stand-ins (user choice
// 2026-10-09): a euro coin as its denomination icon (shared/denomination-icon), an other coin's
// front as the ¤ coin in its hue and its back as the same coin with its value
// (shared/other-coin-icon). Written to SeedPhotos/ as 320 px JPEGs; the seeder reads them.
// Run again when the drawings or the photographed coins of dev-seed.json change.
// Usage (from src/api/DevData, needs tests/e2e's npm install): node make-seed-photos.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../tests/e2e/package.json'));
const { chromium } = require('@playwright/test');

const OUT = path.join(here, 'SeedPhotos');
const SIZE = 320;
const BACKGROUND = '#f1f5f9';

// Tailwind palette: euro metals as in DenominationIcon, hues as in OtherCoinIcon
const COPPER = { fill: '#fb923c', edge: '#c2410c', ink: '#431407' };
const GOLD = { fill: '#fbbf24', edge: '#b45309', ink: '#451a03' };
const SILVER = { fill: '#e2e8f0', edge: '#64748b', ink: '#1e293b' };
const EURO = {
  Cent1: { label: '1c', outer: COPPER },
  Cent2: { label: '2c', outer: COPPER },
  Cent5: { label: '5c', outer: COPPER },
  Cent10: { label: '10c', outer: GOLD },
  Cent20: { label: '20c', outer: GOLD, notched: true },
  Cent50: { label: '50c', outer: GOLD },
  Euro1: { label: '1€', outer: GOLD, inner: SILVER },
  Euro2: { label: '2€', outer: SILVER, inner: GOLD },
};
const HUES = {
  sky: { fill: '#7dd3fc', edge: '#0369a1', ink: '#082f49' },
  indigo: { fill: '#a5b4fc', edge: '#4338ca', ink: '#1e1b4b' },
  violet: { fill: '#c4b5fd', edge: '#6d28d9', ink: '#2e1065' },
  fuchsia: { fill: '#f0abfc', edge: '#a21caf', ink: '#4a044e' },
  rose: { fill: '#fda4af', edge: '#be123c', ink: '#4c0519' },
  teal: { fill: '#5eead4', edge: '#0f766e', ink: '#042f2e' },
  emerald: { fill: '#6ee7b7', edge: '#047857', ink: '#022c22' },
  lime: { fill: '#bef264', edge: '#4d7c0f', ink: '#1a2e05' },
};

const round = (n) => +n.toFixed(3);
const point = (r, a) => `${round(12 + Math.cos(a) * r)} ${round(12 + Math.sin(a) * r)}`;
const dots = (r) => {
  const length = 2 * Math.PI * r;
  const step = length / Math.round(length / 1.7);
  return `0.1 ${round(step - 0.1)}`;
};
function notched(r) {
  const notch = 0.9;
  const cut = 2 * Math.asin(notch / (2 * r));
  let d = '';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 7;
    d += i === 0 ? `M${point(r, a - cut)}` : `A${r} ${r} 0 0 1 ${point(r, a - cut)}`;
    d += `A${notch} ${notch} 0 0 0 ${point(r, a + cut)}`;
  }
  return `${d}A${r} ${r} 0 0 1 ${point(r, -Math.PI / 2 - cut)}Z`;
}

const text = (value, ink, size, y) =>
  `<text x="12" y="${y}" text-anchor="middle" font-size="${size}" font-weight="600" fill="${ink}"
     font-family="Segoe UI, system-ui, sans-serif">${value}</text>`;

function euroCoin(denomination) {
  const { label, outer, inner, notched: isNotched } = EURO[denomination];
  const body = inner
    ? `<circle cx="12" cy="12" r="10" fill="${outer.fill}" stroke="${outer.edge}" stroke-width="0.75"/>
       <circle cx="12" cy="12" r="6.4" fill="${inner.fill}" stroke="${inner.edge}" stroke-width="0.75"/>`
    : `${
        isNotched
          ? `<path d="${notched(10)}" fill="${outer.fill}" stroke="${outer.edge}" stroke-width="0.75" stroke-linejoin="round"/>`
          : `<circle cx="12" cy="12" r="10" fill="${outer.fill}" stroke="${outer.edge}" stroke-width="0.75"/>`
      }
       <circle cx="12" cy="12" r="${isNotched ? 7.4 : 8}" fill="none" stroke="${outer.edge}" stroke-width="0.7"
         stroke-linecap="round" stroke-dasharray="${dots(isNotched ? 7.4 : 8)}"/>`;
  return body + text(label, (inner ?? outer).ink, 6.4, 14.3);
}

function otherCoin(hue, value) {
  const c = HUES[hue];
  const face =
    value === undefined
      ? text('¤', c.ink, 10, 15.5)
      : text(
          value,
          c.ink,
          value.length <= 2 ? 7 : value.length === 3 ? 6 : value.length === 4 ? 5 : 4.2,
          14.3,
        );
  return `<circle cx="12" cy="12" r="10" fill="${c.fill}" stroke="${c.edge}" stroke-width="0.75"/>
    <circle cx="12" cy="12" r="8" fill="none" stroke="${c.edge}" stroke-width="0.7" stroke-linecap="round"
      stroke-dasharray="${dots(8)}"/>${face}`;
}

/** The value as the back shows it and its file name part: 0.5 → "0,5" and "0-5". */
export const valueText = (value) =>
  new Intl.NumberFormat('tr', { maximumFractionDigits: 4, useGrouping: false }).format(value);
const slug = (text) => text.replace(/[^0-9]/g, '-');

// The photographed coins of the seed: every coin, none, or the first n of a collection
const seed = JSON.parse(fs.readFileSync(path.join(here, 'dev-seed.json'), 'utf8'));
const images = new Map();
for (const denomination of Object.keys(EURO)) {
  images.set(`euro-${denomination}.jpg`, euroCoin(denomination));
}
for (const hue of Object.keys(HUES)) {
  images.set(`other-${hue}.jpg`, otherCoin(hue));
}
for (const user of seed.users) {
  for (const collection of user.collections) {
    const count =
      collection.photographed === 'all'
        ? collection.coins.length
        : collection.photographed === 'none'
          ? 0
          : collection.photographed;
    for (const coin of collection.coins.slice(0, count).filter((c) => c.kind === 'Other')) {
      const value = valueText(coin.faceValue);
      images.set(`other-${coin.hue}-${slug(value)}.jpg`, otherCoin(coin.hue, value));
    }
  }
}

// Only the photos the seed uses: earlier ones go
fs.mkdirSync(OUT, { recursive: true });
for (const old of fs.readdirSync(OUT)) {
  fs.rmSync(path.join(OUT, old));
}
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
for (const [name, drawing] of images) {
  await page.setContent(`<!doctype html><body style="margin:0;background:${BACKGROUND}">
    <svg viewBox="0.8 0.8 22.4 22.4" width="${SIZE}" height="${SIZE}" style="display:block">${drawing}</svg>`);
  await page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 80 });
}
await browser.close();
console.log(`${images.size} photos in ${OUT}`);
