import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { todayISO, shiftDate } from "@/lib/dates";
import type { DailyLog, UserId } from "@/data/models";
import { PersonChip } from "@/components/PersonChip";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Check, ChevronLeft, ChevronRight, History, Timer, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  isPast,
  onAdd,
  onDelete,
  onSetNote,
}: {
  title: string;
  active: UserId;
  editable: boolean;
  entries: DailyLog[];
  isPast: boolean;
  onAdd: (minutes: number) => void;
  onDelete: (id: string) => void;
  onSetNote: (log: DailyLog, note: string) => void;
}) => {
  const [pending, setPending] = useState<string>("");
  const total = entries.reduce((sum, l) => sum + (l.value ?? 0), 0);
  const firstEntry = entries[0];

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

      {/* Per-day note rides on the first entry; only editable when an entry exists. */}
      <Textarea
        key={firstEntry?.id ?? "no-entry"}
        defaultValue={firstEntry?.note ?? ""}
        disabled={!editable || !firstEntry}
        placeholder={firstEntry ? "备注…" : "添加时长后可备注"}
        className="mt-3 rounded-xl text-sm min-h-[44px]"
        onBlur={(e) => {
          if (firstEntry && e.target.value !== (firstEntry.note ?? "")) {
            onSetNote(firstEntry, e.target.value);
          }
        }}
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
  const viewMonth = date.slice(0, 7);

  const { tasks } = useTasks(viewMonth);
  const { logs, toggleCount, insertLog, deleteLog, setNote } = useLogs(viewMonth);

  const myTasks = useMemo(
    () => tasks.filter((t) => t.userId === active && t.month === viewMonth),
    [tasks, active, viewMonth],
  );

  const logsFor = (taskId: string) =>
    logs.filter((l) => l.taskId === taskId && l.date === date);

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
          if (t.type === "count") {
            const rows = logsFor(t.id);
            const countRow = rows[0];
            const done = !!countRow;
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
                        { onSuccess: () => toast.success(done ? "已取消" : "打卡成功！") },
                      );
                    }}
                    className={cn(
                      "shrink-0 w-14 h-14 rounded-2xl grid place-items-center transition-all border-2",
                      editable && "hover:scale-105 active:scale-95",
                      !editable && "opacity-60 cursor-not-allowed",
                      done
                        ? "bg-success border-success text-success-foreground shadow-pop"
                        : "bg-background border-border text-muted-foreground",
                    )}
                  >
                    <Check className={cn("w-6 h-6", done ? "" : "opacity-40")} strokeWidth={3} />
                  </button>
                </div>
                <Textarea
                  key={countRow?.id ?? "no-row"}
                  defaultValue={countRow?.note ?? ""}
                  disabled={!editable || !done}
                  placeholder={done ? "备注（生病 / 补签说明…）" : "打卡后可备注"}
                  className="mt-3 rounded-xl text-sm min-h-[44px]"
                  onBlur={(e) => {
                    if (countRow && e.target.value !== (countRow.note ?? "")) {
                      setNote.mutate({ log: countRow, note: e.target.value });
                    }
                  }}
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
              entries={logsFor(t.id)}
              isPast={isPast}
              onAdd={(minutes) =>
                insertLog.mutate({ taskId: t.id, date, value: minutes, backfilled: isPast })
              }
              onDelete={(id) => deleteLog.mutate(id)}
              onSetNote={(log, note) => setNote.mutate({ log, note })}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CheckIn;
