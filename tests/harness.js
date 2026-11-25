/* THE BELL NEVER RINGS — headless regression harness.
   Loads the six real game files, unmodified, into one vm context with a
   stubbed DOM / canvas / WebAudio / localStorage, then drives the REAL update
   loop and REAL input handlers.  Run with:  node tests/harness.js

   It exists because the browser cannot be automated in CI: every assertion
   below is about observable behaviour (positions, framebuffer pixels, saved
   JSON), never about internals that could drift silently. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");

let pass = 0, fail = 0; const fails = [];
function ok(cond, label, extra){
  if(cond){ pass++; }
  else { fail++; fails.push(label + (extra ? "  [" + extra + "]" : "")); console.log("FAIL " + label + (extra ? "  [" + extra + "]" : "")); }
}

/* ---------------------------------------------------------------- stub DOM */
function mkClassList(el){
  const set = new Set();
  return {
    add: (...c) => c.forEach(x => set.add(x)),
    remove: (...c) => c.forEach(x => set.delete(x)),
    toggle: (c, f) => { const on = f === undefined ? !set.has(c) : !!f; on ? set.add(c) : set.delete(c); return on; },
    contains: c => set.has(c),
    get value(){ return [...set].join(" "); }
  };
}
let EL_COUNT = 0;
function mkEl(tag, id){
  const el = {
    tagName: (tag || "div").toUpperCase(), id: id || "", _h: {}, _n: ++EL_COUNT,
    style: { setProperty(){}, },
    dataset: {}, children: [], value: "", checked: false, textContent: "", innerHTML: "",
    width: 0, height: 0, disabled: false, hidden: false,
    classList: null,
    addEventListener(t, f){ (el._h[t] = el._h[t] || []).push(f); },
    removeEventListener(t, f){ const a = el._h[t] || []; const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); },
    dispatch(t, ev){ (el._h[t] || []).slice().forEach(f => f(Object.assign({ target: el, preventDefault(){}, stopPropagation(){} }, ev))); },
    appendChild(c){ el.children.push(c); return c; },
    removeChild(c){ const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    getBoundingClientRect(){ return { left: 0, top: 0, right: 120, bottom: 120, width: 120, height: 120 }; },
    focus(){}, blur(){}, click(){ el.dispatch("click", {}); },
    closest(){ return null; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    requestPointerLock(){ env.document.pointerLockElement = el; el.dispatch("pointerlockchange", {}); (env.document._h["pointerlockchange"] || []).slice().forEach(f => f({})); },
    getContext(){ return mk2d(); }
  };
  el.classList = mkClassList(el);
  return el;
}
function mk2d(){
  const ctx = {
    canvas: null, imageSmoothingEnabled: true, globalAlpha: 1, globalCompositeOperation: "source-over",
    createImageData(w, h){ return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    getImageData(x, y, w, h){ return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; },
    putImageData(){}, drawImage(){}, measureText(){ return { width: 10 }; }
  };
  return new Proxy(ctx, {
    get(t, p){ if (p in t) return t[p]; if (typeof p === "string") { t[p] = function(){}; return t[p]; } return undefined; },
    set(t, p, v){ t[p] = v; return true; }
  });
}
const store = new Map();
const localStorageStub = {
  getItem: k => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: k => store.delete(k),
  clear: () => store.clear()
};

/* ------------------------------------------------------- stub WebAudio */
let AC_NODES = 0;
function acNode(type){
  AC_NODES++;
  const param = () => ({ value: 0, setValueAtTime(){ return this; }, linearRampToValueAtTime(){ return this; }, exponentialRampToValueAtTime(){ return this; }, setTargetAtTime(){ return this; }, cancelScheduledValues(){ return this; } });
  return {
    type, connect(n){ return n; }, disconnect(){}, start(){}, stop(){},
    frequency: param(), gain: param(), detune: param(), Q: param(), playbackRate: param(),
    threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(),
    delayTime: param(), offset: param(), pan: param(), reduction: param(),
    buffer: null, loop: false, onended: null, curve: null, oversample: "none"
  };
}
class StubAC {
  constructor(){ this.currentTime = 0; this.state = "running"; this.sampleRate = 44100; this.destination = acNode("dest"); this.listener = { positionX: param0(), positionY: param0(), positionZ: param0() }; }
  resume(){ this.state = "running"; return Promise.resolve(); }
  suspend(){ this.state = "suspended"; return Promise.resolve(); }
  createGain(){ return acNode("gain"); }
  createOscillator(){ return acNode("osc"); }
  createBiquadFilter(){ return acNode("filter"); }
  createBufferSource(){ return acNode("src"); }
  createStereoPanner(){ return acNode("pan"); }
  createDelay(){ return acNode("delay"); }
  createDynamicsCompressor(){ return acNode("comp"); }
  createWaveShaper(){ return acNode("shaper"); }
  createConvolver(){ return acNode("conv"); }
  createAnalyser(){ return acNode("an"); }
  createBuffer(ch, len){ return { numberOfChannels: ch, length: len, sampleRate: 44100, getChannelData: () => new Float32Array(len) }; }
}
function param0(){ return { value: 0 }; }

/* ------------------------------------------------------------- the env */
const els = new Map();
const env = {};
env.document = mkEl("document");
env.document.readyState = "complete";
env.document.body = mkEl("body");
env.document.documentElement = mkEl("html");
env.document.head = mkEl("head");
env.document.pointerLockElement = null;
env.document.getElementById = id => { if (!els.has(id)) els.set(id, mkEl("div", id)); return els.get(id); };
env.document.createElement = tag => mkEl(tag);
env.document.querySelector = sel => { const id = String(sel).replace(/^#/, ""); return env.document.getElementById(id); };
env.document.querySelectorAll = () => [];
env.document.addEventListener = (t, f) => { (env.document._h[t] = env.document._h[t] || []).push(f); };
env.document.removeEventListener = () => {};
env.document.dispatchEvent = () => true;

const rafQ = [];
env.window = env;                       /* window === global in the context */
env.innerWidth = 1280; env.innerHeight = 800; env.devicePixelRatio = 1;
env.navigator = { userAgent: "headless", maxTouchPoints: 0, platform: "node" };
env.localStorage = localStorageStub;
env.performance = { now: () => Date.now() };
env.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
env.cancelAnimationFrame = () => {};
env.matchMedia = () => ({ matches: false, addEventListener(){}, removeEventListener(){} });
env.AudioContext = StubAC; env.webkitAudioContext = StubAC;
env.setTimeout = (fn, ms) => { timers.push({ fn, at: virtNow + (ms || 0) }); return timers.length; };
env.clearTimeout = () => {};
env.setInterval = (fn, ms) => { timers.push({ fn, at: virtNow + (ms || 0), every: ms }); return timers.length; };
env.clearInterval = () => {};
env.addEventListener = (t, f) => { (env._h = env._h || {}); (env._h[t] = env._h[t] || []).push(f); };
env.removeEventListener = () => {};
env.dispatchEvent = () => true;
env.blur = () => {}; env.focus = () => {};
let virtNow = 0;
const timers = [];
env.__proto__ = null;

const sb = vm.createContext(env);
for (const f of ["js/math3d.js", "js/render3d.js", "js/textures.js", "js/models.js", "js/audio.js", "js/game.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sb, { filename: f });
}
const G_ = env.__game, R3 = env.R3, M3 = env.M3, Tex = env.Tex, Sound = env.Sound;

/* ------------------------------------------------------- loop driving */
function frame(tMs){
  virtNow = tMs;
  for (const t of timers.slice()) { /* drain due timers first */ }
  let due = timers.filter(t => t.at <= tMs);
  for (const t of due) {
    const i = timers.indexOf(t); if (i >= 0 && !t.every) timers.splice(i, 1);
    if (t.every) t.at = tMs + t.every;
    try { t.fn(); } catch (e) { console.log("timer threw:", e.message); }
  }
  const q = rafQ.splice(0, rafQ.length);
  for (const cb of q) cb(tMs);
}
function step(seconds, t0){
  const n = Math.round(seconds * 60);
  for (let i = 0; i < n; i++) frame((t0 || 1000) + i * 16.7);
}
function key(k, down){
  const handlers = (env._h && env._h[down ? "keydown" : "keyup"]) || [];
  handlers.slice().forEach(f => f({ key: k, preventDefault(){}, buttons: 0 }));
}
/* find a tile with `f` open tiles ahead and `r` open tiles to the right of a
   given facing, so movement assertions never fight a wall */
function findSpot(yaw, fNeed, rNeed){
  const fr = fwdVec(yaw), rr = rightVec(yaw);
  for (let y = 1; y < 31; y++) for (let x = 1; x < 47; x++) {
    if (!G_.isWalkable(x, y)) continue;
    let good = true;
    for (let i = 1; i <= fNeed && good; i++) good = G_.isWalkable(x + Math.round(fr.x * i), y + Math.round(fr.z * i));
    for (let i = 1; i <= rNeed && good; i++) good = G_.isWalkable(x + Math.round(rr.x * i), y + Math.round(rr.z * i));
    if (good) return [x, y];
  }
  return null;
}
function mouse(dx, dy, opts){
  const ev = Object.assign({ movementX: dx, movementY: dy, buttons: 1, clientX: 640, clientY: 400, preventDefault(){} }, opts || {});
  ((env._h && env._h["mousemove"]) || []).slice().forEach(f => f(ev));
}
function touchLook(dx, dy){
  const cv = env.document.getElementById("game");
  cv.dispatch("touchstart", { changedTouches: [{ identifier: 7, clientX: 900, clientY: 400 }] });
  cv.dispatch("touchmove", { changedTouches: [{ identifier: 7, clientX: 900 + dx, clientY: 400 + dy }] });
  cv.dispatch("touchend", { changedTouches: [{ identifier: 7, clientX: 900 + dx, clientY: 400 + dy }] });
}
function stickTo(dx, dy){
  const st = env.document.getElementById("stick");
  const r = st.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  st.dispatch("touchstart", { changedTouches: [{ identifier: 3, clientX: cx + dx, clientY: cy + dy }] });
}
function stickRelease(){
  const st = env.document.getElementById("stick");
  st.dispatch("touchend", { changedTouches: [{ identifier: 3, clientX: 0, clientY: 0 }] });
}

/* =============================================================== 1. boot */
ok(G_ && G_.bootOk === true, "boot() completed cleanly");
ok(Object.keys(Tex.all()).length >= 60, "procedural texture set built (" + Object.keys(Tex.all()).length + ")");
ok(G_.Level.quads.length > 3000, "level baked (" + G_.Level.quads.length + " quads, " + G_.Level.props.length + " props)");

/* ================================================= 2. input handedness */
/* The camera basis is the oracle: M3.makeCamera exposes right = (-cos yaw, sin yaw).
   Every "rightward" input must move/turn the player along +right. */
G_.startGame("normal", false); G_.beginPlay();
let g = G_.G; g.fade = 0; g.mop.x = 900; g.patty.x = 900;
function place(x, y, yaw){ const p = G_.G.player; p.x = x; p.y = y; p.yaw = yaw; p.pitch = 0; p.vx = 0; p.vz = 0; }
function rightVec(yaw){ return { x: -Math.cos(yaw), z: Math.sin(yaw) }; }
function fwdVec(yaw){ return { x: Math.sin(yaw), z: Math.cos(yaw) }; }

/* --- strafe keys, on a tile with room to the right */
const sp0 = findSpot(0, 1, 3);
ok(!!sp0, "found open floor for strafe tests (" + sp0 + ")");
function strafeTest(kk, yaw, spot, wantSign, t0){
  place(spot[0] * 2 + 1, spot[1] * 2 + 1, yaw);
  key(kk, true); step(0.6, t0); key(kk, false);
  const p = G_.G.player, r = rightVec(yaw);
  return (p.x - (spot[0] * 2 + 1)) * r.x + (p.y - (spot[1] * 2 + 1)) * r.z;
}
{
  const d = strafeTest("d", 0, sp0, 1, 2000);
  ok(d > 0.5, "D strafes toward screen-right (" + d.toFixed(2) + " m along right)");
  const a = strafeTest("a", 0, sp0, -1, 3000);
  ok(a < -0.5, "A strafes toward screen-left (" + a.toFixed(2) + " m along right)");
}
/* --- and it holds while facing another way (east) */
const spE = findSpot(Math.PI / 2, 1, 3);
ok(!!spE, "found open floor for the east-facing strafe test (" + spE + ")");
{
  const d = strafeTest("d", Math.PI / 2, spE, 1, 4000);
  ok(d > 0.5, "D still strafes right while facing east (" + d.toFixed(2) + ")");
}
/* --- forward/back unchanged */
const spF = findSpot(0, 3, 1);
ok(!!spF, "found open floor for the walk test (" + spF + ")");
{
  place(spF[0] * 2 + 1, spF[1] * 2 + 1, 0);
  key("w", true); step(0.6, 5000); key("w", false);
  const p = G_.G.player, f = fwdVec(0);
  const w = (p.x - (spF[0] * 2 + 1)) * f.x + (p.y - (spF[1] * 2 + 1)) * f.z;
  ok(w > 0.5, "W walks forward (" + w.toFixed(2) + " m along forward)");
  place(spF[0] * 2 + 1, spF[1] * 2 + 1, 0);
  key("s", true); step(0.6, 6000); key("s", false);
  const q = G_.G.player;
  const sv = (q.x - (spF[0] * 2 + 1)) * f.x + (q.y - (spF[1] * 2 + 1)) * f.z;
  ok(sv < -0.5, "S walks backward (" + sv.toFixed(2) + " m along forward)");
}
/* --- mouse look, pointer locked */
env.document.pointerLockElement = env.document.getElementById("game");
(env.document._h["pointerlockchange"] || []).slice().forEach(f => f({}));
place(20 * 2 + 1, 16 * 2 + 1, 0);
{
  const y0 = G_.G.player.yaw, p0 = G_.G.player.pitch;
  mouse(240, 0);
  const dy = G_.G.player.yaw - y0;
  ok(dy < -0.1, "mouse right turns the view right (yaw " + dy.toFixed(3) + ")");
  const r = rightVec(y0), f2 = fwdVec(G_.G.player.yaw);
  ok((f2.x * r.x + f2.z * r.z) > 0, "and the new facing leans toward the old right vector");
  mouse(0, 240);
  ok(G_.G.player.pitch < p0, "mouse down looks down (pitch " + G_.G.player.pitch.toFixed(3) + ")");
  mouse(0, -240);
  ok(G_.G.player.pitch > p0 - 0.001, "mouse up looks back up");
  mouse(-240, 0);
  ok(G_.G.player.yaw > y0 - 0.001, "mouse left turns the view left again");
}
/* --- mouse drag look (not locked). Losing the lock pauses the game (that is a
   feature), so unpause before testing the drag path. */
env.document.pointerLockElement = null;
(env.document._h["pointerlockchange"] || []).slice().forEach(f => f({}));
ok(G_.G.state === "paused", "losing pointer lock mid-run pauses the game");
G_.resumeGame();
ok(G_.G.state === "playing", "and resuming puts you back in the hallway");
place(sp0[0] * 2 + 1, sp0[1] * 2 + 1, 0);
{
  const y0 = G_.G.player.yaw;
  mouse(200, 0, { buttons: 1 });
  ok(G_.G.player.yaw < y0, "drag-right also turns right (yaw " + (G_.G.player.yaw - y0).toFixed(3) + ")");
}
/* --- arrow keys */
place(sp0[0] * 2 + 1, sp0[1] * 2 + 1, 0);
key("arrowright", true); step(0.4, 7000); key("arrowright", false);
ok(G_.G.player.yaw < 0, "ArrowRight turns right (yaw " + G_.G.player.yaw.toFixed(2) + ")");
place(sp0[0] * 2 + 1, sp0[1] * 2 + 1, 0);
key("arrowleft", true); step(0.4, 8000); key("arrowleft", false);
ok(G_.G.player.yaw > 0, "ArrowLeft turns left (yaw " + G_.G.player.yaw.toFixed(2) + ")");
/* --- touch look drag */
place(sp0[0] * 2 + 1, sp0[1] * 2 + 1, 0);
{
  const y0 = G_.G.player.yaw;
  touchLook(160, 0);
  ok(G_.G.player.yaw < y0, "touch drag right turns right (yaw " + (G_.G.player.yaw - y0).toFixed(3) + ")");
}
/* --- touch stick strafe */
place(sp0[0] * 2 + 1, sp0[1] * 2 + 1, 0);
stickTo(45, 0); step(0.6, 9000); stickRelease();
{
  const p = G_.G.player, r = rightVec(0);
  const dot = (p.x - (sp0[0] * 2 + 1)) * r.x + (p.y - (sp0[1] * 2 + 1)) * r.z;
  ok(dot > 0.5, "virtual stick right strafes right (" + dot.toFixed(2) + ")");
}
place(spF[0] * 2 + 1, spF[1] * 2 + 1, 0);
stickTo(0, -45); step(0.6, 9500); stickRelease();
{
  const p = G_.G.player, f = fwdVec(0);
  const dot = (p.x - (spF[0] * 2 + 1)) * f.x + (p.y - (spF[1] * 2 + 1)) * f.z;
  ok(dot > 0.5, "virtual stick up walks forward (" + dot.toFixed(2) + ")");
}

/* ============================================ 3. gameplay smoke passes */
G_.startGame("normal", false); G_.beginPlay();
g = G_.G; g.fade = 0; g.mop.x = 900; g.patty.x = 900;
/* locker hide + emerge */
{
  let lt = null;
  for (let y = 0; y < 32 && !lt; y++) for (let x = 0; x < 48; x++) {
    if (G_.tileAt(x, y) === 4 && G_.isWalkable(x, y + 1)) { lt = [x, y]; break; }
  }
  g.player.x = lt[0] * 2 + 1; g.player.y = (lt[1] + 1) * 2 + 1; g.player.yaw = Math.PI;
  const t = G_.lookTarget();
  ok(t && t.type === "locker", "a locker is interactable when faced (" + (t && t.type) + ")");
  G_.doInteract();
  ok(g.hidden === true, "E hides you inside it");
  G_.doInteract();
  ok(g.hidden === false, "E again steps you back out");
}
/* doors block sight when shut and pass it when open */
{
  const dk = Object.keys(G_.doors)[0];
  const d = G_.doors[dk];
  const [dx, dy] = dk.split(",").map(Number);
  const cx = dx * 2 + 1, cy = dy * 2 + 1;
  const nbs = [[cx, cy + 2], [cx, cy - 2], [cx + 2, cy], [cx - 2, cy]];
  const nb = nbs.find(n => G_.isWalkable(Math.floor(n[0] / 2), Math.floor(n[1] / 2)));
  ok(!!nb, "door at " + dk + " has an open side");
  d.open = false;
  const shut = G_.losBlocked(cx, cy, nb[0], nb[1]);
  d.open = true;
  const open = G_.losBlocked(cx, cy, nb[0], nb[1]);
  ok(shut === true && open === false, "a shut door blocks the corridor and an open one does not");
  d.open = false;
}
/* page pickup updates the objective */
{
  const pk = g.pickups.find(p => p.kind === "page" && !p.got);
  ok(!!pk, "the map holds diary pages to find");
  g.player.x = pk.x; g.player.y = pk.z;
  G_.collectPickup(pk);
  ok(g.pagesGot.length === 1, "collecting a diary page counts (" + g.pagesGot.length + ")");
  ok(g.state === "reading", "and the page opens as a readable sheet");
  G_.closeReader();
}
/* save / load round trip */
{
  G_.persistSave();
  const raw = env.localStorage.getItem("tbr2_save_v1");
  ok(!!raw && JSON.parse(raw).pages.length === 1, "the run autosaves with its page count");
}
/* Mr. Mop still catches you in a clear hall (AI unaffected by input signs) */
{
  G_.startGame("normal", false); G_.beginPlay();
  g = G_.G; g.fade = 0;
  g.player.x = 14 * 2 + 1; g.player.y = 16 * 2 + 1; g.player.yaw = Math.PI / 2;
  g.mop.x = 26 * 2 + 1; g.mop.y = 16 * 2 + 1; g.mop.yaw = -Math.PI / 2; g.mop.state = "chase"; g.mop.stun = 0;
  const d0 = Math.hypot(g.mop.x - g.player.x, g.mop.y - g.player.y);
  let caught = false;
  for (let i = 0; i < 60 * 20 && !caught; i++) {
    frame(20000 + i * 16.7);
    if (Math.hypot(g.mop.x - g.player.x, g.mop.y - g.player.y) < 1.3) caught = true;
    if (g.state === "over") caught = true;
  }
  ok(caught, "Mr. Mop closes " + d0.toFixed(0) + " m of clear hall and catches you");
}
/* the win path still resolves */
{
  G_.startGame("normal", false); G_.beginPlay();
  g = G_.G; g.fade = 0; g.mop.x = 900;
  g.pages = 8; g.towerUnlocked = true; g.exitUnlocked = true;
  g.player.x = 23 * 2 + 1; g.player.y = 30 * 2 + 1; g.player.yaw = 0;
  G_.tryExit();
  ok(g.state === "win", "unchained front doors end the run (" + g.state + ")");
}

/* ================================================ 4. rendering sanity */
G_.startGame("normal", false); G_.beginPlay();
g = G_.G; g.fade = 0; g.mop.x = 900; g.patty.x = 900;
G_.settings.res = "normal"; G_.resize();
function paint(x, y, yaw){
  g.player.x = x; g.player.y = y; g.player.yaw = yaw; g.player.pitch = 0;
  G_.drawWorld(1, G_.makeCam(1));
  return R3.stats.px;
}
ok(paint(20 * 2 + 1, 16 * 2 + 1, Math.PI / 2) > 12000, "a hallway frame paints the screen");
{
  g.player.x = 8 * 2 + 1; g.player.y = 15 * 2 + 1; g.player.yaw = Math.PI;
  const cam = G_.makeCam(1);
  R3.begin(cam); G_.Level.draw(cam);
  const a = R3.fb.slice();
  G_.drawWorld(1, cam);
  let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== R3.fb[i]) d++;
  ok(d > 200, "the locker row is actually visible (" + d + " px of props)");
}
/* frame budget: the full loop (step + draw + post + HUD) */
{
  g.player.x = 20 * 2 + 1; g.player.y = 16 * 2 + 1; g.player.yaw = Math.PI / 2;
  frame(40000);
  const t0 = Date.now(), N = 40;
  for (let i = 0; i < N; i++) frame(41000 + i * 16.7);
  const ms = (Date.now() - t0) / N;
  ok(ms < 16, "full game frame stays under 16 ms headless (" + ms.toFixed(2) + " ms)");
}

/* ============================================== 5. page markup wiring */
{
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const js = fs.readFileSync(path.join(ROOT, "js/game.js"), "utf8");
  const have = new Set([...html.matchAll(/id="([a-zA-Z0-9_-]+)"/g)].map(m => m[1]));
  const want = new Set();
  for (const m of js.matchAll(/\$\("([a-zA-Z0-9_-]+)"\)/g)) want.add(m[1]);
  for (const m of js.matchAll(/"screen-[a-z]+"/g)) want.add(m[0].slice(1, -1));
  const missing = [...want].filter(id => !have.has(id));
  ok(missing.length === 0, "every DOM id referenced by game.js exists in index.html (" + want.size + ")", missing.join(","));
  ok(js.indexOf('$("#') < 0, "no jQuery-style '#selector' passed to getElementById");
}

console.log("");
console.log("=========================================");
console.log("  " + pass + " passed / " + fail + " failed");
if (fails.length) { console.log("  FAILURES:"); fails.forEach(f => console.log("   - " + f)); }
console.log("=========================================");
process.exit(fail ? 1 : 0);
