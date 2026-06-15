import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiCall } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/fotos/$entryId")({
  head: ({ params }) => ({ meta: [{ title: `Fotos ${params.entryId}` }] }),
  component: FotosPage,
});

type Photo = { id: string; label: string; base64?: string; uploaded?: boolean; error?: string };

const REQUIRED_LABELS = [
  "Frente",
  "Traseira",
  "Lateral Esq.",
  "Lateral Dir.",
  "Painel",
  "Hodômetro",
  "Chassi",
  "Motor",
];

function uid() {
  return Math.random().toString(36).slice(2);
}

async function pickPhoto(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    // Camera nativa quando disponível (Capacitor / mobile web)
    input.capture = "environment" as unknown as boolean extends never ? never : "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

function FotosPage() {
  const { entryId } = Route.useParams();
  const [photos, setPhotos] = useState<Photo[]>(
    REQUIRED_LABELS.map((label) => ({ id: uid(), label })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  async function addPhoto(idx: number) {
    const dataUrl = await pickPhoto();
    if (!dataUrl) return;
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, base64: dataUrl } : p)));
  }

  async function uploadAll() {
    setSubmitting(true);
    setGlobalError(null);
    for (let i = 0; i < photos.length; i++) {
      const p = photos[i];
      if (!p.base64 || p.uploaded) continue;
      const { error } = await apiCall<
        { entry_id: string; label: string; base64: string },
        { ok: true }
      >("process-single-media", {
        entry_id: entryId,
        label: p.label,
        base64: p.base64,
      });
      setPhotos((prev) =>
        prev.map((x, idx) =>
          idx === i ? { ...x, uploaded: !error, error: error ?? undefined } : x,
        ),
      );
    }
    setSubmitting(false);
  }

  const total = photos.length;
  const done = photos.filter((p) => p.uploaded).length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md pb-3">
        <Link to="/buscar" className="text-sm text-muted-foreground hover:underline">
          ← Concluir
        </Link>
      </div>
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-base">
            Fotos ({done}/{total})
          </CardTitle>
          <p className="text-xs text-muted-foreground">Entrada: {entryId}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {photos.map((p, idx) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="flex items-center gap-3">
                {p.base64 ? (
                  <img
                    src={p.base64}
                    alt={p.label}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted" />
                )}
                <div>
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.uploaded
                      ? "enviada"
                      : p.error
                        ? `erro: ${p.error}`
                        : p.base64
                          ? "pronta para enviar"
                          : "pendente"}
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => addPhoto(idx)}>
                {p.base64 ? "Trocar" : "Tirar"}
              </Button>
            </div>
          ))}
          {globalError && (
            <Alert variant="destructive">
              <AlertDescription>{globalError}</AlertDescription>
            </Alert>
          )}
          <Button
            className="w-full"
            onClick={uploadAll}
            disabled={submitting || photos.every((p) => !p.base64 || p.uploaded)}
          >
            {submitting ? "Enviando…" : "Enviar fotos pendentes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
