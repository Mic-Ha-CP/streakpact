import { useState } from "react";
import { useApp } from "@/data/store";
import type { Task, TaskType, UserId } from "@/data/types";
import { PersonChip } from "@/components/PersonChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Plus, Trash2, Timer, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const prevMonth = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  const dt = new Date(y, mo - 2, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

const TaskRow = ({ task, onSave, onDelete }: { task: Task; onSave: (t: Task) => void; onDelete: () => void }) => {
  const [t, setT] = useState(task);
  const update = (patch: Partial<Task>) => {
    const next = { ...t, ...patch };
    setT(next);
    onSave(next);
  };
  return (
    <div className="bg-background rounded-2xl p-3 border border-border space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={() => update({ type: "count" })}
          className={cn(
            "pill border",
            t.type === "count"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border",
          )}
        >
          <CheckSquare className="w-3 h-3" /> 勾选
        </button>
        <button
          onClick={() => update({ type: "timer" })}
          className={cn(
            "pill border",
            t.type === "timer"
              ? "bg-secondary text-secondary-foreground border-secondary"
              : "bg-card text-muted-foreground border-border",
          )}
        >
          <Timer className="w-3 h-3" /> 计时
        </button>
        <button
          onClick={onDelete}
          className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger-soft"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <Input
        value={t.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="任务名 (例：早起 ≥6 天/周)"
        className="rounded-xl"
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">每周目标</Label>
          <Input
            type="number"
            min={1}
            value={t.target}
            onChange={(e) => update({ target: Math.max(1, +e.target.value || 1) })}
            className="rounded-xl tabular-nums font-bold"
          />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground tracking-wider">单位</Label>
          <Select value={t.unit} onValueChange={(v) => update({ unit: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="天">天 / 周</SelectItem>
              <SelectItem value="次">次 / 周</SelectItem>
              <SelectItem value="分钟">分钟 / 周</SelectItem>
              <SelectItem value="小时">小时 / 周</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

const UserSetupCard = ({ userId }: { userId: UserId }) => {
  const { tasks, currentMonth, upsertTask, deleteTask } = useApp();
  const last = prevMonth(currentMonth);
  const myCurrent = tasks.filter((t) => t.userId === userId && t.month === currentMonth);
  const myLast = tasks.filter((t) => t.userId === userId && t.month === last);

  const addTask = () => {
    if (myCurrent.length >= 3) {
      toast.error("每月最多 3 个任务");
      return;
    }
    upsertTask({
      id: `t-${userId}-${Date.now()}`,
      userId,
      month: currentMonth,
      title: "",
      type: "count",
      target: 5,
      unit: "天",
    });
  };

  const carryOver = (t: Task) => {
    if (myCurrent.length >= 3) {
      toast.error("每月最多 3 个任务");
      return;
    }
    upsertTask({ ...t, id: `t-${userId}-${Date.now()}`, month: currentMonth });
    toast.success("已沿用");
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
            <div className="text-[11px] text-muted-foreground">{currentMonth} · 1–3 个</div>
          </div>
        </div>
        <Button onClick={addTask} size="sm" className="rounded-full bg-foreground text-background hover:bg-foreground/90">
          <Plus className="w-4 h-4 mr-1" /> 新增
        </Button>
      </div>

      <div className="p-4 space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">本月任务</div>
        {myCurrent.length === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center bg-muted/40 rounded-2xl">
            还没有任务，点 “新增” 或从下方沿用
          </div>
        )}
        {myCurrent.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            onSave={(next) => upsertTask(next)}
            onDelete={() => {
              deleteTask(t.id);
              toast.success("已删除");
            }}
          />
        ))}

        {myLast.length > 0 && (
          <div className="pt-3 border-t border-border/60 mt-3 space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">上月任务 · 可沿用</div>
            {myLast.map((t) => (
              <div key={t.id} className="flex items-center gap-2 bg-muted/40 rounded-xl p-2.5">
                <div className="flex-1 text-sm">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.type === "count" ? "勾选" : "计时"} · ≥{t.target} {t.unit}/周
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
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">任务设置</h1>
        <p className="text-sm text-muted-foreground">每月初为自己设定 1–3 个本月专注任务</p>
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
