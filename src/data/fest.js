/* ─────────────────────────────────────────────────────────────
   Everything editable about the fest lives here.
   Dates are deliberately null until they're announced — the UI
   shows "TBA" and the countdown switches on by itself once set.
   ───────────────────────────────────────────────────────────── */
export const FEST = {
  name: "Techfiesta",
  edition: "2026",
  theme: "Paradox",
  formerly: "Ambiora",
  tagline: "The inter-NMIMS technical festival",
  host: "NMIMS Shirpur Campus",
  city: "Shirpur, Maharashtra",
  email: "ambiora2026@gmail.com",
  /** ISO start of Day 01, e.g. "2027-03-05T10:00:00+05:30". null = not announced. */
  start: null,
  /** Per-day date labels, e.g. { 1: "5 March", 2: "6 March", 3: "7 March" }. null = TBA. */
  dates: { 1: null, 2: null, 3: null },
  /** Timings below are carried over from the last edition and may change. */
  provisional: true,
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/ambioratechfest" },
    { label: "LinkedIn", href: "https://www.linkedin.com/company/ambiora-techfest/" },
    { label: "X / Twitter", href: "https://x.com/ambiora_tech" }
  ],
  campuses: ["Mumbai", "Navi Mumbai", "Shirpur", "Indore", "Bengaluru", "Hyderabad", "Chandigarh", "Other"]
};

export const dayLabel = (d) => FEST.dates[d] || "Date TBA";
