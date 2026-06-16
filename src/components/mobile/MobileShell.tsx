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
    <div className="bg-white" style={{ height: "100dvh", overflow: "hidden" }}>
      <div
        className="relative mx-auto max-w-md bg-white"
        style={{ height: "100dvh" }}
      >
        <main
          className={cn("no-scrollbar h-full overflow-y-auto", className)}
          style={{
            paddingTop: topbar
              ? "var(--header-height)"
              : "env(safe-area-inset-top)",
            paddingBottom: bottom
              ? "calc(var(--bottom-bar-height) + env(safe-area-inset-bottom))"
              : "env(safe-area-inset-bottom)",
          }}
        >
          <div
            style={{
              paddingLeft: "var(--page-padding)",
              paddingRight: "var(--page-padding)",
              paddingTop: "var(--space-5)",
              paddingBottom: "var(--space-5)",
            }}
          >
            {children}
          </div>
        </main>

        {topbar && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30">
            <div className="pointer-events-auto">{topbar}</div>
          </div>
        )}

        {bottom && (
          <div className="absolute inset-x-0 bottom-0 z-30">{bottom}</div>
        )}
      </div>
    </div>
  );
}
