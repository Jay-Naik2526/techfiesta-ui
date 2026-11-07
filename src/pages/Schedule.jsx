import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { TLink, useWorldMode, reduceMotion } from "../lib/app.jsx";
import { EVENTS, fmtSlot, toMin } from "../data/events.js";
import { FEST, dayLabel } from "../data/fest.js";
import { SplitTitle, pad2 } from "../components/misc.jsx";

const START = 10 * 60, END = 18 * 60, SPAN = END - START;
const HOURS = Array.from({ length: (END - START) / 60 + 1 }, (_, i) => 10 + i);

export default function Schedule() {
  useWorldMode({ type: "ambient", place: "pit", label: "The pit" });
  const [day, setDay] = useState(1);
  const [view, setView] = useState(() => (innerWidth < 900 ? "list" : "timeline"));
  const tabs = useRef(null), ind = useRef(null), body = useRef(null);

  const rows = EVENTS.flatMap((e) => e.slots.filter((s) => s.day === day).map((s) => ({ e, s }))).sort((a, b) => toMin(a.s.start) - toMin(b.s.start));

  useEffect(() => {
    const btn = tabs.current.querySelector(".is-on");
    if (btn) gsap.to(ind.current, { x: btn.offsetLeft, width: btn.offsetWidth, duration: reduceMotion ? 0 : 0.5, ease: "expo.out" });
    if (!reduceMotion && body.current) gsap.fromTo(body.current.querySelectorAll(".tl__row, .ls__row"), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 });
  }, [day, view]);

  return (
    <div className="page schedule">
      <header className="page-head">
        <p className="mono eyebrow">Schedule · {FEST.provisional ? "provisional" : "final"}</p>
        <SplitTitle text="Three days. No spoilers." className="page-title" accent={["spoilers."]} />
        <p className="page-lead">Every event, hour by hour. {FEST.provisional && "Timings are carried over from the last edition and will be confirmed with registration."}</p>
      </header>

      <div className="sched" data-ui>
        <div className="sched__bar">
          <div className="tabs" ref={tabs} role="tablist" aria-label="Day">
            <span className="tabs__ind" ref={ind} aria-hidden="true" />
            {[1, 2, 3].map((d) => (
              <button key={d} role="tab" aria-selected={day === d} className={day === d ? "is-on" : ""} onClick={() => setDay(d)}>
                <b>Day {pad2(d)}</b><span className="mono">{dayLabel(d)}</span>
              </button>
            ))}
          </div>
          <div className="seg seg--light" role="radiogroup" aria-label="View">
            {["timeline", "list"].map((v) => <button key={v} role="radio" aria-checked={view === v} className={view === v ? "is-on" : ""} onClick={() => setView(v)}>{v === "timeline" ? "Timeline" : "List"}</button>)}
          </div>
        </div>

        <div ref={body} key={`${day}-${view}`}>
          {view === "timeline" ? (
            <div className="tl" role="table" aria-label={`Day ${day} timeline`}>
              <div className="tl__axis" aria-hidden="true">
                {HOURS.map((h) => <span key={h} style={{ left: `${((h * 60 - START) / SPAN) * 100}%` }} className="mono">{h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}</span>)}
              </div>
              {rows.map(({ e, s }) => {
                const a = toMin(s.start), b = s.end ? toMin(s.end) : END;
                const left = ((a - START) / SPAN) * 100, width = ((Math.min(b, END) - a) / SPAN) * 100;
                return (
                  <div className="tl__row" key={e.slug + s.start} role="row">
                    <div className="tl__lane" aria-hidden="true">{HOURS.map((h) => <i key={h} style={{ left: `${((h * 60 - START) / SPAN) * 100}%` }} />)}</div>
                    <TLink to={`/events/${e.slug}`} className={`tl__bar ${s.end ? "" : "is-open"} k-${e.category.toLowerCase()}`} style={{ left: `${left}%`, width: `${width}%` }} data-cursor="Open" role="cell">
                      <b>{e.short ? `${e.short}${s.label ? ` — ${s.label}` : ""}` : e.title}</b>
                      <span className="mono">{fmtSlot(s)}</span>
                    </TLink>
                  </div>
                );
              })}
            </div>
          ) : (
            <ol className="ls">
              {rows.map(({ e, s }) => (
                <li key={e.slug + s.start}>
                  <TLink to={`/events/${e.slug}`} className="ls__row" data-cursor="Open">
                    <span className="ls__t mono">{fmtSlot(s)}</span>
                    <span className="ls__name">{e.short ? `${e.short}${s.label ? ` — ${s.label}` : ""}` : e.title}</span>
                    <span className="ls__pdx mono">{e.pdx}</span>
                    <span className="ls__by mono">{e.by}</span>
                    <span className="ls__go" aria-hidden="true">→</span>
                  </TLink>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="legend mono" aria-hidden="true">{["Competition", "Hackathon", "Gaming", "Workshop"].map((k) => <span key={k} className={`k-${k.toLowerCase()}`}><i />{k}</span>)}<span><i className="open" />Runs on past 6 pm</span></div>
      </div>
    </div>
  );
}
