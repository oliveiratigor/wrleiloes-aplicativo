## Objetivo

Permitir avançar da Etapa 3 (Fotos) para a Etapa 4 (Vistoria) sem precisar enviar fotos, apenas para validar o restante do fluxo do cadastro. Mudança pontual, reversível e isolada — sem mexer em rotas, auth, schemas ou regras de negócio.

## O que muda

Habilitar o botão **"Ir para vistoria"** mesmo quando nenhuma foto obrigatória foi enviada, atrás de uma flag de bypass controlada por env var.

- Flag: `VITE_BYPASS_FOTOS_REQUIRED` (default `false`).
- Quando `true`:
  - O `StepFotos` reporta `onAllRequiredDone(true)` independente do estado dos slots.
  - O card mostra um aviso discreto ("Bypass de fotos ativo — somente para testes") para deixar claro que está em modo de teste.
- Quando `false` (produção/default): comportamento atual, nada muda.

Nenhuma foto fake é inserida no banco. A entrada simplesmente segue para a vistoria sem mídia associada.

## Arquivos afetados

- `src/components/wizard/StepFotos.tsx` — leitura da flag + override do `onAllRequiredDone` + banner de aviso quando ativo.
- `.env` (local) — adicionar `VITE_BYPASS_FOTOS_REQUIRED=true` para a sessão de teste.

## Como ligar/desligar

- Ligar: setar `VITE_BYPASS_FOTOS_REQUIRED=true` e reiniciar o dev server.
- Desligar: remover a variável (ou setar `false`). O fluxo volta ao normal automaticamente.

## Fora do escopo

- Não altera o `StepVistoria`, gating do wizard ou `productEntries`.
- Não cria fotos fictícias no Storage/DB.
- Não toca em RLS, edge functions ou rotas.

## Validação

1. Com a flag ativa, abrir `/cadastro/THA1988?step=3`: o botão "Ir para vistoria" fica habilitado mesmo com 0/20 fotos e aparece o banner de bypass.
2. Avançar para Etapa 4 e validar o restante do fluxo (Vistoria).
3. Desligar a flag e confirmar que o botão volta a exigir as fotos obrigatórias.

Posso aplicar?
