export type UserId = "CP" | "JX";

export type TaskType = "count" | "timer";

export interface Task {
  id: string;
  userId: UserId;
  month: string; // YYYY-MM
  title: string;
  type: TaskType;
  target: number; // count: days/week  |  timer: minutes/week
  unit: string;   // "天" | "分钟"
  editCount?: number; // edits used this month (carried-over / new tasks start at 0)
}

export interface DailyLog {
  id: string;
  taskId: string;
  date: string;     // YYYY-MM-DD
  done?: boolean;   // count
  minutes?: number; // timer (single entry's minutes)
  note?: string;
  backfilled?: boolean;
  createdAt?: number; // epoch ms — for ordering timer entries
}

export type RewardStatus = "pending" | "in_progress" | "used" | "completed" | "forfeited";
export type RewardType = "reward" | "penalty";

export interface RewardEntry {
  id: string;
  userId: UserId;
  type: RewardType;
  content: string;
  source: string;        // e.g. "2026-04 W2" or "2026-04 月度"
  status: RewardStatus;
  notes?: string;
  expiry?: string;       // YYYY-MM-DD
  remarks?: string;
}

export interface RewardPlan {
  id: string;
  userId: UserId;
  month: string;
  scope: "W1" | "W2" | "W3" | "W4" | "W5" | "MONTH";
  rewardText: string;
  penaltyText: string;
}
