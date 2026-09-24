/* ==========================================================
   Ordem de mistura — app.js
   Sem dependências. Dados só no aparelho (localStorage).
   ========================================================== */
(() => {
  'use strict';

  const ORDEM = window.ORDEM_MISTURA;
  if (!ORDEM) {
    console.error('data/ordem-mistura.js não foi carregado.');
    return;
  }

  /* ---------- Utilidades ---------- */
  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);

  const norm = (texto) =>
    String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();

  const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const reduzMovimento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const telaDeToque = () => window.matchMedia?.('(pointer: coarse)').matches;

  // Cria elementos sem innerHTML (nomes digitados nunca viram HTML)
  function el(tag, props = {}, ...filhos) {
    const no = document.createElement(tag);
    for (const [chave, valor] of Object.entries(props)) {
      if (valor == null || valor === false) continue;
      if (chave === 'class') no.className = valor;
      else if (chave === 'texto') no.textContent = valor;
      else if (chave.startsWith('on')) no.addEventListener(chave.slice(2), valor);
      else no.setAttribute(chave, valor === true ? '' : valor);
    }
    for (const filho of filhos.flat()) {
      if (filho != null && filho !== false) no.append(filho);
    }
    return no;
  }

  const ICONES = {
    fechar: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    editar: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lixeira: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 7h14M10 11v6M14 11v6M9 7V5h6v2M7 7l1 12h8l1-12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    grade: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/></svg>',
    esquerda: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    direita: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    caixa: '<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M4 8l8-4 8 4v8l-8 4-8-4V8zM4 8l8 4 8-4M12 12v8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  function icone(nome) {
    const s = el('span', { class: 'icone' });
    s.innerHTML = ICONES[nome]; // strings fixas acima, sem conteúdo do usuário
    return s;
  }
  function botaoIcone(nomeIcone, rotulo, aoClicar) {
    return el('button', { type: 'button', class: 'botao-icone', 'aria-label': rotulo, onclick: aoClicar }, icone(nomeIcone));
  }

  /* ---------- Regra de negócio ---------- */
  const UNIDADES = {
    g: { dim: 'massa', fator: 1 },
    kg: { dim: 'massa', fator: 1000 },
    mL: { dim: 'volume', fator: 1 },
    L: { dim: 'volume', fator: 1000 }
  };
  const LISTA_UNIDADES = Object.keys(UNIDADES);
  const SOLIDOS = new Set([3, 4, 5, 6]); // sugere "g" para sólidos e "mL" para líquidos
  const MAX_DIGITOS = 7;

  const FORMULACOES = ORDEM.formulacoes;
  const porPos = new Map(FORMULACOES.map((f) => [f.pos, f]));

  /**
   * Ordena a mistura:
   *  1) pela posição da formulação (tabela Nortox);
   *  2) na mesma posição, maior dose primeiro (kg→g, L→mL antes de comparar);
   *  3) massa e volume não se comparam: cada tipo forma um bloco, na ordem em que apareceu;
   *  4) doses iguais mantêm a ordem em que foram adicionadas.
   */
  function ordenar(itens) {
    const dados = itens.map((item, indice) => {
      const u = UNIDADES[item.unidade];
      return {
        item, indice,
        pos: item.pos,
        dim: u.dim,
        base: Math.round(item.dose * u.fator * 1e6) / 1e6
      };
    });
    const primeiroDoBloco = new Map();
    for (const d of dados) {
      const chave = d.pos + '|' + d.dim;
      if (!primeiroDoBloco.has(chave) || d.indice < primeiroDoBloco.get(chave)) {
        primeiroDoBloco.set(chave, d.indice);
      }
    }
    for (const d of dados) d.bloco = primeiroDoBloco.get(d.pos + '|' + d.dim);
    dados.sort((a, b) => a.pos - b.pos || a.bloco - b.bloco || b.base - a.base || a.indice - b.indice);
    return dados.map((d) => d.item);
  }

  const formatarDose = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 });

  // Aceita só dígitos e uma vírgula; no máximo 7 dígitos no total
  function sanitizarDose(texto) {
    let v = texto.replace(/[^\d.,]/g, '').replace(/\./g, ',');
    const i = v.indexOf(',');
    if (i !== -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, '');
    let digitos = 0;
    let saida = '';
    for (const c of v) {
      if (c === ',') { saida += c; continue; }
      if (digitos < MAX_DIGITOS) { saida += c; digitos++; }
    }
    return saida;
  }

  /* ---------- Armazenamento local ---------- */
  const CHAVE_MISTURA = 'ordemmistura:mistura:v1';
  const CHAVE_PRODUTOS = 'ordemmistura:produtos:v1';

  function lerLista(chave) {
    try {
      const bruto = localStorage.getItem(chave);
      if (!bruto) return [];
      const valor = JSON.parse(bruto);
      return Array.isArray(valor) ? valor : [];
    } catch { return []; }
  }
  function gravarLista(chave, lista) {
    try { localStorage.setItem(chave, JSON.stringify(lista)); } catch { /* armazenamento indisponível */ }
  }

  function saneiaBase(x) {
    if (!x || typeof x.nome !== 'string' || !x.nome.trim()) return null;
    const pos = Number(x.pos);
    if (!porPos.has(pos) || !LISTA_UNIDADES.includes(x.unidade)) return null;
    return { id: String(x.id || novoId()), nome: x.nome.trim().slice(0, 60), pos, unidade: x.unidade };
  }
  function saneiaItem(x) {
    const base = saneiaBase(x);
    const dose = Number(x?.dose);
    return base && Number.isFinite(dose) && dose > 0 ? { ...base, dose } : null;
  }
  function saneiaProduto(x) {
    const base = saneiaBase(x);
    if (!base) return null;
    const dose = Number(x.dose);
    return { ...base, dose: Number.isFinite(dose) && dose > 0 ? dose : null, usadoEm: Number(x.usadoEm) || 0 };
  }

  let mistura = lerLista(CHAVE_MISTURA).map(saneiaItem).filter(Boolean);
  let produtos = lerLista(CHAVE_PRODUTOS).map(saneiaProduto).filter(Boolean);

  const salvarMistura = () => gravarLista(CHAVE_MISTURA, mistura);
  const salvarProdutos = () => gravarLista(CHAVE_PRODUTOS, produtos);
  const acharProduto = (nome) => produtos.find((p) => norm(p.nome) === norm(nome));

  // Todo produto usado é salvo (ou atualizado) no cadastro
  function registrarProduto(item) {
    const existente = acharProduto(item.nome);
    if (existente) {
      Object.assign(existente, { nome: item.nome, pos: item.pos, unidade: item.unidade, dose: item.dose, usadoEm: Date.now() });
    } else {
      produtos.push({ id: novoId(), nome: item.nome, pos: item.pos, unidade: item.unidade, dose: item.dose, usadoEm: Date.now() });
    }
    salvarProdutos();
  }

  /* ---------- Elementos e estado da tela ---------- */
  const app = $('#app');
  const fab = $('#abrir-catalogo');
  const form = $('#form-produto');
  const campoNome = $('#nome');
  const selForm = $('#formulacao');
  const campoDose = $('#dose');
  const selUnidade = $('#unidade');
  const erroForm = $('#erro-form');
  const sugestoesEl = $('#sugestoes');
  const listaMistura = $('#lista-mistura');
  const vazio = $('#vazio');
  const btnLimpar = $('#limpar');

  let unidadeManual = false;
  let destaqueId = null;

  function montarSelectFormulacao(select, placeholder) {
    select.replaceChildren();
    if (placeholder) select.append(el('option', { value: '', texto: placeholder }));
    const grupos = new Map();
    for (const f of FORMULACOES) {
      if (!grupos.has(f.grupo)) grupos.set(f.grupo, el('optgroup', { label: f.grupo }));
      grupos.get(f.grupo).append(el('option', { value: String(f.pos), texto: `${f.sigla} · ${f.nome}` }));
    }
    grupos.forEach((g) => select.append(g));
  }
  function montarSelectUnidade(select) {
    select.replaceChildren(...LISTA_UNIDADES.map((u) => el('option', { value: u, texto: u })));
  }

  /* ---------- Botão de duas etapas (evita apagar sem querer) ---------- */
  function tornarConfirmavel(botao, { rotulo, rotuloConfirmar, aoConfirmar }) {
    const original = [...botao.childNodes].map((n) => n.cloneNode(true));
    let temporizador;
    const restaurar = () => {
      clearTimeout(temporizador);
      botao.classList.remove('armado');
      botao.replaceChildren(...original.map((n) => n.cloneNode(true)));
      botao.setAttribute('aria-label', rotulo);
    };
    botao.addEventListener('click', () => {
      if (botao.classList.contains('armado')) { restaurar(); aoConfirmar(); return; }
      botao.classList.add('armado');
      botao.replaceChildren(rotuloConfirmar);
      botao.setAttribute('aria-label', rotuloConfirmar);
      temporizador = setTimeout(restaurar, 3000);
    });
  }

  /* ---------- Sequência de mistura ---------- */
  function linhaAgua() {
    return el('li', { class: 'passo' },
      el('span', { class: 'passo__num', texto: '1' }),
      el('div', { class: 'passo__corpo' },
        el('div', { class: 'passo__linha' }, el('strong', { class: 'passo__nome', texto: ORDEM.agua.nome })),
        el('div', { class: 'passo__meta', texto: 'Base da calda' })),
      el('span'));
  }

  function linhaItem(item, numero) {
    const f = porPos.get(item.pos);
    const aviso = f.aviso ? ORDEM.avisos[f.aviso] : null;
    return el('li', { class: 'passo' + (item.id === destaqueId ? ' passo--novo' : ''), 'data-id': item.id },
      el('span', { class: 'passo__num', texto: String(numero) }),
      el('div', { class: 'passo__corpo' },
        el('div', { class: 'passo__linha' },
          el('strong', { class: 'passo__nome', texto: item.nome }),
          el('span', { class: 'passo__dose', texto: `${formatarDose.format(item.dose)} ${item.unidade}` })),
        el('div', { class: 'passo__meta', texto: `${f.sigla} · ${f.nome}` }),
        aviso && el('p', { class: 'passo__aviso', texto: aviso })),
      botaoIcone('fechar', `Remover ${item.nome}`, () => removerItem(item.id)));
  }

  function renderizarMistura() {
    const ordenados = ordenar(mistura);
    listaMistura.replaceChildren(linhaAgua(), ...ordenados.map((item, i) => linhaItem(item, i + 2)));
    vazio.hidden = mistura.length > 0;
    btnLimpar.hidden = mistura.length === 0;
    destaqueId = null;
  }

  function removerItem(id) {
    mistura = mistura.filter((i) => i.id !== id);
    salvarMistura();
    renderizarMistura();
  }

  tornarConfirmavel(btnLimpar, {
    rotulo: 'Limpar mistura',
    rotuloConfirmar: 'Toque para confirmar',
    aoConfirmar: () => { mistura = []; salvarMistura(); renderizarMistura(); }
  });

  /* ---------- Formulário ---------- */
  function mostrarErro(mensagem, campo) {
    erroForm.textContent = mensagem;
    erroForm.hidden = false;
    campo?.focus();
  }
  function limparErro() { erroForm.hidden = true; erroForm.textContent = ''; }

  function lerDose() {
    const t = campoDose.value.trim().replace(',', '.');
    const n = Number(t);
    return t && Number.isFinite(n) ? n : NaN;
  }

  function adicionar() {
    limparErro();
    const nome = campoNome.value.trim().replace(/\s+/g, ' ');
    if (!nome) return mostrarErro('Informe o nome do produto.', campoNome);
    const pos = Number(selForm.value);
    if (!porPos.has(pos)) return mostrarErro('Escolha a formulação.', selForm);
    const dose = lerDose();
    if (!(dose > 0)) return mostrarErro('Informe a dose (maior que zero).', campoDose);

    const item = { id: novoId(), nome, pos, dose, unidade: selUnidade.value };
    mistura.push(item);
    salvarMistura();
    registrarProduto(item);

    destaqueId = item.id;
    renderizarMistura();

    campoNome.value = '';
    campoDose.value = '';
    selForm.value = '';
    selUnidade.value = 'g';
    unidadeManual = false;
    fecharSugestoes();

    if (!telaDeToque()) campoNome.focus();
    $(`[data-id="${item.id}"]`, listaMistura)?.scrollIntoView({ block: 'nearest', behavior: reduzMovimento() ? 'auto' : 'smooth' });
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); adicionar(); });
  [campoNome, selForm, campoDose].forEach((c) => c.addEventListener('input', limparErro));

  campoDose.addEventListener('input', () => {
    const limpo = sanitizarDose(campoDose.value);
    if (limpo !== campoDose.value) campoDose.value = limpo;
  });

  selForm.addEventListener('change', () => {
    if (!unidadeManual && selForm.value) selUnidade.value = SOLIDOS.has(Number(selForm.value)) ? 'g' : 'mL';
  });
  selUnidade.addEventListener('change', () => { unidadeManual = true; });

  /* ---------- Autocompletar do nome ---------- */
  let sugestoes = [];
  let sugestaoAtiva = -1;

  function fecharSugestoes() {
    sugestoesEl.hidden = true;
    sugestoesEl.replaceChildren();
    campoNome.setAttribute('aria-expanded', 'false');
    campoNome.removeAttribute('aria-activedescendant');
    sugestoes = [];
    sugestaoAtiva = -1;
  }

  function marcarSugestao(i) {
    sugestaoAtiva = i;
    [...sugestoesEl.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
    campoNome.setAttribute('aria-activedescendant', `sug-${i}`);
  }

  function atualizarSugestoes() {
    const q = norm(campoNome.value);
    if (!q || !produtos.length) return fecharSugestoes();
    sugestoes = produtos
      .filter((p) => norm(p.nome).includes(q))
      .sort((a, b) => {
        const pa = norm(a.nome).startsWith(q) ? 0 : 1;
        const pb = norm(b.nome).startsWith(q) ? 0 : 1;
        return pa - pb || b.usadoEm - a.usadoEm;
      })
      .slice(0, 5);
    if (!sugestoes.length) return fecharSugestoes();

    sugestoesEl.replaceChildren(...sugestoes.map((p, i) =>
      el('li', {
        role: 'option', id: `sug-${i}`, 'aria-selected': 'false',
        // pointerdown + preventDefault mantém o foco no campo (evita fechar antes do toque)
        onpointerdown: (e) => { e.preventDefault(); aplicarProduto(p); }
      }, el('span', { texto: p.nome }), el('small', { texto: porPos.get(p.pos).sigla }))));
    sugestoesEl.hidden = false;
    campoNome.setAttribute('aria-expanded', 'true');
    sugestaoAtiva = -1;
  }

  // Preenche nome, formulação e a última unidade usada; a dose fica para digitar
  function aplicarProduto(p) {
    campoNome.value = p.nome;
    selForm.value = String(p.pos);
    selUnidade.value = p.unidade;
    unidadeManual = true;
    fecharSugestoes();
    limparErro();
    campoDose.focus();
  }

  campoNome.addEventListener('input', atualizarSugestoes);
  campoNome.addEventListener('keydown', (e) => {
    if (sugestoesEl.hidden) return;
    const n = sugestoes.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); marcarSugestao((sugestaoAtiva + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); marcarSugestao((sugestaoAtiva - 1 + n) % n); }
    else if (e.key === 'Enter' && sugestaoAtiva >= 0) { e.preventDefault(); aplicarProduto(sugestoes[sugestaoAtiva]); }
    else if (e.key === 'Escape') { e.stopPropagation(); fecharSugestoes(); }
  });
  campoNome.addEventListener('blur', () => {
    fecharSugestoes();
    const p = acharProduto(campoNome.value);
    if (p && !selForm.value) {
      selForm.value = String(p.pos);
      if (!unidadeManual) selUnidade.value = p.unidade;
    }
  });

  /* ---------- Folhas (modais) ---------- */
  let folhaAberta = null;
  let gatilho = null;

  function abrirFolha(folha, origem) {
    if (folhaAberta) fecharFolha();
    folhaAberta = folha;
    gatilho = origem;
    folha.removeAttribute('inert');
    folha.setAttribute('aria-hidden', 'false');
    folha.classList.add('aberto');
    app.setAttribute('inert', '');
    fab.setAttribute('inert', '');
    document.body.classList.add('sem-scroll');
    $('.texto-botao[data-fechar]', folha).focus({ preventScroll: true });
  }

  function fecharFolha() {
    if (!folhaAberta) return;
    const folha = folhaAberta;
    folhaAberta = null;
    folha.classList.remove('aberto');
    folha.setAttribute('aria-hidden', 'true');
    folha.setAttribute('inert', '');
    app.removeAttribute('inert');
    fab.removeAttribute('inert');
    document.body.classList.remove('sem-scroll');
    gatilho?.focus?.({ preventScroll: true });
  }

  document.querySelectorAll('.sheet').forEach((folha) => {
    folha.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]')) fecharFolha(); });
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && folhaAberta) fecharFolha(); });

  /* ---------- Meus produtos ---------- */
  const folhaProdutos = $('#sheet-produtos');
  const corpoProdutos = $('#corpo-produtos');
  let editandoId = null;

  function usarProduto(p) {
    fecharFolha();
    aplicarProduto(p);
  }

  function linhaProduto(p) {
    const f = porPos.get(p.pos);
    const ultima = p.dose ? ` · última dose ${formatarDose.format(p.dose)} ${p.unidade}` : '';
    const btnExcluir = botaoIcone('lixeira', `Excluir ${p.nome}`, () => {});
    tornarConfirmavel(btnExcluir, {
      rotulo: `Excluir ${p.nome}`,
      rotuloConfirmar: 'Excluir?',
      aoConfirmar: () => {
        produtos = produtos.filter((x) => x.id !== p.id);
        salvarProdutos();
        renderizarProdutos();
      }
    });
    return el('li', { class: 'registro__linha' },
      el('div', { class: 'registro__info' },
        el('strong', { texto: p.nome }),
        el('span', { texto: `${f.sigla}${ultima}` })),
      el('div', { class: 'registro__acoes' },
        el('button', { type: 'button', class: 'texto-botao', texto: 'Usar', 'aria-label': `Usar ${p.nome}`, onclick: () => usarProduto(p) }),
        botaoIcone('editar', `Editar ${p.nome}`, () => { editandoId = p.id; renderizarProdutos(); }),
        btnExcluir));
  }

  function linhaEdicao(p) {
    const nome = el('input', { type: 'text', class: 'input', maxlength: '60', value: p.nome, 'aria-label': 'Nome do produto' });
    const formulacao = el('select', { class: 'input', 'aria-label': 'Formulação' });
    montarSelectFormulacao(formulacao);
    formulacao.value = String(p.pos);
    const unidade = el('select', { class: 'input', 'aria-label': 'Unidade' });
    montarSelectUnidade(unidade);
    unidade.value = p.unidade;
    const erro = el('p', { class: 'erro', role: 'alert', hidden: true });

    const salvar = () => {
      const novoNome = nome.value.trim().replace(/\s+/g, ' ');
      if (!novoNome) { erro.textContent = 'Informe o nome do produto.'; erro.hidden = false; nome.focus(); return; }
      const duplicado = produtos.find((x) => x.id !== p.id && norm(x.nome) === norm(novoNome));
      if (duplicado) { erro.textContent = 'Já existe um produto com esse nome.'; erro.hidden = false; nome.focus(); return; }
      Object.assign(p, { nome: novoNome, pos: Number(formulacao.value), unidade: unidade.value });
      salvarProdutos();
      editandoId = null;
      renderizarProdutos();
    };

    return el('li', { class: 'registro__linha registro__linha--edicao' },
      nome, formulacao, unidade, erro,
      el('div', { class: 'registro__botoes' },
        el('button', { type: 'button', class: 'botao-primario botao--pequeno', texto: 'Salvar', onclick: salvar }),
        el('button', { type: 'button', class: 'botao-secundario botao--pequeno', texto: 'Cancelar', onclick: () => { editandoId = null; renderizarProdutos(); } })));
  }

  function renderizarProdutos() {
    corpoProdutos.replaceChildren();
    if (!produtos.length) {
      corpoProdutos.append(el('p', { class: 'vazio vazio--sheet', texto: 'Os produtos que você adicionar à mistura ficam salvos aqui.' }));
      return;
    }
    const ordenados = [...produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    corpoProdutos.append(el('ul', { class: 'registro cartao cartao--lista' },
      ordenados.map((p) => (p.id === editandoId ? linhaEdicao(p) : linhaProduto(p)))));
  }

  const btnProdutos = $('#abrir-produtos');
  btnProdutos.addEventListener('click', () => {
    editandoId = null;
    renderizarProdutos();
    abrirFolha(folhaProdutos, btnProdutos);
  });

  /* ---------- Catálogo (carrossel) ---------- */
  const folhaCatalogo = $('#sheet-catalogo');
  const corpoCatalogo = $('#corpo-catalogo');
  const URL_CATALOGO = 'data/catalogo.json';
  let catalogoCarregado = false;

  function mostrarEstado(mensagem, comTentar) {
    corpoCatalogo.replaceChildren(el('div', { class: 'estado', role: 'status' },
      el('p', { texto: mensagem }),
      comTentar && el('button', { type: 'button', class: 'botao-secundario', texto: 'Tentar de novo', onclick: carregarCatalogo })));
  }

  async function carregarCatalogo() {
    mostrarEstado('Carregando produtos…');
    try {
      const resposta = await fetch(URL_CATALOGO);
      if (!resposta.ok) throw new Error('HTTP ' + resposta.status);
      const dados = await resposta.json();
      const lista = (Array.isArray(dados) ? dados : dados.produtos) || [];
      const itens = lista.filter((p) => p && typeof p.nome === 'string' && p.nome.trim());
      if (!itens.length) return mostrarEstado('Ainda não há produtos no catálogo.');
      montarCarrossel(itens);
      catalogoCarregado = true;
    } catch {
      mostrarEstado('Não foi possível carregar os produtos. Verifique a conexão.', true);
    }
  }

  function montarCarrossel(itens) {
    const faixa = el('ul', { class: 'carrossel__faixa', tabindex: '0', 'aria-label': 'Produtos. Deslize para o lado.' });

    itens.forEach((p, i) => {
      const midia = el('div', { class: 'produto__midia' });
      if (p.imagem) {
        const img = el('img', { src: p.imagem, alt: '', width: '800', height: '600', loading: 'lazy', decoding: 'async' });
        img.addEventListener('error', () => midia.replaceChildren(icone('caixa')), { once: true });
        midia.append(img);
      } else {
        midia.append(icone('caixa'));
      }
      faixa.append(el('li', { class: 'slide', role: 'group', 'aria-roledescription': 'slide', 'aria-label': `${i + 1} de ${itens.length}` },
        el('article', { class: 'produto' },
          midia,
          el('div', { class: 'produto__texto' },
            el('h3', { texto: p.nome }),
            p.descricao && el('p', { texto: p.descricao })))));
    });

    const passo = () => (faixa.children.length > 1 ? faixa.children[1].offsetLeft - faixa.children[0].offsetLeft : faixa.clientWidth);
    const ir = (i) => faixa.scrollTo({ left: i * passo(), behavior: reduzMovimento() ? 'auto' : 'smooth' });
    const indiceAtual = () => Math.max(0, Math.min(itens.length - 1, Math.round(faixa.scrollLeft / (passo() || 1))));

    const anterior = el('button', { type: 'button', class: 'seta seta--ant', 'aria-label': 'Produto anterior', onclick: () => ir(indiceAtual() - 1) }, icone('esquerda'));
    const proximo = el('button', { type: 'button', class: 'seta seta--prox', 'aria-label': 'Próximo produto', onclick: () => ir(indiceAtual() + 1) }, icone('direita'));
    const pontos = itens.map((p, i) => el('button', { type: 'button', class: 'ponto', 'aria-label': `Ir para ${p.nome}`, onclick: () => ir(i) }));

    const atualizar = () => {
      const i = indiceAtual();
      pontos.forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
      anterior.disabled = i === 0;
      proximo.disabled = i === itens.length - 1;
    };
    let quadro = 0;
    faixa.addEventListener('scroll', () => { cancelAnimationFrame(quadro); quadro = requestAnimationFrame(atualizar); }, { passive: true });

    corpoCatalogo.replaceChildren(el('div', { class: 'carrossel', role: 'region', 'aria-roledescription': 'carrossel', 'aria-label': 'Nossos produtos' },
      el('div', { class: 'carrossel__area' }, faixa, itens.length > 1 && anterior, itens.length > 1 && proximo),
      itens.length > 1 && el('div', { class: 'pontos' }, pontos)));
    atualizar();
  }

  fab.append(icone('grade'), el('span', { texto: 'Nossos produtos' }));
  fab.addEventListener('click', () => {
    abrirFolha(folhaCatalogo, fab);
    if (!catalogoCarregado) carregarCatalogo();
  });

  /* ---------- PWA ---------- */
  function registrarServiceWorker() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sem offline, mas o app segue funcionando */ });
    });
  }

  /* ---------- Início ---------- */
  montarSelectFormulacao(selForm, 'Selecionar…');
  montarSelectUnidade(selUnidade);
  selUnidade.value = 'g';
  $('#rodape-nota').textContent = ORDEM.rodape;
  renderizarMistura();
  registrarServiceWorker();
})();
