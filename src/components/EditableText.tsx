import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onSave: (next: string) => void;
  /** Display-mode placeholder shown when value is empty. */
  emptyLabel?: string;
  /** Edit-mode input placeholder. */
  placeholder?: string;
  /** Read-only: render the value, no edit affordance. */
  disabled?: boolean;
  multiline?: boolean;
  className?: string;
}

/**
 * Display ⇄ edit text field. Defaults to display mode; tapping the value (or the
 * pencil) opens an editor with Save/Cancel. Save commits via onSave and locks back
 * to display; Cancel discards. Enter saves (single-line) / Esc cancels.
 */
export const EditableText = ({
  value,
  onSave,
  emptyLabel = "添加备注",
  placeholder = "",
  disabled = false,
  multiline = false,
  className,
}: EditableTextProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const open = () => {
    if (disabled) return;
    setDraft(value);
    setEditing(true);
  };

  const save = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className={cn(
          "group flex items-start gap-2 rounded-xl px-3 py-2 text-sm min-h-[40px]",
          disabled ? "bg-muted/30" : "bg-muted/40 cursor-text hover:bg-muted/60",
          className,
        )}
        onClick={open}
        role={disabled ? undefined : "button"}
        tabIndex={disabled ? undefined : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            open();
          }
        }}
      >
        <span className={cn("flex-1 whitespace-pre-wrap break-words", !value && "text-muted-foreground")}>
          {value || emptyLabel}
        </span>
        {!disabled && (
          <Pencil className="w-3.5 h-3.5 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {multiline ? (
        <Textarea
          autoFocus
          value={draft}
          placeholder={placeholder}
          className="rounded-xl text-sm min-h-[44px]"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
        />
      ) : (
        <Input
          autoFocus
          value={draft}
          placeholder={placeholder}
          className="rounded-xl"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
            if (e.key === "Enter") save();
          }}
        />
      )}
      <div className="flex items-center gap-1.5">
        <button
          onClick={save}
          aria-label="保存"
          className="pill bg-success text-success-foreground border border-success"
        >
          <Check className="w-3 h-3" /> 保存
        </button>
        <button
          onClick={cancel}
          aria-label="取消"
          className="pill bg-card text-muted-foreground border border-border hover:text-danger hover:border-danger"
        >
          <X className="w-3 h-3" /> 取消
        </button>
      </div>
    </div>
  );
};
