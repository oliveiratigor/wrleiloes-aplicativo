## Objetivo
Quando o app detecta "sessão sem identidade" no `saveStep3` do cadastro, em vez de mostrar a mensagem de erro, deslogar e mandar o usuário para `/auth`, e ao fazer login bem-sucedido devolvê-lo à URL onde estava.

## Mudanças

### 1. `src/routes/auth.tsx` — aceitar `?redirect=`
- Adicionar `validateSearch` ao `createFileRoute("/auth")` aceitando `redirect?: string`.
- Em `AuthPage`, ler `Route.useSearch()` para obter `redirect`.
- Helper `goNext()`: se `redirect` existir e for um path interno (começa com `/` e não com `//`), navegar via `router.history.push(redirect)`; caso contrário, `navigate({ to: "/buscar", replace: true })`.
- Substituir os três `navigate({ to: "/buscar", replace: true })` (auto-redirect quando já há sessão, pós-senha, pós-TOTP) por `goNext()`.

### 2. `src/routes/_authenticated/cadastro.$placa.tsx` — auto-recuperar
- Em `saveStep3`, trocar o ramo `if (!user?.uuid) { setError(...); return; }` por:
  ```ts
  if (!user?.uuid) {
    await signOut();
    navigate({
      to: "/auth",
      search: { redirect: window.location.pathname + window.location.search },
      replace: true,
    });
    return;
  }
  ```
- Importar `signOut` de `@/lib/auth`.

## Fora de escopo
- Não mexer no gate `_authenticated/route.tsx` (já redireciona quando o Supabase perde sessão).
- Não tratar outros pontos com `user?.uuid` (não há outros call sites com essa mensagem).
- Persistência do rascunho do wizard ao voltar: o estado em memória se perde naturalmente, mas a URL preserva a placa/step para reabrir o mesmo cadastro.
