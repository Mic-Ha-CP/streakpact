-- StreakPact — local dev seed (runs on `supabase db reset`, LOCAL ONLY).
-- Never used against prod. Creates two test users + a tiny legacy fixture.
--
-- Users:  cp@test.local / jx@test.local   password: test1234   (security irrelevant — local)
-- The on_auth_user_created trigger (001) auto-creates the public.profiles rows from
-- raw_user_meta_data.display_name, so CP / JX profiles appear automatically.

-- --- local-only table grants ------------------------------------------------
-- The CLI applies migrations as `postgres`, whose default privileges in the LOCAL
-- stack don't grant CRUD to anon/authenticated. Hosted Supabase grants these via the
-- platform (prod's base tables already work), so this is a LOCAL-ONLY fix — it lets the
-- app read/write under RLS on local. RLS still enforces per-row access on top of these.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- --- auth users -------------------------------------------------------------
-- NOTE: confirmation_token / recovery_token / email_change_token_new / email_change
-- have NO default and MUST be '' (not NULL) — GoTrue scans them into Go strings and a
-- NULL yields "Database error querying schema" on login.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
   'cp@test.local', extensions.crypt('test1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"CP"}', now(), now(),
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated',
   'jx@test.local', extensions.crypt('test1234', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"display_name":"JX"}', now(), now(),
   '', '', '', '');

-- --- auth identities (required for email/password sign-in) ------------------
insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
  ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"cp@test.local"}', 'email', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"jx@test.local"}', 'email', now(), now(), now());

-- --- tiny legacy fixture (2026-06 = the last real old-model month) ----------
-- Gives the "历史月度" disclosure (months <= 2026-06) something to show.
insert into public.tasks (id, user_id, year_month, title, type, target_value, unit) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-06', '早起', 'count', 6, 'times'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '2026-06', '阅读', 'timer', 120, 'minutes');

insert into public.daily_logs (task_id, user_id, log_date, value) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-06-01', 1),
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-06-02', 1),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', '2026-06-03', 45);

-- --- challenge fixture (dates relative to reset time) -----------------------
-- ONE ended, unsettled challenge (both sides pass → team success on settle) → it is the
-- current view on reset, immediately settle-testable. Recent 签到 rows give the streak /
-- coins / calendar data. ALL text below is GENERIC placeholder, not real agreements.
do $$
declare
  cp uuid := '11111111-1111-1111-1111-111111111111';
  jx uuid := '22222222-2222-2222-2222-222222222222';
  b_start date := date_trunc('week', now()::date - interval '6 weeks')::date; -- Monday ~6wk ago (ended)
  b_id  uuid := gen_random_uuid();
  b_cp1 uuid := gen_random_uuid();
  b_jx1 uuid := gen_random_uuid();
  d date;
  i int;
begin
  insert into public.challenges (id, start_date, weeks, initiator, mode, team_reward, status)
    values (b_id, b_start, 4, cp, 'duo', '示例：一起吃顿好的', 'active');
  insert into public.challenge_members (challenge_id, user_id, deposit_stake, deposit_execution) values
    (b_id, cp, '示例：100 元', '示例：转给指定对象'),
    (b_id, jx, '示例：一周家务', '示例：负责一周家务');
  insert into public.tasks (id, user_id, challenge_id, title, type, target_value, unit) values
    (b_cp1, cp, b_id, '早起', 'count', 18, 'times'),
    (b_jx1, jx, b_id, '跑步', 'count', 15, 'times');
  -- both pass their totals across the 4 weeks
  for d in select g::date from generate_series(b_start::timestamp, (b_start + 27)::timestamp, interval '1 day') g loop
    i := d - b_start;
    if mod(i, 7) <> 6 then insert into public.daily_logs (task_id, user_id, log_date, value) values (b_cp1, cp, d, 1); end if; -- ~24 ≥ 18
    if mod(i, 7) < 4  then insert into public.daily_logs (task_id, user_id, log_date, value) values (b_jx1, jx, d, 1); end if; -- ~16 ≥ 15
  end loop;
  -- recent 签到 up to today (CP daily → streak ~16; JX most days)
  for d in select g::date from generate_series((now()::date - 15)::timestamp, now()::date::timestamp, interval '1 day') g loop
    insert into public.checkin_days (user_id, day) values (cp, d) on conflict do nothing;
    if mod((now()::date - d), 4) <> 0 then
      insert into public.checkin_days (user_id, day) values (jx, d) on conflict do nothing;
    end if;
  end loop;
end $$;
