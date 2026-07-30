import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useChallenge } from "@/hooks/useChallenge";
import { useChallengeSettlement } from "@/hooks/useChallengeSettlement";
import {
  challengeSpan,
  challengeStarted,
  midEditOpen,
  preStartEditable,
  nextMondayOnOrAfter,
  paceExpected,
  totalProgress,
} from "@/data/challenge";
import { todayISO, weekdayCN } from "@/lib/dates";
import { unitLabel, type DailyLog, type Task, type UserId } from "@/data/models";
import { ChallengeForm } from "@/components/challenge/ChallengeForm";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Flag,
  Sparkles,
  Trophy,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Hourglass,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn, NO_SPIN } from "@/lib/utils";
import { toast } from "sonner";

const strMin = (a: string, b: string) => (a < b ? a : b);

/** Read-only total-target progress for one task, with an optional pace reference. */
const TaskProgress = ({
  task,
  logs,
  start,
  weeks,
  today,
  user,
  showPace,
}: {
  task: Task;
  logs: DailyLog[];
  start: string;
  weeks: number;
  today: string;
  user: UserId;
  showPace: boolean;
}) => {
  const v = totalProgress(task, logs, start, weeks);
  const passed = v >= task.target;
  const pace = showPace ? Math.round(paceExpected(task, start, weeks, today)) : null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium truncate pr-2">{task.title}</span>
        <span
          className={cn(
            "tabular-nums font-bold text-xs",
            passed ? "text-success" : "text-muted-foreground",
          )}
        >
          {v}/{task.target} {unitLabel(task.unit)}
        </span>
      </div>
      <ProgressBar value={v} max={task.target} user={user} />
      {pace !== null && (
        <div className="text-[10px] text-muted-foreground">
          进度参考线 · 匀速应达 ~{pace} {unitLabel(task.unit)}
          {v >= pace ? " · 已跟上 👍" : " · 略落后"}
        </div>
      )}
    </div>
  );
};

/** My own check-in controls for a single task on the selected date. */
const CheckinControls = ({
  task,
  logs,
  date,
  onToggle,
  onAddTimer,
  onDeleteLog,
}: {
  task: Task;
  logs: DailyLog[];
  date: string;
  onToggle: (taskId: string) => void;
  onAddTimer: (taskId: string, minutes: number) => void;
  onDeleteLog: (id: string) => void;
}) => {
  const [minutes, setMinutes] = useState("");
  if (task.type === "count") {
    const done = logs.some((l) => l.taskId === task.id && l.date === date && l.value > 0);
    return (
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          "pill border transition-colors",
          done
            ? "bg-success-soft text-success border-success/40"
            : "bg-card text-muted-foreground border-border hover:border-primary",
        )}
      >
        {done ? "已打卡 ✓（点按撤销）" : "打卡"}
      </button>
    );
  }
  const entries = logs.filter((l) => l.taskId === task.id && l.date === date && l.value > 0);
  const mins = minutes === "" ? 0 : Math.floor(Number(minutes));
  const canAdd = mins >= 1;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="分钟"
          value={minutes}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setMinutes(e.target.value)}
          className={cn("rounded-xl h-9 w-24 tabular-nums", NO_SPIN)}
        />
        <span className="text-xs text-muted-foreground">分钟</span>
        <Button
          size="sm"
          className="rounded-xl h-9"
          disabled={!canAdd}
          onClick={() => {
            onAddTimer(task.id, mins);
            setMinutes("");
          }}
        >
          记录
        </Button>
      </div>
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entries.map((e) => (
            <button
              key={e.id}
              onClick={() => onDeleteLog(e.id)}
              title="点按删除"
              className="pill bg-muted text-muted-foreground border border-border hover:text-danger"
            >
              {e.value} 分 ✕
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ResultPill = ({ result }: { result: "success" | "failure" | null }) => {
  if (result === "success")
    return (
      <span className="pill bg-success text-success-foreground">
        <CheckCircle2 className="w-3 h-3" /> 通关
      </span>
    );
  if (result === "failure")
    return (
      <span className="pill bg-danger text-danger-foreground">
        <XCircle className="w-3 h-3" /> 未达标
      </span>
    );
  return <span className="pill border border-border text-muted-foreground">进行中</span>;
};

type FormMode = "create" | "join" | "edit" | null;

/** The home-page challenge experience: dormant → active (check-in + pace) → settle. */
export const ChallengeHome = () => {
  const { userId: me } = useAuth();
  const today = todayISO();
  const c = useChallenge();
  const partner: UserId = me === "CP" ? "JX" : "CP";
  const partnerTasks = c.tasksFor(partner);
  const s = useChallengeSettlement(c.challenge, c.members, c.myTasks, partnerTasks, c.logs);

  const [formMode, setFormMode] = useState<FormMode>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [settleOpen, setSettleOpen] = useState(false);

  // ---- Form overlay (create / join / edit) -----------------------------------
  if (formMode) {
    const start = nextMondayOnOrAfter(today);
    const closing = () => setFormMode(null);
    if (formMode === "create") {
      return (
        <ChallengeForm
          mode="create"
          startDate={start}
          weeks={4}
          submitting={c.createChallenge.isPending}
          onCancel={closing}
          onSubmit={(r) =>
            c.createChallenge.mutate(
              { startDate: start, weeks: 4, teamReward: r.teamReward, deposit: r.deposit, tasks: r.tasks },
              {
                onSuccess: () => {
                  toast.success("挑战已发起 🎉");
                  closing();
                },
                onError: (e) => toast.error(`发起失败：${(e as Error).message}`),
              },
            )
          }
        />
      );
    }
    if (formMode === "join") {
      return (
        <ChallengeForm
          mode="join"
          submitting={c.joinChallenge.isPending}
          onCancel={closing}
          onSubmit={(r) =>
            c.joinChallenge.mutate(
              { deposit: r.deposit, tasks: r.tasks },
              {
                onSuccess: () => {
                  toast.success("已加入挑战 💪");
                  closing();
                },
                onError: (e) => toast.error(`加入失败：${(e as Error).message}`),
              },
            )
          }
        />
      );
    }
    // edit — before start it's free (tasks + deposit + team reward); after start it's the
    // one shot (tasks only; deposit + team reward are locked).
    const consumesEdit = c.challenge ? challengeStarted(c.challenge.startDate, today) : false;
    const preStart = !consumesEdit;
    const iAmInitiator = c.challenge?.initiator === me;
    return (
      <ChallengeForm
        mode="edit"
        editFree={preStart}
        initialTasks={c.myTasks.map((t) => ({
          key: t.id,
          id: t.id,
          title: t.title,
          type: t.type,
          target: t.target,
          logCount: c.logs.filter((l) => l.taskId === t.id).length,
        }))}
        initialDeposit={{
          stake: c.myMember?.depositStake ?? "",
          execution: c.myMember?.depositExecution ?? "",
        }}
        showTeamReward={preStart && iAmInitiator}
        initialTeamReward={c.challenge?.teamReward ?? ""}
        submitting={c.editMyTasks.isPending}
        onCancel={closing}
        onSubmit={(r) =>
          c.editMyTasks.mutate(
            {
              upserts: r.tasks,
              deleteIds: r.deleteIds,
              consumesEdit,
              deposit: preStart ? r.deposit : undefined,
              teamReward: preStart && iAmInitiator ? r.teamReward : undefined,
            },
            {
              onSuccess: () => {
                toast.success(consumesEdit ? "已修改 · 本期机会已用完" : "已修改");
                closing();
              },
              onError: (e) => toast.error(`修改失败：${(e as Error).message}`),
            },
          )
        }
      />
    );
  }

  if (c.isLoading) {
    return (
      <div className="bg-card rounded-3xl border border-border/60 shadow-card p-8 text-center text-sm text-muted-foreground">
        加载中…
      </div>
    );
  }

  // ---- Dormant (no challenge, or one auto-voided / consensually aborted) ------
  if (!c.challenge || c.voided || c.aborted) {
    const start = nextMondayOnOrAfter(today);
    return (
      <div className="bg-card rounded-3xl border border-border/60 shadow-card p-8 text-center space-y-4">
        {c.voided && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
            上一个挑战到开赛日仍无人加入，已自动作废。
          </div>
        )}
        {c.aborted && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">
            上一个挑战已由双方协商中止（无惩罚、不结算）。
          </div>
        )}
        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
          <Flag className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="font-display font-extrabold text-xl">当前没有进行中的挑战</h2>
          <p className="text-sm text-muted-foreground">
            休眠中 · 零打卡义务。任一方都可发起一个 4 周挑战 —— 最早{" "}
            <b className="text-foreground">{start}</b>（周一）开始。歇一阵再来也没问题。
          </p>
        </div>
        <Button onClick={() => setFormMode("create")} className="rounded-xl">
          <Flag className="w-4 h-4 mr-1.5" /> 发起挑战
        </Button>
      </div>
    );
  }

  // ---- Active challenge ------------------------------------------------------
  const ch = c.challenge;
  const { start, end } = { start: ch.startDate, end: challengeSpan(ch.startDate, ch.weeks).end };
  const started = challengeStarted(start, today);
  const ended = s.ended;
  const isInitiator = ch.initiator === me;
  const canEditFree = c.iJoined && !ended && preStartEditable(start, today);
  const canEditMid =
    c.iJoined && !ended && midEditOpen(start, ch.weeks, today, c.myMember?.editedAt ?? null);
  const canEdit = canEditFree || canEditMid;
  // Earliest a NEXT challenge could start (a Monday). Surfaces the settle→start timing
  // so a rest week is a choice, not a surprise (challenge-to-challenge gap, ROADMAP).
  const nextStart = nextMondayOnOrAfter(today);

  // check-in date (default = today, clamped into [start, min(end, today)])
  const maxCheckin = ended ? end : strMin(today, end);
  const checkinDate =
    selectedDate && selectedDate >= start && selectedDate <= maxCheckin ? selectedDate : maxCheckin;

  const stepDate = (delta: number) => {
    const [y, m, d] = checkinDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + delta);
    const next = dt.toISOString().slice(0, 10);
    if (next >= start && next <= maxCheckin) setSelectedDate(next);
  };

  const preview = s.previewSettle();

  const header = (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden">
      <div className="p-5 bg-primary/5 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-primary" />
            <span className="font-display font-extrabold text-lg">当前挑战</span>
            {!started && <span className="pill bg-secondary-soft text-secondary-foreground">未开始</span>}
            {started && !ended && <span className="pill bg-success-soft text-success">进行中</span>}
            {ended && <span className="pill bg-muted text-muted-foreground">已结束</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {start} → {end} · {ch.weeks} 周 · 发起人 {ch.initiator}
          </div>
          {ch.teamReward && (
            <div className="text-xs text-muted-foreground">
              🎁 团队奖励：<span className="font-medium text-foreground">{ch.teamReward}</span>
            </div>
          )}
        </div>
        {/* Pre-start: initiator may cancel freely. After start: no unilateral cancel —
            stakes are live; dissolving needs both sides (中止, see the abort strip). */}
        {isInitiator && !started && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="pill bg-card border border-border text-muted-foreground hover:text-danger hover:border-danger shrink-0">
                取消挑战
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>取消这个挑战？</AlertDialogTitle>
                <AlertDialogDescription>
                  尚未开赛，可直接取消，回到休眠状态。已记录的打卡不会删除。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>返回</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-danger text-danger-foreground hover:bg-danger/90"
                  onClick={() =>
                    c.cancelChallenge.mutate(undefined, {
                      onSuccess: () => toast.success("挑战已取消"),
                      onError: (e) => toast.error(`取消失败：${(e as Error).message}`),
                    })
                  }
                >
                  确认取消
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {c.iJoined && started && !ended && !c.abortPending && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="pill bg-card border border-border text-muted-foreground hover:text-danger hover:border-danger shrink-0">
                中止挑战
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>请求中止挑战？</AlertDialogTitle>
                <AlertDialogDescription>
                  开赛后不能单方取消。你可以发起「中止」请求，{partner} 确认后挑战协商中止 ——
                  双方无惩罚、不结算。对方确认前你可随时撤回。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>返回</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    c.requestAbort.mutate(undefined, {
                      onSuccess: () => toast.success(`已请求中止，等待 ${partner} 确认`),
                      onError: (e) => toast.error(`请求失败：${(e as Error).message}`),
                    })
                  }
                >
                  发起中止请求
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div className="p-4 space-y-1.5 border-t border-border/60">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">押注声明</div>
        {c.members.map((m) => (
          <div key={m.userId} className="text-sm flex flex-wrap items-baseline gap-x-2">
            <span className="font-bold">{m.userId}</span>
            <span className="text-muted-foreground">
              押 {m.depositStake || "—"} · 失败 {m.depositExecution || "—"}
            </span>
          </div>
        ))}
        {c.members.length < 2 && <div className="text-xs text-muted-foreground">对方尚未加入</div>}
        {!started && (
          <div className="text-[11px] text-muted-foreground pt-1">
            开赛前可自由修改任务 / 押注 / 团队奖励。
          </div>
        )}
      </div>
    </div>
  );

  // partner read-only panel
  const partnerPanel = (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden">
      <div className={cn("p-4 flex items-center justify-between", partner === "CP" ? "bg-cp-soft" : "bg-jx-soft")}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-9 h-9 rounded-xl grid place-items-center font-black text-primary-foreground shadow-pop",
              partner === "CP" ? "bg-cp" : "bg-jx",
            )}
          >
            {partner}
          </div>
          <div className="font-display font-extrabold">{partner}</div>
        </div>
        {ended ? <ResultPill result={s.partnerResult} /> : c.tasksFor(partner).length === 0 ? (
          <span className="pill border border-border text-muted-foreground">未加入</span>
        ) : null}
      </div>
      <div className="p-4 space-y-3">
        {partnerTasks.length === 0 && (
          <div className="text-sm text-muted-foreground py-3 text-center bg-muted/40 rounded-2xl">
            对方还没有加入
          </div>
        )}
        {partnerTasks.map((t) => (
          <TaskProgress
            key={t.id}
            task={t}
            logs={c.logs}
            start={start}
            weeks={ch.weeks}
            today={today}
            user={partner}
            showPace={started && !ended}
          />
        ))}
      </div>
    </div>
  );

  // my panel
  const myPanel = (
    <div className="bg-card rounded-3xl border border-border/60 shadow-card overflow-hidden">
      <div className={cn("p-4 flex items-center justify-between", me === "CP" ? "bg-cp-soft" : "bg-jx-soft")}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-9 h-9 rounded-xl grid place-items-center font-black text-primary-foreground shadow-pop",
              me === "CP" ? "bg-cp" : "bg-jx",
            )}
          >
            {me}
          </div>
          <div className="font-display font-extrabold">{me}（我）</div>
        </div>
        <div className="flex items-center gap-2">
          {ended && <ResultPill result={s.mySettled ? s.myResult : null} />}
          {canEdit && (
            <button
              onClick={() => setFormMode("edit")}
              className="pill bg-card border border-border hover:border-primary hover:text-primary"
            >
              <Pencil className="w-3 h-3" /> {canEditFree ? "修改" : "修改任务 · 唯一机会"}
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {!c.iJoined && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">
              {ended ? "本期你没有参与。" : "你还没有加入这个挑战。"}
            </p>
            {!ended && (
              <Button onClick={() => setFormMode("join")} className="rounded-xl">
                加入挑战
              </Button>
            )}
          </div>
        )}

        {c.iJoined && c.myTasks.length === 0 && (
          <div className="text-sm text-muted-foreground py-3 text-center bg-muted/40 rounded-2xl">
            你还没有任务
          </div>
        )}

        {/* date selector for check-in / 补签 (running only) */}
        {c.iJoined && started && !ended && c.myTasks.length > 0 && (
          <div className="flex items-center justify-between bg-muted/40 rounded-2xl p-2">
            <button onClick={() => stepDate(-1)} className="p-1.5 rounded-lg hover:bg-card" aria-label="前一天">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-sm font-bold tabular-nums">
              {checkinDate} · {weekdayCN(checkinDate)}
              {checkinDate < today && <span className="ml-1 text-[10px] text-secondary-foreground">补签</span>}
            </div>
            <button
              onClick={() => stepDate(1)}
              disabled={checkinDate >= maxCheckin}
              className="p-1.5 rounded-lg hover:bg-card disabled:opacity-30"
              aria-label="后一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {c.iJoined &&
          c.myTasks.map((t) => (
            <div key={t.id} className="bg-background rounded-2xl p-3 border border-border/60 space-y-2.5">
              <TaskProgress
                task={t}
                logs={c.logs}
                start={start}
                weeks={ch.weeks}
                today={today}
                user={me}
                showPace={started && !ended}
              />
              {started && !ended && (
                <CheckinControls
                  task={t}
                  logs={c.logs}
                  date={checkinDate}
                  onToggle={(taskId) => c.toggleCount.mutate({ taskId, date: checkinDate })}
                  onAddTimer={(taskId, mins) =>
                    c.addTimer.mutate(
                      { taskId, date: checkinDate, value: mins },
                      { onSuccess: () => toast.success(`已记录 ${mins} 分钟`) },
                    )
                  }
                  onDeleteLog={(id) => c.deleteLog.mutate(id)}
                />
              )}
            </div>
          ))}
      </div>
    </div>
  );

  // settlement / completion strip
  const settleStrip = () => {
    if (!c.iJoined || !ended) return null;
    if (!s.mySettled) {
      return (
        <div className="bg-card rounded-3xl border border-secondary/40 shadow-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-secondary-foreground font-bold">
            <Sparkles className="w-4 h-4" /> 挑战已结束 · 可以结算
          </div>
          <p className="text-sm text-muted-foreground">
            结算会锁定你的结果。团队奖惩在双方都结算后入账。
          </p>
          <p className="text-xs text-muted-foreground">
            本期已结束 · 双方结算后可于 <b className="text-foreground">{nextStart}</b>（周一）立即开启下一期。
            晚于这个周一才结算，最早开始就顺延到再下一个周一（会空出一段）。
          </p>
          <Button onClick={() => setSettleOpen(true)} className="rounded-xl">
            结算我的挑战
          </Button>
        </div>
      );
    }
    if (!s.bothSettled) {
      return (
        <div className="bg-card rounded-3xl border border-border/60 shadow-card p-5 space-y-2">
          <div className="flex items-center gap-2 font-bold">
            <Hourglass className="w-4 h-4 text-muted-foreground" /> 你已结算 · 等待 {partner} 结算
          </div>
          <div className="text-sm text-muted-foreground">
            你的结果：<ResultPill result={s.myResult} />
          </div>
          <p className="text-xs text-muted-foreground">
            对方结算后即可于 <b className="text-foreground">{nextStart}</b>（周一）开启下一期。
          </p>
          <UnsettleButton onConfirm={() => doUnsettle()} />
        </div>
      );
    }
    // both settled
    const teamWin = s.teamSettled === "success";
    return (
      <div
        className={cn(
          "rounded-3xl border shadow-card p-5 space-y-2",
          teamWin ? "bg-success-soft border-success/40" : "bg-danger-soft border-danger/40",
        )}
      >
        <div className="flex items-center gap-2 font-display font-extrabold text-lg">
          <Trophy className={cn("w-5 h-5", teamWin ? "text-success" : "text-danger")} />
          {teamWin ? "你们一起通关了！🎉" : "本期挑战失败"}
        </div>
        <div className="text-sm text-muted-foreground">
          {me}：<ResultPill result={s.myResult} /> · {partner}：<ResultPill result={s.partnerResult} />
        </div>
        <p className="text-sm">
          {teamWin
            ? ch.teamReward
              ? `团队奖励「${ch.teamReward}」已记入你的账本。`
              : "双方都通关（本期未设团队奖励）。"
            : "失败方的押注惩罚已按各自声明记入账本，待手动执行。"}
        </p>
        <p className="text-xs text-muted-foreground pt-1">
          下一期最早可于 <b className="text-foreground">{nextStart}</b>（周一）开始。
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="rounded-xl" onClick={() => setFormMode("create")}>
            开启下一期挑战
          </Button>
          <UnsettleButton onConfirm={() => doUnsettle()} />
        </div>
      </div>
    );
  };

  function doUnsettle() {
    s.unsettleMine.mutate(undefined, {
      onSuccess: () => toast.success("已撤销结算"),
      onError: (e) => toast.error(`撤销失败：${(e as Error).message}`),
    });
  }

  // D11: a pending consensual-abort request (mine → waiting; partner's → confirm).
  const abortStrip = () => {
    if (!c.abortPending) return null;
    if (c.myAbort) {
      return (
        <div className="bg-card rounded-2xl border border-border/60 shadow-card p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-bold">已请求中止挑战</span> · 等待 {partner} 确认
          </div>
          <button
            onClick={() =>
              c.withdrawAbort.mutate(undefined, {
                onSuccess: () => toast.success("已撤回中止请求"),
                onError: (e) => toast.error(`撤回失败：${(e as Error).message}`),
              })
            }
            className="pill bg-card border border-border hover:border-foreground/40 shrink-0"
          >
            撤回请求
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-secondary/40 bg-secondary-soft/60 shadow-card p-4 space-y-2">
        <div className="text-sm font-bold text-secondary-foreground">{partner} 请求中止本次挑战</div>
        <p className="text-xs text-muted-foreground">
          确认后协商中止：双方无惩罚、不结算。不确认则挑战继续。
        </p>
        <Button
          size="sm"
          className="rounded-xl"
          onClick={() =>
            c.requestAbort.mutate(undefined, {
              onSuccess: () => toast.success("挑战已中止"),
              onError: (e) => toast.error(`确认失败：${(e as Error).message}`),
            })
          }
        >
          确认中止
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {header}
      {abortStrip()}
      {settleStrip()}
      <div className="grid md:grid-cols-2 gap-4">
        {myPanel}
        {partnerPanel}
      </div>

      {/* Settle confirm */}
      <AlertDialog open={settleOpen} onOpenChange={setSettleOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>结算我的挑战？</AlertDialogTitle>
            <AlertDialogDescription>结算后你的结果将被锁定（可撤销后重结）。</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 text-sm">
            <div>
              你的结果：
              <span className={cn("font-bold", preview.myResult === "success" ? "text-success" : "text-danger")}>
                {preview.myResult === "success" ? "通关 ✓" : "未达标"}
              </span>
            </div>
            {preview.partnerSettled ? (
              preview.writesNow ? (
                <div className="rounded-lg bg-muted/50 p-2">
                  团队{preview.team === "success" ? "成功" : "失败"} · 将入账本（
                  {preview.ledgerType === "reward" ? "奖励" : "惩罚"}）：
                  <span className="font-medium">{preview.ledgerText}</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">团队已可结算，但你这侧无奖惩条目入账。</div>
              )
            ) : (
              <div className="text-xs text-muted-foreground">
                {partner} 还没结算 —— 先记录你的结果，团队奖惩待双方都结算后入账。
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                s.settleMine.mutate(undefined, {
                  onSuccess: (r) =>
                    toast.success(r.result === "success" ? "已结算 · 通关 ✓" : "已结算 · 未达标"),
                  onError: (e) => toast.error(`结算失败：${(e as Error).message}`),
                })
              }
            >
              确认结算
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** A self-contained un-settle button + confirm. */
const UnsettleButton = ({ onConfirm }: { onConfirm: () => void }) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <button className="pill bg-card border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40">
        撤销结算
      </button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>撤销结算？</AlertDialogTitle>
        <AlertDialogDescription>
          将删除你这次结算的快照与生成的账本条目，可修改后重新结算。
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>返回</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>确认撤销</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
