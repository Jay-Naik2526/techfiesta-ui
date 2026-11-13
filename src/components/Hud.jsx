import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLocation } from "react-router-dom";
import { world } from "../lib/app.jsx";
import { STOP } from "../world/World.js";
import { sound } from "../lib/sound.js";
import { THEME } from "../lib/theme.js";

/* seconds of far-away time, in whatever unit reads best */
function span(sec) {
  if (!isFinite(sec)) return "forever";
  const u = [[31557600e6, "million years"], [31557600e3, "thousand years"], [31557600, "years"], [86400, "days"], [3600, "hours"], [60, "minutes"], [1, "seconds"]];
  for (const [k, name] of u) if (sec >= k * 0.995) { const v = sec / k; return `${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)} ${name}`; }
  return `${sec.toFixed(3)} seconds`;
}

/* Depth meter on the right edge: how far down the shaft the camera is. */
export default function Hud({ ready }) {
  const { pathname } = useLocation();
  const depth = useRef(null), rail = useRef(null), label = useRef(null), root = useRef(null), dil = useRef(null), dilV = useRef(null);
  useEffect(() => {
    if (!world) return;
    let last = "";
    const tick = () => {
      const i = world.info;
      depth.current.textContent = (i.depth > 0.05 ? "−" : "") + i.depth.toFixed(1).padStart(4, "0");
      rail.current.style.transform = `translateY(${i.progress * 30}vh)`;
      if (i.label !== last) { last = i.label; label.current.textContent = i.label; }
      sound.depth(i.depth);
      const inRooms = world.mode.type === "journey" && world.sCur > STOP.ex0 - 0.5 && world.sCur < STOP.bottom - 0.5;
      root.current.style.visibility = inRooms ? "hidden" : "";
      if (dil.current) { const f = i.dilation || 0; dil.current.classList.toggle("is-in", f > 0); if (f > 0) dilV.current.textContent = span(f); }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (<>
    {THEME === "horizon" && pathname === "/" && (
      <div className="dilation mono" ref={dil} aria-hidden="true"><span>1 second here</span><i>=</i><b ref={dilV}>1.000 seconds</b><span>outside</span></div>
    )}
    <aside ref={root} className={`hud mono ${ready && pathname === "/" ? "is-in" : ""}`} aria-hidden="true">
      <div className="hud__depth"><span>Depth</span><b ref={depth}>00.0</b><span>m</span></div>
      <div className="hud__rail"><i ref={rail} /></div>
      <div className="hud__label" ref={label} />
    </aside>
  </>);
}
