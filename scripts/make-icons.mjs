// Génère les 8 icônes de l'application (PNG) : un arbre de barres de progression sur 3 étages (1 → 2 → 4 barres),
// dans les couleurs de la charte. Le SVG est rendu dans Chromium via Playwright, puis capturé en PNG.
//
//   node scripts/make-icons.mjs
//
// Prérequis : le paquet « playwright » et un Chromium (variable CHROMIUM_PATH, sinon celui de Playwright).
// Changer une icône PWA ⇒ incrémenter `CACHE` dans `public/sw.js` (les icônes sont servies depuis le cache).
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const PRIMARY = '#26428B';
const ACCENT = '#C9A227';
const CREAM = '#F4EBD9';

/**
 * Motif centré dans un carré de 1024.
 * `floors` : nombre d'étages (1 barre, puis 2, puis 4). `bottom` : remplissages (0–1) des barres du dernier étage ;
 * la barre d'un parent est la moyenne de ses enfants (comme dans l'app). Chaque paire d'enfants occupe exactement
 * la largeur de son parent.
 */
function treeMotif({ floors, bottom, width = 720, heights, gap, rise = 70, line = 14 }) {
  const x0 = 512 - width / 2;
  const total = heights.reduce((a, h) => a + h, 0) + rise * (floors - 1);
  let y = (1024 - total) / 2;

  const fills = [bottom]; // remplissages de chaque étage, du bas vers le haut
  for (let f = floors - 2; f >= 0; f--) {
    const below = fills[0];
    fills.unshift(Array.from({ length: 2 ** f }, (_, k) => (below[2 * k] + below[2 * k + 1]) / 2));
  }

  const levels = [];
  for (let f = 0; f < floors; f++) {
    const h = heights[f];
    if (f === 0) {
      levels.push({ w: width, h, y, bars: [{ x: x0, p: fills[0][0] }] });
    } else {
      const up = levels[f - 1];
      const w = (up.w - gap[f]) / 2;
      const bars = up.bars.flatMap((pb, k) => [0, 1].map((j) => ({ x: pb.x + j * (w + gap[f]), p: fills[f][2 * k + j] })));
      levels.push({ w, h, y, bars });
    }
    y += h + rise;
  }

  let out = '';
  for (let f = 0; f < floors - 1; f++) {
    // connecteurs (dessinés derrière les barres)
    const up = levels[f];
    const dn = levels[f + 1];
    const yb = up.y + up.h;
    const mid = (yb + dn.y) / 2;
    up.bars.forEach((b, k) => {
      const px = b.x + up.w / 2;
      const c1 = dn.bars[2 * k].x + dn.w / 2;
      const c2 = dn.bars[2 * k + 1].x + dn.w / 2;
      out += `<path d="M${px} ${yb} V${mid} M${c1} ${mid} H${c2} M${c1} ${mid} V${dn.y} M${c2} ${mid} V${dn.y}" fill="none" stroke="${CREAM}" stroke-opacity=".75" stroke-width="${line}" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
  }
  for (const L of levels) {
    for (const b of L.bars) {
      out += `<rect x="${b.x}" y="${L.y}" width="${L.w}" height="${L.h}" rx="${L.h / 2}" fill="${CREAM}" fill-opacity=".28"/>`;
      if (b.p > 0) out += `<rect x="${b.x}" y="${L.y}" width="${Math.max(L.w * b.p, L.h)}" height="${L.h}" rx="${L.h / 2}" fill="${ACCENT}"/>`;
    }
  }
  return out;
}

const DESIGN_2 = { floors: 2, bottom: [1, 0.55], heights: [150, 120], gap: [0, 48], rise: 90, line: 16 };
const DESIGN_3 = { floors: 3, bottom: [1, 0.8, 0.6, 0.45], heights: [130, 84, 56], gap: [0, 40, 16], rise: 66, line: 14 };

/** SVG 1024×1024. `scale` réduit le motif autour du centre (zones de sécurité des masques d'icône). */
function svg({ background, scale = 1, design = DESIGN_3 }) {
  const bg = background ? `<rect width="1024" height="1024" fill="${background}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${bg}<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">${treeMotif(design)}</g></svg>`;
}

const jobs = [
  // [fichier, taille, options SVG, fond transparent ?]
  ['assets/icon.png', 1024, { background: PRIMARY }, false],
  ['assets/adaptive-icon.png', 1024, { scale: 0.78 }, true], // zone de sécurité Android = cercle de 66 %
  ['assets/splash-icon.png', 1024, {}, true],
  ['assets/favicon.png', 48, { background: PRIMARY, design: { ...DESIGN_2, line: 28 }, scale: 1.1 }, false], // 2 étages : lisible en petit
  ['public/icon-192.png', 192, { background: PRIMARY }, false],
  ['public/icon-512.png', 512, { background: PRIMARY }, false],
  ['public/icon-maskable-512.png', 512, { background: PRIMARY, scale: 0.95 }, false], // maskable = cercle de 80 %
  ['public/apple-touch-icon.png', 180, { background: PRIMARY }, false],
];

function loadPlaywright() {
  for (const base of [import.meta.url, '/opt/node22/lib/node_modules/']) {
    try {
      return createRequire(base)('playwright');
    } catch {
      // essaie l'emplacement suivant
    }
  }
  throw new Error('Paquet « playwright » introuvable (npm install --no-save playwright).');
}

const { chromium } = loadPlaywright();
const executablePath = process.env.CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
for (const [file, size, opts, transparent] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">` +
      svg(opts).replace('width="1024" height="1024"', `width="${size}" height="${size}"`) +
      `</div></body></html>`,
  );
  await page.screenshot({ path: `${ROOT}${file}`, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('écrit', file);
}
await browser.close();
