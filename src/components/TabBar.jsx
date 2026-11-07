import { useLocation } from "react-router-dom";
import { TLink } from "../lib/app.jsx";

/* App-style bottom bar on phones. */
const TABS = [
  ["/", "Home", "M4 11 12 4l8 7v9h-5v-6H9v6H4z"],
  ["/events", "Exhibits", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"],
  ["/schedule", "Schedule", "M5 6h14v14H5zM5 10h14M9 3v5M15 3v5"],
  ["/register", "Register", "M12 4 21 20H3z"],
  ["/contact", "Help", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5v.01"]
];

export default function TabBar() {
  const { pathname } = useLocation();
  return (
    <nav className="tabbar" aria-label="Quick navigation" data-ui>
      {TABS.map(([to, label, d]) => {
        const on = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <TLink key={to} to={to} className={on ? "is-on" : ""} aria-current={on ? "page" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" /></svg>
            <span className="mono">{label}</span>
          </TLink>
        );
      })}
    </nav>
  );
}
