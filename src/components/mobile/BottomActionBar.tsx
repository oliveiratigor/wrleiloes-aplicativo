import { cn } from "@/lib/utils";

export function BottomActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-30 border-t border-border bg-white/90 backdrop-blur-md"
      style={{
        boxShadow: "var(--shadow-bar)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="mx-auto flex max-w-md gap-2 px-7 py-3">{children}</div>
    </div>
  );
}

export function BottomBarButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-primary text-primary-foreground shadow-sm hover:bg-[color:var(--primary-dark)]",
        variant === "secondary" &&
          "border border-border bg-card text-foreground hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:bg-muted",
        className,
      )}
    />
  );
}
