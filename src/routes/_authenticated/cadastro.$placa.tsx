import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/wizard/Stepper";
import { StepVeiculo } from "@/components/wizard/StepVeiculo";
import { StepEntrada } from "@/components/wizard/StepEntrada";
import { StepFotos } from "@/components/wizard/StepFotos";
import { StepVistoria, emptyVistoria, type VistoriaForm } from "@/components/wizard/StepVistoria";
import {
  clearWizard,
  emptyWizard,
  loadWizard,
  saveWizard,
  type WizardState,
} from "@/lib/wizard-state";
import { useAuth } from "@/hooks/use-auth";
import { cadastrarProduto } from "@/lib/api/cadastro";
import { salvarVistoria } from "@/lib/api/vistoria";
import { buscarProduto } from "@/lib/api/buscar";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Busca" },
  { id: 2, label: "Veículo" },
  { id: 3, label: "Entrada" },
  { id: 4, label: "Fotos" },
  { id: 5, label: "Vistoria" },
];

const searchSchema = z.object({
  step: z.coerce.number().min(1).max(5).catch(2),
});

export const Route = createFileRoute("/_authenticated/cadastro/$placa")({
  validateSearch: searchSchema,
  head: ({ params }) => ({ meta: [{ title: `Cadastro ${params.placa}` }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const { placa } = Route.useParams();
  const { step } = Route.useSearch();
  const navigate = useNavigate();
  const { user, account } = useAuth();

  const [data, setData] = useState<WizardState>(() => loadWizard(placa) ?? emptyWizard(placa));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiredOk, setRequiredOk] = useState(false);
  const [vistoria, setVistoria] = useState<VistoriaForm>(emptyVistoria);

  // Persiste a cada mudança
  useEffect(() => {
    saveWizard(data);
  }, [data]);

  // Hidrata vistoria quando há entrada aberta
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

  const subtitle = useMemo(() => {
    if (data.mode === "edit") return "Entrada em aberto — editando";
    if (data.mode === "reentry") return "Reentrada — operacional herdado da última saída";
    return "Novo cadastro";
  }, [data.mode]);

  async function saveStep3() {
    if (!user?.uuid) {
      setError("Sessão sem identidade — refaça login.");
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
        uuid: data.mode === "edit" ? data.productId : data.productId, // backend reusa por placa
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
        charge_towing: data.chargeTowing,
        km_initial: data.kmInitial ? Number(data.kmInitial) : null,
        km_final: data.kmFinal ? Number(data.kmFinal) : null,
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
        setError("Já existe entrada aberta para este veículo. Volte à busca e abra como edição.");
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
          vistoria.finalApproval === "rejected" ? [...vistoria.rejectionReasons] : [],
        initialConditionUuid: vistoria.initialCondition || null,
        finalClassificationUuid: vistoria.finalClassification || null,
        finalApproval: vistoria.finalApproval || null,
        rejectionNotes: vistoria.rejectionNotes || null,
        notes: vistoria.notes || null,
        chargeTow: data.chargeTowing,
        kmInitial: data.kmInitial ? Number(data.kmInitial) : null,
        kmFinal: data.kmFinal ? Number(data.kmFinal) : null,
      });
      clearWizard(data.plate);
      toast.success("Vistoria concluída");
      navigate({ to: "/buscar" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar vistoria");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md pb-3">
        <Link to="/buscar" className="text-sm text-muted-foreground hover:underline">
          ← Voltar para busca
        </Link>
      </div>
      <Card className="mx-auto max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{placa}</CardTitle>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <Stepper steps={STEPS} current={step} onJump={(id) => go(id)} />
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 2 && (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <StepVeiculo
                data={data}
                update={update}
                preFilled={data.mode === "new" && !!data.brand}
                lockIdentity={data.mode !== "new"}
              />
              <NavButtons onNext={() => go(3)} />
            </Suspense>
          )}

          {step === 3 && (
            <Suspense fallback={<Skeleton className="h-48 w-full" />}>
              <StepEntrada data={data} update={update} />
              <NavButtons
                onBack={() => go(2)}
                onNext={saveStep3}
                nextLabel={saving ? "Salvando…" : "Salvar e continuar"}
                disabled={saving || !data.branchId}
              />
            </Suspense>
          )}

          {step === 4 && (
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              {data.productId && data.entryId && account?.id ? (
                <>
                  <StepFotos
                    productId={data.productId}
                    entryId={data.entryId}
                    accountId={account.id}
                    onAllRequiredDone={setRequiredOk}
                  />
                  <NavButtons
                    onBack={() => go(3)}
                    onNext={() => go(5)}
                    nextLabel="Ir para vistoria"
                    disabled={!requiredOk}
                  />
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Salve o passo 3 primeiro para anexar fotos.
                  </AlertDescription>
                </Alert>
              )}
            </Suspense>
          )}

          {step === 5 && (
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <StepVistoria form={vistoria} setForm={setVistoria} />
              <NavButtons
                onBack={() => go(4)}
                onNext={finishVistoria}
                nextLabel={saving ? "Salvando…" : "Concluir"}
                disabled={saving || !data.entryId}
              />
            </Suspense>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NavButtons({
  onBack,
  onNext,
  nextLabel = "Continuar",
  disabled,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2 pt-2">
      {onBack && (
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Voltar
        </Button>
      )}
      <Button type="button" onClick={onNext} disabled={disabled} className="flex-1">
        {nextLabel}
      </Button>
    </div>
  );
}
