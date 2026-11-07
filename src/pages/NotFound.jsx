import { useEffect } from "react";
import { TLink, useWorldMode, world } from "../lib/app.jsx";

export default function NotFound() {
  useWorldMode({ type: "ambient", place: "broken", label: "404" });
  useEffect(() => { world?.breakApart(true); return () => world?.breakApart(false); }, []);
  return (
    <div className="page notfound">
      <div className="nf" data-ui>
        <p className="mono eyebrow">Error 404 · a paradox</p>
        <h1 className="page-title">This page exists<br /><em className="acc-i">and doesn’t.</em></h1>
        <p className="page-lead">You found the one angle where nothing lines up. Try another.</p>
        <div className="nf__links"><TLink to="/" className="btn btn--solid mono">Back to the surface <i>→</i></TLink><TLink to="/events" className="btn btn--ghost mono">See the exhibits</TLink></div>
      </div>
    </div>
  );
}
