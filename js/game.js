/* THE BELL NEVER RINGS — main game.
   Top-down indie horror. Collect 8 diary pages, escape the school,
   avoid Mr. Mop. All art/sound procedural. */
(function(){
"use strict";

/* ================= utils ================= */
const $ = id => document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(x1,y1,x2,y2)=>Math.hypot(x2-x1,y2-y1);
const rand=(a,b)=>a+Math.random()*(b-a);
const randi=(a,b)=>Math.floor(rand(a,b+1));
const choice=arr=>arr[Math.floor(Math.random()*arr.length)];
const T=32, MW=48, MH=32; // tile size, map w/h

/* ================= story ================= */
const PAGES=[
 {head:"DIARY — PAGE 1 OF 8", body:"Dear Diary,\n\nMrs. Alvarez kept me after school again. She said my handwriting looks like \"a raccoon walked through ink.\" Fair.\n\nI have to finish this diary homework before I can go home. Eight pages. Easy.\n\n— Milo, 4:47 PM"},
 {head:"DIARY — PAGE 2 OF 8", body:"The halls are quiet. Too quiet. Like the school is holding its breath.\n\nI heard mopping in the east corridor. Mr. Mop is still here. He hums when he works. He hums the same song. Over. And over. And over."},
 {head:"DIARY — PAGE 3 OF 8", body:"The lights flickered just now. When they came back, the clock said 4:47 again.\n\nIt said 4:47 an hour ago.\n\nI don't think time is working right in here. I don't think the school wants me to notice."},
 {head:"DIARY — PAGE 4 OF 8", body:"I found a note in the library. It wasn't mine.\n\n\"IF YOU HEAR HIM HUM, DON'T RUN. HE LIKES RUNNING. WALK. HIDE IN THE LOCKERS. HE CAN'T SEE YOU IF YOU'RE STILL.\"\n\nWho wrote that? The handwriting looks like mine."},
 {head:"DIARY — PAGE 5 OF 8", body:"I saw him through the classroom window. He's tall. Taller than the door. He was standing very still, facing the wall.\n\nThen he turned around. He was facing ME.\n\nI don't think he has eyes. I think he has headlights."},
 {head:"DIARY — PAGE 6 OF 8", body:"The radio in the principal's office was playing static. Then it played a song. A music box song. My mom used to play it when I was little.\n\nThe school doesn't have a radio. The principal's office has been locked since 1997.\n\nWait. What year is it?"},
 {head:"DIARY — PAGE 7 OF 8", body:"I think I understand now. The school didn't close. It just... stopped letting people leave.\n\nMr. Mop was the janitor here. He stayed to clean up after everyone left. He's still cleaning. He's still waiting for the bell.\n\nThe bell never rings."},
 {head:"DIARY — PAGE 8 OF 8", body:"If you're reading this, you found my pages. That means you're me. Or you're stuck like me.\n\nDon't let him catch you. Get to the front doors. And Milo —\n\nWhatever you do. Don't stay after school.\n\n— Milo"}
];
const TAPES=[
 {head:"FOUND TAPE — \"SAFETY FIRST\"", body:"[VHS — recorded 1997]\n\nA man in a janitor's uniform stands in an empty hallway, facing the camera. He smiles for a long time.\n\n\"Welcome to Riverside Elementary,\" he says. \"Please remember: no running in the halls.\"\n\nHe keeps smiling. The tape runs out. He's still smiling."},
 {head:"FOUND TAPE — \"THE BELL\"", body:"[VHS — recorded 1997]\n\nA classroom. 30 children. They all turn to look at the camera at the same time.\n\nThe teacher's voice: \"Now, class — who can tell me what time it is?\"\n\nEvery child answers, in unison: \"Four forty-seven.\"\n\nThe tape cuts to black."},
 {head:"FOUND TAPE — \"NEWS REPORT\"", body:"[VHS — recorded 1997]\n\nA news anchor, very serious: \"...the school remains closed pending investigation. The janitor, Mr. [REDACTED], has not been seen since Tuesday. Police say—\"\n\nThe tape warps. The anchor's face stretches. She says, very calmly:\n\n\"He's in the walls now.\"\n\nStatic."},
 {head:"FOUND TAPE — \"BIRTHDAY PARTY\"", body:"[VHS — recorded 1997]\n\nA birthday party in the cafeteria. Balloons. Cake. A boy blows out the candles.\n\nIn the background, through the kitchen window, a tall figure stands perfectly still.\n\nThe boy makes a wish. He whispers it. The camera zooms in on his lips:\n\n\"I wish school would never end.\"\n\nThe figure in the window raises one hand. And waves."},
 {head:"FOUND TAPE — \"LAST TAPE\"", body:"[VHS — recorded 1997]\n\nAn empty classroom. A desk. On the desk, a diary.\n\nA child's hand reaches in and takes it. The camera follows the diary as it's carried down the hall.\n\nThe camera operator is breathing hard. Behind them, faintly, a mop squeaks. A man begins to hum.\n\nThe operator whispers: \"He's behind me, isn't he.\"\n\nThe tape ends. So does the breathing."}
];
const LORE={
 clock1:"The clock is stuck at 4:47. It has always been stuck at 4:47.",
 clock2:"The clock is stuck at 4:47. It has always been stuck at 4:47.",
 clock3:"The clock is stuck at 4:47. It has always been stuck at 4:47.",
 clock4:"The clock says 4:48. It moved. Did it?",
 vending1:"You got a soda! (+1) The machine hums happily.",
 vending2:"Another soda. The machine is being generous tonight.",
 vending3:"The machine is empty. It was never full. You can tell.",
 radio:"Static... then a music box melody. Then static. The radio is unplugged.",
 mirror:"You look in the mirror. Behind you, someone is standing in the doorway.\n\nYou turn around. Nobody is there.",
 extinguisher:"\"DO NOT PULL.\" The sign is written in crayon. In a child's handwriting.",
 blackboard:"2 + 2 = ???\n\nUnderneath, in smaller letters: \"he hums when he's close\"",
 trash:"You found a battery in the trash. Gross. (+1 battery)",
 office:"A note on the principal's desk: \"School closed until further notice.\" The date is tomorrow.",
 plant:"There's a note tucked in the plant: \"He can't see you if you're still.\"",
 nook:"A child's hiding place. Crayon drawings on the wall. One of them is of a tall man with a mop. In every drawing, he is facing the viewer."
};

/* ================= map ================= */
// tiles: 0 floor, 1 wall, 2 door, 3 exit, 4 locker, 5 desk, 6 chair,
// 7 blackboard, 8 bookcase, 9 plant, 10 vending, 11 toilet, 12 sink,
// 13 mirror, 14 trash, 15 puddle(walkable), 16 radio, 17 gymmat,
// 18 caftable, 19 extinguisher, 20 clock, 21 secret-door(bookcase)
const SOLID=new Set([1,4,5,6,7,8,9,10,11,12,13,14,16,17,18,19,20,21]);
const WALKABLE=new Set([0,15]);
let grid=[], doors={}, lockers=[], props=[];

function buildMap(){
  grid=[]; doors={}; lockers=[]; props=[];
  for(let y=0;y<MH;y++){ grid.push(new Array(MW).fill(0)); }
  const set=(x,y,t)=>{ if(x>=0&&x<MW&&y>=0&&y<MH) grid[y][x]=t; };
  const hwall=(x1,x2,y,doorXs)=>{ for(let x=x1;x<=x2;x++){ if(doorXs&&doorXs.includes(x)) set(x,y,2); else set(x,y,1); } };
  const vwall=(y1,y2,x,doorYs)=>{ for(let y=y1;y<=y2;y++){ if(doorYs&&doorYs.includes(y)) set(x,y,2); else set(x,y,1); } };
  // outer walls
  for(let x=0;x<MW;x++){ set(x,0,1); set(x,MH-1,1); }
  for(let y=0;y<MH;y++){ set(0,y,1); set(MW-1,y,1); }
  // north rooms (rows 1-7)
  vwall(1,7,11,[4]); vwall(1,7,22,[4]); vwall(1,7,25,[4]); vwall(1,7,36,[4]);
  // wall row 8 (corridor cols 23-24 open)
  hwall(1,22,8,[4,16]); hwall(25,46,8,[30,42]);
  // middle rooms (rows 9-14)
  vwall(9,14,11,[11]); vwall(9,14,22,[11]); vwall(9,14,25,[11]);
  // wall row 17 (corridor rows 15-16)
  hwall(1,46,17,[5,13,24,30,40]);
  // south rooms (rows 18-30)
  vwall(18,30,17,[24]); vwall(18,30,30,[24]);
  // exit doors bottom (bathrooms south wall)
  set(23,31,3); set(24,31,3);
  // doors registry
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++) if(grid[y][x]===2) doors[x+","+y]={open:false,x,y};
  // ---- props ----
  const put=(x,y,t)=>{ set(x,y,t); props.push({x,y,t}); };
  // classrooms: desks + blackboards + clocks
  const classroom=(x1,x2,y1,y2,bbx)=>{
    put(bbx,y1,7);
    for(let r=0;r<2;r++) for(let c=0;c<3;c++){
      const dx=x1+1+c*3, dy=y1+2+r*2;
      if(dx<x2&&dy<y2){ put(dx,dy,5); put(dx,dy+1,6); }
    }
    put(x1+1,y1+1,20);
  };
  classroom(1,10,1,7,5); classroom(12,21,1,7,16); classroom(26,35,1,7,30); classroom(37,46,1,7,41);
  // library bookcases
  for(let x=1;x<=10;x++){ if(x!==4) put(x,9,8); }
  put(1,11,8); put(3,11,8); put(2,11,21); // hidden nook (secret door at 2,11)
  put(1,10,8); put(3,10,8);
  put(6,13,8); put(7,13,8); put(8,13,8); put(9,13,8);
  put(6,14,8); put(7,14,8);
  // office
  put(16,10,16); put(18,11,5); put(20,10,9); put(13,10,20);
  // cafeteria tables + vending
  [[28,10],[32,10],[36,10],[40,10],[28,13],[32,13],[36,13],[40,13]].forEach(p=>put(p[0],p[1],18));
  put(44,9,10); put(45,9,10);
  // gym mats
  [[3,20],[6,20],[9,20],[3,23],[6,23],[9,23],[12,26],[13,26]].forEach(p=>put(p[0],p[1],17));
  put(14,19,19);
  // bathrooms
  [[19,19],[21,19],[19,22],[21,22]].forEach(p=>put(p[0],p[1],11));
  [[25,19],[27,19]].forEach(p=>put(p[0],p[1],12));
  put(26,18,13); put(20,29,15); put(28,29,15); put(24,28,15);
  // janitor closet
  put(33,19,14); put(38,19,14); put(42,20,19); put(36,26,15); put(44,28,15); put(34,28,15);
  // corridor lockers (hide spots)
  const lockerSpots=[[3,15],[4,15],[8,15],[9,15],[28,15],[29,15],[34,15],[35,15],
                     [23,6],[23,7],[24,12],[24,13],[5,16],[6,16],[40,16],[41,16],
                     [14,15],[15,15],[19,16],[20,16],[31,16],[32,16]];
  lockerSpots.forEach(p=>{ put(p[0],p[1],4); lockers.push({x:p[0],y:p[1]}); });
  // corridor clocks + trash + plants
  put(24,1,20); put(12,15,14); put(36,16,14); put(24,16,9); put(11,16,9); put(45,15,9);
  // puddles
  put(18,15,15); put(30,16,15); put(24,8,15); put(10,16,15);
}
function tileAtPx(px,py){ return grid[clamp(Math.floor(py/T),0,MH-1)][clamp(Math.floor(px/T),0,MW-1)]; }
function tileAt(tx,ty){ if(tx<0||ty<0||tx>=MW||ty>=MH) return 1; return grid[ty][tx]; }
function isSolidTile(t){ return SOLID.has(t); }
function isWalkable(tx,ty){
  const t=tileAt(tx,ty);
  if(WALKABLE.has(t)) return true;
  if(t===2){ const d=doors[tx+","+ty]; return d&&d.open; }
  if(t===3) return false;
  return false;
}
function losBlocked(x1,y1,x2,y2){
  const steps=Math.max(1,Math.ceil(dist(x1,y1,x2,y2)/8));
  for(let i=1;i<steps;i++){
    const t=i/steps, px=x1+(x2-x1)*t, py=y1+(y2-y1)*t;
    const tx=Math.floor(px/T), ty=Math.floor(py/T), tile=tileAt(tx,ty);
    if(tile===1||tile===4||tile===8||tile===10||tile===13||tile===20) return true;
    if(tile===2){ const d=doors[tx+","+ty]; if(d&&!d.open) return true; }
  }
  return false;
}
/* BFS pathfinding on tile grid. If the exact target is unreachable/solid,
   returns a path to the closest reachable tile instead (BFS order => first
   node with minimal Manhattan distance is found early). */
function findPath(sx,sy,tx,ty){
  if(sx===tx&&sy===ty) return [];
  const key=(x,y)=>y*MW+x;
  const prev=new Map(), q=[[sx,sy]]; prev.set(key(sx,sy),null);
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  const passable=(x,y)=>{ const t=tileAt(x,y); return WALKABLE.has(t)||t===2; }; // doors: both janitor and player can open them
  let bestK=null, bestD=1e9;
  const buildPath=k=>{
    const path=[];
    while(prev.get(k)!==null&&prev.get(k)!==undefined){ path.push([k%MW,Math.floor(k/MW)]); k=prev.get(k); }
    path.reverse(); return path;
  };
  while(q.length){
    const [cx,cy]=q.shift();
    if(cx===tx&&cy===ty) return buildPath(key(tx,ty));
    const d=Math.abs(cx-tx)+Math.abs(cy-ty);
    if(d<bestD){ bestD=d; bestK=key(cx,cy); }
    for(const [dx,dy] of dirs){
      const nx=cx+dx, ny=cy+dy, k=key(nx,ny);
      if(prev.has(k)) continue;
      if(!passable(nx,ny)) continue;
      prev.set(k,key(cx,cy)); q.push([nx,ny]);
    }
  }
  if(bestK!==null&&bestD<999) return buildPath(bestK);
  return null;
}

/* ================= settings & save ================= */
const SAVE_KEY="tbr_save_v1", SET_KEY="tbr_settings_v1", WON_KEY="tbr_won_v1";
let settings={master:0.8,music:0.6,sfx:0.8,difficulty:"normal",crt:true,shake:true};
try{ const s=JSON.parse(localStorage.getItem(SET_KEY)); if(s) settings=Object.assign(settings,s); }catch(e){}
function persistSettings(){ try{ localStorage.setItem(SET_KEY,JSON.stringify(settings)); }catch(e){} }
function persistSave(){
  if(!G||G.state==="title") return;
  try{ localStorage.setItem(SAVE_KEY,JSON.stringify({
    pages:G.pagesGot, tapes:G.tapesGot, px:G.player.x, py:G.player.y,
    battery:G.battery, stamina:G.stamina, soda:G.soda, pass:G.pass,
    time:G.time, difficulty:G.difficulty, ngPlus:G.ngPlus,
    vendingUses:G.vendingUses, clockUses:G.clockUses, mirrorSeen:G.mirrorSeen
  })); }catch(e){}
}
function loadSave(){ try{ return JSON.parse(localStorage.getItem(SAVE_KEY)); }catch(e){ return null; } }
function clearSave(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

/* ================= game state ================= */
const DIFF={
  easy:{patrol:80,chase:150,drain:0.6,stam:0.8,label:"Easy"},
  normal:{patrol:95,chase:168,drain:1.0,stam:1.0,label:"Normal"},
  hard:{patrol:115,chase:200,drain:1.4,stam:1.2,label:"Hard"}
};
const PAGE_SPOTS=[[4,6],[15,6],[29,6],[40,6],[5,11],[16,11],[35,11],[8,24],[24,24],[38,24],[20,13],[33,13]];
const TAPE_SPOTS=[[2,10],[45,10],[28,28],[2,29],[19,10]];
const BATTERY_SPOTS=[[11,15],[24,5],[40,15],[5,20],[24,20],[36,20],[44,24]];
const SODA_SPOTS=[[7,15],[30,15],[16,24],[40,24],[24,14]];
const PASS_SPOTS=[[16,15],[24,10],[36,15]];

let G=null;
function newGameState(diff, ngPlus){
  buildMap();
  const pageSpots=PAGE_SPOTS.slice().sort(()=>Math.random()-0.5).slice(0,8);
  const pickups=[];
  pageSpots.forEach((p,i)=>pickups.push({kind:"page",id:i,x:p[0]*T+16,y:p[1]*T+16,got:false}));
  TAPE_SPOTS.forEach((p,i)=>pickups.push({kind:"tape",id:i,x:p[0]*T+16,y:p[1]*T+16,got:false}));
  BATTERY_SPOTS.forEach((p,i)=>pickups.push({kind:"battery",id:i,x:p[0]*T+16,y:p[1]*T+16,got:false}));
  SODA_SPOTS.forEach((p,i)=>pickups.push({kind:"soda",id:i,x:p[0]*T+16,y:p[1]*T+16,got:false}));
  PASS_SPOTS.forEach((p,i)=>pickups.push({kind:"pass",id:i,x:p[0]*T+16,y:p[1]*T+16,got:false}));
  return {
    state:"intro", time:0, difficulty:diff, ngPlus:!!ngPlus,
    pagesGot:[], tapesGot:[], battery:100, stamina:100, soda:1, pass:1,
    flashOn:true, hidden:false, hiddenLocker:null, exitUnlocked:false,
    player:{x:14*T+16,y:6*T+16,dir:1,faceX:1,faceY:0,walk:0,moving:false,running:false,speedBoost:0},
    janitor:{x:38*T+16,y:24*T+16,dir:-1,walk:0,state:"patrol",path:[],pathTimer:0,
             lastKnown:null,investigate:null,investigateTimer:0,stun:0,searchTimer:0,
             patrolIdx:0,sawHide:false,hideLocker:null,losTimer:0},
    pickups, particles:[], cam:{x:0,y:0}, flicker:0, glitch:0, scareT:0,
    vendingUses:0, clockUses:0, mirrorSeen:false, noiseTimer:0, heartTimer:0,
    thrownPass:null, checkpoint:null, won:false, caught:false, shake:0,
    patrolPoints:[[24,15],[7,15],[40,15],[24,5],[23,12],[8,24],[24,24],[40,24],[16,15],[32,15]]
  };
}
function applySave(sv){
  G=newGameState(sv.difficulty||"normal", sv.ngPlus);
  G.pagesGot=sv.pages||[]; G.tapesGot=sv.tapes||[];
  G.player.x=sv.px; G.player.y=sv.py;
  G.battery=sv.battery; G.stamina=sv.stamina; G.soda=sv.soda; G.pass=sv.pass;
  G.time=sv.time||0; G.vendingUses=sv.vendingUses||0; G.clockUses=sv.clockUses||0; G.mirrorSeen=!!sv.mirrorSeen;
  G.pickups.forEach(p=>{
    if(p.kind==="page"&&G.pagesGot.includes(p.id)) p.got=true;
    if(p.kind==="tape"&&G.tapesGot.includes(p.id)) p.got=true;
  });
  if(G.pagesGot.length>=8){ G.exitUnlocked=true; }
  G.state="playing";
}

/* ================= input ================= */
const keys={};
let touchMove={x:0,y:0}, touchRun=false;
window.addEventListener("keydown",e=>{
  keys[e.key.toLowerCase()]=true;
  if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();
  if(!G) return;
  const k=e.key.toLowerCase();
  if(k==="e"||k==="enter"){ if(G.state==="reading") closeReader(); else if(G.state==="playing") tryInteract(); }
  if(k==="f"&&G.state==="playing") toggleFlash();
  if(k==="q"&&G.state==="playing") useSoda();
  if(k==="r"&&G.state==="playing") throwPass();
  if((k==="escape"||k==="p")){
    if(G.state==="playing") pauseGame();
    else if(G.state==="paused") resumeGame();
  }
  if(k==="m"){ settings.master=settings.master>0?0:0.8; Sound.setVolumes(settings.master,settings.music,settings.sfx); syncSettingsUI(); toast(settings.master>0?"Sound on":"Sound muted"); }
});
window.addEventListener("keyup",e=>{ keys[e.key.toLowerCase()]=false; });

/* touch controls */
(function(){
  const tc=$("touch-controls"), stick=$("stick"), knob=$("stick-knob");
  let stickId=null;
  const isTouch=("ontouchstart" in window)||navigator.maxTouchPoints>0;
  if(isTouch) tc.classList.remove("hidden");
  function stickPos(e){
    const r=stick.getBoundingClientRect(), cx=r.left+r.width/2, cy=r.top+r.height/2;
    let dx=e.clientX-cx, dy=e.clientY-cy;
    const m=Math.hypot(dx,dy), max=r.width/2-10;
    if(m>max){ dx=dx/m*max; dy=dy/m*max; }
    knob.style.transform="translate("+dx+"px,"+dy+"px)";
    touchMove.x=dx/max; touchMove.y=dy/max;
  }
  stick.addEventListener("touchstart",e=>{ stickId=e.changedTouches[0].identifier; stickPos(e.changedTouches[0]); e.preventDefault(); },{passive:false});
  stick.addEventListener("touchmove",e=>{ for(const t of e.changedTouches) if(t.identifier===stickId) stickPos(t); e.preventDefault(); },{passive:false});
  const endStick=e=>{ for(const t of e.changedTouches) if(t.identifier===stickId){ stickId=null; touchMove.x=0; touchMove.y=0; knob.style.transform=""; } };
  stick.addEventListener("touchend",endStick); stick.addEventListener("touchcancel",endStick);
  const bind=(id,down,up)=>{ const el=$(id);
    el.addEventListener("touchstart",e=>{ down(); e.preventDefault(); },{passive:false});
    if(up) el.addEventListener("touchend",e=>{ up(); e.preventDefault(); },{passive:false});
  };
  bind("tb-interact",()=>{ if(!G) return; if(G.state==="reading") closeReader(); else if(G.state==="playing") tryInteract(); });
  bind("tb-run",()=>{ touchRun=true; },()=>{ touchRun=false; });
  bind("tb-light",()=>{ if(G&&G.state==="playing") toggleFlash(); });
  bind("tb-item",()=>{ if(G&&G.state==="playing") useSoda(); });
})();

/* ================= helpers ================= */
function toast(msg, dur){
  const el=$("hud-toast"); el.textContent=msg; el.classList.add("show");
  clearTimeout(toast._t); toast._t=setTimeout(()=>el.classList.remove("show"), dur||3200);
}
function emitNoise(x,y,radius){
  if(!G) return;
  const j=G.janitor;
  if(dist(x,y,j.x,j.y)<=radius){
    if(j.state==="patrol"||j.state==="search"){
      j.state="investigate"; j.investigate={x,y}; j.investigateTimer=4;
    } else if(j.state==="investigate"){ j.investigate={x,y}; j.investigateTimer=4; }
  }
}
function spawnParticles(x,y,color,n,spread){
  for(let i=0;i<n;i++){
    G.particles.push({x,y,vx:rand(-spread,spread),vy:rand(-spread,spread),life:rand(0.4,1),color,size:rand(1.5,3.5)});
  }
  if(G.particles.length>300) G.particles.splice(0,G.particles.length-300);
}
function toggleFlash(){
  if(G.battery<=0){ toast("Flashlight is dead. Find a battery!"); Sound.error(); return; }
  G.flashOn=!G.flashOn; Sound.click();
}
function useSoda(){
  if(G.soda<=0){ toast("No soda. The vending machine might help..."); Sound.error(); return; }
  G.soda--; G.stamina=clamp(G.stamina+55,0,100); G.player.speedBoost=3;
  Sound.soda(); toast("🥤 Glug glug. Stamina restored!");
}
function throwPass(){
  if(G.pass<=0){ toast("No hall pass. Find one in the halls."); Sound.error(); return; }
  G.pass--;
  const p=G.player, a=p.dir>=0?0:Math.PI;
  G.thrownPass={x:p.x+Math.cos(a)*130, y:p.y+Math.sin(a)*10, t:0};
  Sound.throwPass(); emitNoise(p.x+Math.cos(a)*130,p.y,200);
  toast("🎫 Hall pass thrown!");
}
function openDoor(d){
  d.open=!d.open; Sound.door(d.open); emitNoise(d.x*T+16,d.y*T+16,150);
}
function tryInteract(){
  if(!G||G.state!=="playing") return;
  const p=G.player;
  if(G.hidden){ exitLocker(); return; }
  // nearest pickup
  let best=null, bestD=44;
  G.pickups.forEach(pk=>{ if(pk.got) return; const d=dist(p.x,p.y,pk.x,pk.y); if(d<bestD){ bestD=d; best=pk; } });
  if(best){ collectPickup(best); return; }
  // exit
  const etx=Math.floor(p.x/T), ety=Math.floor(p.y/T);
  for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
    if(tileAt(etx+dx,ety+dy)===3){ tryExit(); return; }
  }
  // doors / lockers / props: check facing tile first, then all adjacent tiles
  const ptx=Math.floor(p.x/T), pty=Math.floor(p.y/T);
  const fdirs=[[ptx+Math.sign(p.faceX||0),pty+Math.sign(p.faceY||0)],[ptx+1,pty],[ptx-1,pty],[ptx,pty+1],[ptx,pty-1]];
  const seenT=new Set();
  for(const [tx,ty] of fdirs){
    const k=tx+","+ty;
    if(seenT.has(k)) continue;
    seenT.add(k);
    if(tx===ptx&&ty===pty) continue;
    const tile=tileAt(tx,ty);
    if(tile===2){ const d=doors[tx+","+ty]; if(d) openDoor(d); return; }
    if(tile===4){ enterLocker(tx,ty); return; }
    // secret door
    if(tile===21){ grid[ty][tx]=0; props=props.filter(pr=>!(pr.x===tx&&pr.y===ty)); Sound.door(true); Sound.whisper(); emitNoise(p.x,p.y,120); openReader("A HIDING PLACE", LORE.nook); return; }
    // lore props
    const loreMap={10:"vending",20:"clock",13:"mirror",16:"radio",19:"extinguisher",7:"blackboard",14:"trash",9:"plant",5:"office"};
    if(loreMap[tile]){ interactLore(loreMap[tile],tx,ty); return; }
  }
}
function interactLore(kind,tx,ty){
  const p=G.player;
  if(kind==="vending"){
    if(G.vendingUses<3){ G.vendingUses++; G.soda++; Sound.soda(); toast(LORE["vending"+G.vendingUses]); }
    else { Sound.error(); toast(LORE.vending3); }
  } else if(kind==="clock"){
    G.clockUses++; Sound.click();
    toast(LORE["clock"+Math.min(4,G.clockUses)]);
    if(G.clockUses===4){ Sound.whisper(); G.glitch=1.2; }
  } else if(kind==="mirror"){
    if(!G.mirrorSeen){ G.mirrorSeen=true; Sound.whisper(); G.glitch=1.5; toast(LORE.mirror,5000); }
    else toast("You avoid looking at the mirror.");
  } else if(kind==="radio"){ Sound.staticBurst(); toast(LORE.radio,4000); }
  else if(kind==="extinguisher"){ toast(LORE.extinguisher,4000); Sound.click(); }
  else if(kind==="blackboard"){ toast(LORE.blackboard,4000); }
  else if(kind==="trash"){
    if(Math.random()<0.4){ G.battery=clamp(G.battery+30,0,100); Sound.battery(); toast(LORE.trash); }
    else toast("Just crumpled paper. And something wet.");
  } else if(kind==="plant"){ toast(LORE.plant,4000); }
  else if(kind==="office"){ toast(LORE.office,4500); }
  emitNoise(p.x,p.y,60);
}
function collectPickup(pk){
  pk.got=true; const p=G.player;
  spawnParticles(pk.x,pk.y,"#f2c14e",10,60);
  if(pk.kind==="page"){
    G.pagesGot.push(pk.id); Sound.page();
    const pg=PAGES[pk.id];
    openReader(pg.head, pg.body);
    onPageCollected();
  } else if(pk.kind==="tape"){
    G.tapesGot.push(pk.id); Sound.tape();
    const tp=TAPES[pk.id];
    openReader(tp.head, tp.body);
    toast("📼 Tape found! ("+G.tapesGot.length+"/5)");
  } else if(pk.kind==="battery"){ G.battery=clamp(G.battery+40,0,100); Sound.battery(); toast("🔋 Battery +40%"); }
  else if(pk.kind==="soda"){ G.soda++; Sound.soda(); toast("🥤 Soda +1"); }
  else if(pk.kind==="pass"){ G.pass++; Sound.pickup(); toast("🎫 Hall pass +1"); }
  emitNoise(p.x,p.y,80);
  persistSave();
}
function onPageCollected(){
  const n=G.pagesGot.length;
  if(n===3){ G.flicker=2.2; Sound.whisper(); }
  if(n===5){ Sound.bell(); G.glitch=1.5; janitorTeleportScare(); }
  if(n===6){ Sound.staticBurst(); G.glitch=1.2; }
  if(n===7){ Sound.whisper(); }
  if(n>=8&&!G.exitUnlocked){
    G.exitUnlocked=true; Sound.bell(); Sound.unlock();
    toast("🔔 The front doors are unlocked. ESCAPE!",5000);
    G.janitor.state="patrol"; // enrage handled via speed bonus
  }
  updateObjective();
}
function janitorTeleportScare(){
  const j=G.janitor, p=G.player;
  let best=null, bestD=1e9;
  G.patrolPoints.forEach(pt=>{
    const d=dist(pt[0]*T+16,pt[1]*T+16,p.x,p.y);
    if(d>260&&d<bestD){ bestD=d; best=pt; }
  });
  if(best){ j.x=best[0]*T+16; j.y=best[1]*T+16; j.state="chase"; j.lastKnown={x:p.x,y:p.y}; j.path=[]; }
}
function tryExit(){
  if(!G.exitUnlocked){ toast("Locked. The chains are cold. Find all 8 pages."); Sound.error(); return; }
  winGame();
}
function enterLocker(tx,ty){
  const p=G.player, j=G.janitor;
  G.hidden=true; G.hiddenLocker={x:tx,y:ty};
  p.x=tx*T+16; p.y=ty*T+16;
  Sound.locker(); emitNoise(p.x,p.y,120);
  // did he see you hide?
  const sees=!losBlocked(j.x,j.y,p.x,p.y)&&dist(j.x,j.y,p.x,p.y)<(G.flashOn?320:200);
  j.sawHide=sees&&j.state==="chase";
  j.hideLocker={x:p.x,y:p.y};
  toast("You squeeze into the locker. Hold still. [E] to leave.");
}
function exitLocker(){
  G.hidden=false; G.hiddenLocker=null; G.janitor.sawHide=false;
  Sound.locker();
  const p=G.player;
  // step out to nearest walkable
  for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){
    const tx=Math.floor(p.x/T)+dx, ty=Math.floor(p.y/T)+dy;
    if(isWalkable(tx,ty)){ p.x=tx*T+16; p.y=ty*T+16; break; }
  }
}

/* ================= reader ================= */
function openReader(head,body){
  $("reader-head").textContent=head;
  $("reader-body").textContent=body;
  $("reader").classList.remove("hidden");
  G.state="reading";
}
function closeReader(){
  $("reader").classList.add("hidden");
  if(G.state==="reading") G.state="playing";
  Sound.click();
}
$("reader-close").addEventListener("click",closeReader);
$("reader").addEventListener("click",e=>{ if(e.target.id==="reader") closeReader(); });

/* ================= janitor AI ================= */
function janitorSpeeds(){
  const d=DIFF[G.difficulty];
  const rage=G.exitUnlocked?1.2:1;
  const ng=G.ngPlus?1.15:1;
  return { patrol:d.patrol*rage*ng, chase:(d.chase+G.pagesGot.length*7)*rage*ng };
}
function updateJanitor(dt){
  const j=G.janitor, p=G.player, sp=janitorSpeeds();
  if(j.stun>0){ j.stun-=dt; return; }
  const dToPlayer=dist(j.x,j.y,p.x,p.y);
  // --- senses ---
  j.losTimer-=dt;
  if(!G.hidden&&j.losTimer<=0){
    j.losTimer=0.15;
    const viewDist=G.flashOn?330:210;
    const sees=dToPlayer<viewDist&&!losBlocked(j.x,j.y,p.x,p.y);
    if(sees){
      if(j.state!=="chase"){ j.state="chase"; Sound.sting(); G.shake=0.4; }
      j.lastKnown={x:p.x,y:p.y};
    }
  }
  // catch
  if(!G.hidden&&dToPlayer<26){ caught(); return; }
  if(G.hidden&&j.sawHide&&dToPlayer<30){ caught(); return; }
  // --- state machine ---
  let target=null, speed=sp.patrol;
  if(j.state==="chase"){
    speed=sp.chase;
    if(j.lastKnown) target=j.lastKnown;
    if(G.hidden||dToPlayer>420){ j.searchTimer+=dt; if(j.searchTimer>3){ j.state="search"; j.searchTimer=0; } }
    else j.searchTimer=0;
  } else if(j.state==="investigate"){
    target=j.investigate; j.investigateTimer-=dt;
    if(j.investigateTimer<=0){ j.state="search"; j.searchTimer=0; }
    if(target&&dist(j.x,j.y,target.x,target.y)<24){ j.state="search"; j.searchTimer=0; }
  } else if(j.state==="search"){
    speed=sp.patrol*0.8;
    if(j.lastKnown) target=j.lastKnown;
    j.searchTimer+=dt;
    if(target&&dist(j.x,j.y,target.x,target.y)<24) j.searchTimer+=dt*2;
    if(j.searchTimer>6){ j.state="patrol"; j.lastKnown=null; }
  } else { // patrol
    const pt=G.patrolPoints[j.patrolIdx];
    target={x:pt[0]*T+16,y:pt[1]*T+16};
    if(dist(j.x,j.y,target.x,target.y)<20) j.patrolIdx=(j.patrolIdx+1)%G.patrolPoints.length;
  }
  // --- movement via BFS path ---
  if(target){
    j.pathTimer-=dt;
    const ttx=Math.floor(target.x/T), tty=Math.floor(target.y/T);
    const jtx=Math.floor(j.x/T), jty=Math.floor(j.y/T);
    const needRepath=j.pathTimer<=0||!j.path||!j.path.length;
    if(needRepath){
      j.path=findPath(jtx,jty,ttx,tty)||[];
      j.pathTimer=0.6;
    }
    let mx=j.x, my=j.y;
    if(j.path&&j.path.length){
      const [nx,ny]=j.path[0];
      mx=nx*T+16; my=ny*T+16;
      if(dist(j.x,j.y,mx,my)<8){ j.path.shift(); }
    } else { mx=target.x; my=target.y; }
    const ang=Math.atan2(my-j.y,mx-j.x);
    j.x+=Math.cos(ang)*speed*dt; j.y+=Math.sin(ang)*speed*dt;
    j.dir=Math.cos(ang)>=0?1:-1;
    j.walk+=dt*(speed/40);
    // open doors in the way
    const aheadTx=Math.floor((j.x+j.dir*20)/T), aheadTy=Math.floor(j.y/T);
    if(tileAt(aheadTx,aheadTy)===2){ const d=doors[aheadTx+","+aheadTy]; if(d&&!d.open) openDoor(d); }
  }
  // hum volume by distance
  const humLevel=clamp(1-dToPlayer/700,0,1);
  Sound.setHum(G.hidden?humLevel*0.7:humLevel);
  // heartbeat
  G.heartTimer-=dt;
  if(dToPlayer<260&&G.heartTimer<=0){
    G.heartTimer=clamp(dToPlayer/260,0.35,1.1);
    Sound.heartbeat(clamp(1-dToPlayer/260,0,1));
  }
  // danger HUD
  $("hud-danger").classList.toggle("hidden", !(j.state==="chase"||dToPlayer<150));
}

/* ================= player update ================= */
function updatePlayer(dt){
  const p=G.player, d=DIFF[G.difficulty];
  if(G.hidden) return;
  let mx=0,my=0;
  if(keys["w"]||keys["arrowup"]) my-=1;
  if(keys["s"]||keys["arrowdown"]) my+=1;
  if(keys["a"]||keys["arrowleft"]) mx-=1;
  if(keys["d"]||keys["arrowright"]) mx+=1;
  mx+=touchMove.x; my+=touchMove.y;
  const mag=Math.hypot(mx,my);
  p.moving=mag>0.15;
  if(p.moving){ mx/=Math.max(1,mag); my/=Math.max(1,mag); }
  p.running=(keys["shift"]||touchRun)&&p.moving&&G.stamina>1;
  let speed=p.running?215:130;
  if(p.speedBoost>0){ speed*=1.15; p.speedBoost-=dt; }
  if(p.running){
    G.stamina=clamp(G.stamina-22*d.stam*dt,0,100);
    G.noiseTimer-=dt;
    if(G.noiseTimer<=0){ G.noiseTimer=0.4; emitNoise(p.x,p.y,230); Sound.footstep(true); }
  } else {
    G.stamina=clamp(G.stamina+15*dt,0,100);
    if(p.moving){ G.noiseTimer-=dt; if(G.noiseTimer<=0){ G.noiseTimer=0.55; emitNoise(p.x,p.y,60); Sound.footstep(false); } }
  }
  if(p.moving){
    p.dir=mx>=0?1:-1;
    p.faceX=mx; p.faceY=my;
    p.walk+=dt*(p.running?11:7);
    // collision (axis separated)
    const r=10;
    let nx=p.x+mx*speed*dt;
    if(!collides(nx,p.y,r)) p.x=nx;
    let ny=p.y+my*speed*dt;
    if(!collides(p.x,ny,r)) p.y=ny;
  }
  // flashlight battery
  if(G.flashOn){
    G.battery=clamp(G.battery-2.2*d.drain*dt,0,100);
    if(G.battery<=0){ G.flashOn=false; toast("🔦 Flashlight died!"); }
  }
}
function collides(px,py,r){
  const pts=[[px-r,py-r],[px+r,py-r],[px-r,py+r],[px+r,py+r]];
  for(const [x,y] of pts){
    const tx=Math.floor(x/T), ty=Math.floor(y/T), t=tileAt(tx,ty);
    if(isSolidTile(t)) return true;
    if(t===2){ const d=doors[tx+","+ty]; if(d&&!d.open) return true; }
    if(t===3) return true;
    if(t===21) return true;
  }
  return false;
}

/* ================= flow ================= */
function showScreen(id){
  ["screen-title","screen-how","screen-settings","screen-pause","screen-over","screen-win","screen-intro"].forEach(s=>{
    $(s).classList.toggle("hidden", s!==id);
  });
  $("hud").classList.toggle("hidden", !(G&&(G.state==="playing"||G.state==="reading"||G.state==="paused")));
}
function startGame(diff,ngPlus){
  Sound.init(); Sound.startAmbient(); Sound.startMusic();
  G=newGameState(diff,ngPlus);
  G.state="intro";
  showScreen("screen-intro");
  $("hud").classList.add("hidden");
}
function beginPlay(){
  G.state="playing";
  showScreen(null);
  $("hud").classList.remove("hidden");
  updateObjective();
  toast("Find your 8 diary pages. And Milo... don't let him hear you run.",5000);
  persistSave();
}
function pauseGame(){ if(G.state!=="playing") return; G.state="paused"; showScreen("screen-pause"); persistSave(); }
function resumeGame(){ if(G.state!=="paused") return; G.state="playing"; showScreen(null); }
function caught(){
  if(G.state!=="playing") return;
  G.state="scare"; G.scareT=1.6; G.caught=true;
  Sound.sting(); Sound.setHum(0);
  if(settings.shake) G.shake=0.8;
  setTimeout(()=>{
    if(!G||G.state!=="scare") return;
    G.state="over"; Sound.lose();
    $("over-text").textContent=choice([
      "Mr. Mop just wanted to talk. He talks for a very, very long time.",
      "He hums you to sleep. You wake up in the janitor's closet. The clock says 4:47.",
      "You are now part of the school. The school is part of you. The bell never rings."
    ]);
    showScreen("screen-over");
  },1700);
}
function winGame(){
  G.state="win"; G.won=true; Sound.win(); Sound.setHum(0);
  try{ localStorage.setItem(WON_KEY,"1"); }catch(e){}
  clearSave();
  const secret=G.tapesGot.length>=5;
  $("win-title").textContent=secret?"YOU REMEMBER EVERYTHING":"YOU ESCAPED";
  $("win-text").textContent=secret
    ? "You found every tape. You know what happened here. The school lets you go — but it keeps a copy of you. Somewhere, a clock ticks from 4:47 to 4:48. Somewhere, a janitor hums. And somewhere, a kid is still looking for his diary pages.\n\nSECRET ENDING — THE BELL NEVER RINGS"
    : "You burst through the front doors into the cold night air. Behind you, the school goes dark. In the distance, faintly, a mop squeaks. A man hums.\n\nYou don't look back. You never look back.\n\n...but some nights, you still hear it. The bell that never rings.";
  const mm=Math.floor(G.time/60), ss=Math.floor(G.time%60);
  $("win-stats").innerHTML="⏱ Time: "+mm+":"+String(ss).padStart(2,"0")+" &nbsp;·&nbsp; 📄 Pages: "+G.pagesGot.length+"/8 &nbsp;·&nbsp; 📼 Tapes: "+G.tapesGot.length+"/5<br>Difficulty: "+DIFF[G.difficulty].label+(G.ngPlus?" · Night 2 (NG+)":"")+(secret?"<br>🏆 Secret ending unlocked!":"<br>Tip: find all 5 tapes for the secret ending.");
  showScreen("screen-win");
}
function updateObjective(){
  $("hud-objective").textContent=G.exitUnlocked?"🚪 ESCAPE THROUGH THE FRONT DOORS!":"Find your diary pages ("+G.pagesGot.length+"/8)";
}
function quitToTitle(){
  Sound.setHum(0);
  if(G&&(G.state==="paused"||G.state==="playing"||G.state==="reading")) persistSave();
  $("reader").classList.add("hidden");
  G=null;
  refreshTitle();
  showScreen("screen-title");
}

/* ================= HUD ================= */
function updateHUD(){
  if(!G) return;
  $("pages-count").textContent=G.pagesGot.length;
  $("tapes-count").textContent=G.tapesGot.length;
  $("battery-fill").style.width=G.battery+"%";
  $("battery-fill").style.background=G.battery<25?"#e4572e":"#f2c14e";
  $("stamina-fill").style.width=G.stamina+"%";
  $("soda-count").textContent=G.soda;
  $("pass-count").textContent=G.pass;
  const mm=Math.floor(G.time/60), ss=Math.floor(G.time%60);
  $("hud-time").textContent=String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");
  // interact prompt
  const p=G.player; let label=null;
  if(G.hidden) label="Leave locker";
  else{
    let best=null,bestD=44;
    G.pickups.forEach(pk=>{ if(pk.got) return; const d=dist(p.x,p.y,pk.x,pk.y); if(d<bestD){ bestD=d; best=pk; } });
    if(best) label={page:"Read diary page",tape:"Watch tape",battery:"Take battery",soda:"Take soda",pass:"Take hall pass"}[best.kind];
    else{
      const ptx=Math.floor(p.x/T), pty=Math.floor(p.y/T);
      const dirs=[[ptx+Math.sign(p.faceX||0),pty+Math.sign(p.faceY||0)],[ptx+1,pty],[ptx-1,pty],[ptx,pty+1],[ptx,pty-1]];
      const seen=new Set();
      for(const [tx,ty] of dirs){
        const k=tx+","+ty; if(seen.has(k)) continue; seen.add(k);
        const t=tileAt(tx,ty);
        if(t===2){ label=doors[tx+","+ty]&&doors[tx+","+ty].open?"Close door":"Open door"; break; }
        if(t===4){ label="Hide in locker"; break; }
        if(t===21){ label="Move bookcase"; break; }
        if(t===3){ label=G.exitUnlocked?"ESCAPE!":"Locked front doors"; break; }
        if([10,20,13,16,19,7,14,9,5].includes(t)){ label="Look / Use"; break; }
      }
    }
  }
  if(label){ $("hud-interact").classList.remove("hidden"); $("interact-label").textContent=label; }
  else $("hud-interact").classList.add("hidden");
}

/* ================= rendering ================= */
const canvas=$("game"), ctx=canvas.getContext("2d");
const dark=document.createElement("canvas"); dark.width=960; dark.height=640;
const dctx=dark.getContext("2d");
function floorVariant(tx,ty){
  if(ty>=18) return ty>=18&&tx<=16?3:(tx>=18&&tx<=29?2:0);
  if(ty>=9&&ty<=14) return (tx<=10||tx>=12&&tx<=21)?1:0;
  if(ty<=7) return 1;
  return 0;
}
function render(){
  const W=960,H=640;
  ctx.fillStyle="#0a0910"; ctx.fillRect(0,0,W,H);
  if(!G){ return; }
  const p=G.player;
  // camera
  const targetX=clamp(p.x-W/2,0,MW*T-W), targetY=clamp(p.y-H/2,0,MH*T-H);
  G.cam.x+=(targetX-G.cam.x)*0.12; G.cam.y+=(targetY-G.cam.y)*0.12;
  let shX=0,shY=0;
  if(G.shake>0){ shX=rand(-1,1)*G.shake*8; shY=rand(-1,1)*G.shake*8; G.shake-=0.016; }
  const camX=G.cam.x+shX, camY=G.cam.y+shY;
  const x0=Math.max(0,Math.floor(camX/T)), y0=Math.max(0,Math.floor(camY/T));
  const x1=Math.min(MW-1,Math.ceil((camX+W)/T)), y1=Math.min(MH-1,Math.ceil((camY+H)/T));
  // floor + walls
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const sx=tx*T-camX, sy=ty*T-camY, t=grid[ty][tx];
    if(t===1){ Sprites.drawWall(ctx,sx,sy,tx*31+ty*17); }
    else{
      Sprites.drawFloor(ctx,sx,sy,floorVariant(tx,ty),tx*13+ty*7);
      if(t===15) Sprites.drawPuddle(ctx,sx,sy,tx+ty);
    }
  }
  // props (flat ones first)
  const drawables=[];
  for(let ty=y0;ty<=y1;ty++) for(let tx=x0;tx<=x1;tx++){
    const t=grid[ty][tx]; if(t===0||t===1||t===15) continue;
    const sx=tx*T-camX, sy=ty*T-camY;
    if(t===2){ const d=doors[tx+","+ty]; Sprites.drawDoor(ctx,sx,sy,d&&d.open, false); }
    else if(t===3){ Sprites.drawExitDoor(ctx,sx,sy,G.exitUnlocked); }
    else if(t===4){ Sprites.drawLocker(ctx,sx,sy,G.hiddenLocker&&G.hiddenLocker.x===tx&&G.hiddenLocker.y===ty); }
    else if(t===5) Sprites.drawDesk(ctx,sx,sy);
    else if(t===6) Sprites.drawChair(ctx,sx,sy);
    else if(t===7) Sprites.drawBlackboard(ctx,sx,sy);
    else if(t===8) Sprites.drawBookcase(ctx,sx,sy,false);
    else if(t===21) Sprites.drawBookcase(ctx,sx,sy,true);
    else if(t===9) Sprites.drawPlant(ctx,sx,sy);
    else if(t===10) Sprites.drawVending(ctx,sx,sy);
    else if(t===11) Sprites.drawToilet(ctx,sx,sy);
    else if(t===12) Sprites.drawSink(ctx,sx,sy);
    else if(t===13) Sprites.drawMirror(ctx,sx,sy);
    else if(t===14) Sprites.drawTrash(ctx,sx,sy);
    else if(t===16) Sprites.drawRadio(ctx,sx,sy);
    else if(t===17) Sprites.drawGymMat(ctx,sx,sy);
    else if(t===18) Sprites.drawCafTable(ctx,sx,sy);
    else if(t===19) Sprites.drawFireExt(ctx,sx,sy);
    else if(t===20) Sprites.drawClock(ctx,sx,sy,G.time);
  }
  // pickups
  G.pickups.forEach(pk=>{
    if(pk.got) return;
    const sx=pk.x-camX, sy=pk.y-camY;
    if(sx<-40||sy<-40||sx>W+40||sy>H+40) return;
    if(pk.kind==="page") Sprites.drawPage(ctx,sx,sy,G.time);
    else if(pk.kind==="tape") Sprites.drawTape(ctx,sx,sy,G.time);
    else if(pk.kind==="battery") Sprites.drawBattery(ctx,sx,sy);
    else if(pk.kind==="soda") Sprites.drawSoda(ctx,sx,sy);
    else if(pk.kind==="pass") Sprites.drawPass(ctx,sx,sy);
  });
  // thrown pass
  if(G.thrownPass){
    const tp=G.thrownPass;
    Sprites.drawPass(ctx,tp.x-camX,tp.y-camY);
  }
  // entities sorted by y
  const ents=[{y:p.y,fn:()=>{ if(!G.hidden) Sprites.drawKid(ctx,p.x-camX,p.y-camY,p.dir,p.walk,G.flashOn); }},
              {y:G.janitor.y,fn:()=>Sprites.drawJanitor(ctx,G.janitor.x-camX,G.janitor.y-camY,G.janitor.dir,G.janitor.walk,G.janitor.state==="chase")}];
  ents.sort((a,b)=>a.y-b.y).forEach(e=>e.fn());
  // particles
  G.particles.forEach(pt=>{
    ctx.globalAlpha=clamp(pt.life,0,1); ctx.fillStyle=pt.color;
    ctx.fillRect(pt.x-camX,pt.y-camY,pt.size,pt.size);
  });
  ctx.globalAlpha=1;
  /* ---- darkness / lighting ---- */
  dctx.clearRect(0,0,W,H);
  let darkAlpha=0.93;
  if(G.flicker>0){ darkAlpha=0.93-Math.abs(Math.sin(G.time*40))*0.5; G.flicker-=0.016; }
  if(G.flashOn&&G.battery<20) darkAlpha-=Math.random()*0.05;
  dctx.fillStyle="rgba(3,3,10,"+darkAlpha+")"; dctx.fillRect(0,0,W,H);
  dctx.globalCompositeOperation="destination-out";
  const px=p.x-camX, py=p.y-camY;
  // ambient around player
  let g=dctx.createRadialGradient(px,py,4,px,py,90);
  g.addColorStop(0,"rgba(0,0,0,0.85)"); g.addColorStop(1,"rgba(0,0,0,0)");
  dctx.fillStyle=g; dctx.beginPath(); dctx.arc(px,py,90,0,7); dctx.fill();
  // flashlight cone
  if(G.flashOn&&G.battery>0){
    const a=Math.atan2(p.faceY||0,p.faceX||1);
    const len=280, spread=0.55;
    g=dctx.createRadialGradient(px,py,10,px,py,len);
    g.addColorStop(0,"rgba(0,0,0,0.95)"); g.addColorStop(0.7,"rgba(0,0,0,0.55)"); g.addColorStop(1,"rgba(0,0,0,0)");
    dctx.fillStyle=g;
    dctx.beginPath(); dctx.moveTo(px,py);
    dctx.arc(px,py,len,a-spread,a+spread); dctx.closePath(); dctx.fill();
    // warm tint pass on main canvas later
  }
  // pickup glows
  G.pickups.forEach(pk=>{
    if(pk.got) return;
    const sx=pk.x-camX, sy=pk.y-camY;
    const r=pk.kind==="page"||pk.kind==="tape"?70:44;
    g=dctx.createRadialGradient(sx,sy,2,sx,sy,r);
    g.addColorStop(0,"rgba(0,0,0,0.7)"); g.addColorStop(1,"rgba(0,0,0,0)");
    dctx.fillStyle=g; dctx.beginPath(); dctx.arc(sx,sy,r,0,7); dctx.fill();
  });
  // exit glow
  if(G.exitUnlocked){
    const ex=24*T+16-camX, ey=31*T+16-camY;
    g=dctx.createRadialGradient(ex,ey,4,ex,ey,110);
    g.addColorStop(0,"rgba(0,0,0,0.8)"); g.addColorStop(1,"rgba(0,0,0,0)");
    dctx.fillStyle=g; dctx.beginPath(); dctx.arc(ex,ey,110,0,7); dctx.fill();
  }
  // janitor eyes in the dark
  const jx=G.janitor.x-camX, jy=G.janitor.y-camY-18;
  if(jx>-20&&jy>-20&&jx<W+20&&jy<H+20){
    g=dctx.createRadialGradient(jx,jy,1,jx,jy,26);
    g.addColorStop(0,"rgba(0,0,0,0.9)"); g.addColorStop(1,"rgba(0,0,0,0)");
    dctx.fillStyle=g; dctx.beginPath(); dctx.arc(jx,jy,26,0,7); dctx.fill();
  }
  dctx.globalCompositeOperation="source-over";
  ctx.drawImage(dark,0,0);
  // warm flashlight tint
  if(G.flashOn&&G.battery>0){
    ctx.globalCompositeOperation="lighter";
    const a=Math.atan2(p.faceY||0,p.faceX||1);
    g=ctx.createRadialGradient(px,py,10,px,py,240);
    g.addColorStop(0,"rgba(242,220,140,0.10)"); g.addColorStop(1,"rgba(242,220,140,0)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(px,py); ctx.arc(px,py,240,a-0.55,a+0.55); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation="source-over";
  }
  // janitor red eyes (drawn over darkness so they're visible)
  if(jx>-20&&jy>-20&&jx<W+20&&jy<H+20){
    ctx.fillStyle=G.janitor.state==="chase"?"#ff3b30":"#ff8a7a";
    ctx.beginPath(); ctx.arc(jx-3,jy,2,0,7); ctx.arc(jx+3,jy,2,0,7); ctx.fill();
  }
  // VHS tracking line
  if(Math.random()<0.02){
    ctx.fillStyle="rgba(255,255,255,0.07)";
    ctx.fillRect(0,Math.random()*H,W,3);
  }
  // glitch overlay
  if(G.glitch>0){
    G.glitch-=0.016;
    $("glitch").classList.add("on");
    ctx.fillStyle="rgba(255,255,255,0.05)"; ctx.fillRect(0,Math.random()*H,W,2);
  } else $("glitch").classList.remove("on");
  // scare face
  if(G.state==="scare"){
    Sprites.drawScareFace(ctx,W,H,G.time);
  }
}

/* ================= main loop ================= */
let lastT=0;
function loop(t){
  requestAnimationFrame(loop);
  const dt=Math.min(0.05,(t-lastT)/1000||0.016); lastT=t;
  if(G&&(G.state==="playing")){
    G.time+=dt;
    updatePlayer(dt);
    updateJanitor(dt);
    // particles
    G.particles.forEach(pt=>{ pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.life-=dt; });
    G.particles=G.particles.filter(pt=>pt.life>0);
    // thrown pass lifetime
    if(G.thrownPass){ G.thrownPass.t+=dt; if(G.thrownPass.t>1.2) G.thrownPass=null; }
    updateHUD();
  }
  if(G&&(G.state==="playing"||G.state==="reading"||G.state==="paused"||G.state==="scare"||G.state==="over"||G.state==="win")){
    render();
  }
}

/* ================= UI wiring ================= */
function refreshTitle(){
  const sv=loadSave();
  $("btn-continue").disabled=!sv;
  const won=(()=>{ try{ return localStorage.getItem(WON_KEY); }catch(e){ return null; } })();
  $("title-save-note").textContent=sv
    ? "Saved night found — "+sv.pages.length+"/8 pages, "+sv.tapes.length+"/5 tapes. Continue where you left off."
    : (won?"You escaped once. The school remembers you. Night 2 (faster janitor) is unlocked on New Game.":"No saved night. The school is waiting.");
}
function syncSettingsUI(){
  $("set-master").value=Math.round(settings.master*100);
  $("set-music").value=Math.round(settings.music*100);
  $("set-sfx").value=Math.round(settings.sfx*100);
  $("set-difficulty").value=settings.difficulty;
  $("set-crt").checked=settings.crt;
  $("set-shake").checked=settings.shake;
  $("crt").classList.toggle("crt-on",settings.crt);
}
$("btn-new").addEventListener("click",()=>{
  Sound.init(); Sound.click();
  const won=(()=>{ try{ return localStorage.getItem(WON_KEY); }catch(e){ return null; } })();
  clearSave();
  startGame(settings.difficulty, !!won);
});
$("btn-continue").addEventListener("click",()=>{
  Sound.init(); Sound.click();
  const sv=loadSave(); if(!sv) return;
  Sound.startAmbient(); Sound.startMusic();
  applySave(sv);
  showScreen(null); $("hud").classList.remove("hidden");
  updateObjective();
  toast("Welcome back. He missed you.",4000);
});
$("btn-how").addEventListener("click",()=>{ Sound.click(); showScreen("screen-how"); });
$("btn-how-back").addEventListener("click",()=>{ Sound.click(); showScreen("screen-title"); });
$("btn-settings").addEventListener("click",()=>{ Sound.click(); syncSettingsUI(); showScreen("screen-settings"); });
$("btn-settings-back").addEventListener("click",()=>{ Sound.click(); persistSettings(); showScreen(G&&G.state==="paused"?"screen-pause":"screen-title"); });
$("btn-start").addEventListener("click",()=>{ Sound.click(); beginPlay(); });
$("btn-resume").addEventListener("click",()=>{ Sound.click(); resumeGame(); });
$("btn-pause-settings").addEventListener("click",()=>{ Sound.click(); syncSettingsUI(); showScreen("screen-settings"); });
$("btn-restart").addEventListener("click",()=>{ Sound.click(); clearSave(); startGame(G?G.difficulty:settings.difficulty, G?G.ngPlus:false); });
$("btn-quit").addEventListener("click",()=>{ Sound.click(); quitToTitle(); });
$("hud-pause").addEventListener("click",()=>{ if(G&&G.state==="playing"){ Sound.click(); pauseGame(); } });
$("btn-retry").addEventListener("click",()=>{
  Sound.click();
  const sv=loadSave();
  if(sv){ applySave(sv); showScreen(null); $("hud").classList.remove("hidden"); updateObjective(); toast("You wake up where you left off. The hum continues.",4000); }
  else { startGame(settings.difficulty,false); }
});
$("btn-over-title").addEventListener("click",()=>{ Sound.click(); quitToTitle(); });
$("btn-win-again").addEventListener("click",()=>{ Sound.click(); clearSave(); startGame(settings.difficulty,true); });
$("btn-win-title").addEventListener("click",()=>{ Sound.click(); quitToTitle(); });
$("set-master").addEventListener("input",e=>{ settings.master=e.target.value/100; Sound.setVolumes(settings.master,settings.music,settings.sfx); persistSettings(); });
$("set-music").addEventListener("input",e=>{ settings.music=e.target.value/100; Sound.setVolumes(settings.master,settings.music,settings.sfx); persistSettings(); });
$("set-sfx").addEventListener("input",e=>{ settings.sfx=e.target.value/100; Sound.setVolumes(settings.master,settings.music,settings.sfx); persistSettings(); });
$("set-difficulty").addEventListener("change",e=>{ settings.difficulty=e.target.value; persistSettings(); });
$("set-crt").addEventListener("change",e=>{ settings.crt=e.target.checked; syncSettingsUI(); persistSettings(); });
$("set-shake").addEventListener("change",e=>{ settings.shake=e.target.checked; persistSettings(); });

/* ================= boot ================= */
Sound.setVolumes(settings.master,settings.music,settings.sfx);
syncSettingsUI();
refreshTitle();
showScreen("screen-title");
requestAnimationFrame(loop);
})();
