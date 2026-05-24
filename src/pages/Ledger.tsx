import { useMemo, useState } from "react";
import { useApp } from "@/data/store";
import type { RewardStatus, RewardType, UserId } from "@/data/types";
import { PersonChip } from "@/components/PersonChip";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Skull, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_LABEL: Record<RewardStatus, string> = {
  pending: "未使用",
  in_progress: "使用中",
  used: "已使用",
  completed: "已完成",
  forfeited: "已过期",
};

const STATUS_PILL: Record<RewardStatus, string> = {
  pending: "border border-primary text-primary bg-transparent",
  in_progress: "bg-primary text-primary-foreground",
  used: "bg-success text-success-foreground",
  completed: "bg-success text-success-foreground",
  forfeited: "bg-muted text-muted-foreground",
};

const Ledger = () => {
  const { ledger, updateLedger } = useApp();
  const [person, setPerson] = useState<"all" | UserId>("all");
  const [type, setType] = useState<"all" | RewardType>("all");
  const [status, setStatus] = useState<"all" | RewardStatus>("all");

  const rows = useMemo(() => {
    return ledger.filter((r) => {
      if (person !== "all" && r.userId !== person) return false;
      if (type !== "all" && r.type !== type) return false;
      if (status !== "all" && r.status !== status) return false;
      return true;
    });
  }, [ledger, person, type, status]);

  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">奖惩账本</h1>
        <p className="text-sm text-muted-foreground">所有已结算的奖励与惩罚</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl p-3 border border-border/60 shadow-card flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground ml-1" />
        <Select value={person} onValueChange={(v) => setPerson(v as any)}>
          <SelectTrigger className="w-28 rounded-xl h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部成员</SelectItem>
            <SelectItem value="CP">CP</SelectItem>
            <SelectItem value="JX">JX</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as any)}>
          <SelectTrigger className="w-28 rounded-xl h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">奖励/惩罚</SelectItem>
            <SelectItem value="reward">仅奖励</SelectItem>
            <SelectItem value="penalty">仅惩罚</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as any)}>
          <SelectTrigger className="w-28 rounded-xl h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">{STATUS_LABEL.pending}</SelectItem>
            <SelectItem value="in_progress">{STATUS_LABEL.in_progress}</SelectItem>
            <SelectItem value="used">{STATUS_LABEL.used}</SelectItem>
            <SelectItem value="completed">{STATUS_LABEL.completed}</SelectItem>
            <SelectItem value="forfeited">{STATUS_LABEL.forfeited}</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground tabular-nums">{rows.length} 条记录</div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="bg-card rounded-2xl p-3 border border-border/60 shadow-card space-y-2">
            <div className="flex items-center gap-2">
              <PersonChip user={r.userId} />
              <span
                className={cn(
                  "pill",
                  r.type === "reward"
                    ? "bg-success-soft text-success"
                    : "bg-danger-soft text-danger",
                )}
              >
                {r.type === "reward" ? <Sparkles className="w-3 h-3" /> : <Skull className="w-3 h-3" />}
                {r.type === "reward" ? "奖励" : "惩罚"}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground">{r.source}</span>
            </div>
            <div className="font-medium text-sm">{r.content}</div>
            <div className="flex items-center gap-2">
              <span className={cn("pill", STATUS_PILL[r.status])}>{STATUS_LABEL[r.status]}</span>
              <Select
                value={r.status}
                onValueChange={(v) => {
                  updateLedger(r.id, { status: v as RewardStatus });
                  toast.success("状态已更新");
                }}
              >
                <SelectTrigger className="h-8 rounded-lg w-28 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{STATUS_LABEL.pending}</SelectItem>
                  <SelectItem value="in_progress">{STATUS_LABEL.in_progress}</SelectItem>
                  <SelectItem value="used">{STATUS_LABEL.used}</SelectItem>
                  <SelectItem value="completed">{STATUS_LABEL.completed}</SelectItem>
                  <SelectItem value="forfeited">{STATUS_LABEL.forfeited}</SelectItem>
                </SelectContent>
              </Select>
              {r.expiry && <span className="text-[11px] text-muted-foreground">截止 {r.expiry}</span>}
            </div>
            {(r.notes || r.remarks) && (
              <div className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                {r.notes && <div>📝 {r.notes}</div>}
                {r.remarks && <div>· {r.remarks}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-bold">成员</th>
              <th className="text-left px-4 py-3 font-bold">类型</th>
              <th className="text-left px-4 py-3 font-bold">内容</th>
              <th className="text-left px-4 py-3 font-bold">来源</th>
              <th className="text-left px-4 py-3 font-bold">状态</th>
              <th className="text-left px-4 py-3 font-bold">截止</th>
              <th className="text-left px-4 py-3 font-bold">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3"><PersonChip user={r.userId} /></td>
                <td className="px-4 py-3">
                  <span className={cn("pill", r.type === "reward" ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
                    {r.type === "reward" ? <Sparkles className="w-3 h-3" /> : <Skull className="w-3 h-3" />}
                    {r.type === "reward" ? "奖励" : "惩罚"}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">{r.content}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">{r.source}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("pill", STATUS_PILL[r.status])}>{STATUS_LABEL[r.status]}</span>
                    <Select
                      value={r.status}
                      onValueChange={(v) => {
                        updateLedger(r.id, { status: v as RewardStatus });
                        toast.success("状态已更新");
                      }}
                    >
                      <SelectTrigger className="h-8 rounded-lg w-24 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{STATUS_LABEL.pending}</SelectItem>
                        <SelectItem value="in_progress">{STATUS_LABEL.in_progress}</SelectItem>
                        <SelectItem value="used">{STATUS_LABEL.used}</SelectItem>
                        <SelectItem value="completed">{STATUS_LABEL.completed}</SelectItem>
                        <SelectItem value="forfeited">{STATUS_LABEL.forfeited}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">{r.expiry ?? "—"}</td>
                <td className="px-4 py-3">
                  <Input
                    defaultValue={r.notes ?? ""}
                    placeholder="进度 / 备注"
                    className="h-8 rounded-lg text-xs"
                    onBlur={(e) => {
                      if (e.target.value !== (r.notes ?? "")) {
                        updateLedger(r.id, { notes: e.target.value });
                      }
                    }}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  暂无记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Ledger;
