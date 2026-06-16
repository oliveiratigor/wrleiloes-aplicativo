## Ajustes finos na tela de login

Edições em `src/routes/auth.tsx`:

1. **Cantos arredondados visíveis** — aumentar o raio e o overlap do card sobre o header para que a curvatura apareça com clareza:
   - `rounded-t-[28px]` (mantém) + `-mt-6` (sobreposição menor mas garantida)
   - garantir que não há `overflow-hidden` num ancestral cortando

2. **Logo 30% menor** — `h-12` (48px) → `h-9` (36px).

3. **"Acesse sua conta" mais baixa, 40px do card** — reorganizar o header para empurrar título/subtítulo para perto do card:
   - usar `flex flex-col` no header com o bloco de texto (título + subtítulo) com `mt-auto` (encosta no rodapé do header)
   - header com `min-h-[300px]` e `pb-10` (40px) → subtítulo fica a 40px da borda do card branco
   - logo fica no topo, texto fica no fundo do bloco vermelho

4. **Respiro no topo do card** — `pt-8` → `pt-12` (48px) para "Entrar no sistema" não colar no topo.

Sem alterações de lógica.
