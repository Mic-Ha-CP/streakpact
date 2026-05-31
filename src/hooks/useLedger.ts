import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles, type ProfileMaps } from "@/hooks/useProfiles";
import type { LedgerEntry, RewardStatus, RewardType } from "@/data/models";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

function toEntry(row: Tables<"reward_ledger">, profiles: ProfileMaps): LedgerEntry {
  return {
    id: row.id,
    userId: profiles.byId[row.user_id],
    type: row.type as RewardType,
    content: row.content,
    source: row.source,
    status: row.status as RewardStatus,
    usedProgress: row.used_progress,
    expiryDate: row.expiry_date,
    notes: row.notes,
  };
}

export interface NewLedgerEntry {
  type: RewardType;
  content: string;
  source: string;
  status?: RewardStatus;
  expiryDate?: string | null;
  usedProgress?: string | null;
  notes?: string | null;
}

export type LedgerPatch = Partial<{
  status: RewardStatus;
  usedProgress: string | null;
  expiryDate: string | null;
  notes: string | null;
}>;

/** Reward/penalty ledger (both users). reward_ledger allows UPDATE on own rows. */
export function useLedger() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const { data: profiles } = useProfiles();

  const query = useQuery({
    queryKey: ["reward_ledger"],
    enabled: !!profiles,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_ledger")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => toEntry(row, profiles!));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["reward_ledger"] });

  const addEntry = useMutation({
    mutationFn: async (input: NewLedgerEntry) => {
      if (!profileId) throw new Error("Not signed in");
      const row: TablesInsert<"reward_ledger"> = {
        user_id: profileId,
        type: input.type,
        content: input.content,
        source: input.source,
        status: input.status ?? "pending",
        expiry_date: input.expiryDate ?? null,
        used_progress: input.usedProgress ?? null,
        notes: input.notes ?? null,
      };
      const { error } = await supabase.from("reward_ledger").insert(row);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: LedgerPatch }) => {
      const dbPatch: TablesUpdate<"reward_ledger"> = {};
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.usedProgress !== undefined) dbPatch.used_progress = patch.usedProgress;
      if (patch.expiryDate !== undefined) dbPatch.expiry_date = patch.expiryDate;
      if (patch.notes !== undefined) dbPatch.notes = patch.notes;
      const { error } = await supabase.from("reward_ledger").update(dbPatch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    entries: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addEntry,
    updateEntry,
  };
}
