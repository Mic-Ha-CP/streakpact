import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import { getWeeksInMonth } from "@/data/calc";
import type { DailyLog } from "@/data/models";
import type { Tables, TablesInsert } from "@/lib/database.types";

function toLog(row: Tables<"daily_logs">, profiles: ProfileMaps): DailyLog {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: profiles.byId[row.user_id],
    date: row.log_date,
    value: Number(row.value),
    note: row.notes,
    backfilled: row.backfilled,
    createdAt: row.created_at,
  };
}

/** Date span covering every week of the month (the last week can spill over). */
function monthSpan(month: string): { start: string; end: string } {
  const weeks = getWeeksInMonth(month);
  if (weeks.length === 0) return { start: `${month}-01`, end: `${month}-31` };
  return { start: weeks[0].startDate, end: weeks[weeks.length - 1].endDate };
}

export interface NewLog {
  taskId: string;
  date: string;
  value: number; // minutes for a timer entry
  backfilled?: boolean;
}

/**
 * Daily logs across the month's week span (both users). daily_logs has no UPDATE
 * policy, so every change is an insert or delete. A given (task, date) can hold:
 *   - one check-in row (count only), value = 1
 *   - timer entry rows, value = minutes
 *   - one note row, value = 0  (independent of check-in; see DECISIONS.md)
 */
export function useLogs(month: string) {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const { data: profiles } = useProfiles();

  const query = useQuery({
    queryKey: ["logs", month],
    enabled: !!profiles,
    queryFn: async () => {
      const { start, end } = monthSpan(month);
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .gte("log_date", start)
        .lte("log_date", end)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => toLog(row, profiles!));
    },
  });

  // Backfilled logs can land outside this month's span, so invalidate all log queries.
  const invalidate = () => qc.invalidateQueries({ queryKey: ["logs"] });

  /** Add a timer entry (value = minutes). */
  const insertLog = useMutation({
    mutationFn: async (input: NewLog) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"daily_logs"> = {
        task_id: input.taskId,
        user_id: profileId,
        log_date: input.date,
        value: input.value,
        backfilled: input.backfilled ?? false,
      };
      const { error } = await supabase.from("daily_logs").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteLog = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Count check-in toggle. Operates only on the value>0 row, leaving any note row
   * (value=0) untouched: insert value=1 if not checked, delete it if checked.
   */
  const toggleCount = useMutation({
    mutationFn: async (input: { taskId: string; date: string; backfilled?: boolean }) => {
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
        backfilled: input.backfilled ?? false,
      };
      const { error } = await supabase.from("daily_logs").insert(row);
      if (error) throw error;
      return { done: true };
    },
    onSuccess: invalidate,
  });

  /**
   * Set/replace the per-day note (the value=0 row), independent of check-in status.
   * Replaces the existing note row (delete + re-insert, since there's no UPDATE);
   * an empty note deletes the row.
   */
  const setNote = useMutation({
    mutationFn: async (input: {
      taskId: string;
      date: string;
      note: string;
      backfilled?: boolean;
    }) => {
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
          backfilled: input.backfilled ?? false,
        };
        const { error } = await supabase.from("daily_logs").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    insertLog,
    deleteLog,
    toggleCount,
    setNote,
  };
}
