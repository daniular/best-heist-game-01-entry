// Midnight Vault — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The thief: Wren, a hooded cat-burglar. Sneak is slower but much harder to spot. */
export const THIEF = {
  radius: 14,
  walkSpeed: 178,
  sneakSpeed: 96,
  /** How far a watcher can spot a sneaking thief, as a fraction of its normal range. */
  sneakRangeFactor: 0.62,
  /** Alarm rise while sneaking, as a fraction of the normal rise. */
  sneakAlarmFactor: 0.6,
  grabRadius: 40,
};

/** A patrolling guard. */
export const GUARD = {
  radius: 15,
  patrolSpeed: 58,
  suspectSpeed: 96,
  chaseSpeed: 132,
  /** How long a guard waits at each waypoint before turning around. */
  waypointPause: 1.4,
  visionRange: 178,
  /** Half of the vision cone's angle, in radians (about 32 degrees each side). */
  visionHalfAngle: 0.56,
  /** Touching a guard ends the heist at once. */
  catchRadius: 27,
};

/** A wall-mounted security camera. */
export const CAMERA = {
  visionRange: 222,
  visionHalfAngle: 0.44,
  /** Radians per second of its sweep. */
  sweepSpeed: 0.55,
  /** How far each side of its resting angle it sweeps, in radians. */
  sweepArc: 0.9,
};

/** The alarm meter: 0 is silent, 100 is busted. */
export const ALARM = {
  max: 100,
  /** Rise per second while seen: base plus a bonus for being close to the watcher. */
  riseBase: 16,
  riseClose: 54,
  /** Fall per second while nobody sees the thief. */
  fall: 22,
  /** Above this, guards leave their patrol to hunt the last seen spot. */
  suspectAt: 25,
  /** Above this, guards chase the thief directly and their cones turn red. */
  chaseAt: 60,
};

/** The tools: each costs score when used, so a loud plan pays for itself in loot or not at all. */
export const TOOLS = {
  smokeCount: 2,
  smokeRadius: 78,
  smokeSeconds: 5,
  smokeCost: 250,
  empCount: 1,
  empSeconds: 7,
  empCost: 250,
};

/** What each piece of loot is worth. */
export const LOOT_VALUE = {
  diamond: 5000,
  goldBar: 800,
  painting: 1200,
};

/** Win bonus: starts at 3000 and ticks down 15 a second, so a fast getaway pays. */
export const WIN_BONUS = { start: 3000, perSecond: 15 };

export const PALETTE = {
  backdrop: '#0b0d16',
  floor: '#171a26',
  floorTile: '#1d2133',
  carpet: '#571d2b',
  carpetEdge: '#c9a227',
  wall: '#2b3049',
  wallTop: '#3d4468',
  pillar: '#262c40',
  caseGlass: '#2e3a55',
  caseGold: '#c9a227',
  vault: '#3a3558',
  vaultGold: '#d8b64a',
  diamond: '#8ff4ff',
  gold: '#f2c94c',
  guard: '#232a3d',
  guardTrim: '#e5534b',
  cone: 'rgba(255, 214, 64, 0.16)',
  coneEdge: 'rgba(255, 214, 64, 0.55)',
  coneAlert: 'rgba(255, 64, 64, 0.30)',
  coneAlertEdge: 'rgba(255, 64, 64, 0.8)',
  cameraCone: 'rgba(120, 200, 255, 0.13)',
  cameraConeEdge: 'rgba(120, 200, 255, 0.5)',
  cameraOff: 'rgba(140, 150, 170, 0.10)',
  thief: '#7b5cff',
  thiefFace: '#f2c9a0',
  smoke: 'rgba(190, 196, 210, 0.34)',
  exit: '#2ecc71',
  exitDark: '#1d7a44',
  panel: '#12141f',
  panelEdge: '#2c3247',
  text: '#eef1f5',
  muted: '#9aa1b5',
  alarmLow: '#2ecc71',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best getaway score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';
