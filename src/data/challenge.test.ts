import { describe, it, expect } from "vitest";
import {
  addDays,
  autoVoidDue,
  challengeEnded,
  challengeResultForUser,
  challengeSpan,
  challengeDays,
  totalWeeks,
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
  warrantedLedger,
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
/** No D14 extension — the ordinary case for every pre-existing assertion below. */
const NO_EXT = 0;
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
    const w = challengeWeeks(START, WEEKS, NO_EXT);
    expect(w).toHaveLength(4);
    expect(w[0]).toEqual({ index: 1, startDate: "2026-02-02", endDate: "2026-02-08" });
    expect(w[1]).toEqual({ index: 2, startDate: "2026-02-09", endDate: "2026-02-15" });
    expect(w[3]).toEqual({ index: 4, startDate: "2026-02-23", endDate: "2026-03-01" });
  });

  it("challengeSpan covers the whole run", () => {
    expect(challengeSpan(START, WEEKS, NO_EXT)).toEqual({ start: START, end: END });
  });

  it("started / ended boundaries are inclusive of the run, exclusive outside it", () => {
    expect(challengeStarted(START, "2026-02-01")).toBe(false);
    expect(challengeStarted(START, START)).toBe(true);
    expect(challengeEnded(START, WEEKS, NO_EXT, END)).toBe(false); // last day is still in-run
    expect(challengeEnded(START, WEEKS, NO_EXT, "2026-03-02")).toBe(true);
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
    expect(totalProgress(t, logs, START, WEEKS, NO_EXT)).toBe(20);
    expect(taskPassed(t, logs, START, WEEKS, NO_EXT)).toBe(false); // 20 < 22
  });

  it("timer = sum of minutes across the span; note rows (0) contribute nothing", () => {
    const t = timerTask(440);
    const logs = [
      log(t.id, START, 200),
      log(t.id, addDays(START, 10), 250, 1),
      log(t.id, addDays(START, 10), 0, 2), // note row
      log(t.id, "2026-03-10", 999), // out of span
    ];
    expect(totalProgress(t, logs, START, WEEKS, NO_EXT)).toBe(450);
    expect(taskPassed(t, logs, START, WEEKS, NO_EXT)).toBe(true); // 450 ≥ 440
  });
});

describe("challenge status & team result", () => {
  const early = "2026-02-10"; // mid-run
  it("in-progress until met; success once met even mid-run", () => {
    const t = countTask(5);
    expect(challengeStatusForUser([t], [], START, WEEKS, NO_EXT, early)).toBe("in-progress");
    const met = checkIns(t.id, START, 5);
    expect(challengeStatusForUser([t], met, START, WEEKS, NO_EXT, early)).toBe("success");
  });

  it("resolves to failure only after the end", () => {
    const t = countTask(22);
    const partial = checkIns(t.id, START, 10);
    expect(challengeStatusForUser([t], partial, START, WEEKS, NO_EXT, early)).toBe("in-progress");
    expect(challengeStatusForUser([t], partial, START, WEEKS, NO_EXT, "2026-03-02")).toBe("failure");
  });

  it("all tasks must pass for a success", () => {
    const a = countTask(3, "a");
    const b = timerTask(100, "b");
    const logs = [...checkIns(a.id, START, 3), log(b.id, START, 50)]; // b short
    expect(challengeResultForUser([a, b], logs, START, WEEKS, NO_EXT)).toBe("failure");
  });

  it("challengeResultForUser is null with no tasks (never joined)", () => {
    expect(challengeResultForUser([], [], START, WEEKS, NO_EXT)).toBeNull();
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
    expect(paceExpected(t, START, WEEKS, NO_EXT, START)).toBeCloseTo(10, 5); // 1 day elapsed
    expect(paceExpected(t, START, WEEKS, NO_EXT, END)).toBeCloseTo(280, 5); // 28 days
    expect(paceExpected(t, START, WEEKS, NO_EXT, "2026-01-20")).toBe(0); // before start
    expect(paceExpected(t, START, WEEKS, NO_EXT, "2026-05-01")).toBe(280); // clamped past end
    expect(paceExpected(t, START, WEEKS, NO_EXT, "2026-02-15")).toBeCloseTo(140, 5); // day 14 → half
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
    expect(challengeEnded(START, WEEKS, NO_EXT, addDays(END, 1))).toBe(true); // it really has ended
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

// The ledger write is the one settlement path real usage has barely touched: in the
// first real challenge the team reward was blank, so only branch ① has ever executed
// against live data. ②–④ are covered here or nowhere.
describe("warrantedLedger — what a settled challenge writes to the ledger", () => {
  it("① team success + blank team reward → nothing (the ONLY branch prod has run)", () => {
    expect(warrantedLedger("success", null, "跑十公里")).toBeNull();
    expect(warrantedLedger("success", "", "跑十公里")).toBeNull();
    expect(warrantedLedger("success", "   ", "跑十公里")).toBeNull();
  });

  it("② team success + a team reward → a reward row, trimmed", () => {
    expect(warrantedLedger("success", "  一起吃顿好的  ", null)).toEqual({
      type: "reward",
      content: "一起吃顿好的",
    });
  });

  it("③ team failure + MY deposit execution → a penalty row carrying MY forfeit", () => {
    expect(warrantedLedger("failure", "一起吃顿好的", "  发朋友圈道歉  ")).toEqual({
      type: "penalty",
      content: "发朋友圈道歉",
    });
  });

  it("③b team failure + blank deposit execution → nothing", () => {
    expect(warrantedLedger("failure", "一起吃顿好的", null)).toBeNull();
    expect(warrantedLedger("failure", null, "  ")).toBeNull();
  });

  it("④ undecided team (partner not settled) → nothing, whatever the texts say", () => {
    expect(warrantedLedger(null, "一起吃顿好的", "发朋友圈道歉")).toBeNull();
  });

  it("a mixed team (one side failed) drags BOTH to the penalty branch (D2)", () => {
    // The verdict and the ledger must agree: success+failure combines to "failure",
    // and each side then writes its own penalty — not the reward.
    const team = combineTeamChallenge("success", "failure");
    expect(team).toBe("failure");
    expect(warrantedLedger(team, "一起吃顿好的", "我请客")).toEqual({
      type: "penalty",
      content: "我请客",
    });
  });

  it("each side writes its OWN execution, so the two rows differ", () => {
    const team = combineTeamChallenge("failure", "failure");
    expect(warrantedLedger(team, null, "CP 的惩罚")).toEqual({
      type: "penalty",
      content: "CP 的惩罚",
    });
    expect(warrantedLedger(team, null, "JX 的惩罚")).toEqual({
      type: "penalty",
      content: "JX 的惩罚",
    });
  });
});

// The end date is derived, never stored, so an extension has to reach every consumer of
// that derivation. These lock the ones that compute duration INDEPENDENTLY (span, pace,
// the week list) plus the one that deliberately does NOT honour it (midEditOpen).
describe("consensual extension (D14 draft)", () => {
  const EXT = 7;
  const EXT_END = "2026-03-08"; // END (2026-03-01, a Sunday) + 7

  it("extends the span by exactly the extra days, keeping the Sunday end", () => {
    expect(challengeDays(WEEKS, NO_EXT)).toBe(28);
    expect(challengeDays(WEEKS, EXT)).toBe(35);
    expect(challengeSpan(START, WEEKS, EXT)).toEqual({ start: START, end: EXT_END });
    expect(totalWeeks(WEEKS, EXT)).toBe(5);
  });

  it("holds 已结束 back until the extended end has passed", () => {
    // The original end is now an ordinary in-run day — this is the whole point of the patch.
    expect(challengeEnded(START, WEEKS, EXT, END)).toBe(false);
    expect(challengeEnded(START, WEEKS, EXT, addDays(END, 1))).toBe(false);
    expect(challengeEnded(START, WEEKS, EXT, EXT_END)).toBe(false); // last day is in-run
    expect(challengeEnded(START, WEEKS, EXT, addDays(EXT_END, 1))).toBe(true);
    // ...and un-extended behaviour is untouched.
    expect(challengeEnded(START, WEEKS, NO_EXT, addDays(END, 1))).toBe(true);
  });

  it("counts logs in the extra days toward the total", () => {
    const t = countTask(30);
    const logs = checkIns(t.id, START, 32); // 32 days: 4 of them past the original end
    expect(totalProgress(t, logs, START, WEEKS, NO_EXT)).toBe(28); // clipped at the old span
    expect(totalProgress(t, logs, START, WEEKS, EXT)).toBe(32);
    expect(taskPassed(t, logs, START, WEEKS, NO_EXT)).toBe(false); // 28 < 30
    expect(taskPassed(t, logs, START, WEEKS, EXT)).toBe(true); // 32 ≥ 30
  });

  it("a user short on the original deadline can still pass within the extension", () => {
    // The exact real-life case. Standing on the original last day, short of target:
    const t = countTask(30);
    const atOldEnd = checkIns(t.id, START, 28); // every day of the original run, still 28 < 30
    expect(challengeResultForUser([t], atOldEnd, START, WEEKS, NO_EXT)).toBe("failure");
    // Unextended, the last day already reads as a lost cause; extended it is still live.
    expect(challengeStatusForUser([t], atOldEnd, START, WEEKS, NO_EXT, END)).toBe("in-progress");
    expect(challengeStatusForUser([t], atOldEnd, START, WEEKS, EXT, END)).toBe("in-progress");
    expect(challengeStatusForUser([t], atOldEnd, START, WEEKS, NO_EXT, addDays(END, 1)))
      .toBe("failure"); // without the extension the verdict lands the next morning
    expect(challengeStatusForUser([t], atOldEnd, START, WEEKS, EXT, addDays(END, 1)))
      .toBe("in-progress"); // with it, there is still a week to work

    // Two more days inside the extension close the gap.
    const withExtra = [...atOldEnd, ...checkIns(t.id, addDays(END, 1), 2)];
    expect(challengeResultForUser([t], withExtra, START, WEEKS, EXT)).toBe("success");
    // Those two days do not exist for the un-extended span — they are outside it.
    expect(challengeResultForUser([t], withExtra, START, WEEKS, NO_EXT)).toBe("failure");
  });

  it("relaxes the pace line instead of leaving it aimed at the original end", () => {
    const t = timerTask(280);
    expect(paceExpected(t, START, WEEKS, NO_EXT, END)).toBeCloseTo(280, 5); // 28/28 days
    expect(paceExpected(t, START, WEEKS, EXT, END)).toBeCloseTo(224, 5); // 28/35 days
    expect(paceExpected(t, START, WEEKS, EXT, EXT_END)).toBeCloseTo(280, 5); // full at the new end
  });

  it("grows the week list so the extra days belong to a 第 5 周", () => {
    const w = challengeWeeks(START, WEEKS, EXT);
    expect(w).toHaveLength(5);
    expect(w[4]).toEqual({ index: 5, startDate: "2026-03-02", endDate: EXT_END });
    // Every day of the span lands in exactly one week — the 第 N 周 badge never goes blank.
    for (let i = 0; i < 35; i++) {
      const d = addDays(START, i);
      expect(w.filter((x) => d >= x.startDate && d <= x.endDate)).toHaveLength(1);
    }
  });

  it("does NOT reopen the one-time mid-challenge edit (extension moves TIME, not GOAL)", () => {
    // Half of 28 days = 14, half of 35 would be 17. If midEditOpen honoured the extension,
    // day 15 would flip back to editable and you could extend in order to cut your target.
    const day15 = addDays(START, 15);
    expect(midEditOpen(START, WEEKS, day15, null)).toBe(false);
    // midEditOpen takes no extendedDays at all — that absence is the guarantee, so the
    // only way this can regress is by someone adding the parameter.
    expect(midEditOpen.length).toBe(4);
  });
});
