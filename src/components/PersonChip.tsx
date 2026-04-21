import { cn } from "@/lib/utils";
import type { UserId } from "@/data/types";

export const PersonChip = ({ user, className }: { user: UserId; className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold",
      user === "CP" ? "bg-cp-soft text-cp" : "bg-jx-soft text-jx",
      className,
    )}
  >
    <span className={cn("w-1.5 h-1.5 rounded-full", user === "CP" ? "bg-cp" : "bg-jx")} />
    {user}
  </span>
);
