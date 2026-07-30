import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { todayISO } from "@/lib/dates";
import { checkinStreak, earnedCoins } from "@/data/coins";
import { COINS } from "@/data/coinRules";
import type { DailyLog, Task, TaskType } from "@/data/models";
import type { Tables, TablesInsert } from "@/lib/database.types";

export interface CoinSpend {
  id: string;
  amount: number; // negative
  reason: string;
  source: string | null;
  date: string; // YYYY-MM-DD
}

/**
 * The current user's coin wallet (P2). Balance is DERIVED — earnedCoins(check-ins, 签到,
 * wins) + Σ coin_ledger.amount (spends are negative) — so undo/backfill/un-settle
 * auto-correct. coin_ledger stores only spends. Also exposes 签到 / 补签到 / un-签到.
 * Earnings are scoped to CHALLENGE tasks + 签到 + challenge wins (legacy months = 0).
 */
export function useCoins() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const today = todayISO();
  const enabled = !!profileId;

  const tasksQ = useQuery({
    queryKey: ["coins_tasks", profileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, type")
        .eq("user_id", profileId!)
        .not("challenge_id", "is", null);
      if (error) throw error;
      return (data ?? []) as { id: string; type: string }[];
    },
  });
  const taskIds = (tasksQ.data ?? []).map((t) => t.id);

  const logsQ = useQuery({
    queryKey: ["coins_logs", profileId, taskIds.join(",")],
    enabled: enabled && taskIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("task_id, log_date, value")
        .in("task_id", taskIds);
      if (error) throw error;
      return (data ?? []) as { task_id: string; log_date: string; value: number }[];
    },
  });

  const checkinsQ = useQuery({
    queryKey: ["checkin_days", profileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkin_days")
        .select("day, backfilled")
        .eq("user_id", profileId!)
        .order("day", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { day: string; backfilled: boolean }[];
    },
  });

  const winsQ = useQuery({
    queryKey: ["coins_wins", profileId],
    enabled,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("challenge_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profileId!)
        .eq("result", "success");
      if (error) throw error;
      return count ?? 0;
    },
  });

  const ledgerQ = useQuery({
    queryKey: ["coin_ledger", profileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_ledger")
        .select("*")
        .eq("user_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Tables<"coin_ledger">[];
    },
  });

  // Minimal domain objects — coins math only reads task.id/type and log.taskId/date/value.
  const tasks: Task[] = (tasksQ.data ?? []).map((t) => ({
    id: t.id, userId: "CP", month: "", title: "", type: t.type as TaskType,
    target: 0, unit: "", carriedOver: false, editCount: 0,
  }));
  const logs: DailyLog[] = (logsQ.data ?? []).map((l) => ({
    id: `${l.task_id}-${l.log_date}`, taskId: l.task_id, userId: "CP", date: l.log_date,
    value: Number(l.value), note: null, backfilled: false, createdAt: "",
  }));
  const checkinDays = checkinsQ.data ?? [];
  const winCount = winsQ.data ?? 0;
  const spends = ledgerQ.data ?? [];

  const earnings = earnedCoins({ tasks, logs, checkinDayCount: checkinDays.length, winCount });
  const balance = earnings.total + spends.reduce((s, r) => s + r.amount, 0);
  const signedToday = checkinDays.some((c) => c.day === today);
  const streak = checkinStreak(checkinDays.map((c) => c.day), today);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["checkin_days"] });
    qc.invalidateQueries({ queryKey: ["coin_ledger"] });
  };

  const signInToday = useMutation({
    mutationFn: async () => {
      if (!profileId) throw new Error("Not signed in");
      if (signedToday) return;
      const row: TablesInsert<"checkin_days"> = { user_id: profileId, day: today, backfilled: false };
      const { error } = await supabase.from("checkin_days").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const backfillCheckin = useMutation({
    mutationFn: async (day: string) => {
      if (!profileId) throw new Error("Not signed in");
      if (day >= today) throw new Error("补签到只用于过去的日期");
      if (checkinDays.some((c) => c.day === day)) throw new Error("该日已签到");
      if (balance < COINS.backfillCheckinCost) throw new Error("金币不足");
      const cd: TablesInsert<"checkin_days"> = { user_id: profileId, day, backfilled: true };
      const { error: e1 } = await supabase.from("checkin_days").insert(cd);
      if (e1) throw e1;
      const cl: TablesInsert<"coin_ledger"> = {
        user_id: profileId, amount: -COINS.backfillCheckinCost, reason: "补签到", source: `补签到 ${day}`,
      };
      const { error: e2 } = await supabase.from("coin_ledger").insert(cl);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
  });

  // Undo a 签到; refunds the -20 if it was a 补签到 (deletes its coin_ledger row).
  const unCheckin = useMutation({
    mutationFn: async (day: string) => {
      if (!profileId) throw new Error("Not signed in");
      const { error: e1 } = await supabase
        .from("checkin_days").delete().eq("user_id", profileId).eq("day", day);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("coin_ledger").delete().eq("user_id", profileId).eq("source", `补签到 ${day}`);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
  });

  return {
    balance,
    earnings,
    spends: spends.map((r): CoinSpend => ({
      id: r.id, amount: r.amount, reason: r.reason, source: r.source, date: r.created_at.slice(0, 10),
    })),
    checkinDays: checkinDays.map((c) => c.day),
    signedToday,
    streak,
    canBackfill: balance >= COINS.backfillCheckinCost,
    backfillCost: COINS.backfillCheckinCost,
    isLoading: tasksQ.isLoading || checkinsQ.isLoading || winsQ.isLoading || ledgerQ.isLoading,
    signInToday,
    backfillCheckin,
    unCheckin,
  };
}
