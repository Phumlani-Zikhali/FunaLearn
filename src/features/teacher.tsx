import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Download,
  GraduationCap,
  Plus,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import { api } from "../lib/api";
import type { Progress } from "../lib/types";
import { A, Empty, Heading, useApp, useLoad } from "../shared";
export interface TeacherClass {
  id: string;
  name: string;
  students: { id: string; name: string; email: string; progress: Progress }[];
}
export function ClassSelect({ name = "classId" }: { name?: string }) {
  const { s } = useApp();
  return (
    <label>
      Class
      <select name={name} required>
        {s.classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function TeacherOverview({ classes }: { classes: TeacherClass[] }) {
  const { s } = useApp();
  const students = Array.from(
    new Map(
      classes.flatMap((c) => c.students).map((st) => [st.id, st]),
    ).values(),
  );
  return (
    <>
      <Heading
        eyebrow="HELP EVERY LEARNER FIND THEIR WAY"
        title={`Welcome, ${s.user.name}.`}
      >
        Start with your class. Share a useful resource or make the next step
        clearer.
      </Heading>
      <div className="metric-grid">
        <div className="panel metric">
          <Users />
          <strong>{students.length}</strong>
          <span>Learners in your classes</span>
        </div>
        <div className="panel metric">
          <GraduationCap />
          <strong>{classes.length}</strong>
          <span>Classes</span>
        </div>
        <div className="panel metric">
          <ClipboardList />
          <strong>{s.assignments.length}</strong>
          <span>Shared assignments</span>
        </div>
        <div className="panel metric">
          <BookOpen />
          <strong>{s.resources.length}</strong>
          <span>Teaching resources</span>
        </div>
      </div>
      <div className="two-col">
        <section className="continue-panel">
          <p className="eyebrow">A CLEAR NEXT STEP</p>
          <h2>Bring your teaching into their learning.</h2>
          <p>
            Share notes with your class, then connect them to a lesson or
            practice activity.
          </p>
          <div className="actions">
            <A to="/teacher/resources" className="button primary">
              <Plus size={17} />
              Share a resource
            </A>
            <A to="/teacher/activities" className="button">
              Create practice
            </A>
          </div>
        </section>
        <section className="panel">
          <h2>Your classes</h2>
          {classes.length ? (
            classes.map((c) => (
              <A key={c.id} to="/teacher/classes" className="subject-row">
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.students.length} learners ·{" "}
                    {
                      c.students.filter((st) => st.progress.events.length)
                        .length
                    }{" "}
                    have started learning
                  </small>
                </span>
                <ChevronRight />
              </A>
            ))
          ) : (
            <Empty>
              No classes assigned yet. An administrator can create a class for
              you.
            </Empty>
          )}
        </section>
      </div>
      <section className="panel section">
        <h2>A helpful place to start</h2>
        <p>
          Learning reports show recent practice and ideas worth revisiting. Talk
          with learners about what helps them — a score is only part of their
          story.
        </p>
        <A className="text-link" to="/teacher/reports">
          View class learning <ArrowRight size={17} />
        </A>
      </section>
    </>
  );
}
export function TeacherResources() {
  const { s, refresh, notify } = useApp();
  const [open, setOpen] = useState(false),
    [content, setContent] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Heading title="A foundation for understanding.">
        Share your notes with a class. Approved material also provides context
        for the AI Tutor.
      </Heading>
      <button className="primary" onClick={() => setOpen(true)}>
        <Plus size={18} />
        Share learning material
      </button>
      <div className="hub-list section">
        {s.resources.map((r) => (
          <section className="panel" key={r.id}>
            <p className="eyebrow">
              {r.subject} · {r.approved ? "SHARED" : "HIDDEN BY ADMIN"}
            </p>
            <h2>{r.title}</h2>
            <details>
              <summary>Read material</summary>
              <div
                className="reading-block"
                tabIndex={0}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {r.body}
              </div>
            </details>
          </section>
        ))}
      </div>
      {!s.resources.length && (
        <Empty>No resources shared yet. Add notes or import a text file.</Empty>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="resource-dialog">
          <DialogTitle>Share learning material</DialogTitle>
          <DialogDescription>
            Check the content before sharing. These notes will be visible to
            your class and may ground AI explanations.
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              setError("");
              try {
                await api("/resources", { ...f, body: content });
                await refresh();
                setOpen(false);
                setContent("");
                notify("Resource shared with your class.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Title
              <input name="title" required maxLength={160} />
            </label>
            <ClassSelect />
            <label>
              Subject
              <select name="subject">
                {s.lessons.map((l) => (
                  <option key={l.id}>{l.subject}</option>
                ))}
              </select>
            </label>
            <label>
              Import text notes (.txt or .md)
              <input
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 50000) {
                    setError("Please choose a text file under 50 KB.");
                    return;
                  }
                  if (!/\.(txt|md)$/i.test(file.name)) {
                    setError(
                      "Choose a .txt or .md file. PDF and image extraction is not available yet.",
                    );
                    return;
                  }
                  setContent(await file.text());
                  setError("");
                }}
              />
            </label>
            <label>
              Learning material
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={50000}
                rows={8}
              />
            </label>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" disabled={busy || !s.classes.length}>
              {busy ? "Sharing…" : "Share with class"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export function TeacherAssignments() {
  const { s, refresh, notify } = useApp();
  const [open, setOpen] = useState(false),
    [kind, setKind] = useState("lesson"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const choices =
    kind === "lesson" ? s.lessons : kind === "quiz" ? s.quizzes : s.decks;
  return (
    <>
      <Heading title="One meaningful next step.">
        Assign an existing lesson, quiz or flashcard deck. Completion follows
        the learner’s saved activity.
      </Heading>
      <button className="primary" onClick={() => setOpen(true)}>
        <Plus size={18} />
        Create assignment
      </button>
      <div className="hub-list section">
        {s.assignments.map((a) => (
          <section className="panel list-item" key={a.id}>
            <ClipboardList />
            <div>
              <h2>{a.title}</h2>
              <p className="muted">
                {s.classes.find((c) => c.id === a.class_id)?.name} · {a.kind} ·
                Due {a.due}
              </p>
            </div>
          </section>
        ))}
      </div>
      {!s.assignments.length && (
        <Empty>
          No assignments yet. A small, focused task is a good place to begin.
        </Empty>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="resource-dialog">
          <DialogTitle>Create an assignment</DialogTitle>
          <DialogDescription>
            Keep the title clear and the task manageable.
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await api(
                  "/assignments",
                  Object.fromEntries(new FormData(e.currentTarget)),
                );
                await refresh();
                setOpen(false);
                notify("Assignment shared with your class.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Assignment title
              <input name="title" required maxLength={160} />
            </label>
            <ClassSelect />
            <label>
              Activity type
              <select
                name="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="lesson">Lesson</option>
                <option value="deck">Flashcards</option>
                <option value="quiz">Quiz</option>
              </select>
            </label>
            <label>
              Activity
              <select name="ref" required>
                {choices.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input name="due" type="date" required />
            </label>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button disabled={busy || !s.classes.length} className="primary">
              {busy ? "Saving…" : "Share assignment"}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
export type DraftItem = {
  front: string;
  back: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};
export const blankItem = (): DraftItem => ({
  front: "",
  back: "",
  prompt: "",
  options: ["", "", ""],
  answer: 0,
  explanation: "",
});
export function ActivityStudio() {
  const { s, refresh, notify } = useApp();
  const [kind, setKind] = useState<"deck" | "quiz">("deck"),
    [lesson, setLesson] = useState(s.lessons[0].id),
    [title, setTitle] = useState(""),
    [classId, setClassId] = useState(s.classes[0]?.id || ""),
    [items, setItems] = useState<DraftItem[]>([blankItem()]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [generated, setGenerated] = useState(false),
    [reviewed, setReviewed] = useState(false);
  function update(i: number, key: keyof DraftItem, value: unknown) {
    setItems((prev) =>
      prev.map((v, j) => (i === j ? { ...v, [key]: value } : v)),
    );
    setReviewed(false);
  }
  async function draft() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ items: Partial<DraftItem>[] }>(
        "/ai/generate",
        { kind, lessonId: lesson },
      );
      setItems(result.items.map((i) => ({ ...blankItem(), ...i })));
      setGenerated(true);
      setReviewed(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="SMALL ACTIVITIES, USEFUL PRACTICE"
        title="Create something to learn with."
      >
        Write your own practice, or review an AI draft before it becomes a saved
        activity.
      </Heading>
      <section className="panel studio">
        <div className="two-col">
          <label>
            Activity type
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as "deck" | "quiz");
                setItems([blankItem()]);
                setGenerated(false);
                setReviewed(false);
              }}
            >
              <option value="deck">Flashcard deck</option>
              <option value="quiz">Practice quiz</option>
            </select>
          </label>
          <label>
            Related topic
            <select
              value={lesson}
              onChange={(e) => {
                setLesson(e.target.value);
                setReviewed(false);
              }}
            >
              {s.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.topic}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="actions section">
          <button disabled={busy || !s.aiAvailable} onClick={draft}>
            <Sparkles size={17} />
            {busy ? "Preparing draft…" : "Create AI draft"}
          </button>
          {!s.aiAvailable && (
            <small>
              AI needs a configured provider. You can write your own below.
            </small>
          )}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/activities", {
                kind,
                title,
                lessonId: lesson,
                classId,
                items,
              });
              await refresh();
              setItems([blankItem()]);
              setTitle("");
              setGenerated(false);
              setReviewed(false);
              notify("Activity saved. It is ready for practice.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Activity title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              required
            />
          </label>
          {s.user.role === "teacher" && (
            <label>
              Share with class
              <select
                value={classId}
                required
                onChange={(e) => setClassId(e.target.value)}
              >
                {s.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {generated && (
            <p className="unavailable">
              AI draft: check each fact, answer and explanation against your
              teaching material before saving.
            </p>
          )}
          {items.map((v, i) => (
            <fieldset className="draft-item" key={i}>
              <legend>
                {kind === "deck" ? "Card" : "Question"} {i + 1}
              </legend>
              {kind === "deck" ? (
                <>
                  <label>
                    Front · question
                    <input
                      required
                      value={v.front}
                      onChange={(e) => update(i, "front", e.target.value)}
                      maxLength={1000}
                    />
                  </label>
                  <label>
                    Back · answer
                    <textarea
                      required
                      value={v.back}
                      onChange={(e) => update(i, "back", e.target.value)}
                      maxLength={2000}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Question
                    <input
                      required
                      value={v.prompt}
                      onChange={(e) => update(i, "prompt", e.target.value)}
                      maxLength={1000}
                    />
                  </label>
                  {v.options.map((o, j) => (
                    <label key={j}>
                      Choice {j + 1}
                      <input
                        required
                        value={o}
                        maxLength={500}
                        onChange={(e) =>
                          update(
                            i,
                            "options",
                            v.options.map((old, k) =>
                              j === k ? e.target.value : old,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <label>
                    Correct answer
                    <select
                      value={v.answer}
                      onChange={(e) =>
                        update(i, "answer", Number(e.target.value))
                      }
                    >
                      {v.options.map((_, j) => (
                        <option key={j} value={j}>
                          Choice {j + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Helpful explanation
                    <textarea
                      required
                      value={v.explanation}
                      onChange={(e) => update(i, "explanation", e.target.value)}
                      maxLength={2000}
                    />
                  </label>
                </>
              )}
              {items.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setItems(items.filter((_, j) => i !== j));
                    setReviewed(false);
                  }}
                >
                  Remove unsaved {kind === "deck" ? "card" : "question"}
                </button>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={items.length >= 30}
            onClick={() => {
              setItems([...items, blankItem()]);
              setReviewed(false);
            }}
          >
            <Plus size={18} />
            Add another {kind === "deck" ? "card" : "question"}
          </button>
          <label className="inline-check">
            <input
              type="checkbox"
              required
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I have checked the questions and answers.
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button
            className="primary"
            disabled={
              busy || !reviewed || (s.user.role === "teacher" && !classId)
            }
          >
            {busy ? "Saving…" : "Save reviewed activity"}
          </button>
        </form>
      </section>
    </>
  );
}
export function ClassReports({
  classes,
  reports = false,
}: {
  classes: TeacherClass[];
  reports?: boolean;
}) {
  const { s } = useApp();
  function exportReport() {
    const rows = [
      ["Class", "Learner", "Lessons", "Quizzes", "Learning XP", "Streak"],
      ...classes.flatMap((c) =>
        c.students.map((st) => [
          c.name,
          st.name,
          st.progress.completed.length,
          st.progress.attempts.length,
          st.progress.xp,
          st.progress.streak,
        ]),
      ),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@-]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "funalearn-class-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <>
      <Heading
        title={
          reports ? "Understand their next step." : "Your learning communities."
        }
      >
        Progress comes from learner activity. Private notes and AI conversations
        stay private.
      </Heading>
      {reports && (
        <button onClick={exportReport}>
          <Download size={17} />
          Download class report
        </button>
      )}
      <div className="hub-list section">
        {classes.map((c) => (
          <section key={c.id} className="panel">
            <div className="section-heading">
              <h2>{c.name}</h2>
              <span className="muted">{c.students.length} learners</span>
            </div>
            {!c.students.length && (
              <Empty>
                No learners enrolled yet. An administrator can add class
                members.
              </Empty>
            )}
            {c.students.map((st) => (
              <details key={st.id} className="learner-detail">
                <summary>
                  <span className="avatar">{st.name[0]}</span>
                  <span>
                    <strong>{st.name}</strong>
                    <small>
                      {st.progress.completed.length} lessons ·{" "}
                      {st.progress.attempts.length} quizzes · {st.progress.xp}{" "}
                      XP
                    </small>
                  </span>
                  <ChevronRight size={18} />
                </summary>
                <div className="learner-body">
                  <h3>Recent practice</h3>
                  {st.progress.attempts.length ? (
                    st.progress.attempts.slice(0, 5).map((a) => (
                      <p key={a.id}>
                        {s.quizzes.find((q) => q.id === a.quiz_id)?.title ||
                          "Practice"}
                        : {a.score}/{a.total} ·{" "}
                        {new Date(a.created).toLocaleDateString()}
                      </p>
                    ))
                  ) : (
                    <p>
                      No quiz attempts yet. A conversation about where to start
                      may help.
                    </p>
                  )}
                  <h3>Assignments</h3>
                  {s.assignments
                    .filter((a) => a.class_id === c.id)
                    .map((a) => {
                      const done =
                        a.kind === "lesson"
                          ? st.progress.completed.includes(a.ref)
                          : a.kind === "quiz"
                            ? st.progress.attempts.some(
                                (t) => t.quiz_id === a.ref,
                              )
                            : st.progress.reviewedDecks.includes(a.ref);
                      return (
                        <p key={a.id}>
                          {a.title} ·{" "}
                          {done === null
                            ? "Flashcard review assigned"
                            : done
                              ? "Completed"
                              : "Not completed yet"}
                        </p>
                      );
                    })}
                </div>
              </details>
            ))}
          </section>
        ))}
      </div>
      {!classes.length && <Empty>You have no assigned classes yet.</Empty>}
    </>
  );
}
export function TeacherMessages({ classes }: { classes: TeacherClass[] }) {
  const { notify } = useApp(),
    { value, load } =
      useLoad<
        { id: string; body: string; recipient: string; created: string }[]
      >("/messages");
  const students = Array.from(
    new Map(
      classes.flatMap((c) => c.students).map((st) => [st.id, st]),
    ).values(),
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Heading title="A little encouragement can help.">
        Send a learning note to a learner in your class. It appears with their
        assignments.
      </Heading>
      <div className="two-col">
        <form
          className="panel"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            setBusy(true);
            setError("");
            try {
              await api("/messages", Object.fromEntries(new FormData(form)));
              form.reset();
              await load();
              notify("Your note is saved for the learner.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Learner
            <select name="recipientId" required>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Your note
            <textarea name="body" required maxLength={4000} />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy || !students.length}>
            <Send size={17} />
            {busy ? "Saving…" : "Send learning note"}
          </button>
        </form>
        <section className="panel">
          <h2>Sent notes</h2>
          {value?.length ? (
            value.map((m) => (
              <div className="reading-block" tabIndex={0} key={m.id}>
                <strong>To {m.recipient}</strong>
                <p>{m.body}</p>
                <small>{new Date(m.created).toLocaleDateString()}</small>
              </div>
            ))
          ) : (
            <p className="muted">No notes sent yet.</p>
          )}
        </section>
      </div>
    </>
  );
}
