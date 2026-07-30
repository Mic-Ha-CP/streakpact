// App-facing domain models for the Supabase-backed data layer.
//
// These mirror the DB tables (see supabase/migration.sql) but use camelCase and
// represent the user by display name ("CP"/"JX") instead of a uuid — the hooks
// translate user_id <-> display_name at the boundary via the profiles map.

export type UserId = "CP" | "JX";
export type TaskType = "count" | "timer";

/** Canonical DB unit for a task type ('times' for count, 'minutes' for timer). */
export function unitForType(type: TaskType): string {
  return type === "count" ? "times" : "minutes";
}

/** Localized display label for a stored unit value. */
export function unitLabel(unit: string): string {
  if (unit === "times") return "次";
  if (unit === "minutes") return "分钟";
  return unit;
}

export interface Task {
  id: string;
  userId: UserId;
  month: string; // YYYY-MM (year_month)
  title: string;
  type: TaskType;
  target: number; // target_value — weekly target (days for count, minutes for timer)
  unit: string; // 'times' | 'minutes'
  carriedOver: boolean;
  editCount: number;
}

export interface DailyLog {
  id: string;
  taskId: string;
  userId: UserId;
  date: string; // YYYY-MM-DD (log_date)
  value: number; // 1 for a count check-in, minutes for a timer entry
  note: string | null;
  backfilled: boolean;
  createdAt: string; // ISO timestamp; orders multiple same-day timer entries
}

export type RewardStatus =
  | "pending"
  | "in_progress"
  | "used"
  | "completed"
  | "forfeited";
export type RewardType = "reward" | "penalty";

export interface RewardPlan {
  id: string;
  userId: UserId;
  month: string;
  weekNumber: number | null; // null = monthly plan, 1-5 = weekly
  successReward: string;
  failurePenalty: string;
}

export interface LedgerEntry {
  id: string;
  userId: UserId;
  type: RewardType;
  content: string;
  source: string; // "2026-04 W2" or "2026-04 月"
  status: RewardStatus;
  usedProgress: string | null;
  expiryDate: string | null;
  notes: string | null;
}

// --- Periods & Gamify P1 (see docs/design/PERIODS_AND_GAMIFY.md) --------------
export type ChallengeMode = "solo" | "duo";
export type ChallengeStatus = "active" | "cancelled" | "aborted";
export type ChallengeResultValue = "success" | "failure";

/** A shared opt-in period (single-layer, total-target settlement). */
export interface Challenge {
  id: string;
  startDate: string; // YYYY-MM-DD (a Monday)
  weeks: number; // fixed 4 in v1
  initiator: UserId;
  mode: ChallengeMode; // only "duo" used now
  teamReward: string | null; // optional shared success reward
  status: ChallengeStatus;
  createdAt: string;
}

/** One user's participation in a challenge: deposit declaration + settlement state. */
export interface ChallengeMember {
  id: string;
  challengeId: string;
  userId: UserId;
  depositStake: string | null; // 押什么
  depositExecution: string | null; // 失败如何执行
  result: ChallengeResultValue | null; // null = not yet settled
  settledAt: string | null;
  editedAt: string | null; // null = the one mid-challenge edit is unused
  abortRequestedAt: string | null; // D11: this side requested/confirmed a consensual abort
}
