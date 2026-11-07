import { useEffect, useState } from "react";
import { FEST } from "../data/fest.js";
import { pad2 } from "./misc.jsx";

/* Counts down to FEST.start. Until a date is set, it says so instead of inventing one. */
export default function Countdown({ compact = false }) {
  const target = FEST.start ? new Date(FEST.start).getTime() : null;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!target) return; const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, [target]);

  if (!target) return (
    <div className={`countdown is-tba ${compact ? "is-compact" : ""}`}>
      <span className="countdown__dot" /><span className="mono">Dates drop soon</span>
      {!compact && <span className="countdown__sub mono">Follow the socials — they hear first</span>}
    </div>
  );
  const diff = Math.max(0, target - now);
  if (diff === 0) return <div className={`countdown ${compact ? "is-compact" : ""}`}><span className="countdown__dot" /><span className="mono">Happening now</span></div>;
  const parts = [["Days", Math.floor(diff / 864e5)], ["Hrs", Math.floor(diff / 36e5) % 24], ["Min", Math.floor(diff / 6e4) % 60], ["Sec", Math.floor(diff / 1e3) % 60]];
  return (
    <div className={`countdown ${compact ? "is-compact" : ""}`} aria-label="Time until the fest">
      {parts.map(([l, v]) => <div className="countdown__cell" key={l}><b>{pad2(v)}</b><span className="mono">{l}</span></div>)}
    </div>
  );
}
