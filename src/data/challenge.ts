// Pure logic for the single-layer (单层) challenge model — see
// docs/design/PERIODS_AND_GAMIFY.md (D1/D2/D7). A challenge runs `weeks` Mon–Sun
// weeks from a Monday `startDate` and is judged ONCE at the end, per task, on a
// TOTAL target (fault tolerance is folded into that number, D2). There is no weekly
// settlement — the per-week reference line is display-only (`paceExpected`).
//
// Kept separate from calc.ts, which stays the legacy month-anchored settlement logic.

import type { DailyLog, Task } from "./models";
import { logsForTaskInRange } from "./calc";

// --- UTC-based date helpers (DST-safe day math on YYYY-MM-DD strings) ----------
const DAY = 86_400_000;

function toUTC(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function fromUTC(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
/** Whole days from `a` to `b` (b − a); negative if `b` precedes `a`. */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY);
}
/** Shift a YYYY-MM-DD date by `n` days (UTC, DST-safe). */
export function addDays(date: string, n: number): string {
  return fromUTC(toUTC(date) + n * DAY);
}

/** ISO weekday, Monday = 1 … Sunday = 7. */
function isoDow(date: string): number {
  const d = new Date(toUTC(date)).getUTCDay(); // Sun=0 … Sat=6
  return d === 0 ? 7 : d;
}
/** Is this date a Monday? */
export function isMonday(date: string): boolean {
  return isoDow(date) === 1;
}
/** The Monday of the week containing `date` (returns `date` itself if already Monday). */
export function mondayOfWeek(date: string): string {
  return addDays(date, -(isoDow(date) - 1));
}

/** The first Monday on or after `date` (returns `date` itself if already Monday). */
export function nextMondayOnOrAfter(date: string): string {
  const offset = (8 - isoDow(date)) % 7; // Mon→0, Tue→6, … Sun→1
  return addDays(date, offset);
}

export interface ChallengeWeek {
  index: number; // 1-based
  startDate: string; // Monday
  endDate: string; // Sunday
}

/** The `weeks` Mon–Sun weeks of a challenge starting at `startDate` (a Monday). */
export function challengeWeeks(startDate: string, weeks: number): ChallengeWeek[] {
  return Array.from({ length: weeks }, (_, i) => ({
    index: i + 1,
    startDate: addDays(startDate, i * 7),
    endDate: addDays(startDate, i * 7 + 6),
  }));
}

/** [start, end] span of the whole challenge (end = the last Sunday). */
export function challengeSpan(startDate: string, weeks: number): { start: string; end: string } {
  return { start: startDate, end: addDays(startDate, weeks * 7 - 1) };
}

/** Has the challenge started (today on/after the start)? */
export function challengeStarted(startDate: string, today: string): boolean {
  return today >= startDate;
}

/** Has the challenge ended (today after the last day)? */
export function challengeEnded(startDate: string, weeks: number, today: string): boolean {
  return today > challengeSpan(startDate, weeks).end;
}

/**
 * Total progress for a task across the WHOLE challenge span:
 *   count → distinct days checked in (value > 0); timer → sum of minutes.
 * Note rows (value 0) contribute nothing, matching weeklyProgress in calc.ts.
 */
export function totalProgress(
  task: Task,
  logs: DailyLog[],
  startDate: string,
  weeks: number,
): number {
  const { start, end } = challengeSpan(startDate, weeks);
  const ls = logsForTaskInRange(logs, task.id, start, end);
  if (task.type === "count")
    return new Set(ls.filter((l) => l.value > 0).map((l) => l.date)).size;
  return ls.reduce((sum, l) => sum + (l.value ?? 0), 0);
}

/** Did a single task hit its total target? */
export function taskPassed(
  task: Task,
  logs: DailyLog[],
  startDate: string,
  weeks: number,
): boolean {
  return totalProgress(task, logs, startDate, weeks) >= task.target;
}

export type ChallengeResult = "success" | "failure";
export type ChallengeUserStatus = ChallengeResult | "in-progress";

/**
 * A user's live challenge status. Success = EVERY task hit its total target. Before
 * the challenge ends it can only read "success" (already met) or "in-progress" — it
 * can't be a failure while days remain. After it ends: "success" or "failure".
 * An empty task list reads "in-progress" (nothing to judge).
 */
export function challengeStatusForUser(
  tasks: Task[],
  logs: DailyLog[],
  startDate: string,
  weeks: number,
  today: string,
): ChallengeUserStatus {
  if (tasks.length === 0) return "in-progress";
  const allPass = tasks.every((t) => taskPassed(t, logs, startDate, weeks));
  if (challengeEnded(startDate, weeks, today)) return allPass ? "success" : "failure";
  return allPass ? "success" : "in-progress";
}

/**
 * The user's FINAL result (for settlement) — success iff every task passed. Callers
 * settle only after the challenge has ended. Returns null if the user has no tasks
 * (they never joined → not judgeable).
 */
export function challengeResultForUser(
  tasks: Task[],
  logs: DailyLog[],
  startDate: string,
  weeks: number,
): ChallengeResult | null {
  if (tasks.length === 0) return null;
  return tasks.every((t) => taskPassed(t, logs, startDate, weeks)) ? "success" : "failure";
}

/**
 * Team result: success iff BOTH members succeeded; any failure drags both down
 * (either fails → both take the penalty, D2). Null if either side is unknown yet.
 */
export function combineTeamChallenge(
  a: ChallengeResult | null,
  b: ChallengeResult | null,
): ChallengeResult | null {
  if (a === null || b === null) return null;
  if (a === "failure" || b === "failure") return "failure";
  return "success";
}

/**
 * Display-only pace reference (D2): the cumulative amount a task "should" be at by
 * `today` on a linear pace to hit target over the whole span, clamped to [0, target].
 * `today` counts as elapsed. Never a settlement input — the pace line never judges.
 */
export function paceExpected(
  task: Task,
  startDate: string,
  weeks: number,
  today: string,
): number {
  const totalDays = weeks * 7;
  const elapsed = Math.max(0, Math.min(totalDays, daysBetween(startDate, today) + 1));
  return (task.target * elapsed) / totalDays;
}

/**
 * The 组建期 (setup window), D13. `SETUP_WINDOW_DAYS` is deliberately ONE constant
 * driving TWO rules, so a single time frame explains both:
 *   - auto-void: the partner must join within this window (`autoVoidDue`);
 *   - free edits: both members may edit freely within it (`freeEditOpen`).
 * Day 0 = the creation day; the window covers days 0..2 and closes on day +3 — exactly
 * when an unjoined challenge would void. The joiner therefore ALWAYS lands inside it.
 */
export const SETUP_WINDOW_DAYS = 3;

/** Is `today` still inside the challenge's setup window (组建期)? */
export function withinSetupWindow(createdDate: string, today: string): boolean {
  return daysBetween(createdDate, today) < SETUP_WINDOW_DAYS;
}

/**
 * Before the challenge starts, tasks are freely editable — no "one edit" is consumed
 * and no confirm is shown (D10). This is the scheduled-but-not-started window.
 */
export function preStartEditable(startDate: string, today: string): boolean {
  return today < startDate;
}

/**
 * Free (non-consuming) edits are open when EITHER condition holds — a strict SUPERSET
 * of the old D10 rule, so nothing regresses:
 *   - the challenge has not started yet (classic D10 pre-start freedom), OR
 *   - we are still inside the 组建期 (D13 setup window).
 *
 * Why the OR matters: a Thursday create for next Monday is 4 days pre-start, which is
 * LONGER than the 3-day setup window — a pure setup-window rule would have locked it on
 * Sunday, *before the challenge even began*, regressing D10. Conversely a backdated
 * (this-week) start is already "started" at creation, so only the setup window keeps it
 * editable. Each clause covers the other's blind spot.
 *
 * Applies to BOTH members: the joiner fills tasks into someone else's frame and is the
 * more rushed party, so she gets the same freedom — and since joining is only possible
 * inside the setup window, she is always inside it when she joins (D13).
 */
export function freeEditOpen(startDate: string, createdDate: string, today: string): boolean {
  return !challengeStarted(startDate, today) || withinSetupWindow(createdDate, today);
}

export interface StartChoices {
  /** This week's Monday — offered only when initiating Mon–Wed; else null. */
  thisWeek: string | null;
  /** The next Monday strictly after this week's (always available). */
  nextMonday: string;
}

/**
 * Start-day options at creation (D13). Initiating Mon–Wed offers a CHOICE: start this
 * week (start_date = this week's Monday, up to 2 days in the past) or next Monday.
 * Thu–Sun offers next Monday only (unchanged). `start_date` is always a Monday, so all
 * week math / settlement / pace are untouched.
 */
export function startChoicesFor(today: string): StartChoices {
  const thisMonday = mondayOfWeek(today);
  const canStartThisWeek = isoDow(today) <= 3; // Mon(1) Tue(2) Wed(3)
  return {
    thisWeek: canStartThisWeek ? thisMonday : null,
    nextMonday: addDays(thisMonday, 7),
  };
}

/** How many days of the challenge are already in the past at `today` (0 if not backdated). */
export function daysMissedAtStart(startDate: string, today: string): number {
  return Math.max(0, daysBetween(startDate, today));
}

/**
 * The one-time mid-challenge edit (D7/D10). Available only AFTER the challenge has
 * started, through the FIRST HALF of the run (4 weeks → first 2 weeks / 14 days), and
 * only if not yet used (`editedAt` null). Pre-start edits are free (see
 * `preStartEditable`) and do NOT consume this one.
 */
export function midEditOpen(
  startDate: string,
  weeks: number,
  today: string,
  editedAt: string | null,
): boolean {
  if (editedAt) return false;
  if (today < startDate) return false; // pre-start = free edit, not this consumable one
  const halfDays = Math.floor((weeks * 7) / 2);
  return daysBetween(startDate, today) < halfDays;
}

/**
 * A duo challenge auto-voids once the partner has not joined within the 组建期 — i.e.
 * `SETUP_WINDOW_DAYS` after INITIATION (D13 re-anchors D9, which keyed off `start_date`).
 *
 * Why re-anchored: under D13 a challenge may start on THIS week's Monday, i.e. already
 * in the past at creation. Keyed off `start_date` the void condition would be satisfied
 * the instant the challenge was created, and the initiator's own client would cancel it
 * seconds later. Anchoring on creation makes the join deadline independent of the
 * chosen start day — and reuses the exact same window as free edits.
 *
 * Timezone grace is preserved by the window's size: `created_at` is stored UTC while
 * `today` is the device's local date, so the derived created-date can skew by up to a
 * day — with a 3-day window the partner still always gets ~2 full days (D9 note).
 *
 * Detected on load; the initiator's client writes status='cancelled' and both UIs derive
 * dormant.
 */
export function autoVoidDue(createdDate: string, today: string, memberCount: number): boolean {
  return daysBetween(createdDate, today) >= SETUP_WINDOW_DAYS && memberCount < 2;
}

/**
 * Is check-in / 补签 still OPEN for a given user?
 *
 * **Settling is the lock — ending is not.** The challenge ending does NOT close data
 * entry: per DECISIONS (D2, manual settlement), a user may freely backfill anywhere in
 * the challenge span right up until THEY settle. That's the whole point of settlement
 * being a deliberate, manual act — you finish the period, fix up the record, then lock
 * it by settling.
 *
 * Strictly **per-user**: my settling locks only my own check-ins; my partner keeps
 * backfilling until she settles. Un-settling (撤销结算, no time limit) reopens it.
 *
 * Callers still bound the date picker to the challenge span [start, end] — this only
 * governs whether entry is open at all, never which dates are legal.
 */
export function checkinOpenForUser(startDate: string, today: string, settled: boolean): boolean {
  return challengeStarted(startDate, today) && !settled;
}
