/* THE BELL NEVER RINGS — procedural texture library.
   Every texture is computed per-pixel with math (no canvas, no image files),
   so they are deterministic, testable headlessly, and 100% original.
   Format: { data:Uint32Array (0xAABBGGRR), w, h, shift:log2(w) }. 0 = colour key. */
(function(){
"use strict";

const pack = (r,g,b,a) => (((a===undefined?255:a)&255)<<24 | (b&255)<<16 | (g&255)<<8 | (r&255)) >>> 0;

/* deterministic hash noise */
function h2(x,y,s){
  let n = (x|0)*374761393 + (y|0)*668265263 + (s|0)*1442695040888963407%1000003;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vn(x,y,s){
  const xi=Math.floor(x), yi=Math.floor(y), xf=x-xi, yf=y-yi;
  const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
  const a=h2(xi,yi,s), b=h2(xi+1,yi,s), c=h2(xi,yi+1,s), d=h2(xi+1,yi+1,s);
  return a*(1-u)*(1-v) + b*u*(1-v) + c*(1-u)*v + d*u*v;
}
function fbm(x,y,s){ return vn(x,y,s)*0.55 + vn(x*2.1,y*2.1,s+7)*0.3 + vn(x*4.3,y*4.3,s+13)*0.15; }
const cl = (v,a,b) => v<a?a:(v>b?b:v);

function mk(w,h,fn){
  const data = new Uint32Array(w*h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) data[y*w+x] = fn(x,y)|0;
  return { data, w, h, shift: Math.log2(w)|0 };
}

/* ---------------- 3x5 bitmap font ---------------- */
const G = {
 "A":"010,101,111,101,101","B":"110,101,110,101,110","C":"011,100,100,100,011","D":"110,101,101,101,110",
 "E":"111,100,110,100,111","F":"111,100,110,100,100","G":"011,100,101,101,011","H":"101,101,111,101,101",
 "I":"111,010,010,010,111","J":"001,001,001,101,010","K":"101,101,110,101,101","L":"100,100,100,100,111",
 "M":"101,111,111,101,101","N":"110,101,101,101,101","O":"010,101,101,101,010","P":"110,101,110,100,100",
 "Q":"010,101,101,110,011","R":"110,101,110,101,101","S":"011,100,010,001,110","T":"111,010,010,010,010",
 "U":"101,101,101,101,111","V":"101,101,101,101,010","W":"101,101,111,111,101","X":"101,101,010,101,101",
 "Y":"101,101,010,010,010","Z":"111,001,010,100,111",
 "0":"111,101,101,101,111","1":"010,110,010,010,111","2":"110,001,010,100,111","3":"110,001,010,001,110",
 "4":"101,101,111,001,001","5":"111,100,110,001,110","6":"011,100,110,101,010","7":"111,001,010,010,010",
 "8":"010,101,010,101,010","9":"010,101,011,001,110",
 " ":"000,000,000,000,000",".":"000,000,000,000,010",",":"000,000,000,010,100","!":"010,010,010,000,010",
 "?":"110,001,010,000,010","'":"010,010,000,000,000","-":"000,000,111,000,000",":":"000,010,000,010,000",
 "/":"001,001,010,100,100","+":"000,010,111,010,000","=":"000,111,000,111,000","(":"010,100,100,100,010",
 ")":"010,001,001,001,010","%":"101,001,010,100,101","#":"101,111,101,111,101","*":"101,010,111,010,101",
 "<":"001,010,100,010,001",">":"100,010,001,010,100","_":"000,000,000,000,111"
};
function drawText(data, w, text, x, y, scale, color){
  text = String(text).toUpperCase();
  let cx = x;
  for(let i=0;i<text.length;i++){
    const g = G[text[i]] || G["?"];
    const rows = g.split(",");
    for(let ry=0;ry<5;ry++) for(let rx=0;rx<3;rx++){
      if(rows[ry][rx] === "1"){
        for(let sy=0;sy<scale;sy++) for(let sx=0;sx<scale;sx++){
          const px = cx+rx*scale+sx, py = y+ry*scale+sy;
          if(px>=0&&px<w&&py>=0&&py<data.length/w) data[py*w+px] = color;
        }
      }
    }
    cx += 4*scale;
  }
}
function textWidth(text, scale){ return String(text).length*4*scale - scale; }
/* shortest signed distance between two angles; a naive a-b wraps and silently
   erases clock hands that point near 6 o'clock */
function angDiff(a,b){ let d=(a-b)%(Math.PI*2); if(d>Math.PI)d-=Math.PI*2; if(d<-Math.PI)d+=Math.PI*2; return d; }

/* ---------------- generators ---------------- */
const Tex = { pack, mk, drawText, textWidth, h2, vn, fbm, cache:{} };

Tex.all = function(){
  const T = {};

  /* --- floors --- */
  T.floor_hall = mk(64,64,(x,y)=>{
    const n = fbm(x*0.09,y*0.09,3);
    const sq = ((x>>5)+(y>>5))&1;
    let r = sq?196:184, g = sq?192:186, b = sq?176:172;
    const scuff = fbm(x*0.25,y*0.25,11);
    if(scuff>0.66){ r-=16; g-=16; b-=14; }
    r += (n-0.5)*22; g += (n-0.5)*22; b += (n-0.5)*20;
    if(x%32===0||y%32===0){ r-=26; g-=26; b-=24; }
    if(h2(x,y,21)>0.985){ r-=40; g-=38; b-=30; }
    return pack(r,g,b);
  });
  T.floor_class = mk(64,64,(x,y)=>{
    const n = fbm(x*0.4,y*0.4,5);
    let r=126+n*26, g=76+n*18, b=66+n*16;
    if(((x+y)>>2)%3===0){ r-=8; g-=6; b-=5; }
    return pack(r,g,b);
  });
  T.floor_cafe = mk(64,64,(x,y)=>{
    const c = ((x>>4)+(y>>4))&1;
    const n = fbm(x*0.2,y*0.2,9)*14;
    return c ? pack(222+n*0.4,218+n*0.4,205+n*0.4) : pack(70+n,72+n,80+n);
  });
  T.floor_gym = mk(64,64,(x,y)=>{
    const plank = (x>>3);
    const n = fbm(x*0.05,y*0.6,17);
    let r=178+n*30+(plank%3)*6, g=136+n*24+(plank%3)*5, b=84+n*16;
    if(x%8===0){ r-=40; g-=34; b-=24; }
    if(y===31||y===32){ r=232; g=228; b=214; }         // court line
    return pack(r,g,b);
  });
  T.floor_bath = mk(64,64,(x,y)=>{
    const c = ((x>>3)+(y>>3))&1;
    const n = h2(x,y,31)*10;
    if(x%8===0||y%8===0) return pack(150+n,154+n,156+n);
    return c? pack(224+n*0.3,226+n*0.3,224+n*0.3) : pack(206+n*0.3,214+n*0.3,214+n*0.3);
  });

  /* --- ceiling --- */
  T.ceil_tile = mk(64,64,(x,y)=>{
    const n = fbm(x*0.5,y*0.5,19);
    let v = 214 + n*16;
    if(x%32<2||y%32<2) v = 150;                          // T-bar grid
    if(h2(x,y,41)>0.97) v -= 40;                         // speckle
    return pack(v,v*0.99,v*0.94);
  });
  T.ceil_light = mk(32,32,(x,y)=>{
    const edge = (x<2||y<2||x>29||y>29);
    if(edge) return pack(190,190,196);
    const n = fbm(x*0.3,y*0.3,23)*10;
    return pack(250+n*0.2,250+n*0.2,238);
  });

  /* --- walls --- */
  function wallTex(baseR,baseG,baseB,wainR,wainG,wainB,blocky){
    return mk(64,64,(x,y)=>{
      const n = fbm(x*0.18,y*0.18,29);
      let r,g,b;
      if(y>46){ r=wainR; g=wainG; b=wainB; }             // wainscot
      else { r=baseR; g=baseG; b=baseB; }
      r += (n-0.5)*20; g += (n-0.5)*20; b += (n-0.5)*18;
      if(blocky){
        if((x%16===0)||(y%8===0 && ((y/8|0)%2===0 ? x%32<16 : x%32>=16))) { r-=14; g-=14; b-=12; }
      }
      if(y===46||y===47){ r-=34; g-=32; b-=26; }         // chair rail
      if(y>60){ r-=46; g-=44; b-=38; }                   // baseboard
      if(h2(x,y,53)>0.993){ r-=30; g-=26; b-=20; }       // scuffs
      return pack(r,g,b);
    });
  }
  T.wall_hall  = wallTex(226,214,182, 122,150,146, false);
  T.wall_class = wallTex(236,226,190, 150,120,96, false);
  T.wall_gym   = wallTex(196,206,180, 96,116,96, true);
  T.wall_bath  = mk(64,64,(x,y)=>{
    const c=((x>>3)+(y>>3))&1, n=h2(x,y,61)*10;
    if(x%8===0||y%8===0) return pack(168+n,176+n,178+n);
    return c? pack(214+n*0.4,224+n*0.4,224+n*0.4) : pack(196+n*0.4,214+n*0.4,216+n*0.4);
  });
  T.wall_block = mk(64,64,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,67);
    let v = 158+n*26;
    const row = (y/8)|0;
    const off = (row%2)*16;
    if(y%8===0 || (x+off)%32===0) v -= 40;
    return pack(v,v*0.98,v*0.94);
  });
  T.wall_brick = mk(64,64,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,71);
    const row=(y/8)|0, off=(row%2)*16;
    let r=168+n*26, g=96+n*18, b=82+n*14;
    if(y%8===0||(x+off)%32===0){ r=196; g=190; b=178; }
    return pack(r,g,b);
  });

  /* --- daylight window: blown out, mullions, sky hint --- */
  T.window = mk(64,64,(x,y)=>{
    if(x<3||x>60||y<3||y>60) return pack(196,190,176);           // frame
    if(x===31||x===32||y===24||y===25) return pack(206,200,186);  // mullions
    const n = fbm(x*0.06,y*0.06,73);
    const r = 246+n*9, g = 250+n*6, b = 236+n*16;
    if(y>44 && h2(x,y,79)>0.72) return pack(180,206,150);         // treetop green outside
    return pack(r>255?255:r, g>255?255:g, b>255?255:b);
  });

  /* --- doors --- */
  T.door_wood = mk(32,64,(x,y)=>{
    const n = fbm(x*0.08,y*0.25,83);
    let r=166+n*26, g=116+n*18, b=72+n*12;
    if(x<2||x>29||y<2) { r-=46; g-=40; b-=30; }
    if(y>10&&y<26&&x>5&&x<26){                                     // window pane
      if(x===5||x===25||y===10||y===25){ r=120;g=86;b=54; }
      else { r=214+n*20; g=226+n*16; b=224+n*16; }
    }
    if(y>34&&y<58&&x>5&&x<26&&(x===5||x===25||y===34||y===58)){ r-=40;g-=34;b-=26; }
    if(x>24&&x<28&&y>38&&y<42){ r=226;g=206;b=120; }               // handle
    return pack(r,g,b);
  });
  T.door_metal = mk(32,64,(x,y)=>{
    const n = fbm(x*0.15,y*0.1,87);
    let v = 150+n*24;
    if(x<2||x>29||y<2||y>61) v -= 46;
    if(y===20||y===44) v -= 26;
    if(x>24&&x<28&&y>30&&y<34){ return pack(214,196,120); }
    return pack(v*0.94,v*0.97,v);
  });
  T.door_exit = mk(64,64,(x,y)=>{
    if(x<3||x>60||y<3) return pack(120,124,132);
    const n = fbm(x*0.05,y*0.05,89);
    if(y>52) return pack(96,98,104);
    if((x>28&&x<36)&&y>26&&y<40) return pack(196,178,110);          // push bar
    const r=228+n*20, g=238+n*16, b=238+n*16;
    return pack(r>255?255:r,g>255?255:g,b>255?255:b);                // daylight glass
  });

  /* --- lockers --- */
  T.locker = mk(64,64,(x,y)=>{
    const cell = (x/32)|0;
    const lx = x%32;
    const n = fbm(x*0.2,y*0.2,97);
    let r=96+n*16, g=124+n*18, b=148+n*20;
    if(lx<1||lx>30) { r-=34; g-=34; b-=30; }                        // seams
    if(y<3||y>60){ r-=26; g-=26; b-=22; }
    if(y>6&&y<16&&lx>7&&lx<13){ r-=46; g-=44; b-=38; }              // vents
    if(y>7&&y<15&&lx>7&&lx<13&&(y%2===0)){ r+=30; g+=34; b+=38; }
    if(lx>18&&lx<26&&y>26&&y<34){ r=196; g=190; b=168; }            // number plate
    if(lx>13&&lx<17&&y>36&&y<44){ r=70; g=76; b=84; }               // handle
    if(y>50&&lx>10&&lx<22){ r-=20; g-=18; b-=14; }                  // scuff
    return pack(r,g,b);
  });
  T.locker_side = mk(32,32,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,101);
    return pack(84+n*14,110+n*16,134+n*18);
  });
  T.locker_in = mk(32,32,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,103);
    return pack(38+n*16,40+n*16,48+n*18);
  });

  /* --- furniture & props --- */
  T.desk = mk(32,32,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,107);
    let r=206+n*20, g=186+n*18, b=146+n*14;
    if(x<1||y<1||x>30||y>30){ r-=54; g-=50; b-=42; }
    if(h2(x,y,109)>0.98){ r-=40; g-=44; b-=40; }                     // pencil marks
    return pack(r,g,b);
  });
  T.metal = mk(32,32,(x,y)=>{
    const n = fbm(x*0.25,y*0.25,113);
    const v = 138+n*30;
    return pack(v*0.96,v*0.98,v);
  });
  T.chalkboard = mk(64,64,(x,y)=>{
    if(x<3||y<3||x>60||y>60) return pack(150,112,72);                // wood frame
    const n = fbm(x*0.12,y*0.12,127);
    let r=42+n*16, g=68+n*20, b=58+n*18;
    if(h2(x,y,131)>0.988){ r+=120; g+=120; b+=116; }                 // chalk dust
    if(y>14&&y<20&&x>8&&x<40){ r+=96; g+=96; b+=90; }                // a chalk line
    if(y>30&&y<36&&x>12&&x<52){ r+=80; g+=80; b+=76; }
    return pack(r,g,b);
  });
  T.bulletin = mk(64,64,(x,y)=>{
    const n = fbm(x*0.35,y*0.35,137);
    let r=176+n*34, g=132+n*26, b=84+n*18;                           // cork
    const cx=(x/16)|0, cy=(y/16)|0;
    const seed = h2(cx,cy,139);
    if(seed>0.42){
      const cs = [ [226,96,84],[96,148,214],[240,206,88],[120,190,120],[224,150,206] ][(seed*5)|0];
      if(x%16>2&&x%16<13&&y%16>2&&y%16<13){ r=cs[0]; g=cs[1]; b=cs[2];
        if(y%16>5&&y%16<6&&x%16>4&&x%16<11){ r-=40;g-=40;b-=40; }     // "writing"
      }
    }
    return pack(r,g,b);
  });
  T.mural = mk(64,64,(x,y)=>{
    let r=236,g=230,b=206;
    const n = fbm(x*0.1,y*0.1,149);
    r+= (n-0.5)*16; g+=(n-0.5)*16; b+=(n-0.5)*14;
    if(y<16){ const t=(x/4)|0; r=[226,240,120,96,206][t%5]; g=[96,206,190,148,120][t%5]; b=[84,88,224,214,206][t%5]; } // rainbow
    if(y>44){ r=120+n*30; g=176+n*30; b=96+n*20; }                    // grass
    if(x>40&&x<52&&y>22&&y<44){ r=224; g=170; b=120; }                // a child (crayon)
    if(x>43&&x<49&&y>16&&y<24){ r=240; g=206; b=168; }                // head
    if(x>10&&x<22&&y>20&&y<40){ r=110; g=150; b=214; }                // another child
    if(x>13&&x<19&&y>14&&y<22){ r=240; g=206; b=168; }
    if(x>26&&x<34&&y>8&&x<34){ if((x-30)*(x-30)+(y-12)*(y-12)<14){ r=250;g=232;b=110; } } // sun
    return pack(r,g,b);
  });
  T.vending = mk(32,64,(x,y)=>{
    const n = fbm(x*0.2,y*0.15,151);
    let r=178+n*16, g=54+n*10, b=52+n*10;
    if(x<1||x>30||y<1||y>62){ r-=52; g-=24; b-=22; }
    if(y>6&&y<34&&x>3&&x<20){                                          // glass with cans
      r=42+n*14; g=52+n*14; b=64+n*16;
      const row=(y/7)|0;
      if(y%7>1&&y%7<6){ const cs=[[226,60,54],[240,240,240],[86,150,226],[240,196,60]][row%4]; r=cs[0];g=cs[1];b=cs[2]; }
    }
    if(y>38&&y<50&&x>4&&x<14){ r=240; g=236; b=214; }                  // label
    if(y>52&&x>20&&x<28){ r=60; g=64; b=72; }                          // slot
    return pack(r,g,b);
  });
  T.clock = mk(32,32,(x,y)=>{
    const dx=x-15.5, dy=y-15.5, d=Math.sqrt(dx*dx+dy*dy);
    if(d>15) return pack(64,54,44);
    if(d>13) return pack(196,186,160);
    let r=242,g=240,b=228;
    const a = Math.atan2(dy,dx);
    for(let i=0;i<12;i++){ const ta=i*Math.PI/6; if(Math.abs(((a-ta+Math.PI*3)%(Math.PI/6))-Math.PI/6)<0.05 && d>10.5){ r=90;g=88;b=84; } }
    /* hands frozen at 4:47 — and they must actually be there */
    const hh=(4+47/60)/12*Math.PI*2 - Math.PI/2, mh=47/60*Math.PI*2 - Math.PI/2;
    if(Math.abs(angDiff(Math.atan2(dy,dx),hh))<0.12 && d<8) { r=40;g=38;b=36; }
    if(Math.abs(angDiff(Math.atan2(dy,dx),mh))<0.09 && d<12){ r=40;g=38;b=36; }
    if(d<1.8){ r=196; g=52; b=44; }
    return pack(r,g,b);
  });
  T.mirror = mk(32,64,(x,y)=>{
    const n = fbm(x*0.09,y*0.05,157);
    let v = 168+n*40;
    if(x<2||x>29) v -= 40;
    if((x+y*1.7)%26<2) v += 26;                                        // streaks
    return pack(v*0.94,v*0.98,v*1.04>255?255:v*1.04);
  });
  T.trophy = mk(64,64,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,163);
    let r=96+n*16,g=74+n*12,b=54+n*10;
    if(y<4||y>58){ r=120;g=96;b=68; }
    if(y>8&&y<54&&x>6&&x<58){ r=52+n*20; g=62+n*20; b=74+n*22; }       // glass
    if(y>30&&y<50&&x>14&&x<22){ r=232;g=196;b=84; }                    // trophies
    if(y>26&&y<32&&x>12&&x<24){ r=240;g=206;b=96; }
    if(y>34&&y<50&&x>34&&x<42){ r=214;g=214;b=220; }
    if(y>30&&y<36&&x>32&&x<44){ r=226;g=226;b=232; }
    if((x+y)%17<1&&y>8&&y<54){ r+=26;g+=26;b+=30; }                    // glass glare
    return pack(r,g,b);
  });
  T.fountain = mk(32,32,(x,y)=>{
    const n = fbm(x*0.25,y*0.25,167);
    let v = 176+n*22;
    if(y>20&&x>8&&x<24){ v -= 40; }
    if(y>22&&y<26&&x>12&&x<20){ return pack(120,168,196); }            // water
    return pack(v*0.94,v*0.97,v);
  });
  T.bookcase = mk(64,64,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,173);
    let r=124+n*20,g=88+n*14,b=58+n*10;
    const shelf = (y/16)|0;
    if(y%16>2&&y%16<14){
      const bi = ((x/4)|0) + shelf*7;
      const cs = [[178,72,64],[72,110,168],[206,178,86],[96,150,102],[150,96,150],[214,140,72],[86,140,150]][bi%7];
      r=cs[0]+n*18; g=cs[1]+n*18; b=cs[2]+n*18;
      if(x%4===0){ r-=40;g-=40;b-=40; }
    } else { r-=34;g-=30;b-=24; }
    return pack(r,g,b);
  });
  T.trash = mk(32,32,(x,y)=>{
    const n = fbm(x*0.2,y*0.3,179);
    let v = 62+n*22;
    if(y%6===0) v += 16;
    if(y<4) v += 30;
    return pack(v*0.9,v*0.94,v);
  });
  T.gymmat = mk(32,32,(x,y)=>{
    const n = fbm(x*0.15,y*0.15,181);
    let r=64+n*16,g=86+n*20,b=140+n*26;
    if(x%16<1||y%16<1){ r-=24;g-=24;b-=20; }
    return pack(r,g,b);
  });
  T.caftable = mk(32,32,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,191);
    let r=214+n*18,g=206+n*16,b=186+n*14;
    if(x<2||y<2||x>29||y>29){ r-=40;g-=38;b-=34; }
    return pack(r,g,b);
  });
  T.chair = mk(16,16,(x,y)=>{
    const n = h2(x,y,193)*18;
    return pack(126+n,84+n*0.7,62+n*0.5);
  });
  T.extinguisher = mk(16,32,(x,y)=>{
    const n = fbm(x*0.3,y*0.2,197);
    let r=196+n*24,g=48+n*10,b=42+n*10;
    if(y<5){ r=64;g=66;b=72; }
    if(y>12&&y<18&&x>2&&x<14){ r=236;g=232;b=214; }
    return pack(r,g,b);
  });
  T.pot = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,199);
    return pack(150+n*26,96+n*18,70+n*14);
  });
  T.leaf = mk(16,16,(x,y)=>{
    const n = fbm(x*0.4,y*0.4,211);
    let g = 120+n*70;
    return pack(52+n*26, g, 56+n*26);
  });
  T.speaker = mk(32,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,223);
    let v = 196+n*20;
    if((x+y)%3===0) v -= 46;
    if(x<2||y<2||x>29||y>13) v = 150;
    return pack(v,v*0.98,v*0.94);
  });
  T.toilet = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,227);
    return pack(224+n*14,228+n*12,226+n*12);
  });
  T.bell = mk(32,32,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,229);
    let r=196+n*34,g=158+n*28,b=68+n*18;
    if(y>24){ r-=30;g-=26;b-=14; }
    if(y<5&&x>12&&x<20){ r=120;g=104;b=72; }
    if((x+y)%9<1){ r+=22;g+=20;b+=12; }
    return pack(r,g,b);
  });
  T.mophead = mk(16,32,(x,y)=>{
    const n = fbm(x*0.6,y*0.25,233);
    let v = 206+n*40;
    if(x%3===0) v -= 46;
    return pack(v,v*0.98,v*0.9);
  });
  T.bucket = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,239);
    return pack(206+n*20,64+n*12,52+n*12);
  });
  T.jumpsuit = mk(32,32,(x,y)=>{
    const n = fbm(x*0.25,y*0.25,241);
    let r=126+n*20,g=136+n*20,b=150+n*22;
    if(y>20&&y<24){ r-=26;g-=24;b-=18; }                              // belt
    if(x%8<1&&y>4){ r-=18;g-=18;b-=16; }                              // seam
    return pack(r,g,b);
  });
  T.skin_mop = mk(16,16,(x,y)=>{
    const n = fbm(x*0.4,y*0.4,251);
    return pack(214+n*22,182+n*18,158+n*16);
  });
  T.cap = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,257);
    return pack(72+n*14,84+n*16,110+n*18);
  });
  T.kid_skin = mk(16,16,(x,y)=>{
    const n = fbm(x*0.4,y*0.4,263);
    return pack(232+n*16,196+n*14,166+n*12);
  });
  T.kid_shirt = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,269);
    return pack(224+n*16,120+n*14,96+n*12);
  });
  T.kid_hair = mk(16,16,(x,y)=>{
    const n = fbm(x*0.4,y*0.4,271);
    return pack(76+n*18,52+n*12,38+n*10);
  });
  T.sash = mk(16,32,(x,y)=>{
    const n = fbm(x*0.3,y*0.2,277);
    let r=64+n*16,g=110+n*22,b=176+n*26;
    if((x+y*0.5)%8<2){ r=232;g=206;b=86; }
    return pack(r,g,b);
  });
  T.clipboard = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,281);
    let r=226+n*14,g=222+n*12,b=206+n*12;
    if(y<3){ r=120;g=98;b=68; }
    if(y>5&&y%3===0&&x>2&&x<13){ r-=56;g-=56;b-=52; }
    return pack(r,g,b);
  });
  T.shoe = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,283);
    return pack(52+n*14,44+n*12,42+n*12);
  });

  /* --- pickups --- */
  T.page = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,293);
    let r=238+n*12,g=232+n*10,b=210+n*10;
    if(x<1||y<1||x>14||y>14){ r-=40;g-=38;b-=34; }
    if(y>3&&y%3===0&&x>3&&x<13){ r-=70;g-=70;b-=66; }
    if(y>3&&y%3===1&&x>3&&x<10){ r-=40;g-=40;b-=38; }
    return pack(r,g,b);
  });
  T.tape = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,307);
    let r=44+n*14,g=42+n*14,b=48+n*16;
    if(y>3&&y<12&&x>2&&x<14){ r=26;g=26;b=30; }
    if(((x-5)*(x-5)+(y-7.5)*(y-7.5))<4) { r=214;g=206;b=186; }
    if(((x-11)*(x-11)+(y-7.5)*(y-7.5))<4){ r=214;g=206;b=186; }
    if(y>12&&x>3&&x<13){ r=226;g=222;b=206; }
    return pack(r,g,b);
  });
  T.battery = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,311);
    let r=40+n*12,g=42+n*12,b=46+n*14;
    if(y>4&&y<12){ r=226;g=196;b=54; }
    if(y>6&&y<10&&x>3&&x<7){ r=40;g=40;b=44; }
    if(y<3&&x>5&&x<11){ r=178;g=178;b=182; }
    return pack(r,g,b);
  });
  T.soda = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,313);
    let r=196+n*18,g=52+n*12,b=48+n*12;
    if(y<3||y>13){ r=186;g=186;b=190; }
    if(y>5&&y<9){ r=236;g=232;b=214; }
    return pack(r,g,b);
  });
  T.pass = mk(16,16,(x,y)=>{
    const n = fbm(x*0.3,y*0.3,317);
    let r=232+n*12,g=214+n*10,b=140+n*10;
    if(x<1||y<1||x>14||y>14){ r-=44;g-=40;b-=30; }
    if(y>4&&y<7&&x>3&&x<13){ r=120;g=90;b=60; }
    if(y>9&&x>3&&x<11){ r-=40;g-=40;b-=36; }
    return pack(r,g,b);
  });
  T.mess = mk(32,32,(x,y)=>{
    const n = fbm(x*0.25,y*0.25,331);
    let r=150+n*46,g=132+n*40,b=96+n*34;
    if(h2(x,y,337)>0.86){ r=226;g=222;b=206; }                        // paper
    if(h2(x,y,347)>0.93){ r=120;g=176;b=110; }                        // apple core
    return pack(r,g,b);
  });
  T.chain = mk(16,16,(x,y)=>{
    const n = fbm(x*0.4,y*0.4,349);
    let v=150+n*30;
    if(((x+y)%6)<2) v-=54;
    return pack(v,v*0.98,v*0.92);
  });
  T.stair = mk(32,32,(x,y)=>{
    const n = fbm(x*0.2,y*0.2,353);
    let v = 140+n*26;
    if(y<6) v += 26;
    if(y%16<1) v -= 40;
    return pack(v,v*0.97,v*0.92);
  });
  T.sky = mk(64,64,(x,y)=>{
    const n = fbm(x*0.05,y*0.05,359);
    return pack(196+n*40,216+n*30,240+n*15);
  });
  T.rope = mk(16,16,(x,y)=>{
    const n = fbm(x*0.5,y*0.3,367);
    let v=196+n*34;
    if((x+y*2)%5<2) v-=40;
    return pack(v,v*0.92,v*0.72);
  });
  return T;
};

/* Sign generator (cached). bg/fg are [r,g,b]. */
Tex.sign = function(text, bg, fg, w, h){
  w = w||64; h = h||32;
  const key = "sign:"+text+":"+w+"x"+h+":"+(bg?bg.join():"")+":"+(fg?fg.join():"");
  if(Tex.cache[key]) return Tex.cache[key];
  bg = bg || [58,74,110]; fg = fg || [240,236,220];
  const scale = Math.max(2, Math.min(4, Math.floor((w-8)/Math.max(1,textWidth(text,1)))));
  const t = mk(w,h,(x,y)=>{
    if(x<2||y<2||x>w-3||y>h-3) return pack(fg[0]*0.6,fg[1]*0.6,fg[2]*0.6);
    const n = fbm(x*0.2,y*0.2,373);
    return pack(bg[0]+n*14,bg[1]+n*14,bg[2]+n*14);
  });
  const tw = textWidth(text, scale);
  drawText(t.data, w, text, Math.max(3,((w-tw)/2)|0), ((h-5*scale)/2)|0, scale, pack(fg[0],fg[1],fg[2]));
  Tex.cache[key] = t;
  return t;
};

/* Poster generator: headline + body lines */
Tex.poster = function(head, lines, bg, ink){
  const key = "poster:"+head+":"+lines.join("|");
  if(Tex.cache[key]) return Tex.cache[key];
  bg = bg || [238,232,210]; ink = ink || [70,66,86];
  const w=64,h=64;
  const t = mk(w,h,(x,y)=>{
    const n = fbm(x*0.14,y*0.14,379);
    if(x<2||y<2||x>w-3||y>h-3) return pack(bg[0]*0.72,bg[1]*0.72,bg[2]*0.72);
    return pack(bg[0]+n*12,bg[1]+n*12,bg[2]+n*10);
  });
  const hs = Math.max(2, Math.min(3, Math.floor((w-8)/Math.max(1,textWidth(head,1)))));
  drawText(t.data, w, head, Math.max(4,((w-textWidth(head,hs))/2)|0), 6, hs, pack(ink[0],ink[1],ink[2]));
  let y = 6 + 5*hs + 5;
  for(const ln of lines){ drawText(t.data, w, ln, 5, y, 2, pack(ink[0]+30,ink[1]+30,ink[2]+30)); y += 9; }
  Tex.cache[key] = t;
  return t;
};

/* Clock face showing an arbitrary time — ringBell() swaps the school clocks to
   4:48 with this, so every wall clock in the building visibly moves. */
Tex.clockAt = function(h, m){
  const key = "clock:"+h+":"+m;
  if(Tex.cache[key]) return Tex.cache[key];
  const hh = (h + m/60)/12*Math.PI*2 - Math.PI/2, mh = m/60*Math.PI*2 - Math.PI/2;
  const t = mk(32,32,(x,y)=>{
    const dx=x-15.5, dy=y-15.5, d=Math.sqrt(dx*dx+dy*dy);
    if(d>15) return pack(64,54,44);
    if(d>13) return pack(196,186,160);
    let r=242,g=240,b=228;
    const a = Math.atan2(dy,dx);
    for(let i=0;i<12;i++){ const ta=i*Math.PI/6; if(Math.abs(((a-ta+Math.PI*3)%(Math.PI/6))-Math.PI/6)<0.05 && d>10.5){ r=90;g=88;b=84; } }
    if(Math.abs(angDiff(a,hh))<0.12 && d<8) { r=40;g=38;b=36; }
    if(Math.abs(angDiff(a,mh))<0.09 && d<12){ r=40;g=38;b=36; }
    if(d<1.8){ r=196; g=52; b=44; }
    return pack(r,g,b);
  });
  Tex.cache[key] = t;
  return t;
};

window.Tex = Tex;
})();
