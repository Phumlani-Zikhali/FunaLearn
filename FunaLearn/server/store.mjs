import { calculateBadges } from "./achievements.mjs";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { seed } from "./seed.mjs";
export const dbPath = process.env.DB_PATH || resolve("data/funalearn.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
seed(db);
// Keep historical records, but retire the old shared accounts and their sessions.
db.exec(
  "UPDATE users SET active=0 WHERE demo=1; DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE demo=1); UPDATE resources SET approved=0 WHERE owner_id IN (SELECT id FROM users WHERE demo=1);",
);
db.prepare(
  "UPDATE lessons SET source=? WHERE source LIKE 'FunaLearn demonstration lesson%'",
).run("FunaLearn introductory lesson · educator review recommended");
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const one = (sql, ...p) => db.prepare(sql).get(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export const id = () => randomUUID();
export const now = () => new Date().toISOString();
export function transaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
export function event(user, kind, ref, title, xp) {
  return run(
    "INSERT OR IGNORE INTO events VALUES(?,?,?,?,?,?,?)",
    id(),
    user,
    kind,
    ref,
    title,
    xp,
    now(),
  );
}
// Calendar days use the school's timezone, not elapsed 24-hour windows.
export const studyDay = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function progress(user) {
  const events = all(
    "SELECT * FROM events WHERE user_id=? ORDER BY created DESC",
    user,
  );
  const attempts = all(
    "SELECT id,quiz_id,score,total,created FROM attempts WHERE user_id=? ORDER BY created DESC",
    user,
  );
  const days = new Set(events.map((e) => studyDay(new Date(e.created))));
  let streak = 0,
    cursor = new Date();
  if (!days.has(studyDay(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(studyDay(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  const xp = events.reduce((s, e) => s + e.xp, 0),
    completed = events.filter((e) => e.kind === "lesson").map((e) => e.ref);
  const today = events.filter(
    (e) => studyDay(new Date(e.created)) === studyDay(),
  ).length;
  return {
    xp,
    reviewedDecks: all(
      "SELECT d.id FROM decks d WHERE EXISTS(SELECT 1 FROM cards c WHERE c.deck_id=d.id) AND NOT EXISTS(SELECT 1 FROM cards c LEFT JOIN reviews r ON r.card_id=c.id AND r.user_id=? WHERE c.deck_id=d.id AND r.card_id IS NULL)",
      user,
    ).map((d) => d.id),
    streak,
    level: Math.floor(xp / 100) + 1,
    completed,
    today,
    events,
    attempts,
    badges: calculateBadges(events, attempts, studyDay),
  };
}
