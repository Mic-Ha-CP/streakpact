import { NavLink, Outlet } from "react-router-dom";
import { Calendar, CheckSquare, Home, ListChecks, LogOut, Sparkles, Wallet } from "lucide-react";
import { useApp } from "@/data/store";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "首页", icon: Home },
  { to: "/check-in", label: "打卡", icon: CheckSquare },
  { to: "/calendar", label: "周历", icon: Calendar },
  { to: "/rewards", label: "奖惩", icon: Sparkles },
  { to: "/ledger", label: "账本", icon: Wallet },
  { to: "/setup", label: "任务", icon: ListChecks },
];

export const AppShell = () => {
  const user = useApp((s) => s.currentUser);
  const logout = useApp((s) => s.logout);

  return (
    <div className="min-h-screen bg-gradient-canvas pb-24 md:pb-0">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border/60">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-warm grid place-items-center text-primary-foreground font-black shadow-pop">
              S
            </div>
            <div className="leading-tight">
              <div className="font-display font-extrabold tracking-tight">StreakPact</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">两人打卡契约</div>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "pill",
                user === "CP"
                  ? "bg-cp-soft text-cp"
                  : "bg-jx-soft text-jx",
              )}
            >
              {user}
            </span>
            <button
              onClick={logout}
              className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="container py-4 md:py-8 animate-slide-up">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="grid grid-cols-6">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-medium transition-colors",
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
