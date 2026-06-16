import { cn } from "@/lib/utils";

type Tone = "success" | "muted" | "warning" | "danger" | "info";

export function StatusBadge({
  tone = "muted",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        tone === "success" && "bg-[color:var(--success-soft)] text-[color:var(--success)]",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "warning" && "bg-amber-50 text-amber-700",
        tone === "danger" && "bg-[color:var(--primary-soft)] text-primary",
        tone === "info" && "bg-blue-50 text-blue-700",
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
