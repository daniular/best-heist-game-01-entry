// Midnight Vault — boot and the one loop. Input is read every frame, the heist
// advances in fixed 1/60 s steps, and the renderer paints what is there. The game
// moves between five screens: title, play, paused, clean getaway and busted.
//
// ?shot=cover|patrol|alert|getaway stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.

import { ALARM, BEST_KEY, STEP, THIEF, TOOLS, WIN_BONUS } from './config.js';
import { buildVaultLevel } from './level.js';
import { createWatchers, guardTouching, updateWatchers } from './guards.js';
import { atExit, createThief, dropSmoke, fireEmp, readMoveInput, tryGrabLoot, updateThief } from './player.js';
import { createSoundboard } from './audio.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sound = createSoundboard();
const renderer = createRenderer(canvas);

/** A fresh heist: the room, the thief, the watchers, a silent alarm. */
export function createGameState() {
  const level = buildVaultLevel();
  return {
    level,
    thief: createThief(level),
    watchers: createWatchers(level),
    smokes: [],
    camerasOffUntil: 0,
    alarm: 0,
    exposure: 0,
    seenBy: null,
    score: 0,
    time: 0,
    status: 'playing',
    loseReason: '',
    winText: '',
    flash: null,
  };
}

/**
 * Advance the heist one fixed step. `vec` is the thief's movement ({ dx, dy,
 * sneak }) or null to stand still. In safe mode (title screen, screenshot
 * staging) the alarm is capped and the heist can never end. Returns what
 * happened: { picked, caught, won }.
 */
export function stepGame(state, dt, vec, safe = false) {
  if (state.status !== 'playing') return { picked: null, caught: null, won: false };
  const events = { picked: null, caught: null, won: false };
  state.time += dt;
  const { level, thief } = state;

  if (vec !== null && vec !== undefined) updateThief(thief, level, vec, dt);

  state.smokes = state.smokes.filter((smoke) => smoke.until > state.time);
  const camerasBlind = state.camerasOffUntil > state.time;
  const sighting = updateWatchers(state.watchers, level, thief, state.smokes, camerasBlind, state.alarm, dt, state.time);
  state.exposure = sighting.exposure;
  state.seenBy = sighting.seenBy;

  // The alarm climbs while any watcher sees the thief — faster up close, slower
  // while sneaking — and drains while the thief stays hidden.
  if (sighting.exposure > 0) {
    const strength = sighting.exposure * (thief.sneaking ? THIEF.sneakAlarmFactor : 1);
    state.alarm += (ALARM.riseBase + ALARM.riseClose * strength) * dt;
  } else {
    state.alarm -= ALARM.fall * dt;
  }
  state.alarm = Math.max(0, Math.min(ALARM.max, state.alarm));

  const picked = tryGrabLoot(thief, level);
  if (picked !== null) {
    state.score += picked.value;
    state.flash = { text: `${picked.label}  +$${picked.value.toLocaleString('en-US')}`, until: state.time + 2.2 };
    events.picked = picked;
  }

  if (safe) {
    state.alarm = Math.min(state.alarm, 45);
    return events;
  }

  if (state.alarm >= ALARM.max) {
    state.status = 'lost';
    state.loseReason = 'The alarm hit 100% — security swarmed the vault.';
    events.caught = 'alarm';
    return events;
  }
  const grabber = guardTouching(state.watchers, thief);
  if (grabber !== null) {
    state.status = 'lost';
    state.loseReason = `${grabber.name} grabbed you in the dark.`;
    events.caught = 'guard';
    return events;
  }
  if (atExit(thief, level)) {
    const bonus = Math.max(0, WIN_BONUS.start - Math.floor(state.time) * WIN_BONUS.perSecond);
    state.score += bonus;
    state.status = 'won';
    state.winText = `The Starlight Diamond is out — time bonus +$${bonus.toLocaleString('en-US')}.`;
    events.won = true;
  }
  return events;
}

/** Reset `state` in place to a fresh heist (keeps the object's identity). */
function resetStateInPlace(state) {
  const fresh = createGameState();
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, fresh);
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const state = createGameState();
  const world = {
    state,
    reset() {
      resetStateInPlace(state);
    },
    step(dt, vec, safe) {
      stepGame(state, dt, vec, safe);
    },
  };
  const scene = stageShot(name, world);
  const best = readBest();
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, best, state.time);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const state = createGameState();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastAlarm = 0;
  let wasSeen = false;
  let stepCount = 0;
  const keys = new Set();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    resetStateInPlace(state);
    accumulator = 0;
    lastAlarm = 0;
    wasSeen = false;
    screen = SCREEN_PLAY;
    sound.startHum();
    announce('Playing. Grab the diamond and reach the exit.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    sound.stopHum();
    if (won) {
      sound.win();
      if (state.score > best) {
        best = state.score;
        saveBest(best);
      }
      announce(`Clean getaway. Score ${state.score}. Best ${best}.`);
    } else {
      sound.caught();
      announce(`Busted. ${state.loseReason}`);
    }
  }

  function playStepEvents(events) {
    if (events.picked !== null) sound.pickup(events.picked.kind);
    if (events.caught !== null || events.won) endGame(events.won);
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // A living backdrop: guards patrol and cameras sweep behind the title.
      stepGame(state, STEP, null, true);
      return;
    }
    const events = stepGame(state, STEP, readMoveInput(state.thief, keys), false);
    stepCount += 1;
    if (state.exposure > 0 && !wasSeen) sound.spotted();
    wasSeen = state.exposure > 0;
    if (Math.floor(state.alarm / 25) > Math.floor(lastAlarm / 25) && state.alarm > lastAlarm) sound.alarmTick();
    lastAlarm = state.alarm;
    if (state.thief.moving && stepCount % 24 === 0) sound.step(state.thief.sneaking);
    playStepEvents(events);
  }

  function useSmoke() {
    if (screen !== SCREEN_PLAY) return;
    const cloud = dropSmoke(state.thief, state.time);
    if (cloud === null) return;
    state.smokes.push(cloud);
    state.score = Math.max(0, state.score - TOOLS.smokeCost);
    sound.smoke();
    announce('Smoke out. The cones cannot see through it.');
  }

  function useEmp() {
    if (screen !== SCREEN_PLAY) return;
    if (!fireEmp(state.thief)) return;
    state.camerasOffUntil = state.time + TOOLS.empSeconds;
    state.score = Math.max(0, state.score - TOOLS.empCost);
    sound.emp();
    announce('EMP fired. The cameras are blind for a few seconds.');
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const offsetX = (rect.width - 1280 * scale) / 2;
    const offsetY = (rect.height - 720 * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    sound.unlock();
    const code = event.code.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'space'].includes(code)) event.preventDefault();
    if (event.repeat) return;
    keys.add(code);
    if (code === 'space' || code === 'enter') {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
        sound.click();
        startGame();
      }
    } else if (code === 'keyp') {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (code === 'keyq') {
      useSmoke();
    } else if (code === 'keye') {
      useEmp();
    } else if (code === 'keym') {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code.toLowerCase());
  });

  canvas.addEventListener('pointerdown', (event) => {
    sound.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      sound.click();
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const point = canvasPoint(event);
    if (point.x >= 0 && point.x <= 1280 && point.y >= 0 && point.y <= 720) {
      state.thief.clickTarget = point;
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best, state.time);
  }

  // Leaving the tab pauses a running game rather than letting the alarm climb unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
