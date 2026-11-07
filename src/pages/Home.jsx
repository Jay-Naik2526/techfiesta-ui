import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TLink, world, reduceMotion, lenis } from "../lib/app.jsx";
import { STOP } from "../world/World.js";
import { EVENTS, fmtSlot } from "../data/events.js";
import { FEST, dayLabel } from "../data/fest.js";
import Countdown from "../components/Countdown.jsx";
import Rooms from "../components/Rooms.jsx";
import { pad2 } from "../components/misc.jsx";

const smooth = (x) => x * x * (3 - 2 * x);
const clamp = (v) => Math.min(1, Math.max(0, v));

export default function Home({ ready }) {
  const root = useRef(null);
  const [hint, setHint] = useState("Watch them climb forever · Hold to take it apart");

  /* scroll position → camera stop */
  useEffect(() => {
    if (!world) return;
    let anchors = [];
    const measure = () => {
      anchors = [...root.current.querySelectorAll("[data-stop]")].map((el) => ({
        stop: +el.dataset.stop,
        y: Math.max(0, el.getBoundingClientRect().top + scrollY + el.offsetHeight / 2 - innerHeight / 2)
      })).sort((a, b) => a.y - b.y);
    };
    world.stopSource = () => {
      const y = scrollY;
      if (!anchors.length || y <= anchors[0].y) return 0;
      for (let k = 0; k < anchors.length - 1; k++) {
        const A = anchors[k], B = anchors[k + 1];
        if (y < B.y) return A.stop + (B.stop - A.stop) * smooth(clamp((y - A.y) / (B.y - A.y)));
      }
      return anchors[anchors.length - 1].stop;
    };
    world.setMode({ type: "journey" });
    measure();
    const ro = new ResizeObserver(measure); ro.observe(root.current);
    document.fonts?.ready.then(measure);
    return () => { ro.disconnect(); world.stopSource = () => world.sCur; };
  }, []);

  /* opening rewind: hold the page still, caption it, let any input skip it */
  const [rewinding, setRewinding] = useState(false);
  useEffect(() => {
    if (!world) return;
    const off = world.on("rewind", (on) => { setRewinding(on); on ? lenis.stop() : lenis.start(); });
    const skip = () => world.skipRewind();
    addEventListener("wheel", skip, { passive: true }); addEventListener("pointerdown", skip); addEventListener("keydown", skip); addEventListener("touchstart", skip, { passive: true });
    return () => { off(); removeEventListener("wheel", skip); removeEventListener("pointerdown", skip); removeEventListener("keydown", skip); removeEventListener("touchstart", skip); };
  }, []);

  /* hold to take the triangle apart */
  useEffect(() => {
    const down = (e) => {
      if (!world || world.sCur > 0.6 || e.target.closest("a,button,[data-ui]")) return;
      world.breakApart(true); setHint("Three ordinary beams. Let go.");
    };
    const up = () => { if (world && world.broken > 0.01) { world.breakApart(false); setHint("Watch them climb forever · Hold to take it apart"); } };
    addEventListener("pointerdown", down); addEventListener("pointerup", up);
    return () => { removeEventListener("pointerdown", down); removeEventListener("pointerup", up); };
  }, []);

  /* overlay motion */
  useEffect(() => {
    if (!ready) return;
    const ctx = gsap.context(() => {
      // premise words light up as you read
      const words = root.current.querySelectorAll(".premise__text .w");
      if (!reduceMotion) gsap.to(words, { opacity: 1, ease: "none", stagger: 0.1, duration: 0.5, scrollTrigger: { trigger: ".premise__text", start: "top 80%", end: "bottom 45%", scrub: true } });
      const float = (el, trigger) => gsap.timeline({ scrollTrigger: { trigger, start: "top bottom", end: "bottom top", scrub: true } })
        .fromTo(el, { y: 90, opacity: 0 }, { y: 0, opacity: 1, ease: "none", duration: 0.32 })
        .to(el, { y: 0, opacity: 1, duration: 0.36 })
        .to(el, { y: -90, opacity: 0, ease: "none", duration: 0.32 });
      if (!reduceMotion) {
        root.current.querySelectorAll(".s-ex").forEach((s) => float(s.querySelector(".placard"), s));
        float(".dive__title", ".s-dive");
        float(".bottom__text", ".s-bottom");
        gsap.fromTo(".s-hero .hero__ui", { opacity: 1 }, { opacity: 0, ease: "none", scrollTrigger: { trigger: ".s-hero", start: "top top", end: "bottom 40%", scrub: true } });
        gsap.from(".s-hero .hero__ui > *", { y: 24, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1, delay: 1.6 });
      }
      root.current.querySelectorAll(".n").forEach((el) => {
        const to = +el.dataset.count, o = { v: 0 };
        if (reduceMotion) { el.textContent = to; return; }
        ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: "power3.out", onUpdate: () => (el.textContent = Math.round(o.v)) }) });
      });
      gsap.from(".plan__card", { y: 60, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: ".plan__cards", start: "top 85%", once: true } });
      gsap.from(".end__title, .end__cta, .end__sub", { y: 60, opacity: 0, stagger: 0.1, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".s-end", start: "top 35%", once: true } });
    }, root);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [ready]);

  const premise = "It only works from one angle. Walk around it and the staircase that climbs forever turns out to be thirty-two ordinary blocks. That is the whole fest: things that shouldn’t work, working anyway — for exactly as long as you look at them right. It was Ambiora. Now it is";

  return (
    <div className={`home ${rewinding ? "is-rewinding" : ""}`} ref={root}>
      <div className="rewind-cap mono" aria-live="polite">{rewinding && <><span className="rewind-cap__dot" />Rewinding through the tesseract <em>· click to skip</em></>}</div>
      {/* 0 · hero */}
      <section className="s s-hero" data-stop="0">
        <div className="hero__ui">
          <div className="hero__meta mono">
            <span>{FEST.tagline}</span>
            <span className="hide-sm">Formerly {FEST.formerly}</span>
            <span>Edition {FEST.edition}</span>
          </div>
          <div className="hero__bottom">
            <div className="hero__left">
              <h1 className="sr">{FEST.name} {FEST.edition} — {FEST.theme}</h1>
              <p className="hero__kicker mono">This year’s theme</p>
              <p className="hero__hint mono"><span className="dot" />{hint}</p>
            </div>
            <div className="hero__right">
              <Countdown compact />
              <a className="cue mono" href="#premise" onClick={(e) => { e.preventDefault(); document.querySelector(".s-premise").scrollIntoView({ behavior: "smooth" }); }}><span>Scroll</span><i /><span>to see the trick</span></a>
            </div>
          </div>
        </div>
      </section>

      {/* 1 · the trick */}
      <section className="s s-premise" id="premise" data-stop="1">
        <div className="premise__col">
          <p className="mono eyebrow">The premise</p>
          <p className="premise__text">
            {premise.split(" ").map((w, i) => <span className="w" key={i}>{w} </span>)}
            <em className="w">{FEST.name}.</em> <span className="w">Same ship, every plank replaced.</span>
          </p>
        </div>
      </section>


      {/* into the tesseract */}
      <section className="s s-dive" data-stop={STOP.descent}>
        <p className="mono eyebrow">Into the tesseract</p>
        <h2 className="dive__title"><span>{EVENTS.length} rooms.</span><span>Every one of them</span><em>is the same room.</em></h2>
      </section>

      {/* the rooms: pinned panel, camera walks the corridor */}
      <Rooms />

      {/* bottom */}
      <section className="s s-bottom" data-stop={STOP.bottom}>
        <p className="mono eyebrow">The far wall of the tesseract</p>
        <p className="bottom__text">
          <span className="n" data-count="3">0</span> days. <span className="n" data-count="15">0</span> events. <span className="n" data-count="7">0</span> clubs. <span className="n" data-count="24">0</span> hours of a hackathon that never sleeps. <span className="n" data-count="1">0</span> name, <em>changed.</em>
        </p>
      </section>

      {/* plan your visit — a solid slab over the world */}
      <section className="plan" data-ui>
        <div className="plan__head">
          <p className="mono eyebrow">Plan the three days</p>
          <h2>Pick a room.<br /><em>Any room.</em></h2>
          <Countdown />
        </div>
        <div className="plan__cards">
          <TLink to="/events" className="plan__card" data-cursor="Open">
            <span className="mono">01 — Exhibits</span><b>Browse all {EVENTS.length}</b><p>Filter by day, by kind, or by which paradox you like best.</p><i>→</i>
          </TLink>
          <TLink to="/schedule" className="plan__card" data-cursor="Open">
            <span className="mono">02 — Schedule</span><b>Hour by hour</b><p>See what clashes before it does. Timings are provisional.</p><i>→</i>
          </TLink>
          <TLink to="/register" className="plan__card plan__card--acc" data-cursor="Go">
            <span className="mono">03 — Register</span><b>Save your seat</b><p>One form, every event. Team leaders register for the crew.</p><i>→</i>
          </TLink>
        </div>
        <div className="partners">
          <p className="mono eyebrow">Partners</p>
          <div className="partners__row">{["Title partner", "Exhibit partner", "Exhibit partner", "Community partner"].map((t, i) => <div className="logo-slot logo-slot--light" key={i}><span className="mono">{t} — open</span></div>)}</div>
          <TLink to="/sponsors" className="link mono">Become a partner →</TLink>
        </div>
        <div className="marquee" aria-label="Open to every NMIMS campus">
          <div className="marquee__in">{[0, 1].map((k) => <span key={k}>{FEST.campuses.filter((c) => c !== "Other").map((c) => <span key={c}>{c}<b>/</b></span>)}</span>)}</div>
        </div>
      </section>

      {/* top */}
      <section className="s s-end" data-stop={STOP.top}>
        <p className="mono eyebrow">Look up.</p>
        <h2 className="end__title">The last step<br />is the <em>first.</em></h2>
        {/* the reveal moves the wrapper; the button's own transform belongs to the magnetic hover */}
        <div className="end__cta"><TLink to="/register" className="btn btn--solid btn--xl mono" data-cursor="Go">Register for {FEST.name} ’{FEST.edition.slice(2)} <i>→</i></TLink></div>
        <p className="end__sub">Teams of one to five. Only the team leader registers for the whole crew.</p>
      </section>
    </div>
  );
}
