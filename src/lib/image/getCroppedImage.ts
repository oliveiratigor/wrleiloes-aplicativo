export type CroppedArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RotationDeg = 0 | 90 | 180 | 270;

export interface GetCroppedImageOptions {
  maxDim?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
}

/**
 * Decodifica um File/URL, aplica rotação e crop no espaço de pixels
 * exatamente como o react-easy-crop reporta em onCropComplete, e devolve
 * um Blob já redimensionado para maxDim (default 1600) em JPEG q=0.9.
 *
 * Usa createImageBitmap com imageOrientation "from-image" quando disponível
 * para respeitar EXIF sem trabalho extra. Fallback para <img>.
 */
export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: CroppedArea,
  rotation: RotationDeg,
  opts: GetCroppedImageOptions = {},
): Promise<Blob> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.9;
  const mimeType = opts.mimeType ?? "image/jpeg";

  const bitmap = await loadBitmap(imageSrc);
  const iw = bitmap.width;
  const ih = bitmap.height;

  // Canvas rotacionado — mesma fórmula do react-easy-crop
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const rotW = iw * cos + ih * sin;
  const rotH = iw * sin + ih * cos;

  const rotCanvas = document.createElement("canvas");
  rotCanvas.width = Math.round(rotW);
  rotCanvas.height = Math.round(rotH);
  const rotCtx = rotCanvas.getContext("2d");
  if (!rotCtx) throw new Error("Canvas 2D context indisponível");
  rotCtx.imageSmoothingEnabled = true;
  rotCtx.imageSmoothingQuality = "high";
  rotCtx.translate(rotW / 2, rotH / 2);
  rotCtx.rotate(rad);
  rotCtx.drawImage(bitmap as CanvasImageSource, -iw / 2, -ih / 2);

  // Determina destino final aplicando maxDim sobre o crop
  const cw = Math.max(1, Math.round(pixelCrop.width));
  const ch = Math.max(1, Math.round(pixelCrop.height));
  const scale = Math.min(1, maxDim / Math.max(cw, ch));
  const outW = Math.max(1, Math.round(cw * scale));
  const outH = Math.max(1, Math.round(ch * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const outCtx = out.getContext("2d");
  if (!outCtx) throw new Error("Canvas 2D context indisponível");
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(
    rotCanvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  // Libera bitmap quando possível
  if (typeof (bitmap as ImageBitmap).close === "function") {
    (bitmap as ImageBitmap).close();
  }

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Falha ao gerar blob da imagem"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function loadBitmap(src: string): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return await createImageBitmap(blob, {
        imageOrientation: "from-image",
      });
    } catch {
      // fallback abaixo
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
