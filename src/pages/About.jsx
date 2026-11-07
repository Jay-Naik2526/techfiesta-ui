import { TLink, useWorldMode } from "../lib/app.jsx";
import { EVENTS } from "../data/events.js";
import { FEST } from "../data/fest.js";
import { Reveal, SplitTitle } from "../components/misc.jsx";
import Art from "../components/Art.jsx";

const CLUBS = [...new Set(EVENTS.map((e) => e.by).filter((b) => b !== "Techfiesta"))];
const RULES = [
  ["It only works from one angle.", "The triangle on the front page is three straight beams. Stand anywhere else and it falls apart. Most good ideas look like that at first."],
  ["Win by losing.", "Half of what you build this weekend won’t work. The half that does will be better because of it."],
  ["The bottom is the top.", "Go far enough down the shaft and you end up looking at the sky. Every event here is a way down."]
];

export default function About() {
  useWorldMode({ type: "ambient", place: "orbit", label: "The trick, from outside" });
  return (
    <div className="page about">
      <header className="page-head">
        <p className="mono eyebrow">About {FEST.name}</p>
        <SplitTitle text={`It was ${FEST.formerly}. Now it is ${FEST.name}.`} className="page-title" accent={[FEST.name]} />
        <p className="page-lead">Same people, same campus, a different word on the banner. This year the fest opens up to every NMIMS campus — and the theme is the oldest trick in the book.</p>
      </header>

      <section className="slab" data-ui>
        <Reveal className="story">
          <div className="story__art"><Art k="theseus" /></div>
          <div>
            <p className="mono eyebrow">Ship of Theseus</p>
            <h2>If you replace every plank of a ship, is it still the same ship?</h2>
            <p>{FEST.formerly} grew up as {FEST.host.replace(" Campus", "")}’s technical fest. For {FEST.edition}, it became {FEST.name}: an inter-NMIMS festival with one shared theme and fifteen events across three days. New name, every plank replaced, same ship.</p>
          </div>
        </Reveal>

        <div className="rules">
          {RULES.map(([h, p], i) => (
            <Reveal className="rule" key={h} delay={i * 0.08}>
              <span className="mono">0{i + 1}</span>
              <h3>{h}</h3>
              <p>{p}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="clubs">
          <p className="mono eyebrow">Hosted with</p>
          <ul>{CLUBS.map((c) => <li key={c}>{c}</li>)}</ul>
        </Reveal>

        <Reveal className="team-note">
          <p className="mono eyebrow">The team</p>
          <h2>The core team is announced with registration.</h2>
          <p>Want to help build the next one? <a className="link" href={`mailto:${FEST.email}?subject=Volunteering for ${FEST.name}`}>Write to us</a>.</p>
          <TLink to="/events" className="btn btn--solid mono">See the exhibits <i>→</i></TLink>
        </Reveal>
      </section>
    </div>
  );
}
