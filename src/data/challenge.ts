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
 * Before the challenge starts, tasks are freely editable — no "one edit" is consumed
 * and no confirm is shown (D10). This is the scheduled-but-not-started window.
 */
export function preStartEditable(startDate: string, today: string): boolean {
  return today < startDate;
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
 * A duo challenge auto-voids (D9) once its start day arrives and the partner never
 * joined (only the initiator has a member row → memberCount < 2). Detected on load;
 * the initiator's client writes status='cancelled' and both UIs derive dormant.
 */
export function autoVoidDue(startDate: string, today: string, memberCount: number): boolean {
  return today >= startDate && memberCount < 2;
}
