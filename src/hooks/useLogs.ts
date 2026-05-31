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
  value: number; // 1 for count, minutes for timer
  note?: string | null;
  backfilled?: boolean;
}

/**
 * Daily logs across the month's week span (both users). daily_logs has no UPDATE
 * policy: a count check-in is a row (deleted to undo); timer entries are rows
 * (deleted to remove). Editing a note = delete + re-insert.
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

  const insertLog = useMutation({
    mutationFn: async (input: NewLog) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"daily_logs"> = {
        task_id: input.taskId,
        user_id: profileId,
        log_date: input.date,
        value: input.value,
        notes: input.note ?? null,
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

  /** Count tasks: insert a value=1 row if none exists for the day, else delete it. */
  const toggleCount = useMutation({
    mutationFn: async (input: { taskId: string; date: string; backfilled?: boolean }) => {
      if (!profileId) throw new Error("Not signed in");
      const { data: existing, error: selErr } = await supabase
        .from("daily_logs")
        .select("id")
        .eq("task_id", input.taskId)
        .eq("log_date", input.date);
      if (selErr) throw selErr;

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from("daily_logs")
          .delete()
          .eq("task_id", input.taskId)
          .eq("log_date", input.date);
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
   * Set/replace the note on an existing log row. daily_logs has no UPDATE policy,
   * so this deletes the row and re-inserts it with the same value + the new note.
   */
  const setNote = useMutation({
    mutationFn: async ({ log, note }: { log: DailyLog; note: string }) => {
      if (!profileId) throw new Error("Not signed in");
      const { error: delErr } = await supabase.from("daily_logs").delete().eq("id", log.id);
      if (delErr) throw delErr;
      const row: TablesInsert<"daily_logs"> = {
        task_id: log.taskId,
        user_id: profileId,
        log_date: log.date,
        value: log.value,
        notes: note.trim() === "" ? null : note,
        backfilled: log.backfilled,
      };
      const { error } = await supabase.from("daily_logs").insert(row);
      if (error) throw error;
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
