## Causa

`src/routes/_authenticated/cadastro.$placa.tsx` virou rota-pai de `cadastro.$placa.sucesso.tsx` por causa do file-based routing (dot-naming cria relação pai/filho). Como o arquivo pai renderiza o wizard inteiro em vez de `<Outlet />`, ao acessar `/cadastro/THA1988/sucesso` o TanStack monta a página pai (o wizard volta para "Etapa 1 de 4 — Veículo") e a tela de sucesso nunca aparece. A URL muda corretamente, mas visualmente parece que "voltou pra home".

## Correção

Separar layout e leaf:

1. Renomear o arquivo atual do wizard para um leaf:
   - `cadastro.$placa.tsx` → `cadastro.$placa.index.tsx` (mantém todo o conteúdo do wizard; só a string em `createFileRoute` muda para `/_authenticated/cadastro/$placa/`).

2. Criar um novo `cadastro.$placa.tsx` minimalista que serve apenas como layout:
   ```tsx
   import { createFileRoute, Outlet } from "@tanstack/react-router";
   export const Route = createFileRoute("/_authenticated/cadastro/$placa")({
     component: () => <Outlet />,
   });
   ```

3. `cadastro.$placa.sucesso.tsx` continua igual — agora renderiza dentro do `<Outlet />` do layout.

Sem mudanças em business logic, navegação ou no `finishVistoria`. Depois, validar abrindo `/cadastro/THA1988/sucesso?mode=edit&approval=approved` no preview e refazendo um fluxo completo até "Concluir".
