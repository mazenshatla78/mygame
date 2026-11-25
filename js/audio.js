/* THE BELL NEVER RINGS — procedural WebAudio sound engine.
   Every sound is synthesized. No audio files. */
(function(){
"use strict";
const S = {
  ctx:null, master:null, musicGain:null, sfxGain:null,
  masterVol:0.8, musicVol:0.6, sfxVol:0.8,
  humOsc:null, humGain:null, humTimer:null,
  musicTimer:null, ambientNodes:[],
  heartTimer:null, started:false
};

function ensure(){
  if(S.ctx) { if(S.ctx.state==="suspended") S.ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if(!AC) return false;
  S.ctx = new AC();
  S.master = S.ctx.createGain(); S.master.gain.value = S.masterVol;
  S.master.connect(S.ctx.destination);
  S.musicGain = S.ctx.createGain(); S.musicGain.gain.value = S.musicVol;
  S.musicGain.connect(S.master);
  S.sfxGain = S.ctx.createGain(); S.sfxGain.gain.value = S.sfxVol;
  S.sfxGain.connect(S.master);
  return true;
}

function tone(freq, dur, type, vol, when, slideTo, dest){
  if(!ensure()) return;
  const t = S.ctx.currentTime + (when||0);
  const o = S.ctx.createOscillator(), g = S.ctx.createGain();
  o.type = type||"sine"; o.frequency.setValueAtTime(freq, t);
  if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), t+dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol||0.2, t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(dest||S.sfxGain);
  o.start(t); o.stop(t+dur+0.05);
}

function noise(dur, vol, filterFreq, when, type){
  if(!ensure()) return;
  const t = S.ctx.currentTime + (when||0);
  const len = Math.max(1, Math.floor(S.ctx.sampleRate * dur));
  const buf = S.ctx.createBuffer(1, len, S.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i] = Math.random()*2-1;
  const src = S.ctx.createBufferSource(); src.buffer = buf;
  const f = S.ctx.createBiquadFilter(); f.type = type||"lowpass"; f.frequency.value = filterFreq||800;
  const g = S.ctx.createGain();
  g.gain.setValueAtTime(vol||0.2, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  src.connect(f); f.connect(g); g.connect(S.sfxGain);
  src.start(t); src.stop(t+dur);
}

const api = {
  init(){ ensure(); },
  setVolumes(m, mu, s){
    S.masterVol=m; S.musicVol=mu; S.sfxVol=s;
    if(S.ctx){
      S.master.gain.value=m; S.musicGain.gain.value=mu; S.sfxGain.gain.value=s;
    }
  },
  footstep(run){ noise(0.07, run?0.16:0.08, run?500:350); },
  pickup(){ tone(880,0.12,"sine",0.18); tone(1318,0.2,"sine",0.15,0.07); },
  page(){ tone(523,0.15,"triangle",0.2); tone(659,0.15,"triangle",0.2,0.09); tone(784,0.3,"triangle",0.2,0.18); },
  tape(){ tone(196,0.1,"square",0.12); noise(0.25,0.1,2000,0.05,"highpass"); tone(392,0.25,"square",0.1,0.15); },
  soda(){ noise(0.18,0.15,1200,0,"bandpass"); tone(300,0.25,"sine",0.15,0.1,600); },
  battery(){ tone(1200,0.08,"square",0.12); tone(1200,0.08,"square",0.12,0.12); },
  door(open){ noise(0.35,0.18,400); tone(open?180:140,0.3,"sawtooth",0.06,0,open?90:70); },
  locker(){ noise(0.12,0.3,900); tone(220,0.15,"square",0.15,0,110); },
  bell(){ tone(1568,1.6,"sine",0.25); tone(1568,1.6,"triangle",0.12); tone(3136,0.8,"sine",0.06); },
  sting(){ tone(110,0.7,"sawtooth",0.3,0,55); tone(116,0.7,"sawtooth",0.3,0,58); noise(0.5,0.25,3000,0,"highpass"); },
  whisper(){ noise(1.4,0.12,1800,0,"bandpass"); noise(1.2,0.08,900,0.3,"bandpass"); },
  staticBurst(){ noise(0.6,0.2,4000,0,"highpass"); },
  throwPass(){ noise(0.2,0.12,600,0, "bandpass"); },
  heartbeat(intensity){
    // intensity 0..1 — called on a timer by the game loop
    if(!ensure()) return;
    const v = 0.1 + intensity*0.35;
    tone(55,0.14,"sine",v); tone(50,0.12,"sine",v*0.8,0.18);
  },
  unlock(){ tone(659,0.12,"square",0.15); tone(880,0.2,"square",0.15,0.1); },
  win(){ [523,659,784,1046].forEach((f,i)=>tone(f,0.4,"triangle",0.2,i*0.16)); },
  lose(){ [392,330,262,196].forEach((f,i)=>tone(f,0.5,"triangle",0.2,i*0.2)); },
  click(){ tone(700,0.05,"square",0.08); },
  error(){ tone(160,0.2,"square",0.15); },

  /* --- Janitor hum: a slow, wrong music-box tune, gain follows distance --- */
  setHum(level){ // level 0..1 (0 = silent)
    if(!ensure()) return;
    if(level<=0.01){ if(S.humOsc){ try{S.humOsc.stop();}catch(e){} S.humOsc=null; } return; }
    if(!S.humOsc){
      const o = S.ctx.createOscillator(); o.type="sine";
      const g = S.ctx.createGain(); g.gain.value=0;
      const lfo = S.ctx.createOscillator(); lfo.frequency.value=0.4;
      const lfoG = S.ctx.createGain(); lfoG.gain.value=0.02;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      o.connect(g); g.connect(S.sfxGain);
      o.start(); lfo.start();
      S.humOsc=o; S.humGain=g; S.humLfo=lfo;
      const notes=[220,262,330,262,294,262,220,196];
      let i=0;
      S.humTimer=setInterval(()=>{ if(S.humOsc) S.humOsc.frequency.setTargetAtTime(notes[i++%notes.length], S.ctx.currentTime, 0.15); }, 520);
    }
    S.humGain.gain.setTargetAtTime(0.02 + level*0.14, S.ctx.currentTime, 0.2);
  },

  /* --- Ambient drone + occasional distant sounds --- */
  startAmbient(){
    if(!ensure() || S.started) return; S.started=true;
    const mk=(f,v)=>{ const o=S.ctx.createOscillator(); o.type="sine"; o.frequency.value=f;
      const g=S.ctx.createGain(); g.gain.value=v; o.connect(g); g.connect(S.musicGain); o.start(); S.ambientNodes.push(o); };
    mk(55,0.05); mk(58.3,0.035); mk(110,0.02);
    setInterval(()=>{ if(Math.random()<0.3) noise(0.4,0.05,300); }, 9000);
  },

  /* --- Music-box theme: original, slow and sad --- */
  startMusic(){
    if(!ensure() || S.musicTimer) return;
    const melody=[659,784,880,784,659,587,523,587, 659,784,880,1046,880,784,659,0,
                  587,659,784,659,587,523,494,523, 587,0,0,0, 523,0,0,0];
    let i=0;
    const play=()=>{
      const f=melody[i++%melody.length];
      if(f){ tone(f,1.1,"sine",0.10,0,0,S.musicGain); tone(f*2,0.5,"sine",0.03,0,0,S.musicGain); }
    };
    play();
    S.musicTimer=setInterval(play, 620);
  },
  stopMusic(){ if(S.musicTimer){ clearInterval(S.musicTimer); S.musicTimer=null; } }
};
window.Sound = api;
})();
