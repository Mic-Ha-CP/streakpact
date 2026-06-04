import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * Tri-state theme switch: 跟随系统 (auto) → 日间 → 夜间 → 跟随系统.
 * "system" follows the device preference live (no flash — index.html applies it
 * before first paint); the choice is persisted by next-themes in localStorage.
 */
const ORDER = ["system", "light", "dark"] as const;
type ThemeKey = (typeof ORDER)[number];

const META: Record<ThemeKey, { Icon: typeof Monitor; label: string }> = {
  system: { Icon: Monitor, label: "跟随系统" },
  light: { Icon: Sun, label: "日间模式" },
  dark: { Icon: Moon, label: "夜间模式" },
};

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // theme is only known after mount — default the display to "跟随系统" until then.
  useEffect(() => setMounted(true), []);

  const current: ThemeKey =
    mounted && theme && (ORDER as readonly string[]).includes(theme)
      ? (theme as ThemeKey)
      : "system";
  const { Icon, label } = META[current];
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];

  return (
    <button
      onClick={() => setTheme(next)}
      disabled={!mounted}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={`主题：${label}（点击切换到${META[next].label}）`}
      title={`主题：${label}`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
