import { useMemo, useState } from "react";
import { useApp } from "@/data/store";
import type { UserId } from "@/data/types";
import { PersonChip } from "@/components/PersonChip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, History, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const shiftDate = (date: string, days: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const CheckIn = () => {
  const { tasks, logs, today, currentUser, currentMonth, setLog } = useApp();
  const [active, setActive] = useState<UserId>(currentUser ?? "CP");
  const [date, setDate] = useState(today);
  const isPast = date < today;

  const myTasks = useMemo(
    () => tasks.filter((t) => t.userId === active && date.startsWith(t.month)),
    [tasks, active, date],
  );

  const getLog = (taskId: string) =>
    logs.find((l) => l.taskId === taskId && l.date === date);

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">每日打卡</h1>
        <p className="text-sm text-muted-foreground">今日所有任务，记得按时打卡</p>
      </div>

      {/* Person switch */}
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
                : "bg-card text-muted-foreground border-border hover:border-foreground/30",
            )}
          >
            {u}
          </button>
        ))}
      </div>

      {/* Date selector */}
      <div className="bg-card rounded-2xl border border-border/60 p-3 flex items-center justify-between shadow-card">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="p-2 rounded-xl hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="font-display font-extrabold text-lg tabular-nums">{date}</div>
          {isPast && (
            <span className="pill bg-secondary-soft text-secondary-foreground mt-1">
              <History className="w-3 h-3" /> 补签 · 历史记录
            </span>
          )}
          {date === today && (
            <span className="pill bg-success-soft text-success mt-1">今天</span>
          )}
        </div>
        <button
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={date >= today}
          className="p-2 rounded-xl hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {myTasks.length === 0 && (
          <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground border border-dashed">
            该月份未设置任务
          </div>
        )}
        {myTasks.map((t) => {
          const log = getLog(t.id);
          if (t.type === "count") {
            const done = !!log?.done;
            return (
              <div key={t.id} className="bg-card rounded-2xl p-4 border border-border/60 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PersonChip user={active} />
                      <span className="pill bg-muted text-muted-foreground">勾选</span>
                    </div>
                    <div className="font-bold">{t.title}</div>
                  </div>
                  <button
                    onClick={() => {
                      setLog(t.id, date, { done: !done, backfilled: isPast });
                      toast.success(done ? "已取消" : "打卡成功！");
                    }}
                    className={cn(
                      "shrink-0 w-14 h-14 rounded-2xl grid place-items-center transition-all border-2 hover:scale-105 active:scale-95",
                      done
                        ? "bg-success border-success text-success-foreground shadow-pop"
                        : "bg-background border-border text-muted-foreground",
                    )}
                  >
                    <Check className={cn("w-6 h-6", done ? "" : "opacity-40")} strokeWidth={3} />
                  </button>
                </div>
                <Textarea
                  defaultValue={log?.note ?? ""}
                  placeholder="备注（生病 / 补签说明…）"
                  className="mt-3 rounded-xl text-sm min-h-[44px]"
                  onBlur={(e) => setLog(t.id, date, { note: e.target.value, backfilled: isPast })}
                />
              </div>
            );
          }
          // timer
          return (
            <div key={t.id} className="bg-card rounded-2xl p-4 border border-border/60 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <PersonChip user={active} />
                <span className="pill bg-secondary-soft text-secondary-foreground">
                  <Timer className="w-3 h-3" /> 计时
                </span>
              </div>
              <div className="font-bold mb-3">{t.title}</div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  defaultValue={log?.minutes ?? ""}
                  placeholder="0"
                  className="rounded-xl h-12 text-lg font-bold tabular-nums"
                  onBlur={(e) => {
                    const v = Math.max(0, +e.target.value || 0);
                    setLog(t.id, date, { minutes: v, backfilled: isPast });
                    if (v > 0) toast.success(`记录 ${v} 分钟`);
                  }}
                />
                <span className="text-sm text-muted-foreground font-medium">分钟</span>
              </div>
              <Textarea
                defaultValue={log?.note ?? ""}
                placeholder="备注…"
                className="mt-3 rounded-xl text-sm min-h-[44px]"
                onBlur={(e) => setLog(t.id, date, { note: e.target.value, backfilled: isPast })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CheckIn;
