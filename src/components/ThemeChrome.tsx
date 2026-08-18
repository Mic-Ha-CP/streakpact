import { useEffect } from "react";
import { useTheme } from "next-themes";
import { useEquipped } from "@/hooks/useShop";

/** "H S% L%" (Tailwind CSS-var form) → #rrggbb. Returns null if unparseable. */
function hslVarToHex(v: string): string | null {
  const m = v.trim().match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  const h = +m[1] / 360;
  const s = +m[2] / 100;
  const l = +m[3] / 100;
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Keeps the browser chrome on-theme. Applies the equipped theme's [data-skin] to <html>, then
 * points <meta name="theme-color"> at the *resolved* --primary (so the mobile address bar / PWA
 * title bar follows teal-default vs sakura AND light/dark) and swaps the tab favicon per theme.
 * Reading the live CSS var means this auto-follows any future theme (incl. sakura v2) with no
 * per-theme code here. Rendered once at the app root; renders nothing.
 *
 * NOTE: an installed PWA's manifest icons are intentionally NOT swapped — the platform snapshots
 * them at install time and they can't follow runtime theme switches (see docs/NOTES.md).
 */
export const ThemeChrome = () => {
  const { resolvedTheme } = useTheme();
  const { theme: skin } = useEquipped();

  // Apply the skin here (app root) so the whole app reskins, not just AppShell-wrapped routes.
  useEffect(() => {
    const root = document.documentElement;
    if (skin) root.dataset.skin = skin;
    else delete root.dataset.skin;
  }, [skin]);

  // After the skin + light/dark class settle, read the live --primary and update the chrome.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const hex = hslVarToHex(getComputedStyle(document.documentElement).getPropertyValue("--primary"));
      const meta = document.getElementById("theme-color-meta");
      if (hex && meta) meta.setAttribute("content", hex);

      const favicon = document.getElementById("app-favicon") as HTMLLinkElement | null;
      if (favicon) favicon.href = skin === "sakura" ? "/logo-sakura.svg" : "/logo.svg";
    });
    return () => cancelAnimationFrame(raf);
  }, [resolvedTheme, skin]);

  return null;
};
