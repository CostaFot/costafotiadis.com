#!/usr/bin/env node
// Build the two static assets the /projects/ desktop loads, into
// public/projects/desk/:
//
// - clippy.png + clippy.json: the handful of animations Clippy plays on the
//   bar, cut out of the lab's 1.3 MB sheet (public/lab/clippy/) into a small
//   one. The JSON is agent.json's shape with the image offsets remapped, so
//   Sprite in src/lib/clippy.ts steps it unchanged; frame indices, branches
//   and exit branches are kept as they were.
// - icons.woff2: the bar's tray icons (android, bluetooth, wifi, volume,
//   battery), subset from JetBrainsMono Nerd Font, the same glyphs the
//   GitHub profile's hero draws.
// - logo.woff2: the Omarchy mark (U+E900) off Omarchy's own font, for the
//   launcher button at the left of the bar.
//
// Run by hand when the animations or icons change (it needs ImageMagick, uvx
// and the Nerd Font installed); the output is committed.
//
//   node scripts/desk-assets.mjs

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAB = join(ROOT, 'public', 'lab', 'clippy');
const OUT = join(ROOT, 'public', 'projects', 'desk');
const COLS = 16;
// What the desk plays: rest, the walk (the side-to-side sway while he
// slides), looking about, the greeting, talking, and being slapped. A line
// whose own animation is not here falls back to Explain.
const ANIMATIONS = [
  'RestPose', 'Wave', 'GetAttention', 'Explain', 'Alert', 'IdleSideToSide', 'LookLeft', 'LookRight',
];
const FONT = '/usr/share/fonts/TTF/JetBrainsMonoNerdFont-Regular.ttf';
const ICONS = ['U+F17B', 'U+F00AF', 'U+F0928', 'U+F057E', 'U+F0079'];
const LOGO_FONT = '/usr/share/fonts/omarchy/omarchy.ttf';

mkdirSync(OUT, { recursive: true });

const agent = JSON.parse(readFileSync(join(LAB, 'agent.json'), 'utf8'));
const [w, h] = agent.framesize;
const cells = [];
const index = new Map();
const cell = ([x, y]) => {
  const key = `${x},${y}`;
  if (!index.has(key)) {
    index.set(key, cells.length);
    cells.push([x, y]);
  }
  const i = index.get(key);
  return [(i % COLS) * w, Math.floor(i / COLS) * h];
};
const animations = {};
for (const name of ANIMATIONS) {
  const anim = agent.animations[name];
  if (!anim) throw new Error(`agent.json has no ${name}`);
  animations[name] = {
    frames: anim.frames.map((f) => {
      const { sound, ...rest } = f; // the desk plays its own sounds
      return f.images?.length ? { ...rest, images: [cell(f.images[0])] } : rest;
    }),
  };
}

const rows = Math.ceil(cells.length / COLS);
execFileSync('magick', [
  '-size', `${COLS * w}x${rows * h}`, 'xc:none',
  ...cells.flatMap(([x, y], i) => [
    '(', join(LAB, 'map.png'), '-crop', `${w}x${h}+${x}+${y}`, '+repage', ')',
    '-geometry', `+${(i % COLS) * w}+${Math.floor(i / COLS) * h}`, '-composite',
  ]),
  '-strip', `PNG8:${join(OUT, 'clippy.png')}`,
]);
writeFileSync(join(OUT, 'clippy.json'), JSON.stringify({ framesize: [w, h], animations }) + '\n');
console.log(`clippy.png: ${cells.length} frames in ${COLS}x${rows}`);

const subset = (font, unicodes, file) => {
  execFileSync('uvx', [
    '--quiet', '--from', 'fonttools', '--with', 'brotli', 'pyftsubset', font,
    `--unicodes=${unicodes.join(',')}`, '--flavor=woff2', '--layout-features=', '--no-hinting',
    '--desubroutinize', `--output-file=${join(OUT, file)}`,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`${file}: written`);
};
subset(FONT, ICONS, 'icons.woff2');
subset(LOGO_FONT, ['U+E900'], 'logo.woff2');
