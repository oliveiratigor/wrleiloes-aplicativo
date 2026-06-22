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

  async function uploadSingle(slot: Slot, file: File) {
    setSlots((prev) =>
      prev.map((s) =>
        s.type.id === slot.type.id
          ? { ...s, file, status: "uploading", error: undefined }
          : s,
      ),
    );
    try {
      const res = await uploadFotoWithFallback({
        file,
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
      try {
        const compressed = await compressImage(file, {
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
  }

  function onFileChange(slot: Slot, file: File | null) {
    if (!file) return;
    void uploadSingle(slot, file);
  }

  function retrySlot(slot: Slot) {
    if (slot.file) void uploadSingle(slot, slot.file);
    else inputsRef.current[slot.type.id]?.click();
  }

  // Mantido para compatibilidade com retryQueued (não exposto na UI).
  void runWithConcurrency;




  const totalDone = slots.filter((s) => s.status === "done").length;

  return (
    <div className="space-y-4">
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
        </div>
        <Progress value={(totalDone / Math.max(slots.length, 1)) * 100} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {slots.map((s) => {
          const busy = s.status === "uploading" || s.status === "retrying";
          const isDone = s.status === "done";
          const isError = s.status === "error";
          const isQueued = s.status === "queued";

          const btnLabel = busy
            ? "Enviando…"
            : isQueued
              ? "Aguardando envio…"
              : isError
                ? "Tentar novamente"
                : isDone
                  ? "Trocar foto"
                  : "Enviar foto";

          const btnClass = cn(
            "flex w-full items-center justify-center gap-2 rounded-b-2xl px-3 py-3 text-sm font-bold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70",
            busy || isQueued
              ? "bg-muted text-muted-foreground"
              : isError
                ? "bg-destructive text-destructive-foreground"
                : isDone
                  ? "border-t border-border bg-card text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground",
          );

          return (
            <div
              key={s.type.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
                isError && "border-destructive/60",
                isDone && "border-primary/40",
              )}
            >
              <button
                type="button"
                onClick={() => inputsRef.current[s.type.id]?.click()}
                disabled={busy || isQueued}
                className="relative block h-[180px] w-full overflow-hidden bg-muted"
              >
                {s.uploadedUrl ? (
                  <img
                    src={s.uploadedUrl}
                    alt={s.type.text}
                    className="h-full w-full object-cover"
                  />
                ) : s.file ? (
                  <FilePreview file={s.file} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
                {busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                )}
                {isDone && (
                  <div className="absolute right-2 top-2 rounded-full bg-primary p-1.5 text-primary-foreground shadow">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>

              <div className="px-3 pt-3">
                <p className="text-sm font-semibold leading-tight text-foreground">
                  {s.type.text}
                </p>
              </div>
              <div className="px-3 pb-2 pt-1">
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    s.type.is_required
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {s.type.is_required ? "Obrigatória" : "Opcional"}
                </span>
                {s.error && (
                  <p className="mt-1 truncate text-[10px] text-destructive">
                    {s.error}
                  </p>
                )}
              </div>

              <div className="mt-auto">
                <button
                  type="button"
                  onClick={() =>
                    isError ? retrySlot(s) : inputsRef.current[s.type.id]?.click()
                  }
                  disabled={busy || isQueued}
                  className={btnClass}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isError ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {btnLabel}
                </button>
              </div>

              <input
                ref={(el) => {
                  inputsRef.current[s.type.id] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  onFileChange(s, e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>
          );
        })}
      </div>
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
