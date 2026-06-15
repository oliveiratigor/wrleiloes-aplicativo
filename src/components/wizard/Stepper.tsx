import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { id: number; label: string };

export function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: Step[];
  current: number;
  onJump?: (id: number) => void;
}) {
  return (
    <ol className="flex w-full items-center gap-2 overflow-x-auto pb-2">
      {steps.map((s) => {
        const done = s.id < current;
        const active = s.id === current;
        const clickable = !!onJump && done;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2 min-w-0">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(s.id)}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                active && "bg-primary text-primary-foreground border-primary",
                done && !active && "bg-primary/10 text-primary border-primary/30",
                !active && !done && "bg-muted text-muted-foreground border-muted-foreground/20",
                clickable && "cursor-pointer",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : s.id}
            </button>
            <span
              className={cn(
                "truncate text-xs",
                active ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
