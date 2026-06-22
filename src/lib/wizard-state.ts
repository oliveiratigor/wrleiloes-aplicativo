// Estado do wizard, persistido em localStorage por placa.
// Sobrevive a refresh durante upload demorado.

import type { VistoriaForm } from "@/components/wizard/StepVistoria";

export type WizardMode = "new" | "reentry" | "edit";

export type WizardState = {
  mode: WizardMode;
  // ids do backend (preenchidos após salvar passo 3)
  productId?: string;
  entryId?: string;
  // passo 2 — veículo
  plate: string;
  chassis: string;
  renavam: string;
  engine: string;
  brand: string;
  model: string;
  color: string;
  fuel: string;
  yearManufacture: string;
  yearModel: string;
  mileage: string;
  hasKey: boolean;
  typeId: string;
  fipeCodigo: string;
  fipePrice: string;
  // passo 3 — entrada
  branchId: string;
  depositId: string;
  principalId: string;
  entryTypeId: string;
  chargeTowing: boolean;
  kmInitial: string;
  kmFinal: string;
  // passo 4 — características
  attributeIds: string[];
  // veículo estrangeiro / sem dados FIPE — entrada manual de marca/modelo
  isManual: boolean;
  // passo 6 — vistoria (persistido para não perder ao fechar o app)
  vistoria?: VistoriaForm | null;
};


export function emptyWizard(plate: string, mode: WizardMode = "new"): WizardState {
  return {
    mode,
    plate: plate.toUpperCase(),
    chassis: "",
    renavam: "",
    engine: "",
    brand: "",
    model: "",
    color: "",
    fuel: "",
    yearManufacture: "",
    yearModel: "",
    mileage: "",
    hasKey: false,
    typeId: "",
    fipeCodigo: "",
    fipePrice: "",
    branchId: "",
    depositId: "",
    principalId: "",
    entryTypeId: "",
    chargeTowing: false,
    kmInitial: "",
    kmFinal: "",
    attributeIds: [],
    isManual: false,
    vistoria: null,
  };

}

function key(plate: string) {
  return `wr-wizard:${plate.toUpperCase()}`;
}

// Set<string> não é serializável em JSON — converte para array ao salvar.
export function serializeVistoria(v: VistoriaForm) {
  return {
    ...v,
    engineDivs: [...v.engineDivs],
    chassisDivs: [...v.chassisDivs],
    rejectionReasons: [...v.rejectionReasons],
  };
}

// Reconstrói os Sets ao carregar.
export function deserializeVistoria(raw: unknown): VistoriaForm {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    ...(r as unknown as VistoriaForm),
    engineDivs: new Set((r.engineDivs as string[]) ?? []),
    chassisDivs: new Set((r.chassisDivs as string[]) ?? []),
    rejectionReasons: new Set((r.rejectionReasons as string[]) ?? []),
  };
}

export function loadWizard(plate: string): WizardState | null {
  try {
    const raw = localStorage.getItem(key(plate));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      vistoria: parsed.vistoria ? deserializeVistoria(parsed.vistoria) : null,
    } as WizardState;
  } catch {
    return null;
  }
}

export function saveWizard(state: WizardState) {
  try {
    const toSave = {
      ...state,
      vistoria: state.vistoria ? serializeVistoria(state.vistoria) : null,
    };
    localStorage.setItem(key(state.plate), JSON.stringify(toSave));
  } catch {
    // ignore
  }
}

export function clearWizard(plate: string) {
  try {
    localStorage.removeItem(key(plate));
  } catch {
    // ignore
  }
}
