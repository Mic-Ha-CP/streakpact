import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/hooks/useChallenge";
import {
  challengeSpan,
  challengeStarted,
  challengeWeeks,
  totalProgress,
} from "@/data/challenge";
import { todayISO, weekdayCN } from "@/lib/dates";
import { unitLabel, type DailyLog, type Task, type UserId } from "@/data/models";
import { PersonChip } from "@/components/PersonChip";
import { EditableText } from "@/components/EditableText";
import { ProgressBar } from "@/components/ProgressBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, ChevronLeft, ChevronRight, History, Timer, X, Trash2, Flag } from "lucide-react";
import { cn, NO_SPIN } from "@/lib/utils";
import { toast } from "sonner";

const strMin = (a: string, b: string) => (a < b ? a : b);
const stepISO = (date: string, delta: number) => {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
};
const formatTime = (iso?: string) => {
  if (!iso) return "";
  const dt = new Date(iso);
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
};

const TimerCard = ({
  task,
  active,
  editable,
  entries,
  note,
  total,
  onAdd,
  onDelete,
  onSetNote,
}: {
  task: Task;
  active: UserId;
  editable: boolean;
  entries: DailyLog[];
  note: string;
  total: number;
  onAdd: (minutes: number) => void;
  onDelete: (id: string) => void;
  onSetNote: (note: string) => void;
}) => {
  const [pending, setPending] = useState("");
  const parsed = Math.max(0, Math.floor(+pending || 0));
  const canConfirm = editable && pending.trim() !== "" && parsed > 0;
  const dayTotal = entries.reduce((s, l) => s + (l.value ?? 0), 0);
  const confirm = () => {
    if (!canConfirm) return;
    onAdd(parsed);
    setPending("");
  };
  return (
    <div className="bg-card rounded-2xl p-4 border border-border/60 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <PersonChip user={active} />
        <span className="pill bg-secondary-soft text-secondary-foreground">
          <Timer className="w-3 h-3" /> 计时
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          当天 <span className="font-bold text-foreground tabular-nums">{dayTotal}</span> 分钟
        </span>
      </div>
      <div className="font-bold mb-1">{task.title}</div>
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>整期累计</span>
        <span className={cn("tabular-nums font-bold", total >= task.target ? "text-success" : "")}>
          {total}/{task.target} {unitLabel(task.unit)}
        </span>
      </div>
      <ProgressBar value={total} max={task.target} user={active} className="mb-3" />

      {editable && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={pending}
            placeholder="本次时长"
            className={cn("rounded-xl h-11 text-lg font-bold tabular-nums", NO_SPIN)}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setPending(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
              if (e.key === "Escape") setPending("");
            }}
          />
          <span className="text-sm text-muted-foreground font-medium">分钟</span>
          {pending !== "" && (
            <button
              onClick={confirm}
              disabled={!canConfirm}
              aria-label="确认"
              className={cn(
                "w-11 h-11 rounded-xl grid place-items-center border-2 transition-all",
                canConfirm
                  ? "bg-success border-success text-success-foreground shadow-pop"
                  : "bg-muted border-border text-muted-foreground",
              )}
            >
              <Check className="w-5 h-5" strokeWidth={3} />
            </button>
          )}
        </div>
      )}

      {entries.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {entries.map((l) => (
            <li key={l.id} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 text-sm">
              <span className="font-bold tabular-nums">{l.value}</span>
              <span className="text-muted-foreground">分钟</span>
              {l.createdAt && (
                <span className="text-xs text-muted-foreground tabular-nums">· {formatTime(l.createdAt)}</span>
              )}
              {l.backfilled && (
                <span className="pill bg-secondary-soft text-secondary-foreground text-[10px]">补</span>
              )}
              {editable && (
                <button
                  onClick={() => onDelete(l.id)}
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

      <EditableText
        className="mt-3"
        value={note}
        disabled={!editable}
        emptyLabel="添加备注（生病 / 补签说明…）"
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
  const c = useChallenge();
  const [active, setActive] = useState<UserId>(me ?? "CP");
  const [date, setDate] = useState(today);

  const header = (
    <div>
      <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">挑战打卡</h1>
      <p className="text-sm text-muted-foreground">只为进行中的挑战打卡 · 可在赛程内补签</p>
    </div>
  );

  if (c.isLoading) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        {header}
        <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground border border-border/60">
          加载中…
        </div>
      </div>
    );
  }

  // No active challenge → nothing to check in against.
  if (!c.challenge || c.voided) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        {header}
        <div className="bg-card rounded-3xl border border-border/60 shadow-card p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
            <Flag className="w-7 h-7" />
          </div>
          <p className="text-sm text-muted-foreground">当前没有进行中的挑战，无需打卡。</p>
          <Button asChild className="rounded-xl">
            <Link to="/">去发起挑战</Link>
          </Button>
        </div>
      </div>
    );
  }

  const ch = c.challenge;
  const start = ch.startDate;
  const { end } = challengeSpan(start, ch.weeks);
  const started = challengeStarted(start, today);

  // Not started yet (scheduled).
  if (!started) {
    return (
      <div className="space-y-5 max-w-2xl mx-auto">
        {header}
        <div className="bg-card rounded-3xl border border-border/60 shadow-card p-8 text-center space-y-2">
          <History className="w-7 h-7 text-secondary mx-auto" />
          <p className="font-display font-extrabold text-lg">挑战将于 {start} 开始</p>
          <p className="text-sm text-muted-foreground">开赛后即可在此打卡。</p>
        </div>
      </div>
    );
  }

  // Running (or ended-but-editable). Check-in dates are bounded to the span, up to today.
  const maxDate = strMin(today, end);
  const curDate = date >= start && date <= maxDate ? date : maxDate;
  const isPast = curDate < today;
  const editable = active === me;
  const tasks = c.tasksFor(active);
  const wk = challengeWeeks(start, ch.weeks).find((w) => curDate >= w.startDate && curDate <= w.endDate);

  const logsFor = (taskId: string) => c.logs.filter((l) => l.taskId === taskId && l.date === curDate);

  return (
    <div className="space-y-5 max-w-2xl md:max-w-3xl mx-auto">
      {header}

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

      {/* Date selector — bounded to the challenge span, up to today */}
      <div className="bg-card rounded-2xl border border-border/60 p-3 flex items-center justify-between shadow-card">
        <button
          onClick={() => setDate(stepISO(curDate, -1))}
          disabled={curDate <= start}
          className="p-2 rounded-xl hover:bg-muted disabled:opacity-30"
          aria-label="前一天"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="font-display font-extrabold text-lg">
            <span className="tabular-nums">{curDate}</span>
            <span className="text-muted-foreground"> · {weekdayCN(curDate)}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            {wk && <span className="pill bg-primary/10 text-primary">第 {wk.index} 周 / 共 {ch.weeks} 周</span>}
            {isPast && (
              <span className="pill bg-secondary-soft text-secondary-foreground">
                <History className="w-3 h-3" /> 补签
              </span>
            )}
            {curDate === today && <span className="pill bg-success-soft text-success">今天</span>}
          </div>
        </div>
        <button
          onClick={() => setDate(stepISO(curDate, 1))}
          disabled={curDate >= maxDate}
          className="p-2 rounded-xl hover:bg-muted disabled:opacity-30"
          aria-label="后一天"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tasks */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="bg-card rounded-2xl p-8 text-center text-muted-foreground border border-dashed">
            {active === me ? "你还没有加入这个挑战" : "对方还没有加入"}
          </div>
        )}
        {tasks.map((t) => {
          const rows = logsFor(t.id);
          const noteText = rows.find((r) => r.value === 0)?.note ?? "";
          const total = totalProgress(t, c.logs, start, ch.weeks);
          const setNoteFor = (note: string) => c.setNote.mutate({ taskId: t.id, date: curDate, note });

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
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1 mb-1.5">
                      <span>整期累计</span>
                      <span className={cn("tabular-nums font-bold", total >= t.target ? "text-success" : "")}>
                        {total}/{t.target} {unitLabel(t.unit)}
                      </span>
                    </div>
                    <ProgressBar value={total} max={t.target} user={active} />
                  </div>
                  <button
                    disabled={!editable}
                    onClick={() =>
                      c.toggleCount.mutate(
                        { taskId: t.id, date: curDate },
                        { onSuccess: () => toast.success(checked ? "已取消" : "打卡成功！") },
                      )
                    }
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
          return (
            <TimerCard
              key={t.id}
              task={t}
              active={active}
              editable={editable}
              entries={rows.filter((r) => r.value > 0)}
              note={noteText}
              total={total}
              onAdd={(minutes) =>
                c.addTimer.mutate(
                  { taskId: t.id, date: curDate, value: minutes },
                  { onSuccess: () => toast.success(`已添加 ${minutes} 分钟`) },
                )
              }
              onDelete={(id) => c.deleteLog.mutate(id, { onSuccess: () => toast.success("已删除") })}
              onSetNote={setNoteFor}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CheckIn;
