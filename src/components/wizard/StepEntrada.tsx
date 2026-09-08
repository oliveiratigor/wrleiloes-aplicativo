import { useEffect, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { FormField } from "@/components/shared/FormField";
import {
  filiaisQueryFor,
  depositosQueryFor,
  comitentesQueryFor,
  tiposEntradaQuery,
} from "@/lib/api/lookups";
import { useAuth } from "@/hooks/use-auth";
import type { WizardState } from "@/lib/wizard-state";


export function StepEntrada({
  data,
  update,
  errors,
}: {
  data: WizardState;
  update: (p: Partial<WizardState>) => void;
  errors?: Record<string, string>;
}) {
  const { user } = useAuth();
  const filiais = useSuspenseQuery(filiaisQueryFor(user)).data;
  const depositos = useSuspenseQuery(depositosQueryFor(data.branchId)).data;
  const comitentes = useSuspenseQuery(comitentesQueryFor(user)).data;
  const tiposEntrada = useSuspenseQuery(tiposEntradaQuery).data;

  const isAdmin = !!user?.is_super_admin;
  const singleBranch = filiais.length === 1;
  const branchLocked = !isAdmin && singleBranch;

  // Auto-seleciona a única filial permitida
  useEffect(() => {
    if (singleBranch && !data.branchId) update({ branchId: filiais[0].value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleBranch]);

  // Limpa depositId quando a filial muda e o depósito atual não pertence a ela
  useEffect(() => {
    if (!data.depositId) return;
    const valid = depositos.some((d) => d.value === data.depositId);
    if (!valid) update({ depositId: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.branchId, depositos]);

  const branchForbidden = useMemo(() => {
    if (!data.branchId || isAdmin) return false;
    return !filiais.some((f) => f.value === data.branchId);
  }, [data.branchId, isAdmin, filiais]);

  return (
    <div className="space-y-5">
      <FormField
        error={errors?.branchId}
        label={
          <span className="flex items-center gap-2">
            Filial *
            {branchLocked && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] normal-case tracking-normal">
                Filial fixa do usuário
              </Badge>
            )}
          </span>
        }
      >
        <SearchableSelect
          options={filiais}
          value={data.branchId}
          onChange={(v) => update({ branchId: v })}
          placeholder="Selecionar filial…"
          disabled={branchLocked}
          invalid={!!errors?.branchId}
        />
        {branchForbidden && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              A filial deste produto não está entre as suas filiais permitidas.
              Selecione uma filial válida para prosseguir.
            </AlertDescription>
          </Alert>
        )}
        {filiais.length === 0 && (
          <Alert variant="destructive" className="mt-2">
            <AlertDescription>
              Seu usuário não tem nenhuma filial atribuída. Solicite ao
              administrador para liberar acesso.
            </AlertDescription>
          </Alert>
        )}
      </FormField>
      <FormField label="Depósito *" error={errors?.depositId}>
        <SearchableSelect
          options={depositos}
          value={data.depositId}
          onChange={(v) => update({ depositId: v })}
          invalid={!!errors?.depositId}
        />
      </FormField>
      <FormField label="Comitente *" error={errors?.principalId}>
        <SearchableSelect
          options={comitentes}
          value={data.principalId}
          onChange={(v) => update({ principalId: v })}
          invalid={!!errors?.principalId}
        />
      </FormField>
      <FormField label="Tipo de entrada *" error={errors?.entryTypeId}>
        <SearchableSelect
          options={tiposEntrada}
          value={data.entryTypeId}
          onChange={(v) => update({ entryTypeId: v })}
          invalid={!!errors?.entryTypeId}
        />
      </FormField>
    </div>
  );
}
