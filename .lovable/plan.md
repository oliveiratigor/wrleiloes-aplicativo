## Objetivo

Transformar a edição de foto em uma experiência de **câmera nativa** — fluida, rápida, sem travas — mantendo `react-easy-crop` por baixo. O vistoriador está em campo com tempo curto: cada segundo perdido re-tirando foto ou brigando com o editor é dinheiro. O modal precisa parecer parte do sistema operacional, não um popup web.

## Princípios de performance (não-negociáveis)

1. **Zero trabalho pesado no thread de UI durante o gesto.** Pan/zoom/rotate rodam só via `react-easy-crop` (transform CSS puro, GPU). Nenhum `setState` derivado do gesto além do que a lib já faz.
2. **Preview do recorte só depois do gesto parar.** `onCropComplete` já dispara ao final. O preview thumb é gerado com `requestIdleCallback` (fallback `setTimeout 100ms`) em resolução 256px — imperceptível, não bloqueia.
3. **Blob final gerado uma única vez**, ao tocar em "Usar foto". Nunca durante o gesto.
4. **Decodificação via `createImageBitmap`** (offscreen, thread separada quando disponível), não `<img>` + canvas.
5. **`will-change: transform`** na área de crop; `touch-action: none` no container do gesto (evita scroll da página competir com o pan).
6. **Nada de framer-motion, nada de animação JS.** Só transições CSS de 150ms para fade do modal.
7. **Preload da imagem** começa no instante que o `File` chega, antes do modal montar visualmente — assim quando o usuário vê o modal, a imagem já está decodificada.

## UX de câmera nativa

Layout fullscreen puro preto, respeitando `env(safe-area-inset-*)`:

```text
┌──────────────────────────────────────────┐
│  ✕                              ↻ Refazer│  ← 56px, texto branco, sem card
├──────────────────────────────────────────┤
│                                          │
│                                          │
│           ÁREA DE CROP                   │  ← flex-1, gesto direto,
│        (borda branca fina 4:3)           │     fora do crop escurece
│                                          │     (mask overlay)
│                                          │
├──────────────────────────────────────────┤
│  ⊖ ▬▬▬▬▬●▬▬▬▬ ⊕            ⟳ 90°        │  ← slider grande, thumb 28px
├──────────────────────────────────────────┤
│                                          │
│   [ Cancelar ]      [ ✓ Usar foto ]      │  ← h-16, primário destacado,
│                                          │     safe-area bottom
└──────────────────────────────────────────┘
```

Detalhes que fazem parecer nativo:
- **Botão "Usar foto"** grande, primário, canto direito onde o polegar direito naturalmente descansa segurando o celular.
- **Botão "Cancelar"** discreto à esquerda (nunca do mesmo peso visual — evita toque acidental).
- **"Refazer foto"** no topo direito com ícone `RotateCcw` + texto curto — libera o input `capture="environment"` do slot correspondente. Um toque, câmera abre de novo. Isso é o que salva tempo em campo.
- **Zoom slider** com thumb de 28×28px (fácil de arrastar com polegar sujo/molhado).
- **Rotate 90°** com feedback tátil: `navigator.vibrate?.(10)` a cada toque.
- **Grid regra-dos-terços** sutil (branco 20% opacidade) — ajuda enquadrar rápido.
- **Overlay escuro** fora do crop (`0 0 0 9999px rgba(0,0,0,0.6)`) — deixa óbvio o que vai ser salvo, elimina necessidade de preview separado.
- **Ao confirmar**, botão vira spinner e modal fecha em ~200ms (blob de 1600px gera em <300ms em iPhone médio). Sem tela de "processando" — o usuário volta direto para o grid de fotos com o thumb já preenchido.

## Arquivos

**Novos**
- `src/components/wizard/ImageCropperModal.tsx` — modal fullscreen, tipagem estrita, ~180 linhas.
- `src/lib/image/getCroppedImage.ts` — helper puro `(imageSrc, pixelCrop, rotation, opts) => Promise<Blob>`.

**Alterado**
- `src/components/wizard/StepFotos.tsx` — troca import `PhotoEditor` → `ImageCropperModal`, adiciona callback `onRetake` que reabre o `<input capture>`.

**Removido**
- `src/components/wizard/PhotoEditor.tsx`.

Nada em `compress.ts`, `upload.ts`, edge functions, banco ou tipos de API.

## Processamento (`getCroppedImage.ts`)

```ts
export type CroppedArea = { x: number; y: number; width: number; height: number };
export type RotationDeg = 0 | 90 | 180 | 270;

export async function getCroppedImage(
  imageSrc: string,
  pixelCrop: CroppedArea,
  rotation: RotationDeg,
  opts?: { maxDim?: number; quality?: number },
): Promise<Blob>
```

Correções sobre o atual:
- `createImageBitmap(blob, { imageOrientation: "from-image" })` quando disponível — resolve EXIF de iPhone/Android sem canvas extra.
- Cálculo de rotação idêntico ao que o `react-easy-crop` usa internamente (mesma fórmula `w·|cos|+h·|sin|`), então o `pixelCrop` do callback bate exatamente com o que o usuário viu — chega ao off-by-one atual em 90°/270°.
- Downscale para 1600px no `drawImage` final (não em passo separado). JPEG q=0.9.
- Como o blob já sai perto do alvo, `compressImage` downstream (q=0.85, maxDim=1600) vira quase no-op — sem perda visível.

## Integração com `StepFotos.tsx`

```tsx
<ImageCropperModal
  file={editingFile.file}
  onConfirm={(blob) => { /* mesmo código atual */ }}
  onCancel={() => setEditingFile(null)}
  onRetake={() => {
    const slotId = editingFile.slot.type.id;
    setEditingFile(null);
    // reabre a câmera no mesmo slot no próximo tick
    requestAnimationFrame(() => inputsRef.current[slotId]?.click());
  }}
/>
```

A original nunca sobe: `onConfirm` recebe o blob já recortado; `uploadSingle` usa esse blob e ponto.

## Fora de escopo (deixando explícito)

- **Sem filtros/brilho/saturação/contraste** — não foi pedido nesta rodada e adicionar isso agora atrasa o ganho principal (fluidez). Se depois de rodar em campo o vistoriador pedir "clarear", entramos com um segundo passo (provavelmente CSS filters aplicados no export, sem lib extra).
- **Sem troca de biblioteca.** `react-easy-crop` resolve com a UX certa por volta.
- **Sem mudança de aspecto** (4:3 fica).
- **Sem mexer em upload/queue/edge/banco.**

## Verificação

- `bun run build` passa com tipagem estrita.
- Playwright headless 440×799: abrir wizard → simular arquivo → modal fullscreen, botões h-16, slider funcional, rotate gira, "Usar foto" fecha em <500ms com blob no state.
- Medir no DevTools mobile: gesto de pan/zoom mantendo 60fps (Performance panel — sem long tasks no main thread durante o drag).
