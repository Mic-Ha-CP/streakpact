import { Link } from "react-router-dom";
import { useCoins } from "@/hooks/useCoins";
import { Coins, ShoppingBag, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const EarnRow = ({ label, value }: { label: string; value: number }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="tabular-nums font-medium text-success">+{value}</span>
  </div>
);

/**
 * The coin wallet — its OWN section, never interleaved with reward-ledger rows. Display
 * only: balance on top, earnings grouped by source (签到 / 打卡 / 通关), spends listed
 * separately. 签到 / 补签 happen on the 周历 (Calendar) page — the single entry point.
 */
export const CoinSection = () => {
  const c = useCoins();
  if (c.isLoading) return null;
  const e = c.earnings;

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden">
      <div className="p-5 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <span className="font-display font-extrabold text-lg">金币</span>
        </div>
        <div className="text-right">
          <div
            className={cn(
              "font-display font-black text-3xl tabular-nums leading-none",
              c.balance < 0 && "text-danger",
            )}
          >
            {c.balance}
          </div>
          <div className="text-[11px] text-muted-foreground">当前余额</div>
        </div>
      </div>

      {c.balance < 0 && (
        <div className="px-5 pt-4 -mb-1 flex items-start gap-2 text-xs text-danger">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>余额为负：撤销结算收回了已发放的通关奖励，重新结算后自动恢复。</span>
        </div>
      )}

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
            获得（累计）
          </div>
          <EarnRow label="签到" value={e.checkin} />
          <EarnRow label="打卡" value={e.tasks} />
          <EarnRow label="通关" value={e.wins} />
          <div className="border-t border-border/60 pt-2 flex justify-between text-sm font-bold">
            <span>合计获得</span>
            <span className="tabular-nums text-success">+{e.total}</span>
          </div>
        </div>

        {c.adjustments.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">调整</div>
            {c.adjustments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between text-sm bg-muted/30 rounded-xl px-3 py-2"
              >
                <span className="truncate pr-2">{a.source || a.reason}</span>
                <span className="tabular-nums font-bold text-success">+{a.amount}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">花费</div>
          {c.spends.length === 0 && <div className="text-sm text-muted-foreground">暂无花费</div>}
          {c.spends.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between text-sm bg-muted/30 rounded-xl px-3 py-2"
            >
              <span className="truncate pr-2">{s.source || s.reason}</span>
              <span className="tabular-nums font-bold text-danger">{s.amount}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t border-border/60 pt-3">
          <Link
            to="/shop"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-primary text-sm font-bold py-2 transition-opacity hover:opacity-90"
          >
            <ShoppingBag className="w-4 h-4" /> 去商城
          </Link>
          <Link
            to="/coin-rules"
            className="flex items-center gap-1 rounded-xl border border-border/60 text-muted-foreground text-xs px-3 py-2 transition-colors hover:text-foreground"
          >
            <Info className="w-3.5 h-3.5" /> 规则
          </Link>
        </div>
        <div className="text-[11px] text-muted-foreground">签到 / 补签到 请到「周历」页。</div>
      </div>
    </div>
  );
};
