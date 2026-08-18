import { NavLink, Outlet } from "react-router-dom";
import { Calendar, CheckSquare, Home, LogOut, ShoppingBag, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEquipped } from "@/hooks/useShop";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

// Under the challenge model, tasks are defined at create/join time and stakes/奖惩 live
// on the challenge card — so the standalone 任务设置 (Setup) and 奖惩 (Rewards) pages are
// retired from nav (their routes remain reachable by URL for legacy access only).
const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/check-in", label: "打卡", icon: CheckSquare },
  { to: "/calendar", label: "周历", icon: Calendar },
  { to: "/ledger", label: "账本", icon: Wallet },
  { to: "/shop", label: "商城", icon: ShoppingBag },
];

export const AppShell = () => {
  const { userId: user, signOut } = useAuth();
  // Equipped title rides the header pill. Skin application + theme-aware chrome (data-skin,
  // theme-color, favicon) are owned by <ThemeChrome/> at the app root.
  const { title } = useEquipped();

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Top bar — pad the notch/status-bar inset so the header clears it in standalone PWA mode. */}
      <header className="sticky top-0 z-30 bg-background border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="container relative flex items-center justify-between h-14 px-4 md:px-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold text-sm">
              S
            </div>
            <div className="leading-tight">
              <div className="font-semibold tracking-tight text-foreground">StreakPact</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">两人打卡契约</div>
            </div>
          </div>

          {/* Desktop nav — absolutely centered so a changing pill width can't shift it. */}
          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <NavLink
              to="/account"
              aria-label="账户"
              title={title ? `${user} · ${title}` : user ?? undefined}
              className={cn(
                "pill border transition-opacity hover:opacity-80 max-w-[9rem] whitespace-nowrap",
                user === "CP"
                  ? "bg-cp-soft text-cp border-cp/20"
                  : "bg-jx-soft text-jx border-jx/20",
              )}
            >
              <span className="shrink-0">{user}</span>
              {title && <span className="font-normal opacity-80 min-w-0 truncate">· {title}</span>}
            </NavLink>
            <ThemeToggle />
            <button
              onClick={() => void signOut()}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container px-4 md:px-8 py-4 md:py-8 animate-slide-up">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) — pad the home-indicator inset so iOS's bar doesn't cover the icons. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <n.icon className="w-5 h-5" />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
