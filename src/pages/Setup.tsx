import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { currentMonthISO, prevMonthISO } from "@/lib/dates";
import { unitForType, unitLabel, type Task, type TaskType, type UserId } from "@/data/models";
import { PersonChip } from "@/components/PersonChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ArrowRight, Plus, Trash2, Timer, CheckSquare, Pencil, Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Draft {
  tempId: string;
  title: string;
  type: TaskType;
  target: number;
  carriedOver?: boolean;
}

/** Shared editable fields. Unit is derived from type (count -> times, timer -> minutes). */
const TaskFields = ({
  title,
  type,
  target,
  onChange,
}: {
  title: string;
  type: TaskType;
  target: number;
  onChange: (patch: Partial<{ title: string; type: TaskType; target: number }>) => void;
}) => (
  <>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange({ type: "count" })}
        className={cn(
          "pill border transition-opacity",
          type === "count"
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border",
        )}
      >
        <CheckSquare className="w-3 h-3" /> 勾选
      </button>
      <button
        onClick={() => onChange({ type: "timer" })}
        className={cn(
          "pill border transition-opacity",
          type === "timer"
            ? "bg-secondary text-secondary-foreground border-secondary"
            : "bg-card text-muted-foreground border-border",
        )}
      >
        <Timer className="w-3 h-3" /> 计时
      </button>
    </div>

    <Input
      value={title}
      onChange={(e) => onChange({ title: e.target.value })}
      placeholder="任务名 (例：早起 ≥6 次/周)"
      className="rounded-xl"
    />
    <div className="grid grid-cols-2 gap-2">
      <div>
        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">每周目标</Label>
        <Input
          type="number"
          min={1}
          value={target}
          onChange={(e) => onChange({ target: Math.max(1, +e.target.value || 1) })}
          className="rounded-xl tabular-nums font-bold"
        />
      </div>
      <div>
        <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">单位</Label>
        <div className="h-10 flex items-center px-3 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
          {unitLabel(unitForType(type))} / 周
        </div>
      </div>
    </div>
  </>
);

const TaskSummary = ({ task }: { task: Task }) => (
  <>
    <div className="text-sm font-medium">{task.title || "（未命名）"}</div>
    <div className="text-[11px] text-muted-foreground">
      {task.type === "count" ? "勾选" : "计时"} · ≥{task.target} {unitLabel(task.unit)}/周
    </div>
  </>
);

const PersistedTaskRow = ({
  task,
  editable,
  logCount,
  onSave,
  onDelete,
}: {
  task: Task;
  editable: boolean;
  logCount: number;
  onSave: (t: Task) => void;
  onDelete: () => void;
}) => {
  const locked = task.editCount >= 1;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Task>(task);

  if (!editable) {
    return (
      <div className="bg-background rounded-2xl p-3 border border-border/60 space-y-1">
        <TaskSummary task={task} />
      </div>
    );
  }

  const startEdit = () => {
    if (locked) return;
    setDraft(task);
    setEditing(true);
  };

  const finishEdit = () => {
    // The single post-creation edit is consumed here.
    onSave({ ...draft, unit: unitForType(draft.type), editCount: 1 });
    setEditing(false);
    toast.success("已保存 · 本月改动机会已用完");
  };

  return (
    <div
      className={cn(
        "bg-background rounded-2xl p-3 border space-y-2 transition-colors",
        editing ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60",
      )}
    >
      <div className="flex items-center justify-end gap-1">
        {editing ? (
          <button
            onClick={finishEdit}
            className="pill bg-success text-success-foreground border border-success"
          >
            <Check className="w-3 h-3" /> 完成
          </button>
        ) : (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <button
                    onClick={startEdit}
                    disabled={locked}
                    className={cn(
                      "pill border",
                      locked
                        ? "bg-muted text-muted-foreground border-border opacity-60 cursor-not-allowed"
                        : "bg-card text-foreground border-border hover:border-primary hover:text-primary",
                    )}
                  >
                    {locked ? (
                      <>
                        <Lock className="w-3 h-3" /> 已锁定
                      </>
                    ) : (
                      <>
                        <Pencil className="w-3 h-3" /> 修改
                      </>
                    )}
                  </button>
                </span>
              </TooltipTrigger>
              {locked && <TooltipContent>已用本月改动机会</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft">
              <Trash2 className="w-4 h-4" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>删除「{task.title || "未命名任务"}」？</AlertDialogTitle>
              <AlertDialogDescription>
                {logCount > 0
                  ? `将同时删除该任务的 ${logCount} 条打卡记录，不可恢复。`
                  : "该任务暂无打卡记录，可安全删除。"}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                className="bg-danger text-danger-foreground hover:bg-danger/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {editing ? (
        <TaskFields
          title={draft.title}
          type={draft.type}
          target={draft.target}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
        />
      ) : (
        <>
          <TaskSummary task={task} />
          {locked && (
            <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
              <Lock className="w-3 h-3" /> 已用本月改动机会
            </div>
          )}
        </>
      )}
    </div>
  );
};

const DraftTaskRow = ({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onCancel: () => void;
}) => (
  <div className="bg-background rounded-2xl p-3 border border-primary/40 ring-1 ring-primary/20 space-y-2">
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={onSave}
        className="pill bg-success text-success-foreground border border-success"
      >
        <Check className="w-3 h-3" /> 完成
      </button>
      <button
        onClick={onCancel}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
    <TaskFields
      title={draft.title}
      type={draft.type}
      target={draft.target}
      onChange={onChange}
    />
  </div>
);

const UserSetupCard = ({ userId }: { userId: UserId }) => {
  const { userId: me } = useAuth();
  const editable = userId === me;
  const currentMonth = currentMonthISO();
  const last = prevMonthISO(currentMonth);

  const { tasks: curAll, isLoading: curLoading, addTask, updateTask, deleteTask } =
    useTasks(currentMonth);
  const { tasks: lastAll, isLoading: lastLoading } = useTasks(last);
  const { logs } = useLogs(currentMonth);
  const myCurrent = curAll.filter((t) => t.userId === userId);
  const myLast = lastAll.filter((t) => t.userId === userId);

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const total = myCurrent.length + drafts.length;

  // New-month default: when this month is empty, pre-fill drafts from last month's
  // tasks (carried_over). Runs once after data loads; user can edit/remove/add.
  const autoFilled = useRef(false);
  useEffect(() => {
    if (autoFilled.current) return;
    if (!editable || curLoading || lastLoading) return;
    if (myCurrent.length > 0) {
      autoFilled.current = true; // already has tasks — never auto-fill
      return;
    }
    if (myLast.length > 0) {
      autoFilled.current = true;
      setDrafts(
        myLast.slice(0, 3).map((t, i) => ({
          tempId: `carry-${t.id}-${i}`,
          title: t.title,
          type: t.type,
          target: t.target,
          carriedOver: true,
        })),
      );
    }
    // Intentionally keyed on lengths/flags, not the array identities (guarded by the
    // autoFilled ref so it runs at most once).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editable, curLoading, lastLoading, myCurrent.length, myLast.length]);

  const addDraft = () => {
    if (total >= 3) {
      toast.error("每月最多 3 个任务");
      return;
    }
    setDrafts((d) => [
      ...d,
      { tempId: `draft-${Date.now()}-${d.length}`, title: "", type: "count", target: 5 },
    ]);
  };

  const saveDraft = (draft: Draft) => {
    addTask.mutate(
      {
        title: draft.title,
        type: draft.type,
        target: draft.target,
        unit: unitForType(draft.type),
        carriedOver: draft.carriedOver,
      },
      {
        onSuccess: () => {
          setDrafts((ds) => ds.filter((d) => d.tempId !== draft.tempId));
          toast.success("已添加");
        },
        onError: () => toast.error("添加失败"),
      },
    );
  };

  const carryOver = (t: Task) => {
    if (total >= 3) {
      toast.error("每月最多 3 个任务");
      return;
    }
    addTask.mutate(
      { title: t.title, type: t.type, target: t.target, unit: t.unit, carriedOver: true },
      { onSuccess: () => toast.success("已沿用") },
    );
  };

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden">
      <div className={cn("p-4 flex items-center justify-between", userId === "CP" ? "bg-cp-soft" : "bg-jx-soft")}>
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl grid place-items-center font-black text-primary-foreground shadow-pop", userId === "CP" ? "bg-cp" : "bg-jx")}>
            {userId}
          </div>
          <div>
            <div className="font-display font-extrabold">{userId} 的任务</div>
            <div className="text-[11px] text-muted-foreground">{currentMonth} · 1–3 个 · 每任务每月仅可改动 1 次</div>
          </div>
        </div>
        {editable && (
          <Button onClick={addDraft} size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
            <Plus className="w-4 h-4 mr-1" /> 新增
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">本月任务</div>
        {total === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center bg-muted/40 rounded-2xl">
            {editable ? "还没有任务，点 “新增” 或从下方沿用" : "对方本月还没有任务"}
          </div>
        )}

        {myCurrent.map((t) => (
          <PersistedTaskRow
            key={t.id}
            task={t}
            editable={editable}
            logCount={logs.filter((l) => l.taskId === t.id).length}
            onSave={(next) => updateTask.mutate(next)}
            onDelete={() => {
              deleteTask.mutate(t.id, { onSuccess: () => toast.success("已删除") });
            }}
          />
        ))}

        {editable &&
          drafts.map((d) => (
            <DraftTaskRow
              key={d.tempId}
              draft={d}
              onChange={(patch) =>
                setDrafts((ds) => ds.map((x) => (x.tempId === d.tempId ? { ...x, ...patch } : x)))
              }
              onSave={() => saveDraft(d)}
              onCancel={() => setDrafts((ds) => ds.filter((x) => x.tempId !== d.tempId))}
            />
          ))}

        {editable && myLast.length > 0 && (myCurrent.length > 0 || drafts.length === 0) && (
          <div className="pt-3 border-t border-border/60 mt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">上月任务 · 可沿用</div>
            {myLast.map((t) => (
              <div key={t.id} className="flex items-center gap-2 bg-muted/40 rounded-xl p-2.5">
                <div className="flex-1 text-sm">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.type === "count" ? "勾选" : "计时"} · ≥{t.target} {unitLabel(t.unit)}/周
                  </div>
                </div>
                <button
                  onClick={() => carryOver(t)}
                  className="pill bg-card border border-border hover:border-primary hover:text-primary"
                >
                  沿用 <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Setup = () => {
  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">任务设置</h1>
        <p className="text-sm text-muted-foreground">每月初为自己设定 1–3 个本月专注任务 · 每任务每月仅可改动 1 次</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:hidden flex gap-2">
          <PersonChip user="CP" /> <PersonChip user="JX" />
        </div>
        <UserSetupCard userId="CP" />
        <UserSetupCard userId="JX" />
      </div>
    </div>
  );
};

export default Setup;
