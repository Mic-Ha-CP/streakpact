import { useState } from "react";
import { Link } from "react-router-dom";
import { useShop, type ShopItem } from "@/hooks/useShop";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Coins, Gift, BadgeCheck, Palette, Ticket, Info, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Shelf order on the catalog — real-world rewards first, then the virtual items. */
const KIND_ORDER = ["redemption", "title", "theme"] as const;

const KIND_META: Record<string, { label: string; icon: typeof Gift }> = {
  redemption: { label: "现实兑换", icon: Ticket },
  title: { label: "称号", icon: BadgeCheck },
  theme: { label: "主题", icon: Palette },
};

const Shop = () => {
  const shop = useShop();
  const [pending, setPending] = useState<ShopItem | null>(null);

  if (shop.isLoading) {
    return <div className="text-center py-12 text-muted-foreground">加载中…</div>;
  }

  const confirmBuy = () => {
    const item = pending;
    if (!item) return;
    shop.buy.mutate(item, {
      onSuccess: () =>
        toast.success(
          item.kind === "redemption"
            ? `已购买「${item.name}」·扣 ${item.price} 金币 → 待兑现已入账本`
            : `已购买并佩戴「${item.name}」·扣 ${item.price} 金币`,
        ),
      onError: (e) => toast.error(`购买失败：${(e as Error).message}`),
    });
    setPending(null);
  };

  return (
    <div className="space-y-5 max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">金币商城</h1>
          <p className="text-sm text-muted-foreground">用打卡 / 签到攒的金币兑换奖励</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card px-3 py-2 shadow-card">
          <Coins className="w-5 h-5 text-primary" />
          <span
            className={cn(
              "font-display font-black text-xl tabular-nums leading-none",
              shop.balance < 0 && "text-danger",
            )}
          >
            {shop.balance}
          </span>
        </div>
      </div>

      {shop.balance < 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger-soft/60 px-4 py-2.5 text-xs text-danger">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>余额为负：撤销结算收回了已发放的通关奖励，重新结算后自动恢复。此期间无法购买。</span>
        </div>
      )}

      {/* Rules — an explicit link, not a banner */}
      <Link
        to="/coin-rules"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
      >
        <Info className="w-4 h-4" />
        金币规则说明
        <ChevronRight className="w-4 h-4" />
      </Link>

      {/* Catalog — shelved by kind. `shop.items` arrives ordered by sort_order and filter()
          preserves it, so each shelf keeps the catalog's intended order. The per-card kind pill
          is gone: the shelf header now says it. */}
      {KIND_ORDER.map((kind) => {
        const rows = shop.items.filter((i) => i.kind === kind);
        if (rows.length === 0) return null;
        const meta = KIND_META[kind];
        const ShelfIcon = meta.icon;
        return (
          <div key={kind} className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
              <ShelfIcon className="w-3.5 h-3.5" />
              {meta.label}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((item) => {
          const Icon = meta.icon;
          const owned = !shop.purchasable(item);
          const affordable = shop.canAfford(item);
          const ownedLabel = item.kind === "redemption" ? "已有未兑现" : "已拥有";
          return (
            <div
              key={item.id}
              className="bg-card rounded-2xl border border-border/60 shadow-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-display font-extrabold truncate">{item.name}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-1 font-bold tabular-nums">
                  <Coins className="w-4 h-4 text-primary" />
                  {item.price}
                  {item.repeatable && (
                    <span className="text-[10px] text-muted-foreground font-normal ml-1">可重复</span>
                  )}
                </div>
                {owned ? (
                  <span className="pill bg-success-soft text-success">
                    <Check className="w-3 h-3" /> {ownedLabel}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-xl"
                    disabled={!affordable || shop.buy.isPending}
                    onClick={() => setPending(item)}
                  >
                    {affordable ? "购买" : "金币不足"}
                  </Button>
                )}
              </div>
            </div>
          );
              })}
            </div>
          </div>
        );
      })}

      {/* Ongoing equip/switch of owned titles & themes lives on the Account page. */}
      <Link
        to="/account"
        className="flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3 text-sm shadow-card transition-colors hover:bg-muted/40"
      >
        <span className="text-muted-foreground">在「账户」管理我的称号 / 主题（佩戴 · 切换 · 卸下）</span>
        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
      </Link>

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>购买「{pending?.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              将扣除 {pending?.price} 金币（当前 {shop.balance}）。
              {pending?.kind === "redemption"
                ? "购买后在「账本」生成一条待兑现记录，兑现后自行标记已使用。"
                : "购买后立即佩戴生效。"}
              {" 无退款。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBuy}>确认购买</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Shop;
