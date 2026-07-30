import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { CheckSquare, Timer, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { unitForType, unitLabel, type TaskType } from "@/data/models";
import type { ChallengeTaskInput, DepositInput } from "@/hooks/useChallenge";

interface Row {
  key: string;
  id?: string; // existing task (edit mode)
  title: string;
  type: TaskType;
  target: number;
  hourMode?: boolean; // timer only — input is in hours, ×60 to minutes on save
  logCount?: number; // existing logs, for the delete warning
}

export interface ChallengeFormResult {
  tasks: ChallengeTaskInput[];
  deleteIds: string[];
  deposit: DepositInput;
  teamReward: string;
}

interface Props {
  mode: "create" | "join" | "edit";
  editFree?: boolean; // edit mode: true = pre-start free edit (no chance consumed)
  startDate?: string; // create: shown read-only
  weeks?: number;
  initialTasks?: Row[];
  initialDeposit?: DepositInput;
  showTeamReward?: boolean; // render the team-reward field (create, or pre-start edit by initiator)
  initialTeamReward?: string;
  submitting: boolean;
  onSubmit: (r: ChallengeFormResult) => void;
  onCancel: () => void;
}

let seq = 0;
const newKey = () => `row-${seq++}`;

const TargetHint = ({ type, hourMode }: { type: TaskType; hourMode?: boolean }) =>
  type === "count" ? (
    <>整期累计 <b>天数</b>（例：4 周内早起 ≥ 22 天）</>
  ) : hourMode ? (
    <>整期累计 <b>小时</b>（保存时 ×60 存为分钟）</>
  ) : (
    <>整期累计 <b>分钟</b>（例：编程累计 ≥ 440 分钟）</>
  );

/** Create / join / edit a challenge's tasks (+ deposit & team reward on create). */
export const ChallengeForm = ({
  mode,
  editFree = false,
  startDate,
  weeks = 4,
  initialTasks,
  initialDeposit,
  showTeamReward = mode === "create",
  initialTeamReward = "",
  submitting,
  onSubmit,
  onCancel,
}: Props) => {
  const [rows, setRows] = useState<Row[]>(
    initialTasks && initialTasks.length > 0
      ? initialTasks.map((t) => ({ ...t, key: newKey() }))
      : [{ key: newKey(), title: "", type: "count", target: 20 }],
  );
  const [stake, setStake] = useState(initialDeposit?.stake ?? "");
  const [execution, setExecution] = useState(initialDeposit?.execution ?? "");
  const [teamReward, setTeamReward] = useState(initialTeamReward);
  // Deposit is required wherever it's shown (create/join, or the free pre-start edit).
  const showDeposit = mode !== "edit" || editFree;

  const patch = (key: string, p: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { key: newKey(), title: "", type: "count", target: 20 }]);
  const removeRow = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));

  const submit = () => {
    const kept = rows.filter((r) => r.title.trim() !== "" && r.target >= 1);
    if (kept.length === 0) {
      toast.error("至少保留 1 个有效任务");
      return;
    }
    if (showDeposit && (stake.trim() === "" || execution.trim() === "")) {
      toast.error("请填写押注声明（押什么 + 失败如何执行）");
      return;
    }
    const tasks: ChallengeTaskInput[] = kept.map((r) => ({
      id: r.id,
      title: r.title.trim(),
      type: r.type,
      // 小时 input is a convenience — stored as minutes.
      target: r.type === "timer" && r.hourMode ? r.target * 60 : r.target,
      unit: unitForType(r.type),
    }));
    const initialIds = (initialTasks ?? []).map((t) => t.id).filter(Boolean) as string[];
    const keptIds = new Set(kept.map((r) => r.id).filter(Boolean) as string[]);
    const deleteIds = initialIds.filter((id) => !keptIds.has(id));
    onSubmit({ tasks, deleteIds, deposit: { stake, execution }, teamReward });
  };

  const title =
    mode === "create"
      ? "发起挑战"
      : mode === "join"
        ? "加入挑战"
        : editFree
          ? "修改任务（开赛前 · 可自由改）"
          : "修改任务（本期唯一机会）";

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-extrabold text-lg">{title}</h3>
        {startDate && (
          <span className="pill bg-primary/10 text-primary">
            {startDate} 起 · {weeks} 周
          </span>
        )}
      </div>

      {mode === "edit" && (
        <p className="text-xs text-muted-foreground">
          {editFree
            ? "开赛前可自由修改任务，不消耗本期唯一修改机会。删除任务会一并删除其打卡记录，且至少保留 1 个任务。"
            : "一次过修改全部任务，仅本期一次、且仅限前半期。删除任务会一并删除其打卡记录，且至少保留 1 个任务。"}
        </p>
      )}

      {/* Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            任务 · 总量目标
          </div>
          <Button onClick={addRow} size="sm" variant="outline" className="rounded-full h-7">
            <Plus className="w-3.5 h-3.5 mr-1" /> 新增
          </Button>
        </div>

        {rows.map((r) => {
          const removable = rows.length > 1;
          const deleteBody =
            r.id && (r.logCount ?? 0) > 0
              ? `将同时删除该任务的 ${r.logCount} 条打卡记录，不可恢复。`
              : "确认移除该任务？";
          return (
            <div
              key={r.key}
              className="bg-background rounded-2xl p-3 border border-border/60 space-y-2"
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch(r.key, { type: "count" })}
                  className={cn(
                    "pill border transition-opacity",
                    r.type === "count"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border",
                  )}
                >
                  <CheckSquare className="w-3 h-3" /> 勾选
                </button>
                <button
                  type="button"
                  onClick={() => patch(r.key, { type: "timer" })}
                  className={cn(
                    "pill border transition-opacity",
                    r.type === "timer"
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-card text-muted-foreground border-border",
                  )}
                >
                  <Timer className="w-3 h-3" /> 计时
                </button>
                <div className="flex-1" />
                {removable &&
                  (r.id ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>删除「{r.title || "未命名任务"}」？</AlertDialogTitle>
                          <AlertDialogDescription>{deleteBody}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeRow(r.key)}
                            className="bg-danger text-danger-foreground hover:bg-danger/90"
                          >
                            确认删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeRow(r.key)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ))}
              </div>

              <Input
                value={r.title}
                onChange={(e) => patch(r.key, { title: e.target.value })}
                placeholder="任务名（例：早起 / 编程）"
                className="rounded-xl"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    总量目标
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={r.target}
                    onChange={(e) => patch(r.key, { target: Math.max(1, +e.target.value || 1) })}
                    className="rounded-xl tabular-nums font-bold"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">
                    单位
                  </Label>
                  {r.type === "timer" ? (
                    <div className="h-10 flex rounded-xl border border-border overflow-hidden text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => patch(r.key, { hourMode: false })}
                        className={cn("flex-1", !r.hourMode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
                      >
                        分钟
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(r.key, { hourMode: true })}
                        className={cn("flex-1 border-l border-border", r.hourMode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}
                      >
                        小时
                      </button>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center px-3 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
                      {unitLabel(unitForType(r.type))} / 整期
                    </div>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <TargetHint type={r.type} hourMode={r.hourMode} />
              </p>
            </div>
          );
        })}
      </div>

      {/* Deposit (create / join / pre-start edit) — required */}
      {showDeposit && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            押注声明（必填）
          </div>
          <Textarea
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="押什么（例：一顿火锅 / 100 元）"
            className="rounded-xl min-h-[44px]"
          />
          <Textarea
            value={execution}
            onChange={(e) => setExecution(e.target.value)}
            placeholder="失败如何执行（例：打赏给指定对象，手动转账）"
            className="rounded-xl min-h-[44px]"
          />
          <p className="text-[11px] text-muted-foreground">
            记账版：app 只记录，失败后生成待执行的惩罚条目，实际执行手动完成。
          </p>
        </div>
      )}

      {/* Team reward (create / pre-start edit by initiator) */}
      {showTeamReward && (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            团队奖励（可选）
          </div>
          <Input
            value={teamReward}
            onChange={(e) => setTeamReward(e.target.value)}
            placeholder="双方都通关时的共享奖励（例：一起吃大餐）"
            className="rounded-xl"
          />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button onClick={submit} disabled={submitting} className="flex-1 rounded-xl">
          {submitting ? "提交中…" : mode === "create" ? "发起" : mode === "join" ? "加入" : "保存修改"}
        </Button>
        <Button onClick={onCancel} variant="outline" disabled={submitting} className="rounded-xl">
          取消
        </Button>
      </div>
    </div>
  );
};
