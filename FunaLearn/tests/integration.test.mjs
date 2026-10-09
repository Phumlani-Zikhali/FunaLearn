import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const folder = mkdtempSync(join(tmpdir(), "funalearn-test-")),
  port = 4318,
  origin = `http://127.0.0.1:${port}`;
let processHandle,
  student,
  teacher,
  admin,
  learner,
  privateDeck,
  sharedDeck,
  resource,
  classId,
  studentId;
async function call(path, data, cookie, customOrigin = origin) {
  const r = await fetch(origin + "/api" + path, {
    method: data === undefined ? "GET" : "POST",
    headers: {
      ...(data === undefined
        ? {}
        : { "Content-Type": "application/json", Origin: customOrigin }),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
before(async () => {
  processHandle = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: join(folder, "test.sqlite"),
      AI_PROVIDER: "disabled",
      AI_MODEL: "",
    },
    stdio: "pipe",
  });
  let errors = "";
  processHandle.stderr.on("data", (d) => (errors += d));
  for (let i = 0; i < 60; i++) {
    try {
      if ((await call("/health")).status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Test server did not start: " + errors);
});
after(async () => {
  if (processHandle) {
    const closed = new Promise((r) => processHandle.once("exit", r));
    processHandle.kill();
    await closed;
  }
  rmSync(folder, { recursive: true, force: true });
});
test("protected routes require a session, and cross-origin writes fail", async () => {
  assert.equal((await call("/state")).status, 401);
  assert.equal(
    (
      await call(
        "/auth/demo",
        { role: "student" },
        null,
        "https://untrusted.invalid",
      )
    ).status,
    403,
  );
});
test("first account sets up the administrator; subsequent accounts are learners", async () => {
  assert.equal((await call("/health")).data.setupRequired, true);
  assert.equal((await call("/auth/demo", { role: "admin" })).status, 404);
  const account = (name) => ({
    name,
    email: name + "@example.test",
    password: "a-safe-test-password-24",
  });
  const owner = await call("/auth/register", account("owner"));
  assert.equal(owner.data.role, "admin");
  admin = owner.cookie;
  assert.equal((await call("/health")).data.setupRequired, false);
  const pupil = await call("/auth/register", account("student"));
  student = pupil.cookie;
  studentId = pupil.data.id;
  const educator = await call("/auth/register", account("teacher"));
  assert.equal(educator.data.role, "student");
  assert.equal(
    (
      await call(
        "/admin/users",
        { id: educator.data.id, role: "teacher", active: true },
        admin,
      )
    ).status,
    200,
  );
  teacher = (await call("/auth/login", account("teacher"))).cookie;
  const cl = await call(
    "/admin/classes",
    { name: "Learning group", teacherId: educator.data.id },
    admin,
  );
  assert.equal(cl.status, 200);
  classId = cl.data.id;
  assert.equal(
    (
      await call(
        "/admin/members",
        { classId, userId: studentId, action: "add" },
        admin,
      )
    ).status,
    200,
  );
  assert.equal((await call("/me", undefined, student)).data.role, "student");
  assert.equal(
    (await call("/teacher/overview", undefined, student)).status,
    403,
  );
  assert.equal((await call("/admin/overview", undefined, teacher)).status, 403);
  assert.equal(
    (await call("/lessons/photosynthesis/complete", {}, teacher)).status,
    403,
  );
});
test("new progress is zero and duplicate lesson completion earns credit only once", async () => {
  assert.equal((await call("/state", undefined, student)).data.progress.xp, 0);
  await call("/lessons/photosynthesis/complete", {}, student);
  await call("/lessons/photosynthesis/complete", {}, student);
  const p = (await call("/state", undefined, student)).data.progress;
  assert.equal(p.xp, 20);
  assert.equal(p.completed.length, 1);
  assert.equal(p.streak, 1);
  assert.equal(p.badges[0].earned, true);
});
test("notes persist through a new session and remain private", async () => {
  await call(
    "/lessons/photosynthesis/note",
    { body: "My private reminder" },
    student,
  );
  student = (
    await call("/auth/login", {
      email: "student@example.test",
      password: "a-safe-test-password-24",
    })
  ).cookie;
  assert.equal(
    (await call("/lessons/photosynthesis", undefined, student)).data.note,
    "My private reminder",
  );
  assert.equal(
    (await call("/lessons/photosynthesis", undefined, teacher)).data.note,
    "",
  );
});
test("flashcard confidence sets due dates and immediate replay does not award twice", async () => {
  const a = await call(
    "/cards/photosynthesis-0/review",
    { confidence: "good" },
    student,
  );
  assert.equal(a.status, 200);
  assert.equal(a.data.interval, 2);
  const due = a.data.due;
  await call(
    "/cards/photosynthesis-0/review",
    { confidence: "again" },
    student,
  );
  const d = (await call("/decks/photosynthesis", undefined, student)).data;
  assert.equal(d.cards[0].due, due);
  assert.equal((await call("/state", undefined, student)).data.progress.xp, 25);
  assert.equal(
    (
      await call(
        "/cards/photosynthesis-1/review",
        { confidence: "cheat" },
        student,
      )
    ).status,
    400,
  );
});
test("quiz answers are hidden until server marking, with idempotent submissions", async () => {
  const q = (await call("/quizzes/photosynthesis", undefined, student)).data;
  assert.equal(q.questions[0].answer, undefined);
  assert.equal(
    (
      await call(
        "/quizzes/photosynthesis/submit",
        { answers: [0], attemptId: "test-attempt-short" },
        student,
      )
    ).status,
    400,
  );
  const b = { answers: [0, 1, 1], attemptId: "test-attempt-complete" };
  const result = await call("/quizzes/photosynthesis/submit", b, student);
  assert.equal(result.data.score, 3);
  assert.ok(result.data.result[0].explanation);
  await call("/quizzes/photosynthesis/submit", b, student);
  const p = (await call("/state", undefined, student)).data.progress;
  assert.equal(p.attempts.length, 1);
  assert.equal(p.xp, 50);
  const saved = await call(
    "/attempts/test-attempt-complete",
    undefined,
    student,
  );
  assert.equal(saved.data.score, 3);
  assert.equal(saved.data.result[0].chosen, 0);
  assert.equal(
    (await call("/attempts/test-attempt-complete", undefined, teacher)).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/quizzes/photosynthesis/submit",
        { ...b, answers: [1, 1, 1] },
        student,
      )
    ).status,
    409,
  );
});
test("teacher resources flow to enrolled students and admin moderation controls visibility", async () => {
  const r = await call(
    "/resources",
    {
      classId: classId,
      title: "Teacher plant notes",
      subject: "Life Sciences",
      body: "Chlorophyll absorbs light.",
    },
    teacher,
  );
  assert.equal(r.status, 200);
  resource = r.data.id;
  assert.ok(
    (await call("/state", undefined, student)).data.resources.some(
      (r) => r.id === resource,
    ),
  );
  assert.equal(
    (
      await call(
        "/resources",
        {
          classId: classId,
          title: "bad",
          subject: "Life Sciences",
          body: "bad",
        },
        student,
      )
    ).status,
    403,
  );
  await call("/admin/moderate", { id: resource, approved: false }, admin);
  assert.equal(
    (await call("/state", undefined, student)).data.resources.length,
    0,
  );
  await call("/admin/moderate", { id: resource, approved: true }, admin);
});
test("reviewed teacher activities are persisted and can be assigned", async () => {
  const a = await call(
    "/activities",
    {
      kind: "deck",
      title: "Teacher recall",
      lessonId: "photosynthesis",
      classId: classId,
      items: [{ front: "What captures light?", back: "Chlorophyll" }],
    },
    teacher,
  );
  assert.equal(a.status, 200);
  sharedDeck = a.data.id;
  assert.equal(
    (await call("/decks/" + sharedDeck, undefined, student)).data.cards.length,
    1,
  );
  const assignment = await call(
    "/assignments",
    {
      classId: classId,
      kind: "deck",
      ref: sharedDeck,
      title: "Review plants",
      due: "2026-10-01",
    },
    teacher,
  );
  assert.equal(assignment.status, 200);
  assert.equal(
    (await call("/state", undefined, student)).data.assignments[0].completed,
    false,
  );
  const card = (await call("/decks/" + sharedDeck, undefined, student)).data
    .cards[0];
  await call("/cards/" + card.id + "/review", { confidence: "hard" }, student);
  assert.equal(
    (await call("/state", undefined, student)).data.assignments[0].completed,
    true,
  );
});
test("learner registration never accepts a privileged role and isolates records", async () => {
  const a = await call("/auth/register", {
    name: "New Learner",
    email: "new@example.test",
    password: "a-safe-test-password-24",
    role: "admin",
  });
  assert.equal(a.status, 200);
  learner = a.cookie;
  assert.equal(a.data.role, "student");
  assert.equal((await call("/state", undefined, learner)).data.progress.xp, 0);
  assert.equal(
    (await call("/state", undefined, learner)).data.resources.length,
    0,
  );
  assert.equal(
    (await call("/decks/" + sharedDeck, undefined, learner)).status,
    403,
  );
  assert.equal(
    (
      await call("/auth/login", {
        email: "new@example.test",
        password: "wrong",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call("/auth/login", {
        email: "new@example.test",
        password: "a-safe-test-password-24",
      })
    ).status,
    200,
  );
});
test("personal practice is private and not assignable by another teacher", async () => {
  const a = await call(
    "/activities",
    {
      kind: "deck",
      title: "Private deck",
      lessonId: "equations",
      items: [{ front: "2 + 2?", back: "4" }],
    },
    learner,
  );
  privateDeck = a.data.id;
  assert.equal(
    (await call("/decks/" + privateDeck, undefined, student)).status,
    403,
  );
  assert.equal(
    (await call("/decks/" + privateDeck, undefined, teacher)).status,
    403,
  );
  assert.equal(
    (
      await call(
        "/assignments",
        {
          classId: classId,
          kind: "deck",
          ref: privateDeck,
          title: "Not mine",
          due: "2026-10-01",
        },
        teacher,
      )
    ).status,
    403,
  );
});
test("a teacher can only communicate with an enrolled learner", async () => {
  assert.equal(
    (
      await call(
        "/messages",
        { recipientId: studentId, body: "Try one small step." },
        teacher,
      )
    ).status,
    200,
  );
  assert.equal((await call("/messages", undefined, student)).data.length, 1);
  assert.equal((await call("/messages", undefined, learner)).data.length, 0);
  const other = (await call("/me", undefined, learner)).data.id;
  assert.equal(
    (
      await call(
        "/messages",
        { recipientId: other, body: "Not permitted" },
        teacher,
      )
    ).status,
    403,
  );
});
test("leaderboard is class-scoped, excludes private data and uses earned activity", async () => {
  const path = "/leaderboard?classId=" + classId + "&period=all";
  assert.equal((await call(path)).status, 401);
  assert.equal((await call(path, undefined, learner)).status, 403);
  const board = await call(path, undefined, student);
  assert.equal(board.status, 200);
  assert.equal(board.data.rows.length, 1);
  assert.equal(board.data.rows[0].isYou, true);
  assert.equal(
    board.data.rows[0].xp,
    (await call("/state", undefined, student)).data.progress.xp,
  );
  assert.equal(board.data.rows[0].email, undefined);
  assert.equal(board.data.rows[0].hash, undefined);
  assert.equal((await call(path, undefined, teacher)).status, 200);
  assert.equal((await call(path, undefined, admin)).status, 200);
  assert.equal(
    (
      await call(
        "/leaderboard?classId=" + classId + "&period=invalid",
        undefined,
        student,
      )
    ).status,
    400,
  );
  assert.equal(
    (await call("/leaderboard?classId=unrelated", undefined, student)).status,
    403,
  );
});
test("role changes invalidate sessions without changing earned progress", async () => {
  const uid = (await call("/me", undefined, learner)).data.id;
  await call("/lessons/equations/complete", {}, learner);
  assert.equal(
    (
      await call(
        "/admin/users",
        { id: uid, role: "teacher", active: true },
        admin,
      )
    ).status,
    200,
  );
  assert.equal((await call("/me", undefined, learner)).status, 401);
  const login = await call("/auth/login", {
    email: "new@example.test",
    password: "a-safe-test-password-24",
  });
  assert.equal(login.data.role, "teacher");
  assert.equal(
    (await call("/state", undefined, login.cookie)).data.progress.xp,
    20,
  );
});
test("AI fails honestly without creating synthetic messages or points", async () => {
  assert.equal(
    (await call("/ai", { prompt: "How do volcanoes form?" }, student)).status,
    503,
  );
  assert.deepEqual(
    (await call("/ai/history?lesson=photosynthesis", undefined, student)).data,
    [],
  );
});
test("learners join with a teacher code without gaining another role", async () => {
  assert.equal(
    (await call("/classes/invites", undefined, student)).status,
    403,
  );
  const invites = await call("/classes/invites", undefined, teacher);
  assert.equal(invites.status, 200);
  const code = invites.data.find((c) => c.id === classId).code;
  assert.equal(
    (await call("/classes/invites", undefined, teacher)).data.find(
      (c) => c.id === classId,
    ).code,
    code,
  );
  await call(
    "/admin/members",
    { classId, userId: studentId, remove: true },
    admin,
  );
  assert.equal(
    (await call("/state", undefined, student)).data.classes.length,
    0,
  );
  assert.equal(
    (await call("/classes/join", { code: "NOTVALID" }, student)).status,
    400,
  );
  assert.equal((await call("/classes/join", { code }, teacher)).status, 403);
  const joined = await call(
    "/classes/join",
    { code: code.toLowerCase(), role: "admin", userId: "someone-else" },
    student,
  );
  assert.equal(joined.status, 200);
  assert.equal((await call("/classes/join", { code }, student)).status, 200);
  const state = (await call("/state", undefined, student)).data;
  assert.equal(state.classes.length, 1);
  assert.equal(state.user.role, "student");
  assert.ok(state.resources.some((r) => r.id === resource));
});
test("logout revokes the session", async () => {
  await call("/auth/logout", {}, student);
  assert.equal((await call("/state", undefined, student)).status, 401);
});
