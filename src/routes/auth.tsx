import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BottomBarButton } from "@/components/mobile/BottomActionBar";
import { applySession, loginWithPassword, loginWithTotp, rememberIdentity } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import wrLogo from "@/assets/wr-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  ssr: false,
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
  const [stage, setStage] = useState<"password" | "totp">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [totp, setTotp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/buscar", replace: true });
    });
  }, [navigate]);

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
    navigate({ to: "/buscar", replace: true });
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
    navigate({ to: "/buscar", replace: true });
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        {/* Header vermelho */}
        <div
          className="relative bg-gradient-to-br from-[color:var(--primary-dark)] to-primary px-6 pb-20 pt-16 text-white"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 4rem)" }}
        >
          <img
            src={wrLogo.url}
            alt="WR Leilões"
            className="h-12 w-auto"
          />
          <p className="mt-5 max-w-xs text-sm font-medium text-white/85">
            Operação de pátio e vistoria veicular.
          </p>
        </div>

        {/* Card sobreposto */}
        <div className="-mt-12 flex-1 px-4">
          <div
            className="rounded-2xl border border-border bg-card p-6"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="mb-5">
              <h2 className="text-lg font-bold text-foreground">
                {stage === "password" ? "Entrar" : "Verificação"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {stage === "password"
                  ? "Acesse com suas credenciais."
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
              <form onSubmit={submitPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 rounded-xl pl-10 text-base"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Senha
                  </Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 rounded-xl pl-10 text-base"
                    />
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <BottomBarButton type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Entrando…
                    </>
                  ) : (
                    "Entrar"
                  )}
                </BottomBarButton>
                <button
                  type="button"
                  className="block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Esqueci minha senha
                </button>
              </form>
            ) : (
              <form onSubmit={submitTotp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Código 2FA
                  </Label>
                  <div className="relative">
                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="totp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={totp}
                      onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                      required
                      className="h-12 rounded-xl pl-10 text-center text-xl font-bold tracking-[0.4em]"
                    />
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <BottomBarButton type="submit" disabled={loading || totp.length < 6} className="w-full">
                  {loading ? "Validando…" : "Confirmar"}
                </BottomBarButton>
                <button
                  type="button"
                  className="block w-full py-2 text-center text-sm font-medium text-muted-foreground hover:text-foreground"
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
        </div>
      </div>
    </div>
  );
}
