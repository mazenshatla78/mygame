/* THE BELL NEVER RINGS — procedural WebAudio engine.
   Every sound is synthesized: no audio files, no samples.

   Music is GENERATIVE, not a loop. Layers run on non-coincident cycle
   lengths (pad 16 steps, chord cycle 5 chords, Markov melody, prime-numbered
   ambience timers), notes are probabilistic with rests and "wrong" notes,
   and the whole thing reacts to a mood driven by gameplay. The result never
   repeats exactly, so it cannot become an annoying loop.

   Music decisions live in a pure function (Sound.musicStep) so they can be
   verified headlessly without an audio device. */
(function(){
"use strict";

const S = {
  ctx:null, master:null, musicGain:null, sfxGain:null, revSend:null,
  masterVol:0.8, musicVol:0.55, sfxVol:0.85,
  humOsc:null, humOsc2:null, humGain:null, humTimer:null, humNote:0,
  ambTimer:null, musicTimer:null, started:false, ambStarted:false,
  heartTimer:null, mood:"calm", muted:false, ambientNodes:[]
};

function ensure(){
  if(S.ctx){ if(S.ctx.state==="suspended" && S.ctx.resume) { try{S.ctx.resume();}catch(e){} } return true; }
  const AC = (typeof window!=="undefined") && (window.AudioContext || window.webkitAudioContext);
  if(!AC) return false;
  try{ S.ctx = new AC(); }catch(e){ return false; }
  const c = S.ctx;
  S.master = c.createGain(); S.master.gain.value = S.masterVol; S.master.connect(c.destination);
  /* cheap hall: two feedback delay taps -> the empty-school reverb */
  const rev = c.createGain(); rev.gain.value = 0.9;
  const d1 = c.createDelay(1.0); d1.delayTime.value = 0.083;
  const d2 = c.createDelay(1.0); d2.delayTime.value = 0.137;
  const fb = c.createGain(); fb.gain.value = 0.32;
  const lp = c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=2600;
  const revOut = c.createGain(); revOut.gain.value = 0.5;
  rev.connect(d1); d1.connect(d2); d2.connect(lp); lp.connect(fb); fb.connect(d1);
  lp.connect(revOut); revOut.connect(S.master);
  S.revSend = rev;
  S.musicGain = c.createGain(); S.musicGain.gain.value = S.musicVol; S.musicGain.connect(S.master);
  S.sfxGain = c.createGain(); S.sfxVol = S.sfxVol; S.sfxGain.gain.value = S.sfxVol; S.sfxGain.connect(S.master);
  return true;
}
function now(){ return S.ctx ? S.ctx.currentTime : 0; }

/* ---------------- voices ---------------- */
function tone(freq, dur, type, vol, when, slideTo, dest){
  if(!ensure()) return;
  const t = now() + (when||0);
  const o = S.ctx.createOscillator(), g = S.ctx.createGain();
  o.type = type||"sine";
  o.frequency.setValueAtTime(Math.max(20,freq), t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002,vol||0.2), t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(dest||S.sfxGain);
  o.start(t); o.stop(t+dur+0.06);
}
function noise(dur, vol, filterFreq, when, type, q, dest){
  if(!ensure()) return;
  const t = now() + (when||0);
  const len = Math.max(1, Math.floor(S.ctx.sampleRate * Math.min(4,dur)));
  const buf = S.ctx.createBuffer(1, len, S.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
  const src = S.ctx.createBufferSource(); src.buffer = buf;
  const f = S.ctx.createBiquadFilter(); f.type = type||"lowpass"; f.frequency.value = filterFreq||800;
  if(q) f.Q.value = q;
  const g = S.ctx.createGain();
  g.gain.setValueAtTime(Math.max(0.0002,vol||0.2), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  src.connect(f); f.connect(g); g.connect(dest||S.sfxGain);
  src.start(t); src.stop(t+dur+0.02);
  return src;
}
/* noise with a swelling envelope (reverse-ish) */
function swell(dur, vol, freq, when, dest){
  if(!ensure()) return;
  const t = now()+(when||0);
  const len = Math.max(1, Math.floor(S.ctx.sampleRate*dur));
  const buf = S.ctx.createBuffer(1,len,S.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++){ const k=i/len; d[i]=(Math.random()*2-1)*k*k; }
  const src=S.ctx.createBufferSource(); src.buffer=buf;
  const f=S.ctx.createBiquadFilter(); f.type="bandpass"; f.frequency.value=freq||900; f.Q.value=1.4;
  const g=S.ctx.createGain(); g.gain.value=vol||0.2;
  src.connect(f); f.connect(g); g.connect(dest||S.sfxGain);
  src.start(t); src.stop(t+dur+0.02);
}
function rev(node, amount){
  if(!ensure() || !S.revSend) return;
  const g = S.ctx.createGain(); g.gain.value = amount===undefined?0.3:amount;
  node.connect(g); g.connect(S.revSend);
}
const rnd = (a,b)=>a+Math.random()*(b-a);
const pick = a=>a[(Math.random()*a.length)|0];

/* ================= GENERATIVE MUSIC =================
   Pure-ish step machine. moods: calm, tense, hunt, finale, safe, dark.
   Returns the events for one 8th-note step so it can be unit tested. */
const MOOD = {
  calm:  { bpm:64,  scale:[0,3,5,7,10], root:57, pad:0.55, mel:0.30, bass:0.00, perc:0.00, wrong:0.010, rest:0.10, wave:"triangle", oct:12 },
  safe:  { bpm:60,  scale:[0,4,7,11],   root:60, pad:0.50, mel:0.24, bass:0.00, perc:0.00, wrong:0.004, rest:0.14, wave:"sine",     oct:12 },
  tense: { bpm:84,  scale:[0,1,5,7,8],  root:52, pad:0.45, mel:0.34, bass:0.18, perc:0.05, wrong:0.030, rest:0.05, wave:"triangle", oct:12 },
  hunt:  { bpm:108, scale:[0,1,3,6,8],  root:45, pad:0.30, mel:0.16, bass:0.62, perc:0.30, wrong:0.045, rest:0.02, wave:"sawtooth", oct:12 },
  finale:{ bpm:124, scale:[0,2,3,7,8],  root:45, pad:0.35, mel:0.30, bass:0.70, perc:0.38, wrong:0.035, rest:0.01, wave:"sawtooth", oct:12 },
  dark:  { bpm:52,  scale:[0,1,4,6,10], root:40, pad:0.60, mel:0.18, bass:0.10, perc:0.02, wrong:0.070, rest:0.08, wave:"sine",     oct:12 }
};
const CHORDS = [[0,7],[0,3,7],[0,5,7],[0,4,7],[-2,5],[0,3,8],[0,7,10]];

const MState = {
  step:0, mood:"calm", restUntil:0, lastNote:-1, lastDir:1, chordIdx:0, chordStep:0,
  barCount:0, phrase:0, noteHist:[], gapCounter:0
};
function mtof(m){ return 440*Math.pow(2,(m-69)/12); }

/* Returns an array of event objects for this step (possibly empty). */
function musicStep(mood){
  const cfg = MOOD[mood] || MOOD.calm;
  MState.mood = mood;
  const ev = [];
  const st = MState.step;

  /* rests: silence is an instrument */
  if(st >= MState.restUntil && Math.random() < cfg.rest*0.14){
    MState.restUntil = st + 8 + ((Math.random()*20)|0);
  }
  const resting = st < MState.restUntil;

  /* pad / chord: every 16 steps, cycle chords in a shuffled-but-weighted order */
  if(st % 16 === 0){
    MState.chordStep++;
    if(MState.chordStep % 2 === 0 || Math.random()<0.4){
      let next;
      do { next = (Math.random()*CHORDS.length)|0; } while(next===MState.chordIdx && CHORDS.length>1);
      MState.chordIdx = next;
    }
    const ch = CHORDS[MState.chordIdx];
    ev.push({type:"pad", notes:ch.map(n=>cfg.root+n-12), dur:(60/cfg.bpm)*8, wave:cfg.wave, vol:cfg.pad});
    if(st % 64 === 0) MState.barCount++;
  }

  if(!resting){
    /* melody: Markov-ish walk over the scale with a tendency to resolve */
    if(Math.random() < cfg.mel){
      let idx;
      if(MState.lastNote < 0) idx = 0;
      else{
        idx = MState.lastNote + (Math.random()<0.5 ? 1 : -1) * (Math.random()<0.72 ? 1 : 2);
        if(idx < 0) idx = -idx;
        if(idx >= cfg.scale.length) idx = cfg.scale.length*2 - idx - 1;
        if(idx < 0) idx = 0;
      }
      /* resolve pull every 8 steps */
      if(st % 8 === 7 && Math.random()<0.6) idx = 0;
      let wrong = Math.random() < cfg.wrong;
      let midi = cfg.root + cfg.scale[idx] + (Math.random()<0.28 ? cfg.oct : 0);
      if(wrong) midi += pick([1,-1,6,11]);
      MState.lastNote = idx;
      MState.noteHist.push(midi); if(MState.noteHist.length>24) MState.noteHist.shift();
      ev.push({type:"mel", midi, dur:rnd(0.5,1.9), vol:rnd(0.10,0.20), wrong, wave:cfg.wave});
      /* occasional echo answer an octave down */
      if(Math.random()<0.14) ev.push({type:"mel", midi:midi-12, dur:rnd(0.8,2.2), vol:rnd(0.05,0.10), wrong:false, wave:"sine", delay:rnd(0.18,0.42)});
    }
    /* bass pulse */
    if(cfg.bass>0 && (st%4===0 ? Math.random()<cfg.bass : Math.random()<cfg.bass*0.25)){
      const ch = CHORDS[MState.chordIdx];
      ev.push({type:"bass", midi:cfg.root-12+pick(ch), dur:rnd(0.22,0.5), vol:rnd(0.14,0.24)});
    }
    /* percussion: soft woodblock / kick */
    if(cfg.perc>0 && Math.random()<cfg.perc){
      ev.push({type:"perc", kind:Math.random()<0.5?"block":"kick", vol:rnd(0.06,0.16)});
    }
  }

  /* rare one-shot "wrongness" events on prime-ish cycle lengths */
  MState.gapCounter++;
  if(MState.gapCounter % 37 === 0 && Math.random()<0.5) ev.push({type:"cluster", vol:rnd(0.05,0.11)});
  if(MState.gapCounter % 53 === 0 && Math.random()<0.45) ev.push({type:"swell", vol:rnd(0.05,0.12)});
  if(MState.gapCounter % 71 === 0 && Math.random()<0.4) ev.push({type:"bellfar", vol:rnd(0.04,0.09)});
  if(mood==="finale" && st%32===16) ev.push({type:"tick", vol:0.10});

  MState.step++;
  return ev;
}

function playEvent(e){
  if(!ensure()) return;
  if(e.type==="pad"){
    e.notes.forEach((m,i)=>{
      const f = mtof(m);
      const o = S.ctx.createOscillator(), o2 = S.ctx.createOscillator(), g = S.ctx.createGain(), lp = S.ctx.createBiquadFilter();
      o.type = e.wave||"triangle"; o2.type = "sine";
      o.frequency.value = f; o2.frequency.value = f*1.005;
      lp.type="lowpass"; lp.frequency.value = 900 + (i*180);
      const t = now(), d = e.dur;
      g.gain.setValueAtTime(0.0001,t);
      g.gain.linearRampToValueAtTime(e.vol*0.5, t+d*0.35);
      g.gain.linearRampToValueAtTime(0.0001, t+d);
      o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(S.musicGain);
      o.start(t); o2.start(t); o.stop(t+d+0.1); o2.stop(t+d+0.1);
    });
  } else if(e.type==="mel"){
    const t0 = now()+(e.delay||0);
    const f = mtof(e.midi);
    /* music-box: fundamental + soft 2nd/3rd partial, fast attack, long decay */
    const g = S.ctx.createGain();
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.exponentialRampToValueAtTime(e.vol, t0+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+e.dur);
    const parts = e.wrong ? [[1,"sawtooth",1],[1.06,"square",0.5],[2.02,"sine",0.35]] : [[1,e.wave||"triangle",1],[2,"sine",0.28],[3.01,"sine",0.12]];
    parts.forEach(p=>{
      const o=S.ctx.createOscillator(); o.type=p[1]; o.frequency.value=f*p[0];
      const pg=S.ctx.createGain(); pg.gain.value=p[2];
      o.connect(pg); pg.connect(g); o.start(t0); o.stop(t0+e.dur+0.05);
    });
    g.connect(S.musicGain);
    if(S.revSend){ const rg=S.ctx.createGain(); rg.gain.value=0.25; g.connect(rg); rg.connect(S.revSend); }
  } else if(e.type==="bass"){
    const f = mtof(e.midi);
    const o=S.ctx.createOscillator(), g=S.ctx.createGain(), t=now();
    o.type="sine"; o.frequency.setValueAtTime(f*1.5,t); o.frequency.exponentialRampToValueAtTime(f,t+0.08);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(e.vol,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+e.dur);
    o.connect(g); g.connect(S.musicGain); o.start(t); o.stop(t+e.dur+0.05);
  } else if(e.type==="perc"){
    if(e.kind==="kick") tone(120,0.18,"sine",e.vol,0,44,S.musicGain);
    else noise(0.07,e.vol,2200,0,"bandpass",3,S.musicGain);
  } else if(e.type==="cluster"){
    const base = mtof(48+((Math.random()*12)|0));
    [0,1,6].forEach((s,i)=> tone(base*Math.pow(2,s/12), 2.4, "sine", e.vol*(1-i*0.2), i*0.03, undefined, S.musicGain));
  } else if(e.type==="swell"){
    swell(2.6, e.vol, rnd(500,1400), 0, S.musicGain);
  } else if(e.type==="bellfar"){
    bellVoice(e.vol*0.5, 3.0, 0.7, S.musicGain);
  } else if(e.type==="tick"){
    noise(0.03,e.vol,3200,0,"bandpass",6,S.musicGain);
  }
}

function bellVoice(vol, dur, bright, dest){
  if(!ensure()) return;
  const t = now();
  const partials = [[1,1],[2.0,0.55],[2.99,0.42],[4.2,0.26],[5.4,0.18],[8.1,0.1]];
  const f0 = 196*(bright||1);
  partials.forEach(p=>{
    const o=S.ctx.createOscillator(), g=S.ctx.createGain();
    o.type="sine"; o.frequency.value=f0*p[0]*(1+rnd(-0.002,0.002));
    const d = dur*(1/(1+p[0]*0.22));
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(vol*p[1],t+0.006);
    g.gain.exponentialRampToValueAtTime(0.0001,t+d);
    o.connect(g); g.connect(dest||S.sfxGain); o.start(t); o.stop(t+d+0.1);
  });
  noise(0.09, vol*0.5, 4200, 0, "highpass", 1, dest||S.sfxGain);
}

/* ================= ambience: broad daylight, empty school ================= */
function ambienceOneShot(){
  if(!ensure()) return;
  const r = Math.random();
  if(r<0.20){
    /* distant children laughing — the school is empty. it shouldn't be. */
    const n = 3+((Math.random()*4)|0), base = rnd(420,620);
    for(let i=0;i<n;i++){
      tone(base*rnd(0.9,1.25), 0.11, "sine", 0.045, i*0.13+rnd(0,0.03), base*rnd(1.1,1.5));
      noise(0.08, 0.02, 1800, i*0.13, "bandpass", 2);
    }
  } else if(r<0.36){
    /* far-away locker slam */
    noise(0.16, 0.10, 420, 0, "lowpass"); tone(74, 0.22, "sine", 0.08, 0, 48);
  } else if(r<0.50){
    /* mop squeak in another wing */
    tone(rnd(700,1100), 0.5, "sine", 0.03, 0, rnd(300,500));
    noise(0.4, 0.02, 2600, 0.05, "bandpass", 4);
  } else if(r<0.62){
    /* PA chime + muffled announcement */
    [880,1174].forEach((f,i)=> tone(f, 0.5, "sine", 0.05, i*0.28));
    noise(1.4, 0.028, 700, 0.7, "bandpass", 1.2);
  } else if(r<0.76){
    /* birds outside the windows */
    const n=2+((Math.random()*3)|0);
    for(let i=0;i<n;i++){ const b=rnd(1800,3000); tone(b,0.07,"sine",0.022,i*rnd(0.12,0.26),b*rnd(1.2,1.6)); }
  } else if(r<0.88){
    /* fluorescent flicker buzz */
    noise(0.3, 0.02, 3800, 0, "bandpass", 8); tone(120,0.28,"sawtooth",0.008);
  } else {
    /* the building settles */
    tone(rnd(50,90), 0.9, "sine", 0.06, 0, rnd(30,50));
  }
}

/* ================= public API ================= */
const api = {
  init(){ ensure(); },
  get ctx(){ return S.ctx; },
  get mood(){ return S.mood; },
  musicStep, MState, mtof, MOOD, playEvent,
  setMood(m){ S.mood = m; },
  setVolumes(m,mu,s){
    S.masterVol=m; S.musicVol=mu; S.sfxVol=s;
    if(S.ctx){
      if(S.master) S.master.gain.value = m;
      if(S.musicGain) S.musicGain.gain.value = mu;
      if(S.sfxGain) S.sfxGain.gain.value = s;
    }
  },
  startMusic(){
    if(!ensure() || S.musicTimer) return;
    MState.step=0; MState.restUntil=0; MState.lastNote=-1; MState.gapCounter=0; MState.chordIdx=0; MState.chordStep=0;
    const tickMs = ()=> (60000/(MOOD[S.mood]?MOOD[S.mood].bpm:64))/2;
    let acc = 0, last = Date.now();
    S.musicTimer = setInterval(()=>{
      const t = Date.now(); acc += t-last; last = t;
      const step = tickMs();
      let guard = 0;
      while(acc >= step && guard++ < 4){
        acc -= step;
        const evs = musicStep(S.mood);
        for(let i=0;i<evs.length;i++) playEvent(evs[i]);
      }
    }, 40);
  },
  stopMusic(){ if(S.musicTimer){ clearInterval(S.musicTimer); S.musicTimer=null; } },
  startAmbient(){
    if(!ensure() || S.ambStarted) return;
    S.ambStarted = true;
    /* room tone: HVAC + fluorescent hum, always there in daylight */
    const len = Math.floor(S.ctx.sampleRate*2);
    const buf = S.ctx.createBuffer(1,len,S.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let lastv=0;
    for(let i=0;i<len;i++){ const w=Math.random()*2-1; lastv=(lastv*0.97)+(w*0.03); d[i]=lastv*3.2; }
    const src=S.ctx.createBufferSource(); src.buffer=buf; src.loop=true;
    const f=S.ctx.createBiquadFilter(); f.type="lowpass"; f.frequency.value=420;
    const g=S.ctx.createGain(); g.gain.value=0.16;
    src.connect(f); f.connect(g); g.connect(S.master); src.start();
    S.ambientNodes.push(src);
    /* fluorescent buzz */
    const o=S.ctx.createOscillator(), o2=S.ctx.createOscillator(), bg=S.ctx.createGain();
    o.type="sawtooth"; o.frequency.value=120; o2.type="sine"; o2.frequency.value=240;
    bg.gain.value=0.006;
    const bp=S.ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=1400; bp.Q.value=2;
    o.connect(bp); o2.connect(bp); bp.connect(bg); bg.connect(S.master); o.start(); o2.start();
    S.ambTimer = setInterval(()=>{ if(Math.random()<0.55) ambienceOneShot(); }, 7000);
    /* second, prime-offset timer so ambience never lands on a fixed grid */
    setInterval(()=>{ if(Math.random()<0.30) ambienceOneShot(); }, 11000);
  },
  stopAmbient(){ if(S.ambTimer){ clearInterval(S.ambTimer); S.ambTimer=null; } S.ambStarted=false; },
  ambientNodes:[],

  /* ---- Mr. Mop's hum: a wordless melody that follows him ---- */
  setHum(level){
    if(!ensure()) return;
    if(level<=0.001){
      if(S.humGain) S.humGain.gain.setTargetAtTime(0.0001, now(), 0.2);
      if(S.humTimer){ clearInterval(S.humTimer); S.humTimer=null; }
      return;
    }
    if(!S.humOsc){
      S.humOsc=S.ctx.createOscillator(); S.humOsc2=S.ctx.createOscillator();
      S.humGain=S.ctx.createGain(); S.humGain.gain.value=0.0001;
      const lp=S.ctx.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=780;
      S.humOsc.type="triangle"; S.humOsc2.type="sine";
      S.humOsc.frequency.value=146; S.humOsc2.frequency.value=219;
      S.humOsc.connect(lp); S.humOsc2.connect(lp); lp.connect(S.humGain); S.humGain.connect(S.master);
      S.humOsc.start(); S.humOsc2.start();
      const notes=[146,164,174,196,146,131,174,196,220,196,174,164];
      let i=0;
      S.humTimer=setInterval(()=>{
        if(!S.humOsc) return;
        const n = notes[i++%notes.length]*(Math.random()<0.12?1.06:1);
        S.humOsc.frequency.setTargetAtTime(n, now(), 0.18);
        S.humOsc2.frequency.setTargetAtTime(n*1.5*(Math.random()<0.2?0.94:1), now(), 0.22);
      }, 620);
    }
    S.humGain.gain.setTargetAtTime(Math.min(0.22, level*0.22), now(), 0.15);
  },

  /* ---- SFX ---- */
  click(){ tone(880,0.04,"square",0.06); tone(1320,0.03,"square",0.03,0.01); },
  hover(){ tone(1200,0.02,"sine",0.02); },
  footstep(run){
    const v = run?0.16:0.085;
    noise(run?0.09:0.07, v, run?1500:1000, 0, "lowpass");
    tone(run?92:74, 0.06, "sine", v*0.7, 0, run?58:46);
    if(!run && Math.random()<0.5) noise(0.05, 0.02, 3000, 0.02, "highpass");
  },
  door(open){
    noise(0.3,0.10,open?900:700,0,"bandpass",2);
    tone(open?180:150,0.22,"sine",0.09,0,open?120:90);
    noise(0.1,0.12,2400,0.18,"highpass");
  },
  locker(open){
    noise(0.08,0.16,2600,0,"bandpass",3);
    tone(open?320:240,0.14,"square",0.05,0.02,open?180:140);
    noise(0.22,0.10,500,0.1,"lowpass");
  },
  lockerSlam(){ noise(0.3,0.24,700,0,"lowpass"); tone(64,0.34,"sine",0.16,0,40); },
  page(){
    noise(0.24,0.11,3200,0,"bandpass",1.2);
    noise(0.18,0.07,2200,0.06,"bandpass",1.6);
    tone(1046,0.5,"sine",0.05,0.1); tone(1568,0.6,"sine",0.03,0.16);
  },
  tape(){
    noise(0.1,0.12,1400,0,"bandpass",3);
    tone(220,0.3,"sawtooth",0.04,0.04,440);
    noise(0.5,0.04,900,0.2,"lowpass");
  },
  battery(){ tone(660,0.07,"square",0.09); tone(990,0.1,"square",0.07,0.06); tone(1320,0.14,"sine",0.06,0.12); },
  soda(){
    noise(0.07,0.16,3600,0,"bandpass",4);          /* tab crack */
    for(let i=0;i<3;i++) tone(rnd(180,260),0.09,"sine",0.07,i*0.16,rnd(120,160));
    noise(0.3,0.05,1200,0.1,"bandpass",1);
  },
  pickup(){ tone(784,0.09,"triangle",0.09); tone(1176,0.14,"triangle",0.06,0.05); },
  throwPass(){ noise(0.28,0.07,2600,0,"bandpass",1.4); tone(520,0.2,"sine",0.03,0,rnd(900,1200)); },
  spill(){
    noise(0.5,0.22,1400,0,"lowpass");
    for(let i=0;i<6;i++) noise(0.09,0.09,rnd(1200,3600),i*0.05+rnd(0,0.05),"bandpass",3);
    tone(110,0.3,"sine",0.08,0.05,70);
  },
  whistle(){
    /* Patty's two-tone hall-monitor whistle */
    if(!ensure()) return;
    const t=now();
    [0,0.22].forEach((w,i)=>{
      const o=S.ctx.createOscillator(), g=S.ctx.createGain();
      o.type="sine"; o.frequency.setValueAtTime(i?2350:1980,t+w);
      o.frequency.linearRampToValueAtTime(i?2600:2150,t+w+0.16);
      g.gain.setValueAtTime(0.0001,t+w); g.gain.exponentialRampToValueAtTime(0.14,t+w+0.02);
      g.gain.exponentialRampToValueAtTime(0.0001,t+w+0.2);
      const bp=S.ctx.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=2400; bp.Q.value=6;
      o.connect(bp); bp.connect(g); g.connect(S.sfxGain);
      if(S.revSend){ const rg=S.ctx.createGain(); rg.gain.value=0.4; g.connect(rg); rg.connect(S.revSend); }
      o.start(t+w); o.stop(t+w+0.24);
    });
    noise(0.3,0.05,5200,0,"highpass");
  },
  slip(){
    noise(0.3,0.07,2800,0,"bandpass",2);
    for(let i=0;i<4;i++) noise(0.05,0.05,3200,i*0.07,"bandpass",5);
    tone(1200,0.05,"square",0.03,0.3);
  },
  bell(){
    bellVoice(0.3, 6.5, 1.0);
    tone(98,2.2,"sine",0.1,0,92);
  },
  bellSmall(){ bellVoice(0.14, 2.4, 2.0); },
  unlock(){
    for(let i=0;i<7;i++) noise(0.06,0.07,rnd(2000,5200),i*0.045,"bandpass",4);  /* chain */
    tone(140,0.3,"square",0.1,0.3,90); noise(0.3,0.14,700,0.32,"lowpass");
  },
  sting(){
    /* he sees you: dissonant cluster + noise hit, brighter in daylight */
    [0,1,6,7].forEach((s,i)=> tone(330*Math.pow(2,s/12), 0.9, "sawtooth", 0.09-i*0.015, i*0.012));
    noise(0.34,0.2,2200,0,"bandpass",1.2);
    tone(82,0.7,"sine",0.13,0,58);
  },
  scare(){
    noise(0.7,0.3,1600,0,"lowpass");
    [0,1,11,13].forEach((s,i)=> tone(180*Math.pow(2,s/12),1.4,"sawtooth",0.11,i*0.02,90));
    tone(60,1.6,"sine",0.2,0,34);
    swell(1.2,0.14,1400,0.1);
  },
  lose(){
    [0,-2,-5,-9,-14].forEach((s,i)=> tone(mtof(57+s), 1.1, "triangle", 0.11-i*0.015, i*0.22));
    noise(1.4,0.06,500,0.4,"lowpass");
    tone(48,2.0,"sine",0.1,0.8,36);
  },
  win(){
    [0,4,7,11,12,16,19].forEach((s,i)=> tone(mtof(60+s), 0.9, "triangle", 0.11, i*0.13));
    bellVoice(0.22, 5.0, 1.5);
    [0,7,12].forEach((s,i)=> tone(mtof(72+s), 2.2, "sine", 0.06, 1.0+i*0.06));
  },
  secretWin(){
    [0,3,7,10,12,15].forEach((s,i)=> tone(mtof(57+s), 1.6, "sine", 0.09, i*0.18));
    bellVoice(0.26, 8.0, 1.0);
    swell(3.0,0.10,700,0.6);
    noise(2.0,0.03,400,1.6,"lowpass");
  },
  whisper(){
    swell(1.1,0.07,rnd(900,1600));
    noise(0.8,0.035,2400,0.1,"bandpass",3);
  },
  staticBurst(){ noise(0.5,0.14,3000,0,"bandpass",0.8); noise(0.3,0.1,900,0.1,"lowpass"); },
  error(){ tone(150,0.16,"square",0.09); tone(112,0.2,"square",0.07,0.09); },
  glitch(){ noise(0.12,0.1,5200,0,"bandpass",9); tone(rnd(900,2400),0.08,"square",0.05); },
  heartbeat(i){
    const v = 0.05+i*0.13;
    tone(58,0.13,"sine",v,0,38);
    tone(52,0.16,"sine",v*0.8,0.17,34);
  },
  clockTick(){ noise(0.025,0.05,4200,0,"bandpass",8); tone(2200,0.02,"square",0.02); },
  chime(){ [880,1174.7].forEach((f,i)=> tone(f,0.9,"sine",0.09,i*0.3)); },
  bookcase(){ noise(0.7,0.14,600,0,"lowpass"); tone(70,0.6,"sine",0.1,0.1,52); for(let i=0;i<4;i++) noise(0.08,0.06,rnd(900,2000),i*0.14,"bandpass",2); },
  footstepFar(){ noise(0.1,0.04,700,0,"lowpass"); tone(70,0.08,"sine",0.03,0,48); }
};

window.Sound = api;
})();
