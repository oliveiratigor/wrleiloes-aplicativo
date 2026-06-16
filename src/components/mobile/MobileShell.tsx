import { cn } from "@/lib/utils";

export function MobileShell({
  topbar,
  bottom,
  children,
  className,
}: {
  topbar?: React.ReactNode;
  bottom?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
        {topbar}
        <main
          className={cn(
            "flex-1 px-4 pb-6 pt-4",
            bottom && "pb-28",
            className,
          )}
          style={{
            paddingBottom: bottom
              ? "calc(7rem + env(safe-area-inset-bottom))"
              : "calc(1.5rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>
        {bottom}
      </div>
    </div>
  );
}
