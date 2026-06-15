# Portar design system do Backoffice

## O que vamos copiar

Tokens semânticos do Backoffice (vermelho WR + tons de cinza + dark sidebar) e a fonte Inter. O Backoffice usa Tailwind v3 com HSL; este app usa Tailwind v4 com `oklch`. Mantemos os mesmos **valores** (HSL embrulhado em `hsl(...)`) — Tailwind v4 aceita qualquer color string nas variáveis.

## Mudanças

### 1. `src/styles.css`
Substituir o bloco de tokens pelo do Backoffice, em formato compatível com v4:

- `:root` e `.dark` com as cores HSL do Backoffice, escritas como `hsl(0 72% 47%)`.
- Adicionar tokens que o Backoffice tem e o app não: `--success`, `--success-foreground`, `--warning`, `--warning-foreground`, e os `--sidebar-*` (incluindo `--sidebar-muted-foreground`).
- Atualizar `@theme inline` para mapear esses novos tokens (`--color-success`, `--color-warning`, `--color-sidebar-muted-foreground`).
- Trocar `--radius` para `0.5rem` (valor do Backoffice).
- Adicionar `--font-sans: 'Inter', sans-serif;` em `@theme inline` para gerar `font-sans` com Inter.
- Manter `@import "tailwindcss" source(none); @source "../src"; @import "tw-animate-css";` e `@custom-variant dark` como estão.
- Manter `body { background-color/color }` e `* { border-color }`.
- Adicionar utilitários `.scrollbar-thin` / `.scrollbar-none` que o Backoffice usa, via `@utility` (sintaxe v4).
- **Não** usar `@import` de URL de fonte (Lightning CSS quebra). Fonte vem via `<link>`.

### 2. `src/routes/__root.tsx`
Adicionar à `head().links` os `<link>` da Inter:
```ts
{ rel: "preconnect", href: "https://fonts.googleapis.com" },
{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" },
```

## Não muda

- Componentes shadcn já instalados continuam funcionando (consomem os mesmos nomes de token: `bg-primary`, `text-foreground`, etc.).
- Nenhuma alteração nas rotas/telas — apenas o sistema de cores e a tipografia.
- Sem dark mode toggle (Backoffice também não força; usamos só `:root` por padrão).

## Validação

- Abrir `/auth` e `/buscar`: botão primário deve ficar **vermelho WR**, fundo cinza claro, texto Inter.
- Inputs e cards devem manter contraste correto.
