# Plano — Wizard de cadastro/vistoria alinhado ao Backoffice

Hoje o app só tem 3 telas-protótipo (`buscar`, `cadastro/$placa`, `fotos/$entryId`) e fala com endpoints que **não existem** no Backoffice (`process-single-media` foi removido, `cadastrar-produto` espera outro shape, fotos são `base64` em vez de S3 direto). Vamos reescrever em cima do contrato real.

## Fluxos cobertos

```text
[Busca placa/chassi]
        │
        ▼
   buscar-produto ───────────────────────────────────────────────┐
        │                                                        │
   ┌────┴───────────────────────────────────────────────┐        │
   ▼                ▼                                   ▼        │
NÃO ENCONTRADO    ENCONTRADO + entrada aberta     ENCONTRADO + sem entrada aberta
   │                │                                   │
   │  consulta-veiculo (WR/FIPE) em paralelo            │
   │  pré-preenche Veículo                              │
   ▼                ▼                                   ▼
NOVO CADASTRO    EDITAR entrada vigente             REENTRADA
(5 passos)       (pula passo 1+2, herda tudo)       (herda operacional, vistoria zerada)
   │                │                                   │
   └────────────────┴───────────────────────────────────┘
                            │
                            ▼
                  cadastrar-produto (cria/atualiza products + product_entries)
                            │
                            ▼
                  Passo 4 — Fotos (S3 presign + PUT direto + insert em media)
                            │
                            ▼
                  Passo 5 — Vistoria (divergências motor/chassi + classificação + aprovação)
                            │
                            ▼
                  Concluído → volta para /buscar
```

### Regras dos três estados

| Estado | Tela inicial | Pré-preencher Veículo de | Operacional (filial etc.) | Fotos | Vistoria |
| --- | --- | --- | --- | --- | --- |
| Não encontrado (novo) | passo 2 Veículo | `consulta-veiculo` | usuário escolhe | zeradas | zerada |
| Encontrado, **com** entrada aberta | passo 3 (ou direto no resumo) | `buscar-produto.product` + `fipe_data` | herdado da entrada aberta, editável | `buscar-produto.media` já preenche grid | divergências/status carregados |
| Encontrado, **sem** entrada aberta (reentrada) | passo 3 Entrada | `buscar-produto.product` + `fipe_data` (read-only nos imutáveis: placa, chassi, renavam, motor) | herdado da última entrada encerrada, editável | zeradas | zerada |

## Rotas (TanStack Start)

```
src/routes/_authenticated/
  buscar.tsx                     (atualizada)
  cadastro.$placa.tsx            (reescrita: wizard de 5 passos via ?step=)
  cadastro.$placa.fotos.tsx      (passo 4 isolado p/ permitir refresh sem perder upload)
  cadastro.$placa.vistoria.tsx   (passo 5)
  diagnostico.tsx                (visualiza ring buffer + system_logs source='app-mobile-v2')
```

Search-params (`validateSearch` com Zod):
- `mode`: `"new" | "reentry" | "edit"`
- `productId`, `entryId` (string opcional, presentes após o passo 3)
- `step`: `1..5` (default = 1)

## Camada de API (`src/lib/api/`)

Tipos e wrappers tipados, todos passando por `apiCall` (já existe):

- `buscar.ts` → `buscarProduto({ plate? chassis? renavam? uuid? }) : BuscarProdutoResponse`
- `consulta.ts` → `consultaVeiculo({ plate?, chassis? })`
- `cadastro.ts` → `cadastrarProduto(payload)` montando `{ user_data, product, fipe_data, item_attributes }`
- `lookups.ts` → `tipos`, `cores`, `marcas`, `filiais`, `depositos`, `comitentes`, `tipos-entrada`, `tipos-fotos`, `verificacao-status`. Cacheados via TanStack Query (`staleTime: 5min`).
- `upload.ts` → `uploadFotoDirect(file, { productId, entryId, photoTypeId, accountId })`:
  1. monta path `media/{accountId}/{productId}/{photoTypeId}_{ts}.{ext}`
  2. chama `app-s3-presign` (batch suportado)
  3. `PUT` direto no `upload_url`
  4. `soft-delete` da foto anterior do mesmo `(entry, photo_type)`
  5. `insert` em `public.media` com `url=final_url`, `path`, `mime_type`, `size`, `status:'uploaded'`
  6. devolve `{ mediaId, url }`
- `vistoria.ts` → `salvarVistoria(entryId, { engineDivs, chassisDivs, rejectionReasons, initialCondition, finalClassification, finalApproval, rejectionNotes, engineNumberVehicle/Base, chassisNumberVehicle/Base, towing })`. Faz `delete` das linhas antigas de `product_divergences` daquela entry/types afetados e re-insere, e `update` em `product_entries` (`final_approval_status`, `rejection_notes`, `charge_tow`, `km_initial/final`).

Loaders vs componentes: lookups e `buscar-produto`/`consulta-veiculo` ficam em `queryOptions` lidos por `useSuspenseQuery`; o loader das telas chama `ensureQueryData`. Mutations (cadastrar, upload, vistoria) ficam em `useMutation`.

## Passos do wizard

**Passo 1 — Busca** (`/buscar`): mantém UI atual, dispara `buscarProduto` + `consultaVeiculo` em paralelo. Decisão:
- não encontrado → `mode=new`, passo 2 com dados da consulta WR
- entrada aberta → `mode=edit`, vai para resumo do passo 5 (pré-carregado), com tabs voltando aos demais
- sem entrada aberta → `mode=reentry`, passo 3 com operacional vazio mas botão "herdar da última saída"

**Passo 2 — Veículo**: placa, chassi (com aviso de placeholder), renavam, motor, marca, modelo, cor, combustível, ano fab/modelo, KM, tem chave, `type_id`, `fipe_codigo`, `fipe_price`. Campos read-only quando `mode=edit/reentry` para placa/chassi/renavam. Mostra badge "dados pré-preenchidos via consulta WR" quando aplicável.

**Passo 3 — Entrada**: filial (obrigatória), depósito, comitente, `entry_type_id`, data, guincho (`charge_towing`, `km_initial`, `km_final`). Botão "Salvar e continuar" → chama `cadastrar-produto` com `mode==='edit' ? {uuid: productId, ...} : {...}`. Captura `productId`/`entryId` na URL.

**Passo 4 — Fotos** (`cadastro.$placa.fotos`): grid ordenado por `photo_types.sort_order`, marcadores `is_required`. Cada slot:
- placeholder → "Tirar/Selecionar"
- upload em paralelo com fila local (concorrência = 3) usando `uploadFotoDirect`
- retry individual em erro
- compressão client-side via `<canvas>` para max 1600px lado maior + JPEG q=0.85 (reduz egress S3, evita >5MB)
- HEIC: ler MIME, se `image/heic` mostrar aviso para converter ou usar câmera padrão
- progresso por slot + barra geral; botão "Continuar" libera quando todos os `is_required` estão `uploaded`

**Passo 5 — Vistoria**: três blocos
1. **Motor/Chassi**: `number_vehicle`, `number_base`, multi-checkbox de `verification_status` filtrados por `applies_to='engine'` / `'chassis'`
2. **Condição inicial / classificação final**: dois `RadioGroup` com `applies_to='initial_condition'` e `'final_classification'`
3. **Aprovação**: toggle Aprovado/Reprovado/Pendente; se Reprovado, multi-select de `applies_to='rejection'` + `rejection_notes` obrigatório; observações livres compartilhadas
- Botão "Concluir" → `salvarVistoria`, marca entrada como finalizada (não fecha `exit_date`, só seta `final_approval_status`), invalida queries e volta para `/buscar` com toast.

## Upload — guardrails para não sobrecarregar Supabase

- **Sempre** S3 direto (`app-s3-presign` + PUT). Nada de base64 no payload, nada de `app-s3-upload` proxy.
- Compressão client-side antes do PUT (reduz ~70% do tamanho típico de foto de celular).
- Concorrência limitada (3) — evita estourar conexões e bloquear UI.
- `insert` em `media` só **após** PUT 200; em falha, não cria linha órfã.
- Soft-delete + S3 DELETE da foto anterior do mesmo `(entry, photo_type)` para evitar acúmulo.
- `media-temp` Storage do Supabase **não é tocado** pelo painel (é fluxo do app mobile legado).
- Edge functions chamadas: `app-s3-presign`, `buscar-produto`, `consulta-veiculo`, `cadastrar-produto`, lookups, `verificacao-status`. Nenhuma carrega arquivo binário.

## Detalhes técnicos

- Telemetria: `apiCall` já loga em `system_logs source='app-mobile-v2'` + ring buffer local. Manter; adicionar tela `/diagnostico`.
- Auth: já temos `_authenticated` layout e `panel-login` (token + opcional TOTP).
- Erros do `cadastrar-produto`: tratar códigos `OPEN_ENTRY_EXISTS` (409 → propõe ir para modo edit), `PLATE_ALREADY_EXISTS`, `CHASSIS_ALREADY_EXISTS`, `MISSING_BRANCH`, `USER_REQUIRED`.
- `account.id` e `user.uuid` vêm do `useAuth()` (já existe). `user_data.uuid` obrigatório no payload.
- Estado entre passos: persistir wizard em `sessionStorage` (chave por placa) para sobreviver a refresh durante upload demorado.
- Listas grandes (marcas, comitentes): usar `SearchableSelect` (componente novo simples baseado em `Command` do shadcn).

## Arquivos a criar/editar

Novos:
- `src/lib/api/buscar.ts`, `consulta.ts`, `cadastro.ts`, `lookups.ts`, `upload.ts`, `vistoria.ts`, `types.ts`
- `src/lib/image/compress.ts` (canvas → blob)
- `src/components/wizard/Stepper.tsx`
- `src/components/wizard/StepVeiculo.tsx`, `StepEntrada.tsx`, `StepFotos.tsx`, `StepVistoria.tsx`
- `src/components/shared/SearchableSelect.tsx`
- `src/routes/_authenticated/cadastro.$placa.fotos.tsx`
- `src/routes/_authenticated/cadastro.$placa.vistoria.tsx`
- `src/routes/_authenticated/diagnostico.tsx`

Editados:
- `src/routes/_authenticated/buscar.tsx` (decisão dos 3 fluxos + chamada paralela WR)
- `src/routes/_authenticated/cadastro.$placa.tsx` (vira host do wizard com `?step=`)
- `src/lib/api.ts` (manter `apiCall`, mover tipos pra `api/types.ts`)

Remover:
- `src/routes/_authenticated/fotos.$entryId.tsx` (substituída pela rota dentro do wizard; `process-single-media` não existe mais)

## Validação ao final

1. Buscar placa inexistente → wizard novo, salva, sobe foto, vistoria → registro aparece em `products`/`product_entries`/`media`/`product_divergences`.
2. Buscar placa existente com entrada aberta → cai no resumo, edita observação, regrava sem duplicar entrada.
3. Buscar placa existente sem entrada aberta → cria nova `product_entries` reaproveitando `products.id`, fotos/vistoria novas.
4. Conferir no S3 que objetos antigos do mesmo `(entry, photo_type)` são deletados ao substituir.
5. `/diagnostico` mostra latência das chamadas e erros.

Sem mudanças no Backoffice — tudo do lado do painel.
