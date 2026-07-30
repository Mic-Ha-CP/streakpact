import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import { autoVoidDue } from "@/data/challenge";
import { todayISO } from "@/lib/dates";
import type {
  Challenge,
  ChallengeMember,
  DailyLog,
  Task,
  TaskType,
  UserId,
} from "@/data/models";
import type { Tables, TablesInsert } from "@/lib/database.types";

// ---- row → domain mappers ----------------------------------------------------
function toChallenge(row: Tables<"challenges">, p: ProfileMaps): Challenge {
  return {
    id: row.id,
    startDate: row.start_date,
    weeks: row.weeks,
    initiator: p.byId[row.initiator],
    mode: row.mode as Challenge["mode"],
    teamReward: row.team_reward,
    status: row.status as Challenge["status"],
    createdAt: row.created_at,
  };
}
function toMember(row: Tables<"challenge_members">, p: ProfileMaps): ChallengeMember {
  return {
    id: row.id,
    challengeId: row.challenge_id,
    userId: p.byId[row.user_id],
    depositStake: row.deposit_stake,
    depositExecution: row.deposit_execution,
    result: row.result as ChallengeMember["result"],
    settledAt: row.settled_at,
    editedAt: row.edited_at,
    abortRequestedAt: row.abort_requested_at,
  };
}
function toTask(row: Tables<"tasks">, p: ProfileMaps): Task {
  return {
    id: row.id,
    userId: p.byId[row.user_id],
    month: row.year_month ?? "", // challenge tasks have no month
    title: row.title,
    type: row.type as TaskType,
    target: row.target_value,
    unit: row.unit,
    carriedOver: row.carried_over,
    editCount: row.edit_count,
  };
}
function toLog(row: Tables<"daily_logs">, p: ProfileMaps): DailyLog {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: p.byId[row.user_id],
    date: row.log_date,
    value: Number(row.value),
    note: row.notes,
    backfilled: row.backfilled,
    createdAt: row.created_at,
  };
}

export interface ChallengeTaskInput {
  id?: string; // present = existing task (update); absent = new (insert)
  title: string;
  type: TaskType;
  target: number; // TOTAL target over the challenge
  unit: string;
}
export interface DepositInput {
  stake: string;
  execution: string;
}
export interface CreateChallengeInput {
  startDate: string; // a Monday
  weeks?: number; // default 4
  teamReward: string;
  deposit: DepositInput;
  tasks: ChallengeTaskInput[];
}
export interface JoinChallengeInput {
  deposit: DepositInput;
  tasks: ChallengeTaskInput[];
}
export interface EditTasksInput {
  upserts: ChallengeTaskInput[]; // final set of my tasks (with/without id)
  deleteIds: string[]; // existing task ids to remove (their logs cascade)
  consumesEdit: boolean; // true = a mid-challenge edit (marks edited_at); false = free pre-start edit
  deposit?: DepositInput; // pre-start only — updates my deposit declaration
  teamReward?: string; // pre-start + initiator only — updates the challenge team reward
}

/**
 * The current (single active) challenge and everything the dashboard needs: its
 * members, its tasks and logs (both users), plus lifecycle + check-in mutations for
 * the current user. Settlement lives in useChallengeSettlement.
 *
 * "Dormant" = no active challenge (`challenge` is null → empty-state on the home page).
 */
export function useChallenge() {
  const qc = useQueryClient();
  const { userId, profileId } = useAuth();
  const { data: profiles } = useProfiles();
  const today = todayISO();

  // Active challenge (at most one). status='active'; newest start wins if ever >1.
  const challengeQ = useQuery({
    queryKey: ["challenge", "current"],
    enabled: !!profiles,
    queryFn: async (): Promise<Challenge | null> => {
      const { data, error } = await supabase
        .from("challenges")
        .select("*")
        .eq("status", "active")
        .order("start_date", { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      return row ? toChallenge(row, profiles!) : null;
    },
  });
  const challenge = challengeQ.data ?? null;
  const cid = challenge?.id;

  const membersQ = useQuery({
    queryKey: ["challenge_members", cid],
    enabled: !!profiles && !!cid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("challenge_members")
        .select("*")
        .eq("challenge_id", cid!);
      if (error) throw error;
      return (data ?? []).map((r) => toMember(r, profiles!));
    },
  });

  const tasksQ = useQuery({
    queryKey: ["challenge_tasks", cid],
    enabled: !!profiles && !!cid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("challenge_id", cid!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => toTask(r, profiles!));
    },
  });
  const tasks = tasksQ.data ?? [];
  const taskIds = tasks.map((t) => t.id);

  // Logs for this challenge's tasks (both users). Keyed off the task-id set so it
  // refetches when tasks change (e.g. after a mid-challenge edit).
  const logsQ = useQuery({
    queryKey: ["challenge_logs", cid, taskIds.join(",")],
    enabled: !!profiles && !!cid && taskIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => toLog(r, profiles!));
    },
  });

  const members = membersQ.data ?? [];
  const logs = logsQ.data ?? [];

  // ---- derived (current user) ------------------------------------------------
  const myMember = members.find((m) => m.userId === userId) ?? null;
  const partnerMember = members.find((m) => m.userId !== userId) ?? null;
  const iJoined = !!myMember;
  const myTasks = tasks.filter((t) => t.userId === userId);
  const tasksFor = (u: UserId) => tasks.filter((t) => t.userId === u);

  // Auto-void (D9): start day arrived + partner never joined. Gate on members having
  // loaded so we don't void prematurely while the second member row is still fetching.
  const voided =
    !!challenge && !membersQ.isLoading && autoVoidDue(challenge.startDate, today, members.length);

  // Consensual abort (D11): each side sets its own abort_requested_at. Exactly one set =
  // a pending request; both set = aborted (derived void, like auto-void).
  const myAbort = !!myMember?.abortRequestedAt;
  const partnerAbort = !!partnerMember?.abortRequestedAt;
  const abortPending = myAbort !== partnerAbort;
  const aborted = myAbort && partnerAbort;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["challenge"] });
    qc.invalidateQueries({ queryKey: ["challenge_members"] });
    qc.invalidateQueries({ queryKey: ["challenge_tasks"] });
    qc.invalidateQueries({ queryKey: ["challenge_logs"] });
  };
  const invalidateLogs = () => qc.invalidateQueries({ queryKey: ["challenge_logs"] });

  const taskRows = (challengeId: string, list: ChallengeTaskInput[]): TablesInsert<"tasks">[] =>
    list.map((t) => ({
      user_id: profileId!,
      challenge_id: challengeId,
      year_month: null,
      title: t.title,
      type: t.type,
      target_value: t.target,
      unit: t.unit,
      carried_over: false,
      edit_count: 0,
    }));

  // ---- lifecycle mutations ---------------------------------------------------
  // NOTE (trust-based, 2 users): create/join do 2–3 sequential writes without a DB
  // transaction. A mid-way failure can leave a partial challenge; re-running or
  // cancel + retry recovers it. An RPC could make this atomic later if needed.
  const createChallenge = useMutation({
    mutationFn: async (input: CreateChallengeInput) => {
      if (!profileId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          start_date: input.startDate,
          weeks: input.weeks ?? 4,
          initiator: profileId,
          mode: "duo",
          team_reward: input.teamReward.trim() || null,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;
      const challengeId = data.id;

      const { error: mErr } = await supabase.from("challenge_members").insert({
        challenge_id: challengeId,
        user_id: profileId,
        deposit_stake: input.deposit.stake.trim() || null,
        deposit_execution: input.deposit.execution.trim() || null,
      });
      if (mErr) throw mErr;

      if (input.tasks.length > 0) {
        const { error: tErr } = await supabase.from("tasks").insert(taskRows(challengeId, input.tasks));
        if (tErr) throw tErr;
      }
    },
    onSuccess: invalidateAll,
  });

  const joinChallenge = useMutation({
    mutationFn: async (input: JoinChallengeInput) => {
      if (!profileId || !cid) throw new Error("No active challenge");
      const { error: mErr } = await supabase.from("challenge_members").insert({
        challenge_id: cid,
        user_id: profileId,
        deposit_stake: input.deposit.stake.trim() || null,
        deposit_execution: input.deposit.execution.trim() || null,
      });
      if (mErr) throw mErr;
      if (input.tasks.length > 0) {
        const { error: tErr } = await supabase.from("tasks").insert(taskRows(cid, input.tasks));
        if (tErr) throw tErr;
      }
    },
    onSuccess: invalidateAll,
  });

  // Initiator-only (enforced by RLS). Pre-start unilateral cancel → home goes dormant.
  const cancelChallenge = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("No active challenge");
      const { error } = await supabase.from("challenges").update({ status: "cancelled" }).eq("id", cid);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // D11 consensual abort (post-start). requestAbort doubles as "confirm" (the second
  // setter). Each side only touches its OWN member row (RLS own-row); when both are set,
  // the initiator's client persists status='aborted' via setStatusAborted below.
  const requestAbort = useMutation({
    mutationFn: async () => {
      if (!profileId || !cid) throw new Error("No active challenge");
      const { error } = await supabase
        .from("challenge_members")
        .update({ abort_requested_at: new Date().toISOString() })
        .eq("challenge_id", cid)
        .eq("user_id", profileId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const withdrawAbort = useMutation({
    mutationFn: async () => {
      if (!profileId || !cid) throw new Error("No active challenge");
      const { error } = await supabase
        .from("challenge_members")
        .update({ abort_requested_at: null })
        .eq("challenge_id", cid)
        .eq("user_id", profileId);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const setStatusAborted = useMutation({
    mutationFn: async () => {
      if (!cid) throw new Error("No active challenge");
      const { error } = await supabase.from("challenges").update({ status: "aborted" }).eq("id", cid);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  // 中途修改 (D7): the one-time edit of my own tasks. Marks my member.edited_at so the
  // window closes. The caller enforces "first half only" + "keep ≥1 task".
  const editMyTasks = useMutation({
    mutationFn: async (input: EditTasksInput) => {
      if (!profileId || !cid) throw new Error("No active challenge");
      if (input.deleteIds.length > 0) {
        const { error } = await supabase.from("tasks").delete().in("id", input.deleteIds);
        if (error) throw error;
      }
      for (const t of input.upserts) {
        if (t.id) {
          const { error } = await supabase
            .from("tasks")
            .update({ title: t.title, type: t.type, target_value: t.target, unit: t.unit })
            .eq("id", t.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("tasks").insert(taskRows(cid, [t]));
          if (error) throw error;
        }
      }
      // Pre-start (free) edits can also change my deposit + the team reward (D10);
      // both are locked once the challenge starts, so the UI only passes them pre-start.
      if (input.deposit) {
        const { error: dErr } = await supabase
          .from("challenge_members")
          .update({
            deposit_stake: input.deposit.stake.trim() || null,
            deposit_execution: input.deposit.execution.trim() || null,
          })
          .eq("challenge_id", cid)
          .eq("user_id", profileId);
        if (dErr) throw dErr;
      }
      if (input.teamReward !== undefined) {
        const { error: trErr } = await supabase
          .from("challenges")
          .update({ team_reward: input.teamReward.trim() || null })
          .eq("id", cid);
        if (trErr) throw trErr;
      }
      // Only a mid-challenge edit consumes the one chance; pre-start edits are free (D10).
      if (input.consumesEdit) {
        const { error: eErr } = await supabase
          .from("challenge_members")
          .update({ edited_at: new Date().toISOString() })
          .eq("challenge_id", cid)
          .eq("user_id", profileId);
        if (eErr) throw eErr;
      }
    },
    onSuccess: invalidateAll,
  });

  // ---- check-in mutations (challenge tasks) ----------------------------------
  const toggleCount = useMutation({
    mutationFn: async (input: { taskId: string; date: string }) => {
      if (!profileId) throw new Error("Not signed in");
      const { data: checked, error: selErr } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("task_id", input.taskId)
        .eq("log_date", input.date)
        .gt("value", 0);
      if (selErr) throw selErr;

      if (checked && checked.length > 0) {
        const { error } = await supabase
          .from("daily_logs")
          .delete()
          .eq("task_id", input.taskId)
          .eq("log_date", input.date)
          .gt("value", 0);
        if (error) throw error;
        return { done: false };
      }
      const row: TablesInsert<"daily_logs"> = {
        task_id: input.taskId,
        user_id: profileId,
        log_date: input.date,
        value: 1,
        backfilled: input.date < today,
      };
      const { error } = await supabase.from("daily_logs").insert(row);
      if (error) throw error;
      return { done: true };
    },
    onSuccess: invalidateLogs,
  });

  const addTimer = useMutation({
    mutationFn: async (input: { taskId: string; date: string; value: number }) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"daily_logs"> = {
        task_id: input.taskId,
        user_id: profileId,
        log_date: input.date,
        value: input.value,
        backfilled: input.date < today,
      };
      const { error } = await supabase.from("daily_logs").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidateLogs,
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidateLogs,
  });

  // Per-day note (value=0 row), independent of check-in — delete + re-insert (no UPDATE
  // policy on daily_logs). Empty note clears the row. Mirrors useLogs.setNote.
  const setNote = useMutation({
    mutationFn: async (input: { taskId: string; date: string; note: string }) => {
      if (!profileId) throw new Error("Not signed in");
      const { error: delErr } = await supabase
        .from("daily_logs")
        .delete()
        .eq("task_id", input.taskId)
        .eq("log_date", input.date)
        .eq("value", 0);
      if (delErr) throw delErr;
      if (input.note.trim() !== "") {
        const row: TablesInsert<"daily_logs"> = {
          task_id: input.taskId,
          user_id: profileId,
          log_date: input.date,
          value: 0,
          notes: input.note,
          backfilled: input.date < today,
        };
        const { error } = await supabase.from("daily_logs").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: invalidateLogs,
  });

  // Auto-void (D9): only the initiator can write status='cancelled' (RLS). Both clients
  // derive dormant from `voided`; this makes it permanent when the initiator loads.
  useEffect(() => {
    if (!challenge || !voided) return;
    if (challenge.status !== "active") return;
    if (challenge.initiator !== userId) return;
    if (cancelChallenge.isPending) return;
    cancelChallenge.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voided, challenge?.id]);

  // D11: once BOTH sides have requested, the initiator's client persists status='aborted'.
  useEffect(() => {
    if (!challenge || !aborted) return;
    if (challenge.status !== "active") return;
    if (challenge.initiator !== userId) return;
    if (setStatusAborted.isPending) return;
    setStatusAborted.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aborted, challenge?.id]);

  return {
    challenge,
    members,
    tasks,
    logs,
    myMember,
    partnerMember,
    iJoined,
    myTasks,
    tasksFor,
    voided,
    aborted,
    abortPending,
    myAbort,
    partnerAbort,
    isLoading: challengeQ.isLoading || (!!cid && (membersQ.isLoading || tasksQ.isLoading)),
    createChallenge,
    joinChallenge,
    cancelChallenge,
    requestAbort,
    withdrawAbort,
    editMyTasks,
    toggleCount,
    addTimer,
    deleteLog,
    setNote,
  };
}
