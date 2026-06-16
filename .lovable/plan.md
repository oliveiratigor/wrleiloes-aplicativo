## Objetivo
Substituir o badge textual "WR" pela logo oficial WR Leilões (vinda do projeto Backoffice) no topbar do app e na tela de login.

## Origem do ativo
- Backoffice: `public/images/wr-logo.png` (PNG, fundo vermelho, ~77KB, com a marca "WR LEILÕES" em branco).

## Implementação

### 1. Trazer a logo para o projeto via Lovable Assets
Em build mode:
```
cross_project--copy_project_asset (project=Backoffice, source=public/images/wr-logo.png, target=/tmp/wr-logo.png)
lovable-assets create --file /tmp/wr-logo.png --filename wr-logo.png > src/assets/wr-logo.png.asset.json
```
Isso evita commitar o binário e gera o pointer JSON em `src/assets/`.

### 2. `src/components/mobile/AppTopbar.tsx`
- Importar `wrLogo from "@/assets/wr-logo.png.asset.json"`.
- Trocar o quadrado `<div>WR</div>` por `<img src={wrLogo.url} alt="WR Leilões" className="h-8 w-auto" />`.
- Como a logo já contém o texto "WR LEILÕES", remover o título "WR Leilões" do bloco ao lado e manter apenas o subtítulo (saudação/Operação) em uma única linha, para não duplicar a marca.

### 3. `src/routes/auth.tsx`
- Importar a mesma logo.
- Substituir o badge `<div>WR</div>` por `<img src={wrLogo.url} alt="WR Leilões" className="h-12 w-auto" />`.
- Remover o `<h1>WR Leilões</h1>` (já presente na logo) e manter o subtítulo "Operação de pátio e vistoria veicular." logo abaixo, com margem ajustada.

## Fora de escopo
- Variante dark/clara separada da logo (a atual em branco sobre vermelho funciona nos dois usos, pois ambos os fundos são vermelhos).
- Favicon / manifest — pode ser feito em pedido futuro.
