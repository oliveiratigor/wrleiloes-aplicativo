# Corrigir login do app — contrato do `panel-login`

## Problema

O `panel-login` do Backoffice retorna campos diferentes do que `src/lib/auth.ts` espera. Resultado: ao clicar **Entrar**, o request vai ao servidor, volta com sucesso, mas o código não reconhece a resposta — o botão volta a "Entrar" sem navegar e sem mostrar erro. Quando há 2FA, o app trata como erro genérico porque `ok` vem `false`.

### Contrato real (Backoffice)

| Caso | Status HTTP | Corpo |
|---|---|---|
| Sucesso (sem 2FA) | 200 | `{ ok: true, token, refresh_token, user, session, account, available_accounts }` |
| Sucesso (2FA OK) | 200 | igual ao de cima |
| Precisa 2FA | 200 | `{ ok: false, requires_2fa: true, temp_token, message }` |
| Credenciais inválidas | 401 | `{ ok: false, message }` (vem em `response.error.context`) |
| 2FA inválido / token expirado | 200 | `{ ok: false, message }` |

O app hoje espera `needs_2fa` e `access_token` — campos que **não existem** na resposta.

## Solução

Reescrever apenas `src/lib/auth.ts` para casar com o contrato real. Sem mudanças em `api.ts` (telemetria continua igual) e sem alterar nada no Backoffice.

### Mudanças em `src/lib/auth.ts`

1. **Tipos** alinhados ao contrato:
   - `LoginStage1Result`:
     - `{ ok: true; token: string; refresh_token: string; user: unknown }`
     - `{ ok: false; requires_2fa: true; temp_token: string }`
     - `{ ok: false; message: string }`
   - `LoginStage2Result`:
     - `{ ok: true; token: string; refresh_token: string; user: unknown }`
     - `{ ok: false; message: string }`

2. **Parser de erro HTTP**: quando `apiCall` retorna `error` mas o `data` tem `message`/`requires_2fa`, usar `data` (panel-login devolve 401 com corpo útil). Para isso, ler `data` mesmo quando `error` está presente — `api.ts` já popula `data` antes de detectar `res.error`, mas a invoke do supabase-js descarta o body em status não-2xx. Solução: em `auth.ts`, se `data` for null e houver `error`, retornar `{ ok: false, message: error }`. Para o caso 401 com message útil, basta exibir "Credenciais inválidas." (mensagem do Edge) — vamos extrair de `error` quando vier no formato `"Edge Function returned a non-2xx status code"` e cair num fallback amigável.

   Como na prática o supabase-js engole o body do 401, manter a UX boa: se `error && !data`, mostrar **"Credenciais inválidas ou erro de conexão."** (mensagem padrão) — suficiente para o caso de uso.

3. **`loginWithPassword`**: retornar normalizado `{ ok: true, token, refresh_token, user }` ou `{ ok: false, requires_2fa: true, temp_token }` ou `{ ok: false, message }`.

4. **`loginWithTotp`**: idem para stage 2.

5. **`applySession(token, refresh_token)`**: continua igual (`supabase.auth.setSession`).

### Mudanças em `src/routes/auth.tsx`

Ajustar dois pontos de leitura para os novos nomes:

- `submitPassword`: trocar `"needs_2fa" in res && res.needs_2fa` por `!res.ok && "requires_2fa" in res && res.requires_2fa`; trocar `res.access_token` por `res.token`.
- `submitTotp`: trocar `res.access_token` por `res.token`.

Nenhuma mudança visual; apenas o mapeamento dos campos.

## Validação

1. Tentar logar com usuário sem 2FA → deve navegar para `/buscar`.
2. Tentar logar com usuário com 2FA → deve aparecer tela do código.
3. Senha errada → deve mostrar mensagem de erro.

## Fora do escopo

- Não tocar no `panel-login` (Backoffice) — contrato fica intacto.
- Não mexer em telemetria nem em `api.ts`.
- Diagnóstico no Backoffice (`/diagnostico-app`) fica para outra etapa.
