'use strict';
// Level definitions. Each playable level provides build() returning an array
// of equal-length strings (one per tile row). Legend:
//   #  solid ground        =  solid platform      ^  spike hazard
//   b  bamboo pickup       c  checkpoint flag     S  player start
//   F  finish gate         .  empty
// Levels are built programmatically so plateaus/gaps stay consistent.

function buildParkour1() {
  const W = 160, H = 12;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('.'));
  const set = (x, y, ch) => { g[y][x] = ch; };
  const ground = (x0, x1) => {
    for (let x = x0; x <= x1; x++) { set(x, 10, '#'); set(x, 11, '#'); }
  };
  const plat = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) set(x, y, '=');
  };
  const bam = (...pts) => { for (const [x, y] of pts) set(x, y, 'b'); };

  // Opening stretch: flat ground, easy pickups.
  ground(0, 14);
  set(2, 9, 'S');
  bam([6, 9], [9, 9], [12, 9]);

  // Two small gaps with bamboo hanging over them.
  ground(18, 27);
  bam([16, 8], [21, 9]);
  ground(31, 40);
  bam([29, 8]);

  // Ascending platforms; the high route pays extra. Kept clear of the gap
  // edge at cols 39-40 so a full jump there doesn't bonk the underside.
  plat(33, 35, 8);
  plat(36, 38, 6);
  bam([34, 7], [37, 5]);

  // Wide gap bridged by a stepping platform.
  plat(42, 43, 8);
  bam([42, 7]);

  // Checkpoint, then a spike section on the ground.
  ground(45, 60);
  set(47, 9, 'c');
  set(51, 9, '^'); set(52, 9, '^');
  set(55, 9, '^'); set(56, 9, '^');
  bam([51, 7], [53, 8]);

  // Gap, then a high side path with bonus bamboo.
  ground(64, 75);
  plat(66, 67, 7);
  plat(69, 71, 5);
  bam([69, 4], [71, 4], [73, 9]);

  // Gap with bamboo over it, then a platform staircase.
  ground(79, 95);
  bam([77, 8]);
  plat(82, 84, 8);
  plat(87, 89, 6);
  plat(92, 94, 8);
  bam([83, 7], [88, 5], [93, 7]);

  // Wide gap with a stepping platform.
  plat(97, 98, 8);
  bam([97, 7]);

  // Second checkpoint and spikes crossed via a platform above them.
  ground(100, 115);
  set(102, 9, 'c');
  set(106, 9, '^'); set(107, 9, '^'); set(108, 9, '^');
  plat(105, 109, 7);
  bam([107, 6]);

  // Final gap and run-up to the goal.
  ground(119, 159);
  bam([122, 9], [126, 9], [134, 9], [137, 9]);
  set(146, 9, 'F');

  return g.map(r => r.join(''));
}

// Climbing level: a tall vertical map. Legend addition: v = climbable stalk.
// The left map edge acts as a solid wall, which the wall-jump chimney uses.
function buildClimb1() {
  const W = 40, H = 64;
  const g = [];
  for (let y = 0; y < H; y++) g.push(new Array(W).fill('.'));
  const set = (x, y, ch) => { g[y][x] = ch; };
  const ground = (x0, x1) => {
    for (let x = x0; x <= x1; x++) { set(x, 62, '#'); set(x, 63, '#'); }
  };
  const plat = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) set(x, y, '=');
  };
  const wall = (x, y0, y1) => {
    for (let y = y0; y <= y1; y++) set(x, y, '#');
  };
  const stalk = (x, y0, y1) => {
    for (let y = y0; y <= y1; y++) if (g[y][x] === '.') set(x, y, 'v');
  };
  const bam = (...pts) => { for (const [x, y] of pts) set(x, y, 'b'); };

  // Forest floor.
  ground(0, 39);
  set(3, 61, 'S');
  bam([6, 61], [9, 61]);

  // First stalk climb onto the lower ledges. Stalk tops reach well above
  // their landing ledges so dismounting sideways is forgiving.
  stalk(12, 46, 61);
  bam([11, 58], [13, 54], [11, 51]);
  plat(13, 16, 50);
  plat(18, 23, 48);
  set(20, 47, '^'); set(21, 47, '^');
  bam([22, 46]);
  plat(25, 29, 45);
  set(28, 44, '^');
  bam([26, 44]);

  // Checkpoint 1 (banking point), then the second stalk.
  plat(32, 36, 42);
  set(34, 41, 'c');
  bam([32, 41]);
  stalk(30, 26, 41);
  bam([29, 38], [31, 34], [29, 31]);

  // Ledges stepping left; a missed jump here is a long, fatal fall.
  plat(26, 29, 30);
  plat(21, 24, 28);
  plat(16, 19, 26);
  bam([22, 27], [17, 25]);

  // Wall-jump chimney bonus route on the far left (map edge = left wall).
  plat(11, 14, 27);
  plat(0, 8, 28);
  wall(3, 6, 26);
  bam([1, 22], [2, 17], [1, 11]);
  plat(3, 7, 6);
  plat(9, 12, 9);
  plat(14, 17, 12);
  plat(19, 21, 13);

  // Main stalk up to checkpoint 2.
  stalk(22, 10, 25);
  bam([21, 22], [23, 18]);
  plat(23, 26, 14);
  set(25, 13, 'c');

  // Final stretch to the summit.
  plat(29, 32, 11);
  bam([30, 10]);
  // One clear column between the stalk and the summit platform edge, so the
  // player's box never clips the platform while climbing past it.
  stalk(36, 1, 10);
  bam([35, 8], [37, 5]); // beside the stalk — never ON it, or it punches a hole
  plat(28, 34, 4);
  bam([29, 3]);
  set(31, 3, 'F');

  return g.map(r => r.join(''));
}

const LEVELS = [
  { id: 'parkour-1', name: 'Bamboo Grove', type: 'parkour', build: buildParkour1 },
  { id: 'climb-1', name: 'Stalk Summit', type: 'climbing', build: buildClimb1,
    fallDamage: true },
  // Future levels slot in here; comingSoon entries render as locked cards.
  { id: 'level-3', name: '???', comingSoon: true },
];

// Allow quick sanity checks with `node js/levels.js`.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LEVELS, buildParkour1, buildClimb1 };
}
