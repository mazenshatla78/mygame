# THE BELL NEVER RINGS

A low-poly, retro-3D first-person horror game that runs entirely in the browser.
One afternoon. One school. One janitor who does not want the day to end.

**Riverside Elementary, 1997 — 4:47 PM.** The bell never rang. The buses left
without you. The front doors are chained, the halls are bright with late
sunlight, and somewhere down the corridor a mop bucket is rolling toward the
sound you just made.

Everything you see and hear is generated in code: the geometry, the textures,
the music, the characters. There are **zero asset files** in this repository —
no images, no models, no audio. The whole school is ~200 KB of JavaScript that
draws itself a PS1 at a time.

---

## Play it

```
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Works on desktop (keyboard + mouse) and mobile (virtual stick + touch look).
No build step, no dependencies, no network calls at runtime.

---

## The loop

The school day is stuck on repeat: **eight periods** rotate on a schedule, and
every period the halls rearrange their patrols. Your job is to collect the
**8 pages of your diary** scattered through the classrooms — they are the only
thing that unchains the front doors. Along the way you may find the **5 reel
tapes** that explain what actually happened in 1969, and unlock the secret
ending.

You are not fast, and you are not armed. You are *small*, and you are *quiet*,
and the school is full of places to be neither.

### Controls

| Action | Desktop | Mobile |
|---|---|---|
| Move | `W A S D` / arrows | left virtual stick |
| Look | mouse drag / pointer lock | drag anywhere on the right |
| Run (stamina) | `Shift` | `RUN` button |
| Interact / read / hide / open | `E` / `Enter` / `Space` | `USE` button |
| Drink a soda (stamina back) | `Q` | `SODA` button |
| Make a mess (noise decoy) | `F` | `MESS` button |
| Throw hall pass (decoy for Patty) | `R` | `THROW` button |
| Show hall pass (talk out of a slip) | `T` | `PASS` button |
| Mute / unmute | `M` | — |
| Pause | `Esc` / `P` | `❚❚` button in the HUD |

### Mechanics beyond running and hiding

- **Hiding.** Every corridor has a bank of lockers. Slip inside, pull the door,
  and listen to the wheels of the cart go past. He *saw* you go in, though, if
  he was looking — lockers are only as good as his line of sight.
- **Noise & messes.** `[F]` kicks over whatever is kickable. Sound travels:
  Mr. Mop will investigate the loudest thing he heard, which means a mess is a
  decoy *and* a trap. Trash cans refill your mess charge.
- **Mr. Mop** patrols, investigates, searches and chases. He is slow to notice
  you in daylight and merciless once he has. He gives up eventually — and then
  he remembers.
- **Patty the hall monitor** does not chase you; she *writes you up*. Get
  caught out of class without a hall pass and she telegraphs a tardy slip.
  Show her a pass (`[T]`) and she waves you on. Enough slips and it is
  detention — which, at Riverside, is not a room you leave.
- **Hall passes are throwable.** Toss one (`[Q]`) down a corridor and Patty
  will go collect it. She cannot resist litter.
- **The secret nook.** A bookcase in the library does not quite close right.
  Behind it: a room that is not on the floor plan, and a story that is not in
  the diary.
- **Hotspots.** Yearbook shelves, the lost & found, the janitor's closet, the
  gym scoreboard, the principal's desk — one interaction each, and each one a
  sentence of story told by the room instead of by a cutscene.
- **The bell tower.** Eight pages open the tower door. The bell rope is at the
  top. Ringing it ends the day — unchains the doors, stops Mr. Mop dead for
  three and a half seconds, and moves every clock in the building to 4:48.
  Then he comes, and he knows exactly where you are. **Run.**

### Endings

- **YOU ESCAPED** — reach the front doors after the bell.
- **THE BELL NEVER RINGS** — the secret ending: all 8 pages *and* all 5 tapes,
  and a choice at the end that the game does not announce.
- Finishing offers **New Game+**: same school, faster janitor, tighter slips,
  and the tapes remember you.

### Difficulty & saves

Three difficulties (Easy / Normal / Hard) scale speeds, stamina, slip tolerance
and period length. Progress autosaves to `localStorage` (pages, tapes,
inventory, position, time of day, opened secrets, tower state); the title
screen offers **Continue**. Settings (volumes, CRT filter, screen shake,
resolution, mouse sensitivity, dithering) persist separately.

---

## The look: low-poly retro 3D, in broad daylight

This is a **software-rendered PS1-style engine** written from scratch
(`js/render3d.js`): a fixed-point-feeling pipeline with vertex snapping,
affine (warping) texture mapping, 4×4 Bayer dithering, per-vertex shading,
distance fog and a 320×200 internal framebuffer blown up with nearest
neighbour under a CRT scanline overlay. No WebGL, no libraries.

- **Bright, not black.** The user asked for broad daylight, so there is *no
  flashlight and no darkness to hide in*. Sunlight pools through the corridor
  windows onto the lino; the horror is that everything is perfectly, flatly
  visible — including him, three corridors away, already turning toward you.
- **A real school.** 48×32 tiles of classrooms, a cafeteria with checkerboard
  lino, a gym, a library of shelves you can get lost behind, locker banks in
  every corridor, water fountains, vending machines, trophy cases, ceiling
  light tiles, wall clocks, posters and murals — plus a 12×12 bell tower that
  is a second level of its own.
- **Procedural everything.** 62+ textures (lino, carpet, brick, lockers, book
  spines, chalkboards, chain-link, glass, clock faces…) and 45 low-poly models
  (desks, chairs, lockers, shelves, the mop cart, the bell, both characters)
  are generated at boot by `js/textures.js` and `js/models.js`.
- **Performance.** Per-quad facing culling + a tight view cone keep a frame at
  ~2.5k triangles; a full game frame (simulation + render + post + HUD) costs
  about **7 ms at 320×200** in headless Node, i.e. comfortably 60 fps, and
  phones default to the chunkier 256×160 buffer for headroom.

## The sound: generative, so it never loops annoyingly

`js/audio.js` is a small WebAudio synth plus a **generative score**. Each mood
(calm / safe / tense / hunt / finale / dark) is a set of rules — tempo, scale,
density, instrumentation — and the music is *composed live* from them, one
16th-note step at a time, with random-but-seeded phrasing. Two listens are
never the same listen, so repetition cannot wear out its welcome. ~35 sound
effects (locker clang, mop squeak, whistle, bell, slip stamp, heartbeat…) are
synthesised the same way.

---

## Architecture

| File | What it is |
|---|---|
| `index.html` | markup: canvas, CRT overlay, HUD, 8 screens, touch controls |
| `css/style.css` | retro shell: scanlines, vignette, panels, touch stick |
| `js/math3d.js` | vectors, matrices, camera (`M3`) |
| `js/render3d.js` | the software rasteriser (`R3`): z-buffer, affine UV, dither, fog, sky |
| `js/textures.js` | procedural texture factory (`Tex`, 62+ textures) |
| `js/models.js` | procedural low-poly model library (`Models`, 45 meshes) |
| `js/audio.js` | WebAudio synth + generative mood score (`Sound`) |
| `js/game.js` | map, level baker, AI, mechanics, story, save system, UI, loop |

The level is *baked*: `Level.build()` walks the tile map once and emits world
quads (floors, ceilings, walls with carved window openings, doors) into
buckets per tile; props (furniture, fixtures, characters, pickups) are drawn
from the same buckets each frame, so culling is a handful of distance and
dot-product tests.

### Testing

Because there is no browser in the CI box, the game is exercised headlessly:
`js/*.js` are loaded whole into a Node `vm` context with stubbed
DOM/canvas/WebAudio/localStorage, and the harnesses drive real input through
the real update loop — strafe and look *signs* are checked against the camera's
own right/forward vectors, and framebuffer diffs prove that characters,
lockers, desks and the bell are actually *visible*, not merely submitted.

```
node tests/harness.js       # boot, input handedness, gameplay smoke, rendering, DOM wiring
node tests/render.test.js   # software rasteriser: textures, models, z-buffer, clipping, budget
node tests/audio.test.js    # generative score: no repeated phrase in any mood, sfx vocabulary
```

Current status: **40/40**, **19/19** and **57/57** assertions pass.

---

## Credits

Designed, written, drawn and synthesised by an AI agent on Arena.ai, in one
repository, with no external assets. Inspired in *atmosphere only* by the
school-horror genre; every character, name, map tile, texture and note here is
original.

*The bell never rang. You are still here. So is he.*
