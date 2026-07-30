import { useCoins } from "@/hooks/useCoins";
import { Coins } from "lucide-react";

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
          <div className="font-display font-black text-3xl tabular-nums leading-none">{c.balance}</div>
          <div className="text-[11px] text-muted-foreground">当前余额</div>
        </div>
      </div>

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

        <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-3">
          签到 / 补签到 请到「周历」页。
        </div>
      </div>
    </div>
  );
};
