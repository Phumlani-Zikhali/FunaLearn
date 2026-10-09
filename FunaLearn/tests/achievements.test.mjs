import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateBadges, rankRows } from "../server/achievements.mjs";
const day = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
test("historical streak badges survive breaks and dates use South African days", () => {
  const events = [
    "2020-01-01T22:30:00Z",
    "2020-01-02T22:30:00Z",
    "2020-01-03T22:30:00Z",
  ].map((created) => ({ created, kind: "review", xp: 5 }));
  const badges = calculateBadges(events, [], day);
  assert.equal(badges.find((b) => b.id === "habit").earned, true);
  assert.equal(
    badges.find((b) => b.id === "habit").earnedAt,
    events[2].created,
  );
  assert.equal(badges.find((b) => b.id === "week").earned, false);
});
test("same-day events do not create a streak and empty history has no badges", () => {
  const events = Array.from({ length: 7 }, () => ({
    created: "2026-01-01T12:00:00Z",
    kind: "review",
    xp: 5,
  }));
  assert.equal(
    calculateBadges(events, [], day).find((b) => b.id === "habit").current,
    1,
  );
  assert.ok(
    calculateBadges([], [], day).every((b) => !b.earned && b.current === 0),
  );
});
test("XP awards show the first threshold crossing and perfect scores require a real quiz", () => {
  const e = [
    { created: "2026-01-01", kind: "lesson", xp: 60 },
    { created: "2026-01-02", kind: "review", xp: 50 },
  ];
  const b = calculateBadges(
    e,
    [{ created: "2026-01-02", score: 0, total: 0 }],
    day,
  );
  assert.equal(b.find((b) => b.id === "xp100").earnedAt, "2026-01-02");
  assert.equal(b.find((b) => b.id === "perfect").earned, false);
});
test("leaderboards share places for tied XP and rank zero activity consistently", () => {
  assert.deepEqual(
    rankRows([
      { id: "c", name: "C", xp: 0 },
      { id: "b", name: "B", xp: 20 },
      { id: "a", name: "A", xp: 20 },
    ]).map((r) => r.rank),
    [1, 1, 3],
  );
});
