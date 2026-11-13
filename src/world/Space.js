/* The "horizon" theme's world: you fall towards a black hole, and everything happens in its light.

   The hole is not a model. It is the sky: for every pixel a light ray is traced backwards from the
   camera through curved space (Schwarzschild geodesics, integrated step by step), the way Gargantua
   was rendered for Interstellar. A ray that crosses the accretion disk picks up its glow; a ray that
   falls below the horizon is black; a ray that escapes lands on the star field, wherever the bending
   left it pointing. That one loop gives the shadow, the photon ring, the disk's far side wrapped over
   the top and under the bottom, and stars smeared into arcs — none of it is drawn by hand.

   Units inside the shader: the Schwarzschild radius is 1. */
import * as THREE from "three";

const NOISE = `
  float hash3(vec3 p){ p=fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
  float vnoise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
  float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+7.1; a*=0.5; } return s; }`;

export function createSpace({ small = false, center = new THREE.Vector3(6, -30, -260), Rs = 9, axis = new THREE.Vector3(0, -0.22, -1).normalize(), depth = 440 } = {}) {
  const group = new THREE.Group();
  const N = new THREE.Vector3(0.05, 1, 0.07).normalize();                       // the disk's axis: you arrive a few degrees above its plane
  const U = new THREE.Vector3(1, 0, 0).cross(N).cross(N).negate().normalize(), W = new THREE.Vector3().crossVectors(N, U);

  /* Pass 1 — the expensive part, done small: trace every ray into a low-resolution buffer.
     rgb = light picked up from the disk, a = how much of the sky behind still shows (0 inside the shadow). */
  const nV = N.clone(), uV = U.clone(), wV = W.clone();                          // the disk's orientation as traced this frame
  const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false });
  const traceMat = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    defines: { STEPS: small ? 60 : 92 },
    uniforms: {
      uTime: { value: 0 }, uIn: { value: 0 }, uCam: { value: new THREE.Vector3(0, 5, 40) }, uStep: { value: small ? 0.12 : 0.075 },
      uN: { value: nV }, uU: { value: uV }, uW: { value: wV },
      uR: { value: new THREE.Vector3() }, uUp: { value: new THREE.Vector3() }, uF: { value: new THREE.Vector3() }, uTan: { value: new THREE.Vector2(1, 1) }
    },
    vertexShader: `varying vec2 vP; void main(){ vP=position.xy; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `uniform float uIn; uniform float uTime; uniform vec3 uCam; uniform float uStep; uniform vec3 uN; uniform vec3 uU; uniform vec3 uW;
      uniform vec3 uR; uniform vec3 uUp; uniform vec3 uF; uniform vec2 uTan; varying vec2 vP; ${NOISE}
      #define RIN 2.6
      #define ROUT 12.0
      // the accretion disk where a ray pierces its plane: hot gas in differential rotation, beamed towards you on the approaching side
      // gas pattern: slow to change along the orbit (A), quick to change across it (rr*sc) — long thin striations, as in a real disk
      float gas(float a, float rr, float sc, float A){ return fbm(vec3(cos(a)*A, sin(a)*A, rr*sc)); }
      // the accretion disk where a ray pierces its plane
      vec4 disk(vec3 hit, vec3 v){
        float rr=length(hit);
        float e=smoothstep(RIN,RIN+0.45,rr)*smoothstep(ROUT,ROUT*0.5,rr);
        if(e<=0.0) return vec4(0.0);
        float a0=atan(dot(hit,uW),dot(hit,uU));
        // Inner gas orbits faster than outer gas. Left to run, that shear winds any pattern into featureless rings —
        // so run it for a few seconds, then cross-fade to a fresh copy starting again. The spin never stops; the structure never smears.
        float om=2.6/pow(rr,1.5), P=8.0, ph=uTime/P;
        float t1=fract(ph), t2=fract(ph+0.5), w1=1.0-abs(2.0*t1-1.0);
        float aA=a0+om*P*(t1-0.5)+uTime*0.07, aB=a0+om*P*(t2-0.5)+uTime*0.07+2.3;
        // the closer the camera is to this patch of gas, the finer the striations it resolves
        float sc=clamp(9.0/max(length(hit-uCam),0.5),0.4,6.0);
        float arms=mix(gas(aB,rr,1.9,1.6),gas(aA,rr,1.9,1.6),w1);                // broad bright arms and dark gaps
        float fine=mix(gas(aB,rr,8.0*sc,4.0),gas(aA,rr,8.0*sc,4.0),w1);          // thin filaments riding on them
        float lanes=smoothstep(0.28,0.62,arms), fil=smoothstep(0.30,0.74,fine);
        float heat=pow(RIN/rr,1.2);
        float beam=pow(clamp(1.0+0.45*dot(normalize(cross(uN,hit)),-normalize(v)),0.45,1.5),2.0);   // brighter where the gas flies at you
        float i=e*(0.07+1.75*fil*(0.28+0.72*lanes)+0.3*lanes)*heat*beam;
        vec3 c=mix(vec3(1.0,0.88,0.64),vec3(1.0,0.52,0.15),smoothstep(RIN,ROUT*0.42,rr));
        c=mix(c,vec3(0.70,0.19,0.05),smoothstep(ROUT*0.38,ROUT,rr));
        c=mix(c,vec3(1.0,0.95,0.86),smoothstep(1.7,3.4,i)*0.55);                 // only the very hottest gas goes white
        return vec4(c*(1.0-exp(-i*1.2))*2.0, clamp(i*1.9,0.0,0.95)); }
      void main(){
        bool inside=uIn>0.5;
        vec3 p=uCam, v=normalize(uF+vP.x*uTan.x*uR+vP.y*uTan.y*uUp);
        vec3 hv=cross(p,v); float h2=dot(hv,hv);                                  // angular momentum of the photon: fixes how hard it bends
        float bend=inside?0.3:1.5;
        vec3 col=vec3(0.0); float T=1.0;
        for(int i=0;i<STEPS;i++){
          float r2=dot(p,p);
          if(inside){ if(r2<0.0064){ T=0.0; break; } }   // the singularity: all light ends here, so it shines
          else if(r2<1.0){ T=0.0; break; }                                        // from outside: below the horizon nothing comes back
          if(r2>(ROUT+2.0)*(ROUT+2.0) && dot(p,v)>0.0) break;                     // clear of everything and leaving
          float r=sqrt(r2), dt=inside?0.012+0.11*r:0.045+uStep*r;
          v-=bend*h2*p/(r2*r2*r)*dt;                                              // the bending of light (exact outside; eased inside)
          vec3 np=p+v*dt;
          float d0=dot(p,uN), d1=dot(np,uN);
          if(d0*d1<0.0){ vec4 dc=disk(mix(p,np,d0/(d0-d1)),v); col+=T*dc.rgb; T*=1.0-dc.a; if(T<0.02) break; }
          p=np;
        }
        if(inside){                                                               // whatever escapes is the outside sky, seen from below the horizon
          vec3 dd=normalize(v); vec3 g=floor(dd*46.0); float h=hash3(g);
          float st=step(0.9,h)*smoothstep(0.45,0.0,length(fract(dd*46.0)-0.5));
          col+=T*(vec3(0.012,0.018,0.05)+vec3(0.85,0.92,1.0)*st*1.1); T=0.0; }
        gl_FragColor=vec4(col,T); }`
  });
  const traceScene = new THREE.Scene(), traceCam = new THREE.Camera();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), traceMat); quad.frustumCulled = false; traceScene.add(quad);

  /* Pass 2 — full resolution: sharp stars (bent around the hole with the lens equation), times what the trace says still shows, plus the disk's light */
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uTime: { value: 0 }, uQuiet: { value: 0 }, uTrace: { value: rt.texture }, uRes: { value: new THREE.Vector2(1, 1) }, uBH: { value: new THREE.Vector3(0, 0, -1) }, uE2: { value: 0.01 }, uInside: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uInside; uniform float uTime; uniform float uQuiet; uniform sampler2D uTrace; uniform vec2 uRes; uniform vec3 uBH; uniform float uE2; varying vec3 vDir; ${NOISE}
      vec3 stars(vec3 d, float scale, float thresh, float size){
        vec3 g=floor(d*scale), f=fract(d*scale)-0.5; float h=hash3(g);
        vec3 off=(vec3(hash3(g+1.3),hash3(g+2.7),hash3(g+4.1))-0.5)*0.6;
        float b=smoothstep(size,0.0,length(f-off))*step(thresh,h);
        b*=0.65+0.35*sin(uTime*(1.0+h*3.0)+h*40.0);
        return mix(vec3(0.72,0.82,1.0), vec3(1.0,0.9,0.82), hash3(g+9.1))*b*(0.5+h); }
      void main(){
        if(uInside>0.5){ gl_FragColor=vec4(texture2D(uTrace,gl_FragCoord.xy/uRes).rgb,1.0); return; }   // past the horizon: the traced volume is all there is
        vec3 d=normalize(vDir);
        float c=dot(d,uBH), ang=acos(clamp(c,-1.0,1.0));
        vec3 tang=normalize(d-uBH*c+1e-5);
        float a2=abs(ang-uE2/max(ang,1e-3));                                       // lens equation: where this line of sight really came from
        vec3 ds=normalize(uBH*cos(a2)+tang*sin(a2));
        vec3 col=stars(ds,70.0,0.80,0.10)+stars(ds,130.0,0.84,0.12)*0.7+stars(ds,34.0,0.93,0.07)*1.8;
        float n=fbm(ds*2.3+3.0), band=exp(-pow(ds.y*2.4+n*0.9-0.2,2.0)*7.0);
        vec3 neb=mix(vec3(0.30,0.20,0.85),vec3(0.12,0.42,0.95),fbm(ds*4.1+11.0));
        col+=neb*band*n*n*0.3*(1.0-uQuiet*0.8)+vec3(0.004,0.005,0.014);
        vec4 bh=texture2D(uTrace,gl_FragCoord.xy/uRes);
        gl_FragColor=vec4(bh.rgb+col*bh.a,1.0); }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 32), skyMat);
  sky.renderOrder = -20; sky.frustumCulled = false; group.add(sky);

  /* ── inside the horizon ──
     The same tracer, with the viewpoint moved below the horizon. Nobody can say what that looks like, so the
     rules are bent on purpose (gentler bending, the disk continues inwards as plunging gas, the singularity
     shines) — but every pixel is still a light path, which is why it reads as a place and not a texture:
     a whirlpool of light for a floor, draining into the point ahead; the outside universe a patch of sky behind. */
  const end = center.clone().addScaledVector(axis, depth);

  /* a dark planet caught in the disk's light, off to the side of the last rooms */
  const planetPos = center.clone().add(new THREE.Vector3(-78, 34, 150));
  const toLight = center.clone().sub(planetPos).normalize();
  const planetMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uTime: { value: 0 }, uLight: { value: toLight } },
    vertexShader: `varying vec3 vN; varying vec3 vO; varying vec3 vV; void main(){ vO=position; vN=normalize(mat3(modelMatrix)*normal); vec4 w=modelMatrix*vec4(position,1.0); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform vec3 uLight; varying vec3 vN; varying vec3 vO; varying vec3 vV; ${NOISE}
      void main(){ vec3 n=normalize(vN), o=normalize(vO);
        float bands=fbm(vec3(o.x*1.5+uTime*0.01, o.y*7.0+fbm(o*3.0)*1.2, o.z*1.5));
        vec3 base=mix(vec3(0.05,0.07,0.20),vec3(0.20,0.24,0.55),bands);
        base=mix(base,vec3(0.36,0.30,0.70),smoothstep(0.55,0.8,fbm(o*5.0+2.0)));
        float lit=smoothstep(-0.08,0.5,dot(n,uLight));
        float rim=pow(1.0-max(dot(n,vV),0.0),3.0);
        vec3 warm=vec3(1.0,0.72,0.45);                                             // it is lit by the disk, so the light is warm
        vec3 col=base*warm*lit*1.5+mix(vec3(0.25,0.55,1.0),warm,0.5)*rim*(0.12+0.88*lit)*0.9+base*0.03;
        gl_FragColor=vec4(col,1.0); }`
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(15, 64, 48), planetMat);
  planet.position.copy(planetPos); planet.rotation.z = 0.35; group.add(planet);

  const d = new THREE.Vector3(), size = new THREE.Vector2(), fh = new THREE.Vector3(), look = new THREE.Vector3(), real = new THREE.Vector3(), virt = new THREE.Vector3(), upS = new THREE.Vector3(0, 1, 0);
  const api = { group, center, Rs, sky, end, falling: false, white: 0, dark: 0, r: 40 };
  /* call once per frame, before the main render. quiet 0…1 holds the nebula back behind the stair. */
  /* fall: 0…1 how far down you are (−1 = work it out from position). blend: 0…1 handover from "really flying towards it"
     to "falling in" (−1 = from position). While falling, where you are is not a place in the scene but a depth: an orbit
     that tightens from 9 Schwarzschild radii to just above the horizon, with the hole kept ahead of you. Same exact tracer
     throughout — so every room is the real view from that depth, and by the last one the hole is most of the sky. */
  function update(t, cam, quiet, renderer, fall = -1, blend = -1) {
    const zAx = d.subVectors(cam.position, center).dot(axis);
    if (fall < 0) { fall = THREE.MathUtils.smoothstep(zAx, 20, depth - 150); blend = zAx > 0 ? 1 : 0; }
    api.falling = blend > 0.45;
    planet.visible = blend < 0.5;
    api.white = 1 - THREE.MathUtils.smoothstep(cam.position.distanceTo(end), 10, 46);    // the singularity whites everything out
    renderer.getDrawingBufferSize(size);                                         // the composer renders at this size
    const k = small ? 0.42 : 0.52;
    const w = Math.max(64, Math.round(size.x * k)), h = Math.max(64, Math.round(size.y * k));
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);
    const u = traceMat.uniforms, q = cam.quaternion, tan = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    u.uR.value.set(1, 0, 0).applyQuaternion(q); u.uUp.value.set(0, 1, 0).applyQuaternion(q); u.uF.value.set(0, 0, -1).applyQuaternion(q);
    u.uTan.value.set(tan * cam.aspect, tan); u.uTime.value = t; u.uIn.value = 0;
    real.copy(cam.position).sub(center).divideScalar(Rs);
    if (blend > 0) {
      const f1 = Math.min(fall, 1), plunge = THREE.MathUtils.clamp((fall - 1) / 0.04, 0, 1);
      // the framing that always works: the whole hole and its disk, from a distance, a few degrees above the plane.
      // 26 Rs at the first room → 10 Rs at the last (it more than doubles in size), then straight in.
      // the Interstellar view, exact: the whole hole with its disk, seen from just above the disk's plane.
      // Each event is closer; after the last one you go in.
      // low over the spinning disk: it is the floor under every event, the hole is on the horizon ahead.
      // Then, after the last event, straight in.
      const rv = THREE.MathUtils.lerp(7 - 2 * f1, 1.0, plunge * plunge), el = 0.22 - 0.03 * f1;   // 7 → 5 Rs: closer each event, never so close the light leaves the frame
      // put it where the layout leaves room — by screen position, not world direction, because the camera pitches and
      // banks between rooms: desktop = the gap between the text and the painting; phone = top right, above the painting
      const ax = small ? 0 : -0.1 * tan * cam.aspect, ay = small ? 0.74 * tan : 0.36 * tan;   // hole high in the open gap, so the disk fills everything below it
      fh.copy(u.uF.value).addScaledVector(u.uR.value, ax).addScaledVector(u.uUp.value, ay).normalize();
      const first = !look.lengthSq();
      look.lerp(fh, first ? 1 : 0.06).normalize();                              // eased: it swings as you turn, then settles back
      upS.lerp(u.uUp.value, first ? 1 : 0.06).normalize();
      virt.copy(look).multiplyScalar(-rv);                                      // the hole is ahead of you
      // tilt the disk for that view: you sit `el` above its plane, with a slight roll so it is never a flat line
      nV.copy(upS).addScaledVector(look, -upS.dot(look)).normalize().applyAxisAngle(look, 0.16).multiplyScalar(Math.cos(el)).addScaledVector(look, -Math.sin(el));
      nV.lerp(N, 1 - blend).normalize();
      // hand over from the real approach: blend direction and distance separately so the path never cuts through the hole
      const rr = THREE.MathUtils.lerp(Math.max(real.length(), 1.3), rv, blend);
      u.uCam.value.copy(real).normalize().lerp(virt.clone().normalize(), blend).addScaledVector(N, 0.5 * Math.sin(Math.PI * blend)).normalize().multiplyScalar(rr);   // swing over the top, never through the middle
    } else { look.set(0, 0, 0); nV.copy(N); u.uCam.value.copy(real); }
    uV.set(1, 0, 0).cross(nV); if (uV.lengthSq() < 1e-4) uV.set(0, 0, 1).cross(nV); uV.normalize(); wV.crossVectors(nV, uV);
    api.r = u.uCam.value.length();
    api.dark = 1 - THREE.MathUtils.smoothstep(api.r, 1.02, 1.3);               // the last of the light, as you cross the horizon
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(rt); renderer.render(traceScene, traceCam); renderer.setRenderTarget(prev);
    sky.position.copy(cam.position);
    const s = skyMat.uniforms;
    s.uBH.value.copy(u.uCam.value).multiplyScalar(-1 / api.r); s.uE2.value = 2 / api.r; s.uRes.value.copy(size); s.uInside.value = 0;
    s.uTime.value = planetMat.uniforms.uTime.value = t; s.uQuiet.value = quiet;
    planet.rotation.y = t * 0.012;
  }
  api.update = update; return api;
}
