import { useMemo, useState } from "react";
import { unitLabel, type UserId } from "@/data/models";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { currentMonthISO, todayISO } from "@/lib/dates";
import { WeekBadge } from "@/components/WeekBadge";
import { ProgressBar } from "@/components/ProgressBar";
import {
  WEEK_LABELS,
  type WeekLabel,
  type MonthResult,
  dayToWeek,
  getWeeksInMonth,
  monthStatus,
  weeklyProgress,
  weekStatusForUser,
  logsForTaskInRange,
  formatWeekLabel,
} from "@/data/calc";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

const MonthResultBadge = ({ result }: { result: MonthResult | null }) => {
  if (!result) return <span className="pill border border-border text-muted-foreground">进行中</span>;
  if (result === "success") return <span className="pill bg-success text-success-foreground">成功</span>;
  if (result === "failure") return <span className="pill bg-danger text-danger-foreground">失败</span>;
  return <span className="pill bg-muted text-muted-foreground">无事发生</span>;
};

const Calendar = () => {
  const currentMonth = currentMonthISO();
  const today = todayISO();
  const { tasks } = useTasks(currentMonth);
  const { logs } = useLogs(currentMonth);
  const [active, setActive] = useState<UserId>("CP");
  const [openWeek, setOpenWeek] = useState<WeekLabel | null>(
    today.startsWith(currentMonth) ? (dayToWeek(currentMonth, today) ?? "W1") : "W1",
  );

  const weeks = getWeeksInMonth(currentMonth);
  const myTasks = useMemo(
    () => tasks.filter((t) => t.userId === active && t.month === currentMonth),
    [tasks, active, currentMonth],
  );

  const openWeekDef = weeks.find((w) => w.label === openWeek);

  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">月度周历</h1>
          <p className="text-sm text-muted-foreground">{currentMonth} · 点击某周查看每日明细</p>
        </div>
        <div className="text-right space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{active} 本月结算</div>
          <MonthResultBadge result={monthStatus(myTasks, logs, currentMonth, today).result} />
        </div>
      </div>

      <div className="flex gap-2">
        {(["CP", "JX"] as UserId[]).map((u) => (
          <button
            key={u}
            onClick={() => setActive(u)}
            className={cn(
              "flex-1 py-2 rounded-2xl font-bold transition-all border-2",
              active === u
                ? u === "CP"
                  ? "bg-cp-soft text-cp border-cp"
                  : "bg-jx-soft text-jx border-jx"
                : "bg-card text-muted-foreground border-border",
            )}
          >
            {u}
          </button>
        ))}
      </div>

      {/* Weekly rows */}
      <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden divide-y divide-border/60">
        {WEEK_LABELS.filter((w) => weeks.find((x) => x.label === w)).map((w) => {
          const status = weekStatusForUser(myTasks, logs, currentMonth, w, today);
          const weekDef = weeks.find((x) => x.label === w)!;
          const isOpen = openWeek === w;
          return (
            <div key={w}>
              <button
                onClick={() => setOpenWeek(isOpen ? null : w)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 text-left hover:bg-muted/40 transition-colors",
                  isOpen && "bg-muted/30",
                )}
              >
                <WeekBadge label={w} status={status} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{formatWeekLabel(currentMonth, w)}</div>
                  <div className="text-xs text-muted-foreground">
                    {weekDef.startDate} ~ {weekDef.endDate}
                  </div>
                </div>
                <div className="hidden sm:flex flex-col gap-1.5 w-1/2 max-w-xs">
                  {myTasks.map((t) => {
                    const v = weeklyProgress(t, logs, currentMonth, w);
                    return (
                      <div key={t.id} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="truncate pr-2">{t.title}</span>
                          <span className={cn("tabular-nums font-bold", v >= t.target ? "text-success" : "")}>
                            {v}/{t.target}
                          </span>
                        </div>
                        <ProgressBar value={v} max={t.target} user={active} />
                      </div>
                    );
                  })}
                </div>
              </button>

              {/* Daily breakdown */}
              {isOpen && openWeekDef && (
                <div className="p-4 bg-muted/20 space-y-3 animate-slide-up">
                  {myTasks.map((t) => {
                    const days: { day: number; date: string }[] = [];
                    const startD = new Date(openWeekDef.startDate);
                    for (let i = 0; i < 7; i++) {
                      const d = new Date(startD);
                      d.setDate(startD.getDate() + i);
                      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      days.push({ day: d.getDate(), date });
                    }
                    const ls = logsForTaskInRange(logs, t.id, openWeekDef.startDate, openWeekDef.endDate);
                    const v = weeklyProgress(t, logs, currentMonth, w);
                    return (
                      <div key={t.id} className="bg-card rounded-2xl p-3 border border-border/60">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-sm">{t.title}</div>
                          <span className={cn("pill", v >= t.target ? "bg-success-soft text-success" : "bg-muted text-muted-foreground")}>
                            {v}/{t.target} {unitLabel(t.unit)}
                          </span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                          {days.map((d) => {
                            const dayLogs = ls.filter((x) => x.date === d.date);
                            const isFuture = d.date > today;
                            if (t.type === "count") {
                              const done = dayLogs.length > 0;
                              return (
                                <div
                                  key={d.date}
                                  className={cn(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] font-bold",
                                    isFuture
                                      ? "bg-muted/40 text-muted-foreground/40"
                                      : done
                                        ? "bg-success-soft text-success"
                                        : "bg-danger-soft/40 text-danger/70",
                                  )}
                                  title={d.date}
                                >
                                  {isFuture ? d.day : done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={3} />}
                                  <span className="opacity-60">{d.day}</span>
                                </div>
                              );
                            }
                            const m = dayLogs.reduce((s, x) => s + (x.value ?? 0), 0);
                            return (
                              <div
                                key={d.date}
                                className={cn(
                                  "aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] font-bold",
                                  isFuture
                                    ? "bg-muted/40 text-muted-foreground/40"
                                    : m > 0
                                      ? "bg-secondary-soft text-secondary-foreground"
                                      : "bg-muted text-muted-foreground/60",
                                )}
                                title={`${d.date} · ${m}分钟`}
                              >
                                <span className="tabular-nums leading-none">{m}</span>
                                <span className="opacity-60 leading-none mt-0.5">{d.day}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
