import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Estilo padronizado dos campos do app (espelha o visual usado na tela de login).
 * Aplique a inputs/textarea/triggers via className.
 */
export const formFieldClass =
  "h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 text-[15px] text-foreground shadow-none outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[0_0_0_4px_rgba(201,24,38,0.10)] focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_rgba(201,24,38,0.10)] focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Variante para Textarea — mesma identidade visual sem altura fixa.
 */
export const formTextareaClass =
  "w-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-[15px] text-foreground shadow-none outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[0_0_0_4px_rgba(201,24,38,0.10)] focus-visible:border-primary focus-visible:shadow-[0_0_0_4px_rgba(201,24,38,0.10)] focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60";

export function FormField({
  label,
  children,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
