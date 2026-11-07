/* Event list carried over from the Ambiora schedule. Each event is hung in the
   museum as a paradox. `team` = [min, max] or null if not announced. */
export const CATEGORIES = ["Competition", "Hackathon", "Gaming", "Workshop"];

export const EVENTS = [
  {
    slug: "treasure-hunt", title: "Treasure Hunt", pdx: "Meno’s Paradox", category: "Competition", by: "Techfiesta", art: "meno",
    slots: [{ day: 1, start: "11:00", end: "13:00" }], team: null,
    koan: "How do you search for something you wouldn’t recognise?",
    desc: "A race across campus. Solve puzzles, decode clues and beat the clock to the hidden treasure. The whole hunt runs on a dedicated mobile app.",
    about: "Meno asked how you can look for something you don’t know — if you knew it, you wouldn’t need to look; if you don’t, you won’t recognise it when you find it. Bring a charged phone and a teammate who reads clues differently from you."
  },
  {
    slug: "pitch-your-own-app", title: "Pitch Your Own App", pdx: "Survivorship Bias", category: "Competition", by: "ADC Club", art: "survivor",
    slots: [{ day: 1, start: "13:30", end: "17:00" }], team: null,
    koan: "You only ever hear from the ones that made it. Pitch anyway.",
    desc: "Take your app idea in front of a panel of judges. Sharpen the pitch, show the vision, collect feedback from industry experts and compete for prizes.",
    about: "In WWII, analysts studied bullet holes on returning bombers — and the planes that never came back were the ones that mattered. Every success story you’ve heard is a survivor. Yours doesn’t have to be one yet."
  },
  {
    slug: "cinetech", title: "CineTech", pdx: "Wagon-wheel Effect", category: "Competition", by: "Raw Vision Media", art: "wheel",
    slots: [{ day: 1, start: "13:30", end: null }], team: null,
    koan: "Twenty-four frames a second, and the wheel still spins backwards.",
    desc: "Where technology meets cinema. Make content that blends tech with filmmaking and tell a story with a technical twist.",
    about: "Film a turning wheel at the wrong frame rate and it rolls backwards on screen. Cinema has always been a trick on the eye. Use the trick."
  },
  {
    slug: "deep-fake-hisence", title: "Deep Fake Hisence", pdx: "The Liar Paradox", category: "Competition", by: "Coding Club", art: "liar",
    slots: [{ day: 1, start: "14:00", end: "17:00" }], team: null,
    koan: "This statement is false. Now work out which one.",
    desc: "Your curiosity is the weapon. Write scripts, query databases and connect weak signals to reconstruct a silent disaster in a high-stakes investigation.",
    about: "If a sentence says it’s lying, is it telling the truth? Every clue in this investigation could be true, false, or both. Trust the data, then question the data."
  },
  {
    slug: "tower-of-stability", title: "Tower of Stability", pdx: "Leaning Tower of Lire", category: "Competition", by: "Atrangi Club", art: "tower",
    slots: [{ day: 1, start: "14:00", end: "16:00" }], team: null,
    koan: "Stack it further out than it has any right to stay up.",
    desc: "Build the tallest, most stable tower you can from limited materials. Height against integrity. Stationery is provided.",
    about: "Stack identical blocks carefully enough and the top one can hang out past the table edge by any distance you like — the overhang grows forever. Physics allows more than intuition does."
  },
  {
    slug: "code-vyuh-26", title: "Code Vyuh 26", pdx: "Ship of Theseus", category: "Hackathon", by: "GDG on Campus", art: "theseus",
    slots: [{ day: 2, start: "10:00", end: null, note: "24 hours" }], team: null,
    koan: "Replace every plank mid-voyage. Is it still the same ship?",
    desc: "A 24-hour hackathon where teams build things that shouldn’t be finishable by morning. Includes an enrolment kit, winner certificates and midnight high tea and snacks.",
    about: "By hour 20 you will have rewritten every file you wrote in hour 2. Is it still your project? (Yes. Ship it.)"
  },
  {
    slug: "tech-arena", title: "Tech Arena", pdx: "Prisoner’s Dilemma", category: "Gaming", by: "Techfiesta", art: "dilemma",
    slots: [{ day: 2, start: "10:00", end: "17:00" }], team: [1, 5],
    koan: "Cooperate and you both win. Defect and you win more. Until you don’t.",
    desc: "Five tournaments, one arena. Only the team leader registers on behalf of the whole team.",
    about: "Game theory’s most famous standoff: two players, each better off betraying the other, both worse off if they do. Your squad is the only trust you’ve got.",
    games: [
      { name: "Valorant", note: "Team of 5", cap: "15 teams" },
      { name: "BGMI", note: "Squad of 4", cap: "20 teams" },
      { name: "F1", note: "Solo", cap: null },
      { name: "FIFA — Singles", note: "1v1", cap: "32 players" },
      { name: "FIFA — Doubles", note: "Team of 2", cap: "20 teams" }
    ]
  },
  {
    slug: "code-relay", title: "Code Relay", pdx: "Achilles & the Tortoise", category: "Competition", by: "Coding Club", art: "zeno",
    slots: [{ day: 2, start: "14:00", end: "17:00" }], team: null,
    koan: "Always halfway to halfway.",
    desc: "Three islands. One continuous chain of logic. Every pirate inherits the course from the last, and only the crews that navigate together reach the final shore.",
    about: "Achilles can never pass the tortoise: by the time he reaches where it was, it has moved on. Your teammate’s code is the tortoise. Catch it."
  },
  {
    slug: "drone-o-mania", title: "Drone-O-Mania", pdx: "The Twin Paradox", category: "Competition", by: "UAS NMIMS Club", art: "twin",
    slots: [{ day: 2, start: "16:00", end: null }], team: null,
    koan: "Take the fast way round and you come back younger.",
    desc: "Competitive obstacle-based drone racing. Clear a series of aerial challenges inside a time limit with as few penalties as you can manage. Several rounds, one high-intensity final.",
    about: "One twin stays home, the other travels near light speed and returns younger. Your drone won’t get that fast — but the clock will still feel like it’s cheating."
  },
  {
    slug: "robotics", title: "Robotics Workshop & Robo Competition", short: "Robotics", pdx: "Moravec’s Paradox", category: "Workshop", by: "Avinya Club", art: "moravec",
    slots: [{ day: 2, start: "10:00", end: "17:00", label: "Workshop" }, { day: 3, start: "10:00", end: null, label: "Competition" }], team: null,
    koan: "Beating a grandmaster was easy. Opening the door is the hard part.",
    desc: "A workshop on Day 02, then a competition on Day 03. Learn it in a day, send your bot into the arena the next.",
    about: "Computers beat chess champions decades ago, yet a robot that can reliably fold laundry is still a research problem. What’s hard for us is easy for machines, and the other way round."
  },
  {
    slug: "aspire-quest", title: "Aspire Quest", pdx: "Catch-22", category: "Competition", by: "Techfiesta", art: "catch22",
    slots: [{ day: 3, start: "10:00", end: "12:00" }], team: null, eligibility: "Third-year students only",
    koan: "You need experience to get the job. You need the job to get experience.",
    desc: "A multi-round challenge exclusively for third-year students. Test your knowledge, skill and quick thinking. Winners get an internship opportunity.",
    about: "The oldest loop in every job market. This is the way out of it: win, and the internship is the experience."
  }
];

EVENTS.forEach((e, i) => { e.index = i; e.no = String(i + 1).padStart(2, "0"); });

export const bySlug = (slug) => EVENTS.find((e) => e.slug === slug);

/* "13:30" → "1:30 PM" */
export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
export const fmtSlot = (s) => (s.end ? `${fmtTime(s.start)} – ${fmtTime(s.end)}` : `${fmtTime(s.start)} onwards`) + (s.note ? ` · ${s.note}` : "");
export const toMin = (t) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
