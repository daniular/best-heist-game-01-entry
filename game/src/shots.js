// Midnight Vault — the screenshot scenes behind ?shot=cover|patrol|alert|getaway.
// Each one plays the real rules forward from a fresh game for a fixed script of
// moves, so the frame is what a short game really looks like and the same scene
// always gives the same frame. The cover shows the whole job in one frame: the
// room, the thief, guard and camera cones, the diamond and the alarm meter.

import { STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';

/**
 * Walk the thief toward (tx, ty) for up to `seconds`, stepping the real rules
 * in safe mode (a staged scene never ends the heist halfway through).
 */
function steerTo(world, tx, ty, seconds) {
  const { state, step } = world;
  let t = 0;
  while (t < seconds) {
    const dx = tx - state.thief.x;
    const dy = ty - state.thief.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) break;
    step(STEP, { dx: dx / dist, dy: dy / dist, sneak: false }, true);
    t += STEP;
  }
}

/** Let the room run for `seconds` with the thief standing still. */
function hold(world, seconds) {
  let t = 0;
  while (t < seconds) {
    world.step(STEP, null, true);
    t += STEP;
  }
}

/**
 * Set `world` to the named scene (cover, patrol, alert or getaway; any other name
 * is cover) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const { state } = world;
  world.reset();

  if (name === 'patrol') {
    // The thief tucked behind the left pillar, watching Bishop's cone sweep past.
    steerTo(world, 540, 540, 6);
    steerTo(world, 360, 430, 6);
    steerTo(world, 300, 400, 4);
    hold(world, 1.2);
    state.alarm = 8;
    return { screen: SCREEN_PLAY };
  }

  if (name === 'alert') {
    // Caught in the open: Rook has the thief dead-centre in a red cone, the
    // alarm is three quarters up, and the getaway is suddenly a sprint.
    state.thief.x = 500;
    state.thief.y = 300;
    state.thief.facing = 0;
    const rook = state.watchers.guards[0];
    rook.x = 424;
    rook.y = 292;
    rook.angle = Math.atan2(300 - 292, 500 - 424);
    rook.state = 'chase';
    rook.alert = 1;
    rook.lastSeen = { x: 500, y: 300 };
    state.alarm = 76;
    state.exposure = 0.85;
    hold(world, 0.2);
    state.alarm = 76;
    state.exposure = 0.85;
    return { screen: SCREEN_PLAY };
  }

  if (name === 'getaway') {
    // The diamond is in the sack and the thief is slipping back down the middle
    // lane toward the green exit, the alarm already falling behind.
    steerTo(world, 540, 540, 6);
    steerTo(world, 500, 420, 6);
    steerTo(world, 500, 300, 6);
    steerTo(world, 640, 210, 6);
    steerTo(world, 640, 152, 6);
    steerTo(world, 500, 300, 6);
    steerTo(world, 500, 420, 6);
    steerTo(world, 540, 540, 6);
    steerTo(world, 640, 600, 6);
    state.alarm = 14;
    state.exposure = 0;
    return { screen: SCREEN_PLAY };
  }

  // Cover: the thief mid-room on the carpet, the vault and its diamond ahead,
  // Rook's cone crossing the lane, cameras sweeping, alarm a quarter up.
  steerTo(world, 540, 540, 6);
  steerTo(world, 540, 430, 6);
  steerTo(world, 640, 400, 6);
  hold(world, 1.0);
  state.alarm = 30;
  return { screen: SCREEN_PLAY };
}
