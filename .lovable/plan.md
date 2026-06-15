## Diagnóstico

Reli os Edge Functions do Backoffice (`buscar-produto`, `app-consulta-veiculo`) e a camada do app. Encontrei três defeitos que explicam o sintoma "WRRR7126 não popula nada":

### 1. Busca está consultando pelo campo errado (causa raiz do WRRR7126)

`src/routes/_authenticated/buscar.tsx` chama:

```ts
buscarProduto({ plate: placa, chassis: placa })
```

Mas o Edge `buscar-produto` usa cascata `if/else if`, **chassi tem prioridade sobre placa**:

```ts
if (uuid) …
else if (chassis) query = query.eq("chassis", chassis);
else if (renavam) query = query.eq("renavam", renavam);
else if (plate) query = query.eq("plate", plate);
```

Resultado: a query vira `WHERE chassis = 'WRRR7126'` → não encontra → o app cai no fluxo "novo cadastro" e ignora o produto existente. Por isso os campos chegam vazios e o passo 2 fica em branco.

Corrigir: aceitar **placa ou renavam** como identificadores de busca (chassi sai do app por enquanto) e enviar apenas o campo certo, nunca os dois.

### 2. `fipe_data` do backend devolve códigos, não nomes

O Edge mapeia `brand: product.fipe_brand_code` e `model: product.fipe_model_code`. O app joga isso direto em `wiz.brand`, então o `SearchableSelect` de marca (alimentado pela tabela `brands` por nome) não casa — em edição/reentrada a marca aparece em branco.

Corrigir: tratar `fipe_data.brand` como código (não nome) e exibir aviso "Marca não cadastrada — selecione" quando o valor não casa com nenhuma opção. `model` segue como texto livre.

### 3. Filial não está restrita ao usuário logado (regra que faltou)

`filiaisQuery` faz `supabase.from('branches').select('*')` confiando 100% em RLS. Mas:

- O `panel-login` retorna `user.branch_uuids` (filiais permitidas) e `user.is_super_admin`.
- Para usuário **operacional**, a lista precisa ser filtrada por `branch_uuids` no client (defesa em profundidade — mesmo que a RLS deixe passar mais).
- Mesma regra para **Comitentes** via `principals_uuids`.
- Quando o usuário tem **uma única filial permitida**, o passo 3 já vem com ela pré-selecionada e bloqueada (não-admin).

## Mudanças

### `src/lib/api/buscar.ts`
- Novo helper `detectIdentifier(value)` que devolve `{ plate?, renavam? }` exclusivos:
    - Só dígitos com 9–11 chars → `renavam`.
    - Padrão Mercosul `[A-Z]{3}\d[A-Z0-9]\d{2}` ou antigo `[A-Z]{3}\d{4}` → `plate`.
    - Senão → erro de validação ("Informe uma placa ou renavam válido").

### `src/routes/_authenticated/buscar.tsx`
- Trocar o label do input para "Placa ou renavam" e o placeholder.
- Usar `detectIdentifier(query)` para montar o payload do `buscarProduto`.
- `consultaVeiculo` só roda quando o identificador é placa (a API WR não aceita renavam).
- Mostrar erro claro quando o identificador não é válido, antes de chamar a API.

### `src/lib/api/lookups.ts`
- `filiaisQuery` vira `filiaisQueryFor(user)` (factory) que filtra `id in branch_uuids` quando não é super admin.
- `comitentesQuery` vira `comitentesQueryFor(user)` com o mesmo padrão usando `principals_uuids`.
- `tiposEntradaQuery`, `depositosQuery`, `tiposQuery`, `coresQuery`, `marcasQuery` continuam globais.

### `src/components/wizard/StepEntrada.tsx`
- Receber `user` via `useAuth` e usar as queries factory.
- Auto-selecionar a filial quando a lista filtrada tem 1 item e `data.branchId` está vazio.
- Desabilitar o select de filial para não-admin com 1 filial (badge "Filial fixa do usuário").
- Se a filial vinda do produto (modo edit/reentry) não está entre as permitidas, mostrar alerta "Sem permissão para esta filial".

### `src/components/wizard/StepVeiculo.tsx`
- Quando `data.brand` não casa com nenhuma `option.value` das marcas, exibir aviso pequeno "Marca não cadastrada — selecione".
- Manter identidade (placa/chassi/renavam) bloqueada em `edit`/`reentry` (já está).

### `src/lib/api/types.ts`
- Comentar explicitamente que `fipe_data.brand` é **código FIPE**, não nome.

## Como vamos validar com WRRR7126

1. Buscar `WRRR7126` → `detectIdentifier` reconhece placa antiga → payload `{ plate: "WRRR7126" }`.
2. Edge devolve produto + `media`/divergências (entrada aberta) ou só dados operacionais (reentrada).
3. App entra em `mode=edit` ou `reentry`, passo 3, com filial/depósito/comitente pré-carregados.
4. Filial: lista mostra só as `branch_uuids` permitidas; se a do produto não estiver entre elas, alerta de permissão.

## Fora de escopo

- Telas de admin para atribuir `branch_uuids`/`principals_uuids` (vivem no Backoffice).
- Endurecer RLS em `branches`/`principals` no servidor (sem migration nesta iteração).
- Busca por chassi no app (removida; pode voltar depois se necessário).
