import type { DailyLog, Task } from "./types";

export const WEEK_LABELS = ["W1", "W2", "W3", "W4", "W5"] as const;
export type WeekLabel = (typeof WEEK_LABELS)[number];

export interface WeekRange {
  label: WeekLabel;
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string;   // YYYY-MM-DD (Sunday)
}

const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Weeks of a month: Monday → Sunday.
 * W1 starts on the first Monday on or after the 1st of the month.
 * Days before that first Monday belong to the previous month's last week.
 * The last week may extend into the following month (endDate spills over).
 */
export function getWeeksInMonth(month: string): WeekRange[] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const dow = first.getDay(); // 0=Sun..6=Sat
  const offset = (1 - dow + 7) % 7; // days until first Monday
  const firstMonday = new Date(y, m - 1, 1 + offset);

  const weeks: WeekRange[] = [];
  const cursor = new Date(firstMonday);
  let idx = 0;
  while (cursor.getMonth() === m - 1 && idx < WEEK_LABELS.length) {
    const start = new Date(cursor);
    const end = new Date(cursor);
    end.setDate(end.getDate() + 6);
    weeks.push({ label: WEEK_LABELS[idx], startDate: fmt(start), endDate: fmt(end) });
    cursor.setDate(cursor.getDate() + 7);
    idx++;
  }
  return weeks;
}

export function dayToWeek(month: string, date: string): WeekLabel | null {
  return getWeeksInMonth(month).find((w) => date >= w.startDate && date <= w.endDate)?.label ?? null;
}

export function logsForTaskInRange(
  logs: DailyLog[],
  taskId: string,
  startDate: string,
  endDate: string,
) {
  return logs.filter(
    (l) => l.taskId === taskId && l.date >= startDate && l.date <= endDate,
  );
}

/** Returns weekly progress value (count of done days OR sum of minutes). */
export function weeklyProgress(task: Task, logs: DailyLog[], month: string, week: WeekLabel): number {
  const w = getWeeksInMonth(month).find((x) => x.label === week);
  if (!w) return 0;
  const ls = logsForTaskInRange(logs, task.id, w.startDate, w.endDate);
  if (task.type === "count") return ls.filter((l) => l.done).length;
  return ls.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
}

/** Has the week completed (Sunday has passed)? */
export function weekIsComplete(month: string, week: WeekLabel, today: string): boolean {
  const w = getWeeksInMonth(month).find((x) => x.label === week);
  if (!w) return false;
  return today > w.endDate;
}

export type WeekStatus = "success" | "fail" | "pending" | "in-progress";

export function weekStatusForUser(
  tasks: Task[],
  logs: DailyLog[],
  month: string,
  week: WeekLabel,
  today: string,
): WeekStatus {
  const userTasks = tasks.filter((t) => t.month === month);
  if (userTasks.length === 0) return "pending";
  const w = getWeeksInMonth(month).find((x) => x.label === week);
  if (!w) return "pending";
  const complete = today > w.endDate;
  const allPass = userTasks.every((t) => weeklyProgress(t, logs, month, week) >= t.target);
  if (complete) return allPass ? "success" : "fail";
  if (allPass) return "success";
  if (today >= w.startDate && today <= w.endDate) return "in-progress";
  if (today < w.startDate) return "pending";
  return "fail";
}

export type MonthResult = "success" | "fail" | "neutral";

export function monthStatus(
  tasks: Task[],
  logs: DailyLog[],
  month: string,
  today: string,
): { successWeeks: number; totalWeeks: number; result: MonthResult | null } {
  const weeks = getWeeksInMonth(month);
  let success = 0;
  let completed = 0;
  for (const w of weeks) {
    const s = weekStatusForUser(tasks, logs, month, w.label, today);
    if (s === "success") success++;
    if (weekIsComplete(month, w.label, today)) completed++;
  }
  const allDone = completed === weeks.length;
  let result: MonthResult | null = null;
  if (allDone) {
    if (success >= 3) result = "success";
    else if (success <= 1) result = "fail";
    else result = "neutral";
  }
  return { successWeeks: success, totalWeeks: weeks.length, result };
}

/** Format like "2026-4月 W1" */
export function formatWeekLabel(month: string, week: WeekLabel): string {
  const [y, m] = month.split("-").map(Number);
  return `${y}-${m}月 ${week}`;
}
