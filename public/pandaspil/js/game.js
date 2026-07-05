'use strict';
// Panda Bamboo — v2.
// Screens: menu (level select), play, shop.
// The canvas is 640x360. World art is drawn through a 2x transform so pixel
// sprites keep their v1 chunky look, while all text/UI is drawn at native
// canvas resolution for crisp readable lettering.

// ---------------------------------------------------------------- canvas ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const VW = 320, VH = 180, TILE = 16; // world view, in world pixels
const WS = 2;                        // world-to-canvas scale
const CW = VW * WS, CH = VH * WS;    // canvas resolution (640x360)
let viewScale = 1;

function resize() {
  // Half-integer steps stay crisp because every art pixel is 2 canvas px.
  viewScale = Math.max(0.5, Math.floor(Math.min(
    window.innerWidth / CW, window.innerHeight / CH) * 2) / 2);
  canvas.style.width = (CW * viewScale) + 'px';
  canvas.style.height = (CH * viewScale) + 'px';
}
window.addEventListener('resize', resize);
resize();

function worldPass() { ctx.setTransform(WS, 0, 0, WS, 0, 0); }
function uiPass() { ctx.setTransform(1, 0, 0, 1, 0, 0); }

// ------------------------------------------------------------------ save ---
const SAVE_KEY = 'pandaBamboo.v1';
const SHOP_UNLOCK = 10;
const CLEAR_BONUS = 5;

function defaultSave() {
  return {
    bamboo: 0,
    totalEarned: 0,
    cleared: [],
    owned: ['classic'],
    equipped: 'classic',
  };
}

function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d && typeof d === 'object') return Object.assign(defaultSave(), d);
  } catch (e) { /* corrupt save falls through to a fresh one */ }
  return defaultSave();
}

let save = loadSave();
function writeSave() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }
function shopUnlocked() { return save.totalEarned >= SHOP_UNLOCK; }

function gainBamboo(n) {
  if (n <= 0) return;
  save.bamboo += n;
  save.totalEarned += n;
  writeSave();
}

function resetSave() {
  save = defaultSave();
  writeSave();
}

// ----------------------------------------------------------------- input ---
const keys = { left: false, right: false, up: false, down: false, jump: false };
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'jump',
};

window.addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (k) {
    // Up doubles as jump so arrows-only play still works.
    if ((k === 'jump' || k === 'up') && !keys[k] && play) play.player.buffer = 6;
    keys[k] = true;
    e.preventDefault();
  }
  if (e.code === 'Escape' && screen === 'play') toMenu();
  if (e.code === 'Enter') {
    if (screen === 'play' && play && play.complete) toMenu();
    else if (screen === 'menu') startLevel(0);
  }
});
window.addEventListener('keyup', e => {
  const k = KEYMAP[e.code];
  if (k) {
    keys[k] = false;
    // Variable jump height: releasing early cuts the rise short.
    if ((k === 'jump' || k === 'up') && play && !play.player.climbing &&
        play.player.vy < -2.5) {
      play.player.vy = -2.5;
    }
  }
});

// Mouse: translate window coords to internal 640x360 coords.
const mouse = { x: -1, y: -1 };
let buttons = []; // rebuilt every frame by the active screen's render

function toInternal(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / viewScale,
    y: (e.clientY - r.top) / viewScale,
  };
}
canvas.addEventListener('mousemove', e => {
  const p = toInternal(e);
  mouse.x = p.x;
  mouse.y = p.y;
});
canvas.addEventListener('click', e => {
  const p = toInternal(e);
  for (const b of buttons) {
    if (!b.disabled &&
        p.x >= b.x && p.x < b.x + b.w && p.y >= b.y && p.y < b.y + b.h) {
      b.cb();
      return;
    }
  }
});

function hovered(b) {
  return mouse.x >= b.x && mouse.x < b.x + b.w &&
         mouse.y >= b.y && mouse.y < b.y + b.h;
}

// ------------------------------------------------------------ game state ---
let screen = 'menu';
let play = null;
let globalT = 0;
let resetArm = 0; // frames left where "Reset save" is armed for confirm

function toMenu() {
  play = null; // pending (unbanked) bamboo is simply lost
  screen = 'menu';
}

function levelUnlocked(idx) {
  const def = LEVELS[idx];
  if (!def || def.comingSoon) return false;
  return idx === 0 || save.cleared.includes(LEVELS[idx - 1].id);
}

// ----------------------------------------------------------- level setup ---
function parseLevel(rows) {
  const H = rows.length, W = rows[0].length;
  const solid = [], climb = [];
  const bamboo = [], spikes = [], checks = [], stalks = [];
  let start = { x: 32, y: 32 }, finish = null;
  for (let y = 0; y < H; y++) {
    solid.push(new Array(W).fill(null));
    climb.push(new Array(W).fill(false));
    for (let x = 0; x < W; x++) {
      const ch = rows[y][x];
      if (ch === '#' || ch === '=') solid[y][x] = ch;
      else if (ch === 'v') { climb[y][x] = true; stalks.push({ x, y }); }
      else if (ch === 'b') bamboo.push({ x, y, taken: false });
      else if (ch === '^') spikes.push({ x, y });
      else if (ch === 'c') checks.push({ x, y, active: false });
      else if (ch === 'S') start = { x: x * TILE + 3, y: y * TILE + 2 };
      else if (ch === 'F') finish = { x, y };
    }
  }
  return { W, H, solid, climb, bamboo, spikes, checks, stalks, start, finish,
           pw: W * TILE, ph: H * TILE };
}

function startLevel(idx, force) {
  if (!force && !levelUnlocked(idx)) return;
  const def = LEVELS[idx];
  if (!def || def.comingSoon) return;
  const lvl = parseLevel(def.build());
  play = {
    def, idx, lvl,
    complete: false,
    runCollected: 0,
    pending: 0,      // bamboo collected but not yet banked at a checkpoint
    unbanked: [],    // refs to the pickups behind `pending`
    banner: 130,
    floaters: [],
    respawn: { x: lvl.start.x, y: lvl.start.y },
    player: {
      x: lvl.start.x, y: lvl.start.y, vx: 0, vy: 0,
      onGround: false, climbing: false, sliding: 0,
      wjLock: 0, wjDir: 0, peakY: lvl.start.y,
      coyote: 0, buffer: 0, dead: 0, animT: 0,
    },
    camX: 0, camY: 0,
  };
  screen = 'play';
}

// --------------------------------------------------------------- physics ---
const GRAV = 0.38, MOVE = 1.8, JUMP = 6.9, MAXFALL = 7;
const CLIMB_SPEED = 1.3, SLIDE_SPEED = 2, FALL_LIMIT = 72; // 4.5 tiles
const PW = 10, PH = 14; // player collision box

function solidAt(lvl, tx, ty) {
  if (tx < 0 || tx >= lvl.W) return true; // walls at level edges
  if (ty < 0 || ty >= lvl.H) return false; // open sky and open pits
  return lvl.solid[ty][tx] !== null;
}

function collides(lvl, x, y) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + PW - 1) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + PH - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (solidAt(lvl, tx, ty)) return true;
    }
  }
  return false;
}

function touchingStalk(lvl, x, y) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + PW - 1) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + PH - 1) / TILE);
  for (let ty = Math.max(0, y0); ty <= Math.min(y1, lvl.H - 1); ty++) {
    for (let tx = Math.max(0, x0); tx <= Math.min(x1, lvl.W - 1); tx++) {
      if (lvl.climb[ty][tx]) return true;
    }
  }
  return false;
}

function overlaps(px, py, bx, by, bw, bh) {
  return px < bx + bw && px + PW > bx && py < by + bh && py + PH > by;
}

function moveX(p, lvl, vx) {
  let nx = p.x + vx;
  if (collides(lvl, nx, p.y)) {
    const step = Math.sign(vx);
    nx = p.x;
    while (!collides(lvl, nx + step, p.y)) nx += step;
  }
  p.x = nx;
}

// Moves vertically and returns true when a downward move hit the ground.
function moveY(p, lvl, vy) {
  let ny = p.y + vy;
  let landed = false;
  if (collides(lvl, p.x, ny)) {
    const step = Math.sign(vy);
    ny = p.y;
    while (!collides(lvl, p.x, ny + step)) ny += step;
    if (vy > 0) landed = true;
    p.vy = 0;
  }
  p.y = ny;
  return landed;
}

function die(p) {
  if (p.dead <= 0) p.dead = 36;
}

function updatePlay() {
  const p = play.player;
  const lvl = play.lvl;
  if (play.banner > 0) play.banner--;

  play.floaters = play.floaters.filter(f => --f.t > 0);
  for (const f of play.floaters) f.y -= 0.4;

  if (play.complete) return;

  if (p.dead > 0) {
    p.dead--;
    if (p.dead === 0) {
      // Unbanked bamboo returns to the level and is lost.
      for (const b of play.unbanked) b.taken = false;
      play.runCollected -= play.unbanked.length;
      play.unbanked = [];
      play.pending = 0;
      p.x = play.respawn.x;
      p.y = play.respawn.y;
      p.vx = 0;
      p.vy = 0;
      p.climbing = false;
      p.sliding = 0;
      p.wjLock = 0;
      p.peakY = p.y;
    }
    return;
  }

  p.buffer = Math.max(0, p.buffer - 1);

  // Grab a stalk when overlapping one and climbing input is given.
  if (!p.climbing && touchingStalk(lvl, p.x, p.y) &&
      (keys.up || (keys.down && !p.onGround))) {
    p.climbing = true;
    p.buffer = 0;
    p.vy = 0;
    p.wjLock = 0;
    p.sliding = 0;
  }

  if (p.climbing) {
    if (p.buffer > 0) {
      // Hop off the stalk.
      p.climbing = false;
      p.vy = -JUMP * 0.8;
      p.buffer = 0;
      p.peakY = p.y;
    } else {
      const cvx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const cvy = (keys.down ? CLIMB_SPEED : 0) - (keys.up ? CLIMB_SPEED : 0);
      moveX(p, lvl, cvx);
      p.onGround = false;
      if (moveY(p, lvl, cvy)) {
        p.onGround = true;
        p.climbing = false;
      }
      p.peakY = p.y;
      if (cvx || cvy) p.animT++;
      if (p.climbing && !touchingStalk(lvl, p.x, p.y)) p.climbing = false;
    }
  } else {
    // Horizontal: a fresh wall-jump briefly overrides input.
    if (p.wjLock > 0) {
      p.vx = p.wjDir * MOVE;
      p.wjLock--;
    } else {
      p.vx = (keys.right ? MOVE : 0) - (keys.left ? MOVE : 0);
    }
    moveX(p, lvl, p.vx);

    // Ground jump with coyote time.
    p.coyote = p.onGround ? 6 : Math.max(0, p.coyote - 1);
    if (p.coyote > 0 && p.buffer > 0) {
      p.vy = -JUMP;
      p.coyote = 0;
      p.buffer = 0;
      p.peakY = p.y;
    }

    p.vy = Math.min(p.vy + GRAV, MAXFALL);

    // Wall slide: falling while pressing into a wall you're touching.
    p.sliding = 0;
    if (!p.onGround && p.vy > 0) {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (dir !== 0 && collides(lvl, p.x + dir, p.y)) {
        p.sliding = dir;
        p.vy = Math.min(p.vy, SLIDE_SPEED);
        p.peakY = p.y; // sliding is a safe descent
      }
    }
    if (p.sliding !== 0 && p.buffer > 0) {
      // Wall jump: up and away from the wall.
      p.vy = -JUMP * 0.9;
      p.wjDir = -p.sliding;
      p.wjLock = 10;
      p.buffer = 0;
      p.sliding = 0;
      p.peakY = p.y;
    }

    const wasY = p.y;
    p.onGround = false;
    if (moveY(p, lvl, p.vy)) {
      p.onGround = true;
      if (play.def.fallDamage && p.y - p.peakY > FALL_LIMIT) die(p);
    }
    if (p.onGround) p.peakY = p.y;
    else p.peakY = Math.min(p.peakY, Math.min(wasY, p.y));

    p.animT++;
  }

  // Fell out of the world.
  if (p.y > lvl.ph + 48) die(p);

  // Spikes (only the pointy part of the tile hurts).
  for (const s of lvl.spikes) {
    if (overlaps(p.x, p.y, s.x * TILE + 2, s.y * TILE + 9, 12, 7)) {
      die(p);
      return;
    }
  }

  // Bamboo pickups: pending until banked at a checkpoint or the finish.
  for (const b of lvl.bamboo) {
    if (!b.taken && overlaps(p.x, p.y, b.x * TILE + 4, b.y * TILE, 8, 16)) {
      b.taken = true;
      play.runCollected++;
      play.pending++;
      play.unbanked.push(b);
      play.floaters.push({ x: b.x * TILE + 8, y: b.y * TILE, txt: '+1', t: 40 });
    }
  }

  // Checkpoints bank pending bamboo.
  for (const c of lvl.checks) {
    if (!c.active && overlaps(p.x, p.y, c.x * TILE, c.y * TILE - 16, 16, 32)) {
      for (const o of lvl.checks) o.active = false;
      c.active = true;
      play.respawn = { x: c.x * TILE + 3, y: c.y * TILE + 1 };
      gainBamboo(play.pending);
      play.pending = 0;
      play.unbanked = [];
      play.floaters.push({ x: c.x * TILE + 8, y: c.y * TILE - 12, txt: 'Checkpoint!', t: 60 });
    }
  }

  // Finish gate banks everything and adds the bonus.
  const f = lvl.finish;
  if (f && overlaps(p.x, p.y, f.x * TILE - 2, f.y * TILE - 32, 20, 48)) {
    play.complete = true;
    gainBamboo(play.pending + CLEAR_BONUS);
    play.pending = 0;
    play.unbanked = [];
    if (!save.cleared.includes(play.def.id)) {
      save.cleared.push(play.def.id);
      writeSave();
    }
  }
}

// ------------------------------------------------------------ text utils ---
// All text helpers work in native canvas (640x360) coordinates.
function text(str, x, y, size, color, align) {
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function textShadow(str, x, y, size, color, align) {
  ctx.font = 'bold ' + size + 'px monospace';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(str, x + 2, y + 2);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

// ------------------------------------------------------------ background ---
// Drawn during the world pass (320x180 coordinates).
function hillLayer(off, color, base, amp, freq) {
  ctx.fillStyle = color;
  for (let sx = 0; sx < VW; sx += 4) {
    const wx = sx + off;
    const h = Math.floor(base +
      Math.sin(wx * freq) * amp * 0.5 +
      Math.sin(wx * freq * 0.37 + 2) * amp * 0.5);
    ctx.fillRect(sx, h, 4, VH - h);
  }
}

function drawCloud(x, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(x, y, 28, 8);
  ctx.fillRect(x + 6, y - 5, 14, 6);
}

function drawBackground(camX) {
  ctx.fillStyle = '#9ee0f2';
  ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = '#c9f0f8';
  ctx.fillRect(0, 112, VW, VH - 112);
  const span = VW + 80;
  for (const [cx, cy] of [[40, 26], [150, 52], [260, 18], [90, 74], [210, 84]]) {
    const x = ((cx - camX * 0.3) % span + span) % span - 60;
    drawCloud(Math.floor(x), cy);
  }
  hillLayer(camX * 0.4, '#7fc9a0', 118, 26, 0.020);
  hillLayer(camX * 0.7, '#5cb37e', 140, 20, 0.033);
}

// ---------------------------------------------------------- world render ---
function pandaFrame(p) {
  const spr = SKIN_SPRITES[save.equipped] || SKIN_SPRITES.classic;
  if (p.climbing) return spr.run[Math.floor(p.animT / 8) % 4];
  if (!p.onGround) return spr.jump;
  if (keys.left !== keys.right) return spr.run[Math.floor(p.animT / 6) % 4];
  // Idle: blink briefly every ~2.5s.
  return spr.idle[(globalT % 150) < 8 ? 1 : 0];
}

function renderPlay() {
  const p = play.player;
  const lvl = play.lvl;

  // Camera follows the player, clamped to level bounds.
  play.camX = Math.max(0, Math.min(p.x + PW / 2 - VW / 2, lvl.pw - VW));
  play.camY = Math.max(0, Math.min(p.y + PH / 2 - VH / 2, lvl.ph - VH));
  const camX = Math.floor(play.camX), camY = Math.floor(play.camY);

  worldPass();
  drawBackground(camX);

  // Climbable stalks render behind the solid tiles.
  for (const s of lvl.stalks) {
    ctx.drawImage(TILE_ART.stalk, s.x * TILE - camX, s.y * TILE - camY);
  }

  // Solid tiles in view.
  const tx0 = Math.floor(camX / TILE), tx1 = Math.floor((camX + VW) / TILE);
  const ty0 = Math.floor(camY / TILE), ty1 = Math.floor((camY + VH) / TILE);
  for (let ty = Math.max(0, ty0); ty <= Math.min(ty1, lvl.H - 1); ty++) {
    for (let tx = Math.max(0, tx0); tx <= Math.min(tx1, lvl.W - 1); tx++) {
      const ch = lvl.solid[ty][tx];
      if (!ch) continue;
      const dx = tx * TILE - camX, dy = ty * TILE - camY;
      if (ch === '=') ctx.drawImage(TILE_ART.platform, dx, dy);
      else if (ty > 0 && lvl.solid[ty - 1][tx] === '#') {
        ctx.drawImage(TILE_ART.groundFill, dx, dy);
      } else {
        ctx.drawImage(TILE_ART.groundTop, dx, dy);
      }
    }
  }

  for (const s of lvl.spikes) {
    ctx.drawImage(TILE_ART.spike, s.x * TILE - camX, s.y * TILE - camY);
  }
  for (const c of lvl.checks) {
    ctx.drawImage(c.active ? TILE_ART.flagOn : TILE_ART.flagOff,
      c.x * TILE - camX, c.y * TILE - camY - 16);
  }
  if (lvl.finish) {
    ctx.drawImage(TILE_ART.finish,
      lvl.finish.x * TILE - camX - 16, lvl.finish.y * TILE - camY - 32);
  }
  for (const b of lvl.bamboo) {
    if (b.taken) continue;
    const bob = Math.floor(Math.sin(globalT / 20 + b.x) * 1.5);
    ctx.drawImage(SPR_BAMBOO, b.x * TILE - camX, b.y * TILE - camY + bob);
  }

  // Player (flashes while dead).
  if (p.dead === 0 || (p.dead % 8) < 4) {
    ctx.drawImage(pandaFrame(p),
      Math.floor(p.x) - 3 - camX, Math.floor(p.y) - 2 - camY);
  }

  // UI pass: floaters, HUD, banner, overlay — crisp native-resolution text.
  uiPass();
  for (const f of play.floaters) {
    textShadow(f.txt, (f.x - camX) * WS, (Math.floor(f.y) - camY) * WS,
               14, '#ffffff', 'center');
  }

  ctx.drawImage(SPR_BAMBOO, 8, 6, 24, 24);
  ctx.font = 'bold 20px monospace';
  const countW = ctx.measureText('' + save.bamboo).width;
  textShadow('' + save.bamboo, 38, 10, 20, '#ffffff');
  if (play.pending > 0) {
    textShadow('+' + play.pending, 44 + countW, 13, 16, '#7ccb5e');
  }
  textShadow('Esc: quit', CW - 8, 10, 14, 'rgba(255,255,255,0.8)', 'right');

  if (play.banner > 0) {
    ctx.globalAlpha = Math.min(1, play.banner / 30);
    ctx.fillStyle = 'rgba(20,30,25,0.75)';
    ctx.fillRect(0, 132, CW, 60);
    text('Level ' + (play.idx + 1) + ' — ' + play.def.name,
         CW / 2, 152, 22, '#ffffff', 'center');
    ctx.globalAlpha = 1;
  }

  if (play.complete) renderCompleteOverlay();
}

function renderCompleteOverlay() {
  ctx.fillStyle = 'rgba(10,20,15,0.6)';
  ctx.fillRect(0, 0, CW, CH);
  panel(140, 80, 360, 200);
  textShadow('LEVEL CLEARED!', CW / 2, 104, 26, '#ffe066', 'center');
  text('Bamboo banked: ' + play.runCollected, CW / 2, 152, 18, '#e8f4e8', 'center');
  text('Completion bonus: +' + CLEAR_BONUS, CW / 2, 180, 18, '#e8f4e8', 'center');
  drawButton(220, 220, 200, 36, 'CONTINUE', toMenu);
}

// -------------------------------------------------------------- UI pieces --
function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(24,38,30,0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#5cb37e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function drawButton(x, y, w, h, label, cb, opts) {
  opts = opts || {};
  const b = { x, y, w, h, cb, disabled: !!opts.disabled };
  buttons.push(b);
  const fs = opts.size || 16;
  const hov = !b.disabled && hovered(b);
  ctx.fillStyle = b.disabled ? '#3a4740' : (hov ? '#57b04a' : '#3f8f3f');
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = b.disabled ? '#4d5a52' : '#7ccb5e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  text(label, x + w / 2, y + (h - fs) / 2 + 1, fs,
       b.disabled ? '#7d8a82' : '#ffffff', 'center');
  return b;
}

function drawBambooCount(x, y) {
  ctx.drawImage(SPR_BAMBOO, x, y, 24, 24);
  textShadow('' + save.bamboo, x + 30, y + 4, 20, '#ffffff');
}

// ------------------------------------------------------------ menu screen --
function renderMenu() {
  worldPass();
  drawBackground(globalT * 0.25);
  uiPass();

  textShadow('PANDA BAMBOO', CW / 2 + 24, 26, 40, '#ffffff', 'center');
  const spr = SKIN_SPRITES[save.equipped] || SKIN_SPRITES.classic;
  const bob = Math.floor(Math.sin(globalT / 25) * 2) * 2;
  ctx.drawImage(spr.idle[(globalT % 150) < 8 ? 1 : 0], 130, 20 + bob, 48, 48);

  drawBambooCount(CW - 90, 10);

  // Level cards.
  const cardW = 180, cardH = 140, cardY = 96;
  LEVELS.forEach((def, i) => {
    const cx = 24 + i * 208;
    const cxc = cx + cardW / 2;
    panel(cx, cardY, cardW, cardH);
    const cleared = save.cleared.includes(def.id);
    const unlocked = levelUnlocked(i);
    text('LEVEL ' + (i + 1), cxc, cardY + 14, 18,
         unlocked ? '#ffe066' : '#8a919e', 'center');
    text(def.comingSoon ? '? ? ?' : def.name, cxc, cardY + 40, 16,
         unlocked ? '#e8f4e8' : '#8a919e', 'center');
    if (unlocked) {
      if (cleared) text('CLEARED ✓', cxc, cardY + 64, 14, '#7ccb5e', 'center');
      drawButton(cx + 30, cardY + 94, 120, 30,
                 cleared ? 'REPLAY' : 'PLAY', () => startLevel(i));
    } else if (def.comingSoon) {
      text('LOCKED', cxc, cardY + 72, 16, '#8a919e', 'center');
      text('Coming soon', cxc, cardY + 100, 14, '#5f666f', 'center');
    } else {
      text('LOCKED', cxc, cardY + 72, 16, '#8a919e', 'center');
      text('Clear Level ' + i, cxc, cardY + 100, 14, '#5f666f', 'center');
    }
  });

  // Shop button / lock state.
  if (shopUnlocked()) {
    drawButton(220, 264, 200, 34, 'SHOP', () => { screen = 'shop'; });
  } else {
    drawButton(220, 264, 200, 34,
      'SHOP — ' + Math.min(save.totalEarned, SHOP_UNLOCK) + '/' + SHOP_UNLOCK + ' bamboo',
      () => {}, { disabled: true, size: 14 });
  }

  // Reset save (two-step confirm).
  if (resetArm > 0) resetArm--;
  drawButton(12, CH - 36, 150, 26, resetArm > 0 ? 'Really reset?' : 'Reset save', () => {
    if (resetArm > 0) {
      resetSave();
      resetArm = 0;
    } else {
      resetArm = 120;
    }
  }, { size: 14 });

  text('Arrows/WASD to move · Space to jump · Up/Down to climb',
       CW / 2 + 60, CH - 30, 14, 'rgba(20,40,30,0.75)', 'center');
}

// ------------------------------------------------------------ shop screen --
function renderShop() {
  worldPass();
  drawBackground(globalT * 0.25);
  uiPass();

  textShadow('SKIN SHOP', CW / 2, 12, 32, '#ffffff', 'center');
  drawBambooCount(CW - 90, 10);

  const cardW = 176, cardH = 134;
  SKINS.forEach((s, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 28 + col * 204, y = 56 + row * 142;
    panel(x, y, cardW, cardH);
    const owned = save.owned.includes(s.id);
    const equipped = save.equipped === s.id;

    text(s.name, x + cardW / 2, y + 8, 16, '#ffe066', 'center');
    const spr = SKIN_SPRITES[s.id].idle[0];
    ctx.drawImage(spr, x + cardW / 2 - 24, y + 30, 48, 48);

    if (equipped) {
      drawButton(x + 24, y + 102, cardW - 48, 24, 'EQUIPPED', () => {},
                 { disabled: true, size: 14 });
    } else if (owned) {
      drawButton(x + 24, y + 102, cardW - 48, 24, 'EQUIP', () => {
        save.equipped = s.id;
        writeSave();
      }, { size: 14 });
    } else {
      ctx.drawImage(SPR_BAMBOO, x + cardW / 2 - 26, y + 80, 18, 18);
      text('' + s.price, x + cardW / 2 - 4, y + 82, 16, '#e8f4e8');
      const afford = save.bamboo >= s.price;
      drawButton(x + 24, y + 102, cardW - 48, 24, afford ? 'BUY' : 'NEED MORE', () => {
        save.bamboo -= s.price;
        save.owned.push(s.id);
        save.equipped = s.id;
        writeSave();
      }, { disabled: !afford, size: 14 });
    }
  });

  drawButton(250, CH - 26, 140, 22, 'BACK', () => { screen = 'menu'; }, { size: 14 });
}

// ------------------------------------------------------------- main loop ---
function frame() {
  globalT++;
  buttons = [];
  if (screen === 'play' && play) {
    updatePlay();
    renderPlay();
  } else if (screen === 'shop') {
    renderShop();
  } else {
    renderMenu();
  }
  uiPass();
  canvas.style.cursor = buttons.some(b => !b.disabled && hovered(b)) ? 'pointer' : 'default';
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug hooks for automated testing; not part of the game UI.
window.PandaDebug = {
  get screen() { return screen; },
  get save() { return save; },
  get play() { return play; },
  keys, startLevel, toMenu, resetSave,
  setScreen(s) { screen = s; },
};
