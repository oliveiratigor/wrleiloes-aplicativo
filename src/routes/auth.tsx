import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { applySession, loginWithPassword, loginWithTotp } from "@/lib/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

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
    await applySession(res.token, res.refresh_token);
    router.invalidate();
    navigate({ to: "/buscar", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>WR Vistoria</CardTitle>
          <p className="text-sm text-muted-foreground">
            {stage === "password" ? "Entre com suas credenciais" : "Informe o código 2FA"}
          </p>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured && (
            <Alert className="mb-4">
              <AlertDescription>
                Variáveis <code>VITE_SUPABASE_URL</code> e{" "}
                <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> não configuradas. O login não vai
                funcionar até apontar para o Supabase do Backoffice.
              </AlertDescription>
            </Alert>
          )}
          {stage === "password" ? (
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          ) : (
            <form onSubmit={submitTotp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="totp">Código 2FA</Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading || totp.length < 6}>
                {loading ? "Validando…" : "Confirmar"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStage("password");
                  setTempToken(null);
                  setTotp("");
                }}
              >
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
