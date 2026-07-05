'use strict';
// All pixel art is generated at load time from text grids and drawn onto
// small offscreen canvases, so the game needs no image files.

// ---------------------------------------------------------------- skins ----
// Every skin uses the same panda grids; only the palette changes.
// W = fur base, B = markings (ears/eyes/arms/legs), C = cheek accent.
const SKINS = [
  { id: 'classic', name: 'Classic', price: 0,
    colors: { W: '#f5f1e8', B: '#262320', C: '#f0a8a0' } },
  { id: 'golden', name: 'Golden', price: 15,
    colors: { W: '#ffd35e', B: '#6b4a12', C: '#ff9d5e' } },
  { id: 'ninja', name: 'Ninja', price: 20,
    colors: { W: '#555a6e', B: '#16161f', C: '#e04848' } },
  { id: 'sakura', name: 'Sakura', price: 30,
    colors: { W: '#ffd7e8', B: '#d1567e', C: '#ff8fb3' } },
  { id: 'tiger', name: 'Tiger', price: 40,
    colors: { W: '#f28c28', B: '#3a2a18', C: '#ffd9a0' } },
  { id: 'china', name: 'China', price: 75,
    colors: { W: '#de2910', B: '#ffde00', C: '#ffde00' } },
];

// ---------------------------------------------------------- panda grids ----
const PANDA_BODY = [
  '..BB........BB..',
  '.BBBB......BBBB.',
  '..WWWWWWWWWWWW..',
  '.WWWWWWWWWWWWWW.',
  '.WWWWWWWWWWWWWW.',
  '.WWBBBWWWWBBBWW.',
  '.WWBWBWWWWBWBWW.',
  '.WWBBBWWWWBBBWW.',
  '.WCWWWWBBWWWWCW.',
  '..WWWWWWWWWWWW..',
  '..BBBWWWWWWBBB..',
  '.BBBBWWWWWWBBBB.',
  '.BBBWWWWWWWWBBB.',
  '..WWWWWWWWWWWW..',
];
// Closed eyes for the idle blink frame (replaces the pupil row).
const PANDA_BLINK_ROW = '.WWBBBWWWWBBBWW.';

const LEGS_STAND = [
  '...BBB....BBB...',
  '...BBB....BBB...',
];
const LEGS_RUN_APART = [
  '..BBB......BBB..',
  '..BBB......BBB..',
];
const LEGS_RUN_TOGETHER = [
  '....BBB..BBB....',
  '.....BB..BB.....',
];
const LEGS_JUMP = [
  '....BBB..BBB....',
  '................',
];

const BAMBOO_GRID = [
  '......DG........',
  '......GG..LL....',
  '......GG.LL.....',
  '......DG........',
  '...LL.GG........',
  '....LLGG........',
  '......DG........',
  '......GG..LL....',
  '......GG.LL.....',
  '......DG........',
  '......GG........',
  '......GG........',
  '......DG........',
  '......GG........',
  '......GG........',
  '......DG........',
];
const BAMBOO_COLORS = { G: '#4caf50', D: '#2e7d32', L: '#8bc34a' };

// ------------------------------------------------------------- builders ----
function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function gridToCanvas(rows, colors) {
  const c = mkCanvas(rows[0].length, rows.length);
  const x = c.getContext('2d');
  for (let ry = 0; ry < rows.length; ry++) {
    for (let rx = 0; rx < rows[ry].length; rx++) {
      const col = colors[rows[ry][rx]];
      if (col) {
        x.fillStyle = col;
        x.fillRect(rx, ry, 1, 1);
      }
    }
  }
  return c;
}

function buildPandaFrames(colors) {
  const body = PANDA_BODY;
  const blinkBody = body.slice();
  blinkBody[6] = PANDA_BLINK_ROW;
  const frame = (b, legs) => gridToCanvas(b.concat(legs), colors);
  return {
    idle: [frame(body, LEGS_STAND), frame(blinkBody, LEGS_STAND)],
    run: [
      frame(body, LEGS_RUN_APART),
      frame(body, LEGS_STAND),
      frame(body, LEGS_RUN_TOGETHER),
      frame(body, LEGS_STAND),
    ],
    jump: frame(body, LEGS_JUMP),
  };
}

// One sprite set per skin, keyed by skin id.
const SKIN_SPRITES = {};
for (const s of SKINS) SKIN_SPRITES[s.id] = buildPandaFrames(s.colors);

const SPR_BAMBOO = gridToCanvas(BAMBOO_GRID, BAMBOO_COLORS);

// ----------------------------------------------------------------- tiles ---
function makeGroundTop() {
  const c = mkCanvas(16, 16);
  const x = c.getContext('2d');
  x.fillStyle = '#6b4a30';
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#5a3d26';
  for (const [px, py] of [[2, 9], [9, 12], [13, 8], [5, 14], [11, 10]]) {
    x.fillRect(px, py, 2, 2);
  }
  x.fillStyle = '#3f8f3f';
  x.fillRect(0, 0, 16, 5);
  x.fillStyle = '#57b04a';
  x.fillRect(0, 0, 16, 3);
  x.fillStyle = '#7ccb5e';
  x.fillRect(0, 0, 16, 1);
  return c;
}

function makeGroundFill() {
  const c = mkCanvas(16, 16);
  const x = c.getContext('2d');
  x.fillStyle = '#5f4129';
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#523722';
  for (const [px, py] of [[3, 3], [11, 6], [6, 11], [13, 13], [1, 9]]) {
    x.fillRect(px, py, 2, 2);
  }
  return c;
}

function makePlatformTile() {
  const c = mkCanvas(16, 16);
  const x = c.getContext('2d');
  x.fillStyle = '#a4713d';
  x.fillRect(0, 0, 16, 16);
  x.fillStyle = '#c98f52';
  x.fillRect(0, 0, 16, 2);
  x.fillStyle = '#7a4f28';
  x.fillRect(0, 14, 16, 2);
  x.fillRect(0, 0, 1, 16);
  x.fillRect(15, 0, 1, 16);
  return c;
}

function makeSpikeTile() {
  const c = mkCanvas(16, 16);
  const x = c.getContext('2d');
  // Two pixel-stepped spikes in the bottom half of the tile.
  for (let r = 0; r < 8; r++) {
    const half = Math.floor(r / 2);
    x.fillStyle = r < 7 ? '#cdd3dc' : '#8a919e';
    x.fillRect(3 - half, 8 + r, 2 + half * 2, 1);
    x.fillRect(11 - half, 8 + r, 2 + half * 2, 1);
  }
  return c;
}

function makeFlag(active) {
  const c = mkCanvas(16, 32);
  const x = c.getContext('2d');
  x.fillStyle = '#8a919e';
  x.fillRect(7, 2, 2, 30);
  x.fillStyle = '#5f666f';
  x.fillRect(4, 30, 8, 2);
  x.fillStyle = active ? '#3ec66d' : '#c94444';
  x.fillRect(9, 3, 7, 5);
  x.fillRect(9, 8, 5, 2);
  return c;
}

function makeFinishGate() {
  const c = mkCanvas(48, 48);
  const x = c.getContext('2d');
  // Two bamboo posts.
  for (const px of [4, 40]) {
    x.fillStyle = '#4caf50';
    x.fillRect(px, 6, 4, 42);
    x.fillStyle = '#2e7d32';
    for (let py = 12; py < 48; py += 9) x.fillRect(px, py, 4, 1);
  }
  // Banner.
  x.fillStyle = '#b03a3a';
  x.fillRect(2, 2, 44, 12);
  x.fillStyle = '#7d2626';
  x.fillRect(2, 12, 44, 2);
  x.fillStyle = '#ffe9c9';
  x.font = 'bold 8px monospace';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText('GOAL', 24, 8);
  return c;
}

function makeStalkTile() {
  const c = mkCanvas(16, 16);
  const x = c.getContext('2d');
  // Thick climbable bamboo pole (visually distinct from the thin pickup).
  x.fillStyle = '#3d9c46';
  x.fillRect(5, 0, 6, 16);
  x.fillStyle = '#2e7d32';
  x.fillRect(5, 0, 1, 16);
  x.fillRect(10, 0, 1, 16);
  x.fillStyle = '#256428';
  x.fillRect(5, 6, 6, 2);
  x.fillStyle = '#8bc34a';
  x.fillRect(11, 3, 4, 2);
  x.fillRect(1, 11, 4, 2);
  return c;
}

const TILE_ART = {
  stalk: makeStalkTile(),
  groundTop: makeGroundTop(),
  groundFill: makeGroundFill(),
  platform: makePlatformTile(),
  spike: makeSpikeTile(),
  flagOff: makeFlag(false),
  flagOn: makeFlag(true),
  finish: makeFinishGate(),
};
