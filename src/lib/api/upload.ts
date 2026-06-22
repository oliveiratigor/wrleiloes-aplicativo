import { supabase } from "@/lib/supabase";
import { apiCall } from "@/lib/api";
import { compressImage } from "@/lib/image/compress";
import { dequeue } from "@/lib/upload-queue";
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

/**
 * Wrapper resiliente: tenta PUT direto S3, e em caso de falha de rede/CORS,
 * faz fallback para a edge function `app-s3-upload` (action=upload, base64).
 * Erros de RLS/dados inválidos NÃO acionam fallback.
 */
export async function uploadFotoWithFallback(
  p: UploadParams & { queueId?: string },
): Promise<UploadResult> {
  // Tentativa 1: PUT direto S3 via presign
  try {
    const result = await uploadFotoDirect(p);
    if (p.queueId) await dequeue(p.queueId);
    return result;
  } catch (s3Err) {
    const errMsg = s3Err instanceof Error ? s3Err.message : String(s3Err);
    const isNetworkError =
      errMsg.includes("fetch") ||
      errMsg.includes("S3 falhou") ||
      errMsg.includes("Failed") ||
      errMsg.includes("URL") ||
      errMsg.includes("network") ||
      errMsg.includes("NetworkError");
    if (!isNetworkError) throw s3Err;
  }

  // Tentativa 2: enviar via app-s3-upload (FormData, CORS *)
  const compressed = await compressImage(p.file, { maxDim: 1600, quality: 0.85 });
  const ext = compressed.mimeType === "image/png" ? "png" : "jpg";
  const s3Path = `media/${p.accountId}/${p.productId}/${p.photoTypeId}_${Date.now()}.${ext}`;

  try {
    const form = new FormData();
    form.append(
      "file",
      new Blob([await compressed.blob.arrayBuffer()], { type: compressed.mimeType }),
      `photo.${ext}`,
    );
    form.append("path", s3Path);
    form.append("content_type", compressed.mimeType);

    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
    const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/app-s3-upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${ANON_KEY}` },
      body: form,
    });
    if (!res.ok) throw new Error(`app-s3-upload falhou: ${res.status}`);
    const json = (await res.json()) as { url: string; path: string };

    // Soft-delete da anterior
    const { data: prev } = await supabase
      .from("media")
      .select("id")
      .eq("product_id", p.productId)
      .eq("product_entry_id", p.entryId)
      .eq("photo_type_id", p.photoTypeId)
      .is("deleted_at", null);
    if (prev?.length) {
      await supabase
        .from("media")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", prev.map((r) => r.id));
    }

    const { data: row, error: insertErr } = await supabase
      .from("media")
      .insert({
        account_id: p.accountId,
        product_id: p.productId,
        product_entry_id: p.entryId,
        photo_type_id: p.photoTypeId,
        url: json.url,
        path: json.path,
        mime_type: compressed.mimeType,
        size: compressed.blob.size,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (insertErr || !row) throw new Error(`Registro falhou: ${insertErr?.message}`);

    if (p.queueId) await dequeue(p.queueId);
    return { mediaId: row.id, url: json.url, size: compressed.blob.size };
  } catch {
    // Tentativa 3: buffer no Supabase Storage (media-temp)
    const bufferPath = `${p.accountId}/${p.productId}/${p.photoTypeId}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("media-temp")
      .upload(bufferPath, compressed.blob, {
        contentType: compressed.mimeType,
        upsert: true,
      });
    if (uploadErr) throw new Error(`Buffer upload falhou: ${uploadErr.message}`);

    const { data: prev } = await supabase
      .from("media")
      .select("id")
      .eq("product_id", p.productId)
      .eq("product_entry_id", p.entryId)
      .eq("photo_type_id", p.photoTypeId)
      .is("deleted_at", null);
    if (prev?.length) {
      await supabase
        .from("media")
        .update({ deleted_at: new Date().toISOString() })
        .in("id", prev.map((r) => r.id));
    }

    const { data: signedUrl } = await supabase.storage
      .from("media-temp")
      .createSignedUrl(bufferPath, 60 * 60 * 24 * 31);

    const s3FinalPath = `media/${p.accountId}/${p.productId}/${p.photoTypeId}_${Date.now()}.${ext}`;
    const { data: row, error: insertErr } = await supabase
      .from("media")
      .insert({
        account_id: p.accountId,
        product_id: p.productId,
        product_entry_id: p.entryId,
        photo_type_id: p.photoTypeId,
        url: signedUrl?.signedUrl ?? "",
        path: s3FinalPath,
        buffer_path: bufferPath,
        mime_type: compressed.mimeType,
        size: compressed.blob.size,
        status: "buffered",
        buffered_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insertErr || !row) throw new Error(`Registro buffer falhou: ${insertErr?.message}`);

    if (p.queueId) await dequeue(p.queueId);
    return {
      mediaId: row.id,
      url: signedUrl?.signedUrl ?? "",
      size: compressed.blob.size,
    };
  }
}
