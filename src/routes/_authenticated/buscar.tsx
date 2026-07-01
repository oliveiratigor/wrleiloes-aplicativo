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
import { saveWizard, emptyWizard, type WizardState, type WizardMode } from "@/lib/wizard-state";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type FoundResult = {
  plate: string;
  navId: string;
  brand: string;
  model: string;
  colorId: string;
  colorName: string;
  entryDate: string | null;
  entryTypeName: string | null;
  mode: WizardMode;
  wiz: WizardState;
};

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
  const [found, setFound] = useState<FoundResult | null>(null);

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
    setFound(null);
    const id = detectIdentifier(value);
    if (id.kind === "invalid") {
      setError(id.reason);
      return;
    }
    setLoading(true);
    try {
      const buscarPayload = id.kind === "plate" ? { plate: id.plate } : { chassis: id.chassis };
      const [busca, consulta] = await Promise.all([
        buscarProduto(buscarPayload),
        id.kind === "plate"
          ? consultaVeiculo({ plate: id.plate })
          : consultaVeiculo({ chassis: id.chassis }),
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
        const ident = id.kind === "plate" ? id.plate : id.chassis;
        const wiz = emptyWizard(id.kind === "plate" ? id.plate : "", "new");
        if (id.kind === "chassis") wiz.chassis = id.chassis;
        if (consulta.data) {
          applyConsulta(wiz, consulta.data);
        } else {
          wiz.isManual = true;
        }
        pushRecent(ident);
        setFound({
          plate: id.kind === "plate" ? id.plate : "",
          navId: ident,
          brand: wiz.brand,
          model: wiz.model,
          colorId: "",
          colorName: wiz.color,
          entryDate: null,
          entryTypeName: null,
          mode: "new",
          wiz,
        });
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
      wiz.colorId = product.color ?? "";
      wiz.color = "";
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

      pushRecent(navPlate || product.plate);

      const [colorResult, entryTypeResult] = await Promise.all([
        product.color
          ? supabase.from("colors").select("name").eq("id", product.color).maybeSingle()
          : Promise.resolve({ data: null as { name: string } | null }),
        product.entry_type_uuid
          ? supabase.from("entry_types").select("name").eq("id", product.entry_type_uuid).maybeSingle()
          : Promise.resolve({ data: null as { name: string } | null }),
      ]);

      wiz.color = colorResult.data?.name ?? "";


      setFound({
        plate: navPlate || product.plate,
        navId: navPlate || product.plate,
        brand: wiz.brand,
        model: wiz.model,
        colorId: product.color ?? "",
        colorName: colorResult.data?.name ?? "",
        entryDate: open ? (product.entry_date ?? null) : null,
        entryTypeName: entryTypeResult.data?.name ?? null,
        mode,
        wiz,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  function confirmFound() {
    if (!found) return;
    saveWizard(found.wiz);
    navigate({
      to: "/cadastro/$placa",
      params: { placa: found.navId },
      search: { step: 2 },
    });
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
                <Search className="h-4 w-4" /> Consultar
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
            Digite a placa ou chassi para localizar ou iniciar um novo cadastro.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="plate"
            className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            Placa ou chassi
          </label>
          <PlateInput
            id="plate"
            autoFocus
            placeholder="ABC1D23"
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              if (found) setFound(null);
            }}
          />
        </div>

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>

      {found && (
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-lg font-black tracking-widest">
              {found.navId}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider",
                found.mode === "edit"
                  ? "bg-amber-100 text-amber-800"
                  : found.mode === "reentry"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800",
              )}
            >
              {found.mode === "edit"
                ? "Entrada em aberto"
                : found.mode === "reentry"
                  ? "Nova entrada"
                  : "Novo veículo"}
            </span>
          </div>

          {(found.brand || found.model) && (
            <p className="text-base font-semibold uppercase text-foreground">
              {[found.brand, found.model].filter(Boolean).join(" ")}
            </p>
          )}

          {(found.colorName || found.entryTypeName || found.entryDate) && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {found.colorName && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Cor
                  </span>
                  <p className="uppercase text-foreground">
                    {found.colorName.toUpperCase()}
                  </p>
                </div>
              )}
              {found.entryTypeName && (
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Motivo
                  </span>
                  <p className="uppercase text-foreground">{found.entryTypeName}</p>
                </div>
              )}
              {found.entryDate && (
                <div className="col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Entrada
                  </span>
                  <p className="text-foreground">
                    {new Date(found.entryDate).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(found.entryDate).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={confirmFound}
            className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition active:scale-[0.98]"
          >
            {found.mode === "edit"
              ? "Editar veículo"
              : found.mode === "reentry"
                ? "Iniciar nova entrada"
                : "Cadastrar veículo"}
          </button>

          <button
            type="button"
            onClick={() => {
              setFound(null);
              setQuery("");
            }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Buscar outro veículo
          </button>
        </div>
      )}

      {!found && recent.length > 0 && (
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
