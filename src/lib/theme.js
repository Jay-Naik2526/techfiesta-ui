/* Two worlds share one site: "tesseract" (the lattice) and "horizon" (deep space, a black hole).
   The 3D world is built once per page load, so switching theme reloads into the other one.
   The choice lives in the URL (?theme=…, shareable) and is remembered per browser. */
const KEY = "tf-theme";
export const THEMES = { tesseract: "Tesseract", horizon: "Black hole" };

function read() {
  try {
    const q = new URLSearchParams(location.search).get("theme");
    if (q && THEMES[q]) { localStorage.setItem(KEY, q); return q; }
    const s = localStorage.getItem(KEY);
    if (s && THEMES[s]) return s;
  } catch { /* storage unavailable */ }
  return "tesseract";
}
export const THEME = read();
export const OTHER = THEME === "tesseract" ? "horizon" : "tesseract";
document.documentElement.dataset.theme = THEME;

export function switchTheme(to = OTHER) {
  try { localStorage.setItem(KEY, to); } catch { /* storage unavailable */ }
  const u = new URL(location.href); u.searchParams.set("theme", to);
  location.assign(u.toString());
}
