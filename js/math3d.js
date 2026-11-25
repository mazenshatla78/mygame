/* THE BELL NEVER RINGS — 3D math helpers.
   World space: +X east, +Y up, +Z south. Right-handed (X x Y = Z).
   Camera yaw 0 looks toward +Z; yaw increases toward +X.
   View space: +Z is FORWARD (in front of camera), so no sign juggling. */
(function(){
"use strict";

const M3 = {
  /* rotate a local offset by yaw about Y (matches camera forward convention) */
  rotYInto(x, z, cosA, sinA, out){
    out.x = x*cosA + z*sinA;
    out.z = -x*sinA + z*cosA;
    return out;
  },

  /* Build a camera transform object.
     pos = world position, yaw = radians, pitch = radians (+ = looking up) */
  makeCamera(pos, yaw, pitch){
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return {
      x:pos.x, y:pos.y, z:pos.z, yaw, pitch,
      cy, sy, cp, sp,
      /* forward = (sin yaw, 0, cos yaw) ; right = (-cos yaw, 0, sin yaw) */
      fx:sy, fz:cy, rx:-cy, rz:sy
    };
  },

  /* world -> view.  Returns false if behind the near plane. */
  toView(cam, wx, wy, wz, out){
    const dx = wx - cam.x, dy = wy - cam.y, dz = wz - cam.z;
    const vx = dx*cam.rx + dz*cam.rz;          // dot with right
    const vz = dx*cam.fx + dz*cam.fz;          // dot with forward (depth)
    const vy0 = dy;
    out.x = vx;
    out.y = vy0*cam.cp - vz*cam.sp;            // pitch rotation
    out.z = vy0*cam.sp + vz*cam.cp;
    return out;
  },

  /* Project a view-space point. focal = (h/2)/tan(fovY/2). */
  project(vx, vy, vz, focal, cx, cy, out){
    const iz = 1/vz;
    out.x = cx + vx*iz*focal;
    out.y = cy - vy*iz*focal;
    out.z = iz;                                // store 1/z for depth + interpolation
    return out;
  }
};

window.M3 = M3;
})();
