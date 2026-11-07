import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useLocation } from "react-router-dom";
import { world } from "../lib/app.jsx";
import { STOP } from "../world/World.js";
import { sound } from "../lib/sound.js";

/* Depth meter on the right edge: how far down the shaft the camera is. */
export default function Hud({ ready }) {
  const { pathname } = useLocation();
  const depth = useRef(null), rail = useRef(null), label = useRef(null), root = useRef(null);
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
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  return (
    <aside ref={root} className={`hud mono ${ready && pathname === "/" ? "is-in" : ""}`} aria-hidden="true">
      <div className="hud__depth"><span>Depth</span><b ref={depth}>00.0</b><span>m</span></div>
      <div className="hud__rail"><i ref={rail} /></div>
      <div className="hud__label" ref={label} />
    </aside>
  );
}
