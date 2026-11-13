import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { World } from "../world/World.js";
import { FOLD } from "../components/Curtain.jsx";

/* where the last press landed: page transitions fold outward from it */
const press = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointerdown", (e) => { press.x = e.clientX; press.y = e.clientY; }, true);
const foldFrom = () => Math.min(FOLD.rows - 1, Math.floor((press.y / innerHeight) * FOLD.rows)) * FOLD.cols + Math.min(FOLD.cols - 1, Math.floor((press.x / innerWidth) * FOLD.cols));

gsap.registerPlugin(ScrollTrigger);

/* ─── singletons: one world, one scroller, for the life of the tab ─── */
export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

export const lenis = new Lenis({ lerp: 0.085, smoothWheel: !reduceMotion });
lenis.on("scroll", ScrollTrigger.update);
lenis.stop();

let world = null;
try { world = new World(document.getElementById("webgl")); }
catch (err) { console.warn("WebGL unavailable", err); document.documentElement.classList.add("no-webgl"); }
export { world };
if (import.meta.env.DEV) window.__world = world; // debugging handle, dev only

gsap.ticker.lagSmoothing(0);
gsap.ticker.add((t) => { lenis.raf(t * 1000); world?.tick(); });
addEventListener("resize", () => { world?.resize(); ScrollTrigger.refresh(); });

/* ─── page titles used by the transition curtain ─── */
export const PAGE_NAMES = { "/": "Paradox", "/events": "Exhibits", "/schedule": "Schedule", "/register": "Register", "/about": "About", "/contact": "Contact", "/sponsors": "Partners" };
export const nameFor = (path) => PAGE_NAMES[path] || (path.startsWith("/events/") ? "Exhibit" : "Lost");

/* ─── transitions ─── */
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navType = useNavigationType();
  const busy = useRef(false);
  const viaCurtain = useRef(false);
  const positions = useRef(new Map()); // scroll position per history entry, so Back lands where you were

  useEffect(() => {
    const key = location.key;
    const save = () => positions.current.set(key, scrollY);
    addEventListener("scroll", save, { passive: true });
    return () => removeEventListener("scroll", save);
  }, [location.key]);

  const go = useCallback((to, { curtain = true, replace = false } = {}) => {
    if (busy.current) return;
    const path = to.split("?")[0];
    if (to === location.pathname + location.search) { lenis.scrollTo(0, { duration: 1.4 }); return; }
    const el = document.getElementById("curtain");
    if (!curtain || reduceMotion || !el) { navigate(to, { replace }); return; }
    busy.current = true; viaCurtain.current = true;
    el.querySelector("[data-curtain-title]").textContent = nameFor(path);
    el.querySelector("[data-curtain-path]").textContent = path === "/" ? "/ home" : path;
    gsap.timeline({ onComplete: () => { navigate(to); } })
      .set(el, { visibility: "visible" })
      .fromTo(el.querySelectorAll(".fold__cell"), { rotateX: -96, opacity: 0, scale: 0.8 },
        { rotateX: 0, opacity: 1, scale: 1.015, duration: 0.5, ease: "power3.out", stagger: { grid: [FOLD.rows, FOLD.cols], from: foldFrom(), amount: 0.4 } })
      .fromTo(el.querySelectorAll("[data-curtain-line]"), { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: "expo.out", stagger: 0.05 }, "-=0.3");
  }, [location.pathname, location.search, navigate]);

  // after every route change: restore (Back/Forward) or jump to top, refresh scroll maths, lift the curtain
  useEffect(() => {
    const saved = navType === "POP" ? positions.current.get(location.key) : undefined;
    lenis.scrollTo(0, { immediate: true, force: true });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (saved) lenis.scrollTo(saved, { immediate: true, force: true });
    }));
    if (document.documentElement.classList.contains("is-ready") && !document.getElementById("menu")?.matches("[aria-hidden='false']")) lenis.start();
    busy.current = false;
    const el = document.getElementById("curtain");
    if (!el) return;
    if (viaCurtain.current) {
      viaCurtain.current = false;
      gsap.timeline({ delay: 0.15, onComplete: () => { busy.current = false; gsap.set(el, { visibility: "hidden" }); } })
        .to(el.querySelectorAll("[data-curtain-line]"), { yPercent: -110, duration: 0.45, ease: "power3.in", stagger: 0.04 })
        .to(el.querySelectorAll(".fold__cell"), { rotateX: 96, opacity: 0, scale: 0.8, duration: 0.55, ease: "power3.in", stagger: { grid: [FOLD.rows, FOLD.cols], from: "center", amount: 0.38 } }, "-=0.2");
    } else gsap.set(el, { visibility: "hidden" });
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  /* back: previous in-app page if there is one, otherwise a sensible parent */
  const back = useCallback((fallback = "/") => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1); else go(fallback);
  }, [navigate, go]);

  return <Ctx.Provider value={{ go, back, world, lenis }}>{children}</Ctx.Provider>;
}

/* Link that runs the curtain. Modified clicks (new tab etc.) behave normally. */
export function TLink({ to, children, curtain = true, replace, onClick, ...rest }) {
  const { go } = useApp();
  return (
    <a href={to} {...rest} onClick={(e) => {
      onClick?.(e);
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault(); go(to, { curtain, replace: !!replace });
    }}>{children}</a>
  );
}

/* Ask the camera to go somewhere for the lifetime of a page. */
export function useWorldMode(mode, deps = []) {
  useEffect(() => { world?.setMode(mode); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
