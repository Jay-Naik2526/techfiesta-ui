import { useWorldMode } from "../lib/app.jsx";
import { FEST } from "../data/fest.js";
import { EVENTS } from "../data/events.js";
import { Reveal, SplitTitle } from "../components/misc.jsx";

/* Partnership page. Tier names and benefits are a starting structure for the team to fill in —
   no real sponsor is listed until one signs. */
const TIERS = [
  { name: "Title partner", note: "One brand. The whole fest.", perks: ["“Techfiesta presented by” lockup on every page and the loader", "Naming of the shaft: your mark at the bottom of the pit", "Keynote slot and stall at the venue", "Logo on passes, merch and certificates"] },
  { name: "Exhibit partner", note: "Own a room.", perks: ["Name an exhibit — e.g. Code Vyuh 26, presented by you", "Your logo framed on that event’s wall in the 3D world", "Prize and judging involvement", "Social shout-outs for that event"] },
  { name: "Community partner", note: "For clubs, media and student brands.", perks: ["Logo in the partner strip site-wide", "Cross-promotion on socials", "Passes for your community"] }
];

export default function Sponsors() {
  useWorldMode({ type: "ambient", place: "orbit", label: "Partners" });
  const mail = `mailto:${FEST.email}?subject=${encodeURIComponent(`Sponsorship — ${FEST.name} ${FEST.edition}`)}`;
  return (
    <div className="page sponsors">
      <header className="page-head">
        <p className="mono eyebrow">Sponsors & partners</p>
        <SplitTitle text="Put your name on an impossible object." className="page-title" accent={["impossible", "object."]} />
        <p className="page-lead">Every NMIMS campus, three days, {EVENTS.length} exhibits and a 24-hour hackathon. Partner with {FEST.name} and your brand lives inside the world, not in a banner next to it.</p>
        <div><a className="btn btn--solid btn--xl mono" href={mail} data-cursor="Write">Ask for the deck <i>→</i></a></div>
      </header>

      <section className="slab" data-ui>
        <div className="tiers">
          {TIERS.map((t, i) => (
            <Reveal className={`tier ${i === 0 ? "tier--top" : ""}`} key={t.name} delay={i * 0.08}>
              <span className="mono">0{i + 1}</span>
              <h2>{t.name}</h2>
              <p className="tier__note">{t.note}</p>
              <ul>{t.perks.map((p) => <li key={p}>{p}</li>)}</ul>
              <a className={`btn ${i === 0 ? "btn--solid" : "btn--ghost"} mono`} href={mail}>Talk to us</a>
            </Reveal>
          ))}
        </div>
        <Reveal className="logo-wall">
          <p className="mono eyebrow">This edition’s partners</p>
          <div className="logo-wall__grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="logo-slot"><span className="mono">{i === 0 ? "Your logo — title" : "Your logo"}</span></div>)}</div>
          <p className="mono tiny">Partners are announced as they sign.</p>
        </Reveal>
      </section>
    </div>
  );
}
