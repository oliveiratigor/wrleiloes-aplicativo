import { apiCall } from "@/lib/api";
import type { CadastrarProdutoPayload, CadastrarProdutoResponse } from "./types";

export type CadastroResult =
  | {
      ok: true;
      productId: string;
      entryId: string;
      isUpdate: boolean;
      message: string;
    }
  | { ok: false; code: string; message: string };

export async function cadastrarProduto(
  payload: CadastrarProdutoPayload,
): Promise<CadastroResult> {
  // Veículos estrangeiros / sem dados FIPE: remover chaves nulas de fipe_data,
  // enviando `{}` em vez de objeto com campos null.
  const fipe = payload.fipe_data ?? {};
  const cleanedFipe = Object.fromEntries(
    Object.entries(fipe).filter(([, v]) => v !== null && v !== undefined && v !== ""),
  );
  const finalPayload: CadastrarProdutoPayload = {
    ...payload,
    fipe_data: cleanedFipe as CadastrarProdutoPayload["fipe_data"],
  };

  const { data, error } = await apiCall<
    CadastrarProdutoPayload,
    CadastrarProdutoResponse
  >("cadastrar-produto", finalPayload);


  if (error || !data) {
    return { ok: false, code: "NETWORK", message: error ?? "Erro de rede." };
  }
  if (data.success === 1 && data.uuid && data.product_entry_uuid) {
    return {
      ok: true,
      productId: data.uuid,
      entryId: data.product_entry_uuid,
      isUpdate: !!data.is_update,
      message: data.message ?? "Salvo.",
    };
  }
  return {
    ok: false,
    code: data.code ?? "UNKNOWN",
    message: data.message ?? "Falha ao salvar.",
  };
}
