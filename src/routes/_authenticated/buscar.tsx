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
  error?: string;
  product?: { id: string; plate: string; chassis?: string; account_id?: string } | null;
  openEntry?: { id: string } | null;
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
    const placa = query.trim().toUpperCase();
    const { data, error: err } = await apiCall<{ placa: string }, BuscaResponse>(
      "buscar-produto",
      { placa },
    );
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    // `buscar-produto` retorna { error: "Produto não encontrado" } com status 200 quando não acha
    if (data?.error || !data?.product) {
      navigate({ to: "/cadastro/$placa", params: { placa }, search: { mode: "create" } });
      return;
    }
    const product = data.product;
    const openEntryId = data.openEntry?.id ?? null;
    if (openEntryId) {
      navigate({
        to: "/cadastro/$placa",
        params: { placa },
        search: { mode: "edit", entry: openEntryId, cadastro: product.id },
      });
      return;
    }
    // Cadastro existe, sem entrada aberta → cria nova entrada vinculada ao mesmo produto
    navigate({
      to: "/cadastro/$placa",
      params: { placa },
      search: { mode: "create", cadastro: product.id },
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
