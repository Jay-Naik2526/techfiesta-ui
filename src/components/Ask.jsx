import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { FAQ, answer } from "../data/faq.js";
import { FEST } from "../data/fest.js";
import { TLink, reduceMotion } from "../lib/app.jsx";

/* "Have a question?" — instant answers from the FAQ, no backend. */
export default function Ask() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [thread, setThread] = useState([{ who: "tf", text: "Ask me anything about Techfiesta — dates, teams, venue, events." }]);
  const panel = useRef(null), input = useRef(null), list = useRef(null);

  useEffect(() => {
    const el = panel.current;
    if (open) { el.style.visibility = "visible"; setTimeout(() => input.current?.focus(), 200); }
    gsap.to(el, { opacity: open ? 1 : 0, y: open ? 0 : 20, scale: open ? 1 : 0.96, duration: reduceMotion ? 0 : 0.35, ease: "expo.out", onComplete: () => !open && (el.style.visibility = "hidden") });
    const esc = (e) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc); return () => removeEventListener("keydown", esc);
  }, [open]);
  useEffect(() => { list.current && (list.current.scrollTop = list.current.scrollHeight); }, [thread]);

  const ask = (text) => {
    if (!text.trim()) return;
    const hits = answer(text);
    setThread((t) => [...t, { who: "you", text }, hits.length
      ? { who: "tf", text: hits[0].a, more: hits.slice(1) }
      : { who: "tf", text: `Not sure about that one. Write to ${FEST.email} and a human will answer.` }]);
    setQ("");
  };

  return (
    <>
      <button className={`ask-btn ${open ? "is-open" : ""}`} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="ask" data-cursor={open ? "Close" : "Ask"}>
        <span className="mono hide-sm">Have a question?</span><b aria-hidden="true">{open ? "✕" : "?"}</b>
      </button>
      <section className="ask" id="ask" ref={panel} aria-label="Ask a question" data-ui role="dialog">
        <header className="ask__head"><span className="mono">Techfiesta · answers</span><TLink to="/contact" className="mono link" onClick={() => setOpen(false)}>All FAQs</TLink></header>
        <div className="ask__list" ref={list} aria-live="polite">
          {thread.map((m, i) => (
            <div key={i} className={`msg msg--${m.who}`}>
              <p>{m.text}</p>
              {m.more?.length > 0 && <div className="msg__more">{m.more.map((f) => <button key={f.q} onClick={() => ask(f.q)}>{f.q}</button>)}</div>}
            </div>
          ))}
        </div>
        {thread.length < 2 && <div className="ask__sugg">{FAQ.slice(0, 4).map((f) => <button key={f.q} className="mono" onClick={() => ask(f.q)}>{f.q}</button>)}</div>}
        <form className="ask__form" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="When is it? Do I need a team?" aria-label="Your question" />
          <button className="mono" type="submit" aria-label="Ask">→</button>
        </form>
      </section>
    </>
  );
}
