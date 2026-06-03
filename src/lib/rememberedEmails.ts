// Remembers previously-used login emails (never passwords) so the login page can
// pre-fill and offer them. Purely a convenience layer over localStorage — the actual
// session is kept by Supabase (persistSession). All access is guarded so private/
// incognito modes (where localStorage can throw) degrade to "remember nothing".

const KEY = "streakpact.rememberedEmails";
const MAX = 3;

export function getRememberedEmails(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

/** Add an email to the front (most recent first), de-duped case-insensitively, capped at MAX. */
export function rememberEmail(email: string): void {
  const e = email.trim();
  if (!e) return;
  try {
    const next = [e, ...getRememberedEmails().filter((x) => x.toLowerCase() !== e.toLowerCase())].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore — storage unavailable */
  }
}

export function forgetEmail(email: string): void {
  const e = email.trim().toLowerCase();
  try {
    const next = getRememberedEmails().filter((x) => x.toLowerCase() !== e);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore — storage unavailable */
  }
}
