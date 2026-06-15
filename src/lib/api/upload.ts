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

  // 3. soft-delete da anterior (mesmo entry + photo_type)
  const { data: prev } = await supabase
    .from("media")
    .select("id")
    .eq("product_id", p.productId)
    .eq("product_entry_id", p.entryId)
    .eq("photo_type_id", p.photoTypeId)
    .is("deleted_at", null)
    .limit(1);
  if (prev && prev.length > 0) {
    await supabase
      .from("media")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", prev[0].id);
  }

  // 4. insert nova
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
    .select("id")
    .single();
  if (insertErr) throw new Error(insertErr.message);

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
