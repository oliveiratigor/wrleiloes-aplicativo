import { useSuspenseQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import {
  filiaisQuery,
  depositosQuery,
  comitentesQuery,
  tiposEntradaQuery,
} from "@/lib/api/lookups";
import type { WizardState } from "@/lib/wizard-state";

export function StepEntrada({
  data,
  update,
}: {
  data: WizardState;
  update: (p: Partial<WizardState>) => void;
}) {
  const filiais = useSuspenseQuery(filiaisQuery).data;
  const depositos = useSuspenseQuery(depositosQuery).data;
  const comitentes = useSuspenseQuery(comitentesQuery).data;
  const tiposEntrada = useSuspenseQuery(tiposEntradaQuery).data;

  return (
    <div className="space-y-4">
      <Field label="Filial *">
        <SearchableSelect
          options={filiais}
          value={data.branchId}
          onChange={(v) => update({ branchId: v })}
          placeholder="Selecionar filial…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Depósito">
          <SearchableSelect
            options={depositos}
            value={data.depositId}
            onChange={(v) => update({ depositId: v })}
          />
        </Field>
        <Field label="Comitente">
          <SearchableSelect
            options={comitentes}
            value={data.principalId}
            onChange={(v) => update({ principalId: v })}
          />
        </Field>
      </div>
      <Field label="Tipo de entrada">
        <SearchableSelect
          options={tiposEntrada}
          value={data.entryTypeId}
          onChange={(v) => update({ entryTypeId: v })}
        />
      </Field>
      <div className="rounded-md border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Cobrar guincho</Label>
          <Switch
            checked={data.chargeTowing}
            onCheckedChange={(v) => update({ chargeTowing: v })}
          />
        </div>
        {data.chargeTowing && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="KM inicial">
              <Input
                inputMode="numeric"
                value={data.kmInitial}
                onChange={(e) =>
                  update({ kmInitial: e.target.value.replace(/\D/g, "") })
                }
              />
            </Field>
            <Field label="KM final">
              <Input
                inputMode="numeric"
                value={data.kmFinal}
                onChange={(e) =>
                  update({ kmFinal: e.target.value.replace(/\D/g, "") })
                }
              />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
