import { useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import gsap from "gsap";
import { TLink, world, reduceMotion, useApp } from "../lib/app.jsx";
import { EVENTS, bySlug, fmtSlot } from "../data/events.js";
import { FEST, dayLabel } from "../data/fest.js";
import Art from "../components/Art.jsx";
import { pad2 } from "../components/misc.jsx";
import NotFound from "./NotFound.jsx";

function icsFor(e) {
  if (!FEST.start) return null;
  const base = new Date(FEST.start);
  const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Techfiesta//EN"];
  e.slots.forEach((s, k) => {
    const day = new Date(base); day.setDate(base.getDate() + s.day - 1);
    const [h, m] = s.start.split(":").map(Number); const st = new Date(day); st.setHours(h, m, 0, 0);
    const en = new Date(st); if (s.end) { const [eh, em] = s.end.split(":").map(Number); en.setHours(eh, em); } else en.setHours(h + 3);
    lines.push("BEGIN:VEVENT", `UID:${e.slug}-${k}@techfiesta`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(st)}`, `DTEND:${stamp(en)}`, `SUMMARY:${e.title} — ${FEST.name}`, `LOCATION:${FEST.host}`, "END:VEVENT");
  });
  lines.push("END:VCALENDAR");
  return URL.createObjectURL(new Blob([lines.join("\r\n")], { type: "text/calendar" }));
}

export default function EventDetail() {
  const { slug } = useParams();
  const e = bySlug(slug);
  const root = useRef(null);
  const { back } = useApp();
  const navigate = useNavigate();

  // keyboard: ← → walk the wall, Esc goes back
  useEffect(() => {
    if (!e) return;
    const key = (ev) => {
      if (ev.target.closest("input,textarea,select")) return;
      if (ev.key === "ArrowRight") navigate(`/events/${EVENTS[(e.index + 1) % EVENTS.length].slug}`, { replace: true });
      if (ev.key === "ArrowLeft") navigate(`/events/${EVENTS[(e.index - 1 + EVENTS.length) % EVENTS.length].slug}`, { replace: true });
      if (ev.key === "Escape") back("/events");
    };
    addEventListener("keydown", key);
    return () => removeEventListener("keydown", key);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!e) return;
    world?.setMode({ type: "focus", index: e.index, side: -1, label: `Nº ${e.no} · ${e.short || e.title}` });
    if (reduceMotion) return;
    const t = gsap.fromTo(root.current.querySelectorAll(".rise"), { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: "expo.out", stagger: 0.06, delay: 0.25 });
    return () => t.kill();
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!e) return <NotFound />;
  const prev = EVENTS[(e.index - 1 + EVENTS.length) % EVENTS.length];
  const next = EVENTS[(e.index + 1) % EVENTS.length];
  const ics = icsFor(e);
  const facts = [
    ["Kind", e.category],
    ["When", e.slots.map((s) => `Day ${pad2(s.day)}${s.label ? ` (${s.label})` : ""} · ${dayLabel(s.day)}`).join("\n")],
    ["Time", e.slots.map((s) => fmtSlot(s)).join("\n")],
    ["Hosted with", e.by],
    ["Team", e.team ? `${e.team[0]}–${e.team[1]} per team` : "Announced with registration"],
    ["Venue", FEST.host]
  ];

  return (
    <div className="page detail" ref={root} key={slug}>
      <div className="detail__stage" aria-hidden="true">
        <p className="detail__caption mono rise">Nº {e.no} — {30 + e.index * 24} m into the tesseract</p>
      </div>
      <article className="detail__panel" data-ui>
        <div className="detail__top rise">
          <button className="backbtn mono" onClick={() => back("/events")} data-cursor="Back"><span aria-hidden="true">←</span> Back</button>
          <div className="walk mono" aria-label="Walk the wall">
            {EVENTS.map((x) => <TLink key={x.slug} to={`/events/${x.slug}`} curtain={false} replace="true" className={x.slug === slug ? "is-on" : ""} aria-label={x.title} aria-current={x.slug === slug ? "page" : undefined}>{x.no}</TLink>)}
          </div>
        </div>
        <nav className="crumbs mono rise" aria-label="Breadcrumb"><TLink to="/events">Exhibits</TLink><span>/</span><TLink to={`/events?kind=${e.category}`}>{e.category}</TLink><span>/</span><span aria-current="page">{e.short || e.title}</span></nav>
        <p className="mono acc rise">Exhibit Nº {e.no} — {e.pdx}</p>
        <h1 className="detail__title rise">{e.title}</h1>
        <p className="detail__koan rise">{e.koan}</p>
        <div className="detail__actions rise">
          <TLink to={`/register?event=${e.slug}`} className="btn btn--solid mono" data-cursor="Go">Register for this <i>→</i></TLink>
          {ics ? <a className="btn btn--ghost mono" href={ics} download={`${e.slug}.ics`}>Add to calendar</a> : <span className="btn btn--ghost btn--off mono" title="Dates not announced yet">Calendar · dates TBA</span>}
        </div>

        <dl className="facts rise">{facts.map(([k, v]) => <div key={k}><dt className="mono">{k}</dt><dd>{v}</dd></div>)}</dl>
        {e.eligibility && <p className="tag-note mono rise">Eligibility · {e.eligibility}</p>}

        <section className="detail__sec rise">
          <h2 className="mono eyebrow">The event</h2>
          <p className="detail__desc">{e.desc}</p>
        </section>

        {e.games && (
          <section className="detail__sec rise">
            <h2 className="mono eyebrow">Tournaments</h2>
            <ul className="games">{e.games.map((g) => <li key={g.name}><b>{g.name}</b><span className="mono">{g.note}</span><span className="mono">{g.cap ? `Max ${g.cap}` : "Open"}</span></li>)}</ul>
          </section>
        )}

        <section className="detail__sec detail__pdx rise">
          <div className="detail__art"><Art k={e.art} /></div>
          <div>
            <h2 className="mono eyebrow">The paradox — {e.pdx}</h2>
            <p>{e.about}</p>
          </div>
        </section>

        <section className="detail__sec rise">
          <h2 className="mono eyebrow">Good to know</h2>
          <ul className="know">
            <li>Rules, rounds and prizes are published with registration.</li>
            <li>Timings are carried over from the last edition and may shift.</li>
            <li>Bring your college ID. Team leaders register for the whole team.</li>
          </ul>
        </section>

        <p className="mono tiny rise">Tip: ← → walks the wall · Esc goes back</p>
        <nav className="pager rise" aria-label="Other exhibits">
          <TLink to={`/events/${prev.slug}`} curtain={false} className="pager__a" data-cursor="Prev"><span className="mono">← Nº {prev.no}</span><b>{prev.short || prev.title}</b></TLink>
          <TLink to={`/events/${next.slug}`} curtain={false} className="pager__a pager__a--next" data-cursor="Next"><span className="mono">Nº {next.no} →</span><b>{next.short || next.title}</b></TLink>
        </nav>
      </article>
    </div>
  );
}
