import { LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import wrLogo from "@/assets/wr-logo.svg";

export function AppTopbar({
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const greeting = user?.name ? `Olá, ${firstName(user.name)}` : "Olá";

  async function handleSignOut() {
    try {
      await signOut();
    } finally {
      navigate({ to: "/auth", replace: true });
    }
  }

  return (
    <header
      className="relative flex flex-col text-white"
      style={{
        height: "calc(var(--header-height) + env(safe-area-inset-top))",
        paddingTop: "calc(env(safe-area-inset-top) + 20px)",
        paddingLeft: "var(--page-padding)",
        paddingRight: "var(--page-padding)",
        paddingBottom: "16px",
        background: "linear-gradient(160deg, #990E18 0%, #C91826 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <img
          src={wrLogo}
          alt="WR Leilões"
          className="h-9 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
        />
        <button
          type="button"
          onClick={handleSignOut}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 active:bg-white/30"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-auto">
        <h1 className="text-xl font-bold leading-tight tracking-tight">
          {greeting}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs font-medium text-white/[0.82]">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
