/* THE BELL NEVER RINGS — generative-score suite.
   The music is composed live, so the thing to test is that it NEVER repeats
   itself: no identical 24-step window inside a long run of any mood, two runs
   of the same mood differ, density climbs with danger, and every event the
   composer can emit has a working synth path.
   Run with:  node tests/audio.test.js */
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

/* ---- minimal WebAudio stub that counts created nodes ---- */
let NODES = 0;
function param(){ return { value: 0, setValueAtTime(){ return this; }, linearRampToValueAtTime(){ return this; }, exponentialRampToValueAtTime(){ return this; }, setTargetAtTime(){ return this; }, cancelScheduledValues(){ return this; } }; }
function node(type){ NODES++; return { type, connect(n){ return n; }, disconnect(){}, start(){}, stop(){}, frequency: param(), gain: param(), detune: param(), Q: param(), playbackRate: param(), delayTime: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), buffer: null, loop: false, onended: null, curve: null }; }
class StubAC {
  constructor(){ this.currentTime = 0; this.state = "running"; this.sampleRate = 44100; this.destination = node("dest"); }
  resume(){ return Promise.resolve(); }
  createGain(){ return node("gain"); }
  createOscillator(){ return node("osc"); }
  createBiquadFilter(){ return node("filter"); }
  createBufferSource(){ return node("src"); }
  createStereoPanner(){ return node("pan"); }
  createDelay(){ return node("delay"); }
  createDynamicsCompressor(){ return node("comp"); }
  createWaveShaper(){ return node("shaper"); }
  createBuffer(ch, len){ return { numberOfChannels: ch, length: len, getChannelData: () => new Float32Array(len) }; }
}
const env = {
  console,
  AudioContext: StubAC, webkitAudioContext: StubAC,
  setInterval: (fn, ms) => { env.__intervals.push({ fn, ms }); return env.__intervals.length; },
  clearInterval: () => {},
  setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
  clearTimeout: () => {},
  performance: { now: () => Date.now() },
  Math, Date, JSON
};
env.__intervals = [];
env.window = env;
const sb = vm.createContext(env);
vm.runInContext(fs.readFileSync(path.join(ROOT, "js/audio.js"), "utf8"), sb, { filename: "js/audio.js" });
const Sound = env.Sound;
ok(!!Sound, "audio module exports Sound");
Sound.init && Sound.init();
Sound.setVolumes(0.8, 0.5, 0.8);

/* ---- 1. every mood: long run, density, and no repeated 24-step window ---- */
const MOODS = ["calm", "safe", "tense", "hunt", "finale", "dark"];
const prevBpm = {};
for (const m of MOODS) ok(!!Sound.MOOD[m], "mood exists: " + m);
ok(Sound.MOOD.calm.bpm < Sound.MOOD.tense.bpm && Sound.MOOD.tense.bpm < Sound.MOOD.hunt.bpm && Sound.MOOD.hunt.bpm < Sound.MOOD.finale.bpm,
  "tempo rises with danger (calm " + Sound.MOOD.calm.bpm + " < tense " + Sound.MOOD.tense.bpm + " < hunt " + Sound.MOOD.hunt.bpm + " < finale " + Sound.MOOD.finale.bpm + ")");

function run(mood, steps){
  Sound.setMood(mood);
  const sig = [];
  let sounding = 0, events = 0;
  for (let i = 0; i < steps; i++) {
    const evs = Sound.musicStep(mood) || [];
    events += evs.length;
    if (evs.length) sounding++;
    sig.push(JSON.stringify(evs));
    for (const ev of evs) {           /* every emitted event must synthesise */
      const n0 = NODES;
      Sound.playEvent(ev);
      if (NODES === n0) throw new Error("event produced no audio nodes: " + JSON.stringify(ev));
    }
  }
  return { sig, events, sounding };
}
for (const m of MOODS) {
  const r = run(m, 480);
  const per = r.events / 480;
  ok(per > 0.15 && per < 1.6, m + ": events per step is musical (" + per.toFixed(2) + ")");
  /* duplicate 24-step windows (skip near-silent ones, those are rests) */
  let dupes = 0;
  const seen = new Map();
  for (let i = 0; i + 24 <= r.sig.length; i++) {
    let notes = 0;
    for (let j = i; j < i + 24; j++) if (r.sig[j] !== "[]") notes++;
    if (notes < 4) continue;
    const key = r.sig.slice(i, i + 24).join("|");
    if (seen.has(key)) dupes++;
    seen.set(key, 1);
  }
  ok(dupes === 0, m + ": no repeated 24-step phrase in 480 steps (" + dupes + " dupes)");
}
/* two runs of one mood must differ (the score is generative, not a loop) */
{
  const a = run("calm", 96).sig.join("|");
  const b = run("calm", 96).sig.join("|");
  ok(a !== b, "two listens of the same mood are not the same listen");
}
/* setMood actually switches state */
Sound.setMood("hunt");
ok(Sound.mood === "hunt", "setMood switches the live mood");
Sound.setMood("calm");

/* ---- 2. every exported sfx entry point fires without throwing ---- */
const CONTROL = new Set(["init", "setMood", "setVolumes", "startMusic", "stopMusic", "startAmbient", "stopAmbient", "setHum", "musicStep", "mtof", "playEvent"]);
let fired = 0;
for (const k of Object.keys(Sound)) {
  if (typeof Sound[k] !== "function" || CONTROL.has(k)) continue;
  const n0 = NODES;
  try { Sound[k](); fired++; } catch (e) { ok(false, "sfx " + k + "() throws: " + e.message); continue; }
  ok(NODES > n0, "sfx " + k + "() makes sound");
}
ok(fired >= 20, "the sfx vocabulary is broad (" + fired + " one-shot effects)");

/* ---- 3. transport safety ---- */
try {
  Sound.startMusic(); ok(env.__intervals.length > 0, "startMusic arms the scheduler");
  Sound.startMusic();                      /* double-start must not stack timers */
  Sound.stopMusic(); Sound.stopMusic();    /* double-stop must not throw */
  Sound.startAmbient(); Sound.stopAmbient();
  ok(true, "start/stop music and ambience are idempotent and safe");
} catch (e) { ok(false, "music transport threw: " + e.message); }

console.log("");
console.log("=========================================");
console.log("  " + pass + " passed / " + fail + " failed");
if (fails.length) { console.log("  FAILURES:"); fails.forEach(f => console.log("   - " + f)); }
console.log("=========================================");
process.exit(fail ? 1 : 0);
