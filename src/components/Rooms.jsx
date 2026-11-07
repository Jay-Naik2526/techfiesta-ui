import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { TLink, lenis, reduceMotion } from "../lib/app.jsx";
import { STOP } from "../world/World.js";
import { EVENTS, fmtSlot } from "../data/events.js";
import { dayLabel } from "../data/fest.js";
import { pad2 } from "./misc.jsx";

/* The events chapter of the home journey.
   A pinned panel (left) swaps to the event whose step is in view, while the camera
   glides down the tesseract corridor to that event's frame (right). The invisible
   steps carry data-stop so the camera rig knows where each frame lives on the page. */
export default function Rooms() {
  const [active, setActive] = useState(0);
  const steps = useRef([]);
  const title = useRef(null);
  const e = EVENTS[active];

  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(+en.target.dataset.i); });
    }, { rootMargin: "-50% 0px -50% 0px" });
    steps.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const key = (ev) => {
      if (ev.target.closest?.("input,textarea,select")) return;
      const sec = steps.current[0]?.parentElement; if (!sec) return;
      const r = sec.getBoundingClientRect(); if (r.top > 0 || r.bottom < innerHeight) return;   // only while pinned
      const d = ev.key === "ArrowDown" || ev.key === "ArrowRight" ? 1 : ev.key === "ArrowUp" || ev.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      const n = Math.min(EVENTS.length - 1, Math.max(0, active + d));
      if (n !== active) { ev.preventDefault(); jump(n); }
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  });

  useEffect(() => {
    if (reduceMotion || !title.current) return;
    const t = gsap.timeline();
    t.fromTo(title.current.querySelectorAll(".rooms__in"), { yPercent: 105 }, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.04 })
      .fromTo(title.current.querySelectorAll(".rooms__fade"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.05 }, 0.12);
    return () => t.kill();
  }, [active]);

  const jump = (i) => {
    const el = steps.current[i]; if (!el) return;
    lenis.scrollTo(el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2, { duration: 1.6 });
  };

  return (
    <section className="rooms" aria-label="The rooms">
      <div className="rooms__sticky">
        <div className="rooms__panel" data-ui>
          <div className="rooms__head mono">
            <span>The rooms <em className="rooms__hint">· ↑ ↓ to walk</em></span>
            <span className="rooms__count"><b>{pad2(active + 1)}</b> / {pad2(EVENTS.length)}</span>
          </div>
          <div className="rooms__bar"><i style={{ transform: `scaleX(${(active + 1) / EVENTS.length})` }} /></div>

          <div className="rooms__body" ref={title} key={e.slug}>
            <p className="rooms__mask mono acc"><span className="rooms__in">{e.pdx}</span></p>
            <h3 className="rooms__title"><span className="rooms__mask"><span className="rooms__in">{e.short || e.title}</span></span></h3>
            <p className="rooms__koan rooms__fade">{e.koan}</p>
            <div className="rooms__chips rooms__fade mono">
              <span>{e.category}</span>
              <span>Day {pad2(e.slots[0].day)} · {dayLabel(e.slots[0].day)}</span>
              <span>{fmtSlot(e.slots[0])}</span>
              <span>{e.by}</span>
            </div>
            <div className="rooms__actions rooms__fade">
              <TLink to={`/events/${e.slug}`} curtain={false} className="btn btn--solid mono" data-cursor="Enter">Enter the room <i>→</i></TLink>
              <TLink to={`/register?event=${e.slug}`} className="btn btn--ghost mono">Register</TLink>
            </div>
          </div>

          <ol className="rooms__index" aria-label="All rooms">
            {EVENTS.map((x, i) => (
              <li key={x.slug}>
                <button className={i === active ? "is-on" : ""} onClick={() => jump(i)} aria-current={i === active ? "true" : undefined}>
                  <span className="mono">{x.no}</span><span>{x.short || x.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      {EVENTS.map((x, i) => (
        <div key={x.slug} className="rooms__step" data-stop={STOP.ex0 + i} data-i={i} ref={(el) => (steps.current[i] = el)} aria-hidden="true" />
      ))}
    </section>
  );
}
