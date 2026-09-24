# Ordem de Mistura de Calda (PWA)

App estático (HTML, CSS e JS puros). Não precisa de build nem de servidor.

## Publicar no GitHub Pages
1. Crie um repositório e envie **todo o conteúdo desta pasta** para a raiz dele
   (o `index.html` precisa ficar na raiz, com as pastas `data`, `icons` e `img` ao lado).
2. No repositório: **Settings → Pages → Build and deployment**.
   Em *Source* escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e salve.
3. Em poucos minutos o app abre em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
4. No iPhone: abra o link no Safari → **Compartilhar → Adicionar à Tela de Início**.

## Atualizar o catálogo do carrossel (sem mexer no código)
1. Coloque a foto em `img/catalogo/` (ex.: `meu-produto.jpg`, proporção 4:3, até ~150 KB).
2. Em `data/catalogo.json`, adicione um bloco com `id`, `nome`, `descricao` (curta) e `imagem`
   (caminho relativo, ex.: `img/catalogo/meu-produto.jpg`).
3. Salve. Os celulares recebem a atualização na próxima abertura do app.

As 5 fotos atuais (`.svg`) são de exemplo: troque por fotos reais e ajuste o caminho no JSON.

## Alterou o código? Aumente a versão
Ao mudar `index.html`, `styles.css`, `app.js` ou `data/ordem-mistura.js`, edite a linha
`const VERSAO = 'v1';` em `sw.js` (para `'v2'`, `'v3'`…). Sem isso, quem já instalou o app
continua vendo a versão antiga.

## Regra de ordenação
A sequência vem de `data/ordem-mistura.js` (planilha Nortox). Na mesma posição,
o produto de maior dose entra primeiro (kg e L são convertidos para g e mL antes de comparar).
Massa e volume não são comparados entre si.

## Dados do usuário
Ficam só no aparelho (localStorage): a mistura atual e o cadastro de produtos.
