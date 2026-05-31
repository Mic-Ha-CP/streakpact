import { cn } from "@/lib/utils";
import type { UserId } from "@/data/models";

export const ProgressBar = ({
  value,
  max,
  user,
  className,
}: {
  value: number;
  max: number;
  user?: UserId;
  className?: string;
}) => {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  const passed = value >= max;
  const fill = passed
    ? "bg-success"
    : user === "JX"
      ? "bg-jx"
      : "bg-primary";
  return (
    <div className={cn("w-full h-2 rounded-full bg-muted overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-500", fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};
