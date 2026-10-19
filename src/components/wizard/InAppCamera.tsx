import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

export type CameraFallbackReason = "unsupported" | "denied" | "error";

const DISABLED_KEY = "wr_inapp_camera_disabled";
const MAX_DIM = 1600;
const TIMEOUT_MS = 6000;

export function canUseInAppCamera(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia) && window.isSecureContext === true;
}

export function isInAppCameraDisabled(): boolean {
  try {
    return window.localStorage.getItem(DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function disableInAppCamera(): void {
  try {
    window.localStorage.setItem(DISABLED_KEY, "1");
  } catch {
    // ignora storage indisponível
  }
}

function classifyError(err: unknown): CameraFallbackReason {
  const name = err instanceof Error || err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "unsupported";
  return "error";
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(t);
        reject(e);
      },
    );
  });
}

export function InAppCamera({
  open,
  onCapture,
  onCancel,
  onFallback,
  onUseNative,
}: {
  open: boolean;
  onCapture: (file: File) => void;
  onCancel: () => void;
  onFallback: (reason: CameraFallbackReason) => void;
  /** Escolha manual do usuário: abre o input nativo sem desativar a câmera própria. */
  onUseNative?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);

    (async () => {
      if (!canUseInAppCamera()) {
        onFallback("unsupported");
        return;
      }
      const md = navigator.mediaDevices;
      const start = async (): Promise<MediaStream> => {
        try {
          return await md.getUserMedia({
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1600 },
              height: { ideal: 1200 },
            },
            audio: false,
          });
        } catch (e) {
          if (classifyError(e) === "denied") throw e;
          return await md.getUserMedia({ video: true, audio: false });
        }
      };
      try {
        const stream = await withTimeout(
          (async () => {
            const s = await start();
            if (cancelled) {
              s.getTracks().forEach((t) => t.stop());
              return s;
            }
            streamRef.current = s;
            const v = videoRef.current;
            if (v) {
              v.srcObject = s;
              await v.play().catch(() => undefined);
              if (!v.videoWidth) {
                await new Promise<void>((res) => {
                  v.onloadedmetadata = () => res();
                });
              }
            }
            return s;
          })(),
          TIMEOUT_MS,
        );
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setReady(true);
      } catch (err) {
        stopStream();
        if (!cancelled) onFallback(classifyError(err));
      }
    })();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleCancel() {
    stopStream();
    onCancel();
  }

  function handleFallbackClick() {
    stopStream();
    if (onUseNative) onUseNative();
    else onFallback("unsupported");
  }

  function shoot() {
    const v = videoRef.current;
    if (!v || !v.videoWidth || capturing) return;
    setCapturing(true);
    const scale = Math.min(1, MAX_DIM / Math.max(v.videoWidth, v.videoHeight));
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      stopStream();
      onFallback("error");
      return;
    }
    ctx.drawImage(v, 0, 0, w, h);
    navigator.vibrate?.(15);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        stopStream();
        if (!blob) {
          onFallback("error");
          return;
        }
        onCapture(new File([blob], "photo.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative z-10 flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-1.5 rounded-full bg-background/20 px-4 py-2 text-sm font-semibold text-primary-foreground backdrop-blur"
        >
          <X className="h-4 w-4" />
          Cancelar
        </button>
      </div>

      {!ready && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 text-primary-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-sm">Abrindo câmera…</span>
        </div>
      )}
      {ready && <div className="flex-1" />}

      <div className="relative z-10 flex flex-col items-center gap-4 pb-6">
        <button
          type="button"
          aria-label="Tirar foto"
          onClick={shoot}
          disabled={!ready || capturing}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary-foreground bg-primary-foreground/20 transition active:scale-95 disabled:opacity-50"
        >
          {capturing ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary-foreground" />
          ) : (
            <span className="h-14 w-14 rounded-full bg-primary-foreground" />
          )}
        </button>
        <button
          type="button"
          onClick={handleFallbackClick}
          className="text-xs text-primary-foreground/80 underline"
        >
          Usar câmera do aparelho
        </button>
      </div>
    </div>
  );
}
