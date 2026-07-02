// Real (system-clock) date helpers, replacing the old hardcoded demo constants.

/** Local date as YYYY-MM-DD. */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Current month as YYYY-MM. */
export function currentMonthISO(d: Date = new Date()): string {
  return todayISO(d).slice(0, 7);
}

/** Month immediately before the given YYYY-MM. */
export function prevMonthISO(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(y, m - 2, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a YYYY-MM month by a number of months (handles year boundaries). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

/** Shift a YYYY-MM-DD date by a number of days. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return todayISO(dt);
}

const WEEKDAYS_CN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** Chinese weekday label (周一…周日) for a YYYY-MM-DD date. */
export function weekdayCN(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS_CN[new Date(y, m - 1, d).getDay()];
}

/** Monday (YYYY-MM-DD) of the week containing the given date — week starts Monday. */
export function startOfWeekISO(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // 0=Mon … 6=Sun
  dt.setDate(dt.getDate() - dow);
  return todayISO(dt);
}

/**
 * The month (YYYY-MM) that OWNS the week containing `date` — i.e. the calendar
 * month of that week's Monday. This is the app's "accountability month" and the
 * single source of truth for "which month are we in right now". On the first days
 * of a calendar month that still belong to the previous month's final week (a
 * carry-in week, e.g. 2026-07-01..05 ∈ June W5), it returns the PREVIOUS month —
 * matching getWeeksInMonth's rule that a week belongs to the month of its Monday.
 *
 * NOTE: Setup.tsx deliberately does NOT use this — task setup is keyed on the
 * plain calendar month (currentMonthISO), because the one-edit lock and the
 * future-month cap are per calendar month. Don't "unify" that to monthOfWeek.
 */
export function monthOfWeek(date: string): string {
  return startOfWeekISO(date).slice(0, 7);
}
