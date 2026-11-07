import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { useSearchParams } from "react-router-dom";
import { TLink, world, useWorldMode, reduceMotion } from "../lib/app.jsx";
import { EVENTS, CATEGORIES, fmtSlot } from "../data/events.js";
import { dayLabel } from "../data/fest.js";
import Art from "../components/Art.jsx";
import { SplitTitle, pad2 } from "../components/misc.jsx";

export default function Events() {
  useWorldMode({ type: "ambient", place: "gallery", label: "The gallery" });
  const [params, setParams] = useSearchParams();
  const cat = params.get("kind") || "All";
  const day = +(params.get("day") || 0);
  const [q, setQ] = useState("");
  const grid = useRef(null);
  const view = params.get("view") === "index" ? "index" : "grid";
  const [prev, setPrev] = useState(EVENTS[0]);
  const pv = useRef(null), mover = useRef(null);
  useEffect(() => {
    if (view !== "index" || !pv.current) return;
    const xTo = gsap.quickTo(pv.current, "x", { duration: 0.6, ease: "power3" }), yTo = gsap.quickTo(pv.current, "y", { duration: 0.6, ease: "power3" });
    const rTo = gsap.quickTo(pv.current, "rotation", { duration: 0.8, ease: "power3" });
    let lx = 0;
    mover.current = (e) => { xTo(e.clientX); yTo(e.clientY); rTo(Math.max(-14, Math.min(14, (e.clientX - lx) * 0.6))); lx = e.clientX; };
    return () => { mover.current = null; };
  }, [view]);

  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }); };
  const list = useMemo(() => EVENTS.filter((e) =>
    (cat === "All" || e.category === cat) &&
    (!day || e.slots.some((s) => s.day === day)) &&
    (!q || `${e.title} ${e.pdx} ${e.by} ${e.category} ${e.desc}`.toLowerCase().includes(q.toLowerCase()))
  ), [cat, day, q]);
  const count = (c) => EVENTS.filter((e) => c === "All" || e.category === c).length;

  useEffect(() => {
    if (reduceMotion || !grid.current) return;
    const t = gsap.fromTo(grid.current.children, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.05 });
    return () => t.kill();
  }, [cat, day, q, view]);

  // hovering a card turns the camera to that frame on the wall
  const hoverTimer = useRef(null);
  const focus = (i) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => world?.setMode(i < 0 ? { type: "ambient", place: "gallery", label: "The gallery" } : { type: "focus", index: i, side: 0, wide: true, label: `Nº ${EVENTS[i].no}` }, { duration: 1.4 }), i < 0 ? 500 : 180);
  };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  return (
    <div className="page events">
      <header className="page-head">
        <p className="mono eyebrow">The museum of paradoxes · {EVENTS.length} exhibits</p>
        <SplitTitle text="Every event is a paradox. Pick yours." className="page-title" accent={["paradox", "yours"]} />
        <p className="page-lead">Competitions, a 24-hour hackathon, a gaming arena and a robotics workshop — each hung on the wall of the shaft with the contradiction it hides. Hover a card and the camera finds it.</p>
      </header>

      <div className="filters" data-ui role="toolbar" aria-label="Filter events">
        <div className="chips" role="radiogroup" aria-label="Kind">
          {["All", ...CATEGORIES].map((c) => (
            <button key={c} role="radio" aria-checked={cat === c} className={`chip ${cat === c ? "is-on" : ""}`} onClick={() => set("kind", c === "All" ? "" : c)}>
              {c}<span>{count(c)}</span>
            </button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Day">
          {[0, 1, 2, 3].map((d) => (
            <button key={d} role="radio" aria-checked={day === d} className={day === d ? "is-on" : ""} onClick={() => set("day", d ? String(d) : "")}>{d ? `Day ${pad2(d)}` : "All days"}</button>
          ))}
        </div>
        <div className="seg" role="radiogroup" aria-label="Layout">
          {["grid", "index"].map((v) => <button key={v} role="radio" aria-checked={view === v} className={view === v ? "is-on" : ""} onClick={() => set("view", v === "grid" ? "" : v)}>{v === "grid" ? "Grid" : "Index"}</button>)}
        </div>
        <label className="search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
          <input type="search" placeholder="Search events, clubs, paradoxes" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search">✕</button>}
        </label>
      </div>

      <p className="results mono" aria-live="polite">{list.length} {list.length === 1 ? "exhibit" : "exhibits"}{cat !== "All" ? ` · ${cat}` : ""}{day ? ` · Day ${pad2(day)}` : ""}</p>

      {list.length && view === "index" ? (
        <div className="index" ref={grid} data-ui onMouseMove={(e) => mover.current?.(e)} onMouseLeave={() => { focus(-1); gsap.to(pv.current, { scale: 0.6, opacity: 0, duration: 0.4, ease: "power3.out" }); }} onMouseEnter={() => gsap.to(pv.current, { scale: 1, opacity: 1, duration: 0.5, ease: "expo.out" })}>
          {list.map((e) => (
            <TLink key={e.slug} to={`/events/${e.slug}`} curtain={false} className="irow" data-cursor="Open" onMouseEnter={() => { setPrev(e); focus(e.index); }} onFocus={() => focus(e.index)}>
              <span className="irow__no mono">Nº {e.no}</span>
              <span className="irow__t">{e.short || e.title}</span>
              <span className="irow__pdx mono">{e.pdx}</span>
              <span className="irow__d mono">Day {pad2(e.slots[0].day)} · {e.category}</span>
            </TLink>
          ))}
          <div className="ipreview" ref={pv} aria-hidden="true"><Art k={prev.art} /><span className="mono">{prev.pdx}</span></div>
        </div>
      ) : list.length ? (
        <div className="cards" ref={grid} onMouseLeave={() => focus(-1)}>
          {list.map((e) => (
            <TLink key={e.slug} to={`/events/${e.slug}`} curtain={false} className="card" data-cursor="Open" data-ui onMouseEnter={() => focus(e.index)} onFocus={() => focus(e.index)}>
              <div className="card__art"><Art k={e.art} /><span className="card__no mono">Nº {e.no}</span><span className="card__kind mono">{e.category}</span></div>
              <div className="card__body">
                <p className="mono acc">{e.pdx}</p>
                <h3>{e.short || e.title}</h3>
                <p className="card__koan">{e.koan}</p>
                <div className="card__meta mono">
                  {e.slots.map((s, k) => <span key={k}>Day {pad2(s.day)} · {fmtSlot(s)}</span>)}
                  <span>{e.by}</span>
                </div>
              </div>
              <span className="card__go" aria-hidden="true">→</span>
            </TLink>
          ))}
        </div>
      ) : (
        <div className="empty" data-ui>
          <p className="empty__big">Nothing matches.</p>
          <p>Which is also a result. <button className="link" onClick={() => { setQ(""); set("kind", ""); set("day", ""); }}>Clear the filters</button></p>
        </div>
      )}
      <p className="note mono">Dates: {dayLabel(1) === "Date TBA" ? "announced soon" : `${dayLabel(1)} – ${dayLabel(3)}`}. Timings carried over from the last edition and may change.</p>
    </div>
  );
}
