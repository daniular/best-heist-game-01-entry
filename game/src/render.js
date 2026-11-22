// Midnight Vault — the renderer: one canvas, one logical 1280x720 room, scaled to
// the window. It paints the floor and carpet, the vault and loot, the walls and
// cover, the guards' and cameras' vision cones, the thief, the smoke, the HUD
// (alarm meter, loot, tools, timer) and the title, pause, win and lose screens.

import { ALARM, FIELD, FONT, PALETTE, TOOLS } from './config.js';
import { pointInRect } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

/** Format seconds as mm:ss. */
function clock(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** The alarm bar's colour: green, then gold, then red as it climbs. */
function alarmColour(value) {
  if (value < 40) return PALETTE.alarmLow;
  if (value < 70) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

/** Draw a filled wedge: the vision cone of a guard or a camera. */
function drawCone(ctx, x, y, angle, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle - halfAngle) * range, y + Math.sin(angle - halfAngle) * range);
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(angle + halfAngle) * range, y + Math.sin(angle + halfAngle) * range);
  ctx.stroke();
}

/** A little diamond: a rotated square with a bright core. */
function drawDiamond(ctx, x, y, size, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.shadowColor = PALETTE.diamond;
  ctx.shadowBlur = glow;
  ctx.fillStyle = PALETTE.diamond;
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
  ctx.restore();
}

/** A gold bar: a small trapezoid with a bright top edge. */
function drawGoldBar(ctx, x, y) {
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.moveTo(x - 13, y + 6);
  ctx.lineTo(x - 9, y - 6);
  ctx.lineTo(x + 9, y - 6);
  ctx.lineTo(x + 13, y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(x - 9, y - 6, 18, 3);
}

/** Create the renderer for a canvas; draw(state, screen, best, now) paints a frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }

  window.addEventListener('resize', resize);
  resize();

  function drawFloor(level) {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.floorTile;
    ctx.lineWidth = 1;
    for (let x = 64; x < FIELD.width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 64; y < FIELD.height; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    // The carpet runner down the middle, gold-edged.
    const carpet = level.carpet;
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
    ctx.strokeStyle = PALETTE.carpetEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(carpet.x + 4, carpet.y, carpet.w - 8, carpet.h);
    ctx.strokeStyle = 'rgba(201,162,39,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(carpet.x + 12, carpet.y + 6, carpet.w - 24, carpet.h - 12);
  }

  function drawExit(level, now) {
    const exit = level.exit;
    const pulse = 0.55 + 0.25 * Math.sin(now * 3);
    ctx.fillStyle = PALETTE.exitDark;
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = `rgba(46, 204, 113, ${pulse})`;
    ctx.fillRect(exit.x + 4, exit.y + 4, exit.w - 8, exit.h - 8);
    ctx.fillStyle = '#0b0d16';
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT  ▲', exit.x + exit.w / 2, exit.y + exit.h / 2 + 1);
  }

  function drawVault(level, now) {
    const vault = level.vault;
    ctx.fillStyle = PALETTE.vault;
    ctx.fillRect(vault.x, vault.y, vault.w, vault.h);
    ctx.strokeStyle = PALETTE.vaultGold;
    ctx.lineWidth = 3;
    ctx.strokeRect(vault.x + 3, vault.y + 3, vault.w - 6, vault.h - 6);
    // The vault door: a big dial and spokes.
    ctx.beginPath();
    ctx.arc(vault.x + vault.w / 2, vault.y + vault.h / 2, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#221f38';
    ctx.fill();
    ctx.strokeStyle = PALETTE.vaultGold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(vault.x + vault.w / 2, vault.y + vault.h / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.vaultGold;
    ctx.fill();
    ctx.fillStyle = PALETTE.vaultGold;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VAULT', vault.x + 52, vault.y + vault.h / 2);
    ctx.fillText('No. 7', vault.x + vault.w - 46, vault.y + vault.h / 2);
    // The diamond on its pedestal below the vault, glowing.
    const diamond = level.diamond;
    if (!diamond.taken) {
      const glow = 14 + 8 * Math.sin(now * 2.4);
      ctx.fillStyle = '#3a3558';
      ctx.beginPath();
      ctx.arc(diamond.x, diamond.y + 16, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.vaultGold;
      ctx.lineWidth = 2;
      ctx.stroke();
      drawDiamond(ctx, diamond.x, diamond.y, 26, glow);
      ctx.fillStyle = PALETTE.diamond;
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillText('STARLIGHT DIAMOND', diamond.x, diamond.y + 44);
    }
  }

  function drawLoot(level) {
    for (const item of level.loot) {
      if (item.taken) continue;
      if (item.kind === 'goldBar') {
        drawGoldBar(ctx, item.x, item.y);
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('GOLD', item.x, item.y + 22);
      } else {
        // The portrait: a gold frame on the wall, a shadowy duchess inside.
        ctx.fillStyle = PALETTE.vaultGold;
        ctx.fillRect(item.x - 26, item.y - 32, 52, 64);
        ctx.fillStyle = '#1c2438';
        ctx.fillRect(item.x - 21, item.y - 27, 42, 54);
        ctx.fillStyle = '#8a6f4d';
        ctx.beginPath();
        ctx.arc(item.x, item.y - 8, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3d2b52';
        ctx.fillRect(item.x - 12, item.y + 2, 24, 22);
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('PORTRAIT', item.x, item.y + 46);
      }
    }
  }

  function drawSolids(level) {
    for (const s of level.solids) {
      if (s.kind === 'vault') continue; // The vault draws itself, with its door.
      ctx.fillStyle = s.kind === 'wall' ? PALETTE.wall : s.kind === 'case' ? PALETTE.caseGlass : PALETTE.pillar;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(s.x, s.y, s.w, 4);
      if (s.kind === 'case') {
        ctx.strokeStyle = PALETTE.caseGold;
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x + 2, s.y + 2, s.w - 4, s.h - 4);
      }
      if (s.kind === 'pillar') {
        ctx.strokeStyle = 'rgba(201,162,39,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(s.x + 3, s.y + 3, s.w - 6, s.h - 6);
      }
    }
  }

  function drawSmoke(smokes, now) {
    for (const smoke of smokes) {
      if (smoke.until <= now) continue;
      const left = smoke.until - now;
      const alpha = Math.min(1, left / 1.5);
      ctx.fillStyle = `rgba(190, 196, 210, ${0.34 * alpha})`;
      ctx.beginPath();
      ctx.arc(smoke.x, smoke.y, smoke.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(220, 226, 238, ${0.22 * alpha})`;
      ctx.beginPath();
      ctx.arc(smoke.x - 14, smoke.y - 10, smoke.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(smoke.x + 18, smoke.y + 12, smoke.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCones(watchers, camerasBlind) {
    for (const camera of watchers.cameras) {
      if (camerasBlind) {
        drawCone(ctx, camera.x, camera.y, camera.angle, camera.halfAngle, camera.range, PALETTE.cameraOff, 'rgba(140,150,170,0.25)');
      } else {
        drawCone(ctx, camera.x, camera.y, camera.angle, camera.halfAngle, camera.range, PALETTE.cameraCone, PALETTE.cameraConeEdge);
      }
    }
    for (const guard of watchers.guards) {
      const t = guard.alert;
      const fill = t > 0.5 ? PALETTE.coneAlert : PALETTE.cone;
      const edge = t > 0.5 ? PALETTE.coneAlertEdge : PALETTE.coneEdge;
      drawCone(ctx, guard.x, guard.y, guard.angle, guard.halfAngle, guard.range, fill, edge);
    }
  }

  function drawCameras(watchers, camerasBlind) {
    for (const camera of watchers.cameras) {
      ctx.fillStyle = '#1a1e2e';
      ctx.fillRect(camera.x - 9, camera.y - 7, 18, 14);
      ctx.strokeStyle = camerasBlind ? '#5a6274' : '#7ec8ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(camera.x - 9, camera.y - 7, 18, 14);
      ctx.beginPath();
      ctx.arc(camera.x + Math.cos(camera.angle) * 8, camera.y + Math.sin(camera.angle) * 8, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = camerasBlind ? '#5a6274' : '#ff5a5a';
      ctx.fill();
      if (camerasBlind) {
        ctx.fillStyle = '#9aa1b5';
        ctx.font = `bold 10px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('EMP', camera.x, camera.y - 14);
      }
    }
  }

  function drawGuards(watchers) {
    for (const guard of watchers.guards) {
      // Shadow, body, trim ring, and the direction the guard is facing.
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(guard.x, guard.y + 12, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = guard.state === 'patrol' ? '#4a5470' : PALETTE.guardTrim;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#c8cede';
      ctx.beginPath();
      ctx.arc(guard.x + Math.cos(guard.angle) * 6, guard.y + Math.sin(guard.angle) * 6, 5, 0, Math.PI * 2);
      ctx.fill();
      // A cap brim pointing where the guard looks.
      ctx.strokeStyle = '#c8cede';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(guard.x + Math.cos(guard.angle) * 10, guard.y + Math.sin(guard.angle) * 10);
      ctx.lineTo(guard.x + Math.cos(guard.angle) * 19, guard.y + Math.sin(guard.angle) * 19);
      ctx.stroke();
      if (guard.state !== 'patrol') {
        ctx.fillStyle = '#ff5a5a';
        ctx.font = `bold 20px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('!', guard.x, guard.y - 22);
      }
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(guard.name, guard.x, guard.y + 30);
    }
  }

  function drawThief(thief, seen) {
    const r = thief.sneaking ? thief.radius * 0.85 : thief.radius;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(thief.x, thief.y + r * 0.8, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b7a5ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    // The hood's face, looking where the thief moves.
    ctx.fillStyle = PALETTE.thiefFace;
    ctx.beginPath();
    ctx.arc(thief.x + Math.cos(thief.facing) * 5, thief.y + Math.sin(thief.facing) * 5, 5.5, 0, Math.PI * 2);
    ctx.fill();
    if (thief.hasDiamond) {
      // The loot sack on the thief's back: a glinting bundle.
      const bx = thief.x - Math.cos(thief.facing) * 13;
      const by = thief.y - Math.sin(thief.facing) * 13;
      ctx.fillStyle = '#3d2b52';
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.diamond;
      ctx.beginPath();
      ctx.arc(bx, by - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (thief.sneaking) {
      ctx.strokeStyle = 'rgba(183,165,255,0.8)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(thief.x, thief.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (seen) {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = `bold 22px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', thief.x, thief.y - r - 12);
    }
  }

  function drawHud(state, screen) {
    // A floating bar over the top of the room: title, alarm meter, loot, tools, timer.
    ctx.fillStyle = 'rgba(10, 12, 20, 0.86)';
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(14, 8, FIELD.width - 28, 46, 8);
    ctx.fill();
    ctx.stroke();

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText('MIDNIGHT VAULT', 30, 32);
    const titleW = ctx.measureText('MIDNIGHT VAULT').width;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `11px ${FONT}`;
    ctx.fillText('the Starlight job', 30 + titleW + 12, 33);

    // The alarm meter: the heart of the heist, centre stage.
    const meterX = 420;
    const meterW = 300;
    const meterY = 22;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('ALARM', meterX, meterY + 9);
    ctx.fillStyle = '#0b0d16';
    ctx.fillRect(meterX + 58, meterY, meterW, 18);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(meterX + 58, meterY, meterW, 18);
    const alarmW = Math.max(0, Math.min(1, state.alarm / ALARM.max)) * meterW;
    ctx.fillStyle = alarmColour(state.alarm);
    ctx.fillRect(meterX + 58, meterY, alarmW, 18);
    // Segment ticks every quarter of the meter.
    ctx.fillStyle = 'rgba(11,13,22,0.9)';
    for (let i = 1; i < 4; i += 1) ctx.fillRect(meterX + 58 + (meterW * i) / 4 - 1, meterY, 2, 18);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 12px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(state.alarm)}%`, meterX + 58 + meterW + 10, meterY + 9);

    // Loot, tools and the clock on the right.
    const rightX = 1250;
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(`$${state.score.toLocaleString('en-US')}`, rightX, 25);
    ctx.fillStyle = state.thief.hasDiamond ? PALETTE.diamond : PALETTE.muted;
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillText(state.thief.hasDiamond ? '◆ DIAMOND SECURED' : '◇ diamond not taken', rightX, 43);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`SMOKE ×${state.thief.smokeLeft}   EMP ×${state.thief.empLeft}`, 830, 26);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(clock(state.time), 830, 43);

    if (screen === SCREEN_PLAY && state.exposure > 0) {
      ctx.fillStyle = '#ff5a5a';
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('SPOTTED — BREAK LINE OF SIGHT!', FIELD.width / 2, 76);
    }
  }

  function drawFlash(state, now) {
    if (state.flash === null || state.flash.until <= now) return;
    const alpha = Math.min(1, (state.flash.until - now) / 0.8);
    ctx.fillStyle = `rgba(242, 201, 76, ${alpha})`;
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.flash.text, FIELD.width / 2, 104);
  }

  function drawOverlay(title, lines, accent, best) {
    ctx.fillStyle = 'rgba(8, 9, 15, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = `bold 58px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, 238);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `17px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, 310 + i * 28);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.fillText(`Best getaway: $${best.toLocaleString('en-US')}`, FIELD.width / 2, 310 + lines.length * 28 + 26);
  }

  /** Paint one frame. `now` is seconds, for pulsing and fading. */
  function draw(state, screen, best, now) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const offsetX = (canvas.width - FIELD.width * scale) / 2;
    const offsetY = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

    const { level, thief, watchers } = state;
    const camerasBlind = state.camerasOffUntil > now;
    drawFloor(level);
    drawExit(level, now);
    drawVault(level, now);
    drawLoot(level);
    drawSolids(level);
    drawSmoke(state.smokes, now);
    drawCones(watchers, camerasBlind);
    drawCameras(watchers, camerasBlind);
    drawGuards(watchers);
    drawThief(thief, state.exposure > 0);
    drawHud(state, screen);
    drawFlash(state, now);

    if (screen === SCREEN_TITLE) {
      drawOverlay('MIDNIGHT VAULT', [
        'One room. Three guards. Three cameras. One diamond.',
        'WASD / arrows to move — Shift to sneak — click a spot to walk there.',
        'Q drops smoke (×2), E fires the EMP (×1). Both cost $250.',
        'Grab the Starlight Diamond, then reach the green EXIT. If the alarm',
        'hits 100% — or a guard lays a hand on you — the job is over.',
        '',
        'Press SPACE or click to start the job.',
      ], PALETTE.gold, best);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['The vault waits. Press P to slip back in.'], PALETTE.text, best);
    } else if (screen === SCREEN_WIN) {
      drawOverlay('CLEAN GETAWAY!', [
        state.winText,
        `Loot: $${state.score.toLocaleString('en-US')}   Time: ${clock(state.time)}`,
        '',
        'Press SPACE or click to run it again.',
      ], PALETTE.exit, best);
    } else if (screen === SCREEN_LOSE) {
      drawOverlay('BUSTED!', [
        state.loseReason,
        `Loot kept: $${state.score.toLocaleString('en-US')}   Time: ${clock(state.time)}`,
        '',
        'Press SPACE or click to try the vault again.',
      ], PALETTE.alarmHigh, best);
    }
  }

  return { draw, resize };
}
