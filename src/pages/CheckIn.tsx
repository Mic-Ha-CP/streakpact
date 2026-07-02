import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { useSettlements } from "@/hooks/useSettlements";
import { todayISO, shiftDate, weekdayCN, monthOfWeek } from "@/lib/dates";
import type { DailyLog, UserId } from "@/data/models";
import type { WeekLabel } from "@/data/calc";
import { PersonChip } from "@/components/PersonChip";
import { WeekTable } from "@/components/WeekTable";
import { EditableText } from "@/components/EditableText";
import { Input } from "@/components/ui/input";
import { Check, ChevronLeft, ChevronRight, History, Timer, X, Trash2, RotateCcw, Lock } from "lucide-react";
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

type UndoTarget = { kind: "week"; week: WeekLabel } | { kind: "month" };

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
};

const TimerTaskCard = ({
  title,
  active,
  editable,
  entries,
  note,
  onAdd,
  onDelete,
  onSetNote,
}: {
  title: string;
  active: UserId;
  editable: boolean;
  entries: DailyLog[];
  note: string;
  onAdd: (minutes: number) => void;
  onDelete: (id: string) => void;
  onSetNote: (note: string) => void;
}) => {
  const [pending, setPending] = useState<string>("");
  const total = entries.reduce((sum, l) => sum + (l.value ?? 0), 0);

  const parsed = Math.max(0, Math.floor(+pending || 0));
  const canConfirm = editable && pending.trim() !== "" && parsed > 0;

  const confirm = () => {
    if (!canConfirm) return;
    onAdd(parsed);
    toast.success(`已添加 ${parsed} 分钟`);
    setPending("");
  };
  const cancel = () => setPending("");

  return (
    <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <PersonChip user={active} />
        <span className="pill bg-secondary-soft text-secondary-foreground">
          <Timer className="w-3 h-3" /> 计时
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          今日合计 <span className="font-bold text-foreground tabular-nums">{total}</span> 分钟
        </span>
      </div>
      <div className="font-bold mb-3">{title}</div>

      {editable && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={pending}
            placeholder="本次时长"
            className="rounded-xl h-12 text-lg font-bold tabular-nums"
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
              if (e.key === "Escape") cancel();
            }}
          />
          <span className="text-sm text-muted-foreground font-medium">分钟</span>
          {pending !== "" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={confirm}
                disabled={!canConfirm}
                aria-label="确认"
                className={cn(
                  "w-10 h-10 rounded-xl grid place-items-center border-2 transition-all",
                  canConfirm
                    ? "bg-success border-success text-success-foreground hover:scale-105 active:scale-95 shadow-pop"
                    : "bg-muted border-border text-muted-foreground cursor-not-allowed",
                )}
              >
                <Check className="w-5 h-5" strokeWidth={3} />
              </button>
              <button
                onClick={cancel}
                aria-label="取消"
                className="w-10 h-10 rounded-xl grid place-items-center border-2 border-border bg-background text-muted-foreground hover:text-danger hover:border-danger transition-all active:scale-95"
              >
                <X className="w-5 h-5" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {entries.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 text-sm"
            >
              <span className="font-bold tabular-nums">{l.value}</span>
              <span className="text-muted-foreground">分钟</span>
              {l.createdAt && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  · {formatTime(l.createdAt)}
                </span>
              )}
              {l.backfilled && (
                <span className="pill bg-secondary-soft text-secondary-foreground text-[10px]">补</span>
              )}
              {editable && (
                <button
                  onClick={() => {
                    onDelete(l.id);
                    toast.success("已删除");
                  }}
                  aria-label="删除"
                  className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Per-day note — independent of whether any time was logged. */}
      <EditableText
        className="mt-3"
        value={note}
        disabled={!editable}
        emptyLabel="添加备注…"
        placeholder="备注…"
        multiline
        onSave={onSetNote}
      />
    </div>
  );
};

const CheckIn = () => {
  const today = todayISO();
  const { userId: me } = useAuth();
  const [active, setActive] = useState<UserId>(me ?? "CP");
  const [date, setDate] = useState(today);
  const isPast = date < today;
  const editable = active === me;
  // Load the month that owns the selected day's week (not its calendar month), so a
  // carry-in day like 2026-07-02 (∈ June W5) loads June's tasks/logs/settlements.
  // useLogs' monthSpan already covers the week's spill-over days.
  const viewMonth = monthOfWeek(date);

  const { tasks } = useTasks(viewMonth);
  const { logs, toggleCount, insertLog, deleteLog, setNote } = useLogs(viewMonth);
  const settlement = useSettlements(viewMonth);
  const [undoTarget, setUndoTarget] = useState<UndoTarget | null>(null);
  const unsettling = settlement.unsettleWeek.isPending || settlement.unsettleMonth.isPending;

  const myTasks = useMemo(
    () => tasks.filter((t) => t.userId === active && t.month === viewMonth),
    [tasks, active, viewMonth],
  );

  const logsFor = (taskId: string) =>
    logs.filter((l) => l.taskId === taskId && l.date === date);

  const confirmUndo = () => {
    if (undoTarget?.kind === "week") {
      const w = undoTarget.week;
      settlement.unsettleWeek.mutate(w, {
        onSuccess: () => toast.success(`已撤销 ${w} 结算`),
        onError: (e) => toast.error(`撤销失败：${(e as Error).message}`),
      });
    } else if (undoTarget?.kind === "month") {
      settlement.unsettleMonth.mutate(undefined, {
        onSuccess: () => toast.success("已撤销本月结算"),
        onError: (e) => toast.error(`撤销失败：${(e as Error).message}`),
      });
    }
    setUndoTarget(null);
  };

  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
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

      {!editable && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
          正在查看 {active} 的打卡（只读）。只能为自己打卡。
        </div>
      )}

      {/* Date selector */}
      <div className="bg-card rounded-2xl border border-border/60 p-3 flex items-center justify-between shadow-card">
        <button
          onClick={() => setDate(shiftDate(date, -1))}
          className="p-2 rounded-xl hover:bg-muted"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="font-display font-extrabold text-lg">
            <span className="tabular-nums">{date}</span>
            <span className="text-muted-foreground"> · {weekdayCN(date)}</span>
          </div>
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

      {/* Week-at-a-glance (read-only; tap a day to jump the day view) */}
      {myTasks.length > 0 && (
        <WeekTable
          tasks={myTasks}
          logs={logs}
          selectedDate={date}
          today={today}
          onSelectDay={setDate}
        />
      )}

      {/* Tasks */}
      <div className="space-y-3">
        {myTasks.length === 0 && (
          <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground border border-dashed">
            该月份未设置任务
          </div>
        )}
        {myTasks.map((t) => {
          const rows = logsFor(t.id);
          const noteText = rows.find((r) => r.value === 0)?.note ?? "";
          const setNoteFor = (note: string) =>
            setNote.mutate({ taskId: t.id, date, note, backfilled: isPast });

          if (t.type === "count") {
            const checked = rows.some((r) => r.value > 0);
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
                    disabled={!editable}
                    onClick={() => {
                      toggleCount.mutate(
                        { taskId: t.id, date, backfilled: isPast },
                        { onSuccess: () => toast.success(checked ? "已取消" : "打卡成功！") },
                      );
                    }}
                    className={cn(
                      "shrink-0 w-14 h-14 rounded-2xl grid place-items-center transition-all border-2",
                      editable && "hover:scale-105 active:scale-95",
                      !editable && "opacity-60 cursor-not-allowed",
                      checked
                        ? "bg-success border-success text-success-foreground shadow-pop"
                        : "bg-background border-border text-muted-foreground",
                    )}
                  >
                    <Check className={cn("w-6 h-6", checked ? "" : "opacity-40")} strokeWidth={3} />
                  </button>
                </div>
                <EditableText
                  className="mt-3"
                  value={noteText}
                  disabled={!editable}
                  emptyLabel="添加备注（生病 / 补签说明…）"
                  placeholder="备注…"
                  multiline
                  onSave={setNoteFor}
                />
              </div>
            );
          }
          // timer
          return (
            <TimerTaskCard
              key={t.id}
              title={t.title}
              active={active}
              editable={editable}
              entries={rows.filter((r) => r.value > 0)}
              note={noteText}
              onAdd={(minutes) =>
                insertLog.mutate({ taskId: t.id, date, value: minutes, backfilled: isPast })
              }
              onDelete={(id) => deleteLog.mutate(id)}
              onSetNote={setNoteFor}
            />
          );
        })}
      </div>

      {/* Un-settle (own settlements for the viewed month). Kept here — away from the
          本月战况 dashboard — so this destructive action is deliberate, not a glance away. */}
      {editable && (settlement.mySettledWeeks.length > 0 || settlement.mySettledMonthly) && (
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> {viewMonth} 已结算（可撤销）
          </div>
          <p className="text-[11px] text-muted-foreground">
            撤销会删除该周/月的结算快照及其生成的账本条目，回到待结算可重新结算。
          </p>
          <div className="flex flex-wrap gap-2">
            {settlement.mySettledWeeks.map((n) => (
              <button
                key={n}
                disabled={unsettling}
                onClick={() => setUndoTarget({ kind: "week", week: `W${n}` as WeekLabel })}
                className="px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-bold inline-flex items-center gap-1 hover:border-danger hover:text-danger transition-colors disabled:opacity-50"
              >
                W{n} <RotateCcw className="w-3 h-3" />
              </button>
            ))}
            {settlement.mySettledMonthly && (
              <button
                disabled={unsettling}
                onClick={() => setUndoTarget({ kind: "month" })}
                className="px-2.5 py-1 rounded-lg bg-card border border-border text-xs font-bold inline-flex items-center gap-1 hover:border-danger hover:text-danger transition-colors disabled:opacity-50"
              >
                本月 <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={undoTarget !== null} onOpenChange={(o) => !o && setUndoTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>撤销结算？</AlertDialogTitle>
            <AlertDialogDescription>
              将删除 {viewMonth} {undoTarget?.kind === "month" ? "本月" : (undoTarget?.week ?? "")}
              的结算快照，以及它生成的奖惩账本条目（若有）。撤销后回到待结算，可重新结算。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUndo}>确认撤销</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CheckIn;
