// Midnight Vault — the vault hall: one room, three lanes in, and everything solid
// the thief, the guards and a line of sight can run into. Walls, pillars, display
// cases and the vault body all block movement and sight; the carpet, the loot and
// the exit mat are floor markings, not obstacles.

import { FIELD } from './config.js';

/** The vault hall, built once per game. */
export function buildVaultLevel() {
  const wall = 24;
  const level = {
    width: FIELD.width,
    height: FIELD.height,
    /** Every solid rectangle: { x, y, w, h, kind }. kind is 'wall' | 'pillar' | 'case' | 'vault'. */
    solids: [],
    /** The vault body at the top of the room; the diamond sits on its pedestal below it. */
    vault: { x: 540, y: 56, w: 200, h: 84 },
    /** The Starlight Diamond, the loot the whole heist is about. */
    diamond: { x: 640, y: 152, kind: 'diamond', taken: false, label: 'Starlight Diamond' },
    /** Side loot: two gold bars in display cases and one painting on the right wall. */
    loot: [
      { x: 195, y: 357, kind: 'goldBar', taken: false, label: 'Gold bar' },
      { x: 1085, y: 357, kind: 'goldBar', taken: false, label: 'Gold bar' },
      { x: 1150, y: 140, kind: 'painting', taken: false, label: 'Duchess portrait' },
    ],
    /** The service door at the bottom: grab the diamond, then stand here to win. */
    exit: { x: 560, y: 664, w: 160, h: 32 },
    /** Where the thief slips in. */
    spawn: { x: 640, y: 620 },
    /** Guard patrol routes: name, waypoints, speed. */
    guardRoutes: [
      {
        name: 'Rook',
        waypoints: [
          { x: 300, y: 180 },
          { x: 980, y: 180 },
        ],
      },
      {
        name: 'Bishop',
        waypoints: [
          { x: 200, y: 300 },
          { x: 200, y: 620 },
        ],
      },
      {
        name: 'Knight',
        waypoints: [
          { x: 1080, y: 300 },
          { x: 1080, y: 620 },
        ],
      },
    ],
    /** Camera mounts: position, resting angle, sweep arc. The corner pair sits
        just below the HUD bar, on the side walls; the third hangs under the upper
        cross-wall and watches the gap lane to the vault — never the front door,
        so the thief is never spotted the moment the job starts. */
    cameraMounts: [
      { x: 40, y: 112, baseAngle: Math.PI / 4, phase: 0 },
      { x: 1240, y: 112, baseAngle: (3 * Math.PI) / 4, phase: 1.7 },
      { x: 640, y: 262, baseAngle: Math.PI / 2, phase: 3.1 },
    ],
    /** The carpet runner down the middle: pure decoration, drawn by the renderer. */
    carpet: { x: 560, y: 140, w: 160, h: 524 },
  };

  const add = (x, y, w, h, kind) => level.solids.push({ x, y, w, h, kind });

  // Outer walls. The bottom wall is split so the service door is a real gap.
  add(0, 0, FIELD.width, wall, 'wall');
  add(0, FIELD.height - wall, 560, wall, 'wall');
  add(720, FIELD.height - wall, 560, wall, 'wall');
  add(0, 0, wall, FIELD.height, 'wall');
  add(FIELD.width - wall, 0, wall, FIELD.height, 'wall');

  // Upper cross-wall: two wings with a wide gap in the middle, the exposed lane to the vault.
  add(wall, 240, 396, 20, 'wall');
  add(860, 240, 396, 20, 'wall');

  // Lower cross-wall: wings plus a centre block, so the middle lane splits into two gaps.
  add(wall, 470, 276, 20, 'wall');
  add(980, 470, 276, 20, 'wall');
  add(580, 470, 120, 20, 'wall');

  // Pillars: the cover everything in the room is planned around.
  add(340, 340, 44, 44, 'pillar');
  add(896, 340, 44, 44, 'pillar');
  add(480, 560, 44, 44, 'pillar');
  add(756, 560, 44, 44, 'pillar');

  // Display cases: solid glass cabinets holding the gold bars.
  add(150, 330, 90, 54, 'case');
  add(1040, 330, 90, 54, 'case');

  // The vault body itself.
  add(level.vault.x, level.vault.y, level.vault.w, level.vault.h, 'vault');

  return level;
}

/** True when the point is inside the rectangle (edges count). */
export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when a circle of radius r at (x, y) overlaps any solid in the level. */
export function circleBlocked(level, x, y, r) {
  for (let i = 0; i < level.solids.length; i += 1) {
    const s = level.solids[i];
    const nearX = Math.max(s.x, Math.min(x, s.x + s.w));
    const nearY = Math.max(s.y, Math.min(y, s.y + s.h));
    const dx = x - nearX;
    const dy = y - nearY;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

/**
 * Move a circle by (dx, dy) with axis separation, so it slides along walls instead
 * of sticking on corners. Returns the new position.
 */
export function slideMove(level, x, y, dx, dy, r) {
  let nx = x;
  let ny = y;
  if (dx !== 0 && !circleBlocked(level, x + dx, y, r)) nx = x + dx;
  if (dy !== 0 && !circleBlocked(level, nx, y + dy, r)) ny = y + dy;
  return { x: nx, y: ny };
}

/** Slab test: true when the segment (ax,ay)-(bx,by) touches the rectangle. */
function segmentHitsRect(ax, ay, bx, by, r) {
  const dx = bx - ax;
  const dy = by - ay;
  let tMin = 0;
  let tMax = 1;
  // X slab.
  if (dx === 0) {
    if (ax < r.x || ax > r.x + r.w) return false;
  } else {
    let t1 = (r.x - ax) / dx;
    let t2 = (r.x + r.w - ax) / dx;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  // Y slab.
  if (dy === 0) {
    if (ay < r.y || ay > r.y + r.h) return false;
  } else {
    let t1 = (r.y - ay) / dy;
    let t2 = (r.y + r.h - ay) / dy;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** True when any solid stands between the two points: no line of sight. */
export function sightBlocked(level, ax, ay, bx, by) {
  for (let i = 0; i < level.solids.length; i += 1) {
    if (segmentHitsRect(ax, ay, bx, by, level.solids[i])) return true;
  }
  return false;
}

/** True when the segment (ax,ay)-(bx,by) passes through the circle (cx,cy,r). */
export function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = ax - cx;
    const ey = ay - cy;
    return ex * ex + ey * ey <= r * r;
  }
  let t = ((cx - ax) * dx + (cy - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const px = ax + t * dx - cx;
  const py = ay + t * dy - cy;
  return px * px + py * py <= r * r;
}
