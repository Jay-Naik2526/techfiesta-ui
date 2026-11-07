import { useEffect, useRef } from "react";
import gsap from "gsap";
import { world, lenis, reduceMotion } from "../lib/app.jsx";
import { FEST } from "../data/fest.js";

/* Zeno's loader: every step covers half the remaining distance, so it never reaches 100. */
export default function Loader({ onDone }) {
  const root = useRef(null), num = useRef(null), bar = useRef(null), note = useRef(null);

  useEffect(() => {
    let alive = true;
    const zeno = new Promise((res) => {
      if (reduceMotion) return res();
      const tl = gsap.timeline({ onComplete: res }), o = { v: 0 };
      let d = 0.45;
      [50, 75, 87.5, 93.8, 96.9, 98.4, 99.2, 99.6, 99.8, 99.9].forEach((v, i) => {
        tl.to(o, { v, duration: d, ease: "power3.out", onUpdate() { if (num.current) { num.current.textContent = o.v.toFixed(1); bar.current.style.transform = `scaleX(${o.v / 100})`; } } });
        if (i === 4) tl.call(() => note.current && (note.current.textContent = "Still going. It never quite arrives."));
        d *= 0.82;
      });
      tl.call(() => note.current && (note.current.textContent = "Close enough. Look closely.")).to({}, { duration: 0.45 });
    });
    const fonts = Promise.all([
      document.fonts.load("400 100px 'Instrument Serif'"), document.fonts.load("italic 400 100px 'Instrument Serif'"),
      document.fonts.load("500 20px 'DM Mono'"), document.fonts.load("400 20px 'Familjen Grotesk'")
    ]).catch(() => {});
    const baked = fonts.then(() => world?.bake()).catch((e) => console.warn("bake", e));

    Promise.all([zeno, baked]).then(() => {
      if (!alive) return;
      // the gate: choose how to enter
      if (note.current) note.current.textContent = "Ready.";
      gsap.to(root.current.querySelector(".loader__count"), { opacity: 0, y: -20, duration: 0.6, ease: "power3.inOut" });
      const gate = root.current.querySelector(".gate");
      gate.style.display = "flex";
      gsap.fromTo(gate.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.08, delay: 0.3 });
      // the world appears underneath the film as it ends: a dissolve from footage into the real-time tesseract
      let finished = false;
      const finish = (withSound) => {
        if (finished) return; finished = true;
        document.documentElement.classList.add("is-ready");
        lenis.start();
        if (withSound) document.dispatchEvent(new CustomEvent("tf-sound", { detail: true }));
        world?.assemble({ rewind: location.pathname === "/" });   // home opens with the rewind through the tesseract
        gsap.to(root.current, { opacity: 0, duration: 1.8, ease: "power2.inOut", onComplete: () => root.current && (root.current.style.display = "none") });
        onDone();
      };
      const enter = (withSound) => {
        gsap.to(gate, { opacity: 0, duration: 0.4, onComplete: () => (gate.style.display = "none") });
        finish(withSound);
      };
      gate.querySelector("[data-sound]").onclick = () => enter(true);
      gate.querySelector("[data-silent]").onclick = () => enter(false);
    });
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="loader" ref={root}>
      <div className="loader__top mono"><span>{FEST.name} ’{FEST.edition.slice(2)} · {FEST.theme}</span><span>Building an impossible object</span></div>
      <div className="loader__stage">
        <div className="loader__count"><span ref={num}>0.0</span><i>%</i></div>
        <p className="loader__note mono" ref={note}>Every step covers half the remaining distance.</p>
      </div>
      <div className="gate" style={{ display: "none" }}>
        <button className="gate__btn gate__btn--main" data-sound><span className="gate__eq" aria-hidden="true"><i /><i /><i /><i /></span>Enter with sound</button>
        <button className="gate__btn" data-silent>Enter in silence</button>
        <p className="gate__note mono">Headphones recommended</p>
      </div>
      <div className="loader__bar"><span ref={bar} /></div>
    </div>
  );
}
