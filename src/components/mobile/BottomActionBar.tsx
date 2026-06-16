import { cn } from "@/lib/utils";

export function BottomActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="border-t border-border"
      style={{
        background: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "saturate(140%) blur(16px)",
        boxShadow: "var(--shadow-bar)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="mx-auto flex max-w-md items-center gap-2"
        style={{
          minHeight: "var(--bottom-bar-height)",
          paddingLeft: "var(--page-padding)",
          paddingRight: "var(--page-padding)",
          paddingTop: "12px",
          paddingBottom: "12px",
        }}
      >
        {children}
      </div>
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
