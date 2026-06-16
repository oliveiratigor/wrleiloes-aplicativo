import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CheckCircle2, Search, Plus } from "lucide-react";
import { MobileShell } from "@/components/mobile/MobileShell";
import { AppTopbar } from "@/components/mobile/AppTopbar";
import {
  BottomActionBar,
  BottomBarButton,
} from "@/components/mobile/BottomActionBar";
import { StatusBadge } from "@/components/mobile/StatusBadge";

const searchSchema = z.object({
  mode: z.enum(["new", "edit", "reentry"]).catch("new"),
  approval: z.enum(["approved", "rejected", "none"]).catch("none"),
});

export const Route = createFileRoute("/_authenticated/cadastro/$placa/sucesso")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [{ title: `Cadastro concluído ${params.placa}` }],
  }),
  component: SucessoPage,
});

function SucessoPage() {
  const { placa } = Route.useParams();
  const { mode, approval } = Route.useSearch();
  const navigate = useNavigate();

  const titulo =
    mode === "edit"
      ? "Cadastro atualizado"
      : mode === "reentry"
        ? "Reentrada registrada"
        : "Veículo cadastrado";

  const descricao =
    "A vistoria foi concluída e os dados foram salvos com sucesso.";

  const approvalBadge =
    approval === "approved"
      ? { tone: "success" as const, label: "Aprovado" }
      : approval === "rejected"
        ? { tone: "warning" as const, label: "Reprovado" }
        : null;

  return (
    <MobileShell
      topbar={<AppTopbar />}
      bottom={
        <BottomActionBar>
          <BottomBarButton
            variant="secondary"
            onClick={() => navigate({ to: "/buscar" })}
          >
            <Plus className="h-4 w-4" /> Novo cadastro
          </BottomBarButton>
          <BottomBarButton onClick={() => navigate({ to: "/buscar" })}>
            <Search className="h-4 w-4" /> Ir para busca
          </BottomBarButton>
        </BottomActionBar>
      }
    >
      <div className="flex flex-col items-center justify-center gap-6 pt-6 text-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/25">
            <CheckCircle2
              className="h-14 w-14 text-emerald-600"
              strokeWidth={2.5}
            />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{titulo}</h1>
          <p className="max-w-xs text-sm text-muted-foreground">{descricao}</p>
        </div>

        <div className="w-full max-w-xs rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Placa
          </p>
          <p className="mt-1 font-mono text-3xl font-black tracking-[0.15em] text-foreground">
            {placa}
          </p>
          {approvalBadge && (
            <div className="mt-4 flex justify-center">
              <StatusBadge tone={approvalBadge.tone}>
                {approvalBadge.label}
              </StatusBadge>
            </div>
          )}
        </div>
      </div>
    </MobileShell>
  );
}
