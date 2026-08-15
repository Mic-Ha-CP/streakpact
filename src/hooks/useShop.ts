import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCoins } from "@/hooks/useCoins";
import type { Tables, TablesInsert } from "@/lib/database.types";

export type ShopItem = Tables<"shop_items">;
export type Redemption = Tables<"shop_redemptions">;

/**
 * The coin shop (P3, D12). Catalog is read-only (seed-managed); every purchase spends via
 * coin_ledger (reason 'shop') and records a shop_redemptions row. Redemption items also write a
 * reward_ledger PENDING entry (buyer marks it used in the Ledger — reuses the existing status
 * machine); virtual items (title/theme) activate immediately (equipped) and are managed here.
 *
 * Ownership is DERIVED from shop_redemptions; `equipped` marks the one active title + one active
 * theme (single-active-per-kind enforced in the equip mutation — clear same-kind siblings, then
 * set). Item fields are snapshotted onto each redemption, so a purchase records what was paid.
 *
 * Buy = up to 3 non-atomic writes tied by a shared `source` token 'shop:<id>' (2-user trust; same
 * tradeoff as backfillCheckin). Re-buy rules: virtual = own once; redemption repeatable=true (大额)
 * = always; redemption repeatable=false (vouchers) = blocked while one is still unredeemed
 * (pending / in_progress in the Ledger), buyable again once marked used.
 */
export function useShop() {
  const qc = useQueryClient();
  const { profileId } = useAuth();
  const coins = useCoins();
  const enabled = !!profileId;

  const itemsQ = useQuery({
    queryKey: ["shop_items"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_items")
        .select("*")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ShopItem[];
    },
  });

  const mineQ = useQuery({
    queryKey: ["shop_redemptions", profileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_redemptions")
        .select("*")
        .eq("user_id", profileId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Redemption[];
    },
  });

  // My shop-sourced reward-ledger rows, to tell which non-repeatable vouchers are still unredeemed.
  const voucherQ = useQuery({
    queryKey: ["shop_vouchers", profileId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reward_ledger")
        .select("content, status, source")
        .eq("user_id", profileId!)
        .like("source", "shop:%");
      if (error) throw error;
      return (data ?? []) as { content: string; status: string; source: string }[];
    },
  });

  const items = itemsQ.data ?? [];
  const mine = mineQ.data ?? [];
  const vouchers = voucherQ.data ?? [];

  const ownedKeys = new Set(mine.map((r) => r.item_key));
  const outstandingNames = new Set(
    vouchers.filter((v) => v.status === "pending" || v.status === "in_progress").map((v) => v.content),
  );

  const ownedTitles = mine.filter((r) => r.kind === "title");
  const ownedThemes = mine.filter((r) => r.kind === "theme");
  const equippedTitle = ownedTitles.find((r) => r.equipped)?.payload ?? null;
  const equippedTheme = ownedThemes.find((r) => r.equipped)?.payload ?? null;

  /** Whether the signed-in user can currently buy `item` (ignores affordability — see canAfford). */
  const purchasable = (item: ShopItem): boolean => {
    if (item.kind === "title" || item.kind === "theme") return !ownedKeys.has(item.key);
    if (item.repeatable) return true; // 大额: always buyable
    return !outstandingNames.has(item.name); // voucher: only if none outstanding
  };
  const canAfford = (item: ShopItem) => coins.balance >= item.price;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shop_redemptions"] });
    qc.invalidateQueries({ queryKey: ["shop_equipped"] }); // header pill / theme skin
    qc.invalidateQueries({ queryKey: ["shop_vouchers"] });
    qc.invalidateQueries({ queryKey: ["coin_ledger"] }); // balance (earnedCoins + Σ spends)
    qc.invalidateQueries({ queryKey: ["reward_ledger"] }); // pending voucher shows in Ledger
  };

  const buy = useMutation({
    mutationFn: async (item: ShopItem) => {
      if (!profileId) throw new Error("未登录");
      if (!purchasable(item)) throw new Error(item.kind === "redemption" ? "已有未兑现的同款" : "已拥有");
      if (coins.balance < item.price) throw new Error("金币不足");

      const virtual = item.kind === "title" || item.kind === "theme";
      const rid = crypto.randomUUID();
      const source = `shop:${rid}`;

      // 1. spend (balance is derived from coin_ledger, so this is the charge)
      const spend: TablesInsert<"coin_ledger"> = {
        user_id: profileId,
        amount: -item.price,
        reason: "shop",
        source,
      };
      const { error: e1 } = await supabase.from("coin_ledger").insert(spend);
      if (e1) throw e1;

      // 2. virtual activates immediately — clear the currently-equipped one of the same kind first
      if (virtual) {
        const { error: eClear } = await supabase
          .from("shop_redemptions")
          .update({ equipped: false })
          .eq("user_id", profileId)
          .eq("kind", item.kind)
          .eq("equipped", true);
        if (eClear) throw eClear;
      }

      // 3. purchase record (+ virtual ownership/equipped). id == rid ties it to `source`.
      const rec: TablesInsert<"shop_redemptions"> = {
        id: rid,
        user_id: profileId,
        item_id: item.id,
        item_key: item.key,
        item_name: item.name,
        kind: item.kind,
        price: item.price,
        payload: item.payload,
        source,
        equipped: virtual,
      };
      const { error: e2 } = await supabase.from("shop_redemptions").insert(rec);
      if (e2) throw e2;

      // 4. redemption items → a PENDING reward_ledger entry (buyer marks used there)
      if (!virtual) {
        const led: TablesInsert<"reward_ledger"> = {
          user_id: profileId,
          type: "reward",
          content: item.name,
          source,
          status: "pending",
          notes: "商城兑换",
        };
        const { error: e3 } = await supabase.from("reward_ledger").insert(led);
        if (e3) throw e3;
      }
    },
    onSuccess: invalidate,
  });

  // Equip a title/theme (single active per kind): clear same-kind siblings, then set this one.
  const equip = useMutation({
    mutationFn: async (row: Redemption) => {
      if (!profileId) throw new Error("未登录");
      const { error: eClear } = await supabase
        .from("shop_redemptions")
        .update({ equipped: false })
        .eq("user_id", profileId)
        .eq("kind", row.kind)
        .eq("equipped", true);
      if (eClear) throw eClear;
      const { error } = await supabase
        .from("shop_redemptions")
        .update({ equipped: true })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unequip = useMutation({
    mutationFn: async (row: Redemption) => {
      const { error } = await supabase
        .from("shop_redemptions")
        .update({ equipped: false })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    items,
    balance: coins.balance,
    ownedTitles,
    ownedThemes,
    equippedTitle,
    equippedTheme,
    purchasable,
    canAfford,
    buy,
    equip,
    unequip,
    isLoading: itemsQ.isLoading || mineQ.isLoading || voucherQ.isLoading || coins.isLoading,
  };
}

/**
 * Lightweight read-only hook for the equipped title/theme — used by AppShell (header pill) and
 * the theme-skin applier without pulling the whole shop. Returns nulls until loaded.
 */
export function useEquipped() {
  const { profileId } = useAuth();
  const q = useQuery({
    queryKey: ["shop_equipped", profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_redemptions")
        .select("*")
        .eq("user_id", profileId!)
        .eq("equipped", true);
      if (error) throw error;
      return (data ?? []) as Redemption[];
    },
  });
  const rows = q.data ?? [];
  return {
    title: rows.find((r) => r.kind === "title")?.payload ?? null,
    theme: rows.find((r) => r.kind === "theme")?.payload ?? null,
  };
}
