import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { todayISO } from "@/lib/dates";
import {
  challengeEnded,
  challengeResultForUser,
  combineTeamChallenge,
  type ChallengeResult,
} from "@/data/challenge";
import type { Challenge, ChallengeMember, DailyLog, RewardType, Task } from "@/data/models";
import type { TablesInsert } from "@/lib/database.types";

/** Ledger source string for a challenge — unique per (user, challenge) via the
 *  existing reward_ledger (user_id, source) constraint, so writes are idempotent. */
export function challengeSource(startDate: string): string {
  return `${startDate} 挑战`;
}

export interface SettlePreview {
  myResult: ChallengeResult | null;
  partnerSettled: boolean;
  /** Team result from live logs (what it will be); null if partner not judgeable yet. */
  team: ChallengeResult | null;
  ledgerType: RewardType | null;
  ledgerText: string;
  /** True if the ledger row gets written by THIS settle (partner already settled). */
  writesNow: boolean;
}

/**
 * Single-layer challenge settlement (D2). Each user settles their OWN side (result is
 * a pure function of their logs, snapshotted into challenge_members). The team
 * reward/penalty only lands in the ledger once BOTH sides have settled (both-sides
 * gate); the first settler's ledger row is written lazily by their own client via
 * `reconcile` when they next view the settled challenge. Un-settle deletes the
 * snapshot + own ledger row (reuses the 003 DELETE policies).
 *
 * Ledger per user: team success + a team_reward set → reward = team_reward; team
 * failure + own deposit_execution set → penalty = own deposit_execution; else none.
 */
export function useChallengeSettlement(
  challenge: Challenge | null,
  members: ChallengeMember[],
  myTasks: Task[],
  partnerTasks: Task[],
  logs: DailyLog[],
) {
  const qc = useQueryClient();
  const { userId, profileId } = useAuth();
  const today = todayISO();

  const start = challenge?.startDate ?? "";
  const weeks = challenge?.weeks ?? 4;
  const source = challenge ? challengeSource(start) : "";
  const ended = challenge ? challengeEnded(start, weeks, today) : false;

  const myMember = members.find((m) => m.userId === userId) ?? null;
  const partnerMember = members.find((m) => m.userId !== userId) ?? null;

  const myLiveResult = challengeResultForUser(myTasks, logs, start, weeks);
  const partnerLiveResult = challengeResultForUser(partnerTasks, logs, start, weeks);

  const mySettled = !!myMember?.result;
  const partnerSettled = !!partnerMember?.result;
  const bothSettled = mySettled && partnerSettled;
  const teamSettled: ChallengeResult | null = bothSettled
    ? combineTeamChallenge(
        myMember!.result as ChallengeResult,
        partnerMember!.result as ChallengeResult,
      )
    : null;

  const canSettle = !!challenge && ended && !!myMember && !mySettled;

  // Does my ledger row for this challenge already exist? Drives lazy reconcile.
  const myLedgerQ = useQuery({
    queryKey: ["challenge_ledger", challenge?.id, profileId],
    enabled: !!challenge && !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_ledger")
        .select("id")
        .eq("user_id", profileId!)
        .eq("source", source)
        .limit(1);
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },
  });
  const myLedgerExists = myLedgerQ.data ?? false;

  /** The ledger row my side warrants for a decided team result, or null. */
  const warrantedFor = (team: ChallengeResult | null): { type: RewardType; content: string } | null => {
    if (!challenge) return null;
    if (team === "success" && challenge.teamReward?.trim())
      return { type: "reward", content: challenge.teamReward.trim() };
    if (team === "failure" && myMember?.depositExecution?.trim())
      return { type: "penalty", content: myMember.depositExecution.trim() };
    return null;
  };

  const ledgerExists = async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from("reward_ledger")
      .select("id")
      .eq("user_id", profileId!)
      .eq("source", source)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  };

  /** Insert my ledger row for a decided team result (idempotent on (user, source)). */
  const writeMyLedger = async (team: ChallengeResult | null): Promise<boolean> => {
    const w = warrantedFor(team);
    if (!w) return false;
    if (await ledgerExists()) return false;
    const row: TablesInsert<"reward_ledger"> = {
      user_id: profileId!,
      type: w.type,
      content: w.content,
      source,
      status: "pending",
    };
    const { error } = await supabase.from("reward_ledger").insert(row);
    if (error) throw error;
    return true;
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["challenge_members"] });
    qc.invalidateQueries({ queryKey: ["challenge_ledger"] });
    qc.invalidateQueries({ queryKey: ["reward_ledger"] });
    // Settle/un-settle flips challenge_members.result → the challenge-win coin count
    // changes, so the derived balance + 通关 breakdown must refresh immediately.
    qc.invalidateQueries({ queryKey: ["coins_wins"] });
  };

  const settleMine = useMutation({
    mutationFn: async (): Promise<{ result: ChallengeResult; team: ChallengeResult | null }> => {
      if (!profileId || !challenge) throw new Error("No active challenge");
      if (!ended) throw new Error("挑战尚未结束");
      if (myLiveResult === null) throw new Error("你还没有任务可结算");

      const { error } = await supabase
        .from("challenge_members")
        .update({ result: myLiveResult, settled_at: new Date().toISOString() })
        .eq("challenge_id", challenge.id)
        .eq("user_id", profileId);
      if (error) throw error;

      // If the partner already settled, the team result is decided now → write my row.
      const partnerR = (partnerMember?.result as ChallengeResult | null) ?? null;
      const team = combineTeamChallenge(myLiveResult, partnerR);
      if (team) await writeMyLedger(team);
      return { result: myLiveResult, team };
    },
    onSuccess: invalidate,
  });

  const unsettleMine = useMutation({
    mutationFn: async () => {
      if (!profileId || !challenge) throw new Error("No active challenge");
      const { error: delErr } = await supabase
        .from("reward_ledger")
        .delete()
        .eq("user_id", profileId)
        .eq("source", source);
      if (delErr) throw delErr;
      const { error } = await supabase
        .from("challenge_members")
        .update({ result: null, settled_at: null })
        .eq("challenge_id", challenge.id)
        .eq("user_id", profileId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Lazy reconcile: the FIRST settler's ledger row is written when they revisit and
  // both sides are now settled. Idempotent + guarded so it fires at most once per need.
  const reconcile = useMutation({
    mutationFn: async () => {
      await writeMyLedger(teamSettled);
    },
    onSuccess: invalidate,
  });

  useEffect(() => {
    if (!bothSettled) return;
    if (!warrantedFor(teamSettled)) return;
    if (myLedgerExists) return;
    if (reconcile.isPending) return;
    reconcile.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bothSettled, teamSettled, myLedgerExists]);

  const previewSettle = (): SettlePreview => {
    const team = combineTeamChallenge(myLiveResult, partnerLiveResult);
    const partnerAlreadySettled = partnerSettled;
    // The row this settle would write NOW requires the partner to have settled.
    const w = partnerAlreadySettled ? warrantedFor(team) : null;
    return {
      myResult: myLiveResult,
      partnerSettled: partnerAlreadySettled,
      team,
      ledgerType: w?.type ?? null,
      ledgerText: w?.content ?? "",
      writesNow: !!w,
    };
  };

  return {
    ended,
    canSettle,
    mySettled,
    partnerSettled,
    bothSettled,
    teamSettled,
    myResult: (myMember?.result as ChallengeResult | null) ?? null,
    partnerResult: (partnerMember?.result as ChallengeResult | null) ?? null,
    settleMine,
    unsettleMine,
    previewSettle,
  };
}
