import type { DailyLog, Task } from "./types";

export const WEEK_LABELS = ["W1", "W2", "W3", "W4", "W5"] as const;
export type WeekLabel = (typeof WEEK_LABELS)[number];

// For simplicity in the prototype: weeks of a month split into 7-day buckets
// W1 = days 1-7, W2 = 8-14, W3 = 15-21, W4 = 22-28, W5 = 29-31
export function getWeeksInMonth(month: string): { label: WeekLabel; start: number; end: number }[] {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const weeks: { label: WeekLabel; start: number; end: number }[] = [
    { label: "W1", start: 1, end: 7 },
    { label: "W2", start: 8, end: 14 },
    { label: "W3", start: 15, end: 21 },
    { label: "W4", start: 22, end: 28 },
  ];
  if (lastDay >= 29) weeks.push({ label: "W5", start: 29, end: lastDay });
  return weeks;
}

export function dayToWeek(month: string, dayNum: number): WeekLabel {
  const weeks = getWeeksInMonth(month);
  return weeks.find((w) => dayNum >= w.start && dayNum <= w.end)?.label ?? "W1";
}

export function logsForTaskInRange(logs: DailyLog[], taskId: string, month: string, start: number, end: number) {
  return logs.filter((l) => {
    if (l.taskId !== taskId) return false;
    if (!l.date.startsWith(month)) return false;
    const day = +l.date.slice(-2);
    return day >= start && day <= end;
  });
}

/** Returns weekly progress value (count of done days OR sum of minutes). */
export function weeklyProgress(task: Task, logs: DailyLog[], month: string, week: WeekLabel): number {
  const w = getWeeksInMonth(month).find((x) => x.label === week)!;
  const ls = logsForTaskInRange(logs, task.id, month, w.start, w.end);
  if (task.type === "count") return ls.filter((l) => l.done).length;
  return ls.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
}

/** Has the week completed (i.e. its end day <= today) */
export function weekIsComplete(month: string, week: WeekLabel, today: string): boolean {
  const w = getWeeksInMonth(month).find((x) => x.label === week)!;
  if (!today.startsWith(month)) {
    // future or past month
    return today > month;
  }
  const todayDay = +today.slice(-2);
  return todayDay > w.end;
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
  const complete = weekIsComplete(month, week, today);
  const allPass = userTasks.every((t) => weeklyProgress(t, logs, month, week) >= t.target);
  if (complete) return allPass ? "success" : "fail";
  if (allPass) return "success";
  // current/future week with progress not yet enough
  const w = getWeeksInMonth(month).find((x) => x.label === week)!;
  const todayDay = today.startsWith(month) ? +today.slice(-2) : -1;
  if (todayDay >= w.start && todayDay <= w.end) return "in-progress";
  if (todayDay < w.start) return "pending";
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
  // month is decided once all weeks are complete
  const allDone = completed === weeks.length;
  let result: MonthResult | null = null;
  if (allDone) {
    if (success >= 3) result = "success";
    else if (success <= 1) result = "fail";
    else result = "neutral";
  }
  return {
    successWeeks: success,
    totalWeeks: weeks.length,
    result,
  };
}
