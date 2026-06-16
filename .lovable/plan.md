## Objetivo
Exibir todos os rótulos de opções dos comboboxes (`SearchableSelect`) em CAIXA ALTA, sem alterar os dados de origem.

## Mudança
Em `src/components/shared/SearchableSelect.tsx`:
- Adicionar `uppercase` à `<span>` do label no trigger (texto selecionado / placeholder).
- Adicionar `uppercase` ao `CommandItem` (lista de opções).
- Manter o `CommandInput` (busca) em texto normal — a busca já é case-insensitive via `cmdk`.

Isso afeta automaticamente Filial, Depósito, Comitente e Tipo de entrada (Etapa Entrada) e qualquer outro uso futuro do componente.

## Fora de escopo
- Não normalizar no backend nem no `lookups.ts` — apenas apresentação.
- Placeholders já curtos como "Selecionar…" também ficarão em caixa alta para consistência visual (`SELECIONAR…`).
