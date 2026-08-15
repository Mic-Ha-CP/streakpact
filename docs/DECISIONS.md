# Decisions log

All decisions below are LOCKED. Do not change without explicit user approval.

## Task system
- Each user sets 1-3 tasks per month
- Task types: "count" (daily checkbox) | "timer" (log minutes, weekly total)
- Count: weekly target = number of days (e.g. early rise >= 6 days)
- Timer: weekly target = total minutes (e.g. coding >= 120 min)
- No daily targets, only weekly totals
- New-month setup defaults to the previous month's tasks, pre-filled as editable
  drafts (title/type/target/unit); user can modify, remove, or add. If the previous
  month had no tasks, start blank. Tasks saved unchanged are marked carried_over.
- One edit allowed per month after initial setup (editCount tracks this)
- Task deletion is always allowed, even after the edit lock. The edit lock only
  limits modifying task *properties*; deleting a task (and accepting the loss of its
  logged data) is always the user's choice.
  - **Safety (added 2026-06-03):** deleting requires a confirmation dialog that states
    how many check-in records will be cascade-deleted (`daily_logs` FK is
    `on delete cascade`). Prevents a misclick from silently wiping a month of logs while
    keeping deletion freely available.
- ±5% tolerance: DEFERRED (not in MVP)

## Weekly settlement
- ALL tasks must pass for week to succeed
- Count pass: days_completed >= target
- Timer pass: total_minutes >= target
- Individual: each user judged independently
- Week starts Monday, ends Sunday

## Monthly settlement — THREE states
- 成功 (success): >= 3 weeks passed → triggers monthly reward
- 失败 (failure): <= 1 week passed → triggers monthly penalty
- 无事发生 (neutral): 2 weeks passed → nothing happens

## Settlement execution (added 2026-06-03)
- **Trigger: one-click "结算" button** on the 本月战况 page — not fully automatic, not a
  confirm dialog. Has a ritual feel, is controllable, and never writes silently on page load.
- A week is settleable only after it ends (Sunday passed); a month only after all its weeks end.
- Each user settles **their own** side (RLS allows writing only own rows). Weekly results are
  individual; the monthly result is the **team-combined** value (see below) but each user writes
  their own monthly snapshot + a ledger entry from their own monthly plan.
- **Monthly team rule (three states):** combine each member's individual month result —
  - team **success** ⟺ BOTH succeed → shared monthly reward
  - team **failure** ⟺ EITHER fails → shared monthly penalty (a partner's failure drags both down)
  - team **neutral** otherwise → nothing
  (implemented as `combineTeamMonth` in calc.ts; null if a member has no tasks = not settleable.)
- On settle: if a matching reward/penalty plan exists, a `reward_ledger` entry is created
  (success→reward, fail→penalty); if no plan text is set, the settlement is still recorded but
  no ledger entry is made.
- **Idempotent:** the settlement-snapshot row is the guard (a settled week/month leaves the
  pending list); the ledger insert also checks (user_id, source) first, so re-settling never
  duplicates. Optional DB hardening: `unique (user_id, source)` on reward_ledger.
- **Snapshot, not live:** once settled, the result is locked. Backfilling (补签) a past date in
  an already-settled week/month does NOT retroactively change the snapshot or ledger (MVP choice).
- **Un-settle (fault tolerance, added 2026-06-03):** a settled week/month can be undone via
  "撤销结算" — deletes the settlement snapshot AND the ledger entry it generated, returning the
  period to 待结算 so it can be re-settled (e.g. after a backfill or a wrong reward plan). This
  is the escape hatch for settlement mistakes. Requires DELETE RLS policies (migrations/003).
  - **Placement:** the undo lives on the **打卡 (CheckIn)** page (for the viewed month), NOT on the
    本月战况 dashboard — keeping a destructive action deliberate and off the glance-at overview.
    Settling (constructive) stays on the dashboard. Always behind a confirmation dialog.

## Rewards & penalties
- Set per month: weekly (individual) + monthly (team) plans
- Weekly: each person has own reward/penalty, judged individually
- Monthly: team-based (both users' results matter for shared consequence)
- After settlement, earned items written to Reward Ledger
- Ledger statuses: pending | in_progress | used | completed | forfeited
- 补签券 (make-up ticket): tracked as text in ledger only, no automation in MVP

## Daily logging
- Past dates: freely allowed, no restrictions on backdating
- Count tasks: tap to mark done, tap again to undo
- Timer tasks: enter minutes → Confirm/Cancel buttons → appended to per-entry log list → each entry is deletable (no editing — delete and re-enter)
- Multiple timer entries per task per day allowed (e.g. 30min morning + 60min evening)
- Notes are independent of check-in status: a user can write a note on any day,
  whether or not they checked in (failed/empty days may also need a memo).
  - Stored as a dedicated daily_logs row with value=0 (one per task+date), separate
    from the check-in row (value=1) and timer-entry rows (value=minutes).
  - Un-checking a count task must NOT delete the note — the note row is independent
    and is left untouched. Clearing the note text deletes the note row.

## Calendar
- Week starts Monday
- Week label format: "YYYY-M月 W1" (e.g. "2026-6月 W1")
- W1 starts on first Monday on or after the 1st of month
- A week belongs to the month that contains its **Monday**. The app's "current month" is the
  month that owns *today's* week (`monthOfWeek` in dates.ts), which on the first days of a
  calendar month (before its first Monday) is the **previous** calendar month — e.g. 2026-07-01..05
  are still June W5. `Setup` is the deliberate exception: task setup keys on the plain calendar
  month, since the one-edit lock and future-month cap are per calendar month.

## Auth
- Supabase Auth with email/password
- 2 fixed accounts created manually in Supabase dashboard
- No registration flow, no invite system
- Session persistence: stay logged in across browser sessions
  (Supabase client `persistSession: true` + `autoRefreshToken: true`)

## Deployment
- Vercel (frontend) + Supabase (auth + DB)
- PWA via vite-plugin-pwa
- Cost: $0

## Public repo considerations
- No real personal data in committed code
- Seed data in code uses generic placeholders only
- Real data lives exclusively in Supabase

## D12 · P3 商城定版 (2026-08-14 grilling 定稿)
P3 shop pricing + the timer-earning rework, finalized in a design-grilling session over the
first challenge's real coin data. Supersedes the D5 *starter* numbers for the timer formula and
adds the商城 v1 catalog + exchange rule. Everything below is LOCKED.

### 定价表 v1
Exchange rule: **现实兑换类 = 真实价 × 10**（虚拟物按投入定价，无 $ 锚点）。统一目录、两人同价 (D3)。

| 商品 | 价格 | 类型 | 备注 |
|---|---|---|---|
| 补签(签到) | 20 | — | 只修签到记录，对挑战结果零影响。**仍走周历补签流程**（非商城按钮）— 商城/规则页只列出说明 |
| 称号 ×2–3 | 50–80 | 虚拟 | 即买即生效（equip） |
| 奶茶券 | 120 | 现实兑换 | 单款大杯，$12×10 |
| Theme ×1 | 300 | 虚拟 | 未来高设计款可上浮 ~500 |
| 外卖券 | 400 | 现实兑换 | ≈ $40 |
| 大额消费额度 | 1200 | 现实兑换 | = $120；**可重复购买**，线下合并兑现 |

### 时长打卡金币公式（取代 D5 的 2c/10min + 60min 封顶）
每日累计 M 分钟，**表驱动三段、每段 ceil（起了一个 block 就算满）**，**单任务单日封顶 22 金币**：
- **0–60 min**：每 5 min = 1 金币（该段上限 12）
- **60–120 min**：每 10 min = 1 金币（该段上限 6）
- **120–180 min**：每 15 min = 1 金币（该段上限 4）
- 边界锚点（已验证并锁定为单元测试）：M=1→1, 4→1, 5→1, 6→2, 59→12, 60→12, 61→13, 119→18,
  120→18, 121→19, 179→22, 180→22, 240→22。

> **封顶是「单任务·单日」，不是每日总额。** 两个时长任务当天都打满 = 各自 22 金币（共 44）——
> 这是真实投入，两个任务**不共享一个池子**。勿把 22c 误读为一天的上限。（tunables 全在
> `src/data/coinRules.ts`；纯函数在 `src/data/coins.ts`。）

### 生命周期规则
- **签到全年可赚**；次数/时长**打卡仅在挑战进行中可赚**（打卡金币只来自挑战任务，结构上天然受限于
  挑战存在期）。
- **余额跨挑战保留**，任何时候可花。
- **挑战失败** = 押注惩罚执行 + **保留已赚余额** + **无 500 通关奖**。
- **无追溯调整**：数值变更只影响未来。
  - ⚠ **已知取舍（accepted）**：金币是**派生模型**（`earnedCoins` 实时重算历史日志），所以改公式后
    旧日志会按**新公式**重算——严格说与"只影响未来"相悖。D12 的"无追溯"是**意图层面**的约定
    （不手动回改账目），派生模型重算旧日志是**明知并接受**的取舍（换来 undo/补签/撤销结算自动
    自洽）。首期数值本就预期一期后调，可接受。

### 购买流程
买 → 扣币（`coin_ledger` 负数、reason `'shop'`）→ 现实兑换类生成 `reward_ledger` 待用条目
（pending，买家自行标记 used，复用现有账本状态机）；虚拟物（称号/theme）**即时生效**（持有 +
equipped 状态）。三次写入**非原子**（无跨调用事务），以共享 `source` token (`shop:<id>`) 串联，
供人工对账——2 人信任模型下沿用 `backfillCheckin` 同款取舍。**无有效期、无退款**：仅作规则页文字，
**不在代码里强制**。

### 明确排除/延后（记录以免再议）
- 头像收藏系统 → 仅当虚拟物真的产生购买后再考虑。
- Deposit 审计日志（trigger + append-only）→ 出现第一次真实纠错需求时再做。
- 工具类道具（如自动补签卡）→ **永久排除**。
- 审批流 UI → 砍掉（买家自主，无需对方批准）。

### 虚拟物持有 schema（选型记录）
持有 = 从 `shop_redemptions` **派生**（有该 item 的 redemption 行即拥有），`equipped` 布尔标记当前
生效的称号/theme（各类型仅一个 active，由 equip mutation 客户端保证：先清同类再置位——与全 app 的
"客户端约束 + RLS 只管归属"一致，**不加**partial unique index）。redemption 行**快照** item 的
key/name/kind/price/payload，使"数值变更只影响未来"字面成立（历史购买记录当时所付，不随目录改价）。
