import type { ElementType } from "react";
import { cn } from "@/lib/utils";
import { Check, X, Minus, Loader2 } from "lucide-react";
import type { WeekStatus } from "@/data/calc";

export const WeekBadge = ({
  label,
  status,
  size = "md",
  onClick,
  active,
}: {
  label: string;
  status: WeekStatus;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  active?: boolean;
}) => {
  const sizes = {
    sm: "w-9 h-9 text-[10px]",
    md: "w-12 h-12 text-xs",
    lg: "w-14 h-14 text-sm",
  };
  const palette = {
    success: "bg-success-soft text-success ring-success/30",
    fail: "bg-danger-soft text-danger ring-danger/30",
    pending: "bg-muted text-muted-foreground ring-border",
    "in-progress": "bg-secondary-soft text-secondary-foreground ring-secondary/40",
  }[status];

  const icon = {
    success: <Check className="w-4 h-4" strokeWidth={3} />,
    fail: <X className="w-4 h-4" strokeWidth={3} />,
    pending: <Minus className="w-3.5 h-3.5" />,
    "in-progress": <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  }[status];

  const Comp: ElementType = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-2xl flex flex-col items-center justify-center gap-0.5 ring-1 transition-all",
        sizes[size],
        palette,
        onClick && "hover:scale-105 active:scale-95 cursor-pointer",
        active && "ring-2 ring-primary shadow-pop",
      )}
    >
      {icon}
      <span className="font-bold leading-none">{label}</span>
    </Comp>
  );
};
