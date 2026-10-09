import { JoinClass, StudentMessages, ClassInvites } from "./features/classes";
import { Leaderboard, Badges } from "./features/achievements";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Leaf,
  Library,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  Award,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ReadingRuler } from "./components/reading-ruler";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./components/ui/dialog";
import { Switch } from "./components/ui/switch";
import {
  AdminClasses,
  AdminData,
  AdminResources,
  AdminUsers,
} from "./features/admin";
import {
  Assignments,
  Dashboard,
  Flashcards,
  Hub,
  LessonReader,
  PracticeList,
  ProgressPage,
  QuizPlayer,
  Resources,
  SettingsPage,
  Tutor,
} from "./features/student";
import {
  ActivityStudio,
  ClassReports,
  TeacherAssignments,
  TeacherClass,
  TeacherMessages,
  TeacherOverview,
  TeacherResources,
} from "./features/teacher";
import { useAccessibility } from "./lib/accessibility-context";
import { api } from "./lib/api";
import type { State } from "./lib/types";
import { registerLearningTools } from "./lib/webmcp";
import { A, Context, Heading, LoadState, useApp, useLoad } from "./shared";
export function App() {
  const path = useRouterState({ select: (s) => s.location.pathname }),
    navigate = useNavigate();
  const [s, setS] = useState<State | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [access, setAccess] = useState(false),
    [mobile, setMobile] = useState(false),
    [joinDismissed, setJoinDismissed] = useState(false),
    [setupRequired, setSetupRequired] = useState(false);
  const { settings } = useAccessibility();
  useEffect(registerLearningTools, []);
  const refresh = async () => {
    try {
      setS(await api<State>("/state"));
      setSetupRequired(false);
      setError("");
    } catch (e) {
      if ((e as { status: number }).status === 401) setS(null);
      else setError((e as Error).message);
    } finally {
      setReady(true);
    }
  };
  useEffect(() => {
    void refresh();
    api<{ setupRequired: boolean }>("/health")
      .then((h) => setSetupRequired(h.setupRequired))
      .catch(() => {});
  }, []);
  useEffect(() => {
    setMobile(false);
    document.title =
      "FunaLearn • " +
      (path.split("/").filter(Boolean).at(-1) || "Your learning space");
    document.getElementById("main-content")?.focus();
    window.speechSynthesis?.cancel();
  }, [path]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (s && (path === "/" || path === "/login"))
      void navigate({ to: "/" + s.user.role });
  }, [s?.user.id, path]);
  if (!ready)
    return (
      <div className="loading" role="status">
        Opening your learning space…
      </div>
    );
  if (!s)
    return (
      <Login setupRequired={setupRequired} onLogin={refresh} error={error} />
    );
  const role = s.user.role,
    base = "/" + role;
  const nav =
    role === "student"
      ? [
          [base, "My learning", LayoutDashboard],
          [base + "/subjects", "Learning hub", BookOpen],
          [base + "/flashcards", "Flashcards", Layers],
          [base + "/quizzes", "Quizzes", ListChecks],
          [base + "/ai", "AI Tutor", Sparkles],
          [base + "/progress", "My progress", TrendingUp],
          [base + "/badges", "My badges", Award],
          [base + "/leaderboard", "Leaderboard", Trophy],
          [base + "/resources", "My resources", Library],
          [base + "/assignments", "Assignments", ClipboardList],
          [base + "/messages", "Messages", MessageSquare],
        ]
      : role === "teacher"
        ? [
            [base, "Overview", LayoutDashboard],
            [base + "/classes", "My classes", Users],
            [base + "/resources", "Resources", Library],
            [base + "/assignments", "Assignments", ClipboardList],
            [base + "/activities", "Activity studio", Layers],
            [base + "/reports", "Learning reports", TrendingUp],
            [base + "/leaderboard", "Leaderboard", Trophy],
            [base + "/messages", "Messages", MessageSquare],
            [base + "/ai", "AI assistant", Sparkles],
          ]
        : [
            [base, "Overview", LayoutDashboard],
            [base + "/users", "People", Users],
            [base + "/leaderboard", "Leaderboard", Trophy],
            [base + "/classes", "Classes", GraduationCap],
            [base + "/resources", "Resource review", Library],
          ];
  return (
    <Context.Provider value={{ s, refresh, notify: setNotice }}>
      <a className="skip" href="#main-content">
        Skip to learning content
      </a>
      <div className="app">
        <aside className={"sidebar " + (mobile ? "open" : "")}>
          <A to={base} className="brand">
            <span className="brand-icon">
              <BookOpen size={23} />
            </span>
            Funa<span>Learn</span>
          </A>
          <div className="space-label">
            YOUR{" "}
            {role === "student"
              ? "LEARNING"
              : role === "teacher"
                ? "TEACHING"
                : "SCHOOL"}{" "}
            SPACE
          </div>
          <nav aria-label="Main navigation">
            {nav.map(([to, label, I]) => {
              const Comp = I as typeof BookOpen;
              return (
                <A
                  key={to as string}
                  to={to as string}
                  className={
                    "nav-link " +
                    (path === to ||
                    (to !== base && path.startsWith((to as string) + "/"))
                      ? "active"
                      : "")
                  }
                >
                  <Comp size={20} />
                  <span>{label as string}</span>
                </A>
              );
            })}
          </nav>
          <div className="sidebar-bottom">
            <div className="gentle secondary">
              <Leaf size={21} />
              <p>
                Little steps.
                <br />
                <strong>Real progress.</strong>
              </p>
            </div>
            <A to={base + "/settings"} className="nav-link">
              <Settings size={20} />
              Settings
            </A>
            <button
              className="profile"
              aria-label={"Sign out of " + s.user.name + " account"}
              onClick={async () => {
                await api("/auth/logout", {});
                setS(null);
                setJoinDismissed(false);
                void navigate({ to: "/login" });
              }}
            >
              <span className="avatar">{s.user.name[0]}</span>
              <span>
                <strong>{s.user.name}</strong>
                <small>{role}</small>
              </span>
              <LogOut size={17} />
            </button>
          </div>
        </aside>
        <div className="main-wrap">
          <header className="topbar">
            <button
              className="icon-button mobile-menu"
              aria-label={mobile ? "Close navigation" : "Open navigation"}
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
            <span className="breadcrumb">
              Your space <ChevronRight size={15} />{" "}
              <strong>
                {(nav.find((v) => v[0] === path)?.[1] as string) ||
                  "Keep learning"}
              </strong>
            </span>
            <div className="top-actions">
              <button className="access-button" onClick={() => setAccess(true)}>
                <Accessibility size={19} />
                <span>Make it yours</span>
              </button>
            </div>
          </header>
          {error && (
            <div role="alert" className="error">
              {error} <button onClick={refresh}>Retry</button>
            </div>
          )}
          <main
            id="main-content"
            tabIndex={-1}
            className={"content overlay-" + settings.colorOverlay}
          >
            {!path.startsWith(base) ? (
              <>
                <Heading title="This space belongs to another role." />
                <A to={base} className="button">
                  Return to your space
                </A>
              </>
            ) : (
              <Routes path={path} />
            )}
          </main>
          <footer className="footer">
            Learn in your own way. At your own pace.
            <span>FunaLearn</span>
          </footer>
        </div>
      </div>
      <Dialog
        open={
          s.user.role === "student" && s.classes.length === 0 && !joinDismissed
        }
        onOpenChange={(open) => {
          if (!open) setJoinDismissed(true);
        }}
      >
        <DialogContent>
          <DialogTitle>Find your learning community</DialogTitle>
          <DialogDescription>
            Join your class now, or do this later from Messages.
          </DialogDescription>
          <JoinClass onJoined={() => setJoinDismissed(true)} />
          <button onClick={() => setJoinDismissed(true)}>
            I'll join later
          </button>
        </DialogContent>
      </Dialog>
      <AccessibilitySettings open={access} setOpen={setAccess} />
      {settings.readingRuler && <ReadingRuler />}
      <div className="toast" role="status" aria-live="polite">
        {notice && (
          <span>
            <CheckCircle2 size={18} />
            {notice}
          </span>
        )}
      </div>
    </Context.Provider>
  );
}
function Login({
  setupRequired,
  onLogin,
  error,
}: {
  setupRequired: boolean;
  onLogin: () => Promise<void>;
  error: string;
}) {
  const [register, setRegister] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const creating = register || setupRequired;
  return (
    <main className="login">
      <div className="brand">
        <span className="brand-icon">
          <BookOpen />
        </span>
        FunaLearn
      </div>
      <div className="login-card">
        <p className="eyebrow">A LITTLE MORE UNDERSTANDING, EVERY DAY</p>
        <h1>
          Your learning.
          <br />
          Your way.
        </h1>
        <p className="muted">
          A calm space to understand, practise and keep going.
        </p>
        {setupRequired && (
          <p className="gentle">
            Welcome to FunaLearn. Create the first administrator account to
            manage your school. Later accounts start as learners.
          </p>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage("");
            const values = Object.fromEntries(new FormData(e.currentTarget));
            try {
              await api("/auth/" + (creating ? "register" : "login"), values);
              await onLogin();
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {creating && (
            <label>
              Your name
              <input name="name" required maxLength={80} autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              required
              minLength={creating ? 12 : 1}
              maxLength={200}
              autoComplete={creating ? "new-password" : "current-password"}
            />
            {creating && <small>At least 12 characters.</small>}
          </label>
          {(message || error) && (
            <p className="error" role="alert">
              {message || error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "One moment…"
              : creating
                ? setupRequired
                  ? "Create administrator account"
                  : "Create learner account"
                : "Sign in"}
            <ArrowRight size={17} />
          </button>
        </form>
        {!setupRequired && (
          <button
            className="text-button"
            onClick={() => setRegister(!register)}
          >
            {register
              ? "Already have an account? Sign in"
              : "New here? Create a learner account"}
          </button>
        )}
      </div>
    </main>
  );
}
function Routes({ path }: { path: string }) {
  const { s } = useApp();
  if (path === "/student/messages") return <StudentMessages />;
  if (path.endsWith("/leaderboard")) return <Leaderboard />;
  if (path === "/student/badges") return <Badges />;
  if (path.endsWith("/settings")) return <SettingsPage />;
  if (path.endsWith("/ai")) return <Tutor />;
  if (s.user.role === "teacher") return <Teacher path={path} />;
  if (s.user.role === "admin") return <Admin path={path} />;
  if (path === "/student") return <Dashboard />;
  if (path === "/student/create") return <ActivityStudio />;
  if (path === "/student/subjects") return <Hub />;
  if (path.startsWith("/student/learn/"))
    return <LessonReader key={path} id={path.split("/").at(-1)!} />;
  if (path === "/student/flashcards") return <PracticeList type="deck" />;
  if (path.startsWith("/student/flashcards/"))
    return <Flashcards key={path} id={path.split("/").at(-1)!} />;
  if (path === "/student/quizzes") return <PracticeList type="quiz" />;
  if (path.startsWith("/student/quizzes/"))
    return <QuizPlayer key={path} id={path.split("/").at(-1)!} />;
  if (path === "/student/progress") return <ProgressPage />;
  if (path === "/student/resources") return <Resources />;
  if (path === "/student/assignments") return <Assignments />;
  return (
    <>
      <Heading title="Let’s find your learning space." />
      <A to="/student" className="button">
        Back to my learning
      </A>
    </>
  );
}
function AccessibilitySettings({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const { settings, setSetting, reset } = useAccessibility();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="access-dialog">
        <DialogTitle>Make this space yours</DialogTitle>
        <DialogDescription>
          Choose what feels comfortable. Your preferences apply to learning
          content everywhere.
        </DialogDescription>
        <label>
          Reading font
          <select
            value={settings.fontFamily}
            onChange={(e) =>
              setSetting(
                "fontFamily",
                e.target.value as typeof settings.fontFamily,
              )
            }
          >
            <option value="default">Nunito · default</option>
            <option value="lexend">Lexend</option>
            <option value="opendyslexic">OpenDyslexic</option>
          </select>
        </label>
        {(
          [
            ["fontSize", "Text size", 16, 24, 1],
            ["lineSpacing", "Line spacing", 1.4, 2, 0.1],
            ["letterSpacing", "Letter spacing", 0, 0.16, 0.02],
          ] as const
        ).map(([key, label, min, max, step]) => (
          <label key={key}>
            {label} <span>{settings[key]}</span>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={settings[key]}
              onChange={(e) => setSetting(key, Number(e.target.value))}
            />
          </label>
        ))}
        <label>
          Reading tint
          <select
            value={settings.colorOverlay}
            onChange={(e) =>
              setSetting(
                "colorOverlay",
                e.target.value as typeof settings.colorOverlay,
              )
            }
          >
            {["none", "cream", "blue", "green", "pink"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {(
          [
            ["darkMode", "Dark mode"],
            ["highContrast", "High contrast"],
            ["readingFocus", "Focus on one paragraph"],
            ["readingRuler", "Reading ruler"],
            ["simpleMode", "Simple mode"],
          ] as const
        ).map(([key, label]) => (
          <div className="switch-row" key={key}>
            <label htmlFor={key}>{label}</label>
            <Switch
              id={key}
              checked={settings[key]}
              onCheckedChange={(v) => setSetting(key, v)}
            />
          </div>
        ))}
        <p className="reading-block sample" tabIndex={0}>
          Learning feels different for everyone. This is your space to find what
          works for you.
        </p>
        <button onClick={reset}>
          <RotateCcw size={17} />
          Reset preferences
        </button>
      </DialogContent>
    </Dialog>
  );
}
function Teacher({ path }: { path: string }) {
  return <TeacherSpace path={path} />;
}
function Admin({ path }: { path: string }) {
  return <AdminSpace path={path} />;
}
function TeacherSpace({ path }: { path: string }) {
  const { value, error, load } = useLoad<TeacherClass[]>("/teacher/overview");
  if (!value) return <LoadState error={error} retry={load} />;
  if (path.endsWith("/resources")) return <TeacherResources />;
  if (path.endsWith("/assignments")) return <TeacherAssignments />;
  if (path.endsWith("/activities")) return <ActivityStudio />;
  if (path.endsWith("/classes") || path.endsWith("/reports"))
    return <ClassReports classes={value} reports={path.endsWith("/reports")} />;
  if (path.endsWith("/messages"))
    return (
      <>
        <ClassInvites />
        <TeacherMessages classes={value} />
      </>
    );
  return <TeacherOverview classes={value} />;
}
function AdminSpace({ path }: { path: string }) {
  const { value, error, load } = useLoad<AdminData>("/admin/overview");
  if (!value) return <LoadState error={error} retry={load} />;
  if (path.endsWith("/users")) return <AdminUsers data={value} reload={load} />;
  if (path.endsWith("/classes"))
    return (
      <>
        <AdminClasses data={value} reload={load} />
        <ClassInvites />
      </>
    );
  if (path.endsWith("/resources")) return <AdminResources />;
  return (
    <>
      <Heading
        eyebrow="SUPPORT THE LEARNING"
        title="A well-supported school space."
      >
        Manage access, classes and shared resources. Earned learning remains the
        learner’s own.
      </Heading>
      <div className="metric-grid">
        <div className="panel metric">
          <Users />
          <strong>{value.stats.learners}</strong>
          <span>Active learners</span>
        </div>
        <div className="panel metric">
          <GraduationCap />
          <strong>{value.classes.length}</strong>
          <span>Classes</span>
        </div>
        <div className="panel metric">
          <CheckCircle2 />
          <strong>{value.stats.activities}</strong>
          <span>Recorded learning activities</span>
        </div>
        <div className="panel metric">
          <Library />
          <strong>{value.stats.resources}</strong>
          <span>Shared resources</span>
        </div>
      </div>
      <div className="two-col">
        <A to="/admin/users" className="panel">
          <Shield />
          <h2>People and permissions</h2>
          <p>Give each person the access they need.</p>
          <span className="text-link">
            Manage people <ArrowRight size={17} />
          </span>
        </A>
        <A to="/admin/classes" className="panel">
          <GraduationCap />
          <h2>Classes and membership</h2>
          <p>Connect learners with their teacher.</p>
          <span className="text-link">
            Manage classes <ArrowRight size={17} />
          </span>
        </A>
      </div>
    </>
  );
}
