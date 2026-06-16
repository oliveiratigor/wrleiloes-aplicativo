import { useSuspenseQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { tiposQuery, coresQuery, marcasQuery } from "@/lib/api/lookups";
import type { WizardState } from "@/lib/wizard-state";

export function StepVeiculo({
  data,
  update,
  preFilled,
  lockIdentity,
}: {
  data: WizardState;
  update: (p: Partial<WizardState>) => void;
  preFilled?: boolean;
  lockIdentity?: boolean;
}) {
  const tipos = useSuspenseQuery(tiposQuery).data;
  const cores = useSuspenseQuery(coresQuery).data;
  const marcas = useSuspenseQuery(marcasQuery).data;

  return (
    <div className="space-y-4">
      {preFilled && (
        <Badge variant="secondary">Pré-preenchido pela consulta WR</Badge>
      )}
      <div className="space-y-3">
        <Field label="Placa">
          <Input
            value={data.plate}
            onChange={(e) => update({ plate: e.target.value.toUpperCase() })}
            disabled={lockIdentity}
            required
          />
        </Field>
        <Field label="Chassi">
          <Input
            value={data.chassis}
            onChange={(e) => update({ chassis: e.target.value.toUpperCase() })}
            disabled={lockIdentity}
          />
        </Field>
        <Field label="Renavam">
          <Input
            value={data.renavam}
            onChange={(e) => update({ renavam: e.target.value })}
            disabled={lockIdentity}
          />
        </Field>
        <Field label="Motor">
          <Input
            value={data.engine}
            onChange={(e) => update({ engine: e.target.value })}
          />
        </Field>
        <Field label="Marca">
          <SearchableSelect
            options={marcas}
            value={data.brand}
            onChange={(v) => update({ brand: v })}
          />
          {data.brand && !marcas.some((m) => m.value === data.brand) && (
            <p className="mt-1 text-[11px] text-amber-600">
              Marca "{data.brand}" não cadastrada — selecione uma opção.
            </p>
          )}
        </Field>
        <Field label="Modelo">
          <Input
            value={data.model}
            onChange={(e) => update({ model: e.target.value })}
          />
        </Field>
        <Field label="Cor">
          <SearchableSelect
            options={cores}
            value={data.color}
            onChange={(v) => update({ color: v })}
          />
        </Field>
        <Field label="Combustível">
          <Input
            value={data.fuel}
            onChange={(e) => update({ fuel: e.target.value })}
            placeholder="Ex.: Flex"
          />
        </Field>
        <Field label="Ano fab.">
          <Input
            inputMode="numeric"
            value={data.yearManufacture}
            onChange={(e) =>
              update({ yearManufacture: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
          />
        </Field>
        <Field label="Ano mod.">
          <Input
            inputMode="numeric"
            value={data.yearModel}
            onChange={(e) =>
              update({ yearModel: e.target.value.replace(/\D/g, "").slice(0, 4) })
            }
          />
        </Field>
        <Field label="KM">
          <Input
            inputMode="numeric"
            value={data.mileage}
            onChange={(e) => update({ mileage: e.target.value.replace(/\D/g, "") })}
          />
        </Field>
        <Field label="Tipo">
          <SearchableSelect
            options={tipos}
            value={data.typeId}
            onChange={(v) => update({ typeId: v })}
          />
        </Field>
        <Field label="Tem chave">
          <div className="flex h-10 items-center">
            <Switch
              checked={data.hasKey}
              onCheckedChange={(v) => update({ hasKey: v })}
            />
            <span className="ml-2 text-sm text-muted-foreground">
              {data.hasKey ? "Sim" : "Não"}
            </span>
          </div>
        </Field>
        <Field label="Código FIPE">
          <Input
            value={data.fipeCodigo}
            onChange={(e) => update({ fipeCodigo: e.target.value })}
          />
        </Field>
        <Field label="Valor FIPE (R$)">
          <Input
            inputMode="decimal"
            value={data.fipePrice}
            onChange={(e) => update({ fipePrice: e.target.value })}
          />
        </Field>
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
