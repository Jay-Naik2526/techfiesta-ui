/* The world: one persistent Three.js scene that every page lives inside.
   An Interstellar-style tesseract — an endless lattice of beams and light strands —
   with an impossible (Penrose) staircase floating in a void at its centre.
   Pages never load new scenes; they ask the camera to go somewhere (setMode). */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { createAstronaut } from "./Astronaut.js";
import { createHypercube } from "./Hypercube.js";
import { createSpace } from "./Space.js";
import { THEME } from "../lib/theme.js";
import { sound } from "../lib/sound.js";
import gsap from "gsap";
import { EVENTS } from "../data/events.js";
import { FEST, dayLabel } from "../data/fest.js";
import { artAsImageSrc } from "../data/art.js";
import { MOMENTS, MOMENT_SHEET, HERO_FILM } from "../data/moments.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (x) => x * x * (3 - 2 * x);
const N = EVENTS.length;
export const PAL = { void: 0x05060d, beam: 0x161b38, stone: 0xc3c7de, violet: 0x7c5cff, blue: 0x4da3ff, cyan: 0x39e1ff, magenta: 0xff4fd8, white: 0xe8e9ff };

/* ─── the stair: a loop of 32 steps that climbs and still meets its own start ───
   Steps go +x 10, +z 10, −x 6, −z 6 while rising a quarter-step each. The loop "fails to close"
   by a vector parallel to the view direction (1,2,1) — so from that direction the gap vanishes. */
const VIEW = V(1, 2, 1).normalize();
const D_CAM = 44;                 // hero camera distance along VIEW
const STEP = 1.45, RISE = 0.25 * STEP, BLOCK_H = 3.4;
const FLIGHTS = [[V(1, 0, 0), 10], [V(0, 0, 1), 10], [V(-1, 0, 0), 6], [V(0, 0, -1), 6]];
const M = FLIGHTS.reduce((s, f) => s + f[1], 0);

/* Pre-distort for perspective: shrink everything across the view axis by (D − z)/D, so a real
   perspective camera at VIEW·D sees exactly the parallel projection — and the seam stays closed. */
function predistort(p) {
  const z = p.dot(VIEW), k = (D_CAM - z) / D_CAM;
  return { pos: p.clone().sub(VIEW.clone().multiplyScalar(z)).multiplyScalar(k).addScaledVector(VIEW, z), k };
}
function predistortMatrix(center, extra = new THREE.Matrix4()) {
  const { pos, k } = predistort(center), d = VIEW;
  const a = (i, j) => (i === j ? k : 0) + (1 - k) * d.getComponent(i) * d.getComponent(j);
  const A = new THREE.Matrix4().set(a(0, 0), a(0, 1), a(0, 2), 0, a(1, 0), a(1, 1), a(1, 2), 0, a(2, 0), a(2, 1), a(2, 2), 0, 0, 0, 0, 1);
  return new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z).multiply(A).multiply(extra);
}

/* ─── the tesseract lattice ─── */
const CELL = 12;
const LAT = { x: [-6, 6], y: [-6, 6], z: [-26, 6] };
const VOID_R = 21;

/* ─── each event is a cell of the tesseract, deeper and deeper along a twisting path ─── */
/* horizon theme: the rooms are inside the black hole, on a spiral around its axis */
const HORIZON = THEME === "horizon";
const HOLE = V(6, -30, -260), HOLE_RS = 9, AXIS = V(0, -0.22, -1).normalize();
const AX1 = V(1, 0, 0), AX2 = new THREE.Vector3().crossVectors(AXIS, AX1).normalize();
const HELIX0 = 46, PITCH = 24, DEPTH = HELIX0 + (EVENTS.length - 1) * PITCH + 150;
const cellAt = (i) => {
  if (HORIZON) { const th = i * 1.05; return HOLE.clone().addScaledVector(AXIS, HELIX0 + i * PITCH).addScaledVector(AX1, Math.cos(th) * 11).addScaledVector(AX2, Math.sin(th) * 11); }
  const gx = Math.round(Math.sin(i * 1.3) * 1.2), gy = Math.round(Math.cos(i * 0.9));
  return V(CELL / 2 + gx * CELL, CELL / 2 + gy * CELL, -30 - i * 2 * CELL);
};

export const STOP = { hero: 0, trick: 1, descent: 2, ex0: 3, bottom: 3 + N, top: 4 + N };
export const STOPS = STOP.top + 1;
export const STOP_LABELS = ["The stair", "The trick", THEME === "horizon" ? "Towards the horizon" : "Into the tesseract", ...EVENTS.map((e) => `Nº ${e.no} · ${e.short || e.title}`), THEME === "horizon" ? "The event horizon" : "The far wall", "Back to the start"];

export class World {
  constructor(canvas) {
    this.canvas = canvas;
    this.small = matchMedia("(max-width: 899px)").matches;
    this.reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
    this.mode = { type: "journey" };
    this.stopSource = () => 0;
    this.sCur = 0;
    this.intro = 2.2;
    this.broken = 1;
    this.wordIn = 0;
    this.kick = 0;
    this.blend = 1;
    this.from = null;
    this.mouse = { x: 0, y: 0, sx: 0, sy: 0, ndc: new THREE.Vector2(9, 9) };
    this.hovered = -1;
    this.listeners = { hover: new Set(), click: new Set(), rewind: new Set() };
    this.info = { depth: 0, label: STOP_LABELS[0], progress: 0 };
    this.paused = false;
    this.clock = new THREE.Clock();
    this._build();
    this._input();
  }

  /* ═════════════ construction ═════════════ */
  _build() {
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: !this.small, powerPreference: "high-performance" }));
    this.dpr = Math.min(devicePixelRatio, this.small ? 1.3 : 1.75);
    r.setPixelRatio(this.dpr);
    r.setSize(innerWidth, innerHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping;     // filmic, with contrast (AgX read flat and soft here)
    r.toneMappingExposure = 0.95;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = !this.small;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(PAL.void);
    scene.fog = new THREE.FogExp2(PAL.void, 0.006);
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.28;
    this.camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.2, 900);

    /* lights: cool key from above, violet rim from below-behind, a lantern that travels with the camera */
    scene.add(new THREE.HemisphereLight(0xa9b8ff, 0x0b0820, 0.18));
    const key = new THREE.DirectionalLight(0xe3e7ff, 2.8);
    key.position.set(26, 34, -4); key.target.position.set(0, 0, 0); scene.add(key, key.target);
    if (r.shadowMap.enabled) {
      key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
      Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 4, far: 90 });
      key.shadow.bias = -0.0003; key.shadow.normalBias = 0.03; key.shadow.radius = 4;
    }
    const rim = new THREE.DirectionalLight(0x8b5cff, 2.2); rim.position.set(-22, -8, -16); scene.add(rim);
    const rim2 = new THREE.DirectionalLight(0x4da3ff, 1.2); rim2.position.set(20, -4, -24); scene.add(rim2);
    this.lantern = new THREE.PointLight(0xcfd8ff, 9, 26, 1.8); scene.add(this.lantern);

    // (film now plays as the opening shot in the loader, not behind the stair)
    this._stairs();
    this.theme = THEME;
    const horizon = this.theme === "horizon";                       // deep space + black hole instead of the lattice
    if (!horizon) { this._lattice(); this._rooms(); }
    this._cells();
    if (!horizon) this._tunnel();
    {  // the far wall. Tesseract theme: a true 4D hypercube. Horizon theme: the black hole you have been falling towards.
      const last = cellAt(N - 1), p = last.clone().add(V(0, 2, -16)), dir = last.clone().add(V(0, -26, -90)).sub(p).normalize();
      const tan = Math.tan(THREE.MathUtils.degToRad(13.5)), asp = innerWidth / innerHeight;
      if (horizon) {
        this.space = createSpace({ small: this.small, center: HOLE.clone(), Rs: HOLE_RS, axis: AXIS.clone(), depth: DEPTH });
        scene.add(this.space.group);
      } else {
        this.hyper = createHypercube({ R: this.small ? 3.2 : 3.3, near: PAL.cyan, far: PAL.violet });
        this.hyper.group.position.copy(p).addScaledVector(dir, 46).add(this.small ? V(0, 5.5, 0) : V(46 * tan * asp * 0.36, 1.0, 0));
        scene.add(this.hyper.group);
      }
    }

    this._astronaut();
    this._rails();
    /* "Paradox", floating behind the stair */
    this.heroWord = new THREE.Mesh(new THREE.PlaneGeometry(30, 9.4), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 }));
    this.heroWord.position.copy(VIEW).multiplyScalar(-18).add(V(0, 3.5, 0));
    scene.add(this.heroWord);

    /* post */
    // composer targets get their own MSAA — the canvas's antialias flag doesn't reach post-processing
    const rt = new THREE.WebGLRenderTarget(innerWidth * this.dpr, innerHeight * this.dpr, { type: THREE.HalfFloatType, samples: this.small ? 0 : 4 });
    const comp = (this.composer = new EffectComposer(r, rt));
    comp.setPixelRatio(this.dpr); comp.setSize(innerWidth, innerHeight);
    comp.addPass(new RenderPass(scene, this.camera));
    if (!this.small) {
      const ao = new GTAOPass(scene, this.camera, innerWidth, innerHeight);
      ao.output = GTAOPass.OUTPUT.Default; ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      comp.addPass(ao); this.ao = ao;
    }
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth / (this.small ? 4 : 2), innerHeight / (this.small ? 4 : 2)), 0.65, 0.55, 0.93));
    comp.addPass(new OutputPass());
    this.finish = new ShaderPass({
      defines: { TAPS: this.small ? 3 : 7 },   // the warp blur: fewer taps on phones
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAb: { value: 0.00025 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) }, uFlash: { value: 0 }, uWarp: { value: 0 }, uTrail: { value: Array.from({ length: 6 }, () => new THREE.Vector3(0.5, 0.5, 0)) }, uDark: { value: 0 }, uWhite: { value: 0 }, uHole: { value: new THREE.Vector3(0.5, 0.5, 0) } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uAb; uniform vec2 uRes; uniform float uFlash; uniform float uWarp; uniform vec3 uTrail[6]; uniform float uDark; uniform float uWhite; uniform vec3 uHole; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        vec3 tap(vec2 uv, vec2 o){ return vec3(texture2D(tDiffuse,uv+o).r, texture2D(tDiffuse,uv).g, texture2D(tDiffuse,uv-o).b); }
        void main(){ vec2 c=vUv-0.5; float d=length(c);
          vec2 uv=0.5+c*(1.0-uWarp*0.22*d*d);
          vec2 bend=vec2(0.0); float lens=0.0; float asp=uRes.x/uRes.y;
          for(int i=0;i<6;i++){ vec2 dd=vUv-uTrail[i].xy; vec2 da=vec2(dd.x*asp,dd.y); float wv=uTrail[i].z*exp(-dot(da,da)*70.0); bend+=dd*wv; lens+=wv; }
          uv-=bend*0.3;
          // horizon theme: your cursor is a pocket black hole — it lenses whatever is behind it (xy = position, z = radius in px)
          float hr=uHole.z, hpx=1e6;
          if(hr>0.5){ vec2 hd=vUv-uHole.xy; hpx=length(hd*uRes); uv-=hd*clamp(hr*hr*2.4/(hpx*hpx+hr*hr*0.3),0.0,3.0)*step(hpx,hr*9.0); }
          vec2 o=c*(uAb+uFlash*0.008+uWarp*0.004)*(1.0+d*4.0)+bend*0.02;
          vec3 col=vec3(0.0); float tot=0.0;
          for(int i=0;i<TAPS;i++){ float k=float(i)/float(TAPS-1); float w=1.0-k*0.6; col+=tap(0.5+(uv-0.5)*(1.0-k*uWarp*0.07), o)*w; tot+=w; }
          col/=tot;
          col=mix(col, col*vec3(0.92,0.95,1.08)+vec3(0.006,0.004,0.02), 0.6);      // cool grade, indigo shadows
          col*=mix(1.0, 0.5, smoothstep(0.32, 0.95, d));
          col+=(h(vUv*uRes+fract(uTime)*97.0)-0.5)*0.04;
          if(hr>0.5){ col*=smoothstep(hr*0.95,hr*1.1,hpx); col+=vec3(1.0,0.86,0.62)*exp(-pow((hpx-hr*1.2)/(hr*0.1),2.0))*0.85; }
          col*=1.0-uDark; col=mix(col,vec3(1.0,0.97,0.9),uWhite);
          gl_FragColor=vec4(col,1.0); }`
    });
    comp.addPass(this.finish);
  }

  /* the hero film: a video plane that rides with the camera, behind everything, fading as you dive */
  _film() {
    const v = (this.video = document.createElement("video"));
    Object.assign(v, { src: HERO_FILM, muted: true, loop: true, playsInline: true, crossOrigin: "anonymous", preload: "auto" });
    v.setAttribute("playsinline", ""); v.setAttribute("muted", "");
    this.filmOk = false;
    v.addEventListener("loadeddata", () => { this.filmOk = true; }, { once: true });
    v.addEventListener("error", () => { this.filmOk = false; }, { once: true });
    const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace;
    this.film = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));
    this.film.renderOrder = -10; this.film.frustumCulled = false;
    this.camera.add(this.film); this.scene.add(this.camera);
    this.filmIn = 0;
  }
  /** start the film; with sound, its audio becomes the soundtrack */
  startFilm(withSound) {
    if (!this.video) return;
    this.video.muted = !withSound; this.video.volume = withSound ? 0.7 : 0;
    this.video.play().catch(() => { this.video.muted = true; this.video.play().catch(() => {}); });
    gsap.to(this, { filmIn: 1, duration: 3, ease: "power2.out" });
  }
  setFilmSound(on) { if (this.video) { this.video.muted = !on; this.video.volume = on ? 0.7 : 0; } }

  _stairs() {
    // walk the loop
    const pts = []; const p = V(0, 0, 0);
    FLIGHTS.forEach(([dir, n]) => { for (let k = 0; k < n; k++) { pts.push({ c: p.clone(), dir }); p.addScaledVector(dir, STEP); p.y += RISE; } });
    this.LOOP_GAP = p.clone();                                   // where step 32 would be: parallel to VIEW
    const mean = pts.reduce((m, s) => m.add(s.c), V(0, 0, 0)).multiplyScalar(1 / pts.length);
    mean.y += 1.4;
    pts.forEach((s) => s.c.sub(mean));
    this.steps = pts;
    // Move the seam into the half of the loop that climbs AWAY from the camera (flights 3–4).
    // There, "earlier = nearer" holds for every pair whose images overlap, so the depth
    // order agrees with the illusion and the seam can't crack.
    this.SEAM = FLIGHTS[0][1] + FLIGHTS[1][1] + FLIGHTS[2][1];      // first block of the last flight
    this.render = pts.map((s, i) => (i >= this.SEAM ? s.c.clone().sub(this.LOOP_GAP) : s.c.clone()));

    const geo = new RoundedBoxGeometry(STEP, BLOCK_H, STEP, 3, 0.07);
    geo.translate(0, -BLOCK_H / 2, 0);                            // block hangs below its tread
    const mat = new THREE.MeshStandardMaterial({ color: PAL.stone, roughness: 0.62, metalness: 0.0, envMapIntensity: 0.6 });
    this.stair = new THREE.InstancedMesh(geo, mat, M);
    this.stair.castShadow = this.stair.receiveShadow = true;
    // each tread gets a thin glowing lip so the climb reads in the dark
    // proper treads: a lighter slab on every step with a small nosing over the riser
    this.tread = new THREE.InstancedMesh(new RoundedBoxGeometry(STEP * 1.0, 0.14, STEP * 1.08, 2, 0.03).translate(0, -0.05, STEP * 0.04), new THREE.MeshStandardMaterial({ color: 0xe9ebfb, roughness: 0.42, envMapIntensity: 0.8 }), M);
    this.tread.castShadow = this.tread.receiveShadow = true;
    this.scene.add(this.tread);
    this.lip = new THREE.InstancedMesh(new THREE.BoxGeometry(STEP * 0.98, 0.035, 0.05).translate(0, 0.005, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.violet).multiplyScalar(2.2) }), M);
    this.scene.add(this.stair, this.lip);
    // a soft violet glow under the stair, so it sits in the void instead of on nothing
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, "rgba(124,92,255,0.55)"); g.addColorStop(0.45, "rgba(77,120,255,0.18)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = -BLOCK_H - 2.5; this.scene.add(glow);
    this.explode = pts.map((s) => s.c.clone().normalize().multiplyScalar(4 + Math.random() * 5).add(V(0, (Math.random() - 0.5) * 8, 0)));
    this._poseStairs();

    // walkers: three small figures climbing forever
    const body = new THREE.CapsuleGeometry(0.11, 0.34, 4, 10).translate(0, 0.28, 0);
    const head = new THREE.SphereGeometry(0.11, 16, 12).translate(0, 0.62, 0);
    const wm = new THREE.MeshStandardMaterial({ color: 0x0c0f22, emissive: new THREE.Color(PAL.blue), emissiveIntensity: 1.4, roughness: 0.4 });
    this.walkers = [0, 11, 22].map((offset) => {
      const g = new THREE.Group(); g.add(new THREE.Mesh(body, wm), new THREE.Mesh(head, wm));
      g.children.forEach((mm) => (mm.castShadow = true));
      this.scene.add(g); return { g, offset };
    });
  }
  _poseStairs() {
    if (this._lastBroken === this.broken) return;
    this._lastBroken = this.broken;
    const rot = new THREE.Matrix4(), b = this.broken;
    this.steps.forEach((s, i) => {
      const c = this.render[i].clone().addScaledVector(this.explode[i], b);
      rot.makeRotationAxis(V(0.3, 1, 0.2).normalize(), b * (i % 2 ? 0.6 : -0.6));
      this.stair.setMatrixAt(i, predistortMatrix(c, rot));
      const face = new THREE.Matrix4().makeRotationY(Math.atan2(s.dir.x, s.dir.z)).premultiply(rot); // nosing points along the climb
      this.tread.setMatrixAt(i, predistortMatrix(c, face));
      const edge = c.clone().addScaledVector(s.dir, STEP / 2 - 0.02);
      const lipRot = new THREE.Matrix4().makeRotationY(s.dir.x !== 0 ? Math.PI / 2 : 0).premultiply(rot);
      this.lip.setMatrixAt(i, predistortMatrix(edge, lipRot));
    });
    this.stair.instanceMatrix.needsUpdate = true; this.lip.instanceMatrix.needsUpdate = true; this.tread.instanceMatrix.needsUpdate = true;
  }
  _poseWalkers(t) {
    this.walkers.forEach(({ g, offset }) => {
      const s = (t * 0.75 + offset) % M, i = Math.floor(s), f = s - i;
      const a = this.steps[i], next = i + 1 < M ? this.steps[i + 1].c : this.steps[0].c.clone().add(this.LOOP_GAP);
      const pos = a.c.clone().lerp(next, smooth(f)).add(V(0, Math.sin(f * Math.PI) * 0.12 + 0.07, 0));
      if (i >= this.SEAM) pos.sub(this.LOOP_GAP);                  // same period as the rendered blocks: the jump is along the view, so it's invisible
      const { pos: pp, k } = predistort(pos);
      g.position.copy(pp); g.scale.setScalar(k * (1 - this.broken));
      g.rotation.y = Math.atan2(a.dir.x, a.dir.z);
      g.visible = this.broken < 0.5;
    });
  }

  _lattice() {
    /* the frame: matte ribs on every cell edge */
    const beams = [], w = 0.16;
    const sight = (v) => { const t = v.dot(VIEW); return t > -10 && t < 80 && v.clone().sub(VIEW.clone().multiplyScalar(t)).length() < 15; };
    // keep every camera→painting sightline clear (desktop and phone framings)
    const segs = EVENTS.flatMap((_, i) => [false, true].map((wide) => { const f = this.focusPose(i, 1, wide); return [f.p, cellAt(i)]; }));
    const segDist = (v, a, b) => { const ab = b.clone().sub(a), t = clamp(v.clone().sub(a).dot(ab) / ab.lengthSq()); return v.distanceTo(a.clone().addScaledVector(ab, t)); };
    const blocks = (v, axis) => segs.some(([a, b]) => { for (let k = -1; k <= 1; k++) { const q = v.clone(); q.setComponent(axis, q.getComponent(axis) + k * CELL * 0.45); if (segDist(q, a, b) < 3.2) return true; } return false; });
    const inside = (v, axis) => v.z > -VOID_R - 6 || sight(v) || blocks(v, axis);
    for (let ix = LAT.x[0]; ix <= LAT.x[1]; ix++) for (let iy = LAT.y[0]; iy <= LAT.y[1]; iy++) for (let iz = LAT.z[0]; iz <= LAT.z[1]; iz++) {
      const n = V(ix * CELL, iy * CELL, iz * CELL);
      if (ix < LAT.x[1]) { const mm = n.clone().add(V(CELL / 2, 0, 0)); if (!inside(mm, 0)) beams.push([mm, 0]); }
      if (iy < LAT.y[1]) { const mm = n.clone().add(V(0, CELL / 2, 0)); if (!inside(mm, 1)) beams.push([mm, 1]); }
      if (iz < LAT.z[1]) { const mm = n.clone().add(V(0, 0, CELL / 2)); if (!inside(mm, 2)) beams.push([mm, 2]); }
    }
    this.beamU = { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() } };   // kept for the tick; the frame itself is calm
    const frameM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1b2038, roughness: 0.6, metalness: 0.35, emissive: 0x0a0d22, emissiveIntensity: 1 }), beams.length);
    const d = new THREE.Object3D();
    beams.forEach(([mm, axis], i) => { d.position.copy(mm); d.scale.set(axis === 0 ? CELL : w, axis === 1 ? CELL : w, axis === 2 ? CELL : w); d.updateMatrix(); frameM.setMatrixAt(i, d.matrix); });
    this.scene.add(frameM);

    /* the walls: long parallel slats running into the distance, like shelves stretched through time */
    const zA = LAT.z[0] * CELL, zB = LAT.z[1] * CELL, PER = this.small ? 3 : 5, slats = [];
    const addRun = (x, y, sx, sy) => {
      // split around the void so nothing runs through the stair
      slats.push([x, y, sx, sy, zA, -VOID_R - 6]);
    };
    for (let ix = LAT.x[0]; ix <= LAT.x[1]; ix++) for (let iy = LAT.y[0]; iy < LAT.y[1]; iy++) for (let k = 0; k < PER; k++)
      addRun(ix * CELL, iy * CELL + ((k + 0.5) * CELL) / PER, 0.05, 0.11);           // ribs on the side walls
    for (let iy = LAT.y[0]; iy <= LAT.y[1]; iy++) for (let ix = LAT.x[0]; ix < LAT.x[1]; ix++) for (let k = 0; k < PER; k++)
      addRun(ix * CELL + ((k + 0.5) * CELL) / PER, iy * CELL, 0.11, 0.05);           // and on the floors and ceilings
    const slatM = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x2a3156, roughness: 0.5, metalness: 0.25, emissive: 0x0c1030, emissiveIntensity: 1 }), slats.length);
    slats.forEach(([x, y, sx, sy, a, b], i) => { d.position.set(x, y, (a + b) / 2); d.scale.set(sx, sy, Math.abs(b - a)); d.updateMatrix(); slatM.setMatrixAt(i, d.matrix); });
    this.scene.add(slatM);

    /* threads: a few fine strings at every corridor corner, shimmering slowly */
    const pos = [], seed = [];
    for (let ix = LAT.x[0]; ix <= LAT.x[1]; ix++) for (let iy = LAT.y[0]; iy <= LAT.y[1]; iy++) {
      const x0 = ix * CELL, y0 = iy * CELL;
      for (let k = 0; k < (this.small ? 1 : 3); k++) { const x = x0 + (k - 1) * 0.35, y = y0 + 0.35; pos.push(x, y, zA, x, y, -VOID_R - 6); const sd = Math.random(); seed.push(sd, sd); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.Float32BufferAttribute(seed, 1));
    this.strandMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uFog: { value: 0.01 } },
      vertexShader: `attribute float seed; varying float vSeed; varying float vZ; varying float vDepth;
        void main(){ vSeed=seed; vec4 w=modelMatrix*vec4(position,1.); vZ=w.z; vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uTime; uniform float uFog; varying float vSeed; varying float vZ; varying float vDepth;
        void main(){ float shimmer=0.5+0.5*sin(vZ*0.05 - uTime*0.6 + vSeed*20.0);
          vec3 col=mix(vec3(0.62,0.68,1.0), vec3(0.78,0.7,1.0), vSeed);
          float a=(0.10+0.16*shimmer);
          float keep=exp(-uFog*uFog*vDepth*vDepth);
          gl_FragColor=vec4(col*a*keep, a*keep); }`
    });
    this.scene.add(new THREE.LineSegments(g, this.strandMat));

    /* dust, one soft colour */
    const n = this.small ? 500 : 1400, p = new Float32Array(n * 3), s = new Float32Array(n);
    for (let k = 0; k < n; k++) { p.set([(Math.random() - 0.5) * 70, (Math.random() - 0.5) * 60, 30 - Math.random() * 340], k * 3); s[k] = 0.5 + Math.random(); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(p, 3)); dg.setAttribute("aS", new THREE.BufferAttribute(s, 1));
    this.dust = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPx: { value: this.dpr } },
      vertexShader: `attribute float aS; uniform float uTime; uniform float uPx; varying float vA;
        void main(){ vec3 p=position; p.y+=sin(uTime*0.15*aS+p.x)*1.0; p.x+=cos(uTime*0.1*aS+p.z)*0.7; vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=min(aS*uPx*20.0/-mv.z, 4.0*uPx); vA=clamp(1.0-(-mv.z)/60.0,0.0,1.0)*smoothstep(2.0,7.0,-mv.z); }`,
      fragmentShader: `varying float vA; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vA*0.45; gl_FragColor=vec4(vec3(0.8,0.82,1.0)*a,a); }`
    });
    this.scene.add(new THREE.Points(dg, this.dust));
  }

  /* the rooms: moments in time, one on every few cell walls, repeated through the lattice like the film's endless bedroom */
  _rooms() {
    const slots = [];
    const segs = EVENTS.flatMap((_, i) => [false, true].map((wide) => [this.focusPose(i, 1, wide).p, cellAt(i)]));
    const segDist = (v, a, b) => { const ab = b.clone().sub(a), t = clamp(v.clone().sub(a).dot(ab) / ab.lengthSq()); return v.distanceTo(a.clone().addScaledVector(ab, t)); };
    for (let ix = LAT.x[0]; ix <= LAT.x[1]; ix++) for (let iy = LAT.y[0]; iy < LAT.y[1]; iy++) for (let iz = LAT.z[0]; iz < LAT.z[1]; iz++) {
      const c = V(ix * CELL + (ix % 2 ? 0.25 : -0.25), iy * CELL + CELL / 2, iz * CELL + CELL / 2);
      if (c.z > -VOID_R - 6 || Math.random() > 0.38) continue;
      if (segs.some(([a, b]) => segDist(c, a, b) < 4.5)) continue;          // never in front of a painting
      slots.push(c);
    }
    const geo = new THREE.PlaneGeometry(CELL * 0.62, CELL * 0.465);
    const seeds = new Float32Array(slots.length), tiles = new Float32Array(slots.length);
    slots.forEach((_, i) => { seeds[i] = Math.random(); tiles[i] = Math.floor(Math.random() * 16); });
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    geo.setAttribute("aTile", new THREE.InstancedBufferAttribute(tiles, 1));
    this.roomMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uFog: { value: 0.01 }, uAtlas: { value: null }, uReady: { value: 0 } },
      vertexShader: `attribute float aSeed; attribute float aTile; varying vec2 vUv; varying float vSeed; varying float vTile; varying float vDepth;
        void main(){ vUv=uv; vSeed=aSeed; vTile=aTile; vec4 w=modelMatrix*instanceMatrix*vec4(position,1.0); vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D uAtlas; uniform float uTime; uniform float uFog; uniform float uReady; varying vec2 vUv; varying float vSeed; varying float vTile; varying float vDepth;
        void main(){
          if (uReady < 0.5) discard;
          float col4=mod(vTile,4.0), row=floor(vTile/4.0);
          vec2 tuv=vec2((col4+vUv.x)/4.0, ((3.0-row)+vUv.y)/4.0);
          vec3 img=texture2D(uAtlas,tuv).rgb;
          float l=dot(img,vec3(0.3,0.59,0.11));
          vec3 col=mix(img, vec3(l)*vec3(0.72,0.78,1.15), 0.5)*0.62;                  // a memory: cooled, dimmed
          float e=smoothstep(0.0,0.07,vUv.x)*smoothstep(0.0,0.07,1.0-vUv.x)*smoothstep(0.0,0.09,vUv.y)*smoothstep(0.0,0.09,1.0-vUv.y);
          float life=0.72+0.28*sin(uTime*0.35+vSeed*30.0);
          float keep=exp(-uFog*uFog*vDepth*vDepth);
          gl_FragColor=vec4(col, e*0.6*life*keep);
        }`
    });
    const mesh = new THREE.InstancedMesh(geo, this.roomMat, slots.length);
    const d = new THREE.Object3D();
    slots.forEach((c, i) => { d.position.copy(c); d.rotation.set(0, Math.PI / 2, 0); d.updateMatrix(); mesh.setMatrixAt(i, d.matrix); });
    mesh.frustumCulled = false;
    this.scene.add(mesh);
  }

  /* 16 tiles in one texture: your photos if MOMENTS has any, otherwise the event artwork */
  async _bakeMoments() {
    if (!this.roomMat) return;                                      // horizon theme has no rooms to fill
    const TW = 512, TH = 384, c = document.createElement("canvas"); c.width = TW * 4; c.height = TH * 4;
    const x = c.getContext("2d");
    const load = (src) => new Promise((res) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
    const sheet = MOMENT_SHEET ? await load(MOMENT_SHEET) : null;
    if (sheet) {
      x.drawImage(sheet, 0, 0, c.width, c.height);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
      this.roomMat.uniforms.uAtlas.value = t; this.roomMat.uniforms.uReady.value = 1;
      return;
    }
    const photos = (await Promise.all(MOMENTS.slice(0, 16).map(load))).filter(Boolean);
    const arts = photos.length ? [] : await Promise.all(EVENTS.map((e) => load(artAsImageSrc(e.art))));
    for (let k = 0; k < 16; k++) {
      const ox = (k % 4) * TW, oy = Math.floor(k / 4) * TH;
      if (photos.length) {
        const im = photos[k % photos.length], sc = Math.max(TW / im.width, TH / im.height), w = im.width * sc, h = im.height * sc;
        x.drawImage(im, ox + (TW - w) / 2, oy + (TH - h) / 2, w, h);
      } else {
        const e = EVENTS[k % EVENTS.length], im = arts[k % EVENTS.length];
        x.fillStyle = "#e8e9ff"; x.fillRect(ox, oy, TW, TH);
        if (im) x.drawImage(im, ox + 40, oy + 22, 300, 270);
        x.fillStyle = "#0b0d1c"; x.textBaseline = "top";
        x.font = "500 15px 'DM Mono', monospace"; x.fillText(`Nº ${e.no}`, ox + 360, oy + 40);
        x.font = "400 40px 'Instrument Serif', serif";
        (e.short || e.title).split(" ").reduce((lines, w) => { const l = lines[lines.length - 1]; if ((l + " " + w).length > 11 && l) lines.push(w); else lines[lines.length - 1] = (l ? l + " " : "") + w; return lines; }, [""])
          .slice(0, 4).forEach((line, li) => x.fillText(line, ox + 360, oy + 80 + li * 42));
        x.fillStyle = "#6a4dff"; x.font = "500 13px 'DM Mono', monospace"; x.fillText(e.pdx.toUpperCase(), ox + 40, oy + TH - 46);
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    this.roomMat.uniforms.uAtlas.value = t; this.roomMat.uniforms.uReady.value = 1;
  }

  /* the light tunnel: bright strands along the corridor walls, light flowing down them toward you */
  _tunnel() {
    const pos = [], seed = [], zA = LAT.z[0] * CELL, zB = -VOID_R - 6, per = this.small ? 20 : 52;
    const wallsX = [-CELL, 0, CELL, 2 * CELL], wallsY = [-CELL, 0, CELL, 2 * CELL];
    for (const x of wallsX) for (let k = 0; k < per; k++) { const y = -CELL + Math.random() * 3 * CELL; pos.push(x, y, zA, x, y, zB); const sd = Math.random(); seed.push(sd, sd); }
    for (const y of wallsY) for (let k = 0; k < per; k++) { const x = -CELL + Math.random() * 3 * CELL; pos.push(x, y, zA, x, y, zB); const sd = Math.random(); seed.push(sd, sd); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("seed", new THREE.Float32BufferAttribute(seed, 1));
    this.tunnelMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uFog: { value: 0.012 } },
      vertexShader: `attribute float seed; varying float vSeed; varying float vZ; varying float vDepth;
        void main(){ vSeed=seed; vec4 w=modelMatrix*vec4(position,1.); vZ=w.z; vec4 mv=viewMatrix*w; vDepth=-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uTime; uniform float uFog; varying float vSeed; varying float vZ; varying float vDepth;
        void main(){
          float flow=fract(vZ*0.012 + uTime*(0.10+vSeed*0.12) + vSeed*9.0);
          float streak=pow(flow,10.0)*1.8 + pow(fract(vZ*0.004 + uTime*0.05 + vSeed*3.0),24.0)*1.2;
          vec3 cyan=vec3(0.45,0.95,1.0), blue=vec3(0.38,0.55,1.0), vio=vec3(0.6,0.5,1.0);
          vec3 col=vSeed<0.5?mix(cyan,blue,vSeed*2.0):mix(blue,vio,(vSeed-0.5)*2.0);
          float a=(0.32+streak*1.4)*(0.55+0.45*vSeed)*exp(-uFog*uFog*vDepth*vDepth*0.6);
          gl_FragColor=vec4(col*a,a); }`
    });
    this.scene.add(new THREE.LineSegments(g, this.tunnelMat));

    // volumetric shafts: light falling through gaps in the lattice, between the paintings.
    // Open cones, brightest where you look across them (thickest column of lit dust), soft at the edges.
    this.beamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uFog: { value: 0.012 }, uGain: { value: 2.6 } },
      vertexShader: `attribute float aSeed; varying vec3 vN; varying vec3 vV; varying float vY; varying float vSeed; varying float vDepth; varying vec3 vW;
        void main(){ vSeed=aSeed; vY=uv.y; vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vec4 mv=viewMatrix*w; vDepth=-mv.z;
          vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float uTime; uniform float uFog; uniform float uGain; varying vec3 vN; varying vec3 vV; varying float vY; varying float vSeed; varying float vDepth; varying vec3 vW;
        void main(){
          float core=pow(abs(dot(vN,vV)),2.2);                                  // soft edges, dense centre
          float along=smoothstep(0.0,0.25,vY)*smoothstep(1.0,0.55,vY);         // fades out before the floor, eases in at the gap
          float motes=0.75+0.25*sin(vW.y*1.7+uTime*0.6+vSeed*20.)*sin(vW.x*1.3-uTime*0.4);
          float breathe=0.8+0.2*sin(uTime*0.35+vSeed*6.28);
          float near=smoothstep(1.5,7.0,vDepth);                                // don't flood the lens when you pass through one
          float a=core*along*motes*breathe*near*0.085*uGain*exp(-uFog*uFog*vDepth*vDepth*0.5);
          vec3 col=mix(vec3(0.55,0.75,1.0),vec3(0.7,0.62,1.0),vSeed);
          gl_FragColor=vec4(col*a,a); }`
    });
    const beamGeo = new THREE.CylinderGeometry(0.7, 4.2, 1, 28, 1, true);
    beamGeo.translate(0, -0.5, 0);                                             // pivot at the gap, cone hangs downward
    const sd = new Float32Array(beamGeo.attributes.position.count);
    for (let i = 0; i <= (this.small ? 6 : N); i++) {
      const z = -42 - i * 2 * CELL + Math.sin(i * 2.1) * 4, s = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const seed = Math.abs(s);
      const geo = beamGeo.clone(); geo.setAttribute("aSeed", new THREE.BufferAttribute(sd.slice().fill(seed), 1));
      const m = new THREE.Mesh(geo, this.beamMat);
      const len = 46 + seed * 14;
      m.position.set(CELL / 2 + Math.sin(i * 1.7) * CELL * 0.9, 2 * CELL + 6, z);
      m.scale.set(1 + seed * 0.6, len, 1 + seed * 0.6);
      m.rotation.set(0.28 + seed * 0.2, 0, (i % 2 ? 1 : -1) * (0.22 + seed * 0.18));   // slanted, alternating
      m.renderOrder = 2;
      this.scene.add(m);
    }
  }

  /* ═════ the astronaut: you. A real model, driven by physics, always just ahead of the camera ═════ */
  _astronaut() {
    this.astro = null;
    this.ap = { p: new THREE.Vector3(), v: new THREE.Vector3(), a: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3(), seeded: false };
    this.astroU = { uDrag: { value: new THREE.Vector3() }, uTime: { value: 0 } };
    this.astroMats = [];
    // a reflection probe that travels with him: the tesseract, the paintings and the stair show up on the suit and visor
    if (!this.small) {
      this.cubeRT = new THREE.WebGLCubeRenderTarget(96, { type: THREE.HalfFloatType });
      this.cubeCam = new THREE.CubeCamera(0.4, 220, this.cubeRT);
      this.scene.add(this.cubeCam);
    }
    // thrusters: short-lived gas puffs from the backpack whenever he corrects his course
    {
      const TN = 90, pos = new Float32Array(TN * 3), life = new Float32Array(TN);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aLife", new THREE.BufferAttribute(life, 1));
      const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPx: { value: this.dpr } },
        vertexShader: `attribute float aLife; uniform float uPx; varying float vL;
          void main(){ vL=aLife; vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=(aLife>0.0? (1.0-aLife)*46.0+10.0 : 0.0)*uPx/-mv.z; }`,
        fragmentShader: `varying float vL; void main(){ if(vL<=0.0) discard; float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,d)*vL*vL*0.16; gl_FragColor=vec4(vec3(0.8,0.9,1.0)*a,a); }`
      });
      const pts = new THREE.Points(g, m); pts.frustumCulled = false; this.scene.add(pts);
      this.thr = { pos, life, vel: Array.from({ length: TN }, () => new THREE.Vector3()), g, i: 0, cool: 0 };
    }
    // the tether: a Verlet rope from his backpack back past the camera — to you. Simulated in the
    // camera's frame (like him), so it whips and sags with your acceleration rather than the world's.
    {
      const P = 30, R = 6, pos = new Float32Array(P * R * 3), nrm = new Float32Array(P * R * 3), idx = [];
      for (let i = 0; i < P - 1; i++) for (let j = 0; j < R; j++) {
        const a = i * R + j, b = i * R + (j + 1) % R, c = a + R, d = b + R;
        idx.push(a, c, b, b, c, d);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.BufferAttribute(nrm, 3)); g.setIndex(idx);
      const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xc9cde8, roughness: 0.55, metalness: 0.2, emissive: 0x2a3a7a, emissiveIntensity: 0.35 }));
      mesh.frustumCulled = false; mesh.visible = false; this.scene.add(mesh);
      this.tether = { P, R, mesh, g, pts: Array.from({ length: P }, () => new THREE.Vector3()), prev: Array.from({ length: P }, () => new THREE.Vector3()), seeded: false };
    }
    // built in code (see Astronaut.js): jointed limbs, a detailed pack, a gold visor — no model file to download
    {
      const astro = (this.astroRig = createAstronaut({ accent: PAL.violet, glow: PAL.cyan }));
      this.astroMats = astro.mats;
      astro.mats.forEach((m) => (m.envMapIntensity = 0.8));
      const holder = new THREE.Group();
      holder.add(astro.group);
      holder.scale.setScalar(0.82);
      const rim = new THREE.PointLight(0x8fd8ff, 3.2, 8, 1.6); rim.position.set(-1.4, 1.4, -1.2); holder.add(rim);
      const key = new THREE.PointLight(0xd8dcff, 1.2, 7, 1.8); key.position.set(1.2, 0.6, 1.6); holder.add(key);
      const back = new THREE.PointLight(0xbfc8ff, 1.6, 6, 1.8); back.position.set(0.4, 0.5, -2.2); holder.add(back);   // the pack faces the camera: light it
      this.scene.add(holder);
      this.astro = holder;
    }
  }
  /* framing per part of the journey: how far ahead, and where on screen (right, up) */
  _astroFrame(s) {
    const K = [
      [0, 12, 2.5, -1.5],               // the stair: lower right, the stair stays the subject
      [STOP.trick, 10, 3.0, -1.6],
      this.space ? [STOP.descent, 7.5, 1.9, -1.2] : [STOP.descent, 6.5, 0.4, -0.8],   // tunnel: dead centre, like the film — in space, off to the side so the hole stays in view
      [STOP.ex0, 7.5, -1.2, -1.6],      // the rooms: low left, the painting stays clear
      [STOP.bottom, 7, 0.2, -0.9],
      [STOP.top, 9, 2.4, -1.6]
    ];
    s = clamp(s, 0, STOPS - 1);
    let i = 0; while (i < K.length - 2 && s > K[i + 1][0]) i++;
    const [s0, ...a] = K[i], [s1, ...b] = K[i + 1], k = smooth(clamp((s - s0) / (s1 - s0)));
    const f = a.map((x, j) => x + (b[j] - x) * k);
    if (innerWidth < innerHeight) {
      // portrait (phones): place him by screen fraction (x right, y up; ±1 = screen edge) so he lands in the
      // clear space each section leaves: under the stair, above the tunnel headline, beside the painting
      const P = [
        [0, 15, 0.58, -0.45],             // below the stair, right of the hint text
        [STOP.trick, 13, 0.55, -0.45],
        this.space ? [STOP.descent, 9.5, 0.5, 0.42] : [STOP.descent, 8.5, 0.15, 0.3],   // above "11 rooms…"
        [STOP.ex0, 10, 0.74, 0.16],       // right edge, beside the painting, above the room panel
        [STOP.bottom, 9, 0.2, 0.62],      // over the big numbers' top margin
        [STOP.top, 10, 0.45, -0.5]        // under the closing call to action
      ];
      let j = 0; while (j < P.length - 2 && s > P[j + 1][0]) j++;
      const [p0, ...pa] = P[j], [p1, ...pb] = P[j + 1], kk = smooth(clamp((s - p0) / (p1 - p0)));
      const [D, fx, fy] = pa.map((x, n) => x + (pb[n] - x) * kk);
      const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)), asp = innerWidth / innerHeight;
      return [D, fx * D * tanH * asp, fy * D * tanH];
    }
    return f;
  }
  _astroTick(t, dt, cam, fwd, right, up) {
    const A = this.astro; if (!A) return;
    const show = this.mode.type === "journey";
    const ap = this.ap;
    // camera motion, measured: velocity and (smoothed) acceleration in world space
    if (!ap.lastCam) { ap.lastCam = cam.position.clone(); ap.camV = new THREE.Vector3(); ap.camA = new THREE.Vector3(); ap.r = new THREE.Vector3(); ap.vr = new THREE.Vector3(); }
    const camV = cam.position.clone().sub(ap.lastCam).divideScalar(dt); ap.lastCam.copy(cam.position);
    const rawA = camV.clone().sub(ap.camV).divideScalar(dt); ap.camV.copy(camV);
    if (rawA.length() > 400) rawA.setLength(400);                      // cuts (route changes) shouldn't fling him across the universe
    ap.camA.lerp(rawA, 0.12);
    // in the camera's frame: his offset (right, up, ahead) is a damped spring, and the camera's
    // acceleration acts on him as an inertial (fictitious) force — so he lags, swings and settles
    const [D, ox, oy] = this._astroFrame(this.sCur);
    const tgt = V(ox + Math.sin(t * 0.31) * 0.22, oy + Math.sin(t * 0.47) * 0.18, D + Math.sin(t * 0.23) * 0.25);
    const aLocal = V(ap.camA.dot(right), ap.camA.dot(up), ap.camA.dot(fwd));
    if (!ap.seeded) { ap.r.copy(tgt); ap.seeded = true; }
    const k = 9, c = 2 * Math.sqrt(k) * 0.62;
    const acc = tgt.clone().sub(ap.r).multiplyScalar(k).addScaledVector(ap.vr, -c).addScaledVector(aLocal, -0.035);
    ap.vr.addScaledVector(acc, dt); ap.r.addScaledVector(ap.vr, dt);
    ap.r.z = Math.max(3.2, ap.r.z);                                     // never closer than arm's length
    ap.a.lerp(acc, 0.2);
    A.position.copy(cam.position).addScaledVector(right, ap.r.x).addScaledVector(up, ap.r.y).addScaledVector(fwd, ap.r.z);
    // attitude: back to us, banking into sideways acceleration, pitching with fore/aft, under an angular spring
    const lat = clamp(-ap.a.x * 0.09, -0.6, 0.6), lon = clamp(ap.a.z * 0.05 - ap.a.y * 0.04, -0.45, 0.45);
    const face = new THREE.Matrix4().lookAt(V(0, 0, 0), fwd.clone().negate(), up);
    const want = new THREE.Quaternion().setFromRotationMatrix(face)
      .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.16 + lon + Math.sin(t * 0.4) * 0.05, Math.sin(t * 0.21) * 0.16 + ap.vr.x * 0.05, lat + Math.sin(t * 0.33) * 0.06)));
    if (ap.q.lengthSq() === 0 || !ap.qSeeded) { ap.q.copy(want); ap.qSeeded = true; }
    const dq = want.clone().multiply(ap.q.clone().invert()); if (dq.w < 0) { dq.x *= -1; dq.y *= -1; dq.z *= -1; dq.w *= -1; }
    const ang = 2 * Math.acos(Math.min(1, dq.w)), axis = V(dq.x, dq.y, dq.z); if (axis.lengthSq() > 1e-8) axis.normalize();
    ap.w.addScaledVector(axis, ang * 22 * dt).multiplyScalar(Math.exp(-5 * dt));
    if (ap.w.lengthSq() > 1e-10) ap.q.premultiply(new THREE.Quaternion().setFromAxisAngle(ap.w.clone().normalize(), ap.w.length() * dt)).normalize();
    A.quaternion.copy(ap.q);
    const breathe = 1 + Math.sin(t * 1.6) * 0.008;
    const sc = (show ? 0.82 : 0.0001) * breathe; A.scale.lerp(V(sc, sc, sc), 0.12); A.visible = A.scale.x > 0.01;
    // limbs trail the relative acceleration in his own frame
    const worldAcc = right.clone().multiplyScalar(ap.a.x).addScaledVector(up, ap.a.y).addScaledVector(fwd, ap.a.z);
    const local = worldAcc.applyQuaternion(ap.q.clone().invert()).multiplyScalar(0.06);
    if (local.length() > 1) local.setLength(1);
    this.astroU.uDrag.value.lerp(local, 0.15); this.astroU.uTime.value = t;
    this.astroRig.update(t, dt, this.astroU.uDrag.value);

    // thrusters fire against the correction, harder the harder he's being pushed
    const T = this.thr, push = ap.a.length();
    T.cool -= dt;
    if (show && push > 9 && T.cool <= 0) {          // only a real shove fires them — not drift, not mouse wobble
      T.cool = 0.09 + 0.5 / Math.min(push, 30);
      const back = A.position.clone().addScaledVector(fwd, -0.32).addScaledVector(up, 0.12);
      const dir = worldAcc.clone().normalize().negate();
      for (let n = 0; n < 2; n++) {
        const i = T.i++ % T.life.length;
        T.pos.set([back.x + (Math.random() - 0.5) * 0.3, back.y + (Math.random() - 0.5) * 0.3, back.z + (Math.random() - 0.5) * 0.3], i * 3);
        T.vel[i].copy(dir).multiplyScalar(2.4 + Math.random() * 1.6).add(V((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6)).add(ap.camV.clone().multiplyScalar(0.9));
        T.life[i] = 1;
      }
      sound.puff?.();
    }
    for (let i = 0; i < T.life.length; i++) {
      if (T.life[i] <= 0) continue;
      T.life[i] = Math.max(0, T.life[i] - dt * 1.7);
      T.vel[i].multiplyScalar(Math.exp(-1.5 * dt));
      T.pos[i * 3] += T.vel[i].x * dt; T.pos[i * 3 + 1] += T.vel[i].y * dt; T.pos[i * 3 + 2] += T.vel[i].z * dt;
    }
    T.g.attributes.position.needsUpdate = true; T.g.attributes.aLife.needsUpdate = true;

    this._tetherTick(t, dt, cam, fwd, right, up, aLocal, show && A.visible);

    // refresh the reflection probe every few frames
    if (this.cubeCam && show && A.visible && (this._cubeN = (this._cubeN || 0) + 1) % 10 === 0) {
      if (!this._cubeBound) { this.astroMats.forEach((m) => { m.envMap = this.cubeRT.texture; m.envMapIntensity = 1.0; m.needsUpdate = true; }); this._cubeBound = true; }
      if (this.space) this.space.sky.visible = false;                 // the trace is screen-space; it has no meaning on a cube face
      A.visible = false; this.cubeCam.position.copy(A.position); this.cubeCam.update(this.renderer, this.scene); A.visible = true;
      if (this.space) this.space.sky.visible = true;
    }
  }

  _tetherTick(t, dt, cam, fwd, right, up, aLocal, show) {
    const Te = this.tether; Te.mesh.visible = show; if (!show) { Te.seeded = false; return; }
    const { P, R, pts, prev } = Te, ap = this.ap;
    // ends, in camera space (right, up, ahead): his backpack, and a point just below and behind your view
    const a = ap.r.clone().add(V(0, 0.15 * this.astro.scale.x / 0.82, -0.3));
    const b = innerWidth < innerHeight ? V(1.5, -0.5, 3.0) : V(1.3, -1.9, 3.2);   // far enough from the lens that it never balloons   // phones: exit the side, not down through the text
    if (!Te.seeded) { for (let i = 0; i < P; i++) { const k = i / (P - 1); pts[i].lerpVectors(a, b, k).y -= Math.sin(k * Math.PI) * 1.2; prev[i].copy(pts[i]); } Te.seeded = true; }
    const len = a.distanceTo(b) * 1.22 / (P - 1);                      // ~20% slack: it sags and swings
    const h = Math.min(dt, 1 / 30), h2 = h * h;
    for (let i = 1; i < P - 1; i++) {
      const p = pts[i], k = i / (P - 1);
      const v = p.clone().sub(prev[i]).multiplyScalar(0.985);
      prev[i].copy(p);
      // inertial force from your acceleration + a faint drift so it is never perfectly still
      const f = aLocal.clone().multiplyScalar(-0.05).add(V(Math.sin(t * 0.7 + k * 5) * 0.35, -0.9 + Math.cos(t * 0.5 + k * 4) * 0.3, Math.sin(t * 0.4 + k * 3) * 0.2));
      p.add(v).addScaledVector(f, h2);
    }
    pts[0].copy(a); pts[P - 1].copy(b);
    for (let it = 0; it < 10; it++) for (let i = 0; i < P - 1; i++) {
      const p = pts[i], q = pts[i + 1], d = q.clone().sub(p), L = d.length() || 1e-6, corr = d.multiplyScalar((L - len) / L * 0.5);
      if (i > 0) p.add(corr); if (i + 1 < P - 1) q.sub(corr);
    }
    // skin it: a tube with parallel-transported frames
    const pos = Te.g.attributes.position.array, nrm = Te.g.attributes.normal.array;
    const W = pts.map((p) => cam.position.clone().addScaledVector(right, p.x).addScaledVector(up, p.y).addScaledVector(fwd, p.z));
    let n = null;
    for (let i = 0; i < P; i++) {
      const tg = W[Math.min(P - 1, i + 1)].clone().sub(W[Math.max(0, i - 1)]).normalize();
      if (!n) n = new THREE.Vector3().crossVectors(tg, up).normalize();
      n.sub(tg.clone().multiplyScalar(n.dot(tg))).normalize();
      const bn = new THREE.Vector3().crossVectors(tg, n);
      const r = 0.02 * (i === 0 ? 1.7 : 1);
      for (let j = 0; j < R; j++) {
        const th = (j / R) * Math.PI * 2, dx = n.clone().multiplyScalar(Math.cos(th)).addScaledVector(bn, Math.sin(th)), o = (i * R + j) * 3;
        pos[o] = W[i].x + dx.x * r; pos[o + 1] = W[i].y + dx.y * r; pos[o + 2] = W[i].z + dx.z * r;
        nrm[o] = dx.x; nrm[o + 1] = dx.y; nrm[o + 2] = dx.z;
      }
    }
    Te.g.attributes.position.needsUpdate = true; Te.g.attributes.normal.needsUpdate = true;
  }

  _cells() {
    this.cells = []; this.pickables = [];
    const frameGeo = new RoundedBoxGeometry(4.3, 5.3, 0.22, 2, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x0d1024, roughness: 0.35, metalness: 0.7 });
    const threadMat = new THREE.LineBasicMaterial({ color: new THREE.Color(PAL.blue), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
    const haloTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
      const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, "rgba(124,92,255,0.65)"); g.addColorStop(0.5, "rgba(77,120,255,0.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c); })();
    EVENTS.forEach((e, i) => {
      const c = cellAt(i);
      const holder = new THREE.Group(); holder.position.copy(c); this.scene.add(holder);
      const g = new THREE.Group(); holder.add(g);                 // g turns to face you as you arrive
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(11, 12), new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
      halo.position.z = -0.4; g.add(halo);
      const board = new THREE.Mesh(frameGeo, frameMat); g.add(board);
      const picMat = new THREE.MeshBasicMaterial({ color: 0xb4b8d6 });          // unlit: reads evenly, never glares
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(3.84, 4.8), picMat); pic.position.z = 0.115; pic.userData.i = i; g.add(pic);
      // echoes: the same painting, again and again, falling away into the lattice
      const echoes = [1, 2, 3, 4].map((k) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3.84, 4.8), new THREE.MeshBasicMaterial({ color: 0x9aa3e0, transparent: true, opacity: 0.32 / k, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.position.z = -k * 3.2; m.scale.setScalar(1 - k * 0.04); g.add(m); return m;
      });
      // threads up to the lattice beam above
      const top = CELL / 2 - 0.1;
      const tg = new THREE.BufferGeometry().setFromPoints([V(-1.6, 2.65, 0), V(-1.2, top, 0), V(1.6, 2.65, 0), V(1.2, top, 0)]);
      const thread = new THREE.LineSegments(tg, threadMat.clone()); holder.add(thread);
      this.cells.push({ holder, g, pic, echoes, halo, thread, hover: 0, phase: i * 0.7 });
      this.pickables.push(pic);
    });
  }

  _rails() {
    const keys = [], push = (p, t, stop) => keys.push({ p, t, stop });
    const C0 = VIEW.clone().multiplyScalar(D_CAM);
    push(C0, V(0, 0, 0), STOP.hero);
    push(C0.clone().applyAxisAngle(V(0, 1, 0), 0.6).multiplyScalar(0.85).add(V(0, -6, 0)), V(0, -0.5, 0));
    push(C0.clone().applyAxisAngle(V(0, 1, 0), 1.6).setY(0).setLength(38).setY(7), V(0, -1.5, 0), STOP.trick);
    push(V(16, 2, -16), V(6, 6, -30));
    let prev = V(CELL / 2, CELL / 2 + 1, -14);
    if (HORIZON) {   // face the hole, skim in over the disk, and cross the horizon — the rooms are on the other side
      push(V(6, 10, -14), HOLE.clone().add(this.small ? V(0, -16, 0) : V(-36, 16, 0)), STOP.descent);
      prev = V(6, 10, -14);
    } else push(V(CELL / 2, CELL / 2 + 1, -14), V(CELL / 2, CELL / 2 - 1, -60), STOP.descent);
    for (let i = 0; i < N; i++) {
      const c = cellAt(i), fp = this.focusPose(i, 1);
      // swoop between cells: a waypoint thrown off to the side, looking ahead into the next cell
      push(prev.clone().lerp(fp.p, 0.5).add(V(Math.sin(i * 2.1 + 1) * 6, Math.cos(i * 1.7) * 5, 0)), prev.clone().lerp(c, 0.75));
      push(fp.p, fp.t, STOP.ex0 + i);
      prev = fp.p;
    }
    const last = cellAt(N - 1);
    if (HORIZON) {   // the far end: the singularity, then through it — and out where you began
      const end = this.space.end;
      push(HOLE.clone().addScaledVector(AXIS, HELIX0 + (N - 1) * PITCH + 34), end.clone().add(this.small ? V(0, 30, 0) : V(-36, 4, 0)), STOP.bottom);
      push(end.clone(), end.clone().addScaledVector(AXIS, 40));
    } else push(last.clone().add(V(0, 2, -16)), last.clone().add(V(0, -26, -90)), STOP.bottom);
    push(V(18, -10, 30), V(0, 0, 0));
    push(V(0.6, -17, 1.2), V(0, 8, 0.4), STOP.top);
    this.posCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.p), false, "centripetal");
    this.tgtCurve = new THREE.CatmullRomCurve3(keys.map((k) => k.t), false, "centripetal");
    this.stopParam = [];
    keys.forEach((k, idx) => k.stop !== undefined && (this.stopParam[k.stop] = idx / (keys.length - 1)));
    this.FOG = [0.011, 0.012, 0.014, ...Array(N).fill(0.022), 0.02, 0.006];
  }
  /** Hang in front of cell i, having come from the previous one. side=+1 puts the cell right of centre. */
  focusPose(i, side = 1, wide = this.small) {
    const c = cellAt(i), from = i ? cellAt(i - 1) : HORIZON ? HOLE.clone() : V(CELL / 2, CELL / 2, 0);
    const dir = c.clone().sub(from).normalize();
    const p = c.clone().addScaledVector(dir, wide && this.small ? -17 : -11.5).add(V(0, 0.8, 0));
    const fwd = c.clone().sub(p).normalize(), right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize();
    return { p, t: c.clone().addScaledVector(right, -(wide ? 0 : 2.6) * side).add(V(0, wide ? (this.small ? -3.6 : -1.2) : 0, 0)), roll: 0, fog: 0.022 };
  }
  fovBase() { return innerWidth < innerHeight ? 44 : 27; }

  /* ═════════════ textures that need fonts ═════════════ */
  async bake() {
    const tex = (w, h, draw) => {
      const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    this.heroWord.material.map = tex(2400, 750, (x, w, h) => {
      x.fillStyle = "#dfe3ff"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "400 640px 'Instrument Serif', serif";
      try { x.letterSpacing = "-24px"; } catch (_) { /* older canvas */ }
      x.fillText(FEST.theme, w / 2, h / 2 + 30);
    });
    this.heroWord.material.needsUpdate = true;
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    await Promise.all(EVENTS.map(async (e, i) => {
      const img = new Image(); img.src = artAsImageSrc(e.art); await img.decode();
      const c = document.createElement("canvas"); c.width = 768; c.height = 960;
      const x = c.getContext("2d");
      x.fillStyle = "#e8e9ff"; x.fillRect(0, 0, 768, 960);
      x.strokeStyle = "#0b0d1c"; x.lineWidth = 2; x.strokeRect(28, 28, 712, 904);
      x.lineWidth = 1; x.globalAlpha = 0.35; x.strokeRect(40, 40, 688, 880); x.globalAlpha = 1;
      x.fillStyle = "#0b0d1c"; x.font = "500 22px 'DM Mono', monospace"; x.textBaseline = "top"; x.fillText(`Nº ${e.no}`, 64, 66);
      x.fillStyle = "#6a4dff"; x.textAlign = "right"; x.fillText(e.pdx.toUpperCase(), 704, 66); x.textAlign = "left";
      x.drawImage(img, 84, 120, 600, 540);
      x.fillStyle = "#0b0d1c"; x.fillRect(64, 690, 640, 1.5);
      let size = 92; const title = e.short || e.title;
      do { x.font = `400 ${size}px 'Instrument Serif', serif`; size -= 4; } while (x.measureText(title).width > 640 && size > 40);
      x.fillText(title, 62, 712);
      x.font = "500 20px 'DM Mono', monospace"; x.globalAlpha = 0.7;
      x.fillText(`${e.category.toUpperCase()}  ·  DAY ${String(e.slots[0].day).padStart(2, "0")}  ·  ${dayLabel(e.slots[0].day).toUpperCase()}`, 64, 828);
      x.fillText(`${FEST.name.toUpperCase()} ’${FEST.edition.slice(2)}  ·  ${HORIZON ? "THE HORIZON" : "THE TESSERACT"}`, 64, 868); x.globalAlpha = 1;
      // print finish: fine paper grain and a soft vignette
      const grain = x.getImageData(0, 0, 768, 960), gd = grain.data;
      for (let k = 0; k < gd.length; k += 4) { const n = (Math.random() - 0.5) * 14; gd[k] += n; gd[k + 1] += n; gd[k + 2] += n; }
      x.putImageData(grain, 0, 0);
      const vg = x.createRadialGradient(384, 470, 260, 384, 480, 620); vg.addColorStop(0, "rgba(11,13,28,0)"); vg.addColorStop(1, "rgba(11,13,28,0.16)");
      x.fillStyle = vg; x.fillRect(0, 0, 768, 960);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
      const cell = this.cells[i];
      cell.pic.material.map = t; cell.pic.material.needsUpdate = true;
      cell.echoes.forEach((m) => { m.material.map = t; m.material.needsUpdate = true; });
    }));
    await this._bakeMoments().catch((err) => console.warn("moments", err));
    this.renderer.compile(this.scene, this.camera);
  }

  /* ═════════════ public API ═════════════ */
  on(evt, fn) { this.listeners[evt].add(fn); return () => this.listeners[evt].delete(fn); }
  setMode(mode, { duration = 1.9 } = {}) {
    if (JSON.stringify(mode) === JSON.stringify(this.mode)) return;
    this.from = { p: this.camera.position.clone(), t: this._lastTarget?.clone() || V(0, 0, 0), roll: this._lastRoll || 0, fog: this.scene.fog.density, fov: this.camera.fov };
    this.mode = mode;
    if (this.reduce || duration === 0) { this.blend = 1; return; }
    this.blend = 0;
    gsap.killTweensOf(this, "blend");
    gsap.to(this, { blend: 1, duration, ease: "expo.inOut" });
    gsap.fromTo(this.finish.uniforms.uFlash, { value: 0.6 }, { value: 0, duration: duration * 0.9, ease: "expo.out" });
    gsap.fromTo(this, { kick: 1 }, { kick: 0, duration, ease: "power2.out" });
  }
  assemble({ delay = 0.6, rewind = false } = {}) {
    if (rewind && !this.reduce && this.mode.type === "journey") return this.rewind();
    gsap.to(this, { intro: 1, duration: this.reduce ? 0 : 3.6, ease: "expo.inOut" });
    gsap.fromTo(this, { broken: 1 }, { broken: 0, duration: this.reduce ? 0 : 2.8, delay: this.reduce ? 0 : delay, ease: "expo.inOut" });
    gsap.to(this, { wordIn: 1, duration: 1.6, delay: this.reduce ? 0 : 1.4 });
  }
  /* Opening title: start at the deepest point of the tesseract and rewind through all of it —
     past every painting, out of the corridors, into the void — ending as the stair assembles. */
  rewind() {
    this.intro = 1; this.broken = 1; this.wordIn = 0;
    this.fly = STOP.bottom; this.sCur = STOP.bottom;
    const done = () => { this.fly = null; this.sCur = 0; this.listeners.rewind?.forEach((fn) => fn(false)); };
    this.listeners.rewind?.forEach((fn) => fn(true));
    this._rewindTl = gsap.timeline({ onComplete: done })
      .to(this, { fly: STOP.descent, duration: 3.4, ease: "power2.in" })              // falling backwards past the paintings
      .to(this, { fly: 0, duration: 2.4, ease: "expo.out" })                           // thrown out of the tesseract into the void
      .to(this, { broken: 0, duration: 2.2, ease: "expo.inOut" }, "-=1.8")             // the stair assembles as you arrive
      .to(this, { wordIn: 1, duration: 1.4 }, "-=1.0");
    return this._rewindTl;
  }
  skipRewind() { if (this._rewindTl && this.fly != null) this._rewindTl.timeScale(5); }
  breakApart(on) { gsap.to(this, { broken: on ? 1 : 0, duration: on ? 1.2 : 1.6, ease: on ? "expo.out" : "elastic.out(1, 0.7)", overwrite: true }); }
  setPaused(p) { this.paused = p; }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
    this.ao?.setSize(innerWidth, innerHeight);
    this.finish.uniforms.uRes.value.set(innerWidth, innerHeight);
  }

  /* ═════════════ input ═════════════ */
  _input() {
    addEventListener("pointermove", (e) => {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1; this.mouse.y = (e.clientY / innerHeight) * 2 - 1;
      this.mouse.ndc.set(this.mouse.x, -this.mouse.y);
    }, { passive: true });
    addEventListener("click", (e) => {
      if (this.hovered < 0 || e.target.closest("a,button,input,select,textarea,label,[data-ui]")) return;
      this.listeners.click.forEach((fn) => fn(this.hovered));
    });
  }

  /* ═════════════ poses ═════════════ */
  _journeyPose(s) {
    s = clamp(s, 0, STOPS - 1);
    const i = Math.min(STOPS - 2, Math.floor(s));
    const u = this.stopParam[i] + (this.stopParam[i + 1] - this.stopParam[i]) * (s - i);
    const p = this.posCurve.getPoint(u), tg = this.tgtCurve.getPoint(u);
    const fog = this.FOG[i] + (this.FOG[i + 1] - this.FOG[i]) * (s - i);
    let roll = smooth(clamp(s - (STOPS - 2))) * Math.PI;
    if (s > STOP.descent && s < STOP.bottom) { const f = s - Math.floor(s); roll += Math.sin(Math.PI * f) * 0.9 * (Math.floor(s) % 2 ? -1 : 1); }
    return { p, t: tg, roll, fog };
  }
  _ambientPose(place, t) {
    switch (place) {
      case "gallery": return this._journeyPose(STOP.ex0 + (N - 1) * (0.5 - 0.5 * Math.cos(t * 0.028)));
      case "pit": { // drifting deep inside the lattice
        const p = V(CELL / 2 + Math.sin(t * 0.05) * 14, CELL / 2 + Math.sin(t * 0.037) * 10, -90 + Math.sin(t * 0.03) * 40);
        return { p, t: p.clone().add(V(Math.sin(t * 0.021) * 12, -5 + Math.sin(t * 0.05) * 4, -24)), roll: Math.sin(t * 0.04) * 0.25, fog: 0.014 };
      }
      case "top": { const th = t * 0.05; return { p: V(Math.cos(th) * 1.2, -17, Math.sin(th) * 1.2), t: V(0, 8, 0.4), roll: Math.PI + th * 0.6, fog: 0.006 }; }
      case "orbit": { const th = 0.6 + t * 0.07; return { p: V(Math.cos(th) * 32, 8 + Math.sin(t * 0.1) * 6, Math.sin(th) * 32), t: V(0, 0, 0), roll: 0, fog: 0.006 }; }
      case "broken": { const th = t * 0.11; return { p: V(Math.cos(th) * 30, 10, Math.sin(th) * 30), t: V(0, 0, 0), roll: Math.sin(t * 0.3) * 0.12, fog: 0.006 }; }
      default: return this._journeyPose(0);
    }
  }
  _desired(t) {
    const m = this.mode;
    if (m.type === "journey") {
      if (this.fly != null) { this.sCur = this.fly; return this._journeyPose(this.fly); }   // the opening rewind drives the camera
      this.sCur += (this.stopSource() - this.sCur) * (this.reduce ? 1 : 0.085); return this._journeyPose(this.sCur);
    }
    if (m.type === "focus") return this.focusPose(m.index, m.side ?? 1, m.wide);
    return this._ambientPose(m.place, t);
  }

  /* ═════════════ frame ═════════════ */
  tick() {
    if (this.paused) return;
    const t = this.clock.getElapsedTime();
    const cam = this.camera, m = this.mouse;
    m.sx += (m.x - m.sx) * 0.06; m.sy += (m.y - m.sy) * 0.06;

    const want = this._desired(t);
    let p = want.p, tg = want.t, roll = want.roll, fog = want.fog;
    if (this.blend < 1 && this.from) {
      const k = this.blend, f = this.from;
      const mid = f.p.clone().lerp(want.p, 0.5).add(V(0, f.p.distanceTo(want.p) * 0.12, 0)); // arc the flight
      p = f.p.clone().multiplyScalar((1 - k) ** 2).addScaledVector(mid, 2 * k * (1 - k)).addScaledVector(want.p, k * k);
      tg = f.t.clone().lerp(want.t, k);
      roll = f.roll + (roll - f.roll) * k;
      fog = f.fog + (fog - f.fog) * k;
    }
    const heroW = this.mode.type === "journey" ? clamp(1 - this.sCur * 1.3) : 0;
    if (this.intro > 1 && this.mode.type === "journey") p = p.clone().sub(tg).multiplyScalar(this.intro).add(tg);
    const fwd = tg.clone().sub(p).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, V(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);
    const amp = this.reduce ? 0 : 0.12 * heroW + 0.45 * (1 - heroW);
    cam.position.copy(p).addScaledVector(right, m.sx * amp).addScaledVector(up, -m.sy * amp * 0.7);
    const look = tg.clone().addScaledVector(right, m.sx * 0.5 * (1 - heroW));
    cam.lookAt(look);
    if (roll) cam.rotateZ(roll);
    if (!this.reduce) {   // a held camera, not a mathematical one: slow, layered micro-drift
      cam.rotateX((Math.sin(t * 0.9) * 0.6 + Math.sin(t * 2.3 + 1.3) * 0.25) * 0.0022);
      cam.rotateY((Math.sin(t * 0.7 + 2.0) * 0.6 + Math.sin(t * 1.9) * 0.25) * 0.0022);
      cam.rotateZ(Math.sin(t * 0.5 + 0.7) * 0.0016);
    }
    this._lastTarget = look; this._lastRoll = roll;
    // deep in the lattice the lens opens a little, so the cells feel close and the beams rush past
    const deep = this.mode.type === "focus" || (this.mode.type === "ambient" && this.mode.place === "gallery") ? 1
      : this.mode.type === "journey" ? clamp(this.sCur - STOP.descent) * clamp(STOP.bottom - this.sCur) : 0;
    let fov = this.fovBase() + deep * (innerWidth < innerHeight ? 4 : 10);
    // portrait: widen the lens at the stair so the whole loop fits across a phone (same camera position, so the illusion holds)
    if (innerWidth < innerHeight && heroW > 0) {
      const heroFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(14.5)) / (innerWidth / innerHeight)));
      fov += (Math.min(heroFov, 72) - fov) * heroW;
    }
    if (this.blend < 1 && this.from) fov = this.from.fov + (fov - this.from.fov) * smooth(this.blend) + Math.sin(Math.PI * this.blend) * 14; // lens punches wide mid-flight
    if (Math.abs(fov - cam.fov) > 0.001) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.scene.fog.density = this.space ? fog * 0.3 : fog;          // space is clear; the lattice is hazy
    {
      const deep = clamp(-cam.position.z / 260);
      this._fogA ||= new THREE.Color(PAL.void); this._fogB ||= new THREE.Color(0x0a0b20); this._fogC ||= new THREE.Color(0x0e0c26);
      const col = this._fogA.clone().lerp(this._fogB, smooth(clamp(deep * 2))).lerp(this._fogC, smooth(clamp(deep * 2 - 1)));
      this.scene.fog.color.copy(col); this.scene.background.copy(col);
    }
    if (!this.space) {
      this.beamU.uTime.value = t; this.beamU.uCam.value.copy(cam.position);
      this.roomMat.uniforms.uTime.value = t; this.roomMat.uniforms.uFog.value = fog * 0.75;
      this.strandMat.uniforms.uFog.value = fog * 0.8;
    } else {
      // how far you have fallen, 0…1: by route progress on the journey, by position elsewhere (a painting's own page, the gallery)
      const journey = this.mode.type === "journey";
      const fall = journey ? Math.max(0, (this.sCur - (STOP.descent + 0.45)) / (STOP.bottom - STOP.descent - 0.45)) : -1;   // past 1 = the plunge
      this.space.update(t, cam, heroW, this.renderer, fall, journey ? clamp((this.sCur - STOP.descent) / 0.6) : -1);
      // at the very end the hole takes the last of the light, then the singularity gives it all back at once
      this.finish.uniforms.uDark.value += (this.space.dark - this.finish.uniforms.uDark.value) * 0.2;
      this.finish.uniforms.uWhite.value += (this.space.white - this.finish.uniforms.uWhite.value) * 0.25;
      for (const c of this.cells) c.holder.visible = this.space.falling;   // the rooms are stops on the way down
      // how much slower your clock runs than one far away — exact for where you are: 1/sqrt(1 − Rs/r)
      this.info.dilation = !journey || this.sCur < 1.6 || this.sCur > STOP.bottom + 0.5 ? 0 : this.space.r > 1.0005 ? 1 / Math.sqrt(1 - 1 / this.space.r) : Infinity;
    }
    this.lantern.position.copy(cam.position).addScaledVector(fwd, 2);
    if (this.film) {
      const vis = this.mode.type === "journey" ? clamp(1 - this.sCur * 0.9) : this.mode.type === "ambient" && (this.mode.place === "orbit" || this.mode.place === "top") ? 0.55 : 0;
      this.film.visible = this.filmOk && vis * this.filmIn > 0.01;
      if (this.film.visible) {
        const dz = 600, h = 2 * dz * Math.tan((cam.fov * Math.PI) / 360), w = h * cam.aspect, va = (this.video.videoWidth || 16) / (this.video.videoHeight || 9);
        const sw = Math.max(w, h * va), sh = sw / va < h ? h : sw / va;   // cover the screen
        this.film.position.set(0, 0, -dz); this.film.scale.set(Math.max(sw, sh * va), Math.max(sh, sw / va), 1);
        this.film.material.color.setScalar(0.62 * vis * this.filmIn);   // fade to black, not to transparent
      }
    }

    // the stair, its climbers, the word
    this._poseStairs();
    this._poseWalkers(t);
    const wordVis = this.mode.type === "journey" ? clamp(1 - this.sCur * 1.8) : 0;
    this.heroWord.visible = wordVis > 0.01;
    this.heroWord.material.opacity = 0.9 * wordVis * this.wordIn;
    this.heroWord.lookAt(cam.position);

    if (!this.space) { this.dust.uniforms.uTime.value = t; this.strandMat.uniforms.uTime.value = t; }
    this.finish.uniforms.uTime.value = t;

    // you: the astronaut, physics-driven, just ahead of the camera
    { const now = t, dt = Math.min(0.05, Math.max(0.001, now - (this._lastT ?? now - 0.016))); this._lastT = now;
      // his frame is the camera's real one — including roll, or he hangs upside down when the shot rolls
      const q = cam.quaternion, cF = V(0, 0, -1).applyQuaternion(q), cR = V(1, 0, 0).applyQuaternion(q), cU = V(0, 1, 0).applyQuaternion(q);
      this._astroTick(t, dt, cam, cF, cR, cU); }
    if (!this.space) {
      this.tunnelMat.uniforms.uTime.value = t; this.tunnelMat.uniforms.uFog.value = fog;
      this.beamMat.uniforms.uTime.value = t; this.beamMat.uniforms.uFog.value = fog;
    }
    // hover on cells
    let hov = -1;
    const pickable = this.fine && ((this.mode.type === "journey" && this.sCur > STOP.ex0 - 0.6 && this.sCur < STOP.ex0 + N - 0.4) || (this.mode.type === "ambient" && this.mode.place === "gallery"));
    if (pickable) {
      this._ray ||= new THREE.Raycaster();
      this._ray.setFromCamera(m.ndc, cam);
      const hit = this._ray.intersectObjects(this.pickables, false)[0];
      if (hit && hit.distance < 24) hov = hit.object.userData.i;
    }
    if (hov !== this.hovered) { this.hovered = hov; this.listeners.hover.forEach((fn) => fn(hov)); }
    const focused = this.mode.type === "focus" ? this.mode.index : -1;
    this.cells.forEach((c, i) => {
      c.hover += ((hov === i || focused === i ? 1 : 0) - c.hover) * 0.1;
      // how "arrived" the camera is at this painting: it hangs edge-on until you get there, then turns to face you
      const prox = focused === i ? 1 : this.mode.type === "journey" ? clamp(1 - Math.abs(this.sCur - (STOP.ex0 + i)) * 0.9)
        : this.mode.type === "ambient" && this.mode.place === "gallery" ? 1 : 0;
      c.face = (c.face ?? 0) + (prox - (c.face ?? 0)) * 0.08;
      const want = this.focusPose(i, 0, true).p;
      c.holder.lookAt(want.x, c.holder.position.y, want.z);
      // hangs and sways on its threads; turns to you as you arrive
      c.g.rotation.set(Math.sin(t * 0.5 + c.phase) * 0.025, (1 - smooth(c.face)) * 1.35 * (i % 2 ? -1 : 1) + Math.sin(t * 0.33 + c.phase) * 0.03, Math.sin(t * 0.7 + c.phase) * 0.02);
      // the threads light up while it turns towards you
      const turning = c.face * (1 - c.face) * 4;
      c.thread.material.opacity = 0.35 + turning * 0.9 + c.hover * 0.3;
      c.g.scale.setScalar(1 + c.hover * 0.04);
      c.halo.material.opacity = (0.35 + c.face * 0.35 + c.hover * 0.2) * (HORIZON ? 0.12 : 1);   // in space the hole behind it should stay black
      c.echoes.forEach((m, k) => (m.position.z = -(k + 1) * (2.4 + c.face * 1.6)));
    });

    // HUD: how deep into the tesseract
    const depth = Math.max(0, -cam.position.z);
    this.info.depth = depth;
    this.info.progress = this.mode.type === "journey" ? this.sCur / (STOPS - 1) : clamp(depth / 300);
    this.info.label = this.mode.type === "journey" ? STOP_LABELS[Math.round(clamp(this.sCur, 0, STOPS - 1))] : this.mode.label || "";

    const speed = this.mode.type === "journey" ? (this.fly != null ? Math.abs((this._lastFly ?? this.fly) - this.fly) * 30 : Math.abs(this.stopSource() - this.sCur)) : 0;
    this._lastFly = this.fly;
    const w = this.reduce ? 0 : Math.min(0.6, speed * 0.5 + this.kick * Math.sin(Math.PI * (1 - this.kick)) * 0.8);
    this.finish.uniforms.uWarp.value += (w - this.finish.uniforms.uWarp.value) * 0.15;

    {  // the tesseract wakes as you go deeper, spins up with your speed, and lets go as you fly back out
      const now = performance.now() / 1000, hdt = Math.min(0.05, now - (this._hT ?? now)); this._hT = now;
      let g = clamp((-cam.position.z - 14) / 40);
      if (this.mode.type === "journey") g *= clamp((STOP.bottom + 0.75 - this.sCur) / 0.5);
      this._hG = (this._hG ?? 0) + (g - (this._hG ?? 0)) * 0.08;
      this.hyper?.update(hdt, 1 + Math.min(6, speed * 9), this._hG);
    }
    {  // space bends in your cursor's wake: a short trail of lens points, each fading out
      const tr = this.finish.uniforms.uTrail.value, n = this.mouse.ndc;
      if (this.fine && !this.reduce && n.x < 5) {
        const u = (n.x + 1) / 2, v = (n.y + 1) / 2, sp = Math.hypot(u - (this._tu ?? u), v - (this._tv ?? v));
        if (sp > 0.006) { const h = tr.pop(); h.set(u, v, Math.min(1, sp * 16)); tr.unshift(h); this._tu = u; this._tv = v; }
      }
      for (const pnt of tr) pnt.z *= 0.95;
      if (this.space && this.fine && !this.reduce && n.x < 5) {            // the pocket black hole follows the pointer, with a little weight
        const h = this.finish.uniforms.uHole.value;
        h.x += ((n.x + 1) / 2 - h.x) * 0.3; h.y += ((n.y + 1) / 2 - h.y) * 0.3; h.z += (15 - h.z) * 0.08;
      }
    }

    if (this.bokeh) {
      const fd = this.mode.type === "journey" && this.astro?.visible ? cam.position.distanceTo(this.astro.position) : this.mode.type === "focus" ? 11.5 : 30;
      const u = this.bokeh.uniforms; u.focus.value += (fd - u.focus.value) * 0.1;
      u.aperture.value = this.mode.type === "journey" && this.sCur < 1 ? 0.00008 : 0.00022;   // keep the stair crisp
    }
    if (this.mode.type === "journey") {
      const idx = Math.round(this.sCur - STOP.ex0);
      if (idx >= 0 && idx < N && idx !== this._passIdx && Math.abs(this.sCur - (STOP.ex0 + idx)) < 0.45) { if (this._passIdx !== undefined) sound.whoosh?.(idx % 2 ? -0.7 : 0.7); this._passIdx = idx; }
    }
    {  // keep it smooth on any machine: if frames run long for a couple of seconds, render fewer pixels (never the other way, so it cannot flicker)
      const now = performance.now(), dtG = now - (this._gLast ?? now); this._gLast = now; this._gStart ??= now;
      if (dtG < 120 && !document.hidden && now - this._gStart > 7000) {
        this._ft = (this._ft ?? 16) * 0.94 + dtG * 0.06; this._gAcc = (this._gAcc ?? 0) + dtG;
        if (this._gAcc > 2200) {
          this._gAcc = 0;
          if (this._ft > 23 && (this.q ?? 3) > 0) {
            this.q = (this.q ?? 3) - 1;
            const pr = this.dpr * [0.5, 0.64, 0.8, 1][this.q];
            this.renderer.setPixelRatio(pr); this.composer.setPixelRatio(pr); this.composer.setSize(innerWidth, innerHeight);
            if (this.ao && this.q < 2) this.ao.enabled = false;
            this._ft = 16;
          }
        }
      }
    }
    this.composer.render();
  }
}
