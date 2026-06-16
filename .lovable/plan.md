## Mudanças

**`src/routes/_authenticated/cadastro.$placa.tsx`**
- Remover borda dos wrappers de etapa e do stepper: tirar `border border-border` e `shadow-card` (linhas 305 e 320). Manter `bg-card` (ou trocar por transparente) e `rounded` apenas se necessário — visual mais fluido sem caixa.

**`src/components/wizard/StepEntrada.tsx`** (linha 83)
- Substituir `grid grid-cols-2 gap-3` (Depósito + Comitente) por `space-y-3` → ambos viram col-12.

**`src/components/wizard/StepVeiculo.tsx`** (linhas 30, 61, 96, 124, 145)
- Trocar todos os `grid grid-cols-2 gap-3` e `grid grid-cols-3 gap-3` por `space-y-3` para que cada campo ocupe 100% da largura.

**`src/components/wizard/StepVistoria.tsx`**
- Já está col-12; sem mudanças (apenas confirmar).

**`src/components/wizard/StepFotos.tsx`** (linha 147)
- Manter `grid grid-cols-2` aqui — são miniaturas de fotos, não campos de formulário.

## Resultado
- Steps sem "card dentro de card": só o fundo do wizard sem borda visível.
- Todos os inputs/selects de formulário ocupam largura total em todas as etapas.
