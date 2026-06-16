import { LogOut } from "lucide-react";
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
  const greeting = user?.name ? `Olá, ${firstName(user.name)}` : "Olá";
  return (
    <header
      className="relative flex flex-col px-7 pb-10 pt-12 text-white"
      style={{
        background: "linear-gradient(160deg, #990E18 0%, #C91826 100%)",
        paddingTop: "calc(env(safe-area-inset-top) + 3rem)",
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
          onClick={() => signOut()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20 active:bg-white/30"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-8">
        <h1 className="text-2xl font-bold leading-tight tracking-tight">
          {greeting}
        </h1>
        <p className="mt-2 text-sm font-medium text-white/[0.82]">
          {subtitle ?? "Bem-vindo de volta."}
        </p>
      </div>
    </header>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
