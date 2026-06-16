import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-4",
        className,
      )}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </div>
  );
}

export function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 truncate text-right text-sm font-semibold text-foreground",
          mono && "font-mono",
          (value === undefined || value === null || value === "") && "text-muted-foreground/60 font-normal",
        )}
      >
        {value === undefined || value === null || value === "" ? "—" : value}
      </dd>
    </div>
  );
}
