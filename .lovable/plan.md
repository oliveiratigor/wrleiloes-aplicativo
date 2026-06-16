## Refatorar tela de login no estilo da referência

Ajustar `src/routes/auth.tsx` para o visual da imagem enviada: header vermelho ocupando o topo, e um card branco grande ocupando a largura total da tela com cantos arredondados apenas no topo, sem fundo cinza ao redor.

### Mudanças

1. **Container externo**: remover `bg-[#F4F5F7]` e o `max-w-md`. O wrapper passa a ser apenas `min-h-dvh bg-white flex flex-col`. O card branco encosta nas bordas laterais da tela.

2. **Header vermelho**: mantém o gradiente atual (`linear-gradient(160deg, #990E18, #C91826)`), padding lateral confortável (`px-7`), respeita `safe-area-inset-top`. Mantém logo + título "Acesse sua conta" + subtítulo. Reduzir o `pb` para ~`pb-20` para o card subir mais.

3. **Card branco**:
   - Largura total (sem `max-w-md`, sem `px-6` no `main`).
   - Cantos arredondados apenas no topo: `rounded-t-[32px]`.
   - Sobe sobre o header com margem negativa (`-mt-8`).
   - Fundo branco sólido, sem borda lateral, sombra suave apenas no topo (`shadow-[0_-8px_24px_rgba(15,23,42,0.06)]`).
   - Padding interno generoso (`px-6 pt-8 pb-10`).
   - `flex-1` para preencher o resto da tela.

4. **Footer**: continua com `v1.0` centralizado, agora dentro do card branco (mesmo fundo), no rodapé via `mt-auto`.

5. **Conteúdo dos campos / botão**: sem alterações funcionais. Apenas o invólucro muda.

Nada de lógica de autenticação é tocado.

### Resultado visual

```text
┌─────────────────────────┐
│  [gradiente vermelho]   │
│   Logo                  │
│   Acesse sua conta      │
│   subtítulo             │
│ ╭─────────────────────╮ │ ← card branco, largura total,
│ │  E-MAIL             │ │   cantos arredondados só no topo
│ │  [input]            │ │
│ │  SENHA              │ │
│ │  [input]            │ │
│ │                     │ │
│ │  [  Entrar  ]       │ │
│ │  Esqueci minha senha│ │
│ │                     │ │
│ │           v1.0      │ │
│ ╰─────────────────────╯ │
└─────────────────────────┘
```
