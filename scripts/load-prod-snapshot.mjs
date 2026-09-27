/**
 * Load a PROD snapshot into the LOCAL Supabase stack, so bugs and features can be
 * reproduced on real data.  READ-ONLY with respect to prod: this script never opens a
 * connection to prod at all — it only consumes a dump file produced by
 * `npm run db:snapshot` (see docs/NOTES.md "Backups").
 *
 *   node scripts/load-prod-snapshot.mjs [path-to-dump.sql]
 *
 * With no argument it picks the newest dump in the backups directory.
 *
 * ── Auth strategy (the one real decision here) ──────────────────────────────────
 * Prod's `public.profiles.id` IS `auth.users.id`, and the dump covers `public` only, so
 * the real profile UUIDs arrive with no accounts to hang off.  Two ways out:
 *
 *   (a) remap the prod UUIDs to the local seed's 1111…/2222… ids, or
 *   (b) keep the prod UUIDs and mint LOCAL logins that carry those same ids.
 *
 * This script does (b).  Remapping would mean rewriting the user id on every table that
 * references profiles (tasks, daily_logs, challenge_members, challenges.initiator,
 * reward_ledger, coin_ledger, checkin_days, shop_redemptions, settlements …) — one missed
 * FK and the copy is subtly wrong in a way that looks fine.  Keeping the ids means a row
 * id you read in prod is the same id you read locally, which is the whole point of having
 * a copy.  The cost is one synthetic auth row per profile, created here.
 *
 * Local logins are always <display_name>@test.local / test1234 regardless of the real
 * prod addresses, so no real email ever lands in the local stack.
 */
import { execFileSync } from "child_process";
import { readFileSync, readdirSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const BACKUP_DIR =
  process.env.STREAKPACT_BACKUPS ||
  "C:/Users/Admin/Documents/Self_Learning/streakpact-backups";
const LOCAL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
const PASSWORD = "test1234";

const die = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

// ── locate the dump ─────────────────────────────────────────────────────────────
let snap = process.argv[2];
if (!snap) {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("streakpact-prod-public-") && f.endsWith(".sql"))
    .sort()
    .reverse();
  if (files.length === 0) die(`No dump found in ${BACKUP_DIR}. Run: npm run db:snapshot`);
  snap = join(BACKUP_DIR, files[0]);
}
// The dump creates the schema itself; we also drop/recreate it below, so make its
// CREATE SCHEMA idempotent rather than depending on which of the two runs first.
const sql = readFileSync(snap, "utf8").replace(
  /^CREATE SCHEMA public;$/m,
  "CREATE SCHEMA IF NOT EXISTS public;",
);
console.log(`snapshot : ${snap}`);
console.log(`size     : ${(sql.length / 1024).toFixed(0)} KB`);

// Guard: the backups directory lives OUTSIDE the repo on purpose (real data).
if (snap.replace(/\\/g, "/").includes("/repo/streakpact/"))
  die("That dump is inside the repo. Real data must live outside it — move it and retry.");

// ── the local container ─────────────────────────────────────────────────────────
const containers = execFileSync("docker", ["ps", "--format", "{{.Names}}"], {
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter((n) => n.startsWith("supabase_db"));
if (containers.length === 0) die("Local Supabase is not running. Run: npx supabase start");
const DB = containers[0];
console.log(`target   : ${DB} (LOCAL only — prod is never connected to)`);

const psql = (text, label) => {
  const file = join(tmpdir(), `sp-load-${Date.now()}.sql`);
  writeFileSync(file, text, "utf8");
  try {
    const out = execFileSync(
      "docker",
      ["exec", "-i", DB, "psql", "-v", "ON_ERROR_STOP=1", "-q", LOCAL],
      { input: readFileSync(file, "utf8"), encoding: "utf8", maxBuffer: 1 << 28 },
    );
    return out;
  } catch (e) {
    die(`${label} failed:\n${e.stderr || e.message}`);
  } finally {
    unlinkSync(file);
  }
};

// ── 1. profiles come from the dump, so read the ids out of it BEFORE loading ────
// The FK profiles.id → auth.users(id) is re-added at the END of a pg_dump, so the
// accounts must already exist by then. Parse the COPY block rather than querying prod.
const copyRe = /^COPY public\.profiles \(([^)]*)\) FROM stdin;$/m;
const m = sql.match(copyRe);
if (!m) die("No `COPY public.profiles` block in that dump — is it a public-schema dump?");
const cols = m[1].split(",").map((c) => c.trim().replace(/"/g, ""));
const body = sql.slice(m.index + m[0].length).split(/\r?\n\\\.\r?\n/)[0];
const profiles = body
  .split(/\r?\n/)
  .filter((l) => l.trim() !== "")
  .map((line) => {
    const parts = line.split("\t");
    return { id: parts[cols.indexOf("id")], name: parts[cols.indexOf("display_name")] };
  });
if (profiles.length === 0) die("The dump's profiles table is empty.");
console.log(`profiles : ${profiles.map((p) => `${p.name} (${p.id.slice(0, 8)}…)`).join(", ")}`);

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const emailFor = (name) => `${name.toLowerCase()}@test.local`;

// ── 2. wipe local public + auth, mint accounts carrying the PROD ids ────────────
// Order matters: dropping public first removes profiles (and the handle_new_user
// trigger with it), so deleting auth.users below cannot cascade into real rows.
psql(
  `
drop schema if exists public cascade;
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;

delete from auth.identities;
delete from auth.users;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
${profiles
  .map(
    (p) => `  ('00000000-0000-0000-0000-000000000000', ${lit(p.id)}, 'authenticated',
   'authenticated', ${lit(emailFor(p.name))},
   extensions.crypt(${lit(PASSWORD)}, extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   jsonb_build_object('display_name', ${lit(p.name)}), now(), now(), '', '', '', '')`,
  )
  .join(",\n")};

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values
${profiles
  .map(
    (p) => `  (${lit(p.id)}, ${lit(p.id)},
   jsonb_build_object('sub', ${lit(p.id)}, 'email', ${lit(emailFor(p.name))}),
   'email', now(), now(), now())`,
  )
  .join(",\n")};
`,
  "wipe + mint accounts",
);
console.log("accounts : minted (local passwords only — no prod credential is copied)");

// ── 3. load the dump ────────────────────────────────────────────────────────────
psql(sql, "snapshot load");
console.log("data     : loaded");

// ── 4. re-grant + restore the signup trigger the schema drop took with it ───────
// The dump is --no-privileges, so without this anon/authenticated cannot reach any
// table and every request 401s behind an otherwise healthy stack. RLS still applies.
psql(
  `
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
`,
  "grants + trigger",
);

// ── 5. report ───────────────────────────────────────────────────────────────────
const summary = psql(
  `
select 'challenges' as t, count(*)::text as n from public.challenges
union all select 'challenge_members', count(*)::text from public.challenge_members
union all select 'tasks', count(*)::text from public.tasks
union all select 'daily_logs', count(*)::text from public.daily_logs
union all select 'coin_ledger', count(*)::text from public.coin_ledger
union all select 'reward_ledger', count(*)::text from public.reward_ledger
union all select 'shop_redemptions', count(*)::text from public.shop_redemptions
order by 1;
`,
  "summary",
);
console.log(`\n${summary.trim()}`);
console.log(`\n✔ Prod snapshot loaded into LOCAL.`);
console.log(`  Log in as: ${profiles.map((p) => emailFor(p.name)).join(" / ")}  ·  password ${PASSWORD}`);
console.log(`  Back to the clean seed at any time:  npm run db:reset\n`);
