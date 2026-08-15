import { Link } from "react-router-dom";
import { useCoins } from "@/hooks/useCoins";
import { Button } from "@/components/ui/button";
import { Coins, Check, Flame } from "lucide-react";
import { COINS } from "@/data/coinRules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Compact dashboard strip: coin balance (→ Ledger for detail) + 连续签到 + today's 签到. */
export const CoinCheckinStrip = () => {
  const c = useCoins();
  if (c.isLoading) return null;
  return (
    <div className="bg-card rounded-2xl border border-border/60 shadow-card p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          to="/ledger"
          className="flex items-center gap-2 hover:opacity-80"
          title={c.balance < 0 ? "余额为负：撤销结算收回了通关奖励，重新结算后恢复" : undefined}
        >
          <Coins className="w-5 h-5 text-primary" />
          <span
            className={cn(
              "font-display font-extrabold text-lg tabular-nums",
              c.balance < 0 && "text-danger",
            )}
          >
            {c.balance}
          </span>
          <span className="text-xs text-muted-foreground">金币</span>
        </Link>
        {c.streak > 0 && (
          <span className="pill bg-secondary-soft text-secondary-foreground" title="连续签到">
            <Flame className="w-3 h-3" /> {c.streak} 天
          </span>
        )}
      </div>
      {c.signedToday ? (
        <span className="pill bg-success-soft text-success">
          <Check className="w-3 h-3" /> 今日已签到
        </span>
      ) : (
        <Button
          size="sm"
          className="rounded-xl"
          disabled={c.signInToday.isPending}
          onClick={() =>
            c.signInToday.mutate(undefined, {
              onSuccess: () => toast.success(`签到成功 +${COINS.checkinPerDay} 🎉`),
              onError: (e) => toast.error(`签到失败：${(e as Error).message}`),
            })
          }
        >
          今日签到 +{COINS.checkinPerDay}
        </Button>
      )}
    </div>
  );
};
