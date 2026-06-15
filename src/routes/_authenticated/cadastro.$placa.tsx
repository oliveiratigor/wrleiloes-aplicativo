import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiCall } from "@/lib/api";

const searchSchema = z.object({
  mode: z.enum(["create", "edit"]).default("create"),
  entry: z.string().optional(),
  cadastro: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/cadastro/$placa")({
  validateSearch: searchSchema,
  head: ({ params }) => ({ meta: [{ title: `Cadastro ${params.placa}` }] }),
  component: CadastroPage,
});

function CadastroPage() {
  const { placa } = Route.useParams();
  const { mode, entry, cadastro } = Route.useSearch();
  const navigate = useNavigate();

  const [chassi, setChassi] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [finalApproval, setFinalApproval] = useState<"approved" | "rejected" | "">("");
  const [rejectionNotes, setRejectionNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const payload = {
      // contrato `cadastrar-produto` aceita uuid pra update; sem uuid cria novo cadastro
      uuid: mode === "edit" ? cadastro : undefined,
      plate: placa,
      chassis: chassi || undefined,
      brand: marca || undefined,
      model: modelo || undefined,
      observations: observacoes || undefined,
      final_approval_status: finalApproval || undefined,
      rejection_notes: finalApproval === "rejected" ? rejectionNotes : undefined,
      entry_id: entry,
    };
    const { data, error: err } = await apiCall<
      typeof payload,
      { entry_id?: string; product_id?: string; openEntry?: { id: string } }
    >("cadastrar-produto", payload);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    const entryId = data?.entry_id ?? data?.openEntry?.id ?? entry;
    if (entryId) {
      navigate({ to: "/fotos/$entryId", params: { entryId } });
    } else {
      navigate({ to: "/buscar" });
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md pb-3">
        <Link to="/buscar" className="text-sm text-muted-foreground hover:underline">
          ← Voltar
        </Link>
      </div>
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-base">
            {mode === "edit" ? "Editar entrada" : "Novo cadastro"} — {placa}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {mode === "edit"
              ? `Entrada ativa: ${entry}`
              : cadastro
                ? `Vinculado ao cadastro ${cadastro}`
                : "Cadastro novo"}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "create" && (
              <div className="space-y-2">
                <Label htmlFor="chassi">Chassi</Label>
                <Input id="chassi" value={chassi} onChange={(e) => setChassi(e.target.value)} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="obs">Divergências / observações</Label>
              <Textarea
                id="obs"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status final</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={finalApproval === "approved" ? "default" : "outline"}
                  onClick={() => setFinalApproval("approved")}
                  className="flex-1"
                >
                  Aprovar
                </Button>
                <Button
                  type="button"
                  variant={finalApproval === "rejected" ? "destructive" : "outline"}
                  onClick={() => setFinalApproval("rejected")}
                  className="flex-1"
                >
                  Reprovar
                </Button>
              </div>
            </div>
            {finalApproval === "rejected" && (
              <div className="space-y-2">
                <Label htmlFor="rej">Motivo da reprovação</Label>
                <Textarea
                  id="rej"
                  rows={2}
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  required
                />
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Salvando…" : "Salvar e ir para fotos"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
