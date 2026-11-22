// Midnight Vault — the watchers: patrolling guards with vision cones and sweeping
// security cameras. A watcher spots the thief when the thief is inside its cone,
// in range, in line of sight and not hidden by smoke; cameras go blind while an
// EMP pulse lasts. Guards read the alarm meter: suspicious above 25, chasing above 60.

import { ALARM, CAMERA, GUARD, THIEF } from './config.js';
import { segmentHitsCircle, sightBlocked } from './level.js';

/** Smallest absolute difference between two angles, in radians. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d);
}

/** True when the point (x, y) lies inside the watcher's cone. */
function insideCone(watcher, x, y) {
  const dx = x - watcher.x;
  const dy = y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > watcher.range) return false;
  if (dist < 1) return true;
  return angleDifference(Math.atan2(dy, dx), watcher.angle) <= watcher.halfAngle;
}

/** Build the guards and cameras for a level, each with its own live state. */
export function createWatchers(level) {
  const guards = level.guardRoutes.map((route) => {
    const first = route.waypoints[0];
    const second = route.waypoints[1] ?? first;
    return {
      kind: 'guard',
      name: route.name,
      x: first.x,
      y: first.y,
      angle: Math.atan2(second.y - first.y, second.x - first.x),
      waypoints: route.waypoints,
      waypointIndex: 1,
      pauseLeft: 0,
      state: 'patrol',
      lastSeen: null,
      range: GUARD.visionRange,
      halfAngle: GUARD.visionHalfAngle,
      /** 0 calm, 1 fully alert: drives the cone's colour. */
      alert: 0,
    };
  });
  const cameras = level.cameraMounts.map((mount) => ({
    kind: 'camera',
    x: mount.x,
    y: mount.y,
    baseAngle: mount.baseAngle,
    phase: mount.phase,
    angle: mount.baseAngle,
    range: CAMERA.visionRange,
    halfAngle: CAMERA.visionHalfAngle,
    alert: 0,
  }));
  return { guards, cameras };
}

/**
 * How strongly one watcher sees the thief right now: 0 when hidden, up to 1 when
 * the thief stands close and dead-centre in the cone. Sneaking shrinks the range.
 */
export function watcherExposure(watcher, level, thief, smokes) {
  const range = thief.sneaking ? watcher.range * THIEF.sneakRangeFactor : watcher.range;
  const dx = thief.x - watcher.x;
  const dy = thief.y - watcher.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (dist > 1 && angleDifference(Math.atan2(dy, dx), watcher.angle) > watcher.halfAngle) return 0;
  if (sightBlocked(level, watcher.x, watcher.y, thief.x, thief.y)) return 0;
  for (let i = 0; i < smokes.length; i += 1) {
    const smoke = smokes[i];
    if (segmentHitsCircle(watcher.x, watcher.y, thief.x, thief.y, smoke.x, smoke.y, smoke.r)) return 0;
  }
  // Close and centred reads as a strong sighting; far and on the cone's edge, a weak one.
  const closeness = 1 - dist / range;
  return Math.max(0.15, Math.min(1, 0.35 + closeness));
}

/** Step one guard: patrol its waypoints, or hunt when the alarm says to. */
function updateGuard(guard, level, thief, dt, alarm, time) {
  const hunting = alarm >= ALARM.chaseAt;
  const suspicious = alarm >= ALARM.suspectAt;
  let target = null;
  let speed = GUARD.patrolSpeed;

  if (hunting) {
    guard.state = 'chase';
    target = { x: thief.x, y: thief.y };
    speed = GUARD.chaseSpeed;
  } else if (suspicious && guard.lastSeen !== null) {
    guard.state = 'suspect';
    target = guard.lastSeen;
    speed = GUARD.suspectSpeed;
  } else {
    guard.state = 'patrol';
  }

  if (guard.state === 'patrol') {
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      return;
    }
    target = guard.waypoints[guard.waypointIndex];
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) {
      guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      guard.pauseLeft = GUARD.waypointPause;
      return;
    }
    const step = Math.min(dist, speed * dt);
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    guard.angle = Math.atan2(dy, dx);
    return;
  }

  // Hunting or suspicious: walk toward the target, then look around when it is reached.
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 10) {
    if (guard.state === 'suspect') {
      guard.lastSeen = null;
      guard.angle += Math.sin(time * 2.4) * 0.9 * dt;
    }
    return;
  }
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
}

/**
 * Step every watcher and work out the strongest sighting of the thief.
 * Returns { exposure, seenBy } — exposure 0 when nobody sees the thief.
 */
export function updateWatchers(watchers, level, thief, smokes, camerasBlind, alarm, dt, time) {
  let exposure = 0;
  let seenBy = null;

  for (const guard of watchers.guards) {
    updateGuard(guard, level, thief, dt, alarm, time);
    const seen = watcherExposure(guard, level, thief, smokes);
    if (seen > 0) {
      guard.lastSeen = { x: thief.x, y: thief.y };
      if (seen > exposure) {
        exposure = seen;
        seenBy = guard;
      }
    }
    guard.alert = Math.max(0, Math.min(1, alarm / ALARM.chaseAt));
  }

  for (const camera of watchers.cameras) {
    camera.angle = camera.baseAngle + Math.sin(time * CAMERA.sweepSpeed + camera.phase) * CAMERA.sweepArc;
    if (camerasBlind) {
      camera.alert = 0;
      continue;
    }
    const seen = watcherExposure(camera, level, thief, smokes);
    if (seen > exposure) {
      exposure = seen;
      seenBy = camera;
    }
    camera.alert = seen > 0 ? 1 : 0;
  }

  return { exposure, seenBy };
}

/** True when any guard is close enough to grab the thief. */
export function guardTouching(watchers, thief) {
  for (const guard of watchers.guards) {
    if (Math.hypot(guard.x - thief.x, guard.y - thief.y) < GUARD.catchRadius + THIEF.radius - 2) return guard;
  }
  return null;
}
