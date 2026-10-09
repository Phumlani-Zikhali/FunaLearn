import { useEffect, useState } from "react";
import { Award, Trophy, Flame, Star, LockKeyhole } from "lucide-react";
import { api } from "../lib/api";
import { Empty, Heading, useApp } from "../shared";
type Row = {
  id: string;
  name: string;
  xp: number;
  rank: number;
  streak: number;
  badges: number;
  isYou: boolean;
};
export function Leaderboard() {
  const { s } = useApp();
  const [classId, setClassId] = useState(s.classes[0]?.id || ""),
    [period, setPeriod] = useState("week"),
    [rows, setRows] = useState<Row[] | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setRows(null);
    setError("");
    if (classId)
      api<{ rows: Row[] }>(
        "/leaderboard?classId=" +
          encodeURIComponent(classId) +
          "&period=" +
          period,
      )
        .then((r) => {
          if (active) setRows(r.rows);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [classId, period, reload]);
  return (
    <>
      <Heading eyebrow="GROWING TOGETHER" title="Class leaderboard">
        Celebrate steady practice. XP reflects learning activity, not ability.
        Equal XP shares the same place.
      </Heading>
      {!s.classes.length ? (
        <Empty>Your leaderboard will appear when you join a class.</Empty>
      ) : (
        <>
          <section className="panel achievement-filters">
            <label>
              Class
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                {s.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Learning period
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
              >
                <option value="week">Last 7 days</option>
                <option value="all">All time</option>
              </select>
            </label>
            <button onClick={() => setReload((n) => n + 1)}>Refresh</button>
          </section>
          <p className="muted">
            Only active learners in this class appear. Streaks and badges show
            overall progress. Days follow South African time.
          </p>
          {error ? (
            <div role="alert" className="error">
              {error}
              <button onClick={() => setReload((n) => n + 1)}>Retry</button>
            </div>
          ) : rows === null ? (
            <p role="status">Loading class progress…</p>
          ) : !rows.length ? (
            <Empty>No learners have joined this class yet.</Empty>
          ) : (
            <section className="panel leaderboard-table">
              <table>
                <caption>
                  {period === "week" ? "Last 7 days" : "All-time"} learning XP
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Place</th>
                    <th scope="col">Learner</th>
                    <th scope="col">XP</th>
                    <th scope="col">Streak</th>
                    <th scope="col">Badges</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r.isYou ? "your-place" : ""}>
                      <td>
                        <Trophy size={17} /> {r.rank}
                      </td>
                      <th scope="row">
                        {r.name}
                        {r.isYou && <small> · You</small>}
                      </th>
                      <td>{r.xp}</td>
                      <td>
                        {r.streak} {r.streak === 1 ? "day" : "days"}
                      </td>
                      <td>{r.badges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </>
  );
}
export function Badges() {
  const { s } = useApp();
  const badges = s.progress.badges,
    earned = badges.filter((b) => b.earned).length;
  return (
    <>
      <Heading eyebrow="EVERY SMALL STEP COUNTS" title="Your badge collection">
        Milestones earned through your own practice. Once earned, a badge stays
        with you.
      </Heading>
      <div className="metric-grid">
        <div className="panel metric">
          <Award />
          <strong>
            {earned} / {badges.length}
          </strong>
          <span>Badges earned</span>
        </div>
        <div className="panel metric">
          <Star />
          <strong>{s.progress.xp}</strong>
          <span>Learning XP</span>
        </div>
        <div className="panel metric">
          <Flame />
          <strong>{s.progress.streak}</strong>
          <span>Current day streak</span>
        </div>
      </div>
      <div className="badge-collection">
        {badges.map((b) => (
          <section
            key={b.id}
            className={"panel milestone " + (b.earned ? "earned" : "")}
          >
            <span className="tile-icon">
              {b.earned ? <Award size={30} /> : <LockKeyhole size={25} />}
            </span>
            <h2>{b.name}</h2>
            <p>{b.description}</p>
            <progress
              max={b.target}
              value={b.current}
              aria-label={b.name + " progress"}
            />
            <small>
              {b.earned
                ? "Earned " +
                  new Date(b.earnedAt!).toLocaleDateString("en-ZA", {
                    timeZone: "Africa/Johannesburg",
                  })
                : b.current + " of " + b.target + " · Keep exploring"}
            </small>
          </section>
        ))}
      </div>
    </>
  );
}
