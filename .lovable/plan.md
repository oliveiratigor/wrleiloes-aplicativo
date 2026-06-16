## Objetivo
Padronizar a margem lateral entre header, conteúdo da página e bottom bar — alinhar tudo na mesma linha visual e aumentar a respiração lateral do conteúdo.

## Estado atual
- Header (`AppTopbar`): `px-7` (28px) ✅
- Conteúdo (`MobileShell` main): `px-6` (24px) — mais apertado
- Bottom bar (`BottomActionBar`): `px-4` (16px) — encostado nas bordas

## Mudanças

**`src/components/mobile/MobileShell.tsx`** (linha 20-21)
- `px-4` / `px-6` → `px-7` no `<main>`, alinhando o conteúdo às bordas do header.

**`src/components/mobile/BottomActionBar.tsx`** (linha 12)
- `px-4` → `px-7` no container interno dos botões, alinhando-os ao header e ao conteúdo.

## Resultado
Header, conteúdo da página e botões do rodapé compartilham a mesma margem lateral (28px), criando uma "coluna" visual consistente e dando mais respiro ao conteúdo interno.
