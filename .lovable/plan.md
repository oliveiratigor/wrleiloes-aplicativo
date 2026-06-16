## Objetivo
Transformar os combobox do wizard num bottom sheet estilo app (imagem 2) quando em mobile, mantendo o Popover atual em telas maiores.

## Mudanças

**`src/components/shared/SearchableSelect.tsx`**
- Detectar viewport mobile via `useIsMobile()` (hook já existente em `src/hooks/use-mobile.tsx`).
- Em desktop: manter `Popover + Command` atual.
- Em mobile: abrir `Drawer` (shadcn `@/components/ui/drawer`, posição bottom) contendo:
  - Handle e título opcional (usa `placeholder` como título).
  - `Command` com `CommandInput` (busca) no topo.
  - `CommandList` com `max-h-[60vh]` para rolagem confortável.
  - `CommandItem`s com check à esquerda, label uppercase — fechar o drawer ao selecionar.
- Trigger (botão) permanece igual, sem alteração visual.
- Aceitar prop opcional `title` para sobrescrever o título do sheet (default = placeholder).

## Resultado
- Steps do cadastro (Entrada, Veículo, etc.) ganham automaticamente a UX de bottom sheet pesquisável em mobile.
- Sem mudanças em desktop, sem alteração de API nos chamadores.
