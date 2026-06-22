import { useCallback, useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Camera, Check, Loader2, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { tiposFotosQuery } from "@/lib/api/lookups";
import { uploadFotoWithFallback, runWithConcurrency } from "@/lib/api/upload";
import {
  enqueue as enqueueUpload,
  getByEntry as getQueuedByEntry,
  incrementAttempts as incrementQueueAttempts,
} from "@/lib/upload-queue";
import { compressImage } from "@/lib/image/compress";
import { supabase } from "@/lib/supabase";
import type { PhotoType } from "@/lib/api/types";

type Slot = {
  type: PhotoType;
  file?: File;
  uploadedUrl?: string;
  mediaId?: string;
  status: "idle" | "queued" | "uploading" | "done" | "error" | "retrying";
  error?: string;
  queuedId?: string;
  queuedAttempts?: number;
};

export function StepFotos({
  productId,
  entryId,
  accountId,
  onAllRequiredDone,
}: {
  productId: string;
  entryId: string;
  accountId: string;
  onAllRequiredDone?: (done: boolean) => void;
}) {
  const photoTypes = useSuspenseQuery(tiposFotosQuery).data;
  const [slots, setSlots] = useState<Slot[]>(() =>
    photoTypes.map((t) => ({ type: t, status: "idle" })),
  );
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Hidrata fotos já existentes na entrada (caso esteja editando entrada aberta)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("media")
        .select("id, url, photo_type_id, status")
        .eq("product_id", productId)
        .eq("product_entry_id", entryId)
        .is("deleted_at", null);
      if (cancelled || !data) return;
      setSlots((prev) =>
        prev.map((s) => {
          const m = data.find((d) => String(d.photo_type_id) === s.type.id);
          if (!m) return s;
          const isDone = m.status === "uploaded" || m.status === "buffered";
          return { ...s, mediaId: m.id, uploadedUrl: m.url, status: isDone ? "done" : "idle" };
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, entryId]);

  // Retry de itens da fila local: roda no mount e quando rede volta.
  const retryQueued = useCallback(async () => {
    if (!entryId || !accountId) return;
    const queued = await getQueuedByEntry(entryId);
    if (queued.length === 0) return;
    // Marca slots correspondentes como retrying.
    setSlots((prev) =>
      prev.map((s) => {
        const q = queued.find((i) => i.photoTypeId === Number(s.type.id));
        return q && s.status !== "done"
          ? { ...s, queuedId: q.id, queuedAttempts: q.attempts, status: "retrying" }
          : s;
      }),
    );
    for (const item of queued) {
      if (item.attempts >= 3) continue;
      try {
        await incrementQueueAttempts(item.id);
        const file = new File(
          [item.blob],
          `photo_${item.photoTypeId}.jpg`,
          { type: item.mimeType },
        );
        const res = await uploadFotoWithFallback({
          file,
          productId: item.productId,
          entryId: item.entryId,
          accountId: item.accountId,
          photoTypeId: item.photoTypeId,
          queueId: item.id,
        });
        setSlots((prev) =>
          prev.map((s) =>
            Number(s.type.id) === item.photoTypeId
              ? {
                  ...s,
                  status: "done",
                  uploadedUrl: res.url,
                  mediaId: res.mediaId,
                  file: undefined,
                  queuedId: undefined,
                  queuedAttempts: undefined,
                  error: undefined,
                }
              : s,
          ),
        );
      } catch {
        setSlots((prev) =>
          prev.map((s) =>
            Number(s.type.id) === item.photoTypeId
              ? {
                  ...s,
                  status: "error",
                  error: "Salvando para reenvio…",
                  queuedAttempts: (s.queuedAttempts ?? 0) + 1,
                }
              : s,
          ),
        );
      }
    }
  }, [entryId, accountId, productId]);

  useEffect(() => {
    retryQueued();
  }, [retryQueued]);

  useEffect(() => {
    const handler = () => {
      retryQueued();
    };
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [retryQueued]);

  const bypassFotos = import.meta.env.VITE_BYPASS_FOTOS_REQUIRED === "true";

  useEffect(() => {
    if (bypassFotos) {
      onAllRequiredDone?.(true);
      return;
    }
    const required = slots.filter((s) => s.type.is_required);
    // Consideramos "completa" uma foto enviada OU em fila de retry (<3 tentativas) —
    // não bloqueia o inspector por falhas transitórias de rede.
    const allDone = required.every(
      (s) =>
        s.status === "done" ||
        (s.queuedId !== undefined && (s.queuedAttempts ?? 0) < 3),
    );
    onAllRequiredDone?.(allDone);
  }, [slots, onAllRequiredDone, bypassFotos]);

  function onPick(typeId: string, file: File | null) {
    if (!file) return;
    setSlots((prev) =>
      prev.map((s) =>
        s.type.id === typeId
          ? { ...s, file, status: "queued", error: undefined }
          : s,
      ),
    );
  }

  async function uploadPending() {
    const pending = slots.filter((s) => s.file && s.status !== "done");
    if (pending.length === 0) return;
    setSlots((prev) =>
      prev.map((s) =>
        pending.find((p) => p.type.id === s.type.id) ? { ...s, status: "uploading" } : s,
      ),
    );
    await runWithConcurrency(pending, async (slot) => {
      try {
        const res = await uploadFotoWithFallback({
          file: slot.file!,
          productId,
          entryId,
          photoTypeId: Number(slot.type.id),
          accountId,
        });
        setSlots((prev) =>
          prev.map((s) =>
            s.type.id === slot.type.id
              ? {
                  ...s,
                  status: "done",
                  uploadedUrl: res.url,
                  mediaId: res.mediaId,
                  file: undefined,
                  queuedId: undefined,
                  queuedAttempts: undefined,
                  error: undefined,
                }
              : s,
          ),
        );
      } catch (err) {
        // Falhou direto e fallback — enfileira pra retry em background.
        try {
          const compressed = await compressImage(slot.file!, {
            maxDim: 1600,
            quality: 0.85,
          });
          const queuedId = await enqueueUpload({
            blob: compressed.blob,
            mimeType: compressed.mimeType,
            photoTypeId: Number(slot.type.id),
            productId,
            entryId,
            accountId,
          });
          setSlots((prev) =>
            prev.map((s) =>
              s.type.id === slot.type.id
                ? {
                    ...s,
                    status: "error",
                    error: "Salvando para reenvio…",
                    queuedId,
                    queuedAttempts: 0,
                  }
                : s,
            ),
          );
        } catch {
          setSlots((prev) =>
            prev.map((s) =>
              s.type.id === slot.type.id
                ? {
                    ...s,
                    status: "error",
                    error: err instanceof Error ? err.message : String(err),
                  }
                : s,
            ),
          );
        }
      }
    });
  }

  function clearSlot(typeId: string) {
    setSlots((prev) =>
      prev.map((s) =>
        s.type.id === typeId
          ? { ...s, file: undefined, status: s.uploadedUrl ? "done" : "idle", error: undefined }
          : s,
      ),
    );
  }

  const totalDone = slots.filter((s) => s.status === "done").length;
  const pendingCount = slots.filter((s) => s.file && s.status !== "done").length;
  const uploading = slots.some((s) => s.status === "uploading");

  return (
    <div className="space-y-3">
      {bypassFotos && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Bypass de fotos ativo — somente para testes. As fotos obrigatórias não estão sendo exigidas.
        </div>
      )}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {totalDone}/{slots.length} enviadas
          </span>
          {pendingCount > 0 && <span>{pendingCount} aguardando upload</span>}
        </div>
        <Progress value={(totalDone / Math.max(slots.length, 1)) * 100} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((s) => (
          <div
            key={s.type.id}
            className={cn(
              "relative overflow-hidden rounded-md border bg-muted/30",
              s.status === "error" && "border-destructive",
              s.status === "done" && "border-primary/30",
            )}
          >
            <div className="aspect-square w-full">
              {s.uploadedUrl ? (
                <img
                  src={s.uploadedUrl}
                  alt={s.type.text}
                  className="h-full w-full object-cover"
                />
              ) : s.file ? (
                <FilePreview file={s.file} />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Camera className="h-7 w-7" />
                </div>
              )}
              {s.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
              {s.status === "done" && (
                <div className="absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-1 p-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{s.type.text}</p>
                {s.type.is_required && (
                  <Badge variant="outline" className="mt-0.5 h-4 px-1 text-[10px]">
                    obrigatória
                  </Badge>
                )}
                {s.error && (
                  <p className="mt-0.5 truncate text-[10px] text-destructive">
                    {s.error}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {(s.file || s.uploadedUrl) && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => clearSlot(s.type.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-7 w-7"
                  onClick={() => inputsRef.current[s.type.id]?.click()}
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <input
              ref={(el) => {
                inputsRef.current[s.type.id] = el;
              }}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPick(s.type.id, e.target.files?.[0] ?? null)}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        className="w-full"
        onClick={uploadPending}
        disabled={pendingCount === 0 || uploading}
      >
        {uploading
          ? "Enviando…"
          : pendingCount > 0
            ? `Enviar ${pendingCount} foto(s)`
            : "Nenhuma foto pendente"}
      </Button>
    </div>
  );
}

function FilePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  return <img src={url} alt="preview" className="h-full w-full object-cover" />;
}
