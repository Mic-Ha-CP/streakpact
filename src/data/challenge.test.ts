import { describe, it, expect } from "vitest";
import {
  addDays,
  autoVoidDue,
  challengeEnded,
  challengeResultForUser,
  challengeSpan,
  challengeStarted,
  challengeStatusForUser,
  daysMissedAtStart,
  freeEditOpen,
  mondayOfWeek,
  startChoicesFor,
  withinSetupWindow,
  checkinOpenForUser,
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

describe("check-in stays open until the user SETTLES (not until the challenge ends)", () => {
  // Settling is the lock; ending is not (D2). Dates stay span-bounded elsewhere.
  it("allows backfill the day AFTER the challenge ended while unsettled", () => {
    expect(challengeEnded(START, WEEKS, addDays(END, 1))).toBe(true); // it really has ended
    expect(checkinOpenForUser(START, addDays(END, 1), false)).toBe(true);
  });

  it("stays open long after the end while still unsettled", () => {
    expect(checkinOpenForUser(START, addDays(END, 30), false)).toBe(true);
  });

  it("blocks check-in once that user has settled", () => {
    expect(checkinOpenForUser(START, addDays(END, 1), true)).toBe(false);
    expect(checkinOpenForUser(START, END, true)).toBe(false); // even before the end
  });

  it("is per-user: my settling does not close my partner's check-in", () => {
    const day = addDays(END, 1);
    const mine = checkinOpenForUser(START, day, true); // I settled
    const partner = checkinOpenForUser(START, day, false); // she has not
    expect(mine).toBe(false);
    expect(partner).toBe(true);
  });

  it("is still closed before the challenge starts", () => {
    expect(checkinOpenForUser(START, addDays(START, -1), false)).toBe(false);
    expect(checkinOpenForUser(START, START, false)).toBe(true);
  });
});

// ── D13: grace-window start ────────────────────────────────────────────────────
// START (2026-02-02) is a Monday. Weekdays below are relative to it.
const MON = START, TUE = addDays(START, 1), WED = addDays(START, 2);
const THU = addDays(START, 3), SUN = addDays(START, 6);

describe("mondayOfWeek", () => {
  it("returns the Monday of the containing week for every weekday", () => {
    for (let i = 0; i < 7; i++) expect(mondayOfWeek(addDays(START, i))).toBe(START);
  });
  it("is identity on a Monday", () => expect(mondayOfWeek(MON)).toBe(MON));
});

describe("startChoicesFor (D13 ①)", () => {
  it("Mon–Wed offers this week (backdated 0–2 days) AND next Monday", () => {
    expect(startChoicesFor(MON)).toEqual({ thisWeek: MON, nextMonday: addDays(MON, 7) });
    expect(startChoicesFor(TUE)).toEqual({ thisWeek: MON, nextMonday: addDays(MON, 7) });
    expect(startChoicesFor(WED)).toEqual({ thisWeek: MON, nextMonday: addDays(MON, 7) });
  });
  it("Thu–Sun offers next Monday only (unchanged behaviour)", () => {
    for (const d of [THU, addDays(START, 4), addDays(START, 5), SUN]) {
      expect(startChoicesFor(d).thisWeek).toBeNull();
      expect(startChoicesFor(d).nextMonday).toBe(addDays(MON, 7));
    }
  });
  it("every offered start is a Monday (week math stays intact)", () => {
    for (let i = 0; i < 7; i++) {
      const ch = startChoicesFor(addDays(START, i));
      if (ch.thisWeek) expect(isMonday(ch.thisWeek)).toBe(true);
      expect(isMonday(ch.nextMonday)).toBe(true);
    }
  });
});

describe("daysMissedAtStart", () => {
  it("0 for a same-day (Monday) start, 2 for a Wednesday backdate", () => {
    expect(daysMissedAtStart(MON, MON)).toBe(0);
    expect(daysMissedAtStart(MON, WED)).toBe(2);
  });
  it("never negative for a future start", () => {
    expect(daysMissedAtStart(addDays(MON, 7), WED)).toBe(0);
  });
});

describe("auto-void re-anchored to created_at (D13 ③ amends D9)", () => {
  const CREATED = WED; // initiated Wednesday
  it("does NOT void while inside the setup window, even with a backdated start", () => {
    // THE BLOCKER: start is 2 days in the past at creation — must not self-void.
    expect(autoVoidDue(CREATED, CREATED, 1)).toBe(false);
    expect(autoVoidDue(CREATED, addDays(CREATED, 2), 1)).toBe(false);
  });
  it("voids once the partner has not joined for SETUP_WINDOW_DAYS after initiation", () => {
    expect(autoVoidDue(CREATED, addDays(CREATED, 3), 1)).toBe(true);
    expect(autoVoidDue(CREATED, addDays(CREATED, 9), 1)).toBe(true);
  });
  it("never voids once both members joined", () => {
    expect(autoVoidDue(CREATED, addDays(CREATED, 30), 2)).toBe(false);
  });
  it("is independent of start_date (a past start does not accelerate it)", () => {
    // same created date, whether the challenge starts this week or next Monday
    expect(autoVoidDue(CREATED, addDays(CREATED, 2), 1)).toBe(false);
  });
});

describe("setup window + free edits (D13 ①/②)", () => {
  const CREATED = WED;
  it("withinSetupWindow covers days 0–2 and closes on day +3", () => {
    expect(withinSetupWindow(CREATED, CREATED)).toBe(true);
    expect(withinSetupWindow(CREATED, addDays(CREATED, 2))).toBe(true);
    expect(withinSetupWindow(CREATED, addDays(CREATED, 3))).toBe(false);
  });

  it("backdated (this-week) start: BOTH sides edit free inside the window", () => {
    // started already (start=Mon, today=Wed) yet still free — setup window carries it
    expect(challengeStarted(MON, CREATED)).toBe(true);
    expect(freeEditOpen(MON, CREATED, CREATED)).toBe(true);
    // the joiner arriving 2 days after creation is still free (she is the rushed party)
    expect(freeEditOpen(MON, CREATED, addDays(CREATED, 2))).toBe(true);
  });

  it("locks on day +4 (both sides) — 执行期 begins, D7 takes over", () => {
    expect(freeEditOpen(MON, CREATED, addDays(CREATED, 3))).toBe(false);
    // D7's one mid-challenge edit is still available and undiluted
    expect(midEditOpen(MON, WEEKS, addDays(CREATED, 3), null)).toBe(true);
  });

  it("REGRESSION — Thu create for next Monday keeps free edits through ALL pre-start days", () => {
    // 4 days pre-start > the 3-day setup window: a pure setup-window rule would have
    // locked on Sunday, BEFORE the challenge began. The OR clause must prevent that.
    const created = THU;
    const start = addDays(MON, 7); // next Monday
    expect(daysBetween(created, start)).toBe(4);
    expect(withinSetupWindow(created, addDays(created, 3))).toBe(false); // window closed…
    expect(freeEditOpen(start, created, addDays(created, 3))).toBe(true); // …still free (Sun)
    expect(freeEditOpen(start, created, start)).toBe(false); // locks when it actually starts
  });

  it("check-in opens immediately on a backdated start (D13 × the settle-lock fix)", () => {
    expect(checkinOpenForUser(MON, CREATED, false)).toBe(true);
  });
});
