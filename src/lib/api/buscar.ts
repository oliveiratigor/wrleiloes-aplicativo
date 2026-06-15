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
  | { kind: "renavam"; renavam: string }
  | { kind: "invalid"; reason: string } {
  const value = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!value) return { kind: "invalid", reason: "Informe uma placa ou renavam." };
  // renavam: só dígitos, 9 a 11 caracteres
  if (/^\d{9,11}$/.test(value)) return { kind: "renavam", renavam: value };
  // placa Mercosul: AAA0A00  |  antiga: AAA0000
  if (/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(value) || /^[A-Z]{3}\d{4}$/.test(value)) {
    return { kind: "plate", plate: value };
  }
  return { kind: "invalid", reason: "Placa ou renavam inválido." };
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

// Helper: a entrada está "aberta" quando o backend devolveu media/divergences
// ligados à entrada vigente. O backend não devolve flag explícita, então
// inferimos por `branch_uuid` presente + existência de media (entrada aberta)
// ou só dados operacionais herdados (reentrada).
//
// Regra prática: `media.length > 0` OU qualquer `*_discrepancies_uuid` populado
// indica entrada aberta. Se `branch_uuid` veio mas media e divergências estão
// vazias, é reentrada (dados herdados da última saída).
export function hasOpenEntry(
  data: Extract<BuscarProdutoResponse, { product: unknown }> | null,
): boolean {
  if (!data) return false;
  const p = data.product;
  if (data.media.length > 0) return true;
  if (p.engine_discrepancies_uuid.length > 0) return true;
  if (p.chassis_discrepancies_uuid.length > 0) return true;
  if (p.rejection_reasons_uuid.length > 0) return true;
  if (p.final_approval_status) return true;
  if (p.initial_status_uuid || p.final_classification_uuid) return true;
  return false;
}
