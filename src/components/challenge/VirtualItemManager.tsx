import { useShop } from "@/hooks/useShop";
import type { Redemption } from "@/hooks/useShop";
import { cn } from "@/lib/utils";

const Group = ({
  title,
  empty,
  rows,
  onEquip,
  onUnequip,
  busy,
}: {
  title: string;
  empty: string;
  rows: Redemption[];
  onEquip: (r: Redemption) => void;
  onUnequip: (r: Redemption) => void;
  busy: boolean;
}) => (
  <div className="space-y-2">
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{title}</div>
    {rows.length === 0 ? (
      <div className="text-sm text-muted-foreground">{empty}</div>
    ) : (
      <div className="flex flex-wrap gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
              r.equipped ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
            )}
          >
            <span className="font-medium">{r.payload ?? r.item_name}</span>
            {r.equipped ? (
              <button
                className="text-[11px] underline text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={busy}
                onClick={() => onUnequip(r)}
              >
                卸下
              </button>
            ) : (
              <button
                className="text-[11px] underline hover:opacity-80 disabled:opacity-50"
                disabled={busy}
                onClick={() => onEquip(r)}
              >
                佩戴
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

/**
 * Ongoing management of owned virtual items (titles / themes) — equip / switch / unequip.
 * Lives on the Account page; the Shop only buys + equips-on-purchase. One equipped title + one
 * equipped theme at a time (enforced in useShop.equip).
 */
export const VirtualItemManager = () => {
  const shop = useShop();
  const busy = shop.equip.isPending || shop.unequip.isPending;
  if (shop.isLoading) return null;

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card p-5 space-y-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
        我的虚拟物
      </div>
      <Group
        title="称号"
        empty="还没有称号，去商城购买"
        rows={shop.ownedTitles}
        onEquip={(r) => shop.equip.mutate(r)}
        onUnequip={(r) => shop.unequip.mutate(r)}
        busy={busy}
      />
      <Group
        title="主题"
        empty="还没有主题，去商城购买"
        rows={shop.ownedThemes}
        onEquip={(r) => shop.equip.mutate(r)}
        onUnequip={(r) => shop.unequip.mutate(r)}
        busy={busy}
      />
    </div>
  );
};
