import { Link } from "react-router-dom";
import { useShop } from "@/hooks/useShop";
import { COINS } from "@/data/coinRules";
import { ArrowLeft, Coins } from "lucide-react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="bg-card rounded-2xl border border-border/60 shadow-card p-5 space-y-3">
    <h2 className="font-display font-extrabold text-lg">{title}</h2>
    {children}
  </section>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between gap-4 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-right tabular-nums">{value}</span>
  </div>
);

const CoinRules = () => {
  const shop = useShop();

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <Link to="/shop" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> 返回商城
        </Link>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight mt-1">金币规则说明</h1>
        <p className="text-sm text-muted-foreground">赚币速率、时长档位、价目表与兑换规则。数值为首期起步值，一期后可调。</p>
      </div>

      <Section title="怎么赚金币">
        <Row label="每日签到" value={`+${COINS.checkinPerDay} / 天（全年可赚）`} />
        <Row label="次数型打卡" value={`+${COINS.countPerCheckin} / 次（每任务每天算一次）`} />
        <Row label="时长型打卡" value="见下方档位（单任务单日封顶 22）" />
        <Row label="挑战通关" value={`+${COINS.challengeSuccess} / 次（双方均达标）`} />
        <Row label="挑战失败" value="不扣金币（但押注惩罚照常执行）" />
        <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
          打卡金币只在<b>挑战进行期间</b>产生；签到金币全年都有。
        </p>
      </Section>

      <Section title="时长打卡档位（每任务·每天）">
        <p className="text-sm text-muted-foreground">
          按当天该任务累计分钟数分段计算，每段每满一个区块 +1 金币（起了一个区块就算）：
        </p>
        <div className="rounded-xl border border-border/60 overflow-hidden text-sm">
          <div className="grid grid-cols-3 bg-muted/40 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <div className="px-3 py-2">分钟段</div>
            <div className="px-3 py-2">速率</div>
            <div className="px-3 py-2 text-right">该段上限</div>
          </div>
          {[
            { band: "0–60 分钟", rate: "每 5 分钟 +1", max: "12" },
            { band: "60–120 分钟", rate: "每 10 分钟 +1", max: "6" },
            { band: "120–180 分钟", rate: "每 15 分钟 +1", max: "4" },
          ].map((t) => (
            <div key={t.band} className="grid grid-cols-3 border-t border-border/60">
              <div className="px-3 py-2">{t.band}</div>
              <div className="px-3 py-2 text-muted-foreground">{t.rate}</div>
              <div className="px-3 py-2 text-right tabular-nums">{t.max}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          单任务单日最多 22 金币。<b>封顶是「单任务·单日」，不是每日总额</b>——两个时长任务当天都打满 =
          各自 22（共 44）。
        </p>
      </Section>

      <Section title="价目表 · 兑换规则">
        <p className="text-sm text-muted-foreground">
          统一商城、两人同价。<b>现实兑换类 = 真实价 ×10</b>；虚拟物按投入定价，无现金锚点。
        </p>
        <div className="space-y-1.5 pt-1">
          {shop.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">
                {item.name}
                {item.repeatable && <span className="text-[10px] text-muted-foreground ml-1">可重复</span>}
              </span>
              <span className="flex items-center gap-1 font-bold tabular-nums shrink-0">
                <Coins className="w-3.5 h-3.5 text-primary" />
                {item.price}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 text-sm border-t border-border/60 pt-1.5">
            <span className="truncate">补签（签到）· 在「周历」页操作</span>
            <span className="flex items-center gap-1 font-bold tabular-nums shrink-0">
              <Coins className="w-3.5 h-3.5 text-primary" />
              {COINS.backfillCheckinCost}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
          现实兑换类购买后在「账本」生成待兑现记录，线下兑现后自行标记已使用。虚拟物（称号 / 主题）即买即用。
          打卡补签免费；签到补签扣 {COINS.backfillCheckinCost} 金币，在「周历」页操作，非商城按钮。
        </p>
      </Section>

      <Section title="余额 · 失败 · 其它约定">
        <ul className="text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
          <li>金币<b>余额跨挑战保留</b>，任何时候都能花。</li>
          <li><b>挑战失败</b>：押注惩罚照常执行 + 已赚金币<b>保留</b> + 没有 500 通关奖。</li>
          <li><b>无有效期、无退款。</b>券自行管理兑现时机。</li>
          <li>金币奖励的是「记录行为」，两人互见 + 信任约束，不做技术防刷。</li>
          <li>数值变更只影响未来（不手动回改历史账目）。</li>
        </ul>
      </Section>
    </div>
  );
};

export default CoinRules;
