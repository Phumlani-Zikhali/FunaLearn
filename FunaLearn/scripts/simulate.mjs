import { existsSync, writeFileSync } from "node:fs";
import { randomBytes, scryptSync } from "node:crypto";
import { resolve } from "node:path";
import {
  db,
  all,
  one,
  run,
  id,
  transaction,
  studyDay,
  progress,
} from "../server/store.mjs";
const credentials = resolve("Simulation accounts.txt");
if (existsSync(credentials) || one("SELECT 1 FROM users WHERE id LIKE 'sim-%'"))
  throw new Error(
    "Simulation already exists. Existing accounts and passwords were left unchanged.",
  );
db.exec("VACUUM INTO 'data/before-simulation-" + Date.now() + ".sqlite'");
const scenarios = [
  ["Ayanda", 10],
  ["Lerato", 7],
  ["Sipho", 5],
  ["Naledi", 4],
  ["Thabo", 3],
  ["Zanele", 2],
  ["Musa", 1],
  ["Amara", 0],
];
const accounts = [
  ...scenarios.map(([name, days], i) => ({
    id: "sim-student-" + (i + 1),
    name: name + " · Simulation",
    email: name.toLowerCase() + "@simulation.funalearn.test",
    role: "student",
    days,
  })),
  {
    id: "sim-teacher",
    name: "Ms Dlamini · Simulation",
    email: "teacher@simulation.funalearn.test",
    role: "teacher",
  },
  {
    id: "sim-admin",
    name: "School Admin · Simulation",
    email: "admin@simulation.funalearn.test",
    role: "admin",
  },
].map((a) => ({
  ...a,
  password: "Funa-" + randomBytes(12).toString("base64url"),
}));
const lessons = all("SELECT * FROM lessons ORDER BY id");
const stamp = (daysAgo) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return studyDay(d) + "T08:00:00.000Z";
};
transaction(() => {
  for (const a of accounts) {
    const salt = randomBytes(16).toString("hex");
    run(
      "INSERT INTO users(id,name,email,hash,role) VALUES(?,?,?,?,?)",
      a.id,
      a.name,
      a.email,
      salt + ":" + scryptSync(a.password, salt, 64).toString("hex"),
      a.role,
    );
  }
  run(
    "INSERT INTO classes VALUES(?,?,?)",
    "sim-class",
    "Simulation · Grade 10 learning group",
    "sim-teacher",
  );
  for (const [index, a] of accounts
    .filter((a) => a.role === "student")
    .entries()) {
    run("INSERT INTO members VALUES(?,?)", "sim-class", a.id);
    for (let day = 0; day < a.days; day++) {
      const created = stamp(a.days - 1 - day),
        lesson = lessons[day % lessons.length];
      if (day < lessons.length)
        run(
          "INSERT INTO events VALUES(?,?,?,?,?,?,?)",
          id(),
          a.id,
          "lesson",
          lesson.id,
          "Completed: " + lesson.title,
          20,
          created,
        );
      const cards = all(
        "SELECT * FROM cards WHERE deck_id=? ORDER BY id",
        lesson.id,
      ).slice(0, 2 + (index % 2));
      for (const c of cards) {
        run(
          "INSERT INTO events VALUES(?,?,?,?,?,?,?)",
          id(),
          a.id,
          "review",
          c.id + ":" + studyDay(new Date(created)),
          "Reviewed: " + c.front,
          5,
          created,
        );
        run(
          "INSERT INTO reviews VALUES(?,?,?,?,?,1) ON CONFLICT(user_id,card_id) DO UPDATE SET due=excluded.due,interval=excluded.interval,confidence=excluded.confidence,repetitions=reviews.repetitions+1",
          a.id,
          c.id,
          new Date(new Date(created).getTime() + 86400000).toISOString(),
          1,
          "hard",
        );
      }
      const questions = all(
        "SELECT * FROM questions WHERE quiz_id=? ORDER BY id",
        lesson.id,
      );
      const score =
        index === 0 || (day === a.days - 1 && index % 2 === 0)
          ? questions.length
          : Math.max(1, questions.length - 1);
      const answers = questions.map((q, i) =>
        i < score ? q.answer : (q.answer + 1) % JSON.parse(q.options).length,
      );
      run(
        "INSERT INTO attempts VALUES(?,?,?,?,?,?,?)",
        id(),
        a.id,
        lesson.id,
        JSON.stringify(answers),
        score,
        questions.length,
        created,
      );
      run(
        "INSERT INTO events VALUES(?,?,?,?,?,?,?)",
        id(),
        a.id,
        "quiz",
        lesson.id + ":" + studyDay(new Date(created)),
        "Practised: " + lesson.topic,
        10 + score * 5,
        created,
      );
    }
    if (a.days)
      run(
        "INSERT INTO notes VALUES(?,?,?)",
        a.id,
        "photosynthesis",
        "Simulation note: Plants need light, water and carbon dioxide to make food.",
      );
  }
  run(
    "INSERT INTO resources VALUES(?,?,?,?,?,?,?,?)",
    "sim-resource",
    "sim-teacher",
    "sim-class",
    "Simulation · Photosynthesis recap",
    "Life Sciences",
    "Plants use sunlight, water and carbon dioxide to make glucose and release oxygen. Chlorophyll absorbs light energy. Practise describing each ingredient in your own words.",
    1,
    new Date().toISOString(),
  );
  run(
    "INSERT INTO assignments VALUES(?,?,?,?,?,?,?)",
    "sim-assignment",
    "sim-class",
    "sim-teacher",
    "Simulation · Practise photosynthesis",
    "quiz",
    "photosynthesis",
    studyDay(new Date(Date.now() + 7 * 86400000)),
  );
  for (const a of accounts.filter((a) => a.role === "student"))
    run(
      "INSERT INTO messages VALUES(?,?,?,?,?)",
      id(),
      "sim-teacher",
      a.id,
      "Welcome to our simulation class. Try a lesson, review your badges, and visit the class leaderboard.",
      new Date().toISOString(),
    );
  const lines = [
    "FUNALEARN SIMULATION ACCOUNTS",
    "Created: " + new Date().toLocaleString("en-ZA"),
    "",
    "Open http://127.0.0.1:4310 or double-click Open FunaLearn.bat.",
    "These are fictional accounts for local testing. Passwords below are intentionally stored in plain text at your request. Keep this file private.",
    "The simulation administrator has full administrator access. Existing real accounts were not changed.",
    "",
    "Try Ayanda for a long streak, Naledi for steady progress, and Amara for a fresh start. Sign out before switching accounts.",
    "Streaks are based on actual calendar days, so they naturally change as time passes. Earned badges remain.",
    "",
  ];
  for (const a of accounts) {
    const p = progress(a.id);
    lines.push(
      a.name,
      "Role: " + a.role,
      "Email: " + a.email,
      "Password: " + a.password,
      ...(a.role === "student"
        ? [
            "Starting progress: " +
              p.xp +
              " XP; " +
              p.streak +
              " day streak; " +
              p.badges.filter((b) => b.earned).length +
              " badges",
          ]
        : []),
      "",
    );
  }
  writeFileSync(credentials, lines.join("\r\n"), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
});
console.log(
  "Created 8 student accounts, 1 teacher, 1 administrator and a shared simulation class.",
);
console.log("Credentials saved to Simulation accounts.txt.");
console.log(
  accounts
    .filter((a) => a.role === "student")
    .map((a) => {
      const p = progress(a.id);
      return {
        name: a.name,
        xp: p.xp,
        streak: p.streak,
        badges: p.badges.filter((b) => b.earned).length,
      };
    }),
);
db.close();
