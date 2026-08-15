-- StreakPact — incremental migration 006
-- Periods & Gamify P3: coin shop. See docs/DECISIONS.md (D12) + design/PERIODS_AND_GAMIFY.md (D3).
--
-- Adds `shop_items` (catalog) + `shop_redemptions` (every purchase + virtual-item ownership).
-- Spends still flow through `coin_ledger` (reason 'shop', already allowed by 005); real-redemption
-- items additionally write a `reward_ledger` pending row (reused status machine). Nothing here
-- changes coin_ledger / reward_ledger.
--
-- Run ONCE in the Supabase SQL Editor on the existing live DB (also folded into migration.sql).
-- Additive only — existing data untouched. No begin/commit (the runner wraps each file).
--
-- NOTE: the v1 CATALOG rows are seeded in supabase/seed.sql (LOCAL ONLY). On prod, seed the
-- catalog by hand after applying this file (see docs/NOTES.md) — this migration creates the
-- empty tables only.

-- =====================================================================
-- shop_items — the catalog. Unified catalog + unified price for both users (D3).
-- `kind` drives the buy flow: 'redemption' → writes a reward_ledger pending entry;
-- 'title' / 'theme' → virtual, activates on purchase (ownership + equipped in shop_redemptions).
-- `payload`: title → the title text; theme → a skin id; redemption → null.
-- `repeatable`: 大额 = true (buy many); vouchers / titles / themes = false.
-- `active`: catalog visibility toggle — retire an item without deleting purchase history.
-- =====================================================================
create table public.shop_items (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  description text,
  kind        text not null,
  price       integer not null,
  payload     text,
  repeatable  boolean not null default false,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint shop_items_kind_chk  check (kind in ('redemption', 'title', 'theme')),
  constraint shop_items_price_chk check (price > 0)
);

-- =====================================================================
-- shop_redemptions — one row per purchase. Also the virtual-item OWNERSHIP record:
-- you own a title/theme iff you have a row for it; `equipped` marks the one active title
-- and the one active theme (single-active-per-kind enforced in the equip mutation — client
-- side, matching the app's trust model; no partial unique index). Item fields are SNAPSHOT
-- onto the row (item_key / item_name / kind / price / payload) so a past purchase records what
-- was paid then — D12 "value changes affect future only" holds even if the catalog reprices.
-- `source` = the shared token ('shop:<id>') tying this to its coin_ledger spend (+ reward_ledger
-- entry for redemption items). `item_id` is a soft ref (set null on catalog delete; snapshots
-- remain the source of truth).
-- =====================================================================
create table public.shop_redemptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  item_id    uuid references public.shop_items (id) on delete set null,
  item_key   text not null,
  item_name  text not null,
  kind       text not null,
  price      integer not null,
  payload    text,
  source     text not null,
  equipped   boolean not null default false,
  created_at timestamptz not null default now(),
  constraint shop_redemptions_kind_chk check (kind in ('redemption', 'title', 'theme'))
);

-- =====================================================================
-- RLS — catalog is read-all, seed-managed (no user writes). Redemptions: read-all (both users
-- see everything, as everywhere else), write-own, update-own (equip toggle), delete-own
-- (fault-tolerance escape hatch — mirrors 撤销 patterns; refunds are a rules-page convention,
-- not code-enforced).
-- =====================================================================
alter table public.shop_items enable row level security;
create policy shop_items_select on public.shop_items
  for select to authenticated using (true);

alter table public.shop_redemptions enable row level security;
create policy shop_redemptions_select on public.shop_redemptions
  for select to authenticated using (true);
create policy shop_redemptions_insert_own on public.shop_redemptions
  for insert to authenticated with check (auth.uid() = user_id);
create policy shop_redemptions_update_own on public.shop_redemptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy shop_redemptions_delete_own on public.shop_redemptions
  for delete to authenticated using (auth.uid() = user_id);

-- =====================================================================
-- Indexes
-- =====================================================================
create index idx_shop_items_active      on public.shop_items (active, sort_order);
create index idx_shop_redemptions_user  on public.shop_redemptions (user_id, kind);
