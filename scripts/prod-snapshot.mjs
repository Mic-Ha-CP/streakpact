/**
 * Take a PROD snapshot (public schema, structure + data) into the backups directory
 * OUTSIDE the repo.  This is the existing manual-backup workflow from docs/NOTES.md,
 * wrapped so it is one command and always writes to the same place.
 *
 *   node scripts/prod-snapshot.mjs
 *
 * READ-ONLY against prod: pg_dump only.  The file it writes contains REAL DATA — it lives
 * outside the repo deliberately and must never be committed.
 *
 * pg_dump runs inside the local supabase_db container (the host has no postgres client),
 * so the local stack must be up — but the local DATABASE is not touched.
 */
import { execFileSync } from "child_process";
import { readFileSync, mkdirSync, writeFileSync, statSync } from "fs";
import { join } from "path";

const BACKUP_DIR =
  process.env.STREAKPACT_BACKUPS ||
  "C:/Users/Admin/Documents/Self_Learning/streakpact-backups";

const die = (m) => {
  console.error(`\n✖ ${m}\n`);
  process.exit(1);
};

const url = readFileSync(".env", "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1];
if (!url) die("No DATABASE_URL in .env (the direct 5432 connection, not the 6543 pooler).");
if (/127\.0\.0\.1|localhost/.test(url)) die("DATABASE_URL points at localhost — that is not prod.");

const containers = execFileSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter((n) => n.startsWith("supabase_db"));
if (containers.length === 0) die("Local Supabase is not running (needed only for its pg_dump). Run: npx supabase start");

mkdirSync(BACKUP_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
const out = join(BACKUP_DIR, `streakpact-prod-public-${stamp}.sql`);

console.log(`dumping prod public schema → ${out}`);
const dump = execFileSync(
  "docker",
  ["exec", "-i", "-e", `PGCONN=${url}`, containers[0], "sh", "-c",
   'pg_dump "$PGCONN" --schema=public --no-owner --no-privileges'],
  { encoding: "utf8", maxBuffer: 1 << 28 },
);
if (!/^COPY public\.profiles /m.test(dump)) die("Dump looks wrong — no profiles COPY block.");
writeFileSync(out, dump, "utf8");
console.log(`✔ ${(statSync(out).size / 1024).toFixed(0)} KB written (REAL DATA — never commit)`);
console.log(`  Load it locally with:  npm run db:load\n`);
