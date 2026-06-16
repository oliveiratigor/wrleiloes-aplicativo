import { useSuspenseQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { FormField, formFieldClass } from "@/components/shared/FormField";
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
    <div className="space-y-5">
      {preFilled && (
        <Badge variant="secondary">Pré-preenchido pela consulta WR</Badge>
      )}

      <FormField label="Placa">
        <Input
          className={formFieldClass}
          value={data.plate}
          onChange={(e) => update({ plate: e.target.value.toUpperCase() })}
          disabled={lockIdentity}
          required
        />
      </FormField>
      <FormField label="Chassi">
        <Input
          className={formFieldClass}
          value={data.chassis}
          onChange={(e) => update({ chassis: e.target.value.toUpperCase() })}
          disabled={lockIdentity}
        />
      </FormField>
      <FormField label="Renavam">
        <Input
          className={formFieldClass}
          value={data.renavam}
          onChange={(e) => update({ renavam: e.target.value })}
          disabled={lockIdentity}
        />
      </FormField>
      <FormField label="Motor">
        <Input
          className={formFieldClass}
          value={data.engine}
          onChange={(e) => update({ engine: e.target.value })}
        />
      </FormField>
      <FormField label="Marca">
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
      </FormField>
      <FormField label="Modelo">
        <Input
          className={formFieldClass}
          value={data.model}
          onChange={(e) => update({ model: e.target.value })}
        />
      </FormField>
      <FormField label="Cor">
        <SearchableSelect
          options={cores}
          value={data.color}
          onChange={(v) => update({ color: v })}
        />
      </FormField>
      <FormField label="Combustível">
        <Input
          className={formFieldClass}
          value={data.fuel}
          onChange={(e) => update({ fuel: e.target.value })}
          placeholder="Ex.: Flex"
        />
      </FormField>
      <FormField label="Ano fab.">
        <Input
          className={formFieldClass}
          inputMode="numeric"
          value={data.yearManufacture}
          onChange={(e) =>
            update({ yearManufacture: e.target.value.replace(/\D/g, "").slice(0, 4) })
          }
        />
      </FormField>
      <FormField label="Ano mod.">
        <Input
          className={formFieldClass}
          inputMode="numeric"
          value={data.yearModel}
          onChange={(e) =>
            update({ yearModel: e.target.value.replace(/\D/g, "").slice(0, 4) })
          }
        />
      </FormField>
      <FormField label="KM">
        <Input
          className={formFieldClass}
          inputMode="numeric"
          value={data.mileage}
          onChange={(e) => update({ mileage: e.target.value.replace(/\D/g, "") })}
        />
      </FormField>
      <FormField label="Tipo">
        <SearchableSelect
          options={tipos}
          value={data.typeId}
          onChange={(v) => update({ typeId: v })}
        />
      </FormField>
      <FormField label="Tem chave">
        <div className="flex h-14 items-center rounded-2xl border border-[#E5E7EB] bg-white px-4">
          <Switch
            checked={data.hasKey}
            onCheckedChange={(v) => update({ hasKey: v })}
          />
          <span className="ml-2 text-sm text-muted-foreground">
            {data.hasKey ? "Sim" : "Não"}
          </span>
        </div>
      </FormField>
      <FormField label="Código FIPE">
        <Input
          className={formFieldClass}
          value={data.fipeCodigo}
          onChange={(e) => update({ fipeCodigo: e.target.value })}
        />
      </FormField>
      <FormField label="Valor FIPE (R$)">
        <Input
          className={formFieldClass}
          inputMode="decimal"
          value={data.fipePrice}
          onChange={(e) => update({ fipePrice: e.target.value })}
        />
      </FormField>
    </div>
  );
}
