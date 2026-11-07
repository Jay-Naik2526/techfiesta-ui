import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TLink, world } from "../lib/app.jsx";
import { sound } from "../lib/sound.js";
import { FEST } from "../data/fest.js";

const LINKS = [["/events", "Exhibits"], ["/schedule", "Schedule"], ["/about", "About"], ["/contact", "Contact"]];

export default function Nav({ ready, menuOpen, onMenu }) {
  const { pathname } = useLocation();
  const [snd, setSnd] = useState(false);
  useEffect(() => { const on = (e) => { setSnd(sound.toggle(e.detail)); }; document.addEventListener("tf-sound", on); return () => document.removeEventListener("tf-sound", on); }, []);
  useEffect(() => { if (sound.remembered()) { /* needs a gesture before audio can start */ const go = () => { setSnd(sound.toggle(true)); removeEventListener("pointerdown", go); }; addEventListener("pointerdown", go); return () => removeEventListener("pointerdown", go); } }, []);
  return (
    <header className={`nav ${ready ? "is-in" : ""} ${menuOpen ? "is-menu" : ""}`}>
      <TLink to="/" className="nav__brand" aria-label={`${FEST.name} home`}>
        <span className="nav__mark" aria-hidden="true"><i /><i /><i /></span>
        {FEST.name}<sup>’{FEST.edition.slice(2)}</sup>
      </TLink>
      <nav className="nav__links mono" aria-label="Primary">
        {LINKS.map(([to, label]) => (
          <TLink key={to} to={to} className={pathname.startsWith(to) ? "is-active" : ""}>{label}</TLink>
        ))}
      </nav>
      <div className="nav__right">
        <button className={`nav__sound mono ${snd ? "is-on" : ""}`} onClick={() => { const on = sound.toggle(); world?.setFilmSound(on); setSnd(on); }} aria-pressed={snd} aria-label={snd ? "Turn sound off" : "Turn sound on"}>
          <span className="bars" aria-hidden="true"><i /><i /><i /><i /></span><span className="hide-sm">{snd ? "Sound on" : "Sound off"}</span>
        </button>
        <TLink to="/register" className="nav__cta mono" data-cursor="Go">Register</TLink>
        <button className="nav__menu mono" onClick={onMenu} aria-expanded={menuOpen} aria-controls="menu">
          <span className="burger" aria-hidden="true"><i /><i /></span>{menuOpen ? "Close" : "Menu"}
        </button>
      </div>
    </header>
  );
}
