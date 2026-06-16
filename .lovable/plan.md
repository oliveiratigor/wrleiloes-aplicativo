# Padronização UX/UI Mobile WR Leilões — Execução em 5 fases

Modo de execução aprovado: **fase por fase com validação visual entre cada uma**.

Regras válidas para todas as fases:
- Conteúdo pode rolar por trás do header e da bottom bar, mas nada útil pode ficar escondido. Compensação via `padding-top`/`padding-bottom` no `MobileShell`, nunca via `margin-top` por página.
- Scrollbar invisível, scroll nativo mobile preservado (`-webkit-overflow-scrolling: touch`, `100dvh`).
- Header operacional compacto (96–128px) nas telas internas; header maior apenas em login/home/pesquisa.
- Bottom bar fixa com safe-area, fundo branco com blur, altura padronizada (96px). `padding-bottom` global garante que o último campo nunca fique atrás.
- **Não alterar** rotas, autenticação, schemas, integrações, regras de negócio ou lógica. Foco é shell mobile, componentes e visual.
- Ao final de cada fase, validação curta com: arquivos alterados / o que mudou visualmente / alteração de lógica (sim/não) / testado em mobile / risco ou pendência.

---

## Fase 1 — Tokens globais + scrollbar invisível + tipografia base

**Escopo:** `src/styles.css`.

- Adicionar tokens: `--page-padding` (24px), `--page-padding-compact` (16px), `--header-height` (128px), `--header-height-compact` (96px), `--bottom-bar-height` (96px), escala `--space-1..8`.
- Manter tokens shadcn existentes (`--primary`, `--border`, etc.) — apenas adicionar, não renomear.
- Garantir utilitário `.no-scrollbar` (já existe `scrollbar-none` via `@utility`; adicionar alias `no-scrollbar` para casar com o guia).
- Classes utilitárias de tipografia: `.page-title`, `.page-subtitle`, `.text-label`, `.plate-display` via `@utility`.
- Body já usa Inter via `@theme` — sem mudança.

Sem alteração de lógica. Sem alteração de componente.

---

## Fase 2 — Shell mobile + Header fixo + Bottom bar fixa

**Escopo:** `src/components/mobile/MobileShell.tsx`, `AppTopbar.tsx`, `BottomActionBar.tsx`.

- `MobileShell`: `position: relative; min-height: 100dvh`, `<main class="mobile-content no-scrollbar">` com `padding-top: calc(var(--header-height) + 24px)` e `padding-bottom: calc(var(--bottom-bar-height) + 40px + env(safe-area-inset-bottom))`.
- `AppTopbar` operacional: `position: fixed; top:0`, altura via token, gradiente primary→primary-dark, logo + logout, linha de contexto (back + label "Placa" + status pill).
- `BottomActionBar`: `position: fixed; bottom:0`, grid 2 colunas, ordem fixa `[Voltar] [Ação principal]`, `backdrop-filter: blur(18px)`, fundo branco translúcido, safe-area inferior.
- Header institucional (login / home / pesquisa) mantém versão maior — não tocar.

Sem alteração de roteamento, auth ou handlers.

---

## Fase 3 — Stepper + FormField + Cards

**Escopo:** `src/components/wizard/Stepper.tsx`, `src/components/shared/FormField.tsx`, `cadastro.$placa.tsx`, steps do wizard.

- Stepper: meta `ETAPA X DE 4` + nome da etapa, grid de 4 segmentos (`done` 62% opacity / `active` primary sólido / `idle` cinza).
- `formFieldClass` ajustada para altura 64px, radius 18px, padding 20px, fonte 16px/600.
- Agrupar seções em `.app-card` (radius 24px, padding 20px, border) com espaçamento `.app-section` (margin-bottom 32px) — Identificação, Motor, Chassi, Aprovação, Observações.

Sem alteração de schemas/validações.

---

## Fase 4 — Tela de fotos + Tela de vistoria + Aprovação final

**Escopo:** `StepFotos.tsx`, `StepVistoria.tsx`.

- Photo grid 2 colunas, gap 12px, padding lateral compacto (16px).
- `PhotoCard` com estados Pendente vs Enviada (overlay check vermelho no canto, sem tag "obrigatória" quando já enviada).
- Vistoria: `CheckRow` clicável (linha 52px, caixa 22px custom). Regra: marcar "Sem divergência" desmarca problemas do grupo, e vice-versa (Motor e Chassi).
- Aprovação final: segmentado verde-soft / vermelho-sólido (refinar visual atual). Reprovar → motivo obrigatório.

Mudança mínima de lógica apenas no toggle "Sem divergência" ↔ problemas (UX, não regra de negócio).

---

## Fase 5 — Bottom sheets + estados de sistema + polimento

**Escopo:** `SearchableSelect.tsx` e/ou Sheet usado.

- Handle visível, título centralizado sem reticências, max-height 78dvh, busca 56px, itens 56px, check vermelho institucional.
- Conferir estados visuais documentados no guia (campo vazio/loading/erro na pesquisa de placa; foto pendente/enviando/enviada/erro; vistoria sem divergência/divergente/aprovado/reprovado).
- Polimento final e checklist do guia.

---

## Riscos conhecidos

- Mudança de altura do header pode exigir reverificação de overlap em todas as telas operacionais (validamos visualmente entre fases).
- `100dvh` em alguns navegadores antigos pode cair para `100vh` — aceitável.
- Animação/transição no bottom bar com `backdrop-filter` pode pesar em Android antigo — manter fallback de fundo branco sólido.
