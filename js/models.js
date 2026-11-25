/* THE BELL NEVER RINGS — low-poly model library.
   Every mesh is built at runtime from boxes and quads (original geometry,
   no model files). Characters are composed of sub-meshes so limbs can be
   posed per frame without allocating. */
(function(){
"use strict";

/* ---------------- mesh builder ---------------- */
function MB(){
  this.p = []; this.uv = []; this.sh = []; this.tex = []; this.col = []; this.n = 0;
}
MB.prototype.quad = function(a,b,c,d, texName, shade, uv){
  const t = (typeof texName === "string") ? -2 : texName;   // -2 = resolve later
  const tn = (typeof texName === "string") ? texName : null;
  const u = uv || [[0,0],[1,0],[1,1],[0,1]];
  const vs = [a,b,c,d];
  for(let i=0;i<2;i++){
    const tri = i===0 ? [0,1,2] : [0,2,3];
    for(let k=0;k<3;k++){
      const v = vs[tri[k]];
      this.p.push(v[0],v[1],v[2]);
      this.uv.push(u[tri[k]][0], u[tri[k]][1]);
      this.sh.push(shade===undefined?1:shade);
    }
    this.tex.push(t); this._names = this._names||[]; this._names.push(tn);
    this.col.push(0xffb0a898);
    this.n++;
  }
  return this;
};
MB.prototype.tri = function(a,b,c, texName, shade){
  const t = (typeof texName === "string") ? -2 : texName;
  const tn = (typeof texName === "string") ? texName : null;
  const vs=[a,b,c], u=[[0,0],[1,0],[0.5,1]];
  for(let k=0;k<3;k++){ this.p.push(vs[k][0],vs[k][1],vs[k][2]); this.uv.push(u[k][0],u[k][1]); this.sh.push(shade===undefined?1:shade); }
  this.tex.push(t); this._names=this._names||[]; this._names.push(tn); this.col.push(0xffb0a898); this.n++;
  return this;
};
/* axis-aligned box. faces: {top,bottom,px,nx,pz,nz} texture names or a single name.
   sh: shade object or number. */
MB.prototype.box = function(x0,y0,z0,x1,y1,z1, faces, sh){
  if(typeof faces === "string") faces = {top:faces,bottom:faces,px:faces,nx:faces,pz:faces,nz:faces};
  const S = (typeof sh === "number") ? {top:sh,bottom:sh*0.7,px:sh*0.9,nx:sh*0.78,pz:sh*0.95,nz:sh*0.84}
        : Object.assign({top:1,bottom:0.66,px:0.9,nx:0.78,pz:0.96,nz:0.85}, sh||{});
  /* +Y top */    this.quad([x0,y1,z0],[x0,y1,z1],[x1,y1,z1],[x1,y1,z0], faces.top, S.top);
  /* -Y bottom */ this.quad([x0,y0,z1],[x0,y0,z0],[x1,y0,z0],[x1,y0,z1], faces.bottom, S.bottom);
  /* +X */        this.quad([x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1], faces.px, S.px);
  /* -X */        this.quad([x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[x0,y0,z0], faces.nx, S.nx);
  /* +Z */        this.quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1], faces.pz, S.pz);
  /* -Z */        this.quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0], faces.nz, S.nz);
  return this;
};
MB.prototype.build = function(){
  const R3 = window.R3;
  const n = this.n;
  const mesh = {
    pos: new Float32Array(this.p),
    uv: new Float32Array(this.uv),
    sh: new Float32Array(this.sh),
    tex: new Int16Array(n),
    col: new Uint32Array(n),
    n
  };
  for(let i=0;i<n;i++){
    const nm = this._names ? this._names[i] : null;
    mesh.tex[i] = nm ? (R3 ? R3.texIndex(nm) : -1) : (this.tex[i] >= 0 ? this.tex[i] : -1);
    mesh.col[i] = this.col[i];
  }
  return mesh;
};

/* ---------------- model registry ---------------- */
const cache = {};
const Models = {
  MB,
  get(name){
    if(cache[name]) return cache[name];
    const fn = BUILD[name];
    if(!fn) return null;
    cache[name] = fn().build();
    return cache[name];
  },
  clear(){ for(const k in cache) delete cache[k]; }
};

const BUILD = {
  /* ---- props ---- */
  locker(){
    const m = new MB();
    m.box(-0.95,0,-0.19, 0.95,1.32,0.19, {top:"locker_side",bottom:"locker_side",px:"locker_side",nx:"locker_side",pz:"locker",nz:"locker_side"}, 1.0);
    m.box(-0.95,0.02,0.19, 0.95,0.11,0.23, "locker_side", 0.7);     // base kick plate
    return m;
  },
  lockerOpen(){
    const m = new MB();
    m.box(-0.95,0,-0.19, 0.95,1.32,0.19, {top:"locker_side",bottom:"locker_side",px:"locker_side",nx:"locker_side",pz:"locker_in",nz:"locker_side"}, 1.0);
    /* door swung out */
    m.box(-1.85,0.02,0.10, -0.92,1.3,0.16, {top:"locker_side",bottom:"locker_side",px:"locker",nx:"locker_side",pz:"locker_side",nz:"locker"}, 0.95);
    return m;
  },
  desk(){
    const m = new MB();
    m.box(-0.45,0.55,-0.32, 0.45,0.60,0.32, {top:"desk",bottom:"metal",px:"metal",nx:"metal",pz:"metal",nz:"metal"}, 1.0);
    const leg = (x,z)=> m.box(x-0.03,0,z-0.03, x+0.03,0.55, z+0.03, "metal", 0.8);
    leg(-0.39,-0.26); leg(0.39,-0.26); leg(-0.39,0.26); leg(0.39,0.26);
    m.box(-0.45,0.34,-0.32, 0.45,0.38,0.32, "metal", 0.7);            // shelf
    return m;
  },
  chair(){
    const m = new MB();
    m.box(-0.2,0.34,-0.2, 0.2,0.38,0.2, {top:"chair",bottom:"metal",px:"metal",nx:"metal",pz:"metal",nz:"metal"}, 1.0);
    m.box(-0.2,0.38,-0.24, 0.2,0.78,-0.2, {top:"chair",bottom:"chair",px:"chair",nx:"chair",pz:"chair",nz:"chair"}, 0.95);
    const leg=(x,z)=>m.box(x-0.02,0,z-0.02,x+0.02,0.34,z+0.02,"metal",0.8);
    leg(-0.17,-0.17); leg(0.17,-0.17); leg(-0.17,0.17); leg(0.17,0.17);
    return m;
  },
  trash(){
    const m = new MB();
    m.box(-0.23,0,-0.23, 0.23,0.62,0.23, {top:"trash",bottom:"trash",px:"trash",nx:"trash",pz:"trash",nz:"trash"}, 1.0);
    m.box(-0.25,0.56,-0.25, 0.25,0.64,0.25, "trash", 1.05);
    return m;
  },
  mess(){
    const m = new MB();
    for(let i=0;i<7;i++){
      const a = i*2.399, r = 0.1+ (i%3)*0.14;
      const x = Math.cos(a)*r, z = Math.sin(a)*r;
      m.box(x-0.09,0.0,z-0.07, x+0.09,0.05+(i%3)*0.03, z+0.07, {top:"mess",bottom:"mess",px:"mess",nx:"mess",pz:"mess",nz:"mess"}, 1.0);
    }
    m.box(-0.3,0.0,-0.1, -0.14,0.12,0.06, "trash", 0.9);            // knocked-over can
    return m;
  },
  plant(){
    const m = new MB();
    m.box(-0.18,0,-0.18, 0.18,0.3,0.18, {top:"pot",bottom:"pot",px:"pot",nx:"pot",pz:"pot",nz:"pot"}, 1.0);
    m.quad([-0.46,0.3,0],[0.46,0.3,0],[0.46,1.34,0],[-0.46,1.34,0], "leaf", 1.0);
    m.quad([0,0.3,-0.46],[0,0.3,0.46],[0,1.34,0.46],[0,1.34,-0.46], "leaf", 0.9);
    m.quad([-0.33,0.32,-0.33],[0.33,0.32,0.33],[0.33,1.24,0.33],[-0.33,1.24,-0.33], "leaf", 0.82);
    return m;
  },
  vending(){
    const m = new MB();
    m.box(-0.5,0,-0.38, 0.5,1.95,0.38, {top:"metal",bottom:"metal",px:"metal",nx:"metal",pz:"vending",nz:"metal"}, 1.0);
    return m;
  },
  clock(){
    const m = new MB();
    m.box(-0.22,-0.22,-0.06, 0.22,0.22,0.02, {top:"metal",bottom:"metal",px:"metal",nx:"metal",pz:"clock",nz:"metal"}, 1.0);
    return m;
  },
  speaker(){
    const m = new MB();
    m.box(-0.28,-0.1,-0.06, 0.28,0.1,0.02, {top:"speaker",bottom:"speaker",px:"speaker",nx:"speaker",pz:"speaker",nz:"speaker"}, 1.0);
    return m;
  },
  mirror(){
    const m = new MB();
    m.box(-0.5,-0.5,-0.04, 0.5,0.5,0.02, {top:"metal",bottom:"metal",px:"metal",nx:"metal",pz:"mirror",nz:"metal"}, 1.05);
    return m;
  },
  trophy(){
    const m = new MB();
    m.box(-0.9,0,-0.32, 0.9,1.85,0.32, {top:"desk",bottom:"desk",px:"trophy",nx:"trophy",pz:"trophy",nz:"trophy"}, 1.0);
    return m;
  },
  fountain(){
    const m = new MB();
    m.box(-0.3,0,-0.26, 0.3,1.0,0.26, {top:"fountain",bottom:"fountain",px:"fountain",nx:"fountain",pz:"fountain",nz:"fountain"}, 1.0);
    m.box(-0.22,1.0,-0.18, 0.22,1.1,0.18, {top:"fountain",bottom:"fountain",px:"fountain",nx:"fountain",pz:"fountain",nz:"fountain"}, 1.05);
    return m;
  },
  bookcase(){
    const m = new MB();
    m.box(-0.95,0,-0.21, 0.95,2.0,0.21, {top:"desk",bottom:"desk",px:"desk",nx:"desk",pz:"bookcase",nz:"bookcase"}, 1.0);
    return m;
  },
  gymmat(){
    const m = new MB();
    m.box(-0.95,0,-0.45, 0.95,0.09,0.45, {top:"gymmat",bottom:"gymmat",px:"gymmat",nx:"gymmat",pz:"gymmat",nz:"gymmat"}, 1.0);
    return m;
  },
  caftable(){
    const m = new MB();
    m.box(-0.95,0.72,-0.62, 0.95,0.78,0.62, {top:"caftable",bottom:"metal",px:"metal",nx:"metal",pz:"metal",nz:"metal"}, 1.0);
    m.box(-0.07,0,-0.07, 0.07,0.72,0.07, "metal", 0.8);
    const bench=(z)=>m.box(-0.95,0.44,z-0.16, 0.95,0.49,z+0.16, {top:"caftable",bottom:"metal",px:"metal",nx:"metal",pz:"metal",nz:"metal"}, 0.95);
    bench(-0.95); bench(0.95);
    return m;
  },
  extinguisher(){
    const m = new MB();
    m.box(-0.11,0.12,-0.11, 0.11,0.62,0.11, {top:"metal",bottom:"metal",px:"extinguisher",nx:"extinguisher",pz:"extinguisher",nz:"extinguisher"}, 1.0);
    m.box(-0.045,0.62,-0.045, 0.045,0.76,0.045, "metal", 0.9);
    return m;
  },
  toilet(){
    const m = new MB();
    m.box(-0.2,0,-0.24, 0.2,0.42,0.2, {top:"toilet",bottom:"toilet",px:"toilet",nx:"toilet",pz:"toilet",nz:"toilet"}, 1.0);
    m.box(-0.18,0.42,-0.1, 0.18,0.46,0.22, "toilet", 1.05);
    return m;
  },
  sink(){
    const m = new MB();
    m.box(-0.28,0.8,-0.22, 0.28,0.88,0.22, {top:"toilet",bottom:"metal",px:"metal",nx:"metal",pz:"metal",nz:"metal"}, 1.0);
    m.box(-0.05,0.88,-0.05, 0.05,1.04,0.05, "metal", 0.95);
    m.box(-0.24,0,-0.18, 0.24,0.8,0.18, "metal", 0.8);
    return m;
  },
  /* doors: hinge at local x=0 so yaw swings them open */
  doorWood(){
    const m = new MB();
    m.box(0,0,-0.05, 1.9,2.05,0.05, {top:"door_wood",bottom:"door_wood",px:"door_wood",nx:"door_wood",pz:"door_wood",nz:"door_wood"}, 1.0);
    m.box(1.62,0.98,0.05, 1.74,1.08,0.1, "metal", 1.1);
    return m;
  },
  doorMetal(){
    const m = new MB();
    m.box(0,0,-0.05, 1.9,2.05,0.05, {top:"door_metal",bottom:"door_metal",px:"door_metal",nx:"door_metal",pz:"door_metal",nz:"door_metal"}, 1.0);
    m.box(1.62,0.98,0.05, 1.74,1.08,0.1, "metal", 1.1);
    return m;
  },
  exitDoors(){
    const m = new MB();
    m.box(-1.95,0,-0.09, 1.95,2.5,0.09, {top:"metal",bottom:"metal",px:"metal",nx:"metal",pz:"door_exit",nz:"door_exit"}, 1.0);
    m.box(-2.0,2.5,-0.14, 2.0,2.68,0.14, "metal", 1.05);
    /* chains across the glass */
    m.box(-1.8,1.2,-0.14, 1.8,1.36,0.14, {top:"chain",bottom:"chain",px:"chain",nx:"chain",pz:"chain",nz:"chain"}, 1.1);
    m.box(-1.8,1.62,-0.14, 1.8,1.76,0.14, "chain", 1.05);
    return m;
  },
  exitDoorsOpen(){
    const m = new MB();
    m.box(-1.95,0,-0.09, -0.3,2.5,0.09, {top:"metal",bottom:"metal",px:"door_exit",nx:"metal",pz:"door_exit",nz:"door_exit"}, 1.0);
    m.box(0.3,0,-0.09, 1.95,2.5,0.09, {top:"metal",bottom:"metal",px:"metal",nx:"door_exit",pz:"door_exit",nz:"door_exit"}, 1.0);
    m.box(-2.0,2.5,-0.14, 2.0,2.68,0.14, "metal", 1.05);
    /* bright daylight beyond */
    m.quad([-0.32,0,-0.07],[0.32,0,-0.07],[0.32,2.5,-0.07],[-0.32,2.5,-0.07], "sky", 1.4);
    return m;
  },
  bell(){
    const m = new MB();
    m.box(-0.1,1.15,-0.1, 0.1,1.35,0.1, "metal", 0.9);
    m.box(-0.22,0.95,-0.22, 0.22,1.18,0.22, "bell", 1.05);
    m.box(-0.34,0.7,-0.34, 0.34,0.98,0.34, "bell", 1.0);
    m.box(-0.46,0.42,-0.46, 0.46,0.72,0.46, "bell", 0.95);
    m.box(-0.56,0.2,-0.56, 0.56,0.44,0.56, "bell", 0.9);
    m.box(-0.62,0.1,-0.62, 0.62,0.22,0.62, "bell", 0.85);
    m.box(-0.08,0.0,-0.08, 0.08,0.12,0.08, "metal", 0.8);
    return m;
  },
  bellMount(){
    const m = new MB();
    m.box(-1.1,2.42,-0.12, 1.1,2.6,0.12, "metal", 0.9);
    m.box(-1.1,0,-0.12, -0.9,2.6,0.12, "wall_block", 0.8);
    m.box(0.9,0,-0.12, 1.1,2.6,0.12, "wall_block", 0.8);
    return m;
  },
  stairs(){
    const m = new MB();
    for(let i=0;i<6;i++){
      const y = i*0.16, z = i*0.24;
      m.box(-0.6,y,z, 0.6,y+0.16,z+0.24, {top:"stair",bottom:"wall_block",px:"wall_block",nx:"wall_block",pz:"stair",nz:"wall_block"}, 1.0);
    }
    return m;
  },

  /* ---- pickups ---- */
  page(){
    const m = new MB();
    m.quad([-0.16,-0.2,0],[0.16,-0.2,0],[0.16,0.2,0],[-0.16,0.2,0], "page", 1.15);
    m.quad([0.16,-0.2,-0.002],[-0.16,-0.2,-0.002],[-0.16,0.2,-0.002],[0.16,0.2,-0.002], "page", 0.95);
    return m;
  },
  tape(){
    const m = new MB();
    m.box(-0.13,-0.08,-0.03, 0.13,0.08,0.03, {top:"tape",bottom:"tape",px:"tape",nx:"tape",pz:"tape",nz:"tape"}, 1.1);
    return m;
  },
  battery(){
    const m = new MB();
    m.box(-0.06,-0.12,-0.06, 0.06,0.12,0.06, {top:"metal",bottom:"metal",px:"battery",nx:"battery",pz:"battery",nz:"battery"}, 1.1);
    return m;
  },
  sodaCan(){
    const m = new MB();
    m.box(-0.07,-0.13,-0.07, 0.07,0.13,0.07, {top:"metal",bottom:"metal",px:"soda",nx:"soda",pz:"soda",nz:"soda"}, 1.1);
    return m;
  },
  pass(){
    const m = new MB();
    m.quad([-0.12,-0.16,0],[0.12,-0.16,0],[0.12,0.16,0],[-0.12,0.16,0], "pass", 1.15);
    m.quad([0.12,-0.16,-0.002],[-0.12,-0.16,-0.002],[-0.12,0.16,-0.002],[0.12,0.16,-0.002], "pass", 0.95);
    return m;
  },
  bucket(){
    const m = new MB();
    m.box(-0.18,0,-0.16, 0.18,0.26,0.16, {top:"bucket",bottom:"bucket",px:"bucket",nx:"bucket",pz:"bucket",nz:"bucket"}, 1.0);
    m.box(-0.02,0.26,-0.14, 0.02,0.42,0.14, "metal", 0.9);
    return m;
  },
  mop(){
    const m = new MB();
    m.box(-0.022,0,-0.022, 0.022,1.28,0.022, "desk", 0.95);
    m.box(-0.11,1.24,-0.11, 0.11,1.32,0.11, "mophead", 1.0);
    m.box(-0.14,-0.02,-0.14, 0.14,0.2,0.14, "mophead", 0.9);
    return m;
  },

  /* ---- MR. MOP (sub-meshes so limbs can be posed) ---- */
  mopTorso(){
    const m = new MB();
    m.box(-0.26,0.0,-0.17, 0.26,0.62,0.17, {top:"jumpsuit",bottom:"jumpsuit",px:"jumpsuit",nx:"jumpsuit",pz:"jumpsuit",nz:"jumpsuit"}, 1.0);
    m.box(-0.3,0.02,-0.2, 0.3,0.2,-0.16, "jumpsuit", 0.86);         // shoulders/back pack
    m.box(-0.09,0.3,0.17, 0.09,0.5,0.19, "pass", 0.95);             // name tag
    return m;
  },
  mopHead(){
    const m = new MB();
    m.box(-0.15,-0.16,-0.14, 0.15,0.1,0.14, {top:"skin_mop",bottom:"skin_mop",px:"skin_mop",nx:"skin_mop",pz:"skin_mop",nz:"skin_mop"}, 1.02);
    m.box(-0.16,0.06,-0.15, 0.16,0.14,0.15, {top:"cap",bottom:"cap",px:"cap",nx:"cap",pz:"cap",nz:"cap"}, 1.0);
    m.box(-0.16,0.1,-0.2, 0.16,0.13,-0.14, "cap", 0.9);              // cap brim (back)
    m.box(-0.05,-0.09,0.14, 0.05,-0.02,0.15, "skin_mop", 0.8);       // nose
    return m;
  },
  mopArm(){
    const m = new MB();
    m.box(-0.08,-0.5,-0.08, 0.08,0.0,0.08, {top:"jumpsuit",bottom:"skin_mop",px:"jumpsuit",nx:"jumpsuit",pz:"jumpsuit",nz:"jumpsuit"}, 0.95);
    m.box(-0.07,-0.6,-0.07, 0.07,-0.48,0.07, "skin_mop", 0.95);      // hand
    return m;
  },
  mopLeg(){
    const m = new MB();
    m.box(-0.11,-0.62,-0.11, 0.11,0.0,0.11, {top:"jumpsuit",bottom:"shoe",px:"jumpsuit",nx:"jumpsuit",pz:"jumpsuit",nz:"jumpsuit"}, 0.9);
    m.box(-0.12,-0.66,-0.2, 0.12,-0.56,0.12, "shoe", 0.85);
    return m;
  },

  /* ---- PATTY, hall monitor (smaller kid) ---- */
  pattyTorso(){
    const m = new MB();
    m.box(-0.19,0.0,-0.13, 0.19,0.46,0.13, {top:"kid_shirt",bottom:"kid_shirt",px:"kid_shirt",nx:"kid_shirt",pz:"kid_shirt",nz:"kid_shirt"}, 1.0);
    m.quad([-0.19,0.06,0.135],[0.02,0.44,0.135],[0.09,0.44,0.135],[-0.12,0.06,0.135], "sash", 1.05);   // sash
    return m;
  },
  pattyHead(){
    const m = new MB();
    m.box(-0.13,-0.14,-0.12, 0.13,0.09,0.12, {top:"kid_skin",bottom:"kid_skin",px:"kid_skin",nx:"kid_skin",pz:"kid_skin",nz:"kid_skin"}, 1.02);
    m.box(-0.14,-0.02,-0.13, 0.14,0.12,0.13, "kid_hair", 1.0);
    m.box(-0.2,-0.14,-0.05, -0.13,0.06,0.05, "kid_hair", 0.92);      // pigtail L
    m.box(0.13,-0.14,-0.05, 0.2,0.06,0.05, "kid_hair", 0.92);        // pigtail R
    return m;
  },
  pattyArm(){
    const m = new MB();
    m.box(-0.06,-0.38,-0.06, 0.06,0.0,0.06, {top:"kid_shirt",bottom:"kid_skin",px:"kid_shirt",nx:"kid_shirt",pz:"kid_shirt",nz:"kid_shirt"}, 0.95);
    m.box(-0.05,-0.46,-0.05, 0.05,-0.36,0.05, "kid_skin", 0.95);
    return m;
  },
  pattyLeg(){
    const m = new MB();
    m.box(-0.08,-0.46,-0.08, 0.08,0.0,0.08, {top:"kid_shirt",bottom:"kid_skin",px:"kid_skin",nx:"kid_skin",pz:"kid_skin",nz:"kid_skin"}, 0.9);
    m.box(-0.09,-0.5,-0.16, 0.09,-0.42,0.09, "shoe", 0.85);
    return m;
  },
  clipboard(){
    const m = new MB();
    m.box(-0.14,-0.19,-0.015, 0.14,0.19,0.015, {top:"clipboard",bottom:"clipboard",px:"clipboard",nx:"clipboard",pz:"clipboard",nz:"clipboard"}, 1.05);
    return m;
  },
  whistle(){
    const m = new MB();
    m.box(-0.03,-0.03,-0.03, 0.03,0.03,0.03, "metal", 1.1);
    return m;
  },
  /* the rope you pull to ring the bell: hangs from the mount beam (y 2.5) to 1.0 m */
  bellRope(){
    const m = new MB();
    m.box(-0.03,1.02,-0.03, 0.03,2.52,0.03, "rope", 1.0);
    m.box(-0.07,0.92,-0.07, 0.07,1.06,0.07, "rope", 0.92);   // the knot you grip
    m.box(-0.05,0.86,-0.05, 0.05,0.94,0.05, "desk", 0.88);
    return m;
  },
  /* a floor-standing mop + bucket pair for the janitor's closet */
  mopKit(){
    const m = new MB();
    m.box(-0.022,0,-0.022, 0.022,1.28,0.022, "desk", 0.95);
    m.box(-0.11,1.24,-0.11, 0.11,1.32,0.11, "mophead", 1.0);
    m.box(-0.14,-0.02,-0.14, 0.14,0.2,0.14, "mophead", 0.9);
    return m;
  }
};

window.Models = Models;
})();
