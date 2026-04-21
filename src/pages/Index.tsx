import { useApp } from "@/data/store";
import type { UserId } from "@/data/types";
import { PersonChip } from "@/components/PersonChip";
import { ProgressBar } from "@/components/ProgressBar";
import { WeekBadge } from "@/components/WeekBadge";
import {
  WEEK_LABELS,
  dayToWeek,
  getWeeksInMonth,
  monthStatus,
  weeklyProgress,
  weekStatusForUser,
} from "@/data/calc";
import { Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const UserPanel = ({ userId }: { userId: UserId }) => {
  const { tasks, logs, currentMonth, today } = useApp();
  const myTasks = tasks.filter((t) => t.userId === userId && t.month === currentMonth);
  const currentWeek = today.startsWith(currentMonth) ? dayToWeek(currentMonth, +today.slice(-2)) : "W1";
  const weeks = getWeeksInMonth(currentMonth);
  const month = monthStatus(myTasks, logs, currentMonth, today);

  // today's check-in status
  const todayDone = myTasks.every((t) => {
    const log = logs.find((l) => l.taskId === t.id && l.date === today);
    if (!log) return false;
    if (t.type === "count") return !!log.done;
    return (log.minutes ?? 0) > 0;
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
        <div className="text-right">
          <div className="text-xs text-muted-foreground">达标周</div>
          <div className="font-display font-extrabold text-2xl tabular-nums">
            {month.successWeeks}
            <span className="text-base text-muted-foreground">/{month.totalWeeks}</span>
          </div>
        </div>
      </div>

      {/* Today */}
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

      {/* Week grid */}
      <div className="px-5 pb-4">
        <div className="flex gap-2 justify-between">
          {WEEK_LABELS.filter((w) => weeks.find((x) => x.label === w)).map((w) => {
            const status = weekStatusForUser(myTasks, logs, currentMonth, w, today);
            return (
              <WeekBadge
                key={w}
                label={w}
                status={status}
                size="md"
                active={w === currentWeek}
              />
            );
          })}
        </div>
      </div>

      {/* Tasks */}
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
                  {v}/{t.target} {t.unit}
                </span>
              </div>
              <ProgressBar value={v} max={t.target} user={userId} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Index = () => {
  const today = useApp((s) => s.today);
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">本月战况</h1>
          <p className="text-sm text-muted-foreground">今天 {today} · 一起加油 💪</p>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-4 h-4 text-secondary" />
          每周 ≥ 全部任务达标 = 周成功 · 月内 ≥ 3 周 = 月成功
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="flex md:hidden gap-2 mb-1">
          <PersonChip user="CP" />
          <PersonChip user="JX" />
        </div>
        <UserPanel userId="CP" />
        <UserPanel userId="JX" />
      </div>

      <div className="md:hidden bg-card rounded-2xl p-4 border border-border/60 text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
        <span>每周所有任务达标 = 周成功 · 月内 ≥ 3 周成功 = 本月通关</span>
      </div>
    </div>
  );
};

export default Index;
