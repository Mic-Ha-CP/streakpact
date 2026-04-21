import { useState } from "react";
import { useApp } from "@/data/store";
import type { RewardPlan, UserId } from "@/data/types";
import { Input } from "@/components/ui/input";
import { Sparkles, Skull } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeeksInMonth, WEEK_LABELS, type WeekLabel } from "@/data/calc";
import { toast } from "sonner";

const SCOPES: ("MONTH" | WeekLabel)[] = ["W1", "W2", "W3", "W4", "W5", "MONTH"];

const Rewards = () => {
  const { plans, currentMonth, upsertPlan } = useApp();
  const [active, setActive] = useState<UserId>("CP");
  const weeks = getWeeksInMonth(currentMonth);
  const validScopes = SCOPES.filter((s) => s === "MONTH" || weeks.find((w) => w.label === s));

  const findPlan = (scope: "MONTH" | WeekLabel): RewardPlan => {
    const existing = plans.find((p) => p.userId === active && p.month === currentMonth && p.scope === scope);
    return (
      existing ?? {
        id: `${active}-${currentMonth}-${scope}`,
        userId: active,
        month: currentMonth,
        scope,
        rewardText: "",
        penaltyText: "",
      }
    );
  };

  const save = (p: RewardPlan, patch: Partial<RewardPlan>) => {
    upsertPlan({ ...p, ...patch });
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
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

      <div className="space-y-3">
        {validScopes.map((scope) => {
          const plan = findPlan(scope);
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
                    defaultValue={plan.rewardText}
                    placeholder="例如：新书 / 一顿大餐 / 周末旅行…"
                    className="rounded-xl"
                    onBlur={(e) => {
                      if (e.target.value !== plan.rewardText) {
                        save(plan, { rewardText: e.target.value });
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
                    defaultValue={plan.penaltyText}
                    placeholder="例如：请喝奶茶 / 做一周饭…"
                    className="rounded-xl"
                    onBlur={(e) => {
                      if (e.target.value !== plan.penaltyText) {
                        save(plan, { penaltyText: e.target.value });
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
