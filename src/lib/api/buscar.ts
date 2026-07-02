import { apiCall } from "@/lib/api";
import type { BuscarProdutoResponse } from "./types";

export type BuscarInput = {
  uuid?: string;
  plate?: string;
  chassis?: string;
  renavam?: string;
};

/**
 * Identifica se o valor digitado é placa (Mercosul ou antiga) ou renavam.
 * Retorna campos mutuamente exclusivos para casar com a cascata if/else if
 * do edge `buscar-produto` (chassis > renavam > plate). No app só usamos
 * placa ou renavam.
 */
export function detectIdentifier(raw: string):
  | { kind: "plate"; plate: string }
  | { kind: "chassis"; chassis: string }
  | { kind: "invalid"; reason: string } {
  const value = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!value) return { kind: "invalid", reason: "Informe uma placa ou chassi." };
  // só pode conter alfanumérico
  if (!/^[A-Z0-9]+$/.test(value)) {
    return { kind: "invalid", reason: "Digite uma placa válida ou chassi (17 caracteres)." };
  }
  // chassi (VIN): 17 caracteres alfanuméricos, sem I, O, Q
  if (value.length === 17 && /^[A-HJ-NPR-Z0-9]{17}$/.test(value)) {
    return { kind: "chassis", chassis: value };
  }
  // placa: 6 a 8 caracteres, ao menos 1 letra e 1 dígito.
  // Permissivo para cobrir Mercosul, antiga e variantes legadas do backoffice.
  if (value.length >= 6 && value.length <= 8 && /[A-Z]/.test(value) && /\d/.test(value)) {
    return { kind: "plate", plate: value };
  }
  return { kind: "invalid", reason: "Digite uma placa válida ou chassi (17 caracteres)." };
}

export async function buscarProduto(input: BuscarInput): Promise<{
  found: boolean;
  data: Extract<BuscarProdutoResponse, { product: unknown }> | null;
  error: string | null;
}> {
  const { data, error } = await apiCall<BuscarInput, BuscarProdutoResponse>(
    "buscar-produto",
    input,
  );
  if (error) return { found: false, data: null, error };
  if (!data || "error" in data) {
    return { found: false, data: null, error: null };
  }
  return { found: true, data, error: null };
}

export async function gerarPlacaProvisoria(tentativas = 8): Promise<string> {
  for (let i = 0; i < tentativas; i++) {
    const n = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const candidate = `WRRR${n}`;
    const r = await buscarProduto({ plate: candidate });
    if (!r.found) return candidate;
  }
  // fallback: o índice único no banco é a guarda final no save
  return `WRRR${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;
}

// Helper: a entrada está "aberta" quando o backend devolveu `entry_date` da
// entrada vigente. O edge `buscar-produto` só popula `entry_date` a partir da
// entrada ABERTA; em reentrada (última entrada com baixa) ele retorna `null`.
// `entry_date` é o sinal primário e confiável, inclusive quando o cadastro foi
// interrompido antes de fotos/divergências/vistoria.
//
// Como fallback, mantemos as verificações legadas (media/divergências/status
// de vistoria) para cobrir layouts de resposta mais antigos.
export function hasOpenEntry(
  data: Extract<BuscarProdutoResponse, { product: unknown }> | null,
): boolean {
  if (!data) return false;
  const p = data.product;
  // Sinal primário e confiável: o backend só devolve entry_date a partir da
  // entrada ABERTA. Em reentrada (última entrada com baixa) vem null. Cobre o
  // caso de cadastro interrompido antes de qualquer foto/vistoria.
  if (p.entry_date) return true;
  if (data.media.length > 0) return true;
  if (p.engine_discrepancies_uuid.length > 0) return true;
  if (p.chassis_discrepancies_uuid.length > 0) return true;
  if (p.rejection_reasons_uuid.length > 0) return true;
  if (p.final_approval_status) return true;
  if (p.initial_status_uuid || p.final_classification_uuid) return true;
  return false;
}
