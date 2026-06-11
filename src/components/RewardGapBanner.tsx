import { NavLink } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRewardPlans } from "@/hooks/useRewardPlans";
import { currentMonthISO, todayISO } from "@/lib/dates";
import { dayToWeek, getWeeksInMonth } from "@/data/calc";

/**
 * In-app nudge: once the month is into week 2+, if my reward/penalty plan still
 * has gaps (any existing week scope or the month missing a reward OR a penalty),
 * show a banner linking to /rewards. Pure client — reuses the data already loaded
 * by useRewardPlans, no backend/push. (True OS push is a separate future phase.)
 */
export function RewardGapBanner() {
  const { userId: me } = useAuth();
  const month = currentMonthISO();
  const today = todayISO();
  const { plans, isLoading } = useRewardPlans(month);

  if (!me || isLoading) return null;

  const currentWeek = dayToWeek(month, today);
  const weekNum = currentWeek ? Number(currentWeek.slice(1)) : 0;
  if (weekNum < 2) return null; // only nag from week 2 onward

  const mine = plans.filter((p) => p.userId === me);
  const hasGap = (wn: number | null) => {
    const p = mine.find((x) => x.weekNumber === wn);
    return !p?.successReward.trim() || !p?.failurePenalty.trim();
  };

  const missing: string[] = [];
  for (const w of getWeeksInMonth(month)) {
    if (hasGap(Number(w.label.slice(1)))) missing.push(w.label);
  }
  if (hasGap(null)) missing.push("本月");

  if (missing.length === 0) return null;

  return (
    <NavLink
      to="/rewards"
      className="flex items-center gap-3 rounded-2xl border border-secondary/40 bg-secondary-soft/70 px-4 py-3 text-secondary-foreground shadow-card transition-opacity hover:opacity-90"
    >
      <AlertTriangle className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0 text-sm leading-snug">
        <span className="font-bold">已经第 {weekNum} 周了，奖惩还没设好</span>
        <span className="text-secondary-foreground/80"> · 待补：{missing.join("、")}</span>
      </div>
      <ChevronRight className="w-4 h-4 shrink-0" />
    </NavLink>
  );
}
