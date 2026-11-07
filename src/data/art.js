/* Each paradox drawn as a small, legible SVG diagram. The same markup is
   rendered live in the UI (animated by CSS) and baked into the 3D frames. */
const S = (inner, label) =>
  `<svg class="art-svg" viewBox="0 0 300 270" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${label}">${inner}</svg>`;
const qmark = `style="font:italic 400 54px 'Instrument Serif',serif;letter-spacing:0;text-transform:none"`;

export const ART = {
  meno: () => S(`<path class="dash-run" d="M34 224 C96 232 66 150 128 160 S206 116 172 76 S244 40 260 66"/><circle cx="34" cy="224" r="5" class="fill-acc"/><text x="236" y="52" class="acc" ${qmark}>?</text><text x="30" y="252">You are here. It is somewhere.</text>`, "A dashed path winding toward a question mark"),
  survivor: () => {
    let b = "";
    for (let i = 0; i < 36; i++) {
      const win = [7, 19, 30].includes(i), h = win ? 150 + (i % 3) * 14 : 18 + ((i * 53) % 62);
      b += `<rect x="${22 + i * 7.6}" y="${222 - h}" width="4.6" height="${h}" ${win ? 'class="fill-acc"' : 'style="opacity:.38"'}/>`;
    }
    return S(`${b}<line x1="18" y1="224" x2="282" y2="224"/><text x="22" y="248">You only hear from these three.</text>`, "Many short bars and three tall highlighted ones");
  },
  wheel: () => {
    let sp = "";
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; sp += `<line x1="150" y1="115" x2="${(150 + 78 * Math.sin(a)).toFixed(1)}" y2="${(115 - 78 * Math.cos(a)).toFixed(1)}"/>`; }
    return S(`<g class="wheel" style="transform-origin:150px 115px"><circle cx="150" cy="115" r="82"/><circle cx="150" cy="115" r="70" style="opacity:.4"/>${sp}</g><circle cx="150" cy="115" r="9" class="fill-acc"/><text x="150" y="238" text-anchor="middle">It is spinning forwards. Probably.</text>`, "A spoked wheel rotating");
  },
  liar: () => S(`<line x1="58" y1="28" x2="58" y2="246" stroke-width="2.5"/><g class="flag"><path d="M58 40 H252 V136 H58 Z" class="fill-acc"/><text class="on-acc" x="74" y="76" style="font-size:13px">This flag</text><text class="on-acc" x="74" y="96" style="font-size:13px">is not</text><text class="on-acc" x="74" y="116" style="font-size:13px">a flag.</text></g><text x="76" y="200">True, but only if false.</text>`, "A flag that says this flag is not a flag"),
  tower: () => {
    const L = 108, K = 7, pos = []; let cur = 36;
    for (let n = K; n >= 1; n--) { pos[n] = cur; cur += L / (2 * (n - 1 || 1)); }
    let r = "";
    for (let n = 1; n <= K; n++) r += `<rect class="tower-block ${n === 1 ? "fill-acc" : ""}" style="--i:${n};--dx:${5 + (n % 3) * 2}px" x="${pos[n].toFixed(1)}" y="${224 - (K - n + 1) * 20}" width="${L}" height="19" rx="1.5"/>`;
    return S(`<line x1="14" y1="244" x2="140" y2="244" stroke-width="2.5"/>${r}<text x="30" y="264" style="font-size:8.5px">Infinite overhang. Finite blocks.</text>`, "A stack of blocks leaning further out");
  },
  theseus: () => {
    let p = "";
    for (let i = 0; i < 6; i++) p += `<rect class="plank" style="--i:${i}" x="46" y="${34 + i * 26}" width="208" height="18" rx="2"/>`;
    return S(`${p}<path d="M26 206 Q150 262 274 206"/><text x="150" y="258" text-anchor="middle">Every plank replaced. Same ship?</text>`, "A ship hull whose planks turn red one by one");
  },
  dilemma: () => {
    let c = "";
    [[56, 52, "3 · 3"], [152, 52, "0 · 5"], [56, 124, "5 · 0"], [152, 124, "1 · 1"]].forEach(([x, y, t], i) => (c += `<rect class="cell" style="--i:${i};--n:4" x="${x}" y="${y}" width="92" height="64"/><text x="${x + 46}" y="${y + 36}" text-anchor="middle" style="font-size:13px">${t}</text>`));
    return S(`${c}<text x="102" y="42" text-anchor="middle">Cooperate</text><text x="198" y="42" text-anchor="middle">Defect</text><text x="150" y="232" text-anchor="middle">Trust nobody. Win together.</text>`, "A two by two payoff matrix");
  },
  zeno: () => {
    let t = "";
    for (let k = 1; k <= 6; k++) { const x = (36 + 228 * (1 - 1 / 2 ** k)).toFixed(1); t += `<line x1="${x}" y1="128" x2="${x}" y2="152" style="opacity:.55"/>`; }
    return S(`<line x1="20" y1="140" x2="280" y2="140"/>${t}<circle cx="276" cy="140" r="9"/><circle cx="276" cy="140" r="3" class="fill-acc"/><g class="arrow-z"><line x1="4" y1="140" x2="34" y2="140" stroke-width="2.5" class="acc"/><polygon points="30,132 44,140 30,148" class="fill-acc"/></g><text x="20" y="206">Always halfway to halfway.</text>`, "An arrow approaching a target by halves");
  },
  twin: () => S(`<line x1="40" y1="84" x2="262" y2="84" style="opacity:.4"/><line x1="40" y1="164" x2="262" y2="164" style="opacity:.4"/><line x1="262" y1="64" x2="262" y2="104"/><line x1="262" y1="144" x2="262" y2="184"/><circle class="dot-a fill-acc" cx="40" cy="84" r="7"/><circle class="dot-b fill-acc" cx="40" cy="164" r="7"/><text x="40" y="62">Twin A · stays home · ages 10 yrs</text><text x="40" y="142">Twin B · goes fast · ages 7 yrs</text><text x="40" y="232">Same start. Same finish.</text>`, "Two dots travelling at different speeds"),
  moravec: () => S(`<line x1="30" y1="88" x2="270" y2="88" style="opacity:.35"/><line x1="30" y1="138" x2="270" y2="138" style="opacity:.35"/><line x1="30" y1="188" x2="270" y2="188" style="opacity:.35"/><text x="30" y="76">Beat a chess grandmaster</text><text x="270" y="76" text-anchor="end" class="acc" style="font-weight:600">Solved</text><text x="30" y="126">Open a door</text><text x="270" y="126" text-anchor="end" class="flicker">Still hard</text><text x="30" y="176">Walk across a room</text><text x="270" y="176" text-anchor="end" class="flicker" style="animation-delay:.9s">Still hard</text><text x="30" y="236">Hard things are easy. Easy things are hard.</text>`, "Chess is solved; opening doors is still hard"),
  catch22: () => S(`<rect x="86" y="26" width="128" height="40" rx="2"/><text x="150" y="51" text-anchor="middle">Need a job</text><rect x="86" y="190" width="128" height="40" rx="2"/><text x="150" y="215" text-anchor="middle">Need experience</text><path class="dash-run" d="M214 46 C292 46 292 210 220 210"/><polygon points="224,203 212,210 224,217" class="fill-acc"/><path class="dash-run" d="M86 210 C8 210 8 46 80 46"/><polygon points="76,39 88,46 76,53" class="fill-acc"/><text x="150" y="124" text-anchor="middle">Experience needs a job.</text><text x="150" y="142" text-anchor="middle">A job needs experience.</text>`, "Two boxes pointing at each other in a loop")
};

/* Standalone version for <img>/canvas use: external CSS doesn't reach inside, so inline it. */
export function artAsImageSrc(key, w = 1200, h = 1080) {
  const css = `<style>text{font:500 9.5px 'DM Mono',monospace;letter-spacing:.06em;fill:#0b0d1c;stroke:none;text-transform:uppercase}.acc{fill:#6a4dff;stroke:#6a4dff}.fill-acc{fill:#6a4dff;stroke:none}.on-acc{fill:#0b0d1c}.plank[style*="--i:0"],.plank[style*="--i:2"],.plank[style*="--i:3"]{fill:#6a4dff}.cell[style*="--i:3"]{fill:#6a4dff}</style>`;
  const src = ART[key]()
    .replace('<svg class="art-svg"', `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="color:#0b0d1c"`)
    .replace(/role="img"[^>]*?>/, (m) => m + css)
    .replace(/var\(--acc\)/g, "#6a4dff");
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
}
