import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import {
  challengeResultForUser,
  challengeSpan,
  combineTeamChallenge,
  type ChallengeResult,
} from "@/data/challenge";
import type { Challenge, ChallengeMember, DailyLog, Task, TaskType, UserId } from "@/data/models";
import type { Tables } from "@/lib/database.types";

// Local row → domain mappers (same shape as useChallenge's; kept local so the history
// view stays a self-contained read-only feature).
const toChallenge = (r: Tables<"challenges">, p: ProfileMaps): Challenge => ({
  id: r.id,
  startDate: r.start_date,
  weeks: r.weeks,
  extendedDays: r.extended_days ?? 0, // see the note in useChallenge's mapper
  initiator: p.byId[r.initiator],
  mode: r.mode as Challenge["mode"],
  teamReward: r.team_reward,
  status: r.status as Challenge["status"],
  createdAt: r.created_at,
});
const toMember = (r: Tables<"challenge_members">, p: ProfileMaps): ChallengeMember => ({
  id: r.id,
  challengeId: r.challenge_id,
  userId: p.byId[r.user_id],
  depositStake: r.deposit_stake,
  depositExecution: r.deposit_execution,
  result: r.result as ChallengeMember["result"],
  settledAt: r.settled_at,
  editedAt: r.edited_at,
  abortRequestedAt: r.abort_requested_at,
});
const toTask = (r: Tables<"tasks">, p: ProfileMaps): Task => ({
  id: r.id,
  userId: p.byId[r.user_id],
  month: r.year_month ?? "",
  title: r.title,
  type: r.type as TaskType,
  target: r.target_value,
  unit: r.unit,
  carriedOver: r.carried_over,
  editCount: r.edit_count,
});
const toLog = (r: Tables<"daily_logs">, p: ProfileMaps): DailyLog => ({
  id: r.id,
  taskId: r.task_id,
  userId: p.byId[r.user_id],
  date: r.log_date,
  value: Number(r.value),
  note: r.notes,
  backfilled: r.backfilled,
  createdAt: r.created_at,
});

/** How a member's deposit ended up — the thing that silently vanishes today. */
export type DepositOutcome = "released" | "executed" | "void";

export interface HistoryMember {
  userId: UserId;
  result: ChallengeResult | null;
  /** Result recomputed from the logs — may differ from `result` if data changed post-settle. */
  liveResult: ChallengeResult | null;
  settledAt: string | null;
  depositStake: string | null;
  depositExecution: string | null;
  depositOutcome: DepositOutcome;
  tasks: { task: Task; progress: number; passed: boolean }[];
}

export interface HistoryEntry {
  challenge: Challenge;
  start: string;
  end: string;
  /** 'settled' = both sides have a result; 'void' = cancelled or aborted. */
  kind: "settled" | "void";
  team: ChallengeResult | null;
  bothSettled: boolean;
  members: HistoryMember[];
}

/**
 * Read-only past-challenge history (ROADMAP "Challenge history view"). Everything is
 * DERIVED from the existing tables — no new schema.
 *
 * "Past" = every challenge except the one the dashboard currently shows. The current
 * challenge is selected exactly as `useChallenge` does it (newest `start_date` among
 * status='active'), so the two views can never disagree about what is current. Note a
 * settled challenge KEEPS status='active' by design ("ended"/"settled" are derived), so
 * it is not the status that makes it history — it is no longer being the newest.
 */
export function useChallengeHistory() {
  const { data: profiles } = useProfiles();

  const q = useQuery({
    queryKey: ["challenge_history"],
    enabled: !!profiles,
    queryFn: async (): Promise<HistoryEntry[]> => {
      const p = profiles!;
      const { data: chRows, error: e1 } = await supabase
        .from("challenges")
        .select("*")
        .order("start_date", { ascending: false });
      if (e1) throw e1;
      const all = (chRows ?? []).map((r) => toChallenge(r, p));
      if (all.length === 0) return [];

      // Mirror useChallenge's current-challenge pick, then treat the rest as history.
      const currentId = all.find((c) => c.status === "active")?.id ?? null;
      const past = all.filter((c) => c.id !== currentId);
      if (past.length === 0) return [];
      const ids = past.map((c) => c.id);

      const [{ data: mRows, error: e2 }, { data: tRows, error: e3 }] = await Promise.all([
        supabase.from("challenge_members").select("*").in("challenge_id", ids),
        supabase.from("tasks").select("*").in("challenge_id", ids),
      ]);
      if (e2) throw e2;
      if (e3) throw e3;
      const members = (mRows ?? []).map((r) => toMember(r, p));
      const tasks = (tRows ?? []).map((r) => toTask(r, p));
      // task id → its challenge (the domain Task drops challenge_id, so keep it here)
      const taskChallenge: Record<string, string> = {};
      for (const r of tRows ?? []) if (r.challenge_id) taskChallenge[r.id] = r.challenge_id;

      let logs: DailyLog[] = [];
      const taskIds = tasks.map((t) => t.id);
      if (taskIds.length > 0) {
        const { data: lRows, error: e4 } = await supabase
          .from("daily_logs")
          .select("*")
          .in("task_id", taskIds);
        if (e4) throw e4;
        logs = (lRows ?? []).map((r) => toLog(r, p));
      }

      return past.map((challenge): HistoryEntry => {
        const { start, end } = challengeSpan(
          challenge.startDate,
          challenge.weeks,
          challenge.extendedDays,
        );
        const mine = members.filter((m) => m.challengeId === challenge.id);
        const voided = challenge.status === "cancelled" || challenge.status === "aborted";
        const team = voided
          ? null
          : combineTeamChallenge(
              (mine[0]?.result as ChallengeResult | null) ?? null,
              (mine[1]?.result as ChallengeResult | null) ?? null,
            );
        const bothSettled = mine.length === 2 && mine.every((m) => !!m.result);

        const hm = mine.map((m): HistoryMember => {
          const myTasks = tasks.filter(
            (t) => t.userId === m.userId && taskChallenge[t.id] === challenge.id,
          );
          return {
            userId: m.userId,
            result: (m.result as ChallengeResult | null) ?? null,
            liveResult: challengeResultForUser(
              myTasks,
              logs,
              challenge.startDate,
              challenge.weeks,
              challenge.extendedDays,
            ),
            settledAt: m.settledAt,
            depositStake: m.depositStake,
            depositExecution: m.depositExecution,
            depositOutcome: voided ? "void" : team === "failure" ? "executed" : "released",
            tasks: myTasks.map((task) => {
              const progress = progressFor(
                task,
                logs,
                challenge.startDate,
                challenge.weeks,
                challenge.extendedDays,
              );
              return { task, progress, passed: progress >= task.target };
            }),
          };
        });

        return {
          challenge,
          start,
          end,
          kind: voided ? "void" : "settled",
          team,
          bothSettled,
          members: hm,
        };
      });
    },
  });

  return { entries: q.data ?? [], isLoading: q.isLoading };
}

// -- helpers -------------------------------------------------------------------
function progressFor(
  task: Task,
  logs: DailyLog[],
  start: string,
  weeks: number,
  extendedDays: number,
): number {
  const { start: s, end } = challengeSpan(start, weeks, extendedDays);
  const ls = logs.filter((l) => l.taskId === task.id && l.date >= s && l.date <= end);
  if (task.type === "count") return new Set(ls.filter((l) => l.value > 0).map((l) => l.date)).size;
  return ls.reduce((sum, l) => sum + (l.value ?? 0), 0);
}
