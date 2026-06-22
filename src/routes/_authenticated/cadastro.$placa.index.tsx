import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MobileShell } from "@/components/mobile/MobileShell";
import { AppTopbar } from "@/components/mobile/AppTopbar";
import { BottomActionBar, BottomBarButton } from "@/components/mobile/BottomActionBar";
import { StatusBadge } from "@/components/mobile/StatusBadge";
import { Stepper } from "@/components/wizard/Stepper";
import { StepVeiculo } from "@/components/wizard/StepVeiculo";
import { StepEntrada } from "@/components/wizard/StepEntrada";
import { StepFotos } from "@/components/wizard/StepFotos";
import { StepCaracteristicas } from "@/components/wizard/StepCaracteristicas";
import {
  StepVistoria,
  emptyVistoria,
  type VistoriaForm,
} from "@/components/wizard/StepVistoria";
import {
  clearWizard,
  emptyWizard,
  loadWizard,
  saveWizard,
  type WizardState,
} from "@/lib/wizard-state";
import { useAuth } from "@/hooks/use-auth";
import { signOut } from "@/lib/auth";
import { cadastrarProduto } from "@/lib/api/cadastro";
import { salvarVistoria } from "@/lib/api/vistoria";
import { buscarProduto } from "@/lib/api/buscar";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

const STEPS = [
  { id: 2, label: "Veículo" },
  { id: 3, label: "Entrada" },
  { id: 4, label: "Caract." },
  { id: 5, label: "Fotos" },
  { id: 6, label: "Vistoria" },
];

const searchSchema = z.object({
  step: z.coerce.number().min(2).max(6).catch(2),
});

export const Route = createFileRoute("/_authenticated/cadastro/$placa/")({
  validateSearch: searchSchema,
  head: ({ params }) => ({ meta: [{ title: `Cadastro ${params.placa}` }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const { placa } = Route.useParams();
  const { step } = Route.useSearch();
  const navigate = useNavigate();
  const { user, account } = useAuth();

  const [data, setData] = useState<WizardState>(
    () => loadWizard(placa) ?? emptyWizard(placa),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiredOk, setRequiredOk] = useState(false);
  const [vistoria, setVistoria] = useState<VistoriaForm>(() => {
    const saved = loadWizard(placa);
    if (saved?.vistoria) return saved.vistoria;
    return emptyVistoria();
  });

  useEffect(() => {
    saveWizard({ ...data, vistoria });
  }, [data]);

  useEffect(() => {
    saveWizard({ ...data, vistoria });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vistoria]);

  useEffect(() => {
    if (!data.productId) return;
    let cancelled = false;
    (async () => {
      const res = await buscarProduto({ uuid: data.productId });
      if (cancelled || !res.found || !res.data) return;
      const p = res.data.product;
      setVistoria({
        engineNumberVehicle: p.engine_number_vehicle ?? "",
        engineNumberBase: p.engine_number_base ?? "",
        chassisNumberVehicle: p.chassis_number_vehicle ?? "",
        chassisNumberBase: p.chassis_number_base ?? "",
        engineDivs: new Set(p.engine_discrepancies_uuid),
        chassisDivs: new Set(p.chassis_discrepancies_uuid),
        rejectionReasons: new Set(p.rejection_reasons_uuid),
        initialCondition: p.initial_status_uuid ?? "",
        finalClassification: p.final_classification_uuid ?? "",
        finalApproval:
          p.final_approval_status === "aprovado"
            ? "approved"
            : p.final_approval_status === "reprovado"
              ? "rejected"
              : "",
        rejectionNotes: p.rejection_notes ?? "",
        notes: "",
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.productId]);

  function update(p: Partial<WizardState>) {
    setData((prev) => ({ ...prev, ...p }));
  }

  function go(next: number) {
    navigate({
      to: "/cadastro/$placa",
      params: { placa },
      search: { step: next },
      replace: true,
    });
  }

  const status = useMemo(() => {
    if (data.mode === "edit")
      return { tone: "success" as const, label: "Encontrado" };
    if (data.mode === "reentry")
      return { tone: "warning" as const, label: "Reentrada" };
    return { tone: "muted" as const, label: "Novo cadastro" };
  }, [data.mode]);

  const subtitle = useMemo(() => {
    if (data.mode === "edit") return "Entrada em aberto — editando";
    if (data.mode === "reentry")
      return "Dados operacionais herdados da última saída";
    return "Cadastrar veículo do zero";
  }, [data.mode]);

  async function saveStep3() {
    if (!user?.uuid) {
      await signOut();
      navigate({
        to: "/auth",
        search: {
          redirect: window.location.pathname + window.location.search,
        },
        replace: true,
      });
      return;
    }
    if (!data.branchId) {
      setError("Filial é obrigatória.");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await cadastrarProduto({
      user_data: { uuid: user.uuid, account_uuid: user.account_uuid ?? undefined },
      product: {
        uuid: data.productId,
        plate: data.plate,
        chassis: data.chassis || null,
        renavam: data.renavam || null,
        engine: data.engine || null,
        color: data.color || null,
        has_key: data.hasKey,
        mileage: data.mileage ? Number(data.mileage) : null,
        type_uuid: data.typeId || null,
        branch_uuid: data.branchId,
        deposit_uuid: data.depositId || null,
        consignor_uuid: data.principalId || null,
        entry_type_uuid: data.entryTypeId || null,
        km_initial: null,
        km_final: null,
      },
      fipe_data: {
        brand: data.brand || null,
        model: data.model || null,
        fuel: data.fuel || null,
        fipe_codigo: data.fipeCodigo || null,
        price: data.fipePrice ? Number(data.fipePrice) : null,
      },
    });
    setSaving(false);
    if (!res.ok) {
      if (res.code === "OPEN_ENTRY_EXISTS") {
        setError(
          "Já existe entrada aberta para este veículo. Volte à busca e abra como edição.",
        );
      } else {
        setError(`${res.code}: ${res.message}`);
      }
      return;
    }
    update({ productId: res.productId, entryId: res.entryId, mode: "edit" });
    toast.success(res.isUpdate ? "Atualizado" : "Cadastrado");
    go(4);
  }

  async function finishVistoria() {
    if (!data.entryId) return;
    if (vistoria.finalApproval === "rejected" && !vistoria.rejectionNotes.trim()) {
      setError("Reprovação exige observação.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await salvarVistoria({
        entryId: data.entryId,
        engineNumberVehicle: vistoria.engineNumberVehicle || null,
        engineNumberBase: vistoria.engineNumberBase || null,
        chassisNumberVehicle: vistoria.chassisNumberVehicle || null,
        chassisNumberBase: vistoria.chassisNumberBase || null,
        engineDiscrepancies: [...vistoria.engineDivs],
        chassisDiscrepancies: [...vistoria.chassisDivs],
        rejectionReasons:
          vistoria.finalApproval === "rejected"
            ? [...vistoria.rejectionReasons]
            : [],
        initialConditionUuid: vistoria.initialCondition || null,
        finalClassificationUuid: vistoria.finalClassification || null,
        finalApproval: vistoria.finalApproval || null,
        rejectionNotes: vistoria.rejectionNotes || null,
        notes: vistoria.notes || null,
      });
      // Persiste atributos (características) selecionados — replace strategy
      try {
        await supabase
          .from("product_attributes")
          .delete()
          .eq("product_entry_id", data.entryId);
        if (data.attributeIds.length > 0) {
          await supabase.from("product_attributes").insert(
            data.attributeIds.map((id) => ({
              product_entry_id: data.entryId,
              attribute_id: id,
              value: "",
            })),
          );
        }
      } catch (err) {
        console.error("[finishVistoria] falha ao salvar atributos", err);
      }
      const finishedMode = data.mode;
      const finishedApproval = vistoria.finalApproval || "none";
      clearWizard(data.plate);
      toast.success("Vistoria concluída");
      navigate({
        to: "/cadastro/$placa/sucesso",
        params: { placa: data.plate },
        search: { mode: finishedMode, approval: finishedApproval },
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar vistoria");
    } finally {
      setSaving(false);
    }
  }

  const bottom = (
    <BottomActionBar>
      {step > 2 && (
        <BottomBarButton variant="secondary" onClick={() => go(step - 1)}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </BottomBarButton>
      )}
      {step === 2 && (
        <BottomBarButton onClick={() => go(3)}>Continuar</BottomBarButton>
      )}
      {step === 3 && (
        <BottomBarButton
          onClick={saveStep3}
          disabled={saving || !data.branchId}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            "Salvar e continuar"
          )}
        </BottomBarButton>
      )}
      {step === 4 && (
        <BottomBarButton onClick={() => go(5)} disabled={!data.entryId}>
          Ir para fotos
        </BottomBarButton>
      )}
      {step === 5 && (
        <BottomBarButton onClick={() => go(6)} disabled={!requiredOk}>
          Ir para vistoria
        </BottomBarButton>
      )}
      {step === 6 && (
        <BottomBarButton
          onClick={finishVistoria}
          disabled={saving || !data.entryId}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" /> Concluir
            </>
          )}
        </BottomBarButton>
      )}
    </BottomActionBar>
  );

  return (
    <MobileShell topbar={<AppTopbar />} bottom={bottom}>
      {/* Sticky header: cancela o padding do wrapper interno e gruda nas bordas */}
      <div
        className="sticky top-0 z-20 bg-background shadow-sm"
        style={{
          marginLeft: "calc(-1 * var(--page-padding))",
          marginRight: "calc(-1 * var(--page-padding))",
          marginTop: "calc(-1 * var(--space-5))",
          paddingLeft: "var(--page-padding)",
          paddingRight: "var(--page-padding)",
          paddingTop: "var(--space-5)",
          paddingBottom: "12px",
        }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: "/buscar" })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Nova consulta
          </button>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Placa
          </p>
          <h1 className="font-mono text-3xl font-black tracking-[0.15em] text-foreground">
            {placa}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Stepper steps={STEPS} current={step} onJump={(id) => go(id)} />
      </div>

      {/* Conteúdo scrollável */}
      <div className="mt-4 space-y-4">
        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div
          key={step}
          className="animate-in fade-in slide-in-from-bottom-1 duration-200"
        >
          {step === 2 && (
            <Suspense fallback={<WizardLoading />}>
              <StepVeiculo
                data={data}
                update={update}
                preFilled={data.mode === "new" && !!data.brand}
                lockIdentity={data.mode !== "new"}
              />
            </Suspense>
          )}

          {step === 3 && (
            <Suspense fallback={<WizardLoading />}>
              <StepEntrada data={data} update={update} />
            </Suspense>
          )}

          {step === 4 && (
            <Suspense fallback={<WizardLoading />}>
              <StepCaracteristicas
                entryId={data.entryId}
                productId={data.productId}
                selectedIds={data.attributeIds}
                onChange={(ids) => update({ attributeIds: ids })}
              />
            </Suspense>
          )}

          {step === 5 && (
            <Suspense fallback={<WizardLoading />}>
              {data.productId && data.entryId && account?.id ? (
                <StepFotos
                  productId={data.productId}
                  entryId={data.entryId}
                  accountId={account.id}
                  onAllRequiredDone={setRequiredOk}
                />
              ) : (
                <Alert>
                  <AlertDescription>
                    Salve a etapa de entrada primeiro para anexar fotos.
                  </AlertDescription>
                </Alert>
              )}
            </Suspense>
          )}

          {step === 6 && (
            <Suspense fallback={<WizardLoading />}>
              <StepVistoria form={vistoria} setForm={setVistoria} />
            </Suspense>
          )}
        </div>
      </div>
    </MobileShell>
  );
}

function WizardLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
