import { useMemo } from "react";
import type { DailyLog, Task } from "@/data/models";
import { dayToWeek } from "@/data/calc";
import { shiftDate, startOfWeekISO, weekdayCN, monthOfWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Read-only "本周一览" grid for the CheckIn page — a sheet-style glance at the
 * whole week without clicking day by day. Days are rows (Mon–Sun of the week
 * containing `selectedDate`), tasks are columns. Cells show ✓ / minutes / — / ·.
 * Tapping a past-or-today row jumps the day view to that date (editing stays in
 * the day cards below). Future days are not selectable, mirroring the date arrow.
 *
 * The parent loads logs by monthOfWeek(selectedDate) — the month that owns this
 * week — so all 7 displayed days sit inside the loaded span. A week that spills
 * across the month boundary still shows real ✓/— for its spill days, not a blind ·.
 */
export function WeekTable({
  tasks,
  logs,
  selectedDate,
  today,
  onSelectDay,
}: {
  tasks: Task[];
  logs: DailyLog[];
  selectedDate: string;
  today: string;
  onSelectDay: (date: string) => void;
}) {
  const days = useMemo(() => {
    const mon = startOfWeekISO(selectedDate);
    return Array.from({ length: 7 }, (_, i) => shiftDate(mon, i));
  }, [selectedDate]);

  const loadedMonth = monthOfWeek(selectedDate);
  const weekLabel = dayToWeek(loadedMonth, selectedDate);

  const cols = {
    gridTemplateColumns: `5.25rem repeat(${tasks.length}, minmax(0, 1fr))`,
  };

  const cellFor = (task: Task, date: string) => {
    const dayLogs = logs.filter((l) => l.taskId === task.id && l.date === date);
    if (task.type === "count") {
      if (dayLogs.some((l) => l.value > 0)) return { text: "✓", tone: "done" as const };
    } else {
      const mins = dayLogs.reduce((s, l) => s + (l.value ?? 0), 0);
      if (mins > 0) return { text: `${mins}'`, tone: "done" as const };
    }
    if (date < today) return { text: "—", tone: "miss" as const };
    return { text: "·", tone: "idle" as const };
  };

  const toneClass = {
    done: "text-success font-bold",
    miss: "text-muted-foreground",
    idle: "text-muted-foreground/40",
  };

  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
      <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between gap-2">
        <div className="text-sm font-bold flex items-center gap-2">
          本周一览
          {weekLabel && (
            <span className="pill bg-secondary-soft text-secondary-foreground">{weekLabel}</span>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">点某天 → 跳到下方编辑</span>
      </div>

      {/* Header: task titles */}
      <div className="grid items-end px-3 pt-3 pb-1.5 gap-1" style={cols}>
        <div />
        {tasks.map((t) => (
          <div key={t.id} className="px-1 text-center text-xs font-bold truncate" title={t.title}>
            {t.title}
          </div>
        ))}
      </div>

      {/* Rows: one per day */}
      <div className="px-2 pb-2 space-y-0.5">
        {days.map((date) => {
          const selectable = date <= today;
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const md = `${Number(date.slice(5, 7))}-${date.slice(8, 10)}`;
          return (
            <button
              key={date}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDay(date)}
              style={cols}
              className={cn(
                "grid items-center w-full gap-1 rounded-xl px-1 py-2 text-left transition-colors",
                selectable ? "hover:bg-muted cursor-pointer" : "cursor-default opacity-60",
                isToday && "bg-secondary-soft/50",
                isSelected && !isToday && "bg-muted/70",
                isSelected && "ring-1 ring-inset ring-primary/40",
              )}
            >
              <div className="flex items-center gap-1.5 pl-1.5">
                <span className="text-xs font-bold">{weekdayCN(date)}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">{md}</span>
                {isToday && (
                  <span className="pill bg-success-soft text-success text-[10px] px-1.5 py-0">今</span>
                )}
              </div>
              {tasks.map((t) => {
                const c = cellFor(t, date);
                return (
                  <div
                    key={t.id}
                    className={cn("text-center text-sm tabular-nums", toneClass[c.tone])}
                  >
                    {c.text}
                  </div>
                );
              })}
            </button>
          );
        })}
      </div>
    </div>
  );
}
