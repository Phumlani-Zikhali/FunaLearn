import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Flame,
  Layers,
  Leaf,
  Library,
  ListChecks,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Star,
  Sun,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../components/ui/dialog";
import { useAccessibility } from "../lib/accessibility-context";
import { api } from "../lib/api";
import type { Deck, Lesson, Quiz, QuizResult, Resource } from "../lib/types";
import {
  A,
  Empty,
  Heading,
  Icon,
  LoadState,
  ReadAloud,
  useApp,
  useLoad,
} from "../shared";
export function Dashboard() {
  const { s } = useApp();
  const p = s.progress,
    l = s.lessons.find((l) => !p.completed.includes(l.id)) || s.lessons[0],
    due = s.decks.reduce((a, d) => a + d.due, 0);
  return (
    <>
      <Heading
        eyebrow="ONE SMALL STEP IS A GREAT START"
        title={`Hello, ${s.user.name.split(" ")[0]}. Let’s learn.`}
      >
        There’s no rush. Pick up a little knowledge, at your own pace.
      </Heading>
      <div className="dashboard-grid">
        <div>
          <section className="continue-panel">
            <div className="continue-top">
              <span className="pill">
                <Leaf size={15} /> YOUR NEXT STEP
              </span>
              <span className="muted">
                <Clock size={15} /> {l.minutes} min · Untimed
              </span>
            </div>
            <div className="subject-label">
              {l.subject} <span> / </span> {l.topic}
            </div>
            <h2>{l.title}</h2>
            <p>
              Take it one idea at a time. Then give your new knowledge a little
              practice.
            </p>
            <A to={"/student/learn/" + l.id} className="button primary">
              {p.completed.includes(l.id) ? "Revisit lesson" : "Start learning"}
              <ArrowRight size={18} />
            </A>
            <span className="quiet-note">
              Read, listen, or make it your own.
            </span>
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>A little practice goes a long way</h2>
            </div>
            <div className="practice-grid">
              <A to="/student/flashcards" className="practice-card">
                <span className="tile-icon peach">
                  <Layers />
                </span>
                <h3>Make it stick</h3>
                <p>
                  {due} cards ready to revisit.
                  <br />
                  One thought at a time.
                </p>
                <span className="card-link">
                  Review flashcards <ArrowRight size={17} />
                </span>
              </A>
              <A to="/student/quizzes" className="practice-card">
                <span className="tile-icon lavender">
                  <ListChecks />
                </span>
                <h3>See what you know</h3>
                <p>
                  A few questions. Helpful feedback.
                  <br />
                  No ticking clock.
                </p>
                <span className="card-link">
                  Try a quiz <ArrowRight size={17} />
                </span>
              </A>
            </div>
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>Your subjects</h2>
              <A to="/student/subjects">
                Explore all <ArrowRight size={16} />
              </A>
            </div>
            <div className="subject-list">
              {s.lessons.map((l) => (
                <A
                  key={l.id}
                  to={"/student/learn/" + l.id}
                  className="subject-row"
                >
                  <span
                    className={
                      "tile-icon " +
                      (l.subject === "Mathematics"
                        ? "peach"
                        : l.subject === "English"
                          ? "lavender"
                          : "mint")
                    }
                  >
                    <Icon subject={l.subject} />
                  </span>
                  <span>
                    <strong>{l.subject}</strong>
                    <small>{l.topic}</small>
                  </span>
                  <span className="subject-status">
                    {p.completed.includes(l.id) ? (
                      <>
                        <Check size={16} />
                        Lesson complete
                      </>
                    ) : (
                      "Ready when you are"
                    )}
                  </span>
                  <ChevronRight size={19} />
                </A>
              ))}
            </div>
          </section>
        </div>
        <aside className="right-rail">
          <section className="daily-card">
            <span className="tile-icon mint">
              <Sun />
            </span>
            <h2>Your daily little win</h2>
            <p>
              Make room for {s.user.goal} learning{" "}
              {s.user.goal === 1 ? "activity" : "activities"} today.
            </p>
            <div className="goal-number">
              {Math.min(p.today, s.user.goal)}
              <span> / {s.user.goal}</span>
            </div>
            <progress
              value={Math.min(p.today, s.user.goal)}
              max={s.user.goal}
              aria-label="Daily learning goal"
            />
            <p className="small">
              {p.today >= s.user.goal
                ? "You made time for learning. Nicely done."
                : "Every lesson, review and quiz counts."}
            </p>
            <A to="/student/settings" className="text-link">
              Make this goal yours
            </A>
          </section>
          <section className="stats-card">
            <h3>Growing at your pace</h3>
            <div>
              <span>
                <Flame size={20} />
                Learning streak
              </span>
              <strong>
                {p.streak} {p.streak === 1 ? "day" : "days"}
              </strong>
            </div>
            <div>
              <span>
                <Star size={20} />
                Learning XP
              </span>
              <strong>{p.xp} XP</strong>
            </div>
            <A to="/student/progress" className="text-link">
              See your progress <ArrowRight size={16} />
            </A>
          </section>
          <section className="tutor-card">
            <Sparkles size={25} />
            <h3>A different way to understand</h3>
            <p>
              Ask for a simpler explanation, a small example, or a helping hand.
            </p>
            <A to={"/student/ai?lesson=" + l.id} className="button">
              Meet your AI Tutor <ArrowRight size={16} />
            </A>
            {!s.aiAvailable && <small>AI connection not configured yet.</small>}
          </section>
        </aside>
      </div>
    </>
  );
}
export function Hub() {
  const { s } = useApp();
  const [query, setQuery] = useState("");
  const list = s.lessons.filter((l) =>
    (l.title + " " + l.subject + " " + l.topic)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <Heading
        eyebrow="LEARN · UNDERSTAND · PRACTISE"
        title="What would you like to explore?"
      >
        Start with a subject. We’ll take it one idea at a time.
      </Heading>
      <label className="search">
        <Search size={19} />
        <input
          aria-label="Find a topic"
          placeholder="Find a subject or topic…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="hub-list">
        {list.map((l) => (
          <section className="panel hub-item" key={l.id}>
            <span className="tile-icon">
              <Icon subject={l.subject} />
            </span>
            <div>
              <p className="eyebrow">{l.subject}</p>
              <h2>{l.title}</h2>
              <p className="muted">
                {l.topic} · {l.minutes} min ·{" "}
                {s.progress.completed.includes(l.id)
                  ? "Lesson completed"
                  : "Ready to explore"}
              </p>
              <div className="actions">
                <A to={"/student/learn/" + l.id} className="button primary">
                  Open lesson <ArrowRight size={17} />
                </A>
                <A to={"/student/flashcards/" + l.id} className="text-link">
                  Practise with cards
                </A>
              </div>
            </div>
          </section>
        ))}
      </div>
      {!list.length && (
        <Empty>No topics match that search. Try another word.</Empty>
      )}
    </>
  );
}
export function LessonReader({ id }: { id: string }) {
  const { value: l, error, load } = useLoad<Lesson>("/lessons/" + id),
    { s, refresh, notify } = useApp();
  const [note, setNote] = useState(""),
    [chunk, setChunk] = useState(0),
    [simple, setSimple] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setNote(l?.note || "");
  }, [l?.id]);
  if (!l) return <LoadState error={error} retry={load} />;
  const done = s.progress.completed.includes(id);
  return (
    <>
      <A to="/student/subjects" className="text-link">
        ← Learning hub
      </A>
      <Heading eyebrow={l.subject + " / " + l.topic} title={l.title}>
        About {l.minutes} minutes. Stay as long as you need.
      </Heading>
      <div className="reader-layout">
        <article className="panel reader">
          <div className="reader-toolbar">
            <ReadAloud
              text={
                simple
                  ? l.body![chunk].text
                  : l.body!.map((b) => b.heading + ". " + b.text).join("\n")
              }
            />
            <label className="inline-check">
              <input
                type="checkbox"
                checked={simple}
                onChange={(e) => setSimple(e.target.checked)}
              />
              One idea at a time
            </label>
          </div>
          {l.body!.map(
            (b, i) =>
              (!simple || chunk === i) && (
                <section className="reading-block" tabIndex={0} key={b.heading}>
                  <span className="step-label">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2>{b.heading}</h2>
                  <p>{b.text}</p>
                </section>
              ),
          )}
          {simple && (
            <div className="spread">
              <button
                disabled={chunk === 0}
                onClick={() => setChunk(chunk - 1)}
              >
                Previous idea
              </button>
              <span>
                {chunk + 1} of {l.body!.length}
              </span>
              <button
                disabled={chunk === l.body!.length - 1}
                onClick={() => setChunk(chunk + 1)}
              >
                Next idea
              </button>
            </div>
          )}
          <p className="source">{l.source}</p>
          <button
            className="primary"
            disabled={busy || done}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/lessons/" + id + "/complete", {});
                await refresh();
                notify("Lesson saved. That’s another step forward.");
              } catch (e) {
                notify((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <CheckCircle2 size={18} />
            {done
              ? "Lesson completed"
              : busy
                ? "Saving…"
                : "Mark lesson complete"}
          </button>
        </article>
        <aside className="reader-aside">
          <section className="panel">
            <h2>Make it your own</h2>
            <p className="muted small">
              Write an idea, a question, or a reminder. These notes are private.
            </p>
            <label>
              Your notes
              <textarea
                value={note}
                maxLength={10000}
                onChange={(e) => setNote(e.target.value)}
                placeholder="In my own words…"
              />
            </label>
            <button
              onClick={async () => {
                try {
                  await api("/lessons/" + id + "/note", { body: note });
                  notify("Your note is saved.");
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Save note
            </button>
          </section>
          <section className="panel">
            <h2>Keep the idea going</h2>
            <div className="next-links">
              <A to={"/student/flashcards/" + id}>
                <Layers />
                Practise with flashcards <ChevronRight />
              </A>
              <A to={"/student/quizzes/" + id}>
                <ListChecks />
                Try a short quiz <ChevronRight />
              </A>
              <A to={"/student/ai?lesson=" + id}>
                <Sparkles />
                Ask for a different explanation <ChevronRight />
              </A>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
export function PracticeList({ type }: { type: "deck" | "quiz" }) {
  const { s } = useApp();
  const cards = type === "deck";
  return (
    <>
      <Heading
        eyebrow={
          cards
            ? "A LITTLE RECALL, A LASTING MEMORY"
            : "PRACTICE WITHOUT PRESSURE"
        }
        title={
          cards ? "Make your learning stick." : "Let’s see what’s making sense."
        }
      >
        {cards
          ? "Try to remember first. Reveal the answer when you’re ready."
          : "No timer. Just you, a few questions, and a helpful next step."}
      </Heading>
      <A to="/student/create" className="button section">
        <Plus size={17} />
        Create your own practice
      </A>
      <div className="hub-list section">
        {(cards ? s.decks : s.quizzes).map((v) => (
          <section className="panel list-item" key={v.id}>
            <span className={"tile-icon " + (cards ? "peach" : "lavender")}>
              {cards ? <Layers /> : <ListChecks />}
            </span>
            <div>
              <h2>{v.title}</h2>
              <p className="muted">
                {v.count} {cards ? "cards" : "questions"}
                {cards
                  ? " · " + (v as Deck).due + " ready for review"
                  : " · Untimed practice"}
              </p>
            </div>
            <A
              to={"/student/" + (cards ? "flashcards/" : "quizzes/") + v.id}
              className="button"
            >
              {cards ? "Open deck" : "Start quiz"}
              <ArrowRight size={17} />
            </A>
          </section>
        ))}
      </div>
    </>
  );
}
export function Flashcards({ id }: { id: string }) {
  const { value: d, error, load } = useLoad<Deck>("/decks/" + id),
    { refresh, notify } = useApp();
  const [i, setI] = useState(0),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [practice, setPractice] = useState(false),
    [queue, setQueue] = useState<NonNullable<Deck["cards"]>>([]);
  useEffect(() => {
    if (d)
      setQueue(
        d.cards!.filter((c) => !c.due || c.due <= new Date().toISOString()),
      );
  }, [d]);
  if (!d) return <LoadState error={error} retry={load} />;
  const c = queue[i];
  async function rate(confidence: string) {
    setBusy(true);
    try {
      if (!practice) await api("/cards/" + c.id + "/review", { confidence });
      setI(i + 1);
      setRevealed(false);
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <A to="/student/flashcards" className="text-link">
        ← All flashcards
      </A>
      <Heading eyebrow="THINK · REVEAL · REFLECT" title={d.title}>
        {practice
          ? "Extra practice — your saved review schedule stays the same."
          : "A small challenge for your memory. Take your time."}
      </Heading>
      {c ? (
        <div className="study-wrap">
          <div className="spread">
            <span>
              Card {i + 1} of {queue.length}
            </span>
            <span className="pill">
              {practice ? "EXTRA PRACTICE" : "DUE REVIEW"}
            </span>
          </div>
          <progress
            value={i}
            max={queue.length}
            aria-label="Flashcard review progress"
          />
          <div className="flashcard reading-block" tabIndex={0}>
            <p className="eyebrow">{revealed ? "THE ANSWER" : "YOUR TURN"}</p>
            <h2>{c.front}</h2>
            {revealed ? (
              <p className="answer">{c.back}</p>
            ) : (
              <p className="muted">
                Try answering in your own words before you turn the card.
              </p>
            )}
            <ReadAloud text={revealed ? c.front + ". " + c.back : c.front} />
          </div>
          {!revealed ? (
            <button className="primary wide" onClick={() => setRevealed(true)}>
              Reveal answer <RotateCcw size={18} />
            </button>
          ) : (
            <>
              <p className="center muted">How did that feel?</p>
              <div className="confidence">
                <button disabled={busy} onClick={() => rate("again")}>
                  Still learning<small>In 10 minutes</small>
                </button>
                <button disabled={busy} onClick={() => rate("hard")}>
                  Almost there<small>Tomorrow</small>
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => rate("good")}
                >
                  Got it<small>In a few days</small>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <section className="panel completion">
          <CheckCircle2 size={44} />
          <h2>
            {i ? "A little more knowledge, remembered." : "You’re up to date."}
          </h2>
          <p>
            Your next review is scheduled. You can take a break or keep
            practising.
          </p>
          <div className="actions">
            <A
              to={"/student/quizzes/" + (d.lesson_id || id)}
              className="button primary"
            >
              Try a related quiz
            </A>
            <button
              onClick={() => {
                setPractice(true);
                setQueue(d.cards || []);
                setI(0);
                setRevealed(false);
              }}
            >
              Extra practice
            </button>
            <A to="/student/progress" className="text-link">
              See my progress
            </A>
          </div>
        </section>
      )}
    </>
  );
}
export function QuizPlayer({ id }: { id: string }) {
  const { value: q, error, load } = useLoad<Quiz>("/quizzes/" + id),
    { refresh, notify } = useApp();
  const [i, setI] = useState(0),
    [answers, setAnswers] = useState<number[]>([]),
    [result, setResult] = useState<QuizResult | null>(null),
    [busy, setBusy] = useState(false),
    [attempt, setAttempt] = useState(() => crypto.randomUUID());
  useEffect(() => {
    const saved = new URLSearchParams(location.search).get("attempt");
    if (saved)
      api<QuizResult>("/attempts/" + encodeURIComponent(saved))
        .then(setResult)
        .catch((e) => notify(e.message));
  }, [id]);
  // Announce the next step by moving keyboard focus to its heading.
  useEffect(() => {
    document
      .getElementById(result ? "quiz-feedback" : "quiz-question")
      ?.focus();
  }, [i, q?.id, result]);
  if (!q) return <LoadState error={error} retry={load} />;
  const question = q.questions![i];
  async function submit() {
    setBusy(true);
    try {
      setResult(
        await api<QuizResult>("/quizzes/" + id + "/submit", {
          answers,
          attemptId: attempt,
        }),
      );
      await refresh();
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <A to="/student/quizzes" className="text-link">
        ← All quizzes
      </A>
      <Heading eyebrow="NO TIMER. ROOM TO THINK." title={q.title}>
        {result
          ? "Every answer helps you find your next step."
          : "Choose the answer that makes the most sense to you."}
      </Heading>
      {result ? (
        <>
          <section
            className="panel result-heading"
            id="quiz-feedback"
            tabIndex={-1}
          >
            <span className="tile-icon mint">
              <CheckCircle2 />
            </span>
            <h2>
              Practice complete: {result.score} of {result.total}
            </h2>
            <p>
              {result.score === result.total
                ? "These ideas are coming together."
                : "Let’s revisit the ideas that need a little more practice."}
            </p>
            <div className="actions">
              <A to={"/student/learn/" + q.lesson_id} className="button">
                Revisit the lesson
              </A>
              <A
                to={"/student/flashcards/" + q.lesson_id}
                className="button primary"
              >
                Practise these ideas
              </A>
              <button
                onClick={() => {
                  setResult(null);
                  setI(0);
                  setAnswers([]);
                  setAttempt(crypto.randomUUID());
                }}
              >
                Try again
              </button>
            </div>
          </section>
          <div className="feedback-list">
            {result.result.map((r, j) => (
              <section className="panel reading-block" tabIndex={0} key={r.id}>
                <p className="eyebrow">
                  {r.correct ? "✓ MAKING SENSE" : "↻ LET’S TAKE ANOTHER LOOK"}
                </p>
                <h2>
                  {j + 1}. {r.prompt}
                </h2>
                <p>Your answer: {r.options[r.chosen!]}</p>
                {!r.correct && (
                  <p>
                    <strong>Answer: {r.options[r.answer!]}</strong>
                  </p>
                )}
                <p className="explanation">{r.explanation}</p>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="study-wrap">
          <div className="spread">
            <span>
              Question {i + 1} of {q.questions!.length}
            </span>
            <span className="muted">Take your time</span>
          </div>
          <progress
            value={i}
            max={q.questions!.length}
            aria-label="Quiz progress"
          />
          <section className="panel question">
            <div className="reading-block" tabIndex={0}>
              <h2 id="quiz-question" tabIndex={-1}>
                {question.prompt}
              </h2>
            </div>
            <ReadAloud
              text={question.prompt + ". " + question.options.join(". ")}
            />
            <fieldset>
              <legend className="sr-only">Choose an answer</legend>
              {question.options.map((o, j) => (
                <label
                  className={
                    "answer-option " + (answers[i] === j ? "selected" : "")
                  }
                  key={j}
                >
                  <input
                    type="radio"
                    name={question.id}
                    checked={answers[i] === j}
                    onChange={() => {
                      const next = [...answers];
                      next[i] = j;
                      setAnswers(next);
                    }}
                  />
                  <span>{o}</span>
                </label>
              ))}
            </fieldset>
            <div className="spread">
              <button disabled={!i || busy} onClick={() => setI(i - 1)}>
                Previous
              </button>
              {i < q.questions!.length - 1 ? (
                <button
                  className="primary"
                  disabled={answers[i] === undefined}
                  onClick={() => setI(i + 1)}
                >
                  Next question <ArrowRight size={17} />
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={busy || answers[i] === undefined}
                  onClick={submit}
                >
                  {busy ? "Saving practice…" : "Finish & see feedback"}
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export function ProgressPage() {
  const { s } = useApp(),
    p = s.progress;
  return (
    <>
      <Heading
        eyebrow="YOUR JOURNEY, YOUR PACE"
        title="Look how you’re growing."
      >
        This is your own progress. Every number comes from your saved learning.
      </Heading>
      <div className="metric-grid">
        {[
          [p.xp, "Learning XP", Star],
          [p.completed.length, "Lessons completed", BookOpen],
          [p.streak, "Day learning streak", Flame],
          [p.attempts.length, "Quizzes practised", ListChecks],
        ].map(([n, l, I]) => {
          const Comp = I as typeof Star;
          return (
            <div className="panel metric" key={l as string}>
              <Comp />
              <strong>{n as number}</strong>
              <span>{l as string}</span>
            </div>
          );
        })}
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Ideas to revisit</h2>
          {p.attempts
            .filter(
              (a, i, arr) =>
                arr.findIndex((b) => b.quiz_id === a.quiz_id) === i &&
                a.score < a.total,
            )
            .map((a) => (
              <A
                className="subject-row"
                key={a.id}
                to={
                  "/student/learn/" +
                  (s.quizzes.find((q) => q.id === a.quiz_id)?.lesson_id ||
                    a.quiz_id)
                }
              >
                <span>
                  <strong>
                    {s.quizzes.find((q) => q.id === a.quiz_id)?.title}
                  </strong>
                  <small>
                    Last practice: {a.score} of {a.total} · Revisit the
                    explanation
                  </small>
                </span>
                <ArrowRight />
              </A>
            ))}
          {!p.attempts.some((a) => a.score < a.total) && (
            <p className="muted">
              As you practise, the ideas that could use another look will appear
              here.
            </p>
          )}
          <h2 className="section">Personal milestones</h2>
          <div className="badges">
            {p.badges.map((b) => (
              <div
                key={b.name}
                className={"badge-item " + (b.earned ? "earned" : "")}
              >
                <span className="tile-icon">
                  {b.earned ? <CheckCircle2 /> : <Target />}
                </span>
                <div>
                  <strong>{b.name}</strong>
                  <small>
                    {b.description} · {b.earned ? "Earned" : "Keep exploring"}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Your learning story</h2>
          {!p.events.length ? (
            <Empty>
              Your first step belongs here. Start a lesson when you’re ready.
            </Empty>
          ) : (
            p.events.slice(0, 15).map((e) => (
              <div className="activity-row" key={e.id}>
                <span className="activity-dot">
                  <Check size={14} />
                </span>
                <div>
                  <strong>{e.title}</strong>
                  <small>
                    {new Date(e.created).toLocaleDateString()} · +{e.xp} XP
                  </small>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
      <section className="panel section">
        <h2>Quiz history</h2>
        {p.attempts.length ? (
          p.attempts.map((a) => (
            <A
              to={"/student/quizzes/" + a.quiz_id + "?attempt=" + a.id}
              className="spread history"
              key={a.id}
            >
              <span>
                {s.quizzes.find((q) => q.id === a.quiz_id)?.title || "Practice"}
              </span>
              <span>
                {a.score}/{a.total} · {new Date(a.created).toLocaleDateString()}
              </span>
              <span className="text-link">
                Review feedback <ChevronRight size={16} />
              </span>
            </A>
          ))
        ) : (
          <p className="muted">Your completed quizzes will appear here.</p>
        )}
      </section>
    </>
  );
}
export function Resources() {
  const { s } = useApp();
  const [chosen, setChosen] = useState<Resource | null>(null);
  return (
    <>
      <Heading
        eyebrow="A PLACE FOR YOUR LEARNING MATERIAL"
        title="Your resources"
      >
        Teacher material is available here when it’s shared with your class.
      </Heading>
      {!s.resources.length ? (
        <Empty>
          No class resources yet. Your learning hub already has lessons to
          explore.
        </Empty>
      ) : (
        <div className="hub-list">
          {s.resources.map((r) => (
            <button
              className="panel list-item resource-button"
              key={r.id}
              onClick={() => setChosen(r)}
            >
              <Library />
              <span>
                <strong>{r.title}</strong>
                <small>
                  {r.subject} · {r.author}
                </small>
              </span>
              <ChevronRight />
            </button>
          ))}
        </div>
      )}
      <A to="/student/subjects" className="button section">
        Explore the learning hub
      </A>
      <Dialog
        open={!!chosen}
        onOpenChange={(v) => {
          if (!v) setChosen(null);
        }}
      >
        <DialogContent className="resource-dialog">
          <DialogTitle>{chosen?.title}</DialogTitle>
          <DialogDescription>
            {chosen?.subject} · Shared by {chosen?.author}
          </DialogDescription>
          <div
            className="reading-block"
            tabIndex={0}
            style={{ whiteSpace: "pre-wrap" }}
          >
            {chosen?.body}
          </div>
          <ReadAloud text={chosen?.body || ""} />
        </DialogContent>
      </Dialog>
    </>
  );
}
export function Assignments() {
  const { s } = useApp();
  return (
    <>
      <Heading eyebrow="ONE THING AT A TIME" title="Learning from your teacher">
        A simple list of what’s next. Your completed work is saved
        automatically.
      </Heading>
      {!s.assignments.length ? (
        <Empty>
          Nothing assigned yet. You can keep exploring your subjects.
        </Empty>
      ) : (
        <div className="hub-list">
          {s.assignments.map((a) => (
            <section className="panel list-item" key={a.id}>
              <span className="tile-icon">
                {a.completed ? <CheckCircle2 /> : <ClipboardList />}
              </span>
              <div>
                <h2>{a.title}</h2>
                <p className="muted">
                  Due {a.due} ·{" "}
                  {a.completed
                    ? "Completed"
                    : a.kind === "deck"
                      ? "Flashcard review"
                      : a.kind + " practice"}
                </p>
              </div>
              <A
                className="button"
                to={
                  "/student/" +
                  (a.kind === "lesson"
                    ? "learn"
                    : a.kind === "quiz"
                      ? "quizzes"
                      : "flashcards") +
                  "/" +
                  a.ref
                }
              >
                {a.completed ? "Revisit" : "Open activity"}
                <ArrowRight size={17} />
              </A>
            </section>
          ))}
        </div>
      )}
      <StudentMessages />
    </>
  );
}
export function StudentMessages() {
  const { value, load } =
    useLoad<{ id: string; body: string; sender: string; created: string }[]>(
      "/messages",
    );
  return (
    <section className="panel section">
      <h2>Messages from your teacher</h2>
      {value?.length ? (
        value.map((m) => (
          <div className="reading-block" tabIndex={0} key={m.id}>
            <strong>{m.sender}</strong>
            <p>{m.body}</p>
            <small>{new Date(m.created).toLocaleDateString()}</small>
          </div>
        ))
      ) : (
        <p className="muted">No messages yet.</p>
      )}
      <button className="text-button" onClick={load}>
        Refresh messages
      </button>
    </section>
  );
}
export function SettingsPage() {
  const { s, refresh, notify } = useApp();
  return (
    <>
      <Heading title="A space that fits you." />
      <section className="panel narrow">
        <h2>Your learning preferences</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await api("/profile", { name: f.name, goal: Number(f.goal) });
              await refresh();
              notify("Your preferences are saved.");
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          <label>
            Your name
            <input
              name="name"
              defaultValue={s.user.name}
              required
              maxLength={80}
            />
          </label>
          <label>
            Daily activity goal
            <select name="goal" defaultValue={s.user.goal}>
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1} {i ? "activities" : "activity"}
                </option>
              ))}
            </select>
          </label>
          <button className="primary">Save preferences</button>
        </form>
        <p className="muted section">
          Use “Make it yours” at the top of any page for reading font, spacing,
          contrast and focus tools.
        </p>
        <p className="source">
          {
            "Your account and learning records are saved in this local FunaLearn installation."
          }
        </p>
      </section>
    </>
  );
}
export function Tutor() {
  const { s } = useApp();
  const { settings } = useAccessibility();
  const [input, setInput] = useState(""),
    [messages, setMessages] = useState<{ role: string; body: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ role: string; body: string }[]>("/ai/history")
      .then(setMessages)
      .catch((e) => setError(e.message));
  }, []);
  async function send(prompt: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ reply: string }>("/ai", {
        prompt,
        preferences: {
          shortChunks: true,
          font: settings.fontFamily,
          readingFocus: settings.readingFocus,
        },
      });
      setMessages((m) => [
        ...m,
        { role: "user", body: prompt },
        { role: "assistant", body: r.reply },
      ]);
      setInput("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        eyebrow="A LITTLE HELP, A DIFFERENT PERSPECTIVE"
        title="Let’s make sense of it together."
      >
        Ask a question, try an example, or break an idea into smaller steps.
      </Heading>
      <div className="tutor-layout">
        <section className="panel chat-panel">
          <p className="source">
            Ask about anything you want to understand. You can change topics
            whenever you like. Your conversation is saved privately to your
            account.
          </p>
          {!s.aiAvailable && (
            <div className="unavailable">
              <Sparkles />
              <h2>Your AI Tutor isn’t connected yet.</h2>
              <p>
                You can still learn with saved lessons, flashcards and quizzes.
                Add a provider in the server configuration to enable AI.
              </p>
              <div className="actions">
                <A
                  className="button"
                  to={
                    s.user.role === "teacher"
                      ? "/teacher/resources"
                      : "/student/subjects"
                  }
                >
                  {s.user.role === "teacher"
                    ? "Open teaching resources"
                    : "Open lesson"}
                </A>
                <button
                  onClick={() => send("Help me choose something to learn.")}
                >
                  Check connection
                </button>
              </div>
            </div>
          )}
          <div className="chat-history" aria-live="polite">
            {messages.map((m, i) => (
              <div className={"chat-message " + m.role} key={i}>
                <strong>{m.role === "user" ? "You" : "FunaLearn Tutor"}</strong>
                <div className="reading-block" tabIndex={0}>
                  {m.body.split("\n\n").map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
                {m.role === "assistant" && <ReadAloud text={m.body} />}
              </div>
            ))}
          </div>
          {busy && <p role="status">Your tutor is thinking…</p>}
          {error && (
            <div role="alert" className="error">
              {error}
              <button
                onClick={() =>
                  send(input || "Help me choose something to learn.")
                }
              >
                Try again
              </button>
            </div>
          )}
          <div className="chips">
            {[
              "Help me make a study plan",
              "How can I remember what I learn?",
              "Let’s explore something new",
              "Ask me a practice question",
            ].map((p) => (
              <button
                key={p}
                disabled={busy || !s.aiAvailable}
                onClick={() => send(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) void send(input);
            }}
          >
            <label>
              Your question
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2000}
                placeholder="Ask a question or start a conversation…"
                required
              />
            </label>
            <button className="primary" disabled={busy || !s.aiAvailable}>
              <Send size={17} />
              Ask your tutor
            </button>
          </form>
        </section>
        <aside className="panel tutor-tips">
          <Sparkles />
          <h2>One idea at a time</h2>
          <p>
            Try “I understand the first step, but why does the next one work?”
          </p>
          <p>
            Your tutor can make an explanation shorter or show a different
            example.
          </p>
          <A
            className="button"
            to={
              s.user.role === "teacher"
                ? "/teacher/activities"
                : "/student/flashcards"
            }
          >
            <Layers size={18} />
            {s.user.role === "teacher"
              ? "Create practice"
              : "Practise with cards"}
          </A>
          <A
            className="button"
            to={
              s.user.role === "teacher"
                ? "/teacher/assignments"
                : "/student/quizzes"
            }
          >
            <ListChecks size={18} />
            {s.user.role === "teacher"
              ? "Plan an assignment"
              : "Try a saved quiz"}
          </A>
        </aside>
      </div>
    </>
  );
}
