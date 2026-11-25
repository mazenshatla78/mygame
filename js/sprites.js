/* THE BELL NEVER RINGS — procedural sprite & tile art.
   Everything is drawn with canvas primitives. No image files. */
(function(){
"use strict";
const T = 32; // tile size

function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }

const Sprites = {
  TILE:T,

  /* ---------- floor / wall tiles ---------- */
  drawFloor(c, x, y, variant, seed){
    // checkerboard linoleum, muted teal/cream — classic school
    const even = ((x/T)+(y/T))%2===0;
    c.fillStyle = even ? "#3d4a4a" : "#465454";
    c.fillRect(x,y,T,T);
    c.strokeStyle="rgba(0,0,0,.25)"; c.strokeRect(x+.5,y+.5,T-1,T-1);
    if(variant===1){ // classroom carpet
      c.fillStyle = even ? "#4a3f3a" : "#52463f"; c.fillRect(x,y,T,T);
      c.fillStyle="rgba(255,255,255,.04)"; c.fillRect(x,y,T,3);
    } else if(variant===2){ // bathroom tile
      c.fillStyle = even ? "#3a4a52" : "#42525a"; c.fillRect(x,y,T,T);
      c.strokeStyle="rgba(255,255,255,.08)"; c.strokeRect(x+4.5,y+4.5,T-9,T-9);
    } else if(variant===3){ // gym wood
      c.fillStyle = even ? "#5a4630" : "#624e34"; c.fillRect(x,y,T,T);
      c.fillStyle="rgba(0,0,0,.2)"; c.fillRect(x,y,T,1);
    }
    // grime specks (deterministic)
    const s = Math.abs(Math.sin(seed*12.9898)*43758.5453)%1;
    if(s>0.82){ c.fillStyle="rgba(0,0,0,.28)"; c.beginPath(); c.arc(x+8+s*16,y+8+s*14,2.5,0,7); c.fill(); }
  },

  drawWall(c, x, y, seed){
    c.fillStyle="#5c5548"; c.fillRect(x,y,T,T);
    c.fillStyle="#6b6353"; c.fillRect(x,y,T,10);
    c.fillStyle="#4a4438"; c.fillRect(x,y+T-6,T,6);
    c.fillStyle="rgba(0,0,0,.3)"; c.fillRect(x,y+10,T,2);
    const s = Math.abs(Math.sin(seed*78.233)*12543.2)%1;
    if(s>0.7){ c.fillStyle="rgba(0,0,0,.22)"; c.fillRect(x+6+s*14,y+14,3,8); }
  },

  /* ---------- props ---------- */
  drawDesk(c,x,y){
    c.fillStyle="#7a5c38"; rr(c,x+2,y+6,T-4,T-12,2); c.fill();
    c.fillStyle="#8f6f45"; c.fillRect(x+3,y+7,T-6,5);
    c.fillStyle="#5d452a"; c.fillRect(x+4,y+T-8,4,6); c.fillRect(x+T-8,y+T-8,4,6);
    c.fillStyle="#f4e9c8"; c.fillRect(x+8,y+9,9,6); // paper on desk
    c.fillStyle="#c0392b"; c.fillRect(x+20,y+10,5,4); // pencil case
  },
  drawChair(c,x,y){
    c.fillStyle="#6b4f30"; rr(c,x+8,y+8,16,14,2); c.fill();
    c.fillStyle="#543d24"; c.fillRect(x+9,y+22,3,7); c.fillRect(x+20,y+22,3,7);
  },
  drawLocker(c,x,y,open){
    c.fillStyle="#3f5a52"; rr(c,x+1,y+1,T-2,T-2,2); c.fill();
    c.fillStyle="#4d6d63"; c.fillRect(x+3,y+3,T-6,T-6);
    c.fillStyle="#2e443d"; c.fillRect(x+3,y+3,3,T-6);
    c.fillStyle="#c9d1c0"; c.fillRect(x+T-9,y+12,4,8); // handle
    c.fillStyle="rgba(0,0,0,.35)"; c.fillRect(x+7,y+8,3,3); c.fillRect(x+7,y+14,3,3); // vents
    if(open){ c.fillStyle="#0a0d0b"; c.fillRect(x+4,y+4,T-8,T-8); }
  },
  drawDoor(c,x,y,open,vertical){
    if(open){ c.fillStyle="#2c2620"; c.fillRect(x,y,T,T); return; }
    c.fillStyle="#6b4f30"; c.fillRect(x,y,T,T);
    c.fillStyle="#7d5f3a"; c.fillRect(x+3,y+3,T-6,T-6);
    c.fillStyle="#f2c14e"; c.beginPath(); c.arc(vertical?x+22:x+22, vertical?y+16:y+16, 3, 0, 7); c.fill();
    c.fillStyle="rgba(0,0,0,.3)"; c.fillRect(x+5,y+5,T-10,3);
  },
  drawExitDoor(c,x,y,unlocked){
    c.fillStyle=unlocked?"#7a2e2e":"#4a3a2a"; c.fillRect(x,y,T,T);
    c.fillStyle=unlocked?"#8f3a3a":"#5c4a34"; c.fillRect(x+3,y+3,T-6,T-6);
    c.fillStyle=unlocked?"#ff5a4e":"#8a7a5a"; c.fillRect(x+6,y+4,T-12,7);
    c.fillStyle="#fff"; c.font="bold 6px monospace"; c.textAlign="center";
    c.fillText(unlocked?"EXIT":"LOCKED", x+T/2, y+10);
    c.fillStyle="#c9d1c0"; c.beginPath(); c.arc(x+T-8,y+16,3,0,7); c.fill();
  },
  drawBlackboard(c,x,y){
    c.fillStyle="#2e4a3a"; c.fillRect(x,y,T,T);
    c.fillStyle="#3a5c48"; c.fillRect(x+2,y+2,T-4,T-4);
    c.fillStyle="rgba(244,233,200,.75)"; c.font="7px cursive"; c.textAlign="left";
    c.fillText("2 + 2 =",x+4,y+12); c.fillText("???",x+4,y+22);
  },
  drawBookcase(c,x,y,hidden){
    c.fillStyle="#5d452a"; c.fillRect(x,y,T,T);
    c.fillStyle="#6f5533"; c.fillRect(x+2,y+2,T-4,T-4);
    const cols=["#a33","#36a","#3a3","#c90","#73a","#a63"];
    for(let i=0;i<4;i++){ c.fillStyle=cols[(i+((x+y)/T|0))%cols.length]; c.fillRect(x+4+i*7,y+5,5,10); c.fillRect(x+4+i*7,y+19,5,10); }
    if(hidden){ c.fillStyle="rgba(0,0,0,.45)"; c.fillRect(x,y,T,T); }
  },
  drawPlant(c,x,y){
    c.fillStyle="#8a5a33"; rr(c,x+9,y+16,14,12,2); c.fill();
    c.fillStyle="#2f7a3a";
    c.beginPath(); c.arc(x+16,y+12,8,0,7); c.fill();
    c.fillStyle="#3a9a48"; c.beginPath(); c.arc(x+11,y+9,5,0,7); c.arc(x+21,y+9,5,0,7); c.fill();
  },
  drawClock(c,x,y,t){
    c.fillStyle="#e8e2d0"; c.beginPath(); c.arc(x+16,y+16,13,0,7); c.fill();
    c.fillStyle="#2a2118"; c.beginPath(); c.arc(x+16,y+16,13,0,7); c.stroke();
    const a=(t/60)*Math.PI*2;
    c.strokeStyle="#2a2118"; c.lineWidth=2;
    c.beginPath(); c.moveTo(x+16,y+16); c.lineTo(x+16+Math.cos(a)*8,y+16+Math.sin(a)*8); c.stroke();
    c.beginPath(); c.moveTo(x+16,y+16); c.lineTo(x+16,y+16-9); c.stroke();
  },
  drawVending(c,x,y){
    c.fillStyle="#b03030"; rr(c,x+2,y,T-4,T,3); c.fill();
    c.fillStyle="#7ec8e3"; c.fillRect(x+5,y+5,T-10,16);
    for(let i=0;i<3;i++){ c.fillStyle=["#f2c14e","#e4572e","#8fd694"][i]; c.fillRect(x+7+i*8,y+8,6,5); }
    c.fillStyle="#2a2118"; c.fillRect(x+5,y+24,T-10,5);
  },
  drawToilet(c,x,y){
    c.fillStyle="#d8d8d8"; rr(c,x+6,y+4,20,10,3); c.fill();
    c.fillStyle="#c0c0c0"; rr(c,x+8,y+12,16,16,6); c.fill();
    c.fillStyle="#9ab"; c.beginPath(); c.ellipse(x+16,y+20,5,7,0,0,7); c.fill();
  },
  drawSink(c,x,y){
    c.fillStyle="#d8d8d8"; rr(c,x+3,y+8,T-6,18,3); c.fill();
    c.fillStyle="#9ab"; c.beginPath(); c.ellipse(x+16,y+17,7,5,0,0,7); c.fill();
    c.fillStyle="#888"; c.fillRect(x+14,y+4,4,5);
  },
  drawMirror(c,x,y){
    c.fillStyle="#8a7a5a"; c.fillRect(x+3,y+2,T-6,T-4);
    c.fillStyle="#a8c8d8"; c.fillRect(x+5,y+4,T-10,T-8);
    c.fillStyle="rgba(255,255,255,.25)"; c.beginPath(); c.moveTo(x+8,y+T-6); c.lineTo(x+16,y+6); c.lineTo(x+20,y+6); c.lineTo(x+12,y+T-6); c.fill();
  },
  drawTrash(c,x,y){
    c.fillStyle="#5a6068"; rr(c,x+8,y+10,16,18,2); c.fill();
    c.fillStyle="#454a50"; c.fillRect(x+7,y+8,18,4);
    c.fillStyle="#f4e9c8"; c.fillRect(x+12,y+4,7,5); // crumpled paper
  },
  drawPuddle(c,x,y,seed){
    c.fillStyle="rgba(90,120,140,.5)";
    c.beginPath(); c.ellipse(x+16,y+18,11+((seed*7)%5),6,0,0,7); c.fill();
    c.fillStyle="rgba(180,210,230,.25)"; c.beginPath(); c.ellipse(x+13,y+16,5,2.5,0,0,7); c.fill();
  },
  drawRadio(c,x,y){
    c.fillStyle="#6b4f30"; rr(c,x+4,y+10,T-8,12,2); c.fill();
    c.fillStyle="#2a2118"; c.beginPath(); c.arc(x+12,y+16,4,0,7); c.fill();
    c.fillStyle="#f2c14e"; c.fillRect(x+20,y+13,7,2);
    c.strokeStyle="#c9d1c0"; c.lineWidth=1.5;
    c.beginPath(); c.moveTo(x+24,y+10); c.lineTo(x+29,y+2); c.stroke();
  },
  drawGymMat(c,x,y){
    c.fillStyle="#3a5a8a"; rr(c,x+1,y+4,T-2,T-8,3); c.fill();
    c.fillStyle="#2e4a72"; c.fillRect(x+1,y+14,T-2,3);
  },
  drawCafTable(c,x,y){
    c.fillStyle="#9aa0a8"; rr(c,x+1,y+7,T-2,T-14,3); c.fill();
    c.fillStyle="#7a8088"; c.fillRect(x+4,y+T-7,4,5); c.fillRect(x+T-8,y+T-7,4,5);
    c.fillStyle="#e4572e"; c.fillRect(x+10,y+10,6,5); // tray
  },
  drawFireExt(c,x,y){
    c.fillStyle="#c0392b"; rr(c,x+12,y+8,8,18,3); c.fill();
    c.fillStyle="#2a2118"; c.fillRect(x+14,y+4,4,5);
    c.fillStyle="#f4e9c8"; c.fillRect(x+13,y+13,6,5);
  },

  /* ---------- pickups ---------- */
  drawPage(c,x,y,t){
    const bob = Math.sin(t*3)*2;
    c.save(); c.translate(x+16,y+14+bob); c.rotate(Math.sin(t*2)*0.15);
    c.fillStyle="#f4e9c8"; c.fillRect(-7,-9,14,18);
    c.fillStyle="#2a2118"; c.fillRect(-5,-6,10,2); c.fillRect(-5,-2,10,1); c.fillRect(-5,1,7,1);
    c.fillStyle="#c0392b"; c.fillRect(-5,5,10,2);
    c.restore();
    c.fillStyle="rgba(242,193,78,"+(0.25+Math.sin(t*4)*0.12)+")";
    c.beginPath(); c.arc(x+16,y+14,16,0,7); c.fill();
  },
  drawTape(c,x,y,t){
    const bob = Math.sin(t*3+1)*2;
    c.save(); c.translate(x+16,y+16+bob);
    c.fillStyle="#1a1a22"; rr(c,-11,-8,22,16,2); c.fill();
    c.fillStyle="#f4e9c8"; c.fillRect(-8,-5,16,7);
    c.fillStyle="#c0392b"; c.fillRect(-8,-5,16,3);
    c.fillStyle="#e8e2d0"; c.beginPath(); c.arc(-4,5,3,0,7); c.arc(4,5,3,0,7); c.fill();
    c.restore();
    c.fillStyle="rgba(126,200,227,"+(0.2+Math.sin(t*4+1)*0.1)+")";
    c.beginPath(); c.arc(x+16,y+16,16,0,7); c.fill();
  },
  drawSoda(c,x,y){
    c.fillStyle="#e4572e"; rr(c,x+11,y+8,10,18,2); c.fill();
    c.fillStyle="#f4e9c8"; c.fillRect(x+11,y+14,10,5);
    c.fillStyle="#c9d1c0"; c.fillRect(x+13,y+5,6,4);
  },
  drawBattery(c,x,y){
    c.fillStyle="#f2c14e"; rr(c,x+9,y+10,14,10,2); c.fill();
    c.fillStyle="#2a2118"; c.fillRect(x+23,y+13,3,4);
    c.fillStyle="#2a2118"; c.font="bold 8px monospace"; c.textAlign="center"; c.fillText("+",x+16,y+18);
  },
  drawPass(c,x,y){
    c.save(); c.translate(x+16,y+16); c.rotate(-0.2);
    c.fillStyle="#f4e9c8"; rr(c,-11,-7,22,14,2); c.fill();
    c.fillStyle="#3a5a8a"; c.fillRect(-11,-7,22,5);
    c.fillStyle="#2a2118"; c.font="bold 5px monospace"; c.textAlign="center"; c.fillText("HALL PASS",0,4);
    c.restore();
  },
  drawMopBucket(c,x,y){
    c.fillStyle="#f2c14e"; rr(c,x+7,y+12,18,16,3); c.fill();
    c.fillStyle="#d8a83a"; c.fillRect(x+6,y+10,20,4);
    c.strokeStyle="#8a6a2a"; c.lineWidth=2;
    c.beginPath(); c.moveTo(x+20,y+12); c.lineTo(x+26,y+2); c.stroke();
    c.fillStyle="#c9b98a"; c.beginPath(); c.arc(x+26,y+3,3,0,7); c.fill();
  },

  /* ---------- characters (top-down, ~28px tall) ---------- */
  drawKid(c, x, y, dir, walkPhase, flashOn){
    const bob = Math.abs(Math.sin(walkPhase))*2;
    c.save(); c.translate(x, y-bob);
    // shadow
    c.fillStyle="rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(0,14,11,5,0,0,7); c.fill();
    // legs
    c.fillStyle="#3a3a4a";
    const lp = Math.sin(walkPhase)*4;
    c.fillRect(-6+lp,8,5,8); c.fillRect(1-lp,8,5,8);
    // body: blue shirt + backpack
    c.fillStyle="#3a6ab0"; rr(c,-8,-6,16,16,4); c.fill();
    c.fillStyle="#c0392b"; rr(c,-10,-4,5,12,2); c.fill(); // backpack side
    // head + cap
    c.fillStyle="#f0c8a0"; c.beginPath(); c.arc(0,-10,7,0,7); c.fill();
    c.fillStyle="#f2c14e"; c.beginPath(); c.arc(0,-12,7,Math.PI,0); c.fill();
    c.fillRect(dir>=0?-2:-9,-13, dir>=0?11:11, 3); // brim
    // eyes
    c.fillStyle="#1a1a1a";
    if(dir>=0){ c.fillRect(2,-11,2,2); } else { c.fillRect(-4,-11,2,2); }
    // flashlight in hand
    if(flashOn){ c.fillStyle="#c9d1c0"; c.fillRect(dir>=0?8:-12,-2,5,4); }
    c.restore();
  },

  drawJanitor(c, x, y, dir, walkPhase, chase){
    const bob = Math.abs(Math.sin(walkPhase))*2.5;
    c.save(); c.translate(x, y-bob);
    c.fillStyle="rgba(0,0,0,.45)"; c.beginPath(); c.ellipse(0,16,13,6,0,0,7); c.fill();
    // long legs
    c.fillStyle="#3a3f45";
    const lp = Math.sin(walkPhase)*5;
    c.fillRect(-7+lp,10,6,12); c.fillRect(1-lp,10,6,12);
    // tall body — grey jumpsuit
    c.fillStyle=chase?"#4a4f55":"#42464c"; rr(c,-10,-12,20,24,5); c.fill();
    c.fillStyle="#f2c14e"; c.fillRect(-10,-2,20,4); // hi-vis stripe
    // arms
    c.fillStyle="#3a3f45";
    c.fillRect(dir>=0?8:-14,-8,6,16); c.fillRect(dir>=0?-14:8,-8,6,16);
    // mop
    c.strokeStyle="#8a6a2a"; c.lineWidth=3;
    c.beginPath(); c.moveTo(dir>=0?11:-11,-4); c.lineTo(dir>=0?18:-18,12); c.stroke();
    c.fillStyle="#c9b98a";
    c.beginPath(); c.moveTo(dir>=0?15:-15,10); c.lineTo(dir>=0?21:-21,10); c.lineTo(dir>=0?18:-18,18); c.closePath(); c.fill();
    // head — pale, too-long face
    c.fillStyle="#d8d0c0"; c.beginPath(); c.arc(0,-18,8,0,7); c.fill();
    c.fillRect(-5,-18,10,10);
    // cap
    c.fillStyle="#2e3238"; c.beginPath(); c.arc(0,-20,8,Math.PI,0); c.fill();
    c.fillRect(dir>=0?-3:-10,-21,13,3);
    // eyes — glow when chasing
    c.fillStyle=chase?"#ff3b30":"#1a1a1a";
    if(dir>=0){ c.fillRect(2,-19,3,3); c.fillRect(6,-19,2,2); }
    else { c.fillRect(-5,-19,3,3); c.fillRect(-8,-19,2,2); }
    if(chase){ c.fillStyle="rgba(255,59,48,.25)"; c.beginPath(); c.arc(dir>=0?4:-4,-18,10,0,7); c.fill(); }
    c.restore();
  },

  /* ---------- janitor jumpscare face ---------- */
  drawScareFace(c, w, h, t){
    c.fillStyle="#0a0a0a"; c.fillRect(0,0,w,h);
    const cx=w/2, cy=h/2, s=Math.min(w,h)/300;
    c.save(); c.translate(cx,cy); c.scale(s,s);
    c.fillStyle="#d8d0c0"; c.beginPath(); c.ellipse(0,0,90,120,0,0,7); c.fill();
    c.fillStyle="#2e3238"; c.beginPath(); c.ellipse(0,-95,95,45,0,Math.PI,0); c.fill();
    c.fillStyle="#000";
    c.beginPath(); c.ellipse(-38,-20,16,22,0,0,7); c.ellipse(38,-20,16,22,0,0,7); c.fill();
    c.fillStyle="#ff3b30";
    c.beginPath(); c.ellipse(-38,-20,7,10,0,0,7); c.ellipse(38,-20,7,10,0,0,7); c.fill();
    c.fillStyle="#000"; c.beginPath(); c.ellipse(0,55,42,34,0,0,7); c.fill();
    c.fillStyle="#7a2020"; c.beginPath(); c.ellipse(0,62,30,20,0,0,7); c.fill();
    // cracks
    c.strokeStyle="rgba(0,0,0,.4)"; c.lineWidth=3;
    c.beginPath(); c.moveTo(-80,-60); c.lineTo(-50,-10); c.lineTo(-70,40); c.stroke();
    c.restore();
    // static
    for(let i=0;i<40;i++){ c.fillStyle="rgba(255,255,255,"+(Math.random()*0.25)+")"; c.fillRect(Math.random()*w,Math.random()*h,3,2); }
  }
};
window.Sprites = Sprites;
})();
