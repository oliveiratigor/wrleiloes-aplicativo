## Header interno no estilo da tela de login

Aplicar o mesmo visual da `/auth` ao header das páginas internas (`/buscar`, `/cadastro/...`).

### 1. `src/components/mobile/AppTopbar.tsx`

Reescrever o componente para:

- **Gradiente vermelho** igual ao login: `linear-gradient(160deg, #990E18 0%, #C91826 100%)`.
- **Layout em coluna**, respeitando `safe-area-inset-top`, com padding `px-7 pt-12 pb-10`.
- **Topo**: linha com logo (`h-9 w-auto`, mesma do login) à esquerda + botão sair (ícone `LogOut` em `bg-white/10 rounded-xl h-10 w-10`) à direita.
- **Bloco de saudação** abaixo: título elegante `Olá, Rafael` (`text-2xl font-bold tracking-tight`) + subtítulo opcional (default: "Bem-vindo de volta.") em `text-sm text-white/[0.82]`.
- O componente continua aceitando `subtitle` opcional para sobrescrever a linha de baixo.

### 2. `src/components/mobile/MobileShell.tsx`

Para que o card branco com cantos arredondados apareça igual ao login:

- `bg-background` do wrapper externo → `bg-white` (não há mais fundo cinza).
- O `<main>` ganha `-mt-6 rounded-t-[28px] bg-white` com sombra suave `0 -8px 24px rgba(15,23,42,0.06)` **somente quando há `topbar`**.
- Aumentar `pt-4` → `pt-8` para dar respiro ao conteúdo logo abaixo da curva.

### Resultado

Mesma identidade visual da tela de login:

```text
┌─────────────────────────┐
│ [gradiente vermelho]    │
│  WR LEILÕES        [⇥] │
│                         │
│  Olá, Rafael            │
│  Bem-vindo de volta.    │
│ ╭─────────────────────╮ │ ← card branco rounded-t
│ │ Pesquisar veículo   │ │
│ │ ...                 │ │
```

Nada de lógica é alterado, só apresentação.
