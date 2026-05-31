import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import type { RewardPlan } from "@/data/models";
import type { Tables, TablesInsert } from "@/lib/database.types";

function toPlan(row: Tables<"reward_plans">, profiles: ProfileMaps): RewardPlan {
  return {
    id: row.id,
    userId: profiles.byId[row.user_id],
    month: row.year_month,
    weekNumber: row.week_number,
    successReward: row.success_reward ?? "",
    failurePenalty: row.failure_penalty ?? "",
  };
}

export interface PlanUpsert {
  weekNumber: number | null; // null = monthly
  successReward?: string;
  failurePenalty?: string;
}

/** Reward/penalty plans for a month (both users). Writes are current-user only. */
export function useRewardPlans(month: string) {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const { data: profiles } = useProfiles();

  const query = useQuery({
    queryKey: ["reward_plans", month],
    enabled: !!profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_plans")
        .select("*")
        .eq("year_month", month);
      if (error) throw error;
      return (data ?? []).map((row) => toPlan(row, profiles!));
    },
  });

  const upsertPlan = useMutation({
    mutationFn: async (input: PlanUpsert) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"reward_plans"> = {
        user_id: profileId,
        year_month: month,
        week_number: input.weekNumber,
        success_reward: input.successReward ?? null,
        failure_penalty: input.failurePenalty ?? null,
      };
      const { error } = await supabase
        .from("reward_plans")
        .upsert(row, { onConflict: "user_id,year_month,week_number" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reward_plans", month] }),
  });

  return {
    plans: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    upsertPlan,
  };
}
