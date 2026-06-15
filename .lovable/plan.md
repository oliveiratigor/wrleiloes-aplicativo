## Novo app Android — Cadastro/Edição de veículo (Capacitor)

Projeto Lovable separado do Backoffice e do website. Consome as mesmas Edge Functions do Backoffice (mesmo Supabase). Não altera schema nem cria novas funções.

Escopo enxuto: **o app só cadastra e edita um cadastro de veículo**. Baixa de veículo e painel de Diagnóstico vivem **só no Backoffice**.

### Telas (5)

1. **Login** — email + senha → `panel-login` (bcrypt + temp_token) → TOTP 2FA. Token em `Capacitor Preferences`.
2. **Buscar veículo** — por placa/chassi, com cache offline das últimas consultas.
3. **Resolução de cadastro** (tela de roteamento, sem UI dedicada — lógica disparada após a busca):
   - Se **não existe cadastro** → vai para Cadastrar (novo).
   - Se **existe cadastro com entrada ativa** → vai para Editar (gerenciar a entrada ativa: vistoria, divergências, fotos).
   - Se **existe cadastro sem entrada ativa** → vai para Cadastrar (cria nova entrada vinculada ao cadastro existente; reutiliza dados base).
4. **Cadastrar / Editar veículo** — mesmo formulário, modo `create` ou `edit` conforme a resolução acima. Inclui vistoria (divergências, classificação, aprovação: `final_approval_status`, `rejection_notes`).
5. **Fotos** — `@capacitor/camera` + upload direto S3 (mesmo fluxo `app-s3-upload` / presigned), acoplado ao cadastro/edição.

### Offline parcial

- Cache de buscas recentes em SQLite (`@capacitor-community/sqlite`).
- Fila persistente de uploads (fotos + payloads de cadastro/edição) com retry exponencial.
- Rascunhos de cadastro/vistoria offline; conflito = last write wins.
- Indicador de status de rede (`@capacitor/network`) e badge "X itens pendentes".

### Autenticação

- Mesmo endpoint `panel-login` do legado (bcrypt + TOTP) — sem mudanças no backend.
- Sessão Supabase via temp_token → `setSession` no client.
- Logout limpa Preferences + SQLite cache (mantém fila pendente até confirmar com usuário).

### Diagnóstico — **no Backoffice, não no app**

O app só registra metadados de cada chamada em uma tabela do Supabase (já existente: `system_logs`/equivalente; sem schema novo). O **Backoffice** ganha uma página nova "Diagnóstico do App Mobile" que lê esses logs filtrados por `source = 'app-mobile-v2'`, mostrando request/response brutos, status, latência, usuário e device.

Mudança no Backoffice (mínima):
- Nova rota `/diagnostico-app` (gate Super Admin / Ops).
- Lista cronológica + filtros (usuário, placa, status, intervalo).
- Detalhe expandido com JSON formatado e botão "copiar".

Mudança no app:
- Wrapper `apiCall(fn, payload)` que envia, junto com a chamada, um registro de telemetria (request, response truncado, latência, device info) para a tabela de logs.

### Stack técnica

- React + Vite + TypeScript + Tailwind (design tokens copiados do Backoffice).
- Capacitor 6: `@capacitor/camera`, `@capacitor/preferences`, `@capacitor/network`, `@capacitor/filesystem`, `@capacitor-community/sqlite`, `@capacitor/device`.
- `appId: app.lovable.wrleiloes.vistoria`, `appName: WR Vistoria`.
- Supabase client apontando para o **mesmo projeto Supabase** do Backoffice (mesmas `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`).
- Reutilizo formatters do Backoffice (`toDateBR`, `formatPersonName`) — copio os arquivos.

### Fases de execução

```text
1. Bootstrap (app novo)
   - Vite + Tailwind + design tokens
   - Supabase client + Preferences
   - Capacitor init (appId, appName, splash, ícone placeholder)

2. Login
   - panel-login (2 estágios) + TOTP
   - apiCall wrapper + telemetria → tabela de logs

3. Buscar + Resolução
   - Consulta por placa/chassi
   - Lógica: sem cadastro → create / com entrada ativa → edit / sem entrada ativa → create vinculado
   - Cache SQLite

4. Cadastrar / Editar + Fotos
   - Formulário único (modo create/edit)
   - Vistoria embutida
   - Camera + upload S3
   - Rascunho offline + fila

5. Backoffice: página Diagnóstico do App Mobile
   - Rota gated /diagnostico-app
   - Lista + filtros + detalhe JSON

6. Build Android
   - npx cap add android
   - README com passos para APK debug
```

### Não vai mudar

- Schema do Supabase: nada.
- Edge Functions existentes: nada (reuso `panel-login`, `cadastrar-produto`, `app-s3-upload`, edição, vistoria).
- App legado em produção continua em paralelo.

### Mudanças por projeto

- **App novo (este projeto Lovable)**: tudo descrito acima, menos baixa e menos tela de Diagnóstico.
- **Backoffice**: só a nova página `/diagnostico-app` (Super Admin/Ops) que lê logs do app. Nenhuma outra alteração.

### Entregáveis no fim

- App Lovable rodando em preview web (todas as 5 telas).
- Pasta `android/` pronta após `npx cap add android`.
- README com passos para gerar APK debug e instalar no dispositivo.
- Página `/diagnostico-app` no Backoffice (PR/commit separado).

### Pendência antes de codar

Confirmar como o novo projeto vai apontar para o mesmo Supabase do Backoffice:
- **Opção A (recomendada)**: você habilita Lovable Cloud aqui e me passa as chaves (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) do Backoffice para colar como variáveis deste projeto.
- **Opção B**: criar um novo Cloud aqui (não recomendado — quebra o login compartilhado).