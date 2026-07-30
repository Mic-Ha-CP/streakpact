import { describe, it, expect } from "vitest";
import {
  addDays,
  autoVoidDue,
  challengeEnded,
  challengeResultForUser,
  challengeSpan,
  challengeStarted,
  challengeStatusForUser,
  challengeWeeks,
  combineTeamChallenge,
  daysBetween,
  isMonday,
  midEditOpen,
  nextMondayOnOrAfter,
  paceExpected,
  preStartEditable,
  taskPassed,
  totalProgress,
} from "./challenge";
import type { DailyLog, Task } from "./models";

// 2026-02-02 is a Monday. A 4-week challenge from it spans 2026-02-02 … 2026-03-01.
const START = "2026-02-02";
const WEEKS = 4;
const END = "2026-03-01"; // START + 27 days

function countTask(target: number, id = "t1"): Task {
  return { id, userId: "CP", month: "", title: "早起", type: "count", target, unit: "times", carriedOver: false, editCount: 0 };
}
function timerTask(target: number, id = "t2"): Task {
  return { id, userId: "CP", month: "", title: "编程", type: "timer", target, unit: "minutes", carriedOver: false, editCount: 0 };
}
function log(taskId: string, date: string, value: number, i = 0): DailyLog {
  return { id: `${taskId}-${date}-${i}`, taskId, userId: "CP", date, value, note: null, backfilled: false, createdAt: `${date}T00:00:00Z` };
}
/** `days` distinct count check-ins (value=1), one per day, starting at `from`. */
function checkIns(taskId: string, from: string, days: number): DailyLog[] {
  return Array.from({ length: days }, (_, i) => log(taskId, addDays(from, i), 1, i));
}

describe("date helpers", () => {
  it("daysBetween / addDays are inverse and DST-safe across a month boundary", () => {
    expect(daysBetween(START, END)).toBe(27);
    expect(addDays(START, 27)).toBe(END);
    expect(daysBetween(END, START)).toBe(-27);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01"); // 2026 is not a leap year
  });

  it("isMonday", () => {
    expect(isMonday(START)).toBe(true);
    expect(isMonday("2026-02-03")).toBe(false); // Tuesday
    expect(isMonday("2026-02-08")).toBe(false); // Sunday
  });

  it("nextMondayOnOrAfter returns the date itself when already Monday, else the next Monday", () => {
    expect(nextMondayOnOrAfter(START)).toBe(START);
    expect(nextMondayOnOrAfter("2026-02-03")).toBe("2026-02-09"); // Tue → next Mon
    expect(nextMondayOnOrAfter("2026-02-08")).toBe("2026-02-09"); // Sun → next Mon
  });
});

describe("challenge weeks & span", () => {
  it("challengeWeeks yields N Mon–Sun weeks", () => {
    const w = challengeWeeks(START, WEEKS);
    expect(w).toHaveLength(4);
    expect(w[0]).toEqual({ index: 1, startDate: "2026-02-02", endDate: "2026-02-08" });
    expect(w[1]).toEqual({ index: 2, startDate: "2026-02-09", endDate: "2026-02-15" });
    expect(w[3]).toEqual({ index: 4, startDate: "2026-02-23", endDate: "2026-03-01" });
  });

  it("challengeSpan covers the whole run", () => {
    expect(challengeSpan(START, WEEKS)).toEqual({ start: START, end: END });
  });

  it("started / ended boundaries are inclusive of the run, exclusive outside it", () => {
    expect(challengeStarted(START, "2026-02-01")).toBe(false);
    expect(challengeStarted(START, START)).toBe(true);
    expect(challengeEnded(START, WEEKS, END)).toBe(false); // last day is still in-run
    expect(challengeEnded(START, WEEKS, "2026-03-02")).toBe(true);
  });
});

describe("total-target progress", () => {
  it("count = distinct days checked in across the whole span", () => {
    const t = countTask(22);
    // 20 distinct days in-span + a duplicate same-day row + one out-of-span day
    const logs = [
      ...checkIns(t.id, START, 20),
      log(t.id, START, 1, 99), // duplicate day — still 1 distinct
      log(t.id, "2026-03-05", 1), // after END — ignored
    ];
    expect(totalProgress(t, logs, START, WEEKS)).toBe(20);
    expect(taskPassed(t, logs, START, WEEKS)).toBe(false); // 20 < 22
  });

  it("timer = sum of minutes across the span; note rows (0) contribute nothing", () => {
    const t = timerTask(440);
    const logs = [
      log(t.id, START, 200),
      log(t.id, addDays(START, 10), 250, 1),
      log(t.id, addDays(START, 10), 0, 2), // note row
      log(t.id, "2026-03-10", 999), // out of span
    ];
    expect(totalProgress(t, logs, START, WEEKS)).toBe(450);
    expect(taskPassed(t, logs, START, WEEKS)).toBe(true); // 450 ≥ 440
  });
});

describe("challenge status & team result", () => {
  const early = "2026-02-10"; // mid-run
  it("in-progress until met; success once met even mid-run", () => {
    const t = countTask(5);
    expect(challengeStatusForUser([t], [], START, WEEKS, early)).toBe("in-progress");
    const met = checkIns(t.id, START, 5);
    expect(challengeStatusForUser([t], met, START, WEEKS, early)).toBe("success");
  });

  it("resolves to failure only after the end", () => {
    const t = countTask(22);
    const partial = checkIns(t.id, START, 10);
    expect(challengeStatusForUser([t], partial, START, WEEKS, early)).toBe("in-progress");
    expect(challengeStatusForUser([t], partial, START, WEEKS, "2026-03-02")).toBe("failure");
  });

  it("all tasks must pass for a success", () => {
    const a = countTask(3, "a");
    const b = timerTask(100, "b");
    const logs = [...checkIns(a.id, START, 3), log(b.id, START, 50)]; // b short
    expect(challengeResultForUser([a, b], logs, START, WEEKS)).toBe("failure");
  });

  it("challengeResultForUser is null with no tasks (never joined)", () => {
    expect(challengeResultForUser([], [], START, WEEKS)).toBeNull();
  });

  it("combineTeamChallenge: both-success only, any failure/null propagates", () => {
    expect(combineTeamChallenge("success", "success")).toBe("success");
    expect(combineTeamChallenge("success", "failure")).toBe("failure");
    expect(combineTeamChallenge("failure", "failure")).toBe("failure");
    expect(combineTeamChallenge("success", null)).toBeNull();
    expect(combineTeamChallenge(null, "failure")).toBeNull();
  });
});

describe("pace reference (display only)", () => {
  const t = timerTask(280); // 280 over 28 days = 10/day expected
  it("is ~target/days on day 1, target at the end, 0 before the start", () => {
    expect(paceExpected(t, START, WEEKS, START)).toBeCloseTo(10, 5); // 1 day elapsed
    expect(paceExpected(t, START, WEEKS, END)).toBeCloseTo(280, 5); // 28 days
    expect(paceExpected(t, START, WEEKS, "2026-01-20")).toBe(0); // before start
    expect(paceExpected(t, START, WEEKS, "2026-05-01")).toBe(280); // clamped past end
    expect(paceExpected(t, START, WEEKS, "2026-02-15")).toBeCloseTo(140, 5); // day 14 → half
  });
});

describe("edit windows (D7 / D10)", () => {
  it("preStartEditable is true only before the start day", () => {
    expect(preStartEditable(START, "2026-01-30")).toBe(true);
    expect(preStartEditable(START, START)).toBe(false); // start day = challenge live
    expect(preStartEditable(START, "2026-02-10")).toBe(false);
  });

  it("midEditOpen is the consumable one — from start through the first half only", () => {
    expect(midEditOpen(START, WEEKS, "2026-01-30", null)).toBe(false); // before start = free, not this
    expect(midEditOpen(START, WEEKS, START, null)).toBe(true); // day 0
    expect(midEditOpen(START, WEEKS, "2026-02-15", null)).toBe(true); // day 13 (end of wk2)
    expect(midEditOpen(START, WEEKS, "2026-02-16", null)).toBe(false); // day 14 (wk3 starts)
    expect(midEditOpen(START, WEEKS, START, "2026-02-02T09:00:00Z")).toBe(false); // already edited
  });
});

describe("auto-void (D9, grace day)", () => {
  it("only voids from the day AFTER start (grace for a timezone-behind partner)", () => {
    expect(autoVoidDue(START, "2026-01-30", 1)).toBe(false); // before start
    expect(autoVoidDue(START, START, 1)).toBe(false); // start day itself — grace, partner keeps their day
    expect(autoVoidDue(START, addDays(START, 1), 1)).toBe(true); // day after start, only initiator
    expect(autoVoidDue(START, addDays(START, 1), 2)).toBe(false); // both joined
    expect(autoVoidDue(START, "2026-02-10", 1)).toBe(true); // running, partner never joined
  });
});
