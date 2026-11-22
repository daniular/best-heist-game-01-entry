# Midnight Vault

[![make.fun](https://img.shields.io/badge/make.fun-bounty-blue)](https://make.fun)
[![competition](https://img.shields.io/badge/competition-best--heist--game--20261122--0559-purple)](https://make.fun/c/best-heist-game-20261122-0559)
[![game](https://img.shields.io/badge/game-Midnight%20Vault-gold)](https://make.fun/c/best-heist-game-20261122-0559)

**Midnight Vault** is a single-screen top-down stealth heist. You are Wren, a
hooded thief slipping into the vault hall of the Grand Meridian Museum after
dark. One room, three patrolling guards, three sweeping security cameras, and
the Starlight Diamond glowing on its pedestal below Vault No. 7. Grab it —
plus the gold bars and the Duchess portrait if you are greedy — and reach the
green EXIT before the alarm meter hits 100%.

## How it plays

- **Move** with WASD or the arrow keys; **click a spot** on the floor to walk
  there. Hold **Shift** to sneak: slower, but guards spot you from much
  closer and the alarm climbs half as fast.
- **Vision cones** are the whole game. Guard cones are yellow and turn red
  when the alarm passes 60 and they start chasing; camera cones are blue and
  sweep back and forth on a fixed rhythm. Read them before you move.
- **Alarm meter** (top centre): rises while any watcher sees you — faster up
  close — and drains while you stay hidden. At 100% the job is over; if a
  guard lays a hand on you, it is over sooner.
- **Tools, at a cost:** **Q** drops a smoke pellet (×2, blocks line of
  sight for 5 s), **E** fires an EMP pulse (×1, blinds the cameras for 7 s).
  Each use costs $250 of loot, so a loud plan has to pay for itself.
- **Routes:** the wide middle lane past the carpet, the left lane behind the
  pillars and display cases, or the right lane past the portrait. The vault
  door lane is the most exposed and the fastest.
- **Win:** diamond in the sack plus standing on the green EXIT. A time bonus
  ticks down $15 a second, so a fast getaway pays.

## Files

- `game/index.html` — the page; loads only files under `game/`, nothing over
  the network.
- `game/src/config.js` — every tuning number and colour.
- `game/src/level.js` — the vault hall: walls, pillars, cases, the vault,
  the loot, the exit, and the collision and line-of-sight tests.
- `game/src/guards.js` — guard patrols, suspicion and chase, camera sweeps,
  and the vision-cone test.
- `game/src/player.js` — the thief: movement, sneaking, loot grabs, smoke
  and EMP, the exit check.
- `game/src/render.js` — the canvas painter: room, cones, HUD, screens.
- `game/src/audio.js` — sound, synthesized with WebAudio; no audio files.
- `game/src/main.js` — boot, the fixed-step loop, input, win and lose.
- `game/src/shots.js` — the staged screenshot scenes (`?shot=cover|patrol|
  alert|getaway`).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.

## Play it

Serve `game/` with any static server and open `index.html`, or run
`node serve.ts` from a kit checkout. No build step, no network requests.

## License

MIT — see `LICENSE`.
