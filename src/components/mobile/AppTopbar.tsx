import { LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
  return (
    <header
      className="bg-[color:var(--primary-dark)] text-white"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link to="/buscar" className="flex min-w-0 items-center gap-3">
          <img
            src={wrLogo.url}
            alt="WR Leilões"
            className="h-8 w-auto shrink-0"
          />
          <p className="truncate text-sm font-semibold text-white/90">
            {subtitle ?? (user?.name ? `Olá, ${firstName(user.name)}` : "Operação")}
          </p>
        </Link>
        <button
          type="button"
          onClick={() => signOut()}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 transition hover:bg-white/20 active:bg-white/30"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

