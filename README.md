# 🔔 THE BELL NEVER RINGS

*A forgotten after-school nightmare.*

**Riverside Elementary, 1997. 4:47 PM.** You are Milo, and you fell asleep in the library. When you woke up, the halls were wrong — longer, dimmer, humming. The clock in every room reads 4:47. The front doors are chained. And somewhere in the building, a janitor is mopping floors that are already clean, humming a song with no words.

He doesn't shout. He doesn't run — not usually. He just *arrives*, mop in hand, smiling, wanting to talk. And talk. And talk.

Find the **8 pages of your diary** scattered through the school to unlock the front doors, and escape before Mr. Mop finds you. Every page you collect makes him faster, and the school... stranger.

---

## ▶ How to Play

### Run it

No build step, no dependencies — it's a pure static site.

**Option A — just open it:** double-click `index.html` in any modern browser.

**Option B — local server (recommended):**

```bash
# pick one:
python3 -m http.server 8000
npx serve .
```

Then visit `http://localhost:8000`.

Works on **desktop and mobile** browsers (Chrome, Firefox, Edge, Safari). Audio starts after your first click/tap (browser autoplay rules).

### Controls

| Action | Keyboard | Mobile |
|---|---|---|
| Move | `WASD` / Arrow keys | Left thumb joystick |
| Interact (pick up, read, open doors, hide) | `E` / `Enter` | ✋ Interact button |
| Sprint (drains stamina, makes noise!) | hold `Shift` | 🏃 Run button |
| Flashlight on/off (drains battery) | `F` | 🔦 Light button |
| Drink soda (restores stamina) | `Q` | 🥤 Item button |
| Throw hall pass (noise distraction) | `R` | — |
| Pause | `Esc` / `P` | ⏸ in HUD |
| Mute | `M` | — |

### Survival tips

- **Walking is quiet. Running is not.** Mr. Mop hears sprinting from far away — and investigates.
- **Lockers are hiding spots.** But if he *saw* you go in... don't get comfortable.
- **The flashlight helps you see, but helps him see you.** Toggle wisely.
- **Hall passes can be thrown** to make noise somewhere else.
- **Sodas** come from the vending machine (it works... three times) and pickups.
- **His humming is your radar.** The louder the hum and your heartbeat, the closer he is.
- Interact with everything: clocks, mirrors, blackboards, radios, trash cans. The school has a lot to say.

---

## 🕹 Game Systems

- **Objective loop:** collect 8 of 12 randomly-placed diary pages → doors unlock → escape. Page positions shuffle every run.
- **Antagonist AI:** Mr. Mop patrols, hears noise, investigates, searches last-known positions, and chases on sight (with true line-of-sight checks). He pathfinds with BFS across the whole 48×32-tile school, opening doors as he goes. He gets faster with every page you take.
- **Resources:** flashlight battery, sprint stamina, sodas, hall passes — all findable, all tradeoffs.
- **Difficulty:** Easy / Normal / Hard (patrol & chase speed, battery drain, stamina burn) — pick it in Settings.
- **Save system:** progress auto-saves on pickups and pause; **Continue** from the title picks up mid-run (pages, tapes, position, items, time).
- **New Game+ ("Night 2"):** beat the game once and every new run is faster, meaner janitor territory. The title screen remembers.

## 🏆 Endings

- **Normal ending — "YOU ESCAPED":** collect 8 pages, reach the front doors.
- **Secret ending — "THE BELL NEVER RINGS":** also find all **5 hidden VHS tapes** before escaping. They're in the dark corners of the school — one is behind furniture that isn't what it seems.

## 🤫 Secrets

- A **bookcase in the library moves**. There's a nook behind it. Something is waiting in the nook.
- The **vending machine** gives sodas — three times. The fourth time, read what it says.
- The **clock** at 4:47 can be examined. Repeatedly. It doesn't like that.
- The **mirror** in the hall shows you. Then it shows you *not alone*.
- **Radios, blackboards, trash cans, plants, fire extinguishers** — all of them hold pieces of what happened at Riverside in 1997.

---

## 🎨 Tech & Art Direction

Zero external assets. Everything is generated:

- **Graphics:** every sprite, tile, prop, character, and the jumpscare face are drawn procedurally with Canvas 2D primitives at runtime (`js/sprites.js`) — chunky shapes, muted 90s-school palette, deterministic grime. A VHS/CRT overlay (scanlines, vignette, tracking noise, glitch bursts) sits on top and can be disabled in Settings.
- **Audio:** every sound is synthesized with the Web Audio API (`js/audio.js`) — footsteps, doors, lockers, pickups, stings, the janitor's hum (a living oscillator that follows him), heartbeat, ambient school drone, and a sparse procedural music bed. No audio files.
- **Lighting:** runtime darkness buffer with radial flashlight cone, ambient glow, flicker events, and the janitor's eyes glowing through the dark.
- **Architecture:** three modules — `audio.js` (sound engine), `sprites.js` (art), `game.js` (map generation, AI, state machine, rendering, UI). Fixed-timestep game loop with delta clamping, axis-separated AABB collision, tile-based map with BFS pathfinding.

### Repository layout

```
mygame/
├── index.html      # game shell: canvas, screens, HUD, touch controls
├── css/style.css   # retro VHS/CRT UI styling
├── js/audio.js     # procedural WebAudio engine
├── js/sprites.js   # procedural canvas art
├── js/game.js      # map, AI, player, rendering, save, UI wiring
└── README.md
```

### Verified

The game ships verified by a headless integration suite (mock DOM/canvas/WebAudio in Node) covering 116 assertions: menu flow, every button, movement & collision, pickups, reader, lockers, doors, noise/hearing, chase → caught → game over → retry, save/continue, pause, settings persistence, both endings, NG+, the secret nook, pathfinding, and a 3000-frame random-input fuzz. Map connectivity is flood-fill verified: every pickup, patrol point, and the exit are reachable; the secret nook is provably sealed until you find it.

---

*The bell never rings at Riverside Elementary. It's been 4:47 for twenty-eight years.*
