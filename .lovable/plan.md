## Problema
- No grid 2-col (Depósito / Comitente), o botão do `SearchableSelect` tem texto longo que não trunca → o conteúdo "vaza" para fora do card branco.
- Visual atual usa sombras de elevação (`--shadow-card`, `--shadow-bar`) e bordas arredondadas grandes, lembrando Material Design.

## Mudanças

### 1. `src/components/shared/SearchableSelect.tsx` — corrige vazamento
- Adicionar `min-w-0` ao botão trigger e envolver o label numa `<span className="truncate text-left flex-1 min-w-0">` para que o texto seja cortado com reticências em vez de transbordar.
- Substituir `variant="outline"` por classes próprias para alinhar ao novo visual flat (borda 1px sutil, sem hover de fundo cinza forte, `rounded-md` em vez de `rounded-lg`).

### 2. `src/components/wizard/StepEntrada.tsx` — protege o grid
- Garantir `min-w-0` nos `<Field>` filhos do `grid grid-cols-2` (envolver cada coluna com `min-w-0`) — sem isso, mesmo com truncate o grid pode forçar largura mínima do conteúdo.

### 3. `src/styles.css` — visual mais elegante, menos material
- Zerar `--shadow-card` e `--shadow-bar` (ou reduzir para `0 1px 0 rgba(...)` linha-fina).
- Reduzir `--radius` de `0.75rem` para `0.5rem` (cantos mais discretos).
- Reforçar `--border` levemente para que cards e inputs dependam da borda em vez de sombra.

### 4. Cards do wizard / topbar
- Em `MobileShell`, `AppTopbar`, `BottomActionBar`, `VehicleSummaryCard`, e nos wrappers brancos dentro de `StepEntrada`/`cadastro.$placa.tsx`: trocar `shadow-[var(--shadow-card)]` / `shadow-[var(--shadow-bar)]` por `border border-border` (1px) e remover sombras adicionais. Topbar mantém só a cor sólida vermelha sem sombra.

### 5. Inputs e PlateInput
- Padronizar para `bg-card border border-border rounded-md` sem `shadow-sm`, focus-ring sutil em `--ring` 1px.

## Fora de escopo
- Lógica de negócio, validação, endpoints.
- Dark mode (mantido como está).

## Verificação
- Após implementar, abrir `/cadastro/WRRR7126?step=3` (Etapa 2 — Entrada) e validar que "Comitente" trunca dentro do card.
- Conferir que cards não têm mais sombra visível, somente borda fina.
