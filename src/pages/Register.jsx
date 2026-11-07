import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import gsap from "gsap";
import { TLink, useWorldMode, reduceMotion, lenis } from "../lib/app.jsx";
import { EVENTS, fmtSlot } from "../data/events.js";
import { FEST, dayLabel } from "../data/fest.js";
import { pad2 } from "../components/misc.jsx";

/* Front-end only: this walks through the whole flow and validates it, but sends nothing.
   Wire `submit()` to the real endpoint when registration opens. */
const DRAFT = "tf-register-draft";
const STEPS = ["Events", "You", "Team", "Review"];
const blank = { events: [], games: [], name: "", email: "", phone: "", campus: "", program: "", year: "", team: "", members: [] };
const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "Postgraduate"];

function load() { try { return { ...blank, ...JSON.parse(localStorage.getItem(DRAFT) || "{}") }; } catch { return blank; } }
function save(v) { try { localStorage.setItem(DRAFT, JSON.stringify(v)); } catch { /* storage unavailable: drafts just aren't kept */ } }

export default function Register() {
  useWorldMode({ type: "ambient", place: "top", label: "The top" });
  const [params] = useSearchParams();
  const [f, setF] = useState(() => {
    const d = load(); const pre = params.get("event");
    if (pre && EVENTS.some((e) => e.slug === pre) && !d.events.includes(pre)) d.events = [...d.events, pre];
    return d;
  });
  const [step, setStep] = useState(0);
  const [tried, setTried] = useState(false);
  const [done, setDone] = useState(null);
  const panel = useRef(null);

  useEffect(() => { save(f); }, [f]);
  useEffect(() => {
    if (reduceMotion || !panel.current) return;
    gsap.fromTo(panel.current.querySelectorAll(".step-in"), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", stagger: 0.04 });
  }, [step, done]);

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));
  const toggle = (slug) => setF((v) => ({ ...v, events: v.events.includes(slug) ? v.events.filter((s) => s !== slug) : [...v.events, slug] }));
  const maxTeam = useMemo(() => Math.max(1, ...f.events.map((s) => EVENTS.find((e) => e.slug === s)?.team?.[1] || 4)), [f.events]);

  const errors = useMemo(() => {
    const e = {};
    if (step === 0 && !f.events.length) e.events = "Pick at least one event.";
    if (step === 0 && f.events.includes("tech-arena") && !f.games.length) e.games = "Pick at least one Tech Arena tournament.";
    if (step === 1) {
      if (f.name.trim().length < 2) e.name = "Your full name, please.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) e.email = "That email doesn’t look right.";
      if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10))) e.phone = "A 10-digit Indian mobile number.";
      if (!f.campus) e.campus = "Which campus are you from?";
      if (!f.year) e.year = "Pick your year.";
      if (f.events.includes("aspire-quest") && f.year && f.year !== "3rd year") e.year = "Aspire Quest is for third-year students only.";
    }
    if (step === 2) {
      if (f.members.length && !f.team.trim()) e.team = "Give your team a name.";
      f.members.forEach((m, i) => { if (!m.name.trim()) e[`m${i}`] = "Name required."; });
    }
    return e;
  }, [f, step]);
  const ok = !Object.keys(errors).length;
  const err = (k) => tried && errors[k] ? <span className="field__err" role="alert">{errors[k]}</span> : null;

  const next = () => {
    setTried(true);
    if (!ok) return;
    setTried(false);
    if (step < 3) { setStep(step + 1); lenis.scrollTo(0, { duration: 0.8 }); return; }
    // submit — no backend yet, so we only build the pass locally
    const id = "TF26-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    setDone({ id, ...f });
    try { localStorage.removeItem(DRAFT); } catch { /* ignore */ }
  };

  if (done) return (
    <div className="page register">
      <div className="reg reg--done" ref={panel} data-ui>
        <p className="mono eyebrow step-in">You’re in. Probably.</p>
        <h1 className="page-title step-in">See you at the <em className="acc-i">bottom.</em></h1>
        <div className="pass step-in" aria-label="Your pass">
          <div className="pass__l">
            <span className="pass__mark" aria-hidden="true"><i /><i /><i /></span>
            <p className="mono">{FEST.name} ’{FEST.edition.slice(2)} · {FEST.theme}</p>
            <b className="pass__name">{done.name}</b>
            <p className="mono">{done.campus} · {done.year}</p>
            <ul>{done.events.map((s) => <li key={s}>{EVENTS.find((e) => e.slug === s).short || EVENTS.find((e) => e.slug === s).title}</li>)}</ul>
          </div>
          <div className="pass__r">
            <span className="mono">Pass</span><b>{done.id}</b>
            <span className="mono">{done.team || "Solo"}</span>
          </div>
        </div>
        <p className="reg__preview mono step-in">Preview build — this form doesn’t send anything yet. When registration opens, it will.</p>
        <div className="reg__nav step-in"><TLink to="/events" className="btn btn--ghost mono">Back to the exhibits</TLink><button className="btn btn--solid mono" onClick={() => { setDone(null); setStep(0); setF(blank); }}>Register someone else</button></div>
      </div>
    </div>
  );

  return (
    <div className="page register">
      <header className="page-head page-head--tight">
        <p className="mono eyebrow">Registration · {FEST.name} ’{FEST.edition.slice(2)}</p>
        <h1 className="page-title">One form.<br /><em className="acc-i">Every room.</em></h1>
      </header>

      <div className="reg" ref={panel} data-ui>
        <ol className="steps" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "is-on" : i < step ? "is-done" : ""}>
              <button disabled={i > step} onClick={() => i < step && setStep(i)} aria-current={i === step ? "step" : undefined}>
                <span className="mono">{pad2(i + 1)}</span>{s}
              </button>
            </li>
          ))}
          <span className="steps__bar" style={{ transform: `scaleX(${(step + 1) / STEPS.length})` }} aria-hidden="true" />
        </ol>

        {step === 0 && (
          <fieldset className="reg__body">
            <legend className="step-in">Which rooms are you walking into?</legend>
            <p className="reg__hint step-in">Pick as many as you like — just watch for clashes on the same day.</p>
            {[1, 2, 3].map((d) => (
              <div key={d} className="pick-day step-in">
                <p className="mono">Day {pad2(d)} · {dayLabel(d)}</p>
                <div className="picks">
                  {EVENTS.filter((e) => e.slots.some((s) => s.day === d) && e.slots[0].day === d).map((e) => {
                    const on = f.events.includes(e.slug);
                    return (
                      <label key={e.slug} className={`pick ${on ? "is-on" : ""}`}>
                        <input type="checkbox" checked={on} onChange={() => toggle(e.slug)} />
                        <span className="pick__box" aria-hidden="true">{on ? "✓" : ""}</span>
                        <span className="pick__t"><b>{e.short || e.title}</b><span className="mono">{fmtSlot(e.slots[0])} · {e.category}</span></span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {err("events")}
            {f.events.includes("tech-arena") && (
              <div className="pick-day step-in">
                <p className="mono">Tech Arena · tournaments</p>
                <div className="chips">
                  {EVENTS.find((e) => e.slug === "tech-arena").games.map((g) => {
                    const on = f.games.includes(g.name);
                    return <button type="button" key={g.name} className={`chip chip--light ${on ? "is-on" : ""}`} aria-pressed={on} onClick={() => setF((v) => ({ ...v, games: on ? v.games.filter((x) => x !== g.name) : [...v.games, g.name] }))}>{g.name}<span>{g.note}</span></button>;
                  })}
                </div>
                {err("games")}
              </div>
            )}
          </fieldset>
        )}

        {step === 1 && (
          <fieldset className="reg__body grid2">
            <legend className="step-in">Tell us who’s coming.</legend>
            <label className="field step-in"><span>Full name</span><input value={f.name} onChange={set("name")} autoComplete="name" />{err("name")}</label>
            <label className="field step-in"><span>Email</span><input type="email" value={f.email} onChange={set("email")} autoComplete="email" />{err("email")}</label>
            <label className="field step-in"><span>Mobile</span><input type="tel" inputMode="numeric" value={f.phone} onChange={set("phone")} autoComplete="tel" placeholder="98xxxxxxxx" />{err("phone")}</label>
            <label className="field step-in"><span>NMIMS campus</span><select value={f.campus} onChange={set("campus")}><option value="">Choose…</option>{FEST.campuses.map((c) => <option key={c}>{c}</option>)}</select>{err("campus")}</label>
            <label className="field step-in"><span>Programme</span><input value={f.program} onChange={set("program")} placeholder="B.Tech CSE, MBA Tech…" /></label>
            <label className="field step-in"><span>Year</span><select value={f.year} onChange={set("year")}><option value="">Choose…</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select>{err("year")}</label>
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="reg__body">
            <legend className="step-in">Bringing a crew?</legend>
            <p className="reg__hint step-in">Only the team leader registers. Add up to {maxTeam - 1} teammate{maxTeam - 1 === 1 ? "" : "s"}, or skip this if you’re going solo.</p>
            <label className="field step-in"><span>Team name {f.members.length ? "" : "(optional)"}</span><input value={f.team} onChange={set("team")} placeholder="The Tortoises" />{err("team")}</label>
            {f.members.map((m, i) => (
              <div className="member step-in" key={i}>
                <span className="mono">{pad2(i + 2)}</span>
                <label className="field"><span>Teammate name</span><input value={m.name} onChange={(e) => setF((v) => ({ ...v, members: v.members.map((x, k) => k === i ? { ...x, name: e.target.value } : x) }))} />{err(`m${i}`)}</label>
                <label className="field"><span>Email (optional)</span><input type="email" value={m.email} onChange={(e) => setF((v) => ({ ...v, members: v.members.map((x, k) => k === i ? { ...x, email: e.target.value } : x) }))} /></label>
                <button type="button" className="member__x" aria-label={`Remove teammate ${i + 2}`} onClick={() => setF((v) => ({ ...v, members: v.members.filter((_, k) => k !== i) }))}>✕</button>
              </div>
            ))}
            {f.members.length < maxTeam - 1 && <button type="button" className="btn btn--dash mono step-in" onClick={() => setF((v) => ({ ...v, members: [...v.members, { name: "", email: "" }] }))}>+ Add a teammate</button>}
          </fieldset>
        )}

        {step === 3 && (
          <div className="reg__body">
            <p className="legend step-in">Last look.</p>
            <dl className="review step-in">
              <div><dt className="mono">Events</dt><dd>{f.events.map((s) => EVENTS.find((e) => e.slug === s)).map((e) => e.short || e.title).join(", ")}{f.games.length ? ` (${f.games.join(", ")})` : ""}</dd><button className="link" onClick={() => setStep(0)}>Edit</button></div>
              <div><dt className="mono">You</dt><dd>{f.name} · {f.email} · {f.phone}<br />{f.campus}{f.program ? ` · ${f.program}` : ""} · {f.year}</dd><button className="link" onClick={() => setStep(1)}>Edit</button></div>
              <div><dt className="mono">Team</dt><dd>{f.members.length ? `${f.team} — you + ${f.members.map((m) => m.name).join(", ")}` : "Solo"}</dd><button className="link" onClick={() => setStep(2)}>Edit</button></div>
            </dl>
            <p className="reg__preview mono step-in">Preview build — submitting creates your pass on this screen only. Nothing is sent anywhere yet.</p>
          </div>
        )}

        <div className="reg__nav">
          {step > 0 ? <button className="btn btn--ghost mono" onClick={() => { setTried(false); setStep(step - 1); }}>← Back</button> : <span />}
          <button className="btn btn--solid mono" onClick={next} data-cursor="Go">{step < 3 ? `Next: ${STEPS[step + 1]} →` : "Get my pass →"}</button>
        </div>
      </div>
    </div>
  );
}
