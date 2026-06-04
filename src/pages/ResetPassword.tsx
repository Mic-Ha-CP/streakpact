import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/**
 * Landing page for the password-reset email link. The recovery token in the URL
 * is consumed by supabase-js (detectSessionInUrl) on load, which establishes a
 * temporary session — so a present session here means the link is valid.
 */
const ResetPassword = () => {
  const { session, loading, updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (pw.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    if (pw !== confirm) {
      toast.error("两次输入的密码不一致");
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(pw);
    setBusy(false);
    if (error) {
      toast.error(`重置失败：${error}`);
      return;
    }
    toast.success("密码已更新");
    nav("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-canvas grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-pop-in">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-warm text-primary-foreground items-center justify-center text-3xl font-black shadow-pop mb-4">
            S
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">设置新密码</h1>
        </div>

        <div className="bg-card rounded-3xl p-6 shadow-card border border-border/60 animate-slide-up">
          {loading ? (
            <p className="text-sm text-center text-muted-foreground py-4">正在验证链接…</p>
          ) : !session ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                链接无效或已过期。请回到登录页重新申请「忘记密码」。
              </p>
              <Button
                onClick={() => nav("/login", { replace: true })}
                className="w-full h-12 rounded-2xl bg-gradient-warm text-primary-foreground font-bold"
              >
                返回登录
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pw" className="text-xs uppercase tracking-wider text-muted-foreground">新密码</Label>
                <Input
                  id="pw"
                  type="password"
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="至少 6 位"
                  className="h-12 rounded-2xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-xs uppercase tracking-wider text-muted-foreground">确认新密码</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="再输一次"
                  className="h-12 rounded-2xl"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-2xl bg-gradient-warm text-primary-foreground font-bold text-base shadow-pop hover:opacity-95 disabled:opacity-60"
              >
                {busy ? "更新中…" : "更新密码"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
