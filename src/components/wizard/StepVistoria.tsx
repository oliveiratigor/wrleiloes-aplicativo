import { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormField, formFieldClass, formTextareaClass } from "@/components/shared/FormField";
import { verificationStatusQuery } from "@/lib/api/lookups";
import type { VerificationStatus } from "@/lib/api/types";

export type VistoriaForm = {
  engineNumberVehicle: string;
  engineNumberBase: string;
  chassisNumberVehicle: string;
  chassisNumberBase: string;
  engineDivs: Set<string>;
  chassisDivs: Set<string>;
  rejectionReasons: Set<string>;
  initialCondition: string;
  finalClassification: string;
  finalApproval: "approved" | "rejected" | "";
  rejectionNotes: string;
  notes: string;
};

export function emptyVistoria(): VistoriaForm {
  return {
    engineNumberVehicle: "",
    engineNumberBase: "",
    chassisNumberVehicle: "",
    chassisNumberBase: "",
    engineDivs: new Set(),
    chassisDivs: new Set(),
    rejectionReasons: new Set(),
    initialCondition: "",
    finalClassification: "",
    finalApproval: "",
    rejectionNotes: "",
    notes: "",
  };
}

export function StepVistoria({
  form,
  setForm,
}: {
  form: VistoriaForm;
  setForm: (next: VistoriaForm) => void;
}) {
  const statuses = useSuspenseQuery(verificationStatusQuery).data;
  const byKind = useMemo(() => groupBy(statuses), [statuses]);

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  return (
    <div className="divide-y divide-border/60">
      <Section title="Motor">
        <div className="space-y-3">
          <Field label="Nº no veículo">
            <Input
              className={formFieldClass}
              value={form.engineNumberVehicle}
              onChange={(e) =>
                setForm({ ...form, engineNumberVehicle: e.target.value })
              }
            />
          </Field>
          <Field label="Nº na base">
            <Input
              className={formFieldClass}
              value={form.engineNumberBase}
              onChange={(e) =>
                setForm({ ...form, engineNumberBase: e.target.value })
              }
            />
          </Field>
        </div>
        <CheckList
          options={byKind.engine}
          selected={form.engineDivs}
          onToggle={(id) =>
            setForm({ ...form, engineDivs: toggle(form.engineDivs, id) })
          }
        />
      </Section>

      <Section title="Chassi">
        <div className="space-y-3">
          <Field label="Nº no veículo">
            <Input
              className={formFieldClass}
              value={form.chassisNumberVehicle}
              onChange={(e) =>
                setForm({ ...form, chassisNumberVehicle: e.target.value })
              }
            />
          </Field>
          <Field label="Nº na base">
            <Input
              className={formFieldClass}
              value={form.chassisNumberBase}
              onChange={(e) =>
                setForm({ ...form, chassisNumberBase: e.target.value })
              }
            />
          </Field>
        </div>
        <CheckList
          options={byKind.chassis}
          selected={form.chassisDivs}
          onToggle={(id) =>
            setForm({ ...form, chassisDivs: toggle(form.chassisDivs, id) })
          }
        />
      </Section>

      {byKind.initial_condition.length > 0 && (
        <Section title="Condição inicial">
          <RadioList
            options={byKind.initial_condition}
            value={form.initialCondition}
            onChange={(v) => setForm({ ...form, initialCondition: v })}
          />
        </Section>
      )}

      {byKind.final_classification.length > 0 && (
        <Section title="Classificação final">
          <RadioList
            options={byKind.final_classification}
            value={form.finalClassification}
            onChange={(v) => setForm({ ...form, finalClassification: v })}
          />
        </Section>
      )}

      <Section title="Aprovação final">
        <div className="grid grid-cols-2 gap-3">
          <ApprovalButton
            active={form.finalApproval === "approved"}
            tone="approve"
            onClick={() =>
              setForm({
                ...form,
                finalApproval: form.finalApproval === "approved" ? "" : "approved",
              })
            }
          >
            <Check className="h-4 w-4" /> Aprovar
          </ApprovalButton>
          <ApprovalButton
            active={form.finalApproval === "rejected"}
            tone="reject"
            onClick={() =>
              setForm({
                ...form,
                finalApproval: form.finalApproval === "rejected" ? "" : "rejected",
              })
            }
          >
            <X className="h-4 w-4" /> Reprovar
          </ApprovalButton>
        </div>
        {form.finalApproval === "rejected" && (
          <>
            <CheckList
              options={byKind.rejection}
              selected={form.rejectionReasons}
              onToggle={(id) =>
                setForm({ ...form, rejectionReasons: toggle(form.rejectionReasons, id) })
              }
            />
            <Field label="Motivo / observação obrigatória">
              <Textarea
                className={formTextareaClass}
                rows={2}
                value={form.rejectionNotes}
                onChange={(e) =>
                  setForm({ ...form, rejectionNotes: e.target.value })
                }
                required
              />
            </Field>
          </>
        )}
      </Section>

      <Section title="Observações gerais">
        <Textarea
                className={formTextareaClass}
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </Section>
    </div>
  );
}


function groupBy(list: VerificationStatus[]) {
  const out: Record<
    "engine" | "chassis" | "rejection" | "initial_condition" | "final_classification",
    VerificationStatus[]
  > = {
    engine: [],
    chassis: [],
    rejection: [],
    initial_condition: [],
    final_classification: [],
  };
  for (const s of list) {
    if (s.applies_to in out) {
      (out as Record<string, VerificationStatus[]>)[s.applies_to].push(s);
    }
  }
  return out;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 py-5 first:pt-0 last:pb-0">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}


const Field = FormField;

function CheckList({
  options,
  selected,
  onToggle,
}: {
  options: VerificationStatus[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-1.5">
      {options.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
        >
          <Checkbox
            checked={selected.has(o.id)}
            onCheckedChange={() => onToggle(o.id)}
          />
          <span className="text-sm">{o.name}</span>
        </label>
      ))}
    </div>
  );
}

function RadioList({
  options,
  value,
  onChange,
}: {
  options: VerificationStatus[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-1">
      {options.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted/50"
        >
          <RadioGroupItem value={o.id} id={o.id} />
          <span className="text-sm">{o.name}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
