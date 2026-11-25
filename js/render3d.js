/* THE BELL NEVER RINGS — software 3D renderer (PS1-style).
   Low internal resolution, z-buffered triangles, affine texture mapping,
   vertex snapping, per-vertex light + distance fog, ordered dithering.
   No WebGL, no dependencies: it writes a Uint32 framebuffer and blits it.

   Conventions
   -----------
   * Screen space has +y DOWN. A triangle is normalised so that
     area2 = (x1-x0)*(y2-y0) - (x2-x0)*(y1-y0) > 0, which makes the
     interior "all three edge functions >= 0".
   * Edge i is the edge OPPOSITE vertex i in barycentric terms:
       E0 = edge v0->v1  (opposite v2)
       E1 = edge v1->v2  (opposite v0)
       E2 = edge v2->v0  (opposite v1)
     and for any point P:  E0+E1+E2 = area2,  lambda0 = E1/area2.
     So attribute(P) = (a*E1 + b*E2 + c*E0) / area2.            */
(function(){
"use strict";

const NEAR = 0.055;

const R3 = {
  W:320, H:200, fb:null, zb:null, img:null, imgBuf:null, off:null, offCtx:null,
  cam:null, focal:200, cx:160, cy:100,
  fogR:236, fogG:232, fogB:214, fogStart:5.0, fogEnd:16.0, fogInvRange:1/(16-5),
  sky:0xffd8d0c0,
  dither:true, stats:{tris:0, drawn:0, px:0, clipped:0},
  textures:[], texNames:{}
};

/* 4x4 bayer matrix, normalized around 0 */
const BAYER = new Float32Array([
  -0.375, 0.125, -0.250, 0.375,
   0.3125,-0.4375, 0.0625,-0.1875,
  -0.125, 0.375, -0.500, 0.0,
   0.250, -0.3125, 0.4375,-0.0625
]);

function pack(r,g,b){ return (0xff000000 | ((b&255)<<16) | ((g&255)<<8) | (r&255)) >>> 0; }
function clamp255(v){ return v<0?0:(v>255?255:v); }
R3.pack = pack;

R3.init = function(w,h){
  R3.W = w|0; R3.H = h|0;
  R3.fb = new Uint32Array(w*h);
  R3.zb = new Float32Array(w*h);
  R3.cx = w/2; R3.cy = h/2;
  R3.img = null; R3.off = null; R3.offCtx = null;
  if(typeof document !== "undefined" && document && document.createElement){
    try{
      R3.off = document.createElement("canvas");
      R3.off.width = w; R3.off.height = h;
      R3.offCtx = R3.off.getContext("2d");
      R3.img = R3.offCtx.createImageData(w,h);
      R3.imgBuf = new Uint32Array(R3.img.data.buffer);
    }catch(e){ R3.off = null; R3.offCtx = null; R3.img = null; }
  }
  return R3;
};

R3.setFov = function(fovYdeg){
  R3.focal = (R3.H/2) / Math.tan((fovYdeg*Math.PI/180)/2);
};

R3.setFog = function(r,g,b,start,end){
  R3.fogR=r; R3.fogG=g; R3.fogB=b; R3.fogStart=start; R3.fogEnd=end;
  R3.fogInvRange = 1/Math.max(0.001,(end-start));
};

R3.setTexture = function(name, tex){
  let i = R3.texNames[name];
  if(i === undefined){ i = R3.textures.length; R3.texNames[name] = i; R3.textures.push(tex); }
  else R3.textures[i] = tex;
  return i;
};
R3.texIndex = function(name){
  const i = R3.texNames[name];
  return i === undefined ? -1 : i;
};

R3.begin = function(cam){
  R3.cam = cam;
  R3.fb.fill(R3.sky);
  R3.zb.fill(-1);
  R3.stats.tris = 0; R3.stats.drawn = 0; R3.stats.px = 0; R3.stats.clipped = 0;
};

/* ---------- scratch (zero allocation per frame) ---------- */
const CLIP = []; for(let i=0;i<8;i++) CLIP.push({x:0,y:0,z:0,u:0,v:0,s:0});
const IN   = []; for(let i=0;i<4;i++) IN.push({x:0,y:0,z:0,u:0,v:0,s:0});
const WV   = [{x:0,y:0,z:0,u:0,v:0,s:0},{x:0,y:0,z:0,u:0,v:0,s:0},{x:0,y:0,z:0,u:0,v:0,s:0}];
const QV   = [{x:0,y:0,z:0,u:0,v:0,s:0},{x:0,y:0,z:0,u:0,v:0,s:0},{x:0,y:0,z:0,u:0,v:0,s:0},{x:0,y:0,z:0,u:0,v:0,s:0}];

function fogOf(z){
  const f = (z - R3.fogStart)*R3.fogInvRange;
  return f<=0?0:(f>=1?1:f);
}
R3.fogOf = fogOf;

function writePx(r,g,b,dith,dIdx,x){
  if(dith){
    const d = BAYER[dIdx+(x&3)]*9;
    return pack(clamp255(r+d|0)&248, clamp255(g+d|0)&248, clamp255(b+d|0)&248);
  }
  return pack(clamp255(r|0), clamp255(g|0), clamp255(b|0));
}

/* ---------- core triangle rasterizer (view space in, z>0 guaranteed) ---------- */
function tri(ax,ay,az,au,av,as_, bx,by,bz,bu,bv,bs, cx,cy,cz,cu,cv,cs, tex, col){
  R3.stats.tris++;
  const W=R3.W, H=R3.H, f=R3.focal, ocx=R3.cx, ocy=R3.cy;
  const aiz0=1/az, biz0=1/bz, ciz0=1/cz;
  let aiz=aiz0, biz=biz0, ciz=ciz0;
  let fa=fogOf(az), fb=fogOf(bz), fc=fogOf(cz);
  /* project + PS1 vertex snapping */
  let x0=Math.round(ocx+ax*aiz*f), y0=Math.round(ocy-ay*aiz*f);
  let x1=Math.round(ocx+bx*biz*f), y1=Math.round(ocy-by*biz*f);
  let x2=Math.round(ocx+cx*ciz*f), y2=Math.round(ocy-cy*ciz*f);
  let area2 = (x1-x0)*(y2-y0) - (x2-x0)*(y1-y0);
  if(area2 === 0) return;
  if(area2 < 0){
    let t;
    t=x1; x1=x2; x2=t;  t=y1; y1=y2; y2=t;
    t=bu; bu=cu; cu=t;  t=bv; bv=cv; cv=t;
    t=bs; bs=cs; cs=t;  t=biz; biz=ciz; ciz=t;
    t=bz; bz=cz; cz=t;
    t=fa; fa=fc; fc=t;
    area2 = -area2;
  }
  const minX = Math.max(0, Math.min(x0,x1,x2));
  const maxX = Math.min(W-1, Math.max(x0,x1,x2));
  const minY = Math.max(0, Math.min(y0,y1,y2));
  const maxY = Math.min(H-1, Math.max(y0,y1,y2));
  if(minX>maxX || minY>maxY) return;

  /* edge coefficients, inside when all >= 0 (given area2 > 0) */
  const A0=y0-y1, B0=x1-x0, C0=x0*y1-x1*y0;
  const A1=y1-y2, B1=x2-x1, C1=x1*y2-x2*y1;
  const A2=y2-y0, B2=x0-x2, C2=x2*y0-x0*y2;

  const invA = 1/area2;

  /* attribute(P) = (a*E1 + b*E2 + c*E0) * invA  => linear gradients */
  const duDx = (au*A1 + bu*A2 + cu*A0)*invA, duDy = (au*B1 + bu*B2 + cu*B0)*invA;
  const dvDx = (av*A1 + bv*A2 + cv*A0)*invA, dvDy = (av*B1 + bv*B2 + cv*B0)*invA;
  const dsDx = (as_*A1 + bs*A2 + cs*A0)*invA, dsDy = (as_*B1 + bs*B2 + cs*B0)*invA;
  const dzDx = (aiz*A1 + biz*A2 + ciz*A0)*invA, dzDy = (aiz*B1 + biz*B2 + ciz*B0)*invA;
  const dfDx = (fa*A1 + fb*A2 + fc*A0)*invA, dfDy = (fa*B1 + fb*B2 + fc*B0)*invA;

  /* attribute values at first pixel centre */
  const px0 = minX+0.5, py0 = minY+0.5;
  const e0s = A0*px0 + B0*py0 + C0;
  const e1s = A1*px0 + B1*py0 + C1;
  const e2s = A2*px0 + B2*py0 + C2;
  let rowU = (au*e1s + bu*e2s + cu*e0s)*invA;
  let rowV = (av*e1s + bv*e2s + cv*e0s)*invA;
  let rowS = (as_*e1s + bs*e2s + cs*e0s)*invA;
  let rowZ = (aiz*e1s + biz*e2s + ciz*e0s)*invA;
  let rowF = (fa*e1s + fb*e2s + fc*e0s)*invA;
  let e0row = e0s, e1row = e1s, e2row = e2s;

  /* texture setup */
  let tdata=null, tw=0, th=0, tshift=0;
  if(tex >= 0){
    const t = R3.textures[tex];
    if(t){ tdata=t.data; tw=t.w; th=t.h; tshift=t.shift; }
  }
  const tmask = tw-1, tmaskv = th-1;
  const cr=(col&255), cg=((col>>8)&255), cb=((col>>16)&255);
  const fr=R3.fogR, fg=R3.fogG, fbl=R3.fogB;
  const fbz = R3.fb, zbuf = R3.zb;
  const dith = R3.dither;
  let wrote = 0;

  for(let y=minY; y<=maxY; y++){
    let e0=e0row, e1=e1row, e2=e2row;
    let u=rowU, v=rowV, s=rowS, iz=rowZ, fog=rowF;
    const rowBase = y*W;
    const dIdx = (y&3)*4;
    for(let x=minX; x<=maxX; x++){
      if((e0|e1|e2) >= 0){           /* fast reject: any negative bit set */
        if(e0>=0 && e1>=0 && e2>=0){
          const zi = rowBase+x;
          if(iz > zbuf[zi]){
            zbuf[zi] = iz;
            let r,g,b;
            if(tdata){
              let tu = (u*tw)|0; tu = tu<0?0:(tu>tmask?tmask:tu);
              let tv = (v*th)|0; tv = tv<0?0:(tv>tmaskv?tmaskv:tv);
              const tp = tdata[(tv<<tshift)+tu];
              if(tp !== 0){
                let sh = s<0?0:(s>1.4?1.4:s);
                const kf = 1-fog;
                r = (tp&255)*sh*kf + fr*fog;
                g = ((tp>>8)&255)*sh*kf + fg*fog;
                b = ((tp>>16)&255)*sh*kf + fbl*fog;
                fbz[zi] = writePx(r,g,b,dith,dIdx,x);
                wrote++;
              }
            } else {
              let sh = s<0?0:(s>1.4?1.4:s);
              const kf = 1-fog;
              r = cr*sh*kf + fr*fog;
              g = cg*sh*kf + fg*fog;
              b = cb*sh*kf + fbl*fog;
              fbz[zi] = writePx(r,g,b,dith,dIdx,x);
              wrote++;
            }
          }
        }
      }
      e0+=A0; e1+=A1; e2+=A2;
      u+=duDx; v+=dvDx; s+=dsDx; iz+=dzDx; fog+=dfDx;
    }
    e0row+=B0; e1row+=B1; e2row+=B2;
    rowU+=duDy; rowV+=dvDy; rowS+=dsDy; rowZ+=dzDy; rowF+=dfDy;
  }
  if(wrote){ R3.stats.drawn++; R3.stats.px += wrote; }
}

/* ---------- near-plane clipping ---------- */
function clipNear(verts, n){
  let out = 0;
  for(let i=0;i<n;i++){
    const a = verts[i], b = verts[(i+1)%n];
    const ain = a.z >= NEAR, bin = b.z >= NEAR;
    if(ain){
      const c = CLIP[out++];
      c.x=a.x; c.y=a.y; c.z=a.z; c.u=a.u; c.v=a.v; c.s=a.s;
    }
    if(ain !== bin){
      const t = (NEAR - a.z)/(b.z - a.z);
      const c = CLIP[out++];
      c.x = a.x + (b.x-a.x)*t;
      c.y = a.y + (b.y-a.y)*t;
      c.z = NEAR;
      c.u = a.u + (b.u-a.u)*t;
      c.v = a.v + (b.v-a.v)*t;
      c.s = a.s + (b.s-a.s)*t;
    }
  }
  return out;
}

/* Draw one triangle from VIEW-space verts {x,y,z,u,v,s} */
R3.triView = function(v0,v1,v2, tex, col){
  const z0 = v0.z>=NEAR, z1 = v1.z>=NEAR, z2 = v2.z>=NEAR;
  if(!z0 && !z1 && !z2) return;
  if(z0 && z1 && z2){
    tri(v0.x,v0.y,v0.z,v0.u,v0.v,v0.s, v1.x,v1.y,v1.z,v1.u,v1.v,v1.s, v2.x,v2.y,v2.z,v2.u,v2.v,v2.s, tex, col);
    return;
  }
  R3.stats.clipped++;
  IN[0].x=v0.x; IN[0].y=v0.y; IN[0].z=v0.z; IN[0].u=v0.u; IN[0].v=v0.v; IN[0].s=v0.s;
  IN[1].x=v1.x; IN[1].y=v1.y; IN[1].z=v1.z; IN[1].u=v1.u; IN[1].v=v1.v; IN[1].s=v1.s;
  IN[2].x=v2.x; IN23(IN[2],v2);
  const n = clipNear(IN, 3);
  for(let i=1;i<n-1;i++){
    tri(CLIP[0].x,CLIP[0].y,CLIP[0].z,CLIP[0].u,CLIP[0].v,CLIP[0].s,
        CLIP[i].x,CLIP[i].y,CLIP[i].z,CLIP[i].u,CLIP[i].v,CLIP[i].s,
        CLIP[i+1].x,CLIP[i+1].y,CLIP[i+1].z,CLIP[i+1].u,CLIP[i+1].v,CLIP[i+1].s, tex, col);
  }
};
function IN23(o,v){ o.x=v.x; o.y=v.y; o.z=v.z; o.u=v.u; o.v=v.v; o.s=v.s; }

/* Draw a quad from VIEW-space verts (planar, in order) */
R3.quadView = function(v0,v1,v2,v3, tex, col){
  R3.triView(v0,v1,v2, tex, col);
  R3.triView(v0,v2,v3, tex, col);
};

/* World-space quad helper: 4 world points + uv corners + shade */
R3.quadWorld = function(cam, p0,p1,p2,p3, uvScale, shade, tex, col){
  for(let i=0;i<4;i++){
    const p = arguments[1+i];
    const dx=p[0]-cam.x, dy=p[1]-cam.y, dz=p[2]-cam.z;
    const vx = dx*cam.rx + dz*cam.rz;
    const vz = dx*cam.fx + dz*cam.fz;
    const q = QV[i];
    q.x = vx; q.y = dy*cam.cp - vz*cam.sp; q.z = dy*cam.sp + vz*cam.cp;
    q.s = shade;
  }
  const su = uvScale[0], sv = uvScale[1], ou = uvScale[2]||0, ov = uvScale[3]||0;
  QV[0].u=ou;      QV[0].v=ov;
  QV[1].u=ou+su;   QV[1].v=ov;
  QV[2].u=ou+su;   QV[2].v=ov+sv;
  QV[3].u=ou;      QV[3].v=ov+sv;
  R3.quadView(QV[0],QV[1],QV[2],QV[3], tex, col);
};

/* ---------- mesh drawing (world-space model transform) ----------
   mesh: { pos:Float32Array(9n), uv:Float32Array(6n), sh:Float32Array(3n),
           tex:Int16Array(n), col:Uint32Array(n), n }
   xform: { x,y,z, yaw, scale } */
/* xform: { x,y,z, yaw, pitch, roll, scale, px,py,pz (local pivot) }
   Order: (v - pivot) -> scale -> roll(Z) -> pitch(X) -> yaw(Y) -> +pivot -> +pos */
R3.drawMesh = function(mesh, xform, lightMul){
  if(!mesh || !mesh.n) return;
  const cam = R3.cam;
  if(!cam) return;
  const yaw = xform.yaw||0, pitch = xform.pitch||0, roll = xform.roll||0;
  const cA = Math.cos(yaw), sA = Math.sin(yaw);
  const cP = Math.cos(pitch), sP = Math.sin(pitch);
  const cR = Math.cos(roll), sR = Math.sin(roll);
  const sc = xform.scale === undefined ? 1 : xform.scale;
  const lm = lightMul === undefined ? 1 : lightMul;
  const ox = xform.px||0, oy = xform.py||0, oz = xform.pz||0;
  const px = xform.x, py = xform.y, pz = xform.z;
  const m = mesh.n, pos = mesh.pos, uv = mesh.uv, sh = mesh.sh, tex = mesh.tex, col = mesh.col;
  for(let t=0;t<m;t++){
    const o = t*9, ou = t*6, os = t*3;
    let vis = 0;
    for(let k=0;k<3;k++){
      let lx = (pos[o+k*3]-ox)*sc, ly = (pos[o+k*3+1]-oy)*sc, lz = (pos[o+k*3+2]-oz)*sc;
      /* roll about Z */
      let rx = lx*cR - ly*sR, ry = lx*sR + ly*cR, rz = lz;
      /* pitch about X */
      let qx = rx, qy = ry*cP - rz*sP, qz = ry*sP + rz*cP;
      /* yaw about Y */
      const wx = px + ox + qx*cA + qz*sA;
      const wz = pz + oz - qx*sA + qz*cA;
      const wy = py + oy + qy;
      const dx = wx-cam.x, dy = wy-cam.y, dz = wz-cam.z;
      const vx = dx*cam.rx + dz*cam.rz;
      const vz = dx*cam.fx + dz*cam.fz;
      const v = WV[k];
      v.x = vx;
      v.y = dy*cam.cp - vz*cam.sp;
      v.z = dy*cam.sp + vz*cam.cp;
      v.u = uv[ou+k*2]; v.v = uv[ou+k*2+1];
      v.s = sh[os+k]*lm;
      if(v.z >= NEAR) vis++;
    }
    if(vis > 0) R3.triView(WV[0], WV[1], WV[2], tex[t], col[t]);
  }
};

/* ---------- present ---------- */
R3.present = function(displayCtx, outW, outH){
  if(!R3.img || !R3.imgBuf) return;
  R3.imgBuf.set(R3.fb);
  R3.offCtx.putImageData(R3.img, 0, 0);
  if(displayCtx && R3.off){
    displayCtx.imageSmoothingEnabled = false;
    displayCtx.drawImage(R3.off, 0, 0, R3.W, R3.H, 0, 0, outW||R3.W, outH||R3.H);
  }
};

/* ASCII dump: luminance -> characters, for headless verification */
R3.ascii = function(stepX, stepY){
  stepX = stepX||4; stepY = stepY||6;
  const chars = " .,:;i1tfLCG08#%@";
  let out = "";
  for(let y=0;y<R3.H;y+=stepY){
    let line = "";
    for(let x=0;x<R3.W;x+=stepX){
      const p = R3.fb[y*R3.W+x];
      const l = ((p&255)*0.3 + ((p>>8)&255)*0.59 + ((p>>16)&255)*0.11)/255;
      line += chars[Math.min(chars.length-1, (l*chars.length)|0)];
    }
    out += line + "\n";
  }
  return out;
};

window.R3 = R3;
})();
