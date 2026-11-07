/* Site-wide micro-interactions, wired once by event delegation:
   - magnetic: buttons lean toward the cursor and spring back
   - scramble: mono links shuffle their letters on hover, then settle */
import gsap from "gsap";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/◬∞";

export function installMicro() {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const MAG = ".btn, .nav__cta, .nav__menu, .ask-btn, .backbtn";
  let current = null;
  addEventListener("pointermove", (e) => {
    const el = e.target.closest?.(MAG);
    if (current && current !== el) { gsap.to(current, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.5)" }); current = null; }
    if (!el) return;
    current = el;
    const r = el.getBoundingClientRect();
    gsap.to(el, { x: (e.clientX - (r.left + r.width / 2)) * 0.25, y: (e.clientY - (r.top + r.height / 2)) * 0.35, duration: 0.4, ease: "power3.out" });
  }, { passive: true });

  const SCR = ".nav__links a, .footer__links a, .crumbs a, .menu__socials a, .contact__socials a";
  const busy = new WeakSet();
  document.addEventListener("pointerover", (e) => {
    const el = e.target.closest?.(SCR);
    if (!el || busy.has(el) || el.children.length) return;
    const final = el.textContent; busy.add(el);
    let frame = 0; const total = 14;
    const id = setInterval(() => {
      frame++;
      el.textContent = final.split("").map((c, i) => (c === " " || i < (frame / total) * final.length ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join("");
      if (frame >= total) { clearInterval(id); el.textContent = final; busy.delete(el); }
    }, 28);
  });
}
