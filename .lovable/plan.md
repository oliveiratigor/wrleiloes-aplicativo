## Plano: investigação THA1988 + correção

**Pré-requisito (você):** ativar "Read database" como Always allow em Lovable Cloud → Settings. Sem isso eu não consigo rodar SQL daqui.

### 1. Investigação SQL (eu rodo)

Três queries para isolar a causa:

1. **Janela do upload** — `media` criadas entre 10:00–10:30 de 16/06/2026 (id, product_id, product_entry_id, account_id, url, status, created_at, deleted_at).
2. **Identificação do veículo** — `products` e `product_entries` com placa `THA1988` (id, account_id, created_at).
3. **Histórico de mídias do veículo** — todas as `media` ligadas ao produto THA1988, incluindo soft-deletadas, para ver se a foto nova existe mas está invisível.

### 2. Diagnóstico esperado (uma destas hipóteses)

- **A. Foto não existe na tabela** → INSERT silenciosamente falhou (RLS). Olhar policies de `media` INSERT.
- **B. Foto existe mas com `account_id`/`product_entry_id` divergente** → tenant errado; back office filtra e não acha. O hardening já no `upload.ts` previne novos casos, mas precisa de migration corrigindo o registro órfão.
- **C. Foto existe e correta, mas a antiga continua ativa (`deleted_at IS NULL`)** → soft-delete bloqueado por RLS; back office mostra a antiga. Ajustar policy UPDATE de `media`.
- **D. Foto no S3 mas URL nunca persistida** → erro entre PUT S3 e INSERT; checar logs.

### 3. Correção (conforme achado)

- **Se A ou C** → migration ajustando RLS policies de `media` (INSERT/UPDATE escopados a `account_id` do usuário via `has_role`/perfil).
- **Se B** → migration corretiva no registro do THA1988 + revisar de onde vinha o `accountId` errado no `StepFotos` (provavelmente prop ou contexto).
- **Se D** → adicionar log estruturado no `uploadFotoDirect` e investigar logs do worker.

### 4. Bug paralelo (campos que logam mas não persistem)

Inspecionar `src/lib/api/cadastro.ts` (chamada à edge function `cadastrar-produto`):
- Verificar se a resposta é checada por erro
- Verificar invalidate do React Query após mutation
- Conferir RLS na tabela alvo
Se for edge function, ler `supabase/functions/cadastrar-produto/index.ts`.

### Entregáveis

- Relatório do que o SQL mostrou
- Migration(s) de correção (RLS e/ou dado)
- Patch no front se necessário (`accountId`, invalidate)
- Confirmação de que o registro do THA1988 fica visível no back office

Me avisa quando o "Read database" estiver como Always allow que eu disparo as queries.
