import { useRef, useState } from "react";
import gsap from "gsap";
import { useWorldMode, TLink, reduceMotion } from "../lib/app.jsx";
import { FEST } from "../data/fest.js";
import { Reveal, SplitTitle } from "../components/misc.jsx";
import { FAQ as FAQS } from "../data/faq.js";

const FAQ = FAQS.map((f) => [f.q, f.a]);


function Item({ q, a, i }) {
  const [open, setOpen] = useState(false);
  const body = useRef(null);
  const toggle = () => {
    const el = body.current, next = !open;
    setOpen(next);
    if (reduceMotion) { el.style.height = next ? "auto" : "0px"; return; }
    gsap.fromTo(el, { height: next ? 0 : el.offsetHeight }, { height: next ? "auto" : 0, duration: 0.45, ease: "power3.inOut" });
  };
  return (
    <div className={`faq__item ${open ? "is-open" : ""}`}>
      <h3><button aria-expanded={open} aria-controls={`faq-${i}`} onClick={toggle}><span className="mono">0{i + 1}</span>{q}<i aria-hidden="true">+</i></button></h3>
      <div className="faq__body" id={`faq-${i}`} ref={body} role="region"><p>{a}</p></div>
    </div>
  );
}

export default function Contact() {
  useWorldMode({ type: "ambient", place: "broken", label: "Taken apart" });
  const [m, setM] = useState({ name: "", topic: "General", msg: "" });
  const mailto = `mailto:${FEST.email}?subject=${encodeURIComponent(`[${m.topic}] from ${m.name || "a curious person"}`)}&body=${encodeURIComponent(m.msg)}`;
  return (
    <div className="page contact">
      <header className="page-head">
        <p className="mono eyebrow">Contact & FAQ</p>
        <SplitTitle text="Ask anything. We answer most things." className="page-title" accent={["most"]} />
      </header>

      <section className="slab slab--split" data-ui>
        <div className="faq">
          <p className="mono eyebrow">Frequently asked</p>
          {FAQ.map(([q, a], i) => <Item key={q} q={q} a={a} i={i} />)}
        </div>
        <aside className="contact__side">
          <Reveal className="contact__card">
            <p className="mono eyebrow">Write to us</p>
            <a className="contact__mail" href={`mailto:${FEST.email}`}>{FEST.email}</a>
            <div className="mono contact__socials">{FEST.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer">{s.label} ↗</a>)}</div>
          </Reveal>
          <Reveal as="form" className="contact__form" onSubmit={(e) => { e.preventDefault(); location.href = mailto; }}>
            <p className="mono eyebrow">Or start an email here</p>
            <label className="field"><span>Your name</span><input value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} autoComplete="name" /></label>
            <label className="field"><span>About</span><select value={m.topic} onChange={(e) => setM({ ...m, topic: e.target.value })}>{["General", "Events", "Registration", "Sponsorship", "Volunteering"].map((t) => <option key={t}>{t}</option>)}</select></label>
            <label className="field"><span>Message</span><textarea rows={5} value={m.msg} onChange={(e) => setM({ ...m, msg: e.target.value })} /></label>
            <button className="btn btn--solid mono" type="submit">Open in my mail app →</button>
            <p className="mono tiny">This opens your own email app with the message filled in.</p>
          </Reveal>
          <Reveal className="contact__card">
            <p className="mono eyebrow">Find us</p>
            <p className="contact__place">{FEST.host}<br />{FEST.city}</p>
            <TLink to="/schedule" className="link">See when to come →</TLink>
          </Reveal>
        </aside>
      </section>
    </div>
  );
}
