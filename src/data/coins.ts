// Pure coin-earning math (D5) — see docs/design/PERIODS_AND_GAMIFY.md. Earned coins are
// DERIVED from the underlying rows (task check-ins, 签到 days, challenge wins), never
// stored, so undo / backfill / un-settle auto-correct. Balance = earned + Σ spends
// (spends live in coin_ledger as negative amounts). All values come from coinRules.ts.

import { COINS } from "./coinRules";
import { addDays } from "./challenge";
import type { DailyLog, Task } from "./models";

/**
 * Current 连续签到 streak from a set of 签到 dates. Anchored at `today` if signed today,
 * else at yesterday (so a not-yet-signed today doesn't zero a live streak); counts
 * consecutive days backwards from the anchor. Returns 0 if neither today nor yesterday
 * is signed.
 */
export function checkinStreak(days: string[], today: string): number {
  const set = new Set(days);
  let cur = set.has(today) ? today : set.has(addDays(today, -1)) ? addDays(today, -1) : null;
  if (cur === null) return 0;
  let n = 0;
  while (set.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

/**
 * Coins from one timer TASK's minutes on a SINGLE day (D12 three-tier formula). The day's
 * total minutes M are split across tiers by minute-band (prevUpto, uptoMinutes]; each tier
 * awards ceil(portion / blockMinutes) coins (a started block counts), capped at the tier's
 * maxCoins. The tier maxes sum to 22, so this is inherently ≤ 22 per task per day.
 */
export function coinsForTimerDay(dayMinutes: number): number {
  let coins = 0;
  let lower = 0;
  for (const tier of COINS.timerTiers) {
    const portion = Math.max(0, Math.min(dayMinutes, tier.uptoMinutes) - lower);
    if (portion > 0) coins += Math.min(Math.ceil(portion / tier.blockMinutes), tier.maxCoins);
    lower = tier.uptoMinutes;
  }
  return coins;
}

/**
 * Coins earned from one task's logs:
 *   count → COINS.countPerCheckin per DISTINCT checked-in day (dup same-day rows = 1);
 *   timer → per day, the D12 three-tier formula (coinsForTimerDay), summed over days.
 * `backfilled` is irrelevant — a backfilled log counts exactly like a live one.
 */
export function coinsFromTaskLogs(task: Task, logs: DailyLog[]): number {
  const taskLogs = logs.filter((l) => l.taskId === task.id && (l.value ?? 0) > 0);
  if (task.type === "count") {
    const days = new Set(taskLogs.map((l) => l.date)).size;
    return days * COINS.countPerCheckin;
  }
  const perDay = new Map<string, number>();
  for (const l of taskLogs) perDay.set(l.date, (perDay.get(l.date) ?? 0) + l.value);
  let coins = 0;
  for (const mins of perDay.values()) coins += coinsForTimerDay(mins);
  return coins;
}

/** Total coins earned from all of a user's challenge task logs. */
export function coinsFromLogs(tasks: Task[], logs: DailyLog[]): number {
  return tasks.reduce((sum, t) => sum + coinsFromTaskLogs(t, logs), 0);
}

/** Coins from 签到: COINS.checkinPerDay per 签到 day (backfilled or not). */
export function coinsFromCheckins(checkinDayCount: number): number {
  return checkinDayCount * COINS.checkinPerDay;
}

/** Coins from challenge wins: COINS.challengeSuccess per settled success. */
export function coinsFromChallengeWins(winCount: number): number {
  return winCount * COINS.challengeSuccess;
}

export interface EarningsBreakdown {
  checkin: number; // from 签到
  tasks: number; // from challenge check-ins
  wins: number; // from challenge successes
  total: number;
}

/** Full earnings breakdown (grouped by source) — the Ledger coin section renders this. */
export function earnedCoins(input: {
  tasks: Task[];
  logs: DailyLog[];
  checkinDayCount: number;
  winCount: number;
}): EarningsBreakdown {
  const checkin = coinsFromCheckins(input.checkinDayCount);
  const tasks = coinsFromLogs(input.tasks, input.logs);
  const wins = coinsFromChallengeWins(input.winCount);
  return { checkin, tasks, wins, total: checkin + tasks + wins };
}
