# Plano: app mobile WR Leilões

## 1. Remover "Cobrar guincho" do app

- `src/components/wizard/StepVistoria.tsx`: remover bloco `Cobrar guincho` (switch + km inicial/final). Esse fluxo permanece exclusivo do Backoffice.
- `src/lib/wizard-state.ts` / `src/lib/api/vistoria.ts`: manter os campos no estado/payload apenas se o backend exigir; caso contrário não enviar. Confirmar lendo o arquivo e retirar do form do app.

## 2. Design system mobile (tokens)

Atualizar `src/styles.css` mantendo HSL mas alinhando com a paleta do briefing:

- `--wr-red #c82026` → `--primary` (hsl 358 72% 46%)
- `--wr-red-dark #9f111a` → `--primary-dark` (novo token, hsl 356 80% 35%) para headers/topbar
- `--wr-red-soft #fff1f2` → `--primary-soft` (hsl 355 100% 97%)
- `--success #22c55e` / `--success-soft #dcfce7`
- `--background #f6f7f9` (hsl 220 14% 97%)
- `--border #e5e7eb`
- Tipografia Inter já configurada.
- Adicionar utilitários: `--shadow-card` (sombra leve), `--shadow-bottom-bar` (sombra invertida para BottomActionBar), radius `2xl` padrão para cards (1rem).

Sem temas dark novos — operação diurna em pátio.

## 3. Shell mobile

Novo `src/components/mobile/MobileShell.tsx`:
- Container `min-h-dvh max-w-md mx-auto` com `safe-area-inset` (padding-top env + padding-bottom env).
- Fundo claro, conteúdo principal `flex-1 overflow-y-auto`.
- Slot para `AppTopbar` e `BottomActionBar`.

Novo `src/components/mobile/AppTopbar.tsx`:
- Faixa vermelha escura, logo "WR", saudação (`Olá, {nome}`), role badge sutil, ícone sair.

Novo `src/components/mobile/BottomActionBar.tsx`:
- Fixo no fundo do shell, fundo branco com `backdrop-blur` + sombra superior.
- Slots para botão secundário (Voltar) e primário (Continuar/Salvar). Botões altos (h-12) com radius `xl`.

Novo `src/components/mobile/PlateInput.tsx`:
- Input grande (text-2xl, tracking-widest, uppercase), auto-uppercase, remove espaços, máscara visual; foco com ring vermelho.

Componentes auxiliares: `VehicleSummaryCard`, `InfoSection`, `InfoRow`, `StatusBadge` (success/warning/muted).

## 4. Tela de Login (`src/routes/auth.tsx`)

- Header vermelho ocupando ~35% do topo com logo + frase "Operação de pátio e vistoria veicular".
- Card branco sobreposto (`-mt-12`, radius `2xl`, sombra).
- Campos e-mail / senha grandes, botão `Entrar` full width, link discreto "Esqueci minha senha".

## 5. Tela de Pesquisa (`src/routes/_authenticated/buscar.tsx`)

- Usar `MobileShell` + `AppTopbar`.
- Card hero com título "Pesquisar veículo" e descrição.
- `PlateInput` em destaque + botão `Consultar placa`.
- Bloco "Últimas consultas" com chips (placas recentes em `localStorage`, last 5).
- Estado de carregamento no botão.

## 6. Tela de Resultado / Cadastro (`src/routes/_authenticated/cadastro.$placa.tsx`)

Manter o wizard atual em 4 etapas (Entrada, Veículo, Vistoria, Fotos) mas reembalado em mobile:

- `Stepper.tsx`: barra fina horizontal com 4 bolinhas + label da etapa atual. Sticky no topo abaixo da topbar.
- Header com botão voltar, placa em destaque grande, badge verde "Encontrado" / cinza "Novo cadastro".
- Cada Step refeito como cards brancos arredondados com `InfoSection` + `InfoRow` quando em modo leitura, e inputs grandes (h-12) em modo edição.
- `StepVistoria`: sem "Cobrar guincho". Mantém divergências chassi/motor com toggles grandes e campos "no veículo" / "na base" quando há divergência.
- `BottomActionBar` fixa com `Voltar` + `Continuar` (última etapa: `Salvar cadastro`).

## 7. Estados auxiliares

- "Placa não encontrada": dentro do fluxo de cadastro novo, exibir hero com ícone, placa em chip, e CTAs `Cadastrar novo veículo` / `Pesquisar outra placa`.
- Revisão final (nova etapa visual antes de salvar, opcional — pode ser modal de confirmação para não inflar o wizard). Decisão: usar `AlertDialog` de confirmação ao clicar "Salvar cadastro" mostrando resumo placa/marca/modelo.

## 8. Microinterações

- Transição `fade + translate-y-1` ao trocar de etapa (CSS only, `data-state`).
- Loading no botão de consulta (spinner Lucide).
- Badge verde aparece com `animate-in fade-in zoom-in-95`.
- `PlateInput` com transição suave no foco.

## Detalhes técnicos

- Sem novas dependências (Tailwind v4 + lucide-react + shadcn já presentes).
- Forçar viewport mobile: `<meta name="viewport">` já existe; layout `max-w-md` centralizado garante leitura em web preview.
- Manter toda lógica de API/queries atual (`detectIdentifier`, `buscarProduto`, lookups por usuário); apenas reembalar visual.
- Sem mexer em rotas/route tree: edição in-place dos arquivos existentes + novos componentes em `src/components/mobile/`.

## Fora de escopo

- Histórico real persistido em backend (usar localStorage por enquanto).
- Tela dedicada de revisão fora do wizard (substituída por AlertDialog).
- Dark mode.
- Mudanças em endpoints / RLS.
