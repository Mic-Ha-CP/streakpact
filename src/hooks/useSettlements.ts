import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import { useTasks } from "@/hooks/useTasks";
import { useLogs } from "@/hooks/useLogs";
import { useRewardPlans } from "@/hooks/useRewardPlans";
import {
  combineTeamMonth,
  getWeeksInMonth,
  monthStatus,
  pendingWeekLabels,
  weekStatusForUser,
  type MonthResult,
  type WeekLabel,
} from "@/data/calc";
import { todayISO } from "@/lib/dates";
import type { RewardType, UserId } from "@/data/models";
import type { Tables, TablesInsert } from "@/lib/database.types";

export interface WeeklySettlement {
  userId: UserId;
  weekNumber: number;
  weekStart: string;
  isSuccess: boolean;
}

export interface MonthlySettlement {
  userId: UserId;
  weeksSuccess: number;
  result: MonthResult;
}

function toWeekly(row: Tables<"weekly_settlements">, profiles: ProfileMaps): WeeklySettlement {
  return {
    userId: profiles.byId[row.user_id],
    weekNumber: row.week_number,
    weekStart: row.week_start,
    isSuccess: row.is_success,
  };
}

function toMonthly(row: Tables<"monthly_settlements">, profiles: ProfileMaps): MonthlySettlement {
  return {
    userId: profiles.byId[row.user_id],
    weeksSuccess: row.weeks_success,
    result: row.result as MonthResult,
  };
}

/** Result of a settle action, used to drive the success toast. */
export interface SettleWeekResult {
  week: WeekLabel;
  isSuccess: boolean;
  /** true if a ledger entry was created (a matching reward/penalty plan existed). */
  ledgered: boolean;
}
export interface SettleMonthResult {
  team: MonthResult;
  ledgered: boolean;
}

/**
 * Settlement for a month: reads the persisted weekly/monthly snapshots (both users)
 * and provides one-click settle actions for the *current* user. Settling a week is
 * individual; settling the month uses the team-combined result (combineTeamMonth)
 * but writes the current user's own snapshot + a ledger entry from their own plan.
 *
 * Idempotency: the settlement snapshot rows are the guard (a settled week/month is
 * dropped from pendingWeeks / monthSettleable). The ledger insert is additionally
 * guarded by an existence check on (user_id, source), so re-settling never duplicates
 * an entry even without the optional DB unique constraint.
 */
export function useSettlements(month: string) {
  const qc = useQueryClient();
  const { userId, profileId } = useAuth();
  const { data: profiles } = useProfiles();
  const { tasks } = useTasks(month);
  const { logs } = useLogs(month);
  const { plans } = useRewardPlans(month);
  const today = todayISO();

  const weekly = useQuery({
    queryKey: ["weekly_settlements", month],
    enabled: !!profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_settlements")
        .select("*")
        .eq("year_month", month);
      if (error) throw error;
      return (data ?? []).map((row) => toWeekly(row, profiles!));
    },
  });

  const monthly = useQuery({
    queryKey: ["monthly_settlements", month],
    enabled: !!profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_settlements")
        .select("*")
        .eq("year_month", month);
      if (error) throw error;
      return (data ?? []).map((row) => toMonthly(row, profiles!));
    },
  });

  const weeklyRows = weekly.data ?? [];
  const monthlyRows = monthly.data ?? [];

  // ---- Derived state for the current user ------------------------------------
  const weeks = getWeeksInMonth(month);
  const myTasks = tasks.filter((t) => t.userId === userId);

  const mySettledWeekNumbers = new Set(
    weeklyRows.filter((s) => s.userId === userId).map((s) => s.weekNumber),
  );
  const mySettledMonthly = monthlyRows.find((s) => s.userId === userId) ?? null;

  // Weeks that have ended but the current user hasn't settled yet (only if they
  // actually have tasks — an empty month has nothing to settle).
  const pendingWeeks: WeekLabel[] =
    myTasks.length === 0 ? [] : pendingWeekLabels(month, mySettledWeekNumbers, today);

  // Team month preview — null if either member has no tasks (can't judge yet).
  const resultFor = (u: UserId): MonthResult | null => {
    const ts = tasks.filter((t) => t.userId === u);
    return ts.length ? monthStatus(ts, logs, month, today).result : null;
  };
  const teamMonthPreview = combineTeamMonth(resultFor("CP"), resultFor("JX"));
  const monthSettleable = teamMonthPreview !== null && !mySettledMonthly;

  /**
   * What settling `week` will produce — mirrors settleWeek exactly, so a preview
   * dialog shows precisely what will be written (single source of truth).
   */
  const previewWeek = (
    week: WeekLabel,
  ): { isSuccess: boolean; type: RewardType; text: string; willLedger: boolean } => {
    const isSuccess = weekStatusForUser(myTasks, logs, month, week, today) === "success";
    const weekNumber = Number(week.slice(1));
    const plan = plans.find((p) => p.userId === userId && p.weekNumber === weekNumber);
    const text = ((isSuccess ? plan?.successReward : plan?.failurePenalty) ?? "").trim();
    return { isSuccess, type: isSuccess ? "reward" : "penalty", text, willLedger: text !== "" };
  };

  // ---- Settle actions --------------------------------------------------------
  const ledgerExists = async (source: string) => {
    const { data, error } = await supabase
      .from("reward_ledger")
      .select("id")
      .eq("user_id", profileId!)
      .eq("source", source)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  };

  const settleWeek = useMutation({
    mutationFn: async (week: WeekLabel): Promise<SettleWeekResult> => {
      if (!profileId || !userId) throw new Error("Not signed in");
      const w = weeks.find((x) => x.label === week);
      if (!w) throw new Error("Invalid week");

      const isSuccess = weekStatusForUser(myTasks, logs, month, week, today) === "success";
      const weekNumber = Number(week.slice(1));
      const source = `${month} ${week}`;

      const plan = plans.find((p) => p.userId === userId && p.weekNumber === weekNumber);
      const text = isSuccess ? plan?.successReward : plan?.failurePenalty;
      let ledgered = false;
      if (text && text.trim() !== "" && !(await ledgerExists(source))) {
        const row: TablesInsert<"reward_ledger"> = {
          user_id: profileId,
          type: isSuccess ? "reward" : "penalty",
          content: text,
          source,
          status: "pending",
        };
        const { error } = await supabase.from("reward_ledger").insert(row);
        if (error) throw error;
        ledgered = true;
      }

      const srow: TablesInsert<"weekly_settlements"> = {
        user_id: profileId,
        year_month: month,
        week_number: weekNumber,
        week_start: w.startDate,
        is_success: isSuccess,
      };
      const { error } = await supabase
        .from("weekly_settlements")
        .upsert(srow, { onConflict: "user_id,year_month,week_number" });
      if (error) throw error;

      return { week, isSuccess, ledgered };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly_settlements", month] });
      qc.invalidateQueries({ queryKey: ["reward_ledger"] });
      qc.invalidateQueries({ queryKey: ["unsettled_periods"] });
    },
  });

  const settleMonth = useMutation({
    mutationFn: async (): Promise<SettleMonthResult> => {
      if (!profileId || !userId) throw new Error("Not signed in");
      const team = combineTeamMonth(resultFor("CP"), resultFor("JX"));
      if (team === null) throw new Error("尚不可结算");

      const myMonth = monthStatus(myTasks, logs, month, today);
      const source = `${month} 月`;

      let ledgered = false;
      if (team !== "neutral") {
        const plan = plans.find((p) => p.userId === userId && p.weekNumber === null);
        const text = team === "success" ? plan?.successReward : plan?.failurePenalty;
        if (text && text.trim() !== "" && !(await ledgerExists(source))) {
          const row: TablesInsert<"reward_ledger"> = {
            user_id: profileId,
            type: team === "success" ? "reward" : "penalty",
            content: text,
            source,
            status: "pending",
          };
          const { error } = await supabase.from("reward_ledger").insert(row);
          if (error) throw error;
          ledgered = true;
        }
      }

      const srow: TablesInsert<"monthly_settlements"> = {
        user_id: profileId,
        year_month: month,
        weeks_success: myMonth.successWeeks,
        result: team,
      };
      const { error } = await supabase
        .from("monthly_settlements")
        .upsert(srow, { onConflict: "user_id,year_month" });
      if (error) throw error;

      return { team, ledgered };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_settlements", month] });
      qc.invalidateQueries({ queryKey: ["reward_ledger"] });
    },
  });

  // ---- Un-settle (撤your own settlement back to pending) ---------------------
  // Deletes the snapshot AND the ledger entry it generated, so the period can be
  // re-settled. Requires the DELETE policies from migrations/003.
  const deleteLedgerBySource = async (source: string) => {
    const { error } = await supabase
      .from("reward_ledger")
      .delete()
      .eq("user_id", profileId!)
      .eq("source", source);
    if (error) throw error;
  };

  const unsettleWeek = useMutation({
    mutationFn: async (week: WeekLabel) => {
      if (!profileId) throw new Error("Not signed in");
      await deleteLedgerBySource(`${month} ${week}`);
      const { error } = await supabase
        .from("weekly_settlements")
        .delete()
        .eq("user_id", profileId)
        .eq("year_month", month)
        .eq("week_number", Number(week.slice(1)));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["weekly_settlements", month] });
      qc.invalidateQueries({ queryKey: ["reward_ledger"] });
      qc.invalidateQueries({ queryKey: ["unsettled_periods"] });
    },
  });

  const unsettleMonth = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Not signed in");
      await deleteLedgerBySource(`${month} 月`);
      const { error } = await supabase
        .from("monthly_settlements")
        .delete()
        .eq("user_id", profileId)
        .eq("year_month", month);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly_settlements", month] });
      qc.invalidateQueries({ queryKey: ["reward_ledger"] });
    },
  });

  return {
    weekly: weeklyRows,
    monthly: monthlyRows,
    isLoading: weekly.isLoading || monthly.isLoading,
    // current-user settle state + actions
    pendingWeeks,
    previewWeek,
    monthSettleable,
    teamMonthPreview,
    mySettledWeeks: [...mySettledWeekNumbers].sort((a, b) => a - b),
    mySettledMonthly,
    settleWeek,
    settleMonth,
    unsettleWeek,
    unsettleMonth,
  };
}
