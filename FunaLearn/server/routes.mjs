import { randomBytes } from "node:crypto";
import { all, one, run, id, now, transaction, progress } from "./store.mjs";
import { generate, generateWithMetadata } from "./ai.mjs";
import { validateDraft } from "./validation.mjs";
export async function extraRoutes(c) {
  const {
    path,
    method,
    req,
    u,
    body,
    text,
    fail,
    role,
    classAllowed,
    activity,
    limit,
  } = c;
  if (path === "/api/classes/invites" && method === "GET") {
    role(u, "teacher", "admin");
    return all(
      "SELECT c.* FROM classes c JOIN users t ON t.id=c.teacher_id WHERE t.active=1 AND t.demo=0",
    )
      .filter((cl) => classAllowed(u, cl.id))
      .map((cl) => {
        run(
          "INSERT OR IGNORE INTO class_invites(class_id,code) VALUES(?,?)",
          cl.id,
          randomBytes(6).toString("hex").toUpperCase(),
        );
        return {
          id: cl.id,
          name: cl.name,
          code: one("SELECT code FROM class_invites WHERE class_id=?", cl.id)
            .code,
        };
      });
  }
  if (path === "/api/classes/join" && method === "POST") {
    role(u, "student");
    limit("join:" + u.id, 10);
    const b = await body(req),
      code = text(b.code, 30).replace(/[\s-]/g, "").toUpperCase();
    const cl = one(
      "SELECT c.id,c.name FROM class_invites i JOIN classes c ON c.id=i.class_id JOIN users t ON t.id=c.teacher_id WHERE i.code=? AND t.active=1 AND t.demo=0",
      code,
    );
    if (!cl)
      fail(
        400,
        "That class code was not found. Please check it with your teacher.",
      );
    run(
      "INSERT OR IGNORE INTO members(class_id,user_id) VALUES(?,?)",
      cl.id,
      u.id,
    );
    return { id: cl.id, name: cl.name };
  }
  const savedAttempt = path.match(/^\/api\/attempts\/([^/]+)$/);
  if (savedAttempt && method === "GET") {
    role(u, "student");
    const attempt = one(
      "SELECT * FROM attempts WHERE id=? AND user_id=?",
      savedAttempt[1],
      u.id,
    );
    if (!attempt) fail(404, "Practice result not found.");
    const answers = JSON.parse(attempt.answers);
    const result = all(
      "SELECT * FROM questions WHERE quiz_id=? ORDER BY id",
      attempt.quiz_id,
    ).map((q, i) => ({
      ...q,
      options: JSON.parse(q.options),
      chosen: answers[i],
      correct: q.answer === answers[i],
    }));
    return { score: attempt.score, total: attempt.total, result };
  }
  if (path === "/api/teacher/overview" && method === "GET") {
    role(u, "teacher");
    return all("SELECT * FROM classes WHERE teacher_id=?", u.id).map((cl) => ({
      ...cl,
      students: all(
        "SELECT u.id,u.name,u.email FROM users u JOIN members m ON m.user_id=u.id WHERE m.class_id=? AND u.role='student'",
        cl.id,
      ).map((s) => ({ ...s, progress: progress(s.id) })),
    }));
  }
  if (path === "/api/resources" && method === "POST") {
    role(u, "teacher");
    const b = await body(req),
      title = text(b.title, 160),
      subject = text(b.subject, 100),
      content = text(b.body, 50000);
    if (!classAllowed(u, b.classId)) fail(403, "Choose one of your classes.");
    const rid = id();
    run(
      "INSERT INTO resources VALUES(?,?,?,?,?,?,1,?)",
      rid,
      u.id,
      b.classId,
      title,
      subject,
      content,
      now(),
    );
    return { id: rid };
  }
  if (path === "/api/assignments" && method === "POST") {
    role(u, "teacher");
    const b = await body(req);
    if (!classAllowed(u, b.classId)) fail(403, "Choose one of your classes.");
    if (!["lesson", "quiz", "deck"].includes(b.kind))
      fail(400, "Choose an activity type.");
    if (
      typeof b.due !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.due) ||
      Number.isNaN(Date.parse(b.due))
    )
      fail(400, "Choose a valid due date.");
    if (b.kind === "lesson") {
      if (!one("SELECT 1 FROM lessons WHERE id=?", b.ref))
        fail(404, "Lesson not found.");
    } else {
      const a = activity(u, b.kind === "quiz" ? "quizzes" : "decks", b.ref);
      if (a.owner_id && a.class_id !== b.classId)
        fail(400, "This activity belongs to a different class.");
    }
    const aid = id();
    run(
      "INSERT INTO assignments VALUES(?,?,?,?,?,?,?)",
      aid,
      b.classId,
      u.id,
      text(b.title, 160),
      b.kind,
      b.ref,
      b.due,
    );
    return { id: aid };
  }
  if (path === "/api/activities" && method === "POST") {
    role(u, "teacher", "student");
    const b = await body(req);
    if (u.role === "teacher" && !classAllowed(u, b.classId))
      fail(403, "Choose one of your classes.");
    if (!["deck", "quiz"].includes(b.kind))
      fail(400, "Choose flashcards or a quiz.");
    if (!one("SELECT 1 FROM lessons WHERE id=?", b.lessonId))
      fail(400, "Choose a topic.");
    if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30)
      fail(400, "Add 1 to 30 items.");
    const title = text(b.title, 160),
      items = validateDraft(b.kind, b.items);
    const aid = id();
    transaction(() => {
      if (b.kind === "deck") {
        run(
          "INSERT INTO decks VALUES(?,?,?,?,?)",
          aid,
          title,
          b.lessonId,
          u.id,
          u.role === "teacher" ? b.classId : null,
        );
        items.forEach((v) =>
          run("INSERT INTO cards VALUES(?,?,?,?)", id(), aid, v.front, v.back),
        );
      } else {
        run(
          "INSERT INTO quizzes VALUES(?,?,?,?,?)",
          aid,
          title,
          b.lessonId,
          u.id,
          u.role === "teacher" ? b.classId : null,
        );
        items.forEach((v) =>
          run(
            "INSERT INTO questions VALUES(?,?,?,?,?,?)",
            id(),
            aid,
            v.prompt,
            JSON.stringify(v.options),
            v.answer,
            v.explanation,
          ),
        );
      }
    });
    return { id: aid };
  }
  if (path === "/api/messages" && method === "GET")
    return all(
      "SELECT m.*,u.name sender,v.name recipient FROM messages m JOIN users u ON u.id=m.sender_id JOIN users v ON v.id=m.recipient_id WHERE m.sender_id=? OR m.recipient_id=? ORDER BY m.created DESC",
      u.id,
      u.id,
    );
  if (path === "/api/messages" && method === "POST") {
    role(u, "teacher");
    const b = await body(req);
    if (
      !one(
        "SELECT 1 FROM members m JOIN classes c ON c.id=m.class_id JOIN users s ON s.id=m.user_id WHERE c.teacher_id=? AND m.user_id=? AND s.role='student'",
        u.id,
        b.recipientId,
      )
    )
      fail(403, "Choose a learner in one of your classes.");
    run(
      "INSERT INTO messages VALUES(?,?,?,?,?)",
      id(),
      u.id,
      b.recipientId,
      text(b.body, 4000),
      now(),
    );
    return { ok: true };
  }
  if (path === "/api/admin/overview" && method === "GET") {
    role(u, "admin");
    return {
      users: all(
        "SELECT id,name,email,role,active FROM users WHERE demo=0 ORDER BY name",
      ),
      classes: all(
        "SELECT c.*,u.name teacher FROM classes c JOIN users u ON u.id=c.teacher_id WHERE u.demo=0",
      ),
      members: all(
        "SELECT * FROM members WHERE user_id IN (SELECT id FROM users WHERE demo=0) AND class_id IN (SELECT id FROM classes WHERE teacher_id IN (SELECT id FROM users WHERE demo=0))",
      ),
      stats: {
        learners: one(
          "SELECT COUNT(*) n FROM users WHERE role='student' AND active=1",
        ).n,
        activities: one(
          "SELECT COUNT(*) n FROM events WHERE user_id IN (SELECT id FROM users WHERE demo=0)",
        ).n,
        resources: one(
          "SELECT COUNT(*) n FROM resources WHERE owner_id IN (SELECT id FROM users WHERE demo=0)",
        ).n,
      },
    };
  }
  if (path === "/api/admin/users" && method === "POST") {
    role(u, "admin");
    const b = await body(req),
      target = one("SELECT * FROM users WHERE id=?", b.id);
    if (!target) fail(404, "Account not found.");
    if (target.id === u.id)
      fail(400, "You cannot change your own role or disable your own account.");
    if (target.demo) fail(400, "This archived account cannot be changed.");
    if (
      !["student", "teacher", "admin"].includes(b.role) ||
      typeof b.active !== "boolean"
    )
      fail(400, "Check the account settings.");
    if (
      target.role === "teacher" &&
      b.role !== "teacher" &&
      one("SELECT 1 FROM classes WHERE teacher_id=?", target.id)
    )
      fail(409, "Reassign this teacher’s classes before changing their role.");
    transaction(() => {
      run(
        "UPDATE users SET role=?,active=? WHERE id=?",
        b.role,
        b.active ? 1 : 0,
        b.id,
      );
      run("DELETE FROM sessions WHERE user_id=?", b.id);
    });
    return { ok: true };
  }
  if (path === "/api/admin/classes" && method === "POST") {
    role(u, "admin");
    const b = await body(req);
    if (
      !one(
        "SELECT 1 FROM users WHERE id=? AND role='teacher' AND active=1",
        b.teacherId,
      )
    )
      fail(400, "Choose an active teacher.");
    const cid = id();
    run(
      "INSERT INTO classes VALUES(?,?,?)",
      cid,
      text(b.name, 120),
      b.teacherId,
    );
    return { id: cid };
  }
  if (path === "/api/admin/members" && method === "POST") {
    role(u, "admin");
    const b = await body(req);
    if (
      !one("SELECT 1 FROM classes WHERE id=?", b.classId) ||
      !one(
        "SELECT 1 FROM users WHERE id=? AND role='student' AND active=1",
        b.userId,
      )
    )
      fail(400, "Choose a class and an active learner.");
    if (b.remove === true)
      run(
        "DELETE FROM members WHERE class_id=? AND user_id=?",
        b.classId,
        b.userId,
      );
    else run("INSERT OR IGNORE INTO members VALUES(?,?)", b.classId, b.userId);
    return { ok: true };
  }
  if (path === "/api/admin/moderate" && method === "POST") {
    role(u, "admin");
    const b = await body(req);
    if (
      typeof b.approved !== "boolean" ||
      !one("SELECT 1 FROM resources WHERE id=?", b.id)
    )
      fail(400, "Choose a valid resource.");
    run("UPDATE resources SET approved=? WHERE id=?", b.approved ? 1 : 0, b.id);
    return { ok: true };
  }
  if (path === "/api/ai/history" && method === "GET") {
    const lesson = new URL(req.url, "http://localhost").searchParams.get(
      "lesson",
    );
    return lesson
      ? all(
          "SELECT role,body FROM ai_messages WHERE user_id=? AND lesson_id=? ORDER BY rowid DESC LIMIT 30",
          u.id,
          lesson,
        ).reverse()
      : all(
          "SELECT role,body FROM ai_messages WHERE user_id=? AND lesson_id IS NULL ORDER BY rowid DESC LIMIT 30",
          u.id,
        ).reverse();
  }
  if (path === "/api/ai" && method === "POST") {
    role(u, "student", "teacher");
    limit("ai:" + u.id, 8);
    const b = await body(req),
      prompt = text(b.prompt, 2000);
    const history = all(
      "SELECT role,body FROM ai_messages WHERE user_id=? AND lesson_id IS NULL ORDER BY rowid DESC LIMIT 16",
      u.id,
    ).reverse();
    const { text: reply } = await generateWithMetadata({
      context:
        "This is an open-ended conversation. Follow the learner's current question and allow them to change topics. No fixed lesson is selected. Ask for clarification when needed; do not assume access to class materials.",
      prompt,
      history,
      preferences: { readingFocus: !!b.preferences?.readingFocus },
    });
    transaction(() => {
      run(
        "INSERT INTO ai_messages VALUES(?,?,?,?,?,?)",
        id(),
        u.id,
        null,
        "user",
        prompt,
        now(),
      );
      run(
        "INSERT INTO ai_messages VALUES(?,?,?,?,?,?)",
        id(),
        u.id,
        null,
        "assistant",
        reply,
        now(),
      );
    });
    return { reply };
  }

  if (path === "/api/ai/generate" && method === "POST") {
    role(u, "student", "teacher");
    limit("ai:" + u.id, 8);
    const b = await body(req),
      lesson =
        typeof b.lessonId === "string"
          ? one("SELECT * FROM lessons WHERE id=?", b.lessonId)
          : null;
    if (!lesson) fail(400, "Choose a lesson first.");
    const resources = all("SELECT * FROM resources WHERE approved=1")
      .filter(
        (r) =>
          r.class_id &&
          classAllowed(u, r.class_id) &&
          r.subject === lesson.subject,
      )
      .slice(0, 5);
    const context =
      "Introductory lesson: " +
      lesson.title +
      "\n" +
      JSON.parse(lesson.body)
        .map((b) => b.heading + ": " + b.text)
        .join("\n") +
      "\n" +
      resources
        .map(
          (r) => "Teacher material: " + r.title + "\n" + r.body.slice(0, 8000),
        )
        .join("\n");
    if (path === "/api/ai/generate") {
      if (!["deck", "quiz"].includes(b.kind))
        fail(400, "Choose a practice type.");
      const format =
        b.kind === "deck"
          ? '[{"front":"question","back":"answer"}]'
          : '[{"prompt":"question","options":["A","B","C"],"answer":0,"explanation":"why"}]';
      const draft = await generate({
        context,
        prompt:
          "Create 3 concise practice items. Return ONLY a JSON array in this format: " +
          format,
        history: [],
        preferences: {},
      });
      try {
        const items = JSON.parse(
          draft.replace(/^```(?:json)?\s*|\s*```$/g, ""),
        );
        if (!Array.isArray(items) || !items.length || items.length > 30)
          throw new Error();
        return {
          items: validateDraft(b.kind, items),
          source: "AI draft — review before saving",
        };
      } catch {
        fail(
          502,
          "The provider returned a draft we could not read. Please try again.",
        );
      }
    }
  }

  return undefined;
}
