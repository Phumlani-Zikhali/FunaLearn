// Milestones are derived from the complete saved history, so earned badges never expire.
export function calculateBadges(events, attempts, dayOf) {
  const ordered = [...events].sort((a, b) =>
    a.created.localeCompare(b.created),
  );
  const days = [
    ...new Set(ordered.map((e) => dayOf(new Date(e.created)))),
  ].sort();
  const streakDates = {};
  let streak = 0,
    last;
  for (const day of days) {
    const n = Date.parse(day + "T12:00:00Z");
    streak = last === n - 86400000 ? streak + 1 : 1;
    last = n;
    for (const goal of [3, 7])
      if (streak >= goal && !streakDates[goal])
        streakDates[goal] = ordered.find(
          (e) => dayOf(new Date(e.created)) === day,
        )?.created;
  }
  const lessons = ordered.filter((e) => e.kind === "lesson");
  const reviews = ordered.filter((e) => e.kind === "review");
  const quizzes = [...attempts].sort((a, b) =>
    a.created.localeCompare(b.created),
  );
  const xpDate = (goal) => {
    let sum = 0;
    return ordered.find((e) => (sum += e.xp) >= goal)?.created;
  };
  const xp = ordered.reduce((n, e) => n + e.xp, 0);
  const best = (() => {
    let b = 0,
      s = 0,
      l;
    for (const d of days) {
      const n = Date.parse(d + "T12:00:00Z");
      s = l === n - 86400000 ? s + 1 : 1;
      l = n;
      b = Math.max(b, s);
    }
    return b;
  })();
  return [
    [
      "first-step",
      "First step",
      "Complete your first lesson",
      lessons.length,
      1,
      lessons[0]?.created,
    ],
    [
      "recall-explorer",
      "Recall explorer",
      "Review your first flashcard",
      reviews.length,
      1,
      reviews[0]?.created,
    ],
    [
      "practice",
      "Practice makes progress",
      "Finish your first quiz",
      quizzes.length,
      1,
      quizzes[0]?.created,
    ],
    [
      "habit",
      "Building a habit",
      "Learn on 3 consecutive days",
      best,
      3,
      streakDates[3],
    ],
    [
      "week",
      "A week of learning",
      "Learn on 7 consecutive days",
      best,
      7,
      streakDates[7],
    ],
    [
      "lessons",
      "Curious explorer",
      "Complete 3 lessons",
      lessons.length,
      3,
      lessons[2]?.created,
    ],
    [
      "recall-ten",
      "Recall regular",
      "Complete 10 credited flashcard reviews",
      reviews.length,
      10,
      reviews[9]?.created,
    ],
    [
      "perfect",
      "All clear",
      "Answer every question correctly in a quiz",
      quizzes.some((a) => a.total > 0 && a.score === a.total) ? 1 : 0,
      1,
      quizzes.find((a) => a.total > 0 && a.score === a.total)?.created,
    ],
    [
      "xp100",
      "Finding your rhythm",
      "Earn 100 learning XP",
      xp,
      100,
      xpDate(100),
    ],
    [
      "xp300",
      "Growing confidence",
      "Earn 300 learning XP",
      xp,
      300,
      xpDate(300),
    ],
  ].map(([id, name, description, current, target, earnedAt]) => ({
    id,
    name,
    description,
    current: Math.min(current, target),
    target,
    earned: !!earnedAt,
    earnedAt: earnedAt || null,
  }));
}
export function rankRows(rows) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.xp - a.xp || a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
  return sorted.map((r, i) => ({
    ...r,
    rank:
      i && r.xp === sorted[i - 1].xp
        ? sorted.findIndex((v) => v.xp === r.xp) + 1
        : i + 1,
  }));
}
