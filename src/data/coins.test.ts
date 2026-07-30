import { describe, it, expect } from "vitest";
import {
  checkinStreak,
  coinsFromCheckins,
  coinsFromChallengeWins,
  coinsFromLogs,
  coinsFromTaskLogs,
  earnedCoins,
} from "./coins";
import { COINS } from "./coinRules";
import type { DailyLog, Task } from "./models";

function countTask(id = "c1"): Task {
  return { id, userId: "CP", month: "", title: "早起", type: "count", target: 22, unit: "times", carriedOver: false, editCount: 0 };
}
function timerTask(id = "t1"): Task {
  return { id, userId: "CP", month: "", title: "编程", type: "timer", target: 440, unit: "minutes", carriedOver: false, editCount: 0 };
}
function log(taskId: string, date: string, value: number, i = 0, backfilled = false): DailyLog {
  return { id: `${taskId}-${date}-${i}`, taskId, userId: "CP", date, value, note: null, backfilled, createdAt: `${date}T00:00:00Z` };
}

describe("count-task coins", () => {
  it("10 per distinct checked-in day; duplicate same-day rows dedup to one", () => {
    const t = countTask();
    const logs = [
      log(t.id, "2026-08-03", 1),
      log(t.id, "2026-08-03", 1, 1), // duplicate day
      log(t.id, "2026-08-04", 1),
      log(t.id, "2026-08-05", 0), // note row — ignored
    ];
    expect(coinsFromTaskLogs(t, logs)).toBe(2 * COINS.countPerCheckin); // 20
  });

  it("counts backfilled check-ins the same as live ones", () => {
    const t = countTask();
    const logs = [log(t.id, "2026-08-03", 1, 0, true), log(t.id, "2026-08-04", 1, 0, true)];
    expect(coinsFromTaskLogs(t, logs)).toBe(20);
  });
});

describe("timer-task coins (floor 10-min blocks, daily cap 60)", () => {
  it("caps a heavy day at 60 min → 12 coins", () => {
    const t = timerTask();
    const logs = [log(t.id, "2026-08-03", 75)]; // capped to 60 → floor(60/10)*2 = 12
    expect(coinsFromTaskLogs(t, logs)).toBe(12);
  });

  it("floors to whole 10-min blocks within a day", () => {
    const t = timerTask();
    expect(coinsFromTaskLogs(t, [log(t.id, "2026-08-03", 25)])).toBe(4); // floor(25/10)*2
  });

  it("sums per-day (each day capped independently), across split entries", () => {
    const t = timerTask();
    const logs = [
      log(t.id, "2026-08-03", 40),
      log(t.id, "2026-08-03", 40, 1), // same day → 80, capped 60 → 12
      log(t.id, "2026-08-04", 30), // → 6
    ];
    expect(coinsFromTaskLogs(t, logs)).toBe(18);
  });
});

describe("aggregate earnings", () => {
  it("coinsFromLogs sums across tasks", () => {
    const a = countTask("a");
    const b = timerTask("b");
    const logs = [log(a.id, "2026-08-03", 1), log(a.id, "2026-08-04", 1), log(b.id, "2026-08-03", 50)];
    expect(coinsFromLogs([a, b], logs)).toBe(20 + 10); // 2 days*10 + floor(50/10)*2
  });

  it("签到 = 5/day, wins = 500 each", () => {
    expect(coinsFromCheckins(6)).toBe(30);
    expect(coinsFromChallengeWins(2)).toBe(1000);
  });

  it("earnedCoins breaks down by source and totals", () => {
    const a = countTask("a");
    const b = earnedCoins({ tasks: [a], logs: [log(a.id, "2026-08-03", 1)], checkinDayCount: 3, winCount: 1 });
    expect(b).toEqual({ checkin: 15, tasks: 10, wins: 500, total: 525 });
  });
});

describe("连续签到 streak", () => {
  const today = "2026-08-10";
  it("counts consecutive days ending today", () => {
    expect(checkinStreak(["2026-08-08", "2026-08-09", "2026-08-10"], today)).toBe(3);
  });
  it("survives a not-yet-signed today if yesterday is signed", () => {
    expect(checkinStreak(["2026-08-08", "2026-08-09"], today)).toBe(2); // anchored at yesterday
  });
  it("breaks on a gap and is 0 when neither today nor yesterday is signed", () => {
    expect(checkinStreak(["2026-08-06", "2026-08-07", "2026-08-10"], today)).toBe(1); // only today's run
    expect(checkinStreak(["2026-08-05", "2026-08-06"], today)).toBe(0);
    expect(checkinStreak([], today)).toBe(0);
  });
});
