import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { applySession, loginWithPassword, loginWithTotp, rememberIdentity } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import wrLogo from "@/assets/wr-logo.svg";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — WR Vistoria" },
      { name: "description", content: "Acesse o app de vistoria." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { redirect: redirectTo } = Route.useSearch();
  const [stage, setStage] = useState<"password" | "totp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const goNext = () => {
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      router.history.replace(redirectTo);
      return;
    }
    navigate({ to: "/buscar", replace: true });
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) goNext();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await loginWithPassword(email.trim(), password);
    setLoading(false);
    if (!res.ok && "requires_2fa" in res && res.requires_2fa) {
      setTempToken(res.temp_token);
      setStage("totp");
      return;
    }
    if (!res.ok) {
      setError("message" in res ? res.message : "Falha ao entrar.");
      return;
    }
    rememberIdentity(res.user, res.account);
    await applySession(res.token, res.refresh_token);
    router.invalidate();
    goNext();
  }

  async function submitTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!tempToken) return;
    setError(null);
    setLoading(true);
    const res = await loginWithTotp(tempToken, totp.trim());
    setLoading(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    rememberIdentity(res.user, res.account);
    await applySession(res.token, res.refresh_token);
    router.invalidate();
    goNext();
  }

  return (
    <div className="min-h-dvh bg-[#F4F5F7]">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        {/* Header vermelho premium */}
        <header
          className="relative px-7 pb-24 pt-14 text-white"
          style={{
            background:
              "linear-gradient(160deg, #990E18 0%, #C91826 100%)",
            paddingTop: "calc(env(safe-area-inset-top) + 3.5rem)",
          }}
        >
          <img
            src={wrLogo}
            alt="WR Leilões"
            className="h-12 w-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
          />
          <h1 className="mt-7 text-2xl font-bold leading-tight tracking-tight">
            Acesse sua conta
          </h1>
          <p className="mt-2 text-sm font-medium text-white/[0.82]">
            Pátio, vistoria e conferência veicular.
          </p>
        </header>

        {/* Card flutuante */}
        <main className="flex-1 px-6">
          <div
            className="-mt-13 rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-white p-7"
            style={{
              marginTop: "-52px",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.10)",
            }}
          >
            <div className="mb-6">
              <h2 className="text-base font-bold text-foreground">
                {stage === "password" ? "Entrar no sistema" : "Verificação 2FA"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stage === "password"
                  ? "Use suas credenciais para continuar."
                  : "Informe o código de 6 dígitos do seu app autenticador."}
              </p>
            </div>

            {!isSupabaseConfigured && (
              <Alert className="mb-4">
                <AlertDescription className="text-xs">
                  Variáveis Supabase não configuradas. O login não vai funcionar.
                </AlertDescription>
              </Alert>
            )}

            {stage === "password" ? (
              <form onSubmit={submitPassword} className="space-y-5">
                <FieldShell label="E-MAIL" htmlFor="email">
                  <FieldInput
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seuemail@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    icon={<Mail className="h-4 w-4" />}
                  />
                </FieldShell>
                <FieldShell label="SENHA" htmlFor="password">
                  <FieldInput
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    icon={<Lock className="h-4 w-4" />}
                  />
                </FieldShell>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <PrimaryButton type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
                    </>
                  ) : (
                    "Entrar"
                  )}
                </PrimaryButton>

                <button
                  type="button"
                  className="block w-full pt-1 text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Esqueci minha senha
                </button>
              </form>
            ) : (
              <form onSubmit={submitTotp} className="space-y-5">
                <FieldShell label="CÓDIGO 2FA" htmlFor="totp">
                  <FieldInput
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                    required
                    icon={<ShieldCheck className="h-4 w-4" />}
                    inputClassName="text-center text-xl font-bold tracking-[0.4em]"
                  />
                </FieldShell>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <PrimaryButton type="submit" disabled={loading || totp.length < 6}>
                  {loading ? "Validando…" : "Confirmar"}
                </PrimaryButton>

                <button
                  type="button"
                  className="block w-full pt-1 text-center text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => {
                    setStage("password");
                    setTempToken(null);
                    setTotp("");
                  }}
                >
                  Voltar
                </button>
              </form>
            )}
          </div>
        </main>

        <footer
          className="mt-auto px-6 pt-8 pb-8 text-center"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <p className="text-[11px] font-medium text-muted-foreground/70">
            v1.0
          </p>
        </footer>
      </div>
    </div>
  );
}

function FieldShell({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={htmlFor}
        className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function FieldInput({
  icon,
  inputClassName,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ReactNode;
  inputClassName?: string;
}) {
  return (
    <div className="group relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
        {icon}
      </span>
      <input
        {...props}
        className={
          "h-14 w-full rounded-2xl border border-[#E5E7EB] bg-white pl-11 pr-4 text-[15px] text-foreground outline-none transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:shadow-[0_0_0_4px_rgba(201,24,38,0.10)] " +
          (inputClassName ?? "")
        }
      />
    </div>
  );
}

function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={
        "inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-bold text-primary-foreground shadow-[0_12px_24px_rgba(201,24,38,0.24)] transition-all hover:bg-[color:var(--primary-dark)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none " +
        (className ?? "")
      }
    >
      {children}
    </button>
  );
}
