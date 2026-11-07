import { FEST } from "./fest.js";

/* Shared by the Contact page and the "Have a question?" assistant. */
export const FAQ = [
  { q: "Who can take part?", a: "Students from every NMIMS campus — Techfiesta is inter-NMIMS this year. Some events have their own limits; Aspire Quest, for example, is for third-year students only.", k: "eligible participate who can join campus students" },
  { q: "When is Techfiesta?", a: "The dates for this edition are announced soon. The schedule page shows the three days hour by hour; timings are carried over from the last edition for now.", k: "date when days time schedule" },
  { q: "Is there a registration fee?", a: "Fees, if any, are announced with registration. Watch the socials.", k: "fee price cost pay money" },
  { q: "Can I enter more than one event?", a: "Yes, as long as the timings don’t clash. The schedule shows everything hour by hour, so you can check before you register.", k: "multiple many more than one clash" },
  { q: "Do I need a team?", a: "Depends on the event. Tech Arena has fixed team sizes (Valorant 5, BGMI 4, FIFA doubles 2). For team events, only the team leader registers for everyone.", k: "team size squad members solo valorant bgmi fifa" },
  { q: "Where is it?", a: `${FEST.host}, ${FEST.city}.`, k: "where venue location place address shirpur" },
  { q: "Will accommodation be arranged for other campuses?", a: "Travel and stay details for visiting campuses are shared along with registration.", k: "stay accommodation hostel travel room" },
  { q: "What should I bring?", a: "Your college ID. A laptop and charger for coding events, a charged phone for the Treasure Hunt, and patience for the Code Relay.", k: "bring carry laptop id phone" },
  { q: "How do I sponsor Techfiesta?", a: `Write to ${FEST.email} with “Sponsorship” in the subject, or see the Sponsors page for the partnership tiers.`, k: "sponsor partner brand company deck" },
  { q: "Is there a hackathon?", a: "Yes — Code Vyuh 26, a 24-hour hackathon with GDG on Campus, on Day 02. Midnight high tea included.", k: "hackathon code vyuh coding 24" }
];

export function answer(query) {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  if (!words.length) return [];
  return FAQ.map((f) => ({ f, score: words.reduce((s, w) => s + ((f.q + " " + f.k).toLowerCase().includes(w) ? 2 : f.a.toLowerCase().includes(w) ? 1 : 0), 0) }))
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.f);
}
