import { LogOut } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";

export function AppTopbar({
  title,
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
      <div className="flex items-center justify-between gap-3 px-4 py-3.5">
        <Link to="/buscar" className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-sm font-black tracking-tight">
            WR
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium uppercase tracking-wider text-white/70">
              {title ?? "WR Leilões"}
            </p>
            <p className="truncate text-sm font-semibold">
              {subtitle ?? (user?.name ? `Olá, ${firstName(user.name)}` : "Operação")}
            </p>
          </div>
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
