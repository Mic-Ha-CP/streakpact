import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { unitLabel, type DailyLog, type Task, type UserId } from "@/data/models";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { useAuth } from "@/hooks/useAuth";
import { useSettlements, type MonthlySettlement } from "@/hooks/useSettlements";
import { monthOfWeek, shiftMonth, todayISO } from "@/lib/dates";
import { PersonChip } from "@/components/PersonChip";
import { ProgressBar } from "@/components/ProgressBar";
import { WeekBadge } from "@/components/WeekBadge";
import { RewardGapBanner } from "@/components/RewardGapBanner";
import {
  WEEK_LABELS,
  dayToWeek,
  getWeeksInMonth,
  monthStatus,
  weeklyProgress,
  weekStatusForUser,
  type MonthResult,
  type WeekLabel,
} from "@/data/calc";
import { Flame, Sparkles, Lock, ChevronLeft, ChevronRight, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MonthResultBadge = ({ result }: { result: MonthResult | null }) => {
  if (!result) return <span className="pill border border-border text-muted-foreground">进行中</span>;
  if (result === "success")
    return <span className="pill bg-success text-success-foreground">成功</span>;
  if (result === "failure")
    return <span className="pill bg-danger text-danger-foreground">失败</span>;
  return <span className="pill bg-muted text-muted-foreground">无事发生</span>;
};

interface SettleProps {
  pendingWeeks: WeekLabel[];
  onSettleWeek: (w: WeekLabel) => void;
  settling: boolean;
}

const UserPanel = ({
  userId,
  tasks,
  logs,
  currentMonth,
  today,
  isPastMonth,
  settledWeekly,
  settledMonthly,
  settle,
}: {
  userId: UserId;
  tasks: Task[];
  logs: DailyLog[];
  currentMonth: string;
  today: string;
  /** Viewing a month before the current accountability month — no "today"/"this week". */
  isPastMonth: boolean;
  settledWeekly: Set<number>;
  settledMonthly: MonthlySettlement | null;
  /** Settle actions for the current user only; null on the other user's panel. */
  settle: SettleProps | null;
}) => {
  const myTasks = tasks.filter((t) => t.userId === userId && t.month === currentMonth);
  // The current month has a "this week"; a past month does not (today isn't in it).
  const currentWeek = isPastMonth ? null : (dayToWeek(currentMonth, today) ?? "W1");
  const weeks = getWeeksInMonth(currentMonth);
  const month = monthStatus(myTasks, logs, currentMonth, today);

  // today's check-in status
  const todayDone = myTasks.every((t) => {
    const dayLogs = logs.filter((l) => l.taskId === t.id && l.date === today);
    if (t.type === "count") return dayLogs.some((l) => l.value > 0);
    return dayLogs.reduce((s, l) => s + (l.value ?? 0), 0) > 0;
  });

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden">
      {/* Header */}
      <div
        className={cn(
          "p-5 flex items-center justify-between",
          userId === "CP" ? "bg-cp-soft" : "bg-jx-soft",
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-2xl grid place-items-center font-black text-xl text-primary-foreground shadow-pop",
              userId === "CP" ? "bg-cp" : "bg-jx",
            )}
          >
            {userId}
          </div>
          <div>
            <div className="font-display font-extrabold text-lg leading-tight">{userId} 的本月</div>
            <div className="text-xs text-muted-foreground">{currentMonth} · 共 {weeks.length} 周</div>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-xs text-muted-foreground">达标周</div>
          <div className="font-display font-extrabold text-2xl tabular-nums leading-none">
            {month.successWeeks}
            <span className="text-base text-muted-foreground">/{month.totalWeeks}</span>
          </div>
          <div className="flex items-center justify-end gap-1.5">
            {settledMonthly ? (
              <MonthResultBadge result={settledMonthly.result} />
            ) : (
              <MonthResultBadge result={month.result} />
            )}
            {settledMonthly && (
              <span className="pill bg-primary/10 text-primary text-[10px] gap-1">
                <Lock className="w-2.5 h-2.5" /> 已结算
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Today (current month only) */}
      {!isPastMonth && (
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={cn("w-4 h-4", todayDone ? "text-secondary" : "text-muted-foreground")} />
            <span className="text-sm font-medium">今日打卡</span>
          </div>
          <span
            className={cn(
              "pill",
              todayDone ? "bg-success-soft text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {todayDone ? "已完成 ✓" : "待打卡"}
          </span>
        </div>
      )}

      {/* Week grid */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 justify-between">
          {WEEK_LABELS.filter((w) => weeks.find((x) => x.label === w)).map((w) => {
            const status = weekStatusForUser(myTasks, logs, currentMonth, w, today);
            const settled = settledWeekly.has(Number(w.slice(1)));
            return (
              <div key={w} className="relative">
                <WeekBadge label={w} status={status} size="md" active={w === currentWeek} />
                {settled && (
                  <span
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-card grid place-items-center"
                    title="已结算"
                  >
                    <Lock className="w-2 h-2 text-primary-foreground" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Settle (current user only) — Phase A: WEEKLY only. Monthly team settlement is
          intentionally absent here; it's reworked in Phase B with a both-sides gate. */}
      {settle && settle.pendingWeeks.length > 0 && (
        <div className="px-5 pb-4">
          <div className="rounded-2xl border border-secondary/40 bg-secondary-soft/40 p-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-secondary-foreground font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> 待结算
            </div>
            <div className="flex flex-wrap gap-2">
              {settle.pendingWeeks.map((w) => (
                <button
                  key={w}
                  disabled={settle.settling}
                  onClick={() => settle.onSettleWeek(w)}
                  className="px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold hover:bg-muted transition-colors disabled:opacity-50"
                >
                  结算 {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* This-week progress (current month only; a past month has no current week —
          use the 月度周历 for a past month's per-week breakdown). */}
      {currentWeek && (
        <div className="px-5 pb-5 space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            本周进度 · {currentWeek}
          </div>
          {myTasks.length === 0 && (
            <div className="text-sm text-muted-foreground py-4 text-center bg-muted/40 rounded-2xl">
              尚未设置任务
            </div>
          )}
          {myTasks.map((t) => {
            const v = weeklyProgress(t, logs, currentMonth, currentWeek);
            const passed = v >= t.target;
            return (
              <div key={t.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate pr-2">{t.title}</span>
                  <span
                    className={cn(
                      "tabular-nums font-bold text-xs",
                      passed ? "text-success" : "text-muted-foreground",
                    )}
                  >
                    {v}/{t.target} {unitLabel(t.unit)}
                  </span>
                </div>
                <ProgressBar value={v} max={t.target} user={userId} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Index = () => {
  const today = todayISO();
  const accMonth = monthOfWeek(today); // the real current accountability month
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("month");
  const [viewMonth, setViewMonth] = useState(
    requested && /^\d{4}-\d{2}$/.test(requested) && requested <= accMonth ? requested : accMonth,
  );
  const isPastMonth = viewMonth < accMonth;

  const { tasks } = useTasks(viewMonth);
  const { logs } = useLogs(viewMonth);
  const { userId: me } = useAuth();
  const s = useSettlements(viewMonth);

  const [settleTarget, setSettleTarget] = useState<WeekLabel | null>(null);
  const preview = settleTarget ? s.previewWeek(settleTarget) : null;

  const settledWeeklyFor = (u: UserId) =>
    new Set(s.weekly.filter((x) => x.userId === u).map((x) => x.weekNumber));
  const settledMonthlyFor = (u: UserId) => s.monthly.find((x) => x.userId === u) ?? null;

  const confirmSettle = () => {
    const w = settleTarget;
    if (!w) return;
    s.settleWeek.mutate(w, {
      onSuccess: (r) =>
        toast.success(
          r.ledgered
            ? `${r.week} 已结算 ✓ ${r.isSuccess ? "奖励" : "惩罚"}已入账本`
            : `${r.week} 已结算（${r.isSuccess ? "成功" : "失败"}，未设置${r.isSuccess ? "奖励" : "惩罚"}）`,
        ),
      onError: (e) => toast.error(`结算失败：${(e as Error).message}`),
    });
    setSettleTarget(null);
  };

  // Phase A: weekly settlement only. Clicking 结算 opens a preview first (below).
  const settleFor = (u: UserId): SettleProps | null =>
    u === me
      ? {
          pendingWeeks: s.pendingWeeks,
          onSettleWeek: (w) => setSettleTarget(w),
          settling: s.settleWeek.isPending,
        }
      : null;

  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
      <RewardGapBanner />

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">本月战况</h1>
          <p className="text-sm text-muted-foreground">
            {isPastMonth ? "查看并结算历史月份" : `今天 ${today} · 一起加油 💪`}
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-4 h-4 text-secondary" />
          每周 ≥ 全部任务达标 = 周成功 · 月内 ≥ 3 周 = 月成功
        </div>
      </div>

      {/* Month switcher — past unlimited, capped at the current accountability month. */}
      <div className="bg-card rounded-2xl border border-border/60 p-3 flex items-center justify-between shadow-card max-w-xs mx-auto">
        <button
          onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
          className="p-2 rounded-xl hover:bg-muted"
          aria-label="上一月"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="font-display font-extrabold text-lg tabular-nums">{viewMonth}</div>
          {isPastMonth ? (
            <span className="pill bg-secondary-soft text-secondary-foreground mt-1">
              <History className="w-3 h-3" /> 历史月份
            </span>
          ) : (
            <span className="pill bg-success-soft text-success mt-1">当前月</span>
          )}
        </div>
        <button
          onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
          disabled={viewMonth >= accMonth}
          className="p-2 rounded-xl hover:bg-muted disabled:opacity-30"
          aria-label="下一月"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex md:hidden gap-2 mb-1">
          <PersonChip user="CP" />
          <PersonChip user="JX" />
        </div>
        <UserPanel
          userId="CP"
          tasks={tasks}
          logs={logs}
          currentMonth={viewMonth}
          today={today}
          isPastMonth={isPastMonth}
          settledWeekly={settledWeeklyFor("CP")}
          settledMonthly={settledMonthlyFor("CP")}
          settle={settleFor("CP")}
        />
        <UserPanel
          userId="JX"
          tasks={tasks}
          logs={logs}
          currentMonth={viewMonth}
          today={today}
          isPastMonth={isPastMonth}
          settledWeekly={settledWeeklyFor("JX")}
          settledMonthly={settledMonthlyFor("JX")}
          settle={settleFor("JX")}
        />
      </div>

      <div className="md:hidden bg-card rounded-2xl p-4 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
        <span>每周所有任务达标 = 周成功 · 月内 ≥ 3 周成功 = 本月通关</span>
      </div>

      {/* Settle preview — shows exactly what will be written before committing. */}
      <AlertDialog open={settleTarget !== null} onOpenChange={(o) => !o && setSettleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>结算 {viewMonth} {settleTarget}？</AlertDialogTitle>
            <AlertDialogDescription>
              确认后写入结算快照{preview?.willLedger ? "，并生成奖惩账本条目" : ""}。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              你的结果：
              <span className={cn("font-bold", preview?.isSuccess ? "text-success" : "text-danger")}>
                {preview?.isSuccess ? "成功 ✓" : "失败"}
              </span>
            </div>
            {preview?.willLedger ? (
              <div className="rounded-lg bg-muted/50 p-2">
                将入账本 · {preview.isSuccess ? "奖励" : "惩罚"}：
                <span className="font-medium">{preview.text}</span>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">
                未设置对应{preview?.isSuccess ? "奖励" : "惩罚"}，仅记录结算（不入账本）。
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">
              结算后如需修改，可在「打卡」页撤销结算再重新结算。
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSettle}>确认结算</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
