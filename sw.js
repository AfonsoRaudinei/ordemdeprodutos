/* ==========================================================
   Service worker — Ordem de mistura

   IMPORTANTE: sempre que você alterar index.html, styles.css, app.js
   ou data/ordem-mistura.js, aumente o número da VERSAO abaixo.
   É isso que faz os celulares baixarem a versão nova.

   O catálogo (data/catalogo.json e img/catalogo/*) NÃO precisa de
   nova versão: ele se atualiza sozinho na próxima abertura.
   ========================================================== */
const VERSAO = 'v1';

const CACHE_SHELL = `ordem-mistura-shell-${VERSAO}`;
const CACHE_DADOS = 'ordem-mistura-dados';

const BASE = new URL('./', self.location).href;
const relativo = (caminho) => new URL(caminho, BASE).href;

const SHELL = [
  './', 'index.html', 'styles.css', 'app.js', 'data/ordem-mistura.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'
].map(relativo);

const URL_CATALOGO = relativo('data/catalogo.json');
const PREFIXO_IMAGENS = new URL('img/catalogo/', BASE).pathname;

/* Baixa o catálogo e as fotos já na instalação, para funcionar offline mesmo
   que o usuário nunca tenha aberto o carrossel. Falhas aqui são ignoradas. */
async function preaquecerCatalogo() {
  try {
    const cache = await caches.open(CACHE_DADOS);
    const resposta = await fetch(URL_CATALOGO, { cache: 'reload' });
    if (!resposta.ok) return;
    await cache.put(URL_CATALOGO, resposta.clone());
    const dados = await resposta.json();
    const lista = (Array.isArray(dados) ? dados : dados.produtos) || [];
    await Promise.all(
      lista.filter((p) => p && p.imagem).map((p) => cache.add(relativo(p.imagem)).catch(() => {}))
    );
  } catch { /* offline na instalação: tudo bem */ }
}

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    Promise.all([
      caches.open(CACHE_SHELL).then((cache) => cache.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))),
      preaquecerCatalogo()
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(
      nomes
        .filter((n) => n.startsWith('ordem-mistura-shell-') && n !== CACHE_SHELL)
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

/* Arquivos do app: cache primeiro (abre na hora, mesmo sem internet) */
async function cachePrimeiro(requisicao) {
  const cache = await caches.open(CACHE_SHELL);
  const guardado = await cache.match(requisicao, { ignoreSearch: true });
  if (guardado) return guardado;
  try {
    const resposta = await fetch(requisicao);
    if (resposta.ok && resposta.type === 'basic') cache.put(requisicao, resposta.clone());
    return resposta;
  } catch (erro) {
    if (requisicao.mode === 'navigate') {
      const inicio = await cache.match(relativo('index.html'));
      if (inicio) return inicio;
    }
    throw erro;
  }
}

/* Catálogo e fotos: mostra o guardado e atualiza em segundo plano */
async function guardadoEAtualiza(evento) {
  const cache = await caches.open(CACHE_DADOS);
  const guardado = await cache.match(evento.request);
  const rede = fetch(evento.request)
    .then((resposta) => {
      if (resposta.ok) cache.put(evento.request, resposta.clone());
      return resposta;
    })
    .catch(() => null);
  if (guardado) {
    evento.waitUntil(rede);
    return guardado;
  }
  return (await rede) || Response.error();
}

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== 'GET') return;
  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;

  if (url.href === URL_CATALOGO || url.pathname.startsWith(PREFIXO_IMAGENS)) {
    evento.respondWith(guardadoEAtualiza(evento));
    return;
  }
  if (url.href.startsWith(BASE)) {
    evento.respondWith(cachePrimeiro(requisicao));
  }
});
