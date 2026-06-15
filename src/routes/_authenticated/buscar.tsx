import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { buscarProduto, detectIdentifier, hasOpenEntry } from "@/lib/api/buscar";
import { consultaVeiculo } from "@/lib/api/consulta";
import { saveWizard, emptyWizard, type WizardState } from "@/lib/wizard-state";

export const Route = createFileRoute("/_authenticated/buscar")({
  head: () => ({ meta: [{ title: "Buscar veículo" }] }),
  component: BuscarPage,
});

function BuscarPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = detectIdentifier(query);
    if (id.kind === "invalid") {
      setError(id.reason);
      return;
    }
    setLoading(true);
    try {
      const buscarPayload = id.kind === "plate" ? { plate: id.plate } : { renavam: id.renavam };
      const [busca, consulta] = await Promise.all([
        buscarProduto(buscarPayload),
        // WR API só aceita placa/chassi — pula em renavam puro
        id.kind === "plate"
          ? consultaVeiculo({ plate: id.plate })
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (busca.error) {
        setError(busca.error);
        return;
      }

      // Placa de navegação: prioriza o que o backend devolveu; senão usa o input (só placa)
      const navPlate = (busca.data && "product" in busca.data
        ? busca.data.product.plate
        : id.kind === "plate" ? id.plate : "") || "";

      // Não encontrado → novo cadastro, pré-preenchido pela consulta WR
      if (!busca.found || !busca.data) {
        if (id.kind !== "plate") {
          setError("Renavam não encontrado. Para novo cadastro, busque pela placa.");
          return;
        }
        const wiz = emptyWizard(id.plate, "new");
        if (consulta.data) applyConsulta(wiz, consulta.data);
        saveWizard(wiz);
        navigate({ to: "/cadastro/$placa", params: { placa: id.plate }, search: { step: 2 } });
        return;
      }

      const { product, fipe_data } = busca.data;
      const open = hasOpenEntry(busca.data);
      const mode: "edit" | "reentry" = open ? "edit" : "reentry";
      const wiz = emptyWizard(placa, mode);
      wiz.productId = product.uuid;
      wiz.plate = product.plate;
      wiz.chassis = product.chassis ?? "";
      wiz.renavam = product.renavam ?? "";
      wiz.engine = product.engine ?? "";
      wiz.color = product.color ?? "";
      wiz.mileage = product.mileage != null ? String(product.mileage) : "";
      wiz.hasKey = !!product.has_key;
      wiz.typeId = product.type_uuid ?? "";
      wiz.brand = fipe_data.brand ?? "";
      wiz.model = fipe_data.model ?? "";
      wiz.fuel = fipe_data.fuel ?? "";
      wiz.fipeCodigo = fipe_data.fipe_codigo ?? "";
      wiz.fipePrice = fipe_data.price != null ? String(fipe_data.price) : "";
      wiz.yearModel = fipe_data.year ?? "";
      wiz.branchId = product.branch_uuid ?? "";
      wiz.depositId = product.deposit_uuid ?? "";
      wiz.principalId = product.consignor_uuid ?? "";
      wiz.entryTypeId = product.entry_type_uuid ?? "";
      wiz.chargeTowing = !!product.charge_towing;
      wiz.kmInitial = product.towing_km_initial != null ? String(product.towing_km_initial) : "";
      wiz.kmFinal = product.towing_km_final != null ? String(product.towing_km_final) : "";
      saveWizard(wiz);

      // edit = pula direto para passo 3 (operacional já preenchido) e segue
      // reentry = também passo 3, mas operacional editável vindo da última saída
      navigate({ to: "/cadastro/$placa", params: { placa }, search: { step: 3 } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto flex max-w-md items-center justify-between pb-4">
        <div>
          <h1 className="text-lg font-semibold">Buscar veículo</h1>
          {user?.name && (
            <p className="text-xs text-muted-foreground">
              {user.name} {user.role && <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{user.role}</Badge>}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Sair</Button>
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

function applyConsulta(
  wiz: WizardState,
  c: { placa?: string; chassi?: string; renavam?: string; marca?: string; modelo?: string; cor?: string; combustivel?: string; ano_fabricacao?: string; ano_modelo?: string; motor?: string; cod_fipe?: string },
) {
  wiz.plate = c.placa || wiz.plate;
  wiz.chassis = c.chassi || "";
  wiz.renavam = c.renavam || "";
  wiz.engine = c.motor || "";
  wiz.brand = c.marca || "";
  wiz.model = c.modelo || "";
  wiz.color = c.cor || "";
  wiz.fuel = (c.combustivel || "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("/");
  wiz.yearManufacture = c.ano_fabricacao || "";
  wiz.yearModel = c.ano_modelo || "";
  wiz.fipeCodigo = c.cod_fipe || "";
}
