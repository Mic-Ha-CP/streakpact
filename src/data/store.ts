import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DailyLog, RewardEntry, RewardPlan, Task, UserId } from "./types";

const CURRENT_MONTH = "2026-04";
const TODAY = "2026-04-21";

// Helpers
const d = (day: number) => `2026-04-${String(day).padStart(2, "0")}`;

const seedTasks: Task[] = [
  { id: "t-cp-1", userId: "CP", month: CURRENT_MONTH, title: "Task A", type: "count", target: 6, unit: "天", editCount: 0 },
  { id: "t-cp-2", userId: "CP", month: CURRENT_MONTH, title: "Task B", type: "timer", target: 150, unit: "分钟", editCount: 0 },
  { id: "t-cp-3", userId: "CP", month: CURRENT_MONTH, title: "Task C", type: "count", target: 4, unit: "天", editCount: 0 },
  { id: "t-jx-1", userId: "JX", month: CURRENT_MONTH, title: "Task A", type: "timer", target: 120, unit: "分钟", editCount: 0 },
  { id: "t-jx-2", userId: "JX", month: CURRENT_MONTH, title: "Task B", type: "count", target: 5, unit: "天", editCount: 0 },
];

// generate seed logs
const seedLogs: DailyLog[] = [];
let lid = 0;
const addLog = (l: Omit<DailyLog, "id">) => seedLogs.push({ id: `l-${++lid}`, ...l });

// CP early-rise: most days done
for (let day = 1; day <= 21; day++) {
  if (![6, 13, 19].includes(day)) addLog({ taskId: "t-cp-1", date: d(day), done: true });
}
// CP reading minutes
const cpRead: Record<number, number> = { 1: 30, 2: 25, 3: 40, 4: 20, 5: 35, 6: 0, 7: 30,
  8: 25, 9: 30, 10: 35, 11: 40, 12: 20, 13: 0, 14: 30,
  15: 30, 16: 35, 17: 25, 18: 30, 19: 20, 20: 25, 21: 30 };
Object.entries(cpRead).forEach(([day, m]) => addLog({ taskId: "t-cp-2", date: d(+day), minutes: m }));
// CP exercise
[1, 3, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21].forEach((day) => addLog({ taskId: "t-cp-3", date: d(day), done: true }));

// JX drawing minutes
const jxDraw: Record<number, number> = { 1: 20, 2: 30, 3: 25, 4: 0, 5: 40, 6: 20, 7: 0,
  8: 30, 9: 25, 10: 30, 11: 35, 12: 0, 13: 20, 14: 25,
  15: 0, 16: 30, 17: 25, 18: 35, 19: 20, 20: 0, 21: 30 };
Object.entries(jxDraw).forEach(([day, m]) => addLog({ taskId: "t-jx-1", date: d(+day), minutes: m }));
// JX meditate
[1, 2, 3, 5, 6, 8, 9, 10, 12, 14, 15, 17, 18, 20].forEach((day) => addLog({ taskId: "t-jx-2", date: d(day), done: true }));

const seedPlans: RewardPlan[] = [
  { id: "p1", userId: "CP", month: CURRENT_MONTH, scope: "W1", rewardText: "Reward: treat yourself", penaltyText: "Penalty: no social media" },
  { id: "p2", userId: "CP", month: CURRENT_MONTH, scope: "W2", rewardText: "Reward: small gift", penaltyText: "Penalty: do extra chores" },
  { id: "p3", userId: "CP", month: CURRENT_MONTH, scope: "W3", rewardText: "Reward: free time", penaltyText: "Penalty: skip dessert" },
  { id: "p4", userId: "CP", month: CURRENT_MONTH, scope: "W4", rewardText: "Reward: new item", penaltyText: "Penalty: no take-out" },
  { id: "p5", userId: "CP", month: CURRENT_MONTH, scope: "MONTH", rewardText: "Reward: weekend trip", penaltyText: "Penalty: donate 200" },
  { id: "p6", userId: "JX", month: CURRENT_MONTH, scope: "W1", rewardText: "Reward: treat yourself", penaltyText: "Penalty: no social media" },
  { id: "p7", userId: "JX", month: CURRENT_MONTH, scope: "W2", rewardText: "Reward: small gift", penaltyText: "Penalty: do extra chores" },
  { id: "p8", userId: "JX", month: CURRENT_MONTH, scope: "W3", rewardText: "Reward: free time", penaltyText: "Penalty: skip dessert" },
  { id: "p9", userId: "JX", month: CURRENT_MONTH, scope: "W4", rewardText: "Reward: new item", penaltyText: "Penalty: no take-out" },
  { id: "p10", userId: "JX", month: CURRENT_MONTH, scope: "MONTH", rewardText: "Reward: weekend trip", penaltyText: "Penalty: donate 200" },
];

const seedLedger: RewardEntry[] = [
  { id: "r1", userId: "CP", type: "reward", content: "Reward: treat yourself", source: "2026-04 W1", status: "used", notes: "Note A", remarks: "Remark A" },
  { id: "r2", userId: "JX", type: "reward", content: "Reward: treat yourself", source: "2026-04 W1", status: "pending", expiry: "2026-05-15" },
  { id: "r3", userId: "CP", type: "penalty", content: "Penalty: no social media", source: "2026-03 W4", status: "used", notes: "Note B" },
  { id: "r4", userId: "JX", type: "reward", content: "Reward: small gift", source: "2026-04 W2", status: "pending", expiry: "2026-05-10" },
  { id: "r5", userId: "CP", type: "reward", content: "Reward: small gift", source: "2026-04 W2", status: "pending", expiry: "2026-05-10" },
  { id: "r6", userId: "JX", type: "penalty", content: "Penalty: do extra chores", source: "2026-03 W2", status: "forfeited", notes: "Note C" },
  { id: "r7", userId: "CP", type: "reward", content: "Reward: weekend trip", source: "2026-03 月度", status: "used", notes: "Note D" },
];

interface AppState {
  currentUser: UserId | null;
  currentMonth: string;
  today: string;
  tasks: Task[];
  logs: DailyLog[];
  plans: RewardPlan[];
  ledger: RewardEntry[];

  login: (user: UserId, password: string) => boolean;
  logout: () => void;

  setLog: (taskId: string, date: string, patch: Partial<DailyLog>) => void;
  addTimerLog: (taskId: string, date: string, minutes: number, backfilled: boolean) => void;
  deleteLog: (logId: string) => void;
  upsertTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  upsertPlan: (p: RewardPlan) => void;
  updateLedger: (id: string, patch: Partial<RewardEntry>) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      currentMonth: CURRENT_MONTH,
      today: TODAY,
      tasks: seedTasks,
      logs: seedLogs,
      plans: seedPlans,
      ledger: seedLedger,

      login: (user, password) => {
        // demo: any non-empty password works for CP / JX
        if ((user === "CP" || user === "JX") && password.length > 0) {
          set({ currentUser: user });
          return true;
        }
        return false;
      },
      logout: () => set({ currentUser: null }),

      setLog: (taskId, date, patch) => {
        const logs = [...get().logs];
        const idx = logs.findIndex((l) => l.taskId === taskId && l.date === date);
        if (idx >= 0) logs[idx] = { ...logs[idx], ...patch };
        else logs.push({ id: `l-${Date.now()}-${Math.random()}`, taskId, date, ...patch });
        set({ logs });
      },
      addTimerLog: (taskId, date, minutes, backfilled) => {
        set({
          logs: [
            ...get().logs,
            {
              id: `l-${Date.now()}-${Math.random()}`,
              taskId,
              date,
              minutes,
              backfilled,
              createdAt: Date.now(),
            },
          ],
        });
      },
      deleteLog: (logId) => set({ logs: get().logs.filter((l) => l.id !== logId) }),
      upsertTask: (t) => {
        const tasks = [...get().tasks];
        const i = tasks.findIndex((x) => x.id === t.id);
        if (i >= 0) tasks[i] = t; else tasks.push(t);
        set({ tasks });
      },
      deleteTask: (id) => set({ tasks: get().tasks.filter((t) => t.id !== id) }),
      upsertPlan: (p) => {
        const plans = [...get().plans];
        const i = plans.findIndex((x) => x.userId === p.userId && x.month === p.month && x.scope === p.scope);
        if (i >= 0) plans[i] = p; else plans.push(p);
        set({ plans });
      },
      updateLedger: (id, patch) => {
        set({ ledger: get().ledger.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
      },
    }),
    {
      name: "streakpact-store",
      partialize: (s) => ({
        currentUser: s.currentUser,
        tasks: s.tasks,
        logs: s.logs,
        plans: s.plans,
        ledger: s.ledger,
      }),
    },
  ),
);
