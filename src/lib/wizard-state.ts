// Estado do wizard, persistido em sessionStorage por placa.
// Sobrevive a refresh durante upload demorado.

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
  };
}

function key(plate: string) {
  return `wr-wizard:${plate.toUpperCase()}`;
}

export function loadWizard(plate: string): WizardState | null {
  try {
    const raw = sessionStorage.getItem(key(plate));
    return raw ? (JSON.parse(raw) as WizardState) : null;
  } catch {
    return null;
  }
}

export function saveWizard(state: WizardState) {
  try {
    sessionStorage.setItem(key(state.plate), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearWizard(plate: string) {
  try {
    sessionStorage.removeItem(key(plate));
  } catch {
    // ignore
  }
}
