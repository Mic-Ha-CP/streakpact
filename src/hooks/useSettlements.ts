import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import type { MonthResult } from "@/data/calc";
import type { UserId } from "@/data/models";
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

/**
 * Reads + persists settlement snapshots for a month. Weekly/monthly results are
 * computed client-side in calc.ts; these mutations upsert that computed result for
 * the current user. Not wired to a UI trigger yet (the app currently derives status
 * live from logs) — provided for when an explicit "settle" action / ledger generation
 * is added.
 */
export function useSettlements(month: string) {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const { data: profiles } = useProfiles();

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

  const persistWeekly = useMutation({
    mutationFn: async (input: { weekNumber: number; weekStart: string; isSuccess: boolean }) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"weekly_settlements"> = {
        user_id: profileId,
        year_month: month,
        week_number: input.weekNumber,
        week_start: input.weekStart,
        is_success: input.isSuccess,
      };
      const { error } = await supabase
        .from("weekly_settlements")
        .upsert(row, { onConflict: "user_id,year_month,week_number" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weekly_settlements", month] }),
  });

  const persistMonthly = useMutation({
    mutationFn: async (input: { weeksSuccess: number; result: MonthResult }) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"monthly_settlements"> = {
        user_id: profileId,
        year_month: month,
        weeks_success: input.weeksSuccess,
        result: input.result,
      };
      const { error } = await supabase
        .from("monthly_settlements")
        .upsert(row, { onConflict: "user_id,year_month" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["monthly_settlements", month] }),
  });

  return {
    weekly: weekly.data ?? [],
    monthly: monthly.data ?? [],
    isLoading: weekly.isLoading || monthly.isLoading,
    persistWeekly,
    persistMonthly,
  };
}
