import { useChallengeHistory, type HistoryEntry, type HistoryMember } from "@/hooks/useChallengeHistory";
import { unitLabel } from "@/data/models";
import { History, Check, X, ShieldCheck, Skull, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const TeamVerdict = ({ e }: { e: HistoryEntry }) => {
  if (e.kind === "void")
    return (
      <span className="pill bg-muted text-muted-foreground">
        <Ban className="w-3 h-3" />
        {e.challenge.status === "aborted" ? "已中止" : "已作废"}
      </span>
    );
  if (!e.bothSettled)
    return <span className="pill border border-border text-muted-foreground">未完成结算</span>;
  if (e.team === "success")
    return <span className="pill bg-success text-success-foreground">团队通关</span>;
  return <span className="pill bg-danger text-danger-foreground">团队失败</span>;
};

/** The deposit's fate — the bit that currently just vanishes after a win. */
const DepositLine = ({ m }: { m: HistoryMember }) => {
  if (!m.depositStake) return null;
  const meta =
    m.depositOutcome === "released"
      ? { icon: ShieldCheck, cls: "text-success", label: "已解除" }
      : m.depositOutcome === "executed"
        ? { icon: Skull, cls: "text-danger", label: "已触发执行" }
        : { icon: Ban, cls: "text-muted-foreground", label: "作废未执行" };
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
      <Icon className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", meta.cls)} />
      <span>
        押 {m.depositStake} · <b className={meta.cls}>{meta.label}</b>
        {m.depositOutcome === "executed" && m.depositExecution ? ` · ${m.depositExecution}` : ""}
      </span>
    </div>
  );
};

const MemberBlock = ({ m }: { m: HistoryMember }) => (
  <div className="rounded-2xl border border-border/60 bg-background p-3 space-y-2">
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "w-6 h-6 rounded-lg grid place-items-center text-[10px] font-black text-primary-foreground",
          m.userId === "CP" ? "bg-cp" : "bg-jx",
        )}
      >
        {m.userId}
      </span>
      {m.result === "success" ? (
        <span className="pill bg-success-soft text-success">
          <Check className="w-3 h-3" /> 达标
        </span>
      ) : m.result === "failure" ? (
        <span className="pill bg-danger-soft text-danger">
          <X className="w-3 h-3" /> 未达标
        </span>
      ) : (
        <span className="pill border border-border text-muted-foreground">未结算</span>
      )}
      {m.settledAt && (
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          {m.settledAt.slice(0, 10)} 结算
        </span>
      )}
    </div>

    {m.tasks.length === 0 ? (
      <div className="text-[11px] text-muted-foreground">（没有任务）</div>
    ) : (
      <div className="space-y-1">
        {m.tasks.map(({ task, progress, passed }) => (
          <div key={task.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate">{task.title}</span>
            <span className={cn("tabular-nums shrink-0", passed ? "text-success font-bold" : "text-muted-foreground")}>
              {progress}/{task.target} {unitLabel(task.unit)}
            </span>
          </div>
        ))}
      </div>
    )}

    <DepositLine m={m} />
  </div>
);

/**
 * 往期挑战 — read-only history of past challenges (settled or void). Collapsed by
 * default so it never competes with the current challenge. All values are derived from
 * the existing tables; nothing here writes.
 */
export const ChallengeHistory = () => {
  const { entries, isLoading } = useChallengeHistory();
  if (isLoading || entries.length === 0) return null;

  return (
    <details className="bg-card rounded-2xl border border-border/60 shadow-card overflow-hidden">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-muted-foreground flex items-center gap-2 hover:bg-muted/40">
        <History className="w-4 h-4" /> 往期挑战（{entries.length}）
      </summary>
      <div className="p-4 pt-0 space-y-4">
        {entries.map((e) => (
          <div key={e.challenge.id} className="rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-display font-extrabold tabular-nums text-sm">
                {e.start} → {e.end}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {e.challenge.weeks} 周 · 发起人 {e.challenge.initiator}
              </span>
              <span className="ml-auto">
                <TeamVerdict e={e} />
              </span>
            </div>

            <div className="p-3 space-y-2">
              {e.challenge.teamReward?.trim() && (
                <div className="text-[11px] text-muted-foreground">
                  团队奖励：<b className="text-foreground">{e.challenge.teamReward}</b>
                  {e.team === "success" ? "（已发放）" : ""}
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {e.members.map((m) => (
                  <MemberBlock key={m.userId} m={m} />
                ))}
              </div>
              {e.kind === "settled" && e.team === "success" && (
                <div className="text-[11px] text-success">
                  双方通关 · 押注全部解除，各 +500 金币。
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </details>
  );
};
