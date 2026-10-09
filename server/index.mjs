import { rankRows } from "./achievements.mjs";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, extname } from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
try {
  process.loadEnvFile();
} catch {}
const { all, one, run, id, now, transaction, event, progress, studyDay } =
  await import("./store.mjs");
const port = Number(process.env.PORT || 4311);
const { aiAvailable } = await import("./ai.mjs");
const needsSetup = () => !one("SELECT 1 FROM users WHERE demo=0 LIMIT 1");
const allowed = new Set([
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`,
  "http://127.0.0.1:4310",
  "http://localhost:4310",
]);
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const text = (v, max = 2000) => {
  if (typeof v !== "string" || !v.trim() || v.length > max)
    fail(400, "Please check the text and try again.");
  return v.trim();
};
const role = (u, ...roles) => {
  if (!roles.includes(u.role))
    fail(403, "This action is not available for your account.");
};
const hashToken = (t) => createHash("sha256").update(t).digest("hex");
const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  role: u.role,
  email: u.email,
  goal: u.goal,
});
const classAllowed = (u, c) =>
  typeof c === "string" &&
  (u.role === "admin" ||
    !!one("SELECT 1 FROM classes WHERE id=? AND teacher_id=?", c, u.id) ||
    (u.role === "student" &&
      !!one("SELECT 1 FROM members WHERE class_id=? AND user_id=?", c, u.id)));
function activity(u, table, key) {
  if (typeof key !== "string") fail(400, "Choose a valid activity.");
  const a = one(`SELECT * FROM ${table} WHERE id=?`, key);
  if (!a) fail(404, "This activity could not be found.");
  if (
    a.owner_id &&
    a.owner_id !== u.id &&
    u.role !== "admin" &&
    (!a.class_id || !classAllowed(u, a.class_id))
  )
    fail(403, "This activity is private.");
  return a;
}
function session(req) {
  const token = (req.headers.cookie || "").match(
    /(?:^|; )fl_session=([^;]+)/,
  )?.[1];
  const u =
    token &&
    one(
      "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1 AND u.demo=0",
      hashToken(token),
      Date.now(),
    );
  if (!u) fail(401, "Please sign in to continue.");
  return u;
}
function setSession(res, u) {
  const t = randomBytes(32).toString("hex");
  run("DELETE FROM sessions WHERE expires<?", Date.now());
  run(
    "INSERT INTO sessions VALUES(?,?,?)",
    hashToken(t),
    u.id,
    Date.now() + 7 * 86400000,
  );
  res.setHeader(
    "Set-Cookie",
    `fl_session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800`,
  );
}
async function body(req) {
  let s = "";
  for await (const c of req) {
    s += c;
    if (s.length > 150000)
      fail(413, "This material is too large. Please use a shorter section.");
  }
  try {
    const value = s ? JSON.parse(s) : {};
    if (!value || typeof value !== "object" || Array.isArray(value))
      fail(400, "Send a valid request.");
    return value;
  } catch {
    fail(400, "The request could not be read.");
  }
}
const rate = new Map();
function limit(key, max = 30) {
  const t = Date.now(),
    r = rate.get(key);
  if (!r || r.end < t) {
    rate.set(key, { count: 1, end: t + 60000 });
    return;
  }
  if (++r.count > max) fail(429, "Please take a short pause and try again.");
}
async function api(req, res, url) {
  const path = url.pathname,
    method = req.method;
  if (method !== "GET" && !allowed.has(req.headers.origin))
    fail(403, "Please use FunaLearn from its own window.");
  if (path === "/api/health")
    return { ok: true, app: "funalearn", setupRequired: needsSetup() };
  if (path === "/api/auth/demo")
    fail(404, "This sign-in method is no longer available.");
  if (path === "/api/auth/login" && method === "POST") {
    limit("login");
    const b = await body(req),
      email = text(b.email, 254).toLowerCase(),
      password = text(b.password, 200);
    const u = one(
      "SELECT * FROM users WHERE email=? AND active=1 AND demo=0",
      email,
    );
    const [salt, expected] = (u?.hash || "invalid:" + "0".repeat(128)).split(
      ":",
    );
    const actual = scryptSync(password, salt, 64);
    if (!u?.hash || !timingSafeEqual(actual, Buffer.from(expected, "hex")))
      fail(401, "The email or password does not match.");
    setSession(res, u);
    return publicUser(u);
  }
  if (path === "/api/auth/register" && method === "POST") {
    limit("register", 5);
    const b = await body(req),
      name = text(b.name, 80),
      email = text(b.email, 254).toLowerCase(),
      password = text(b.password, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12)
      fail(400, "Use a valid email and a password of at least 12 characters.");
    if (one("SELECT 1 FROM users WHERE email=?", email))
      fail(409, "An account already uses this email.");
    const salt = randomBytes(16).toString("hex"),
      uid = id();
    run(
      "INSERT INTO users(id,name,email,hash,role) VALUES(?,?,?,?,?)",
      uid,
      name,
      email,
      salt + ":" + scryptSync(password, salt, 64).toString("hex"),
      needsSetup() ? "admin" : "student",
    );
    const u = one("SELECT * FROM users WHERE id=?", uid);
    setSession(res, u);
    return publicUser(u);
  }
  const u = session(req);
  if (path === "/api/me" && method === "GET") return publicUser(u);
  if (path === "/api/auth/logout" && method === "POST") {
    const token = (req.headers.cookie || "").match(/fl_session=([^;]+)/)?.[1];
    if (token) run("DELETE FROM sessions WHERE token=?", hashToken(token));
    res.setHeader(
      "Set-Cookie",
      "fl_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
    );
    return { ok: true };
  }
  if (path === "/api/leaderboard" && method === "GET") {
    const classId = url.searchParams.get("classId");
    if (!classId || !classAllowed(u, classId))
      fail(403, "Choose one of your classes.");
    const period = url.searchParams.get("period") || "all";
    if (!["all", "week"].includes(period)) fail(400, "Choose a valid period.");
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 6);
    const firstDay = studyDay(start),
      today = studyDay();
    const rows = all(
      "SELECT u.id,u.name FROM users u JOIN members m ON m.user_id=u.id WHERE m.class_id=? AND u.role='student' AND u.active=1 AND u.demo=0",
      classId,
    ).map((member) => {
      const p = progress(member.id);
      const xp = p.events
        .filter(
          (e) =>
            period === "all" ||
            (studyDay(new Date(e.created)) >= firstDay &&
              studyDay(new Date(e.created)) <= today),
        )
        .reduce((n, e) => n + e.xp, 0);
      return {
        id: member.id,
        name: member.name,
        xp,
        streak: p.streak,
        badges: p.badges.filter((b) => b.earned).length,
        isYou: member.id === u.id,
      };
    });
    return { rows: rankRows(rows), period };
  }
  if (path === "/api/state" && method === "GET") {
    const classes =
      u.role === "admin"
        ? all(
            "SELECT * FROM classes WHERE teacher_id IN (SELECT id FROM users WHERE demo=0)",
          )
        : u.role === "teacher"
          ? all("SELECT * FROM classes WHERE teacher_id=?", u.id)
          : all(
              "SELECT c.* FROM classes c JOIN members m ON c.id=m.class_id WHERE m.user_id=?",
              u.id,
            );
    const ids = new Set(classes.map((c) => c.id));
    const decks = all("SELECT * FROM decks")
      .filter(
        (d) =>
          !d.owner_id ||
          d.owner_id === u.id ||
          ids.has(d.class_id) ||
          u.role === "admin",
      )
      .map((d) => ({
        ...d,
        count: one("SELECT COUNT(*) n FROM cards WHERE deck_id=?", d.id).n,
        due: one(
          "SELECT COUNT(*) n FROM cards c LEFT JOIN reviews r ON r.card_id=c.id AND r.user_id=? WHERE c.deck_id=? AND (r.due IS NULL OR r.due<=?)",
          u.id,
          d.id,
          now(),
        ).n,
      }));
    const quizzes = all("SELECT * FROM quizzes")
      .filter(
        (q) =>
          !q.owner_id ||
          q.owner_id === u.id ||
          ids.has(q.class_id) ||
          u.role === "admin",
      )
      .map((q) => ({
        ...q,
        count: one("SELECT COUNT(*) n FROM questions WHERE quiz_id=?", q.id).n,
      }));
    const resources = all(
      "SELECT r.*,u.name author FROM resources r JOIN users u ON u.id=r.owner_id WHERE u.demo=0 ORDER BY r.created DESC",
    ).filter(
      (r) =>
        u.role === "admin" ||
        r.owner_id === u.id ||
        (r.approved && ids.has(r.class_id)),
    );
    const p = progress(u.id);
    const assignments = all("SELECT * FROM assignments")
      .filter((a) => ids.has(a.class_id))
      .map((a) => ({
        ...a,
        completed:
          a.kind === "lesson"
            ? p.completed.includes(a.ref)
            : a.kind === "quiz"
              ? p.attempts.some((t) => t.quiz_id === a.ref)
              : !one(
                  "SELECT c.id FROM cards c LEFT JOIN reviews r ON r.card_id=c.id AND r.user_id=? WHERE c.deck_id=? AND r.card_id IS NULL",
                  u.id,
                  a.ref,
                ),
      }));
    return {
      user: publicUser(u),
      lessons: all("SELECT id,title,subject,topic,minutes,source FROM lessons"),
      decks,
      quizzes,
      resources,
      assignments,
      classes,
      progress: p,
      aiAvailable: aiAvailable(),
    };
  }
  let m = path.match(/^\/api\/lessons\/([^/]+)$/);
  if (m && method === "GET") {
    const l = one("SELECT * FROM lessons WHERE id=?", m[1]);
    if (!l) fail(404, "Lesson not found.");
    return {
      ...l,
      body: JSON.parse(l.body),
      note:
        one(
          "SELECT body FROM notes WHERE user_id=? AND lesson_id=?",
          u.id,
          l.id,
        )?.body || "",
    };
  }
  m = path.match(/^\/api\/lessons\/([^/]+)\/complete$/);
  if (m && method === "POST") {
    role(u, "student");
    const l = one("SELECT * FROM lessons WHERE id=?", m[1]);
    if (!l) fail(404, "Lesson not found.");
    event(u.id, "lesson", l.id, l.title, 20);
    return progress(u.id);
  }
  m = path.match(/^\/api\/lessons\/([^/]+)\/note$/);
  if (m && method === "POST") {
    if (!one("SELECT 1 FROM lessons WHERE id=?", m[1]))
      fail(404, "Lesson not found.");
    const b = await body(req);
    if (typeof b.body !== "string" || b.body.length > 10000)
      fail(400, "Please shorten your note.");
    run(
      "INSERT INTO notes VALUES(?,?,?) ON CONFLICT(user_id,lesson_id) DO UPDATE SET body=excluded.body",
      u.id,
      m[1],
      b.body,
    );
    return { ok: true };
  }
  m = path.match(/^\/api\/decks\/([^/]+)$/);
  if (m && method === "GET") {
    const d = activity(u, "decks", m[1]);
    return {
      ...d,
      cards: all(
        "SELECT c.*,r.due,r.confidence FROM cards c LEFT JOIN reviews r ON r.card_id=c.id AND r.user_id=? WHERE c.deck_id=? ORDER BY c.id",
        u.id,
        d.id,
      ),
    };
  }
  m = path.match(/^\/api\/cards\/([^/]+)\/review$/);
  if (m && method === "POST") {
    role(u, "student");
    const c = one("SELECT * FROM cards WHERE id=?", m[1]);
    if (!c) fail(404, "Card not found.");
    activity(u, "decks", c.deck_id);
    const b = await body(req);
    if (!["again", "hard", "good"].includes(b.confidence))
      fail(400, "Choose a confidence level.");
    return transaction(() => {
      const old = one(
        "SELECT * FROM reviews WHERE user_id=? AND card_id=?",
        u.id,
        c.id,
      );
      if (old && old.due > now()) return old;
      const interval =
        b.confidence === "again"
          ? 0
          : b.confidence === "hard"
            ? 1
            : Math.min(60, Math.max(2, (old?.interval || 1) * 2));
      const due = new Date(
        Date.now() + (interval ? interval * 86400000 : 600000),
      ).toISOString();
      run(
        "INSERT INTO reviews VALUES(?,?,?,?,?,1) ON CONFLICT(user_id,card_id) DO UPDATE SET due=excluded.due,interval=excluded.interval,confidence=excluded.confidence,repetitions=reviews.repetitions+1",
        u.id,
        c.id,
        due,
        interval,
        b.confidence,
      );
      event(u.id, "review", c.id + ":" + studyDay(), "Reviewed: " + c.front, 5);
      return { due, interval };
    });
  }
  m = path.match(/^\/api\/quizzes\/([^/]+)$/);
  if (m && method === "GET") {
    const q = activity(u, "quizzes", m[1]);
    return {
      ...q,
      questions: all(
        "SELECT id,prompt,options FROM questions WHERE quiz_id=? ORDER BY id",
        q.id,
      ).map((q) => ({ ...q, options: JSON.parse(q.options) })),
    };
  }
  m = path.match(/^\/api\/quizzes\/([^/]+)\/submit$/);
  if (m && method === "POST") {
    role(u, "student");
    const q = activity(u, "quizzes", m[1]),
      b = await body(req),
      questions = all(
        "SELECT * FROM questions WHERE quiz_id=? ORDER BY id",
        q.id,
      );
    if (
      !Array.isArray(b.answers) ||
      b.answers.length !== questions.length ||
      b.answers.some(
        (a, i) =>
          !Number.isInteger(a) ||
          a < 0 ||
          a >= JSON.parse(questions[i].options).length,
      )
    )
      fail(400, "Please answer each question before finishing.");
    if (
      typeof b.attemptId !== "string" ||
      !/^[a-zA-Z0-9-]{10,80}$/.test(b.attemptId)
    )
      fail(400, "Please restart this quiz.");
    const result = questions.map((v, i) => ({
      ...v,
      options: JSON.parse(v.options),
      chosen: b.answers[i],
      correct: v.answer === b.answers[i],
    }));
    const score = result.filter((q) => q.correct).length;
    transaction(() => {
      const old = one("SELECT * FROM attempts WHERE id=?", b.attemptId);
      if (old) {
        if (
          old.user_id !== u.id ||
          old.quiz_id !== q.id ||
          old.answers !== JSON.stringify(b.answers)
        )
          fail(409, "This attempt has already been saved.");
        return;
      }
      run(
        "INSERT INTO attempts VALUES(?,?,?,?,?,?,?)",
        b.attemptId,
        u.id,
        q.id,
        JSON.stringify(b.answers),
        score,
        questions.length,
        now(),
      );
      event(
        u.id,
        "quiz",
        q.id + ":" + studyDay(),
        "Practised: " + q.title,
        10 + score * 5,
      );
    });
    return { score, total: questions.length, result };
  }
  if (path === "/api/profile" && method === "POST") {
    const b = await body(req),
      name = text(b.name, 80);
    if (!Number.isInteger(b.goal) || b.goal < 1 || b.goal > 10)
      fail(400, "Choose a daily goal from 1 to 10.");
    run("UPDATE users SET name=?,goal=? WHERE id=?", name, b.goal, u.id);
    return { ok: true };
  }
  // Additional vertical features attach here; every handler uses the same session boundary.
  const { extraRoutes } = await import("./routes.mjs");
  const result = await extraRoutes({
    path,
    method,
    req,
    res,
    u,
    body,
    text,
    fail,
    role,
    classAllowed,
    activity,
    limit,
  });
  if (result !== undefined) return result;
  fail(404, "This page or action could not be found.");
}
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    if (
      ![
        "127.0.0.1:" + port,
        "localhost:" + port,
        "127.0.0.1:4310",
        "localhost:4310",
      ].includes(req.headers.host)
    )
      fail(403, "Unknown host.");
    if (url.pathname.startsWith("/api/")) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      const data = await api(req, res, url);
      res.end(JSON.stringify(data));
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) fail(405, "Method not allowed.");
    const root = resolve("dist"),
      requested = resolve(root, "." + decodeURIComponent(url.pathname));
    if (
      !requested.startsWith(root + "\\") &&
      !requested.startsWith(root + "/") &&
      requested !== root
    )
      fail(404, "Not found.");
    const file =
      existsSync(requested) && extname(requested)
        ? requested
        : resolve(root, "index.html");
    if (!existsSync(file))
      fail(503, "Start the development preview or build FunaLearn first.");
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.end(readFileSync(file));
  } catch (e) {
    res.statusCode = e.status || 500;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: e.status
          ? e.message
          : "Something went wrong while saving. Please try again.",
      }),
    );
    if (!e.status) console.error(e);
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`FunaLearn API ready at http://127.0.0.1:${port}`),
);
