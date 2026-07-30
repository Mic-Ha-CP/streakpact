import { useMemo, useState } from "react";
import { useCoins } from "@/hooks/useCoins";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { currentMonthISO, shiftMonth, todayISO } from "@/lib/dates";
import { unitLabel, type UserId } from "@/data/models";
import { WeekBadge } from "@/components/WeekBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
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
import { Check, X, ChevronLeft, ChevronRight, Flame, History } from "lucide-react";
import { toast } from "sonner";

const WEEKDAY_CN = ["一", "二", "三", "四", "五", "六", "日"];

/** The 签到 calendar — the single 签到 / 补签 entry point (D6). */
const SigninCalendar = () => {
  const coins = useCoins();
  const today = todayISO();
  const realMonth = currentMonthISO();
  const [month, setMonth] = useState(realMonth);
  const [sel, setSel] = useState<string | null>(null);

  const signed = useMemo(() => new Set(coins.checkinDays), [coins.checkinDays]);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0 … Sun=6
  const cells: (string | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];

  const changeMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    if (next > realMonth) return; // never past the current month (no future 签到)
    setMonth(next);
    setSel(null);
  };

  if (coins.isLoading) return null;

  const selIsToday = sel === today;
  const canAct = sel !== null && (selIsToday || coins.canBackfill);
  const busy = coins.signInToday.isPending || coins.backfillCheckin.isPending;
  const act = () => {
    if (!sel) return;
    if (selIsToday) {
      coins.signInToday.mutate(undefined, {
        onSuccess: () => {
          toast.success("签到成功 🎉");
          setSel(null);
        },
        onError: (e) => toast.error(`签到失败：${(e as Error).message}`),
      });
    } else {
      coins.backfillCheckin.mutate(sel, {
        onSuccess: () => {
          toast.success("已补签");
          setSel(null);
        },
        onError: (e) => toast.error((e as Error).message),
      });
    }
  };

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card p-5 space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="pill bg-secondary-soft text-secondary-foreground">
          <Flame className="w-3 h-3" /> 连续签到 {coins.streak} 天
        </span>
        <span className="text-muted-foreground">累计签到 {coins.checkinDays.length} 天</span>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl hover:bg-muted" aria-label="上一月">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="font-display font-extrabold text-lg tabular-nums">{month}</div>
        <button
          onClick={() => changeMonth(1)}
          disabled={month >= realMonth}
          className="p-2 rounded-xl hover:bg-muted disabled:opacity-30"
          aria-label="下一月"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2.5 text-center text-[10px] text-muted-foreground font-bold">
        {WEEKDAY_CN.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2.5 place-items-center">
        {cells.map((date, idx) => {
          if (!date) return <div key={`b${idx}`} />;
          const day = Number(date.slice(-2));
          const isSigned = signed.has(date);
          const isFuture = date > today;
          const isToday = date === today;
          const selectable = !isSigned && !isFuture;
          const isSel = sel === date;
          return (
            <button
              key={date}
              disabled={!selectable}
              onClick={() => setSel(isSel ? null : date)}
              title={date}
              className={cn(
                "w-8 h-8 rounded-full grid place-items-center text-[11px] font-bold transition-all border",
                isSigned && "bg-success/15 border-success text-success",
                isFuture && "border-transparent text-muted-foreground/30",
                selectable && !isSel && "border-border text-foreground hover:border-primary",
                isToday && !isSigned && !isSel && "border-primary/50",
                isSel && "border-primary ring-2 ring-primary/30 text-primary",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>

      <Button className="w-full rounded-xl" disabled={!canAct || busy} onClick={act}>
        {sel === null
          ? "选择一天补签"
          : selIsToday
            ? "今日签到（免费）"
            : `补签 (-${coins.backfillCost} 金币)`}
      </Button>
      {sel !== null && !selIsToday && !coins.canBackfill && (
        <div className="text-[11px] text-danger text-center">
          金币不足 {coins.backfillCost}，无法补签。
        </div>
      )}
      <div className="text-[11px] text-muted-foreground text-center">
        绿色 = 已签到 · 点未签的过去日期补签（今天免费）。
      </div>
    </div>
  );
};

const MonthResultBadge = ({ result }: { result: MonthResult | null }) => {
  if (!result) return <span className="pill border border-border text-muted-foreground">进行中</span>;
  if (result === "success") return <span className="pill bg-success text-success-foreground">成功</span>;
  if (result === "failure") return <span className="pill bg-danger text-danger-foreground">失败</span>;
  return <span className="pill bg-muted text-muted-foreground">无事发生</span>;
};

/** Legacy month view (last real old-model month, 2026-06) — collapsed by default. */
const LegacyMonthView = () => {
  const today = todayISO();
  const currentMonth = "2026-06";
  const { tasks } = useTasks(currentMonth);
  const { logs } = useLogs(currentMonth);
  const [active, setActive] = useState<UserId>("CP");
  const [openWeek, setOpenWeek] = useState<WeekLabel | null>(null);

  const weeks = getWeeksInMonth(currentMonth);
  const myTasks = useMemo(
    () => tasks.filter((t) => t.userId === active && t.month === currentMonth),
    [tasks, active, currentMonth],
  );
  const openWeekDef = weeks.find((w) => w.label === openWeek);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{currentMonth} · 点击某周查看每日明细</div>
        <MonthResultBadge result={monthStatus(myTasks, logs, currentMonth, today).result} />
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

      <div className="bg-background rounded-3xl border border-border/60 overflow-hidden divide-y divide-border/60">
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
              </button>

              {isOpen && openWeekDef && (
                <div className="p-4 bg-muted/20 space-y-3">
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
                              const done = dayLogs.some((x) => x.value > 0);
                              return (
                                <div
                                  key={d.date}
                                  title={d.date}
                                  className={cn(
                                    "aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] font-bold",
                                    isFuture ? "bg-muted/40 text-muted-foreground/40" : done ? "bg-success-soft text-success" : "bg-danger-soft/40 text-danger/70",
                                  )}
                                >
                                  {isFuture ? d.day : done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <X className="w-3.5 h-3.5" strokeWidth={3} />}
                                  <span className="opacity-60">{d.day}</span>
                                </div>
                              );
                            }
                            const mins = dayLogs.reduce((s, x) => s + (x.value ?? 0), 0);
                            return (
                              <div
                                key={d.date}
                                title={`${d.date} · ${mins}分钟`}
                                className={cn(
                                  "aspect-square rounded-xl flex flex-col items-center justify-center text-[10px] font-bold",
                                  isFuture ? "bg-muted/40 text-muted-foreground/40" : mins > 0 ? "bg-secondary-soft text-secondary-foreground" : "bg-muted text-muted-foreground/60",
                                )}
                              >
                                <span className="tabular-nums leading-none">{mins}</span>
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

const Calendar = () => (
  <div className="space-y-5 max-w-2xl md:max-w-3xl mx-auto">
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">周历</h1>
      <p className="text-sm text-muted-foreground">签到日历 · 点未签的过去日期补签</p>
    </div>

    <SigninCalendar />

    <details className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-muted-foreground flex items-center gap-2 hover:bg-muted/40">
        <History className="w-4 h-4" /> 历史月度记录（旧模型 · ≤ 2026-06）
      </summary>
      <div className="p-4">
        <LegacyMonthView />
      </div>
    </details>
  </div>
);

export default Calendar;
