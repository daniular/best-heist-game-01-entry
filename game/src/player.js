// Midnight Vault — the thief: Wren. Walks with WASD or the arrow keys, sneaks
// while Shift is held, and can also be steered by clicking a spot on the floor.
// Grabs loot by walking over it, drops smoke to break line of sight, and fires an
// EMP pulse to blind the cameras for a few seconds. Both tools cost score.

import { LOOT_VALUE, THIEF, TOOLS } from './config.js';
import { pointInRect, slideMove } from './level.js';

/** A fresh thief at the level's spawn, with a full tool belt. */
export function createThief(level) {
  return {
    x: level.spawn.x,
    y: level.spawn.y,
    radius: THIEF.radius,
    sneaking: false,
    facing: -Math.PI / 2,
    moving: false,
    smokeLeft: TOOLS.smokeCount,
    empLeft: TOOLS.empCount,
    hasDiamond: false,
    /** Click-to-move target, or null. Keyboard input always wins over it. */
    clickTarget: null,
  };
}

/**
 * Read the held keys into a movement vector. Returns { dx, dy, sneak } with the
 * vector normalised; a click target steers the thief when no key is held.
 */
export function readMoveInput(thief, keys) {
  let dx = 0;
  let dy = 0;
  if (keys.has('arrowleft') || keys.has('keya')) dx -= 1;
  if (keys.has('arrowright') || keys.has('keyd')) dx += 1;
  if (keys.has('arrowup') || keys.has('keyw')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('keys')) dy += 1;
  if (dx === 0 && dy === 0 && thief.clickTarget !== null) {
    const tx = thief.clickTarget.x - thief.x;
    const ty = thief.clickTarget.y - thief.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 8) {
      thief.clickTarget = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
    }
  }
  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
  }
  return { dx, dy, sneak: keys.has('shiftleft') || keys.has('shiftright') };
}

/** Step the thief one frame: sneak or walk, sliding along walls. */
export function updateThief(thief, level, vec, dt) {
  thief.sneaking = vec.sneak;
  const speed = vec.sneak ? THIEF.sneakSpeed : THIEF.walkSpeed;
  const moved = slideMove(level, thief.x, thief.y, vec.dx * speed * dt, vec.dy * speed * dt, thief.radius);
  thief.moving = moved.x !== thief.x || moved.y !== thief.y;
  if (thief.moving) thief.facing = Math.atan2(moved.y - thief.y, moved.x - thief.x);
  thief.x = moved.x;
  thief.y = moved.y;
}

/**
 * Grab whatever loot the thief stands on. Returns the picked item
 * ({ kind, label, value }) or null. The diamond is the win condition's half.
 */
export function tryGrabLoot(thief, level) {
  const diamond = level.diamond;
  if (!diamond.taken && Math.hypot(thief.x - diamond.x, thief.y - diamond.y) < THIEF.grabRadius) {
    diamond.taken = true;
    thief.hasDiamond = true;
    return { kind: 'diamond', label: diamond.label, value: LOOT_VALUE.diamond };
  }
  for (const item of level.loot) {
    if (!item.taken && Math.hypot(thief.x - item.x, thief.y - item.y) < THIEF.grabRadius) {
      item.taken = true;
      return { kind: item.kind, label: item.label, value: LOOT_VALUE[item.kind] };
    }
  }
  return null;
}

/** Drop a smoke pellet at the thief's feet. Returns the cloud, or null when out. */
export function dropSmoke(thief, now) {
  if (thief.smokeLeft <= 0) return null;
  thief.smokeLeft -= 1;
  return { x: thief.x, y: thief.y, r: TOOLS.smokeRadius, until: now + TOOLS.smokeSeconds };
}

/** Fire the EMP: cameras go blind until `now + TOOLS.empSeconds`. Returns true when fired. */
export function fireEmp(thief) {
  if (thief.empLeft <= 0) return false;
  thief.empLeft -= 1;
  return true;
}

/** True when the thief stands on the exit mat with the diamond. */
export function atExit(thief, level) {
  return thief.hasDiamond && pointInRect(thief.x, thief.y, level.exit);
}
