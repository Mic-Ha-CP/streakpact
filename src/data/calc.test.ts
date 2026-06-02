import { describe, it, expect } from "vitest";
import {
  combineTeamMonth,
  getWeeksInMonth,
  monthStatus,
  weekStatusForUser,
  type MonthResult,
  type WeekLabel,
} from "./calc";
import type { DailyLog, Task } from "./models";

// 2026-02 has 4 Mondays (2,9,16,23) → 4 weeks; 2026-03 has 5 (2,9,16,23,30) → 5 weeks.
const M4 = "2026-02";
const M5 = "2026-03";
const FAR = "2026-12-31"; // every week of M4/M5 is complete relative to this

function countTask(month: string, target: number, id = "t1"): Task {
  return { id, userId: "CP", month, title: "c", type: "count", target, unit: "times", carriedOver: false, editCount: 0 };
}
function timerTask(month: string, target: number, id = "t1"): Task {
  return { id, userId: "CP", month, title: "t", type: "timer", target, unit: "minutes", carriedOver: false, editCount: 0 };
}
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function log(taskId: string, date: string, value: number, i = 0): DailyLog {
  return { id: `${taskId}-${date}-${i}`, taskId, userId: "CP", date, value, note: null, backfilled: false, createdAt: `${date}T00:00:00Z` };
}
/** `days` distinct count check-ins (value=1) starting Monday of the given week. */
function checkIns(taskId: string, month: string, week: WeekLabel, days: number): DailyLog[] {
  const w = getWeeksInMonth(month).find((x) => x.label === week)!;
  return Array.from({ length: days }, (_, i) => log(taskId, addDays(w.startDate, i), 1, i));
}
/** A single timer entry of `minutes` on Monday of the given week. */
function timerEntry(taskId: string, month: string, week: WeekLabel, minutes: number): DailyLog {
  const w = getWeeksInMonth(month).find((x) => x.label === week)!;
  return log(taskId, w.startDate, minutes);
}

describe("combineTeamMonth", () => {
  it("both success → team success", () => {
    expect(combineTeamMonth("success", "success")).toBe("success");
  });
  it.each<[MonthResult, MonthResult]>([
    ["failure", "success"],
    ["success", "failure"],
    ["failure", "failure"],
    ["failure", "neutral"],
    ["neutral", "failure"],
  ])("%s + %s → team failure", (a, b) => {
    expect(combineTeamMonth(a, b)).toBe("failure");
  });
  it.each<[MonthResult, MonthResult]>([
    ["success", "neutral"],
    ["neutral", "success"],
    ["neutral", "neutral"],
  ])("%s + %s → team neutral", (a, b) => {
    expect(combineTeamMonth(a, b)).toBe("neutral");
  });
  it("null on either side → null (not settleable)", () => {
    expect(combineTeamMonth(null, "success")).toBeNull();
    expect(combineTeamMonth("failure", null)).toBeNull();
    expect(combineTeamMonth(null, null)).toBeNull();
  });
});

describe("weekStatusForUser", () => {
  it("count: hits target → success", () => {
    const t = countTask(M4, 3);
    expect(weekStatusForUser([t], checkIns("t1", M4, "W1", 3), M4, "W1", FAR)).toBe("success");
  });
  it("count: below target on a finished week → fail", () => {
    const t = countTask(M4, 3);
    expect(weekStatusForUser([t], checkIns("t1", M4, "W1", 2), M4, "W1", FAR)).toBe("fail");
  });
  it("count: note rows (value=0) don't count toward target", () => {
    const t = countTask(M4, 1);
    const w = getWeeksInMonth(M4).find((x) => x.label === "W1")!;
    expect(weekStatusForUser([t], [log("t1", w.startDate, 0)], M4, "W1", FAR)).toBe("fail");
  });
  it("count: same day checked twice still counts once (distinct dates)", () => {
    const t = countTask(M4, 2);
    const w = getWeeksInMonth(M4).find((x) => x.label === "W1")!;
    const dupes = [log("t1", w.startDate, 1, 0), log("t1", w.startDate, 1, 1)];
    expect(weekStatusForUser([t], dupes, M4, "W1", FAR)).toBe("fail");
  });
  it("timer: summed minutes ≥ target → success", () => {
    const t = timerTask(M4, 120);
    const logs = [timerEntry("t1", M4, "W1", 50), { ...timerEntry("t1", M4, "W1", 70), id: "x2" }];
    expect(weekStatusForUser([t], logs, M4, "W1", FAR)).toBe("success");
  });
  it("timer: summed minutes below target → fail", () => {
    const t = timerTask(M4, 120);
    expect(weekStatusForUser([t], [timerEntry("t1", M4, "W1", 119)], M4, "W1", FAR)).toBe("fail");
  });
  it("multi-task: ALL must pass — one failing task fails the week", () => {
    const t1 = countTask(M4, 3, "t1");
    const t2 = countTask(M4, 3, "t2");
    const logs = [...checkIns("t1", M4, "W1", 3), ...checkIns("t2", M4, "W1", 1)];
    expect(weekStatusForUser([t1, t2], logs, M4, "W1", FAR)).toBe("fail");
  });
  it("no tasks → pending", () => {
    expect(weekStatusForUser([], [], M4, "W1", FAR)).toBe("pending");
  });
  it("future week (today before it starts) → pending", () => {
    const t = countTask(M4, 3);
    expect(weekStatusForUser([t], [], M4, "W2", "2026-01-01")).toBe("pending");
  });
  it("current week, target not yet hit → in-progress", () => {
    const t = countTask(M4, 3);
    const w = getWeeksInMonth(M4).find((x) => x.label === "W1")!;
    expect(weekStatusForUser([t], checkIns("t1", M4, "W1", 1), M4, "W1", w.startDate)).toBe("in-progress");
  });
  it("current week, target already hit → success early", () => {
    const t = countTask(M4, 1);
    const w = getWeeksInMonth(M4).find((x) => x.label === "W1")!;
    expect(weekStatusForUser([t], checkIns("t1", M4, "W1", 1), M4, "W1", w.startDate)).toBe("success");
  });
});

/** Build a month's logs where the first `successWeeks` weeks fully hit `target`. */
function monthLogs(month: string, target: number, successWeeks: number): DailyLog[] {
  const weeks = getWeeksInMonth(month);
  return weeks.slice(0, successWeeks).flatMap((w) => checkIns("t1", month, w.label, target));
}

describe("monthStatus — 4-week month (2026-02)", () => {
  it("has exactly 4 weeks", () => {
    expect(getWeeksInMonth(M4)).toHaveLength(4);
    expect(monthStatus([countTask(M4, 3)], [], M4, FAR).totalWeeks).toBe(4);
  });
  it.each<[number, MonthResult]>([
    [0, "failure"],
    [1, "failure"],
    [2, "neutral"],
    [3, "success"],
    [4, "success"],
  ])("%i success weeks → %s", (sw, expected) => {
    const r = monthStatus([countTask(M4, 3)], monthLogs(M4, 3, sw), M4, FAR);
    expect(r.successWeeks).toBe(sw);
    expect(r.result).toBe(expected);
  });
});

describe("monthStatus — 5-week month (2026-03)", () => {
  it("has exactly 5 weeks", () => {
    expect(getWeeksInMonth(M5)).toHaveLength(5);
    expect(monthStatus([countTask(M5, 3)], [], M5, FAR).totalWeeks).toBe(5);
  });
  it.each<[number, MonthResult]>([
    [0, "failure"],
    [1, "failure"],
    [2, "neutral"],
    [3, "success"],
    [4, "success"],
    [5, "success"],
  ])("%i success weeks → %s", (sw, expected) => {
    const r = monthStatus([countTask(M5, 3)], monthLogs(M5, 3, sw), M5, FAR);
    expect(r.successWeeks).toBe(sw);
    expect(r.result).toBe(expected);
  });
  it("threshold is ABSOLUTE: 2-of-5 is neutral, same bar as 2-of-4 (not proportional)", () => {
    expect(monthStatus([countTask(M5, 3)], monthLogs(M5, 3, 2), M5, FAR).result).toBe("neutral");
    expect(monthStatus([countTask(M4, 3)], monthLogs(M4, 3, 2), M4, FAR).result).toBe("neutral");
  });
});

describe("monthStatus — mid-month (not all weeks finished) → no result yet", () => {
  it("result is null until every week is complete", () => {
    const w2 = getWeeksInMonth(M4).find((x) => x.label === "W2")!;
    // today sits inside W2, so W2..W4 are not complete
    const r = monthStatus([countTask(M4, 3)], monthLogs(M4, 3, 1), M4, w2.startDate);
    expect(r.result).toBeNull();
  });
});
