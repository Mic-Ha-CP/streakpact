import { describe, it, expect } from "vitest";
import {
  checkinStreak,
  coinsForTimerDay,
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

describe("timer-task coins (D12 three-tier, per-task-per-day cap 22)", () => {
  // Tiers: 0–60 → 1c/5min (max12); 60–120 → 1c/10min (max6); 120–180 → 1c/15min (max4).
  // ceil per block within each tier (a started block counts).
  it.each([
    [1, 1],
    [4, 1],
    [5, 1],
    [6, 2],
    [59, 12],
    [60, 12],
    [61, 13],
    [119, 18],
    [120, 18],
    [121, 19],
    [179, 22],
    [180, 22],
    [240, 22], // beyond 180 stays at the 22 cap
  ])("M=%i minutes → %i coins (locked boundary)", (mins, coins) => {
    expect(coinsForTimerDay(mins)).toBe(coins);
  });

  it("0 minutes → 0 coins", () => {
    expect(coinsForTimerDay(0)).toBe(0);
  });

  it("sums per-day across split same-day entries (day total drives the tiers)", () => {
    const t = timerTask();
    const logs = [
      log(t.id, "2026-08-03", 40),
      log(t.id, "2026-08-03", 40, 1), // same day → 80 → tier1 12 + tier2 ceil(20/10)=2 = 14
      log(t.id, "2026-08-04", 25), // → ceil(25/5)=5
    ];
    expect(coinsFromTaskLogs(t, logs)).toBe(14 + 5);
  });

  it("caps each task independently — two maxed timer tasks earn 22 each (not shared)", () => {
    const a = timerTask("a");
    const b = timerTask("b");
    const logs = [log(a.id, "2026-08-03", 200), log(b.id, "2026-08-03", 200)];
    expect(coinsFromLogs([a, b], logs)).toBe(44);
  });
});

describe("aggregate earnings", () => {
  it("coinsFromLogs sums across tasks", () => {
    const a = countTask("a");
    const b = timerTask("b");
    const logs = [log(a.id, "2026-08-03", 1), log(a.id, "2026-08-04", 1), log(b.id, "2026-08-03", 50)];
    expect(coinsFromLogs([a, b], logs)).toBe(20 + 10); // 2 days*10 + timer 50min→ceil(50/5)=10
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
