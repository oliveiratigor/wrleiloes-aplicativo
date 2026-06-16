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
    <div className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white">
        {topbar}
        <main
          className={cn(
            "flex-1 px-4 pt-8 pb-6",
            topbar && "-mt-6 rounded-t-[28px] bg-white px-6",
            bottom && "pb-28",
            className,
          )}
          style={{
            boxShadow: topbar
              ? "0 -8px 24px rgba(15, 23, 42, 0.06)"
              : undefined,
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

