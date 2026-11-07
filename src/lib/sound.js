/* Opt-in generated sound. No audio files: a low drone whose filter opens with depth,
   and a soft tick for hovers. Off by default; the choice is remembered per browser. */
let ctx, master, filter, on = false;
const KEY = "tf-sound";

function build() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = 0;
  filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 420; filter.Q.value = 6;
  filter.connect(master).connect(ctx.destination);
  [[55, "sine", 0.5], [82.41, "triangle", 0.18], [110.3, "sine", 0.12], [164.8, "sine", 0.05]].forEach(([f, type, g]) => {
    const o = ctx.createOscillator(), gn = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = type; o.frequency.value = f; gn.gain.value = g;
    lfo.frequency.value = 0.05 + Math.random() * 0.08; lg.gain.value = g * 0.5; lfo.connect(lg).connect(gn.gain); lfo.start();
    o.connect(gn).connect(filter); o.start();
  });
}

/* ── inside the suit: breathing, radio crackle, passing whooshes, thruster hiss — all synthesised ── */
let noiseBuf = null, breathTimer = null, radioTimer = null;
function noise() {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; return src;
}
function burst({ f0, f1 = f0, q = 1.2, gain, attack, hold = 0, release, pan = 0, type = "bandpass" }) {
  if (!ctx || !on) return;
  const t = ctx.currentTime, src = noise(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), p = ctx.createStereoPanner();
  bp.type = type; bp.Q.value = q; bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + attack + hold + release);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.setValueAtTime(gain, t + attack + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  p.pan.value = pan;
  src.connect(bp).connect(g).connect(p).connect(ctx.destination); src.start(t); src.stop(t + attack + hold + release + 0.05);
}
function suitOn(enable) {
  clearInterval(breathTimer); clearTimeout(radioTimer);
  if (!enable) return;
  const breathe = () => {
    burst({ f0: 700, f1: 1100, q: 0.9, gain: 0.05, attack: 1.0, hold: 0.3, release: 0.7 });                                  // in
    setTimeout(() => burst({ f0: 900, f1: 420, q: 0.8, gain: 0.04, attack: 0.25, hold: 0.4, release: 1.3 }), 2100);          // out
  };
  breathe(); breathTimer = setInterval(breathe, 5200);
  const radio = () => { burst({ f0: 2600, q: 0.6, gain: 0.012, attack: 0.01, hold: 0.12, release: 0.15, type: "highpass" }); radioTimer = setTimeout(radio, 9000 + Math.random() * 9000); };
  radioTimer = setTimeout(radio, 6000);
}

let bed = null;
function bedOn(on) {
  if (!bed) { bed = new Audio("/media/hero-audio.mp3"); bed.loop = true; bed.volume = 0; }
  if (on) { bed.play().catch(() => {}); fade(bed, 0.55); } else fade(bed, 0, () => bed.pause());
}
function fade(a, to, done) {
  const from = a.volume, t0 = performance.now(), d = 1200;
  const step = (t) => { const k = Math.min(1, (t - t0) / d); a.volume = from + (to - from) * k; k < 1 ? requestAnimationFrame(step) : done?.(); };
  requestAnimationFrame(step);
}

export const sound = {
  get on() { return on; },
  remembered() { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } },
  toggle(force) {
    on = force ?? !on;
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* storage unavailable */ }
    bedOn(on);
    if (on && !ctx) build();
    suitOn(on);
    if (!ctx) return on;
    if (on) ctx.resume();
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.6);
    return on;
  },
  depth(d) { if (ctx && on) filter.frequency.setTargetAtTime(380 + Math.min(d, 124) * 6, ctx.currentTime, 0.4); },
  whoosh(pan = 0) { burst({ f0: 260, f1: 1900, q: 1.4, gain: 0.07, attack: 0.18, hold: 0.05, release: 0.55, pan }); },
  puff() { if (Math.random() < 0.35) burst({ f0: 3200, f1: 1800, q: 0.7, gain: 0.008, attack: 0.01, release: 0.18, type: "highpass" }); },
  tick(freq = 1320) {
    if (!ctx || !on) return;
    const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = "sine"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.08);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.03, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.14);
  }
};
