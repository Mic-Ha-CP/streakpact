import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserId } from "@/data/models";

export interface ProfileMaps {
  /** uuid -> display name ("CP" | "JX") */
  byId: Record<string, UserId>;
  /** display name -> uuid */
  byName: Partial<Record<UserId, string>>;
}

/**
 * The two fixed profiles. RLS lets any authenticated user read all rows, so this
 * provides the uuid <-> display-name translation the other hooks need. Profiles
 * never change at runtime, so it's cached indefinitely.
 */
export function useProfiles() {
  return useQuery<ProfileMaps>({
    queryKey: ["profiles"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name");
      if (error) throw error;

      const byId: Record<string, UserId> = {};
      const byName: Partial<Record<UserId, string>> = {};
      for (const p of data ?? []) {
        const name = p.display_name as UserId;
        byId[p.id] = name;
        byName[name] = p.id;
      }
      return { byId, byName };
    },
  });
}
