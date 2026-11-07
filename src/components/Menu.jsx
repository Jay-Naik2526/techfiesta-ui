import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useLocation } from "react-router-dom";
import { TLink, lenis, reduceMotion } from "../lib/app.jsx";
import { FEST } from "../data/fest.js";
import { EVENTS } from "../data/events.js";
import Countdown from "./Countdown.jsx";
import Art from "./Art.jsx";

const ITEMS = [
  ["/", "Home", "The impossible object, and the way down."],
  ["/events", "Exhibits", `${EVENTS.length} rooms. Every event is a paradox.`],
  ["/schedule", "Schedule", "Three days, hour by hour."],
  ["/register", "Register", "Pick your events. Bring your team."],
  ["/about", "About", "From Ambiora to Techfiesta."],
  ["/sponsors", "Sponsors", "Put your name on an impossible object."],
  ["/contact", "Contact", "Questions, answers, and an email address."]
];

export default function Menu({ open, onClose }) {
  const root = useRef(null);
  const { pathname } = useLocation();
  const [hover, setHover] = useState(0);
  const pick = EVENTS[(hover * 3) % EVENTS.length];

  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = root.current;
    if (open) { lenis.stop(); el.style.visibility = "visible"; }
    const d = reduceMotion ? 0 : 1;
    gsap.to(el, {
      clipPath: open ? "circle(150% at calc(100% - 60px) 36px)" : "circle(0% at calc(100% - 60px) 36px)",
      duration: (open ? 0.9 : 0.6) * d, ease: "expo.inOut",
      onComplete: () => { if (!open) { el.style.visibility = "hidden"; lenis.start(); } }
    });
    if (open) gsap.fromTo(el.querySelectorAll(".menu__item"), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.9 * d, ease: "expo.out", stagger: 0.05, delay: 0.25 * d });
    const esc = (e) => e.key === "Escape" && open && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="menu" id="menu" ref={root} aria-hidden={!open} data-ui>
      <div className="menu__grid">
        <ol className="menu__list">
          {ITEMS.map(([to, label, sub], i) => (
            <li key={to} className="menu__row" onMouseEnter={() => setHover(i)}>
              <TLink to={to} className={`menu__item ${pathname === to ? "is-active" : ""}`} tabIndex={open ? 0 : -1}>
                <span className="menu__no mono">0{i + 1}</span>
                <span className="menu__label">{label}</span>
                <span className="menu__sub mono">{sub}</span>
              </TLink>
            </li>
          ))}
        </ol>
        <aside className="menu__side">
          <div className="menu__preview">
            <div className="menu__art"><Art k={pick.art} /></div>
            <p className="mono"><span className="acc">{pick.pdx}</span> · {pick.short || pick.title}</p>
          </div>
          <div className="menu__meta">
            <Countdown compact />
            <a className="menu__mail" href={`mailto:${FEST.email}`} tabIndex={open ? 0 : -1}>{FEST.email}</a>
            <div className="menu__socials mono">{FEST.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>{s.label} ↗</a>)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
