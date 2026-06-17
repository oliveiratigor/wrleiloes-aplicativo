import { supabase } from "@/lib/supabase";
import { apiCall } from "@/lib/api";
import { compressImage } from "@/lib/image/compress";
import type { PresignResponse } from "./types";

export type UploadParams = {
  file: File;
  productId: string;
  entryId: string;
  photoTypeId: number;
  accountId: string;
};

export type UploadResult = { mediaId: string; url: string; size: number };

/**
 * Upload direto pra S3 via presigned URL. NÃO usa app-s3-upload (que faz proxy
 * e consome CPU da edge function). Fluxo:
 *  1. comprime client-side (max 1600px, JPEG q=0.85)
 *  2. pega URL assinada
 *  3. PUT direto no S3
 *  4. soft-delete da foto anterior do mesmo (entry, photo_type)
 *  5. insert em media com status 'uploaded'
 */
export async function uploadFotoDirect(p: UploadParams): Promise<UploadResult> {
  // Validação defensiva — evita INSERT em `media` com IDs inválidos que tornam
  // a foto invisível pro back office mesmo com upload bem-sucedido no S3.
  if (!p.accountId) throw new Error("accountId ausente — foto não pode ser associada à conta");
  if (!p.productId) throw new Error("productId ausente — foto não pode ser associada ao veículo");
  if (!p.entryId) throw new Error("entryId ausente — foto não pode ser associada à entrada da vistoria");
  if (!Number.isFinite(p.photoTypeId)) throw new Error("photoTypeId inválido");

  const compressed = await compressImage(p.file, { maxDim: 1600, quality: 0.85 });
  const blob = compressed.blob;
  const contentType = compressed.mimeType;
  const ext = contentType === "image/png" ? "png" : "jpg";
  const path = `media/${p.accountId}/${p.productId}/${p.photoTypeId}_${Date.now()}.${ext}`;

  // 1. presign
  const { data: presign, error: presignErr } = await apiCall<
    { path: string; content_type: string },
    PresignResponse
  >("app-s3-presign", { path, content_type: contentType });
  if (presignErr || !presign) throw new Error(presignErr ?? "Falha ao gerar URL");
  const file = "files" in presign ? presign.files[0] : presign;
  if (!file?.upload_url) throw new Error("Resposta de presign inválida");

  // 2. PUT direto S3
  const putRes = await fetch(file.upload_url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!putRes.ok) {
    throw new Error(`Upload S3 falhou (${putRes.status})`);
  }

  // 3. soft-delete da anterior (mesmo entry + photo_type) — agora com checagem de erro
  const { data: prev, error: prevErr } = await supabase
    .from("media")
    .select("id")
    .eq("product_id", p.productId)
    .eq("product_entry_id", p.entryId)
    .eq("photo_type_id", p.photoTypeId)
    .is("deleted_at", null);
  if (prevErr) throw new Error(`Falha ao verificar foto anterior: ${prevErr.message}`);
  if (prev && prev.length > 0) {
    const { error: softDelErr } = await supabase
      .from("media")
      .update({ deleted_at: new Date().toISOString() })
      .in(
        "id",
        prev.map((r) => r.id),
      );
    // Se o soft-delete falhar (ex.: RLS), abortamos: senão ficaríamos com 2 fotos
    // ativas pro mesmo slot e o back office mostraria a antiga.
    if (softDelErr) throw new Error(`Falha ao remover foto anterior: ${softDelErr.message}`);
  }

  // 4. insert nova — com .select() pra forçar retorno e detectar bloqueio de RLS silencioso
  const { data: row, error: insertErr } = await supabase
    .from("media")
    .insert({
      account_id: p.accountId,
      product_id: p.productId,
      product_entry_id: p.entryId,
      photo_type_id: p.photoTypeId,
      url: file.final_url,
      path: file.path,
      mime_type: contentType,
      size: blob.size,
      status: "uploaded",
    })
    .select("id, account_id, product_id, product_entry_id")
    .single();
  if (insertErr) throw new Error(`Falha ao registrar foto: ${insertErr.message}`);
  if (!row) throw new Error("Foto enviada ao S3 mas não pôde ser registrada (RLS bloqueou o INSERT)");
  // Sanity-check: o que voltou do banco bate com o que mandamos?
  if (
    row.account_id !== p.accountId ||
    row.product_id !== p.productId ||
    row.product_entry_id !== p.entryId
  ) {
    throw new Error("Inconsistência ao registrar foto: IDs retornados não conferem");
  }

  return { mediaId: row.id, url: file.final_url, size: blob.size };
}

/**
 * Soft-delete + remove do S3 (via app-s3-upload action=delete).
 */
export async function deleteFoto(mediaId: string, path: string) {
  await supabase
    .from("media")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", mediaId);
  await apiCall("app-s3-upload", { action: "delete", path });
}

/** Fila com concorrência limitada (default 3). */
export async function runWithConcurrency<T>(
  items: T[],
  worker: (item: T, index: number) => Promise<void>,
  concurrency = 3,
) {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(workers);
}
