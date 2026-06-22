import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Clock, Loader2, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MobileShell } from "@/components/mobile/MobileShell";
import { AppTopbar } from "@/components/mobile/AppTopbar";
import { BottomActionBar, BottomBarButton } from "@/components/mobile/BottomActionBar";
import { PlateInput } from "@/components/mobile/PlateInput";
import { buscarProduto, detectIdentifier, hasOpenEntry } from "@/lib/api/buscar";
import { consultaVeiculo } from "@/lib/api/consulta";
import { saveWizard, emptyWizard, type WizardState } from "@/lib/wizard-state";

const RECENT_KEY = "wr-recent-plates";

export const Route = createFileRoute("/_authenticated/buscar")({
  head: () => ({ meta: [{ title: "Buscar veículo" }] }),
  component: BuscarPage,
});

function BuscarPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  function pushRecent(plate: string) {
    const next = [plate, ...recent.filter((p) => p !== plate)].slice(0, 5);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
  }

  async function runSearch(value: string) {
    setError(null);
    const id = detectIdentifier(value);
    if (id.kind === "invalid") {
      setError(id.reason);
      return;
    }
    setLoading(true);
    try {
      const buscarPayload = id.kind === "plate" ? { plate: id.plate } : { renavam: id.renavam };
      const [busca, consulta] = await Promise.all([
        buscarProduto(buscarPayload),
        id.kind === "plate"
          ? consultaVeiculo({ plate: id.plate })
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (busca.error) {
        setError(busca.error);
        return;
      }

      const navPlate =
        (busca.data && "product" in busca.data
          ? busca.data.product.plate
          : id.kind === "plate"
            ? id.plate
            : "") || "";

      if (!busca.found || !busca.data) {
        if (id.kind !== "plate") {
          setError("Renavam não encontrado. Para novo cadastro, busque pela placa.");
          return;
        }
        const wiz = emptyWizard(id.plate, "new");
        if (consulta.data) {
          applyConsulta(wiz, consulta.data);
        } else {
          // FIPE sem dados → modo manual (veículo estrangeiro ou não cadastrado)
          wiz.isManual = true;
        }
        saveWizard(wiz);
        pushRecent(id.plate);
        navigate({ to: "/cadastro/$placa", params: { placa: id.plate }, search: { step: 2 } });
        return;

      }

      const { product, fipe_data } = busca.data;
      const open = hasOpenEntry(busca.data);
      const mode: "edit" | "reentry" = open ? "edit" : "reentry";
      const wiz = emptyWizard(navPlate || product.plate, mode);
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
      saveWizard(wiz);

      pushRecent(navPlate || product.plate);
      navigate({
        to: "/cadastro/$placa",
        params: { placa: navPlate || product.plate },
        search: { step: 3 },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  return (
    <MobileShell
      topbar={<AppTopbar />}
      bottom={
        <BottomActionBar>
          <BottomBarButton
            type="submit"
            form="search-form"
            disabled={loading || !query}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Buscando…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Consultar placa
              </>
            )}
          </BottomBarButton>
        </BottomActionBar>
      }
    >
      <form id="search-form" onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-black leading-tight text-foreground">
            Pesquisar veículo
          </h1>
          <p className="text-sm text-muted-foreground">
            Digite a placa para localizar ou iniciar um novo cadastro.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="plate"
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Placa ou renavam
          </label>
          <PlateInput
            id="plate"
            autoFocus
            placeholder="ABC1D23"
            value={query}
            onValueChange={setQuery}
          />
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      {recent.length > 0 && (
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Últimas consultas
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((plate) => (
              <button
                key={plate}
                type="button"
                onClick={() => {
                  setQuery(plate);
                  runSearch(plate);
                }}
                className="rounded-full border border-border bg-card px-3.5 py-2 font-mono text-sm font-bold tracking-wider text-foreground transition hover:border-primary hover:bg-[color:var(--primary-soft)] hover:text-primary active:scale-95"
              >
                {plate}
              </button>
            ))}
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function applyConsulta(
  wiz: WizardState,
  c: {
    placa?: string;
    chassi?: string;
    renavam?: string;
    marca?: string;
    modelo?: string;
    cor?: string;
    combustivel?: string;
    ano_fabricacao?: string;
    ano_modelo?: string;
    motor?: string;
    cod_fipe?: string;
  },
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
