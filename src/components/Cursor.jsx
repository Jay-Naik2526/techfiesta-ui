import { useEffect, useRef } from "react";
import gsap from "gsap";
import { world, finePointer, reduceMotion } from "../lib/app.jsx";
import { sound } from "../lib/sound.js";

/* A dot that grows over things you can press and says what pressing does. */
export default function Cursor() {
  const el = useRef(null), lab = useRef(null);
  useEffect(() => {
    if (!finePointer || reduceMotion) return;
    document.documentElement.classList.add("has-cursor");
    let cx = -100, cy = -100, x = cx, y = cy, worldLabel = "", domLabel = null;
    const move = (e) => { cx = e.clientX; cy = e.clientY; };
    const set = () => {
      const label = domLabel ?? worldLabel;
      el.current.classList.toggle("is-hover", label === "•");
      el.current.classList.toggle("is-label", !!label && label !== "•");
      if (label && label !== "•") lab.current.textContent = label;
    };
    const over = (e) => {
      const t = e.target.closest("[data-cursor],a,button,input,select,textarea,label");
      const next = t ? (t.dataset.cursor && t.dataset.cursor !== "hover" ? t.dataset.cursor : t.matches("input,textarea,select") ? null : "•") : null;
      if (next !== domLabel && next) sound.tick(next === "•" ? 1500 : 1100);
      domLabel = next; set();
    };
    const tick = () => { x += (cx - x) * 0.3; y += (cy - y) * 0.3; el.current.style.transform = `translate3d(${x}px,${y}px,0)`; };
    const off = world?.on("hover", (i) => { worldLabel = i >= 0 ? "Enter" : ""; if (i >= 0) sound.tick(900); set(); });
    addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over);
    gsap.ticker.add(tick);
    return () => { removeEventListener("pointermove", move); document.removeEventListener("pointerover", over); gsap.ticker.remove(tick); off?.(); };
  }, []);
  return <div className="cursor" ref={el} aria-hidden="true"><span ref={lab} /></div>;
}
