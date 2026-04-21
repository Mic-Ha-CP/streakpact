import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/data/store";
import type { UserId } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Login = () => {
  const [user, setUser] = useState<UserId>("CP");
  const [pw, setPw] = useState("");
  const login = useApp((s) => s.login);
  const nav = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(user, pw)) {
      toast.success(`欢迎回来，${user}`);
      nav("/");
    } else {
      toast.error("密码不能为空");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-canvas grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-pop-in">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-warm text-primary-foreground items-center justify-center text-3xl font-black shadow-pop mb-4">
            S
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">StreakPact</h1>
          <p className="text-muted-foreground text-sm mt-1">两人打卡契约 · 一起变好</p>
        </div>

        <form
          onSubmit={submit}
          className="bg-card rounded-3xl p-6 shadow-card border border-border/60 space-y-5 animate-slide-up"
        >
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">选择身份</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["CP", "JX"] as UserId[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUser(u)}
                  className={cn(
                    "py-3 rounded-2xl font-bold text-lg transition-all border-2",
                    user === u
                      ? u === "CP"
                        ? "bg-cp-soft text-cp border-cp"
                        : "bg-jx-soft text-jx border-jx"
                      : "bg-background text-muted-foreground border-border hover:border-foreground/30",
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pw" className="text-xs uppercase tracking-wider text-muted-foreground">密码</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="任意密码即可登录（演示）"
              className="h-12 rounded-2xl"
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-2xl bg-gradient-warm text-primary-foreground font-bold text-base shadow-pop hover:opacity-95">
            登 录
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            演示账号 · 仅 CP 与 JX 两位
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
