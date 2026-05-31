import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await signIn(email.trim(), pw);
    setBusy(false);
    if (error) {
      toast.error("登录失败：邮箱或密码错误");
      return;
    }
    toast.success("欢迎回来");
    nav(from, { replace: true });
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
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 rounded-2xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pw" className="text-xs uppercase tracking-wider text-muted-foreground">密码</Label>
            <Input
              id="pw"
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-2xl"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-2xl bg-gradient-warm text-primary-foreground font-bold text-base shadow-pop hover:opacity-95 disabled:opacity-60"
          >
            {busy ? "登录中…" : "登 录"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            仅 CP 与 JX 两位 · 使用 Supabase 账号登录
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
