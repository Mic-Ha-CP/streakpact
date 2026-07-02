import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { pendingWeekLabels, type WeekLabel } from "@/data/calc";
import { monthOfWeek, todayISO } from "@/lib/dates";

export interface UnsettledPeriod {
  month: string; // YYYY-MM
  pending: WeekLabel[]; // ended-but-unsettled weeks for the current user
}

/**
 * Months (≤ the current accountability month) where the signed-in user has weeks
 * that have ended but aren't settled yet — powers the Ledger "未结算" entry point.
 * Scanned over the distinct months the user actually has tasks in (bounded by real
 * usage, cheap for 2 users), oldest first. A month appears only while it still has
 * at least one pending week.
 */
export function useUnsettledPeriods() {
  const { profileId } = useAuth();
  const today = todayISO();
  const currentMonth = monthOfWeek(today);

  const query = useQuery({
    queryKey: ["unsettled_periods", profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<UnsettledPeriod[]> => {
      // Distinct months this user has tasks in, up to the current accountability month.
      const { data: taskRows, error: tErr } = await supabase
        .from("tasks")
        .select("year_month")
        .eq("user_id", profileId!);
      if (tErr) throw tErr;

      const months = [...new Set((taskRows ?? []).map((r) => r.year_month))]
        .filter((m) => m <= currentMonth)
        .sort();
      if (months.length === 0) return [];

      // This user's already-settled week numbers, grouped by month.
      const { data: setRows, error: sErr } = await supabase
        .from("weekly_settlements")
        .select("year_month, week_number")
        .eq("user_id", profileId!)
        .in("year_month", months);
      if (sErr) throw sErr;

      const settledByMonth = new Map<string, Set<number>>();
      for (const r of setRows ?? []) {
        const set = settledByMonth.get(r.year_month) ?? new Set<number>();
        set.add(r.week_number);
        settledByMonth.set(r.year_month, set);
      }

      return months
        .map((m) => ({
          month: m,
          pending: pendingWeekLabels(m, settledByMonth.get(m) ?? new Set(), today),
        }))
        .filter((p) => p.pending.length > 0);
    },
  });

  return {
    periods: query.data ?? [],
    isLoading: query.isLoading,
  };
}
