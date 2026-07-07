import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Check, Loader2, RotateCw, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  getCroppedImage,
  type CroppedArea,
  type RotationDeg,
} from "@/lib/image/getCroppedImage";

interface ImageCropperModalProps {
  file: File;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  onRetake?: () => void;
  aspect?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.05;

export function ImageCropperModal({
  file,
  onConfirm,
  onCancel,
  onRetake,
  aspect = 4 / 3,
}: ImageCropperModalProps) {
  const imageSrc = useMemo(() => URL.createObjectURL(file), [file]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState<RotationDeg>(0);
  const [processing, setProcessing] = useState(false);
  const areaRef = useRef<CroppedArea | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(imageSrc);
  }, [imageSrc]);

  // Preload: decodifica em background para o Cropper abrir sem flash
  useEffect(() => {
    const img = new Image();
    img.decoding = "async";
    img.src = imageSrc;
  }, [imageSrc]);

  // Bloqueia scroll do body enquanto modal aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onCropComplete = useCallback((_: CroppedArea, pixels: CroppedArea) => {
    areaRef.current = pixels;
  }, []);

  const handleRotate = useCallback(() => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate?.(10);
      } catch {
        /* noop */
      }
    }
    setRotation((r) => ((r + 90) % 360) as RotationDeg);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!areaRef.current || processing) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImage(imageSrc, areaRef.current, rotation, {
        maxDim: 1600,
        quality: 0.9,
      });
      onConfirm(blob);
    } catch (err) {
      console.error("[ImageCropperModal] falha ao gerar imagem", err);
      setProcessing(false);
    }
  }, [imageSrc, rotation, onConfirm, processing]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Topbar */}
      <div className="flex h-14 shrink-0 items-center justify-between px-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          aria-label="Cancelar"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white/90 active:bg-white/10 disabled:opacity-40"
        >
          <X className="h-6 w-6" />
        </button>

        {onRetake ? (
          <button
            type="button"
            onClick={onRetake}
            disabled={processing}
            className="flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-white/90 active:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw className="h-5 w-5" />
            Refazer foto
          </button>
        ) : (
          <span />
        )}
      </div>

      {/* Área de crop fullscreen */}
      <div
        className="relative flex-1"
        style={{ touchAction: "none", willChange: "transform" }}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomSpeed={0.5}
          showGrid={true}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          style={{
            containerStyle: { background: "#000" },
            cropAreaStyle: {
              border: "1px solid rgba(255,255,255,0.9)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              color: "rgba(255,255,255,0.9)",
            },
            mediaStyle: {},
          }}
        />
      </div>

      {/* Controles: zoom + rotate */}
      <div className="flex shrink-0 items-center gap-3 px-5 py-3">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.2))}
          disabled={processing || zoom <= MIN_ZOOM}
          aria-label="Diminuir zoom"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 disabled:opacity-30"
        >
          <ZoomOut className="h-5 w-5" />
        </button>

        <div className="flex-1">
          <Slider
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            disabled={processing}
            aria-label="Zoom"
          />
        </div>

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.2))}
          disabled={processing || zoom >= MAX_ZOOM}
          aria-label="Aumentar zoom"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 disabled:opacity-30"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={handleRotate}
          disabled={processing}
          aria-label="Girar 90°"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-white active:bg-white/20 disabled:opacity-40"
        >
          <RotateCw className="h-5 w-5" />
        </button>
      </div>

      {/* Ações principais */}
      <div className="flex shrink-0 items-center gap-3 px-5 pb-4 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="h-16 flex-1 rounded-2xl bg-white/10 text-base font-medium text-white active:bg-white/20 disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing}
          className="flex h-16 flex-[1.6] items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-primary-foreground shadow-lg active:brightness-95 disabled:opacity-60"
        >
          {processing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <Check className="h-6 w-6" />
              Usar foto
            </>
          )}
        </button>
      </div>
    </div>
  );
}
