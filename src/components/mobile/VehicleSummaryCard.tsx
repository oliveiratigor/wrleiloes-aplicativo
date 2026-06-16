import { Bike, Car, Truck } from "lucide-react";
import { StatusBadge } from "./StatusBadge";

export function VehicleSummaryCard({
  plate,
  type,
  brand,
  model,
  year,
  color,
  badge,
}: {
  plate: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: string;
  color?: string;
  badge?: { tone: "success" | "muted" | "warning"; label: string };
}) {
  const Icon = iconFor(type);
  return (
    <section
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-white to-[color:var(--primary-soft)] p-4"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Placa
        </p>
        <p className="font-mono text-3xl font-black tracking-[0.15em] text-foreground">
          {plate}
        </p>
      </div>
      <div className="mt-3 space-y-0.5">
        <p className="text-sm font-bold leading-tight text-foreground">
          {brand || model ? `${brand ?? ""} ${model ?? ""}`.trim() : "Sem dados de modelo"}
        </p>
        <p className="text-xs text-muted-foreground">
          {[type, year, color].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>
    </section>
  );
}

function iconFor(type?: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("moto")) return Bike;
  if (t.includes("caminh") || t.includes("truck")) return Truck;
  return Car;
}
