import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import type { Task, TaskType } from "@/data/models";
import type { Tables, TablesInsert } from "@/lib/database.types";

function toTask(row: Tables<"tasks">, profiles: ProfileMaps): Task {
  return {
    id: row.id,
    userId: profiles.byId[row.user_id],
    month: row.year_month,
    title: row.title,
    type: row.type as TaskType,
    target: row.target_value,
    unit: row.unit,
    carriedOver: row.carried_over,
    editCount: row.edit_count,
  };
}

export interface NewTask {
  title: string;
  type: TaskType;
  target: number;
  unit: string;
  carriedOver?: boolean;
}

/**
 * Tasks for a given YYYY-MM (both users — reads are unrestricted by RLS).
 * Mutations always write as the current user; RLS rejects writes to the other user.
 */
export function useTasks(month: string) {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const { data: profiles } = useProfiles();

  const query = useQuery({
    queryKey: ["tasks", month],
    enabled: !!profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("year_month", month)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => toTask(row, profiles!));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tasks", month] });

  const addTask = useMutation({
    mutationFn: async (input: NewTask) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"tasks"> = {
        user_id: profileId,
        year_month: month,
        title: input.title,
        type: input.type,
        target_value: input.target,
        unit: input.unit,
        carried_over: input.carriedOver ?? false,
        edit_count: 0,
      };
      const { error } = await supabase.from("tasks").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateTask = useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from("tasks")
        .update({
          title: task.title,
          type: task.type,
          target_value: task.target,
          unit: task.unit,
          edit_count: task.editCount,
        })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addTask,
    updateTask,
    deleteTask,
  };
}
