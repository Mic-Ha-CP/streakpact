import { useState } from "react";
import { useRewardPlans } from "@/hooks/useRewardPlans";
import { useAuth } from "@/hooks/useAuth";
import type { UserId } from "@/data/models";
import { Input } from "@/components/ui/input";
import { Sparkles, Skull } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeeksInMonth, WEEK_LABELS, type WeekLabel } from "@/data/calc";
import { currentMonthISO } from "@/lib/dates";
import { toast } from "sonner";

type Scope = "MONTH" | WeekLabel;
const SCOPES: Scope[] = ["W1", "W2", "W3", "W4", "W5", "MONTH"];

/** "W3" -> 3, "MONTH" -> null (monthly plan). */
const scopeToWeek = (scope: Scope): number | null =>
  scope === "MONTH" ? null : Number(scope.slice(1));

const Rewards = () => {
  const currentMonth = currentMonthISO();
  const { userId: me } = useAuth();
  const { plans, upsertPlan } = useRewardPlans(currentMonth);
  const [active, setActive] = useState<UserId>(me ?? "CP");
  const editable = active === me;

  const weeks = getWeeksInMonth(currentMonth);
  const validScopes = SCOPES.filter((s) => s === "MONTH" || weeks.find((w) => w.label === s));

  const planFor = (scope: Scope) => {
    const wn = scopeToWeek(scope);
    return plans.find((p) => p.userId === active && p.weekNumber === wn);
  };

  const save = (scope: Scope, patch: { successReward?: string; failurePenalty?: string }) => {
    const existing = planFor(scope);
    upsertPlan.mutate({
      weekNumber: scopeToWeek(scope),
      successReward: patch.successReward ?? existing?.successReward ?? "",
      failurePenalty: patch.failurePenalty ?? existing?.failurePenalty ?? "",
    });
  };

  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">奖惩设置</h1>
        <p className="text-sm text-muted-foreground">每月初约定每周与月度的奖励 / 惩罚</p>
      </div>

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
                : "bg-card text-muted-foreground border-border",
            )}
          >
            {u}
          </button>
        ))}
      </div>

      {!editable && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-xl px-3 py-2">
          正在查看 {active} 的奖惩设置（只读）。只能编辑自己的设置。
        </div>
      )}

      <div className="space-y-3">
        {validScopes.map((scope) => {
          const plan = planFor(scope);
          const isMonth = scope === "MONTH";
          return (
            <div
              key={scope}
              className={cn(
                "rounded-3xl border shadow-card overflow-hidden",
                isMonth ? "bg-gradient-warm border-transparent" : "bg-card border-border/60",
              )}
            >
              <div
                className={cn(
                  "px-4 py-2.5 flex items-center justify-between text-sm font-bold",
                  isMonth ? "text-primary-foreground" : "text-foreground bg-muted/40",
                )}
              >
                <span>{isMonth ? "🏆 本月通关" : `第 ${scope.slice(1)} 周`}</span>
                <span className="text-xs font-medium opacity-80">
                  {isMonth ? "≥3 周成功 = 通关" : "本周全任务达标"}
                </span>
              </div>
              <div className={cn("grid sm:grid-cols-2 gap-px bg-border/60", isMonth && "bg-card")}>
                <div className="bg-card p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-success text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" /> 成功奖励
                  </div>
                  <Input
                    key={`${scope}-reward-${plan?.successReward ?? ""}`}
                    defaultValue={plan?.successReward ?? ""}
                    disabled={!editable}
                    placeholder="例如：新书 / 一顿大餐 / 周末旅行…"
                    className="rounded-xl"
                    onBlur={(e) => {
                      if (e.target.value !== (plan?.successReward ?? "")) {
                        save(scope, { successReward: e.target.value });
                        toast.success("奖励已保存");
                      }
                    }}
                  />
                </div>
                <div className="bg-card p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-danger text-xs font-bold uppercase tracking-wider">
                    <Skull className="w-3.5 h-3.5" /> 失败惩罚
                  </div>
                  <Input
                    key={`${scope}-penalty-${plan?.failurePenalty ?? ""}`}
                    defaultValue={plan?.failurePenalty ?? ""}
                    disabled={!editable}
                    placeholder="例如：请喝奶茶 / 做一周饭…"
                    className="rounded-xl"
                    onBlur={(e) => {
                      if (e.target.value !== (plan?.failurePenalty ?? "")) {
                        save(scope, { failurePenalty: e.target.value });
                        toast.success("惩罚已保存");
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Rewards;
