/* THE BELL NEVER RINGS — software-renderer suite.
   Exercises js/render3d.js + js/textures.js + js/models.js directly: texture
   generation, projection math, depth ordering, clipping, dither/fog and the
   frame budget of a full corridor scene.
   Run with:  node tests/render.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");

let pass = 0, fail = 0; const fails = [];
function ok(cond, label, extra){
  if (cond) pass++;
  else { fail++; fails.push(label + (extra ? " [" + extra + "]" : "")); console.log("FAIL " + label + (extra ? " [" + extra + "]" : "")); }
}
function mk2d(){
  const ctx = { createImageData(w, h){ return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }, putImageData(){}, drawImage(){} };
  return new Proxy(ctx, { get(t, p){ if (p in t) return t[p]; t[p] = function(){}; return t[p]; }, set(t, p, v){ t[p] = v; return true; } });
}
const env = {
  console, Math, Date, JSON,
  document: { createElement: () => ({ getContext: () => mk2d(), width: 0, height: 0 }) },
  performance: { now: () => Date.now() }
};
env.window = env;
const sb = vm.createContext(env);
for (const f of ["js/math3d.js", "js/render3d.js", "js/textures.js", "js/models.js"])
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
const M3 = env.M3, R3 = env.R3, Tex = env.Tex, Models = env.Models;

/* ---- textures ---- */
const all = Tex.all();
const names = Object.keys(all);
ok(names.length >= 60, "procedural texture library built (" + names.length + " textures)");
ok(names.every(n => all[n] && all[n].data && all[n].w > 0), "every texture has pixel data");
{
  const t0 = Date.now(); Tex.all(); const ms = Date.now() - t0;
  ok(ms < 400, "texture generation is cached and fast (" + ms + " ms warm)");
}
{
  const c = Tex.clockAt(4, 47), d = Tex.clockAt(4, 48);
  let diff = 0; for (let i = 0; i < c.data.length; i++) if (c.data[i] !== d.data[i]) diff++;
  ok(diff > 0, "clockAt draws hands that actually move between 4:47 and 4:48 (" + diff + " px)");
}
{
  const s = Tex.sign("TEST SIGN");
  ok(!!s && s.data.length > 0, "runtime sign textures generate on demand");
}

/* ---- models ---- */
{
  let count = 0;
  for (const n of ["locker", "desk", "chair", "bookcase", "vending", "mop", "bell", "fountain", "trash", "caftable", "exitDoors", "bucket"]) {
    const m = Models.get(n);
    if (m && m.n > 0 && m.pos && m.pos.length) count++;
    else ok(false, "model missing or empty: " + n);
  }
  ok(count >= 12, "low-poly model library resolves (" + count + " checked)");
  const m = Models.get("locker");
  let maxY = 0, minY = 9;
  for (let i = 1; i < m.pos.length; i += 3) { maxY = Math.max(maxY, m.pos[i]); minY = Math.min(minY, m.pos[i]); }
  ok(maxY > 1.0 && maxY < 1.6 && minY >= -0.01, "a locker is human-scaled in metres (" + minY.toFixed(2) + ".." + maxY.toFixed(2) + " m)");
}

/* ---- renderer basics ---- */
R3.init(320, 200);
for (const n of names) R3.setTexture(n, all[n]);
ok(R3.texIndex("floor_hall") >= 0 || R3.texIndex(names[0]) >= 0, "textures register into the renderer");
R3.setFog(238, 236, 222, 6, 21);
R3.sky = Tex.pack(198, 216, 236);

/* camera math: forward/right agree with the documented convention */
{
  const cam = M3.makeCamera({ x: 0, y: 1.35, z: 0 }, 0, 0);
  ok(Math.abs(cam.fz - 1) < 1e-9 && Math.abs(cam.fx) < 1e-9, "yaw 0 looks toward +Z (south)");
  ok(Math.abs(cam.rx + 1) < 1e-9 && Math.abs(cam.rz) < 1e-9, "and screen-right at yaw 0 is -X (west), as a right-handed world demands");
  const camE = M3.makeCamera({ x: 0, y: 1.35, z: 0 }, Math.PI / 2, 0);
  ok(Math.abs(camE.fx - 1) < 1e-6 && Math.abs(camE.rz - 1) < 1e-6, "yaw +90deg looks east with right = south");
  const out = {};
  M3.toView(cam, 0, 1.35, 5, out);
  ok(Math.abs(out.z - 5) < 1e-6 && Math.abs(out.x) < 1e-6, "a point dead ahead has depth 5 and no lateral offset");
}

/* a corridor scene: walls left/right, floor, ceiling, far wall */
function corridor(cam){
  R3.begin(cam);
  const W = 2, H = 3, L = 24;
  const q = (p, tex, sh) => R3.quadWorld(cam, p[0], p[1], p[2], p[3], [1, 1], sh, R3.texIndex(tex), 0);
  q([[ -W, 0, 0], [ W, 0, 0], [ W, 0, L], [-W, 0, L]], "floor_hall", 1.0);
  q([[ -W, H, L], [ W, H, L], [ W, H, 0], [-W, H, 0]], "ceil_tile", 1.0);
  q([[ -W, 0, L], [-W, 0, 0], [-W, H, 0], [-W, H, L]], "wall_hall", 0.9);
  q([[  W, 0, 0], [ W, 0, L], [ W, H, L], [ W, H, 0]], "wall_hall", 0.96);
  q([[ -W, 0, L], [ W, 0, L], [ W, H, L], [-W, H, L]], "wall_hall", 0.88);
  R3.drawMesh(Models.get("locker"), { x: -W + 0.25, y: 0, z: 6, yaw: Math.PI / 2, scale: 1 }, 1.0);
  R3.drawMesh(Models.get("desk"), { x: 1.0, y: 0, z: 9, yaw: 0, scale: 1 }, 1.0);
}
{
  const cam = M3.makeCamera({ x: 0, y: 1.35, z: 0 }, 0, 0);
  corridor(cam);
  ok(R3.stats.px > 30000, "the corridor paints the frame (" + R3.stats.px + " px)");
  ok(R3.stats.tris > 40, "geometry submitted (" + R3.stats.tris + " tris)");
  /* depth: the far wall must not overwrite the locker in front of it */
  const px = R3.fb.slice();
  R3.begin(cam);
  const W = 2, H = 3, L = 24;
  R3.quadWorld(cam, [-W, 0, L], [W, 0, L], [W, H, L], [-W, H, L], [1, 1], 0.88, R3.texIndex("wall_hall"), 0);
  const wallOnly = R3.fb.slice();
  let same = 0; for (let i = 0; i < px.length; i++) if (px[i] === wallOnly[i]) same++;
  ok(same < px.length * 0.9, "the z-buffer keeps near geometry in front of the far wall");
}
/* behind the camera is clipped, not wrapped */
{
  const cam = M3.makeCamera({ x: 0, y: 1.35, z: 0 }, 0, 0);
  R3.begin(cam);
  R3.quadWorld(cam, [-2, 0, -3], [2, 0, -3], [2, 3, -3], [-2, 3, -3], [1, 1], 1.0, R3.texIndex("wall_hall"), 0);
  ok(R3.stats.clipped >= 1 || R3.stats.drawn === 0, "quads behind the near plane are clipped");
}
/* frame budget on a busy scene */
{
  const cam = M3.makeCamera({ x: 0, y: 1.35, z: 2 }, 0, 0);
  corridor(cam);
  const t0 = Date.now(), N = 60;
  for (let i = 0; i < N; i++) corridor(M3.makeCamera({ x: 0, y: 1.35, z: 2 }, i * 0.01, 0));
  const ms = (Date.now() - t0) / N;
  ok(ms < 8, "corridor + props render inside budget (" + ms.toFixed(2) + " ms at 320x200)");
}
/* ascii dump is a stable debugging oracle */
{
  const cam = M3.makeCamera({ x: 0, y: 1.35, z: 2 }, 0, 0);
  corridor(cam);
  const a = R3.ascii(8, 10);
  ok(a.split("\n").length >= 10 && /[^ ]/.test(a), "ascii dump produces a readable luminance map");
}
/* resolution switch */
{
  R3.init(256, 160);
  ok(R3.W === 256 && R3.H === 160 && R3.fb.length === 256 * 160, "init resizes framebuffer and z-buffer");
  R3.init(320, 200);
}

console.log("");
console.log("=========================================");
console.log("  " + pass + " passed / " + fail + " failed");
if (fails.length) { console.log("  FAILURES:"); fails.forEach(f => console.log("   - " + f)); }
console.log("=========================================");
process.exit(fail ? 1 : 0);
