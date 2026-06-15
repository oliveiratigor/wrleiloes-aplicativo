export type CompressOptions = {
  maxDim?: number; // px (lado maior)
  quality?: number; // 0..1
};

/**
 * Comprime imagem no client (canvas → JPEG). Reduz drasticamente o egress S3
 * (foto típica de celular passa de ~5MB para ~400-800KB sem perda perceptível).
 * Se o arquivo já é pequeno (<400KB) e JPEG, devolve direto sem reencodar.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<{ blob: Blob; mimeType: string }> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.85;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return { blob: file, mimeType: file.type || "application/octet-stream" };
  }

  // bypass para arquivos já pequenos/inadequados
  if (file.size < 400 * 1024 && file.type === "image/jpeg") {
    return { blob: file, mimeType: "image/jpeg" };
  }

  const bitmap = await loadBitmap(file);
  const ratio = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * ratio);
  const h = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, mimeType: file.type || "image/jpeg" };
  }
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) return { blob: file, mimeType: file.type || "image/jpeg" };
  return { blob, mimeType: "image/jpeg" };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // cai no fallback
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao decodificar imagem"));
    };
    img.src = url;
  });
}
