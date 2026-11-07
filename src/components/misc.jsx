/* Small shared pieces. */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ART } from "../data/art.js";
import { reduceMotion } from "../lib/app.jsx";

export function Reveal({ as: Tag = "div", children, className = "", delay = 0, y = 40, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    if (reduceMotion) return;
    const t = gsap.fromTo(ref.current, { y, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, delay, ease: "expo.out", scrollTrigger: { trigger: ref.current, start: "top 90%", once: true } });
    return () => { t.scrollTrigger?.kill(); t.kill(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}

/* Splits a heading into lines of words that rise into place. */
export function SplitTitle({ as: Tag = "h1", text, className = "", delay = 0.1, accent }) {
  const ref = useRef(null);
  useEffect(() => {
    if (reduceMotion) return;
    const words = ref.current.querySelectorAll(".sw > span");
    const t = gsap.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.05, delay });
    return () => t.kill();
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i}><span className="sw" aria-hidden="true"><span className={accent && accent.some((a) => a.replace(/[.,]/g, "") === w.replace(/[.,]/g, "")) ? "acc-i" : ""}>{w}</span></span>{" "}</span>
      ))}
    </Tag>
  );
}

export const pad2 = (n) => String(n).padStart(2, "0");
export { ART };
