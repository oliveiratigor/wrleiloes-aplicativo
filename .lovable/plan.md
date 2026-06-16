## Etapa 5 (Vistoria) — layout mais fluido

Arquivo: `src/components/wizard/StepVistoria.tsx`

### Mudanças

1. **Remover o card aninhado** (`Section` com `rounded-md border p-3`).
   - Substituir por um bloco simples: título como `h3` (mesmo estilo) + separação por espaço/divider sutil.
   - Mantém um único card (o do wizard externo), eliminando o "card dentro de card".

2. **Campos full-width (col-12)**:
   - Trocar `grid grid-cols-2 gap-3` (Motor e Chassi) por `space-y-3` — cada input "Nº no veículo" e "Nº na base" passa a ocupar 100% da largura, um abaixo do outro.

3. **Espaçamento geral**:
   - `space-y-5` → `space-y-8` entre seções para dar respiro já que perderam a borda.
   - Opcional: linha divisória `border-t border-border/60 pt-6` entre seções (exceto a primeira) para separação visual leve.

4. Aplicar o mesmo padrão à seção "Aprovação final", "Condição inicial", "Classificação final" — todas perdem o card, viram blocos com título + conteúdo.

### Resultado
Um único card branco (vindo do wizard) contendo todas as seções, separadas por título e respiro, com inputs em largura total — mais fluido e leve.
