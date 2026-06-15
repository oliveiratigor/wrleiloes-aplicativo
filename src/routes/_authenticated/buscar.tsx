import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiCall } from "@/lib/api";
import { signOut } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/buscar")({
  head: () => ({ meta: [{ title: "Buscar veículo" }] }),
  component: BuscarPage,
});

type BuscaResponse = {
  cadastro?: {
    id: string;
    placa: string;
    chassi?: string;
    has_active_entry: boolean;
    active_entry_id?: string | null;
  } | null;
};

function BuscarPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Reaproveita endpoint do Backoffice. Ajuste o nome quando confirmarmos.
    const { data, error: err } = await apiCall<{ placa: string }, BuscaResponse>(
      "buscar-produto",
      { placa: query.trim().toUpperCase() },
    );
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    const placa = query.trim().toUpperCase();
    const cadastro = data?.cadastro ?? null;
    if (!cadastro) {
      // Sem cadastro → criar novo
      navigate({ to: "/cadastro/$placa", params: { placa }, search: { mode: "create" } });
      return;
    }
    if (cadastro.has_active_entry && cadastro.active_entry_id) {
      // Cadastro existe + entrada ativa → editar
      navigate({
        to: "/cadastro/$placa",
        params: { placa },
        search: { mode: "edit", entry: cadastro.active_entry_id },
      });
      return;
    }
    // Cadastro existe + sem entrada ativa → cria nova entrada vinculada
    navigate({
      to: "/cadastro/$placa",
      params: { placa },
      search: { mode: "create", cadastro: cadastro.id },
    });
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex max-w-md items-center justify-between pb-4">
        <h1 className="text-lg font-semibold">Buscar veículo</h1>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sair
        </Button>
      </div>
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Placa ou chassi</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q">Identificador</Label>
              <Input
                id="q"
                autoFocus
                placeholder="ABC1D23"
                value={query}
                onChange={(e) => setQuery(e.target.value.toUpperCase())}
                required
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading || !query}>
              {loading ? "Buscando…" : "Continuar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
