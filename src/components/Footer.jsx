import { TLink, useApp } from "../lib/app.jsx";
import { FEST } from "../data/fest.js";

export default function Footer() {
  const { lenis } = useApp();
  return (
    <footer className="footer" data-ui>
      <div className="footer__cta">
        <p className="mono eyebrow">Seats are limited. So is time.</p>
        <TLink to="/register" className="footer__big" data-cursor="Go">
          <span className="roll"><span className="roll__a">Register</span><span className="roll__b" aria-hidden="true">Don’t. (Do.)</span></span>
        </TLink>
      </div>
      <div className="footer__cols">
        <div>
          <p className="mono eyebrow">Write to us</p>
          <a className="footer__mail" href={`mailto:${FEST.email}`}>{FEST.email}</a>
        </div>
        <div className="mono footer__links">
          <p>Explore</p>
          <TLink to="/events">Exhibits</TLink><TLink to="/schedule">Schedule</TLink><TLink to="/register">Register</TLink><TLink to="/about">About</TLink><TLink to="/sponsors">Sponsors</TLink><TLink to="/contact">Contact & FAQ</TLink>
        </div>
        <div className="mono footer__links">
          <p>Follow</p>
          {FEST.socials.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer">{s.label} ↗</a>)}
        </div>
        <div className="mono footer__links">
          <p>Visit</p>
          <span>{FEST.host}</span><span>{FEST.city}</span>
        </div>
      </div>
      <div className="footer__word" aria-hidden="true">{FEST.name}</div>
      <div className="footer__bottom mono">
        <span>© {FEST.edition} {FEST.name}, formerly {FEST.formerly}. Built by the technical team.</span>
        <button className="footer__top" onClick={() => lenis.scrollTo(0, { duration: 2.2 })}>Back to the surface ↑</button>
      </div>
    </footer>
  );
}
