import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonChip } from "@/components/PersonChip";
import { toast } from "sonner";

/** Account page: shows who you are and lets a signed-in user change their password. */
const Account = () => {
  const { session, userId, updatePassword } = useAuth();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

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
      toast.error(`修改失败：${error}`);
      return;
    }
    setPw("");
    setConfirm("");
    toast.success("密码已修改");
  };

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">账户</h1>
        <p className="text-sm text-muted-foreground">查看身份与修改登录密码</p>
      </div>

      <div className="bg-card rounded-3xl border border-border/60 shadow-card p-5 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">当前登录</div>
        <div className="flex items-center gap-3">
          {userId && <PersonChip user={userId} />}
          <span className="text-sm text-muted-foreground break-all">{session?.user.email}</span>
        </div>
      </div>

      <form onSubmit={submit} className="bg-card rounded-3xl border border-border/60 shadow-card p-5 space-y-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">修改密码</div>
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
          {busy ? "保存中…" : "保存新密码"}
        </Button>
      </form>
    </div>
  );
};

export default Account;
