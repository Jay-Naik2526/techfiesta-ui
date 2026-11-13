/* A real tesseract: 16 vertices of {±1}⁴, 32 edges, 24 square faces. Every frame it is rotated in
   three planes of 4-space (XW, YZ, ZW) and perspective-projected from 4D to 3D — which is why the inner
   cube swells and swallows the outer one. Edges and nodes glow (they feed the bloom); faces are faint panes. */
import * as THREE from "three";

export function createHypercube({ R = 4.5, near = 0x39e1ff, far = 0x7c5cff } = {}) {
  const group = new THREE.Group();
  const V4 = Array.from({ length: 16 }, (_, i) => [i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
  const E = []; for (let i = 0; i < 16; i++) for (let b = 0; b < 4; b++) { const j = i ^ (1 << b); if (i < j) E.push([i, j]); }
  const F = []; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) for (let i = 0; i < 16; i++) {
    if (i & (1 << a) || i & (1 << b)) continue; F.push([i, i | (1 << a), i | (1 << a) | (1 << b), i | (1 << b)]);
  }
  const cNear = new THREE.Color(near), cFar = new THREE.Color(far), col = new THREE.Color();

  const edges = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true }), E.length);
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ toneMapped: false, fog: false, transparent: true }), 16);
  edges.frustumCulled = nodes.frustumCulled = false;
  edges.setColorAt(0, col); nodes.setColorAt(0, col);

  const fPos = new Float32Array(F.length * 12), fUv = new Float32Array(F.length * 8), fW = new Float32Array(F.length * 4), fIdx = [];
  F.forEach((_, f) => { fUv.set([0, 0, 1, 0, 1, 1, 0, 1], f * 8); fIdx.push(f * 4, f * 4 + 1, f * 4 + 2, f * 4, f * 4 + 2, f * 4 + 3); });
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute("uv", new THREE.BufferAttribute(fUv, 2));
  fGeo.setAttribute("aW", new THREE.BufferAttribute(fW, 1)); fGeo.setIndex(fIdx);
  const fMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uGain: { value: 1 }, uNear: { value: cNear }, uFar: { value: cFar }, uTime: { value: 0 } },
    vertexShader: `attribute float aW; varying vec2 vUv; varying float vW; void main(){ vUv=uv; vW=aW; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uGain; uniform vec3 uNear; uniform vec3 uFar; uniform float uTime; varying vec2 vUv; varying float vW;
      void main(){ vec2 q=abs(vUv-0.5)*2.0; float e=max(q.x,q.y);
        float rim=pow(e,9.0)*0.5;                                   // light gathers at the frame of each pane
        float scan=0.5+0.5*sin((vUv.x+vUv.y)*9.0-uTime*0.8+vW*3.0); // a slow sheen crossing the glass
        float a=(0.028+rim+0.02*scan*scan)*uGain;
        gl_FragColor=vec4(mix(uFar,uNear,vW)*a,a); }`
  });
  const faces = new THREE.Mesh(fGeo, fMat); faces.frustumCulled = false; faces.renderOrder = 3;

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false, opacity: 0.5 }));
  halo.scale.setScalar(R * 6.5);
  group.add(halo, faces, edges, nodes);

  const P = V4.map(() => new THREE.Vector3()), K = new Float32Array(16), W = new Float32Array(16);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), mid = new THREE.Vector3(), sc = new THREE.Vector3();
  let phase = 0;

  /* dt-driven so scrolling can spin it up; gain 0…1 fades the whole object */
  function update(dt, spin = 1, gain = 1) {
    group.visible = gain > 0.004; if (!group.visible) return;
    phase += dt * spin;
    const a1 = phase * 0.31, a2 = phase * 0.19, a3 = phase * 0.13;
    const c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2), c3 = Math.cos(a3), s3 = Math.sin(a3), D = 2.5;
    for (let i = 0; i < 16; i++) {
      let [x, y, z, w] = V4[i], t;
      t = x * c1 - w * s1; w = x * s1 + w * c1; x = t;          // XW: the turn that has no 3D equivalent
      t = y * c2 - z * s2; z = y * s2 + z * c2; y = t;          // YZ
      t = z * c3 - w * s3; w = z * s3 + w * c3; z = t;          // ZW
      const k = D / (D - w * 0.86);
      K[i] = k; W[i] = (w + 1.42) / 2.84;
      P[i].set(x, y, z).multiplyScalar(k * R * 0.62);
    }
    E.forEach(([i, j], n) => {
      d.subVectors(P[j], P[i]); const len = d.length(); mid.addVectors(P[i], P[j]).multiplyScalar(0.5);
      q.setFromUnitVectors(up, d.divideScalar(len || 1));
      const r = 0.013 * R * (K[i] + K[j]) * 0.5;
      edges.setMatrixAt(n, m4.compose(mid, q, sc.set(r, len, r)));
      edges.setColorAt(n, col.copy(cFar).lerp(cNear, (W[i] + W[j]) * 0.5).multiplyScalar((0.55 + 0.95 * (W[i] + W[j]) * 0.5) * gain));
    });
    for (let i = 0; i < 16; i++) {
      const r = 0.034 * R * K[i];
      nodes.setMatrixAt(i, m4.compose(P[i], q.identity(), sc.set(r, r, r)));
      nodes.setColorAt(i, col.setRGB(1, 1, 1).lerp(cNear, 0.35).multiplyScalar((0.9 + 1.3 * W[i]) * gain));
    }
    F.forEach((f, n) => f.forEach((vi, c) => { const o = (n * 4 + c) * 3; fPos[o] = P[vi].x; fPos[o + 1] = P[vi].y; fPos[o + 2] = P[vi].z; fW[n * 4 + c] = W[vi]; }));
    edges.instanceMatrix.needsUpdate = nodes.instanceMatrix.needsUpdate = true;
    edges.instanceColor.needsUpdate = nodes.instanceColor.needsUpdate = true;
    fGeo.attributes.position.needsUpdate = fGeo.attributes.aW.needsUpdate = true;
    fMat.uniforms.uGain.value = gain; fMat.uniforms.uTime.value = phase;
    halo.material.opacity = 0.3 * gain;
    group.rotation.y = phase * 0.05;
  }
  return { group, update };
}

function glowTex() {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d");
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(150,170,255,0.55)"); g.addColorStop(0.3, "rgba(110,90,255,0.2)"); g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
}
