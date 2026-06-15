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
  const { data, error } = await apiCall<
    CadastrarProdutoPayload,
    CadastrarProdutoResponse
  >("cadastrar-produto", payload);

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
