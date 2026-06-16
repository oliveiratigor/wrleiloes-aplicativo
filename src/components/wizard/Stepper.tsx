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
  const total = steps.length;
  const activeIdx = Math.max(0, steps.findIndex((s) => s.id === current));
  const progress = ((activeIdx + 1) / total) * 100;
  const active = steps[activeIdx];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>
          Etapa {activeIdx + 1} de {total}
        </span>
        <span className="text-foreground">{active?.label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => {
          const done = i < activeIdx;
          const isActive = i === activeIdx;
          const clickable = !!onJump && done;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onJump?.(s.id)}
              aria-label={s.label}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                isActive && "bg-primary",
                done && "bg-primary/70 hover:bg-primary",
                !isActive && !done && "bg-muted",
                clickable && "cursor-pointer",
              )}
              style={isActive ? { boxShadow: `inset ${progress}% 0 0 var(--primary)` } : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

// Variante numerada compacta — útil para revisão.
export function StepperDots({
  steps,
  current,
}: {
  steps: Step[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((s) => {
        const done = s.id < current;
        const active = s.id === current;
        return (
          <li
            key={s.id}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full border text-[11px] font-bold",
              active && "border-primary bg-primary text-primary-foreground",
              done && !active && "border-primary/40 bg-primary/10 text-primary",
              !active && !done && "border-border bg-muted text-muted-foreground",
            )}
          >
            {done ? <Check className="h-3 w-3" /> : s.id}
          </li>
        );
      })}
    </ol>
  );
}
