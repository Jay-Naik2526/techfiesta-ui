/* The astronaut, built in code: a jointed suit (shoulders, elbows, hips, knees, head) so the limbs
   really move, a life-support pack worth looking at (it is what the camera sees most), a gold visor.
   Front faces +Z, pack on −Z. About 2 units tall, centred on the body's centre of mass. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const spring = (x = 0) => ({ x, v: 0 });
const drive = (s, target, dt, k = 30, c = 6) => { s.v += ((target - s.x) * k - s.v * c) * dt; s.x += s.v * dt; return s.x; };

/* quilted fabric: soft horizontal ribs, used as a bump map on every soft part */
function quilt() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, 64);
  for (let i = 0; i <= 8; i++) g.addColorStop(i / 8, i % 2 ? "#fff" : "#777");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 3); return t;
}
/* the mission patch on the pack: the fest's triangle mark and edition */
function patch(accent) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d");
  x.fillStyle = "#0b0e20"; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
  x.strokeStyle = "#e8e9ff"; x.lineWidth = 6; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke();
  x.strokeStyle = accent; x.lineWidth = 14; x.lineJoin = "round";
  x.beginPath(); x.moveTo(128, 56); x.lineTo(188, 156); x.lineTo(68, 156); x.closePath(); x.stroke();
  x.fillStyle = "#e8e9ff"; x.font = "600 34px monospace"; x.textAlign = "center"; x.fillText("TF ’26", 128, 206);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function createAstronaut({ accent = 0x7c5cff, glow = 0x39e1ff } = {}) {
  const root = new THREE.Group(), rig = new THREE.Group();
  rig.scale.setScalar(0.78); rig.position.y = 0.2; root.add(rig);
  const mats = [];
  const M = (o) => { const m = new THREE.MeshStandardMaterial(o); mats.push(m); return m; };
  const bump = quilt();
  const suit = M({ color: 0xbfc5d8, roughness: 0.88, bumpMap: bump, bumpScale: 1.4 });
  const soft = M({ color: 0x6d7490, roughness: 0.92, bumpMap: bump, bumpScale: 1.8 });
  const hard = M({ color: 0xcdd2e2, roughness: 0.34, metalness: 0.15 });
  const dark = M({ color: 0x141829, roughness: 0.38, metalness: 0.7 });
  const band = M({ color: accent, roughness: 0.45, emissive: accent, emissiveIntensity: 0.35 });
  const visorMat = new THREE.MeshPhysicalMaterial({ color: 0xffb04a, metalness: 1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 }); mats.push(visorMat);
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(2.2), toneMapped: false });
  const lampB = new THREE.MeshBasicMaterial({ color: new THREE.Color(accent).multiplyScalar(2.4), toneMapped: false });
  const beacon = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });

  const add = (geo, mat, [x, y, z], parent, rot) => {
    const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); if (rot) o.rotation.set(...rot);
    o.castShadow = true; o.frustumCulled = false; parent.add(o); return o;
  };
  const pivot = (x, y, z, parent) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const cap = (r, len) => new THREE.CapsuleGeometry(r, len, 8, 20);
  const box = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 4, r);
  const ring = (R, r) => new THREE.TorusGeometry(R, r, 10, 36);
  const HX = [Math.PI / 2, 0, 0];

  /* torso */
  const body = pivot(0, 0, 0, rig);
  add(box(0.68, 0.74, 0.46, 0.17), suit, [0, 0.18, 0], body);
  add(box(0.56, 0.3, 0.42, 0.13), suit, [0, -0.36, 0], body);
  add(ring(0.27, 0.05), soft, [0, -0.2, 0], body, HX).scale.set(1, 0.78, 1);
  add(ring(0.2, 0.042), dark, [0, 0.58, 0], body, HX);
  // chest control unit
  add(box(0.36, 0.22, 0.1, 0.03), hard, [0, 0.22, 0.25], body);
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), dark, [-0.1, 0.25, 0.31], body, HX);
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), dark, [-0.02, 0.25, 0.31], body, HX);
  add(new THREE.BoxGeometry(0.09, 0.03, 0.01), lamp, [0.1, 0.25, 0.305], body);
  add(new THREE.BoxGeometry(0.2, 0.012, 0.01), lampB, [0, 0.16, 0.305], body);

  /* head */
  const head = pivot(0, 0.84, 0, body);
  add(new THREE.SphereGeometry(0.31, 40, 28), hard, [0, 0, 0], head);
  add(new THREE.SphereGeometry(0.317, 40, 24, Math.PI / 2 - 1.05, 2.1, 0.82, 1.02), visorMat, [0, 0, 0], head);
  add(box(0.07, 0.16, 0.16, 0.03), dark, [0.31, -0.03, 0], head);
  add(box(0.07, 0.16, 0.16, 0.03), dark, [-0.31, -0.03, 0], head);
  add(new THREE.BoxGeometry(0.012, 0.05, 0.05), lamp, [0.35, -0.03, 0], head);
  add(new THREE.BoxGeometry(0.012, 0.05, 0.05), lamp, [-0.35, -0.03, 0], head);

  /* life-support pack: the side the camera lives on */
  const pack = pivot(0, 0.24, -0.36, body);
  add(box(0.62, 0.9, 0.3, 0.09), hard, [0, 0, 0], pack);
  add(box(0.42, 0.3, 0.03, 0.02), dark, [0, 0.2, -0.15], pack);
  [-0.12, 0, 0.12].forEach((x, i) => add(new THREE.BoxGeometry(0.06, 0.06, 0.012), i === 1 ? lampB : lamp, [x, 0.25, -0.168], pack));
  add(new THREE.BoxGeometry(0.3, 0.014, 0.012), lamp, [0, 0.13, -0.168], pack);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.4, 0.022, 0.03), dark, [0, -0.04 - i * 0.05, -0.15], pack);
  const badge = new THREE.Mesh(new THREE.CircleGeometry(0.085, 32), new THREE.MeshBasicMaterial({ map: patch("#" + new THREE.Color(accent).getHexString()) }));
  badge.position.set(-0.17, -0.34, -0.152); badge.rotation.y = Math.PI; pack.add(badge);
  add(box(0.2, 0.08, 0.02, 0.01), band, [0.14, -0.34, -0.152], pack);
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sy]) => {
    add(new THREE.CylinderGeometry(0.03, 0.055, 0.09, 14, 1, true), dark, [sx * 0.25, sy * 0.4, -0.17], pack, HX);
    add(new THREE.CircleGeometry(0.028, 12), lamp, [sx * 0.25, sy * 0.4, -0.13], pack, [0, Math.PI, 0]);
  });
  [-1, 1].forEach((s) => {                                                    // side tanks
    add(cap(0.075, 0.52), hard, [s * 0.37, -0.02, 0.02], pack);
    add(ring(0.078, 0.014), band, [s * 0.37, 0.16, 0.02], pack, HX);
    add(ring(0.078, 0.014), dark, [s * 0.37, -0.2, 0.02], pack, HX);
  });
  add(new THREE.TorusGeometry(0.12, 0.022, 8, 20, Math.PI), dark, [0, 0.45, -0.02], pack);     // carry handle
  add(new THREE.CylinderGeometry(0.008, 0.008, 0.46, 6), dark, [0.24, 0.66, 0], pack);         // antenna
  const tip = add(new THREE.SphereGeometry(0.024, 10, 8), beacon, [0.24, 0.9, 0], pack);
  [-1, 1].forEach((s) => {                                                    // hoses, pack to chest
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(s * 0.2, -0.02, -0.3), new THREE.Vector3(s * 0.4, -0.16, -0.12), new THREE.Vector3(s * 0.36, -0.02, 0.16), new THREE.Vector3(s * 0.16, 0.14, 0.27)]);
    add(new THREE.TubeGeometry(curve, 24, 0.024, 8), soft, [0, 0, 0], body);
  });

  /* limbs: every joint is a pivot, so the pose is real rotation, not a vertex wobble */
  const J = {};
  [-1, 1].forEach((s) => {
    const k = s < 0 ? "L" : "R";
    const sh = (J["sh" + k] = pivot(s * 0.42, 0.44, 0, body));
    add(new THREE.SphereGeometry(0.16, 20, 14), suit, [0, 0, 0], sh);
    add(cap(0.108, 0.24), suit, [0, -0.21, 0], sh);
    add(ring(0.112, 0.02), band, [0, -0.13, 0], sh, HX);
    const el = (J["el" + k] = pivot(0, -0.42, 0, sh));
    add(new THREE.SphereGeometry(0.108, 18, 12), soft, [0, 0, 0], el);
    add(cap(0.097, 0.22), suit, [0, -0.2, 0], el);
    add(ring(0.098, 0.024), dark, [0, -0.34, 0], el, HX);
    add(box(0.16, 0.18, 0.13, 0.055), soft, [0, -0.45, 0], el);
    add(box(0.05, 0.1, 0.06, 0.02), soft, [s * -0.09, -0.42, 0.02], el);        // thumb
    const hip = (J["hip" + k] = pivot(s * 0.17, -0.5, 0, body));
    add(cap(0.132, 0.26), suit, [0, -0.22, 0], hip);
    const kn = (J["kn" + k] = pivot(0, -0.47, 0, hip));
    add(new THREE.SphereGeometry(0.128, 18, 12), soft, [0, 0, 0], kn);
    add(cap(0.117, 0.26), suit, [0, -0.22, 0], kn);
    add(ring(0.12, 0.02), band, [0, -0.12, 0], kn, HX);
    add(box(0.23, 0.17, 0.38, 0.06), hard, [0, -0.5, 0.06], kn);
    add(new THREE.BoxGeometry(0.21, 0.04, 0.36), dark, [0, -0.595, 0.06], kn);
  });

  /* the neutral body posture of zero-g, plus springs on every channel so motion overshoots and settles */
  const S = { shXL: spring(-0.42), shXR: spring(-0.3), shZL: spring(-0.5), shZR: spring(0.5), elL: spring(-0.95), elR: spring(-0.8),
    hipXL: spring(-0.3), hipXR: spring(-0.16), hipZ: spring(0), knL: spring(0.62), knR: spring(0.45), headY: spring(0), headX: spring(0), lean: spring(0) };
  const a = new THREE.Vector3();

  function update(t, dt, drag) {
    a.lerp(drag, 0.25);                                   // his felt acceleration, in his own frame, −1…1
    const ax = a.x, ay = a.y, az = a.z, mag = Math.min(1, a.length());
    const w1 = Math.sin(t * 0.83), w2 = Math.sin(t * 0.61 + 1.7), w3 = Math.sin(t * 1.07 + 0.6), w4 = Math.sin(t * 0.47 + 2.4);
    // arms trail the push, open when he's thrown, and never quite stop drifting
    J.shL.rotation.x = drive(S.shXL, -0.42 + az * 0.9 + w1 * 0.1, dt);
    J.shR.rotation.x = drive(S.shXR, -0.3 + az * 0.9 + w2 * 0.12, dt);
    J.shL.rotation.z = drive(S.shZL, -0.5 - mag * 0.35 + ax * 0.5 + ay * 0.3 + w3 * 0.06, dt);
    J.shR.rotation.z = drive(S.shZR, 0.5 + mag * 0.35 + ax * 0.5 - ay * 0.3 - w4 * 0.06, dt);
    J.elL.rotation.x = drive(S.elL, -0.95 + mag * 0.45 + w2 * 0.14, dt, 24, 5);
    J.elR.rotation.x = drive(S.elR, -0.8 + mag * 0.4 + w1 * 0.16, dt, 24, 5);
    // legs: heavier, slower, a lazy alternating kick
    J.hipL.rotation.x = drive(S.hipXL, -0.3 + az * 0.7 + w1 * 0.14, dt, 18, 4.5);
    J.hipR.rotation.x = drive(S.hipXR, -0.16 + az * 0.7 - w1 * 0.14, dt, 18, 4.5);
    const hz = drive(S.hipZ, ax * 0.45, dt, 18, 4.5);
    J.hipL.rotation.z = -0.07 + hz; J.hipR.rotation.z = 0.07 + hz;
    J.knL.rotation.x = drive(S.knL, 0.62 + mag * 0.5 - az * 0.3 + w3 * 0.12, dt, 16, 4);
    J.knR.rotation.x = drive(S.knR, 0.45 + mag * 0.5 - az * 0.3 + w4 * 0.12, dt, 16, 4);
    // the head looks where he is being taken; the torso gives a little
    head.rotation.y = drive(S.headY, -ax * 0.7 + w4 * 0.12, dt, 20, 6);
    head.rotation.x = drive(S.headX, ay * 0.4 - 0.05 + w2 * 0.04, dt, 20, 6);
    body.rotation.x = drive(S.lean, az * 0.18, dt, 14, 5);
    const blink = (t * 0.9) % 1 < 0.12 ? 3.2 : 0.25;                          // antenna beacon
    tip.material.color.setRGB(blink, blink * 0.95, blink);
  }

  return { group: root, mats, update };
}
