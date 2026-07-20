function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function setCardSelected(item, selected) {
  item.dataset.selected = String(selected);
  if (selected) item.setAttribute('aria-current', 'true');
  else item.removeAttribute('aria-current');
  const button = item.querySelector('.query-result-card__locate');
  if (!button) return;
  button.setAttribute('aria-pressed', String(selected));
  button.textContent = selected ? 'Destacado no mapa' : 'Ver no mapa';
}

function updateListSelection(item, selectedKey) {
  const list = item.closest('.query-result-list');
  list?.querySelectorAll('.query-result-card').forEach((card) => {
    setCardSelected(card, card.dataset.resultKey === selectedKey);
  });
}

function resultCard(result, handlers) {
  const item = element('li', 'query-result-card');
  item.dataset.resultKey = result.key;
  item.addEventListener('mouseenter', () => handlers.onHighlight(result));
  item.addEventListener('mouseleave', handlers.onClearHighlight);
  item.addEventListener('focusin', () => handlers.onHighlight(result));
  item.addEventListener('focusout', (event) => {
    if (!item.contains(event.relatedTarget)) handlers.onClearHighlight();
  });

  const media = element('div', 'query-result-card__media');
  const thumbnail = document.createElement('img');
  thumbnail.className = 'query-result-card__thumbnail';
  thumbnail.src = result.thumbnailUrl;
  thumbnail.alt = `Miniatura de ${result.title}`;
  thumbnail.loading = 'lazy';
  thumbnail.decoding = 'async';
  thumbnail.referrerPolicy = 'no-referrer';
  const fallback = element('span', 'query-result-card__fallback', 'Sem miniatura');
  fallback.hidden = true;
  thumbnail.addEventListener('error', () => {
    thumbnail.hidden = true;
    fallback.hidden = false;
  });
  media.append(thumbnail, fallback);

  const body = element('div', 'query-result-card__body');
  body.append(
    element('h4', 'query-result-card__title', result.title),
    element('span', 'query-result-card__project', result.projectTitle)
  );
  const metadata = element('dl', 'query-result-card__metadata');
  const entries = [
    ['Faixa', result.flightLine],
    ['Data', result.capturedAt],
    ['Escala', result.nominalScale],
    ['Tamanho', formatBytes(result.sizeBytes)]
  ].filter(([, value]) => value);
  for (const [label, value] of entries) {
    metadata.append(element('dt', null, label), element('dd', null, value));
  }
  body.append(metadata);
  if (result.notes) body.append(element('p', 'query-result-card__notes', result.notes));
  const actions = element('div', 'query-result-card__actions');
  const locate = element('button', 'button button--secondary query-result-card__locate', 'Ver no mapa');
  locate.type = 'button';
  locate.addEventListener('click', () => {
    const selectedKey = handlers.onSelect(result);
    updateListSelection(item, selectedKey);
  });
  const download = element('a', 'button button--primary query-result-card__download', 'Baixar fotografia');
  download.href = result.downloadUrl;
  download.download = result.downloadFilename;
  download.target = '_blank';
  download.rel = 'noopener noreferrer';
  download.referrerPolicy = 'no-referrer';
  download.addEventListener('click', () => handlers.onDownload?.(result));
  actions.append(locate, download);
  body.append(actions);
  item.append(media, body);
  setCardSelected(item, handlers.selectedResultKey === result.key);
  return item;
}

function newSearchBlock(query, handlers) {
  const tipo = query.geometry?.geometry?.type;
  const polygon = tipo === 'Polygon';
  const importado = tipo === 'GeometryCollection';
  const section = element('section', 'query-next-search');
  section.append(
    element('strong', 'query-next-search__title', 'Continue pesquisando'),
    element(
      'p',
      'query-next-search__text',
      importado
        ? 'Clique no mapa ou importe outro arquivo para substituir estes resultados.'
        : polygon
          ? 'Desenhe outra área para substituir estes resultados.'
          : 'Clique em outro ponto do mapa para substituir estes resultados.'
    )
  );
  const button = element('button', 'button button--secondary query-next-search__button', polygon ? 'Desenhar nova área' : 'Escolher outro ponto');
  button.type = 'button';
  button.addEventListener('click', handlers.onNewSearch);
  section.append(button);
  return section;
}

// O aviso falado é SÓ a contagem. Marcar a seção inteira como aria-live faria o
// leitor de tela reler a lista de fotografias a cada clique, que com centenas de
// resultados é inutilizável.
function contagem(texto) {
  const p = element('p', 'download-workflow__contagem', texto);
  p.setAttribute('aria-live', 'polite');
  return p;
}

// Uma linha baixável: serve tanto ao relatório quanto a cada fotografia. Nunca
// desabilita, porque baixar de novo é justamente o que o usuário precisa quando
// a conexão cai no meio.
function linhaDeDownload({ rotulo, arquivo, baixado, estado, onClick, classe = '' }) {
  const linha = element('li', `download-list__item ${classe}`.trim());
  if (baixado) linha.dataset.baixado = 'true';

  const button = element('button', `button ${baixado ? 'button--secondary' : 'button--primary'} download-list__button`);
  button.type = 'button';
  button.append(
    element('span', 'download-list__marca', baixado ? '✓' : '↓'),
    element('span', 'download-list__nome', rotulo)
  );
  button.setAttribute('aria-label', baixado ? `Baixar novamente ${arquivo}` : `Baixar ${arquivo}`);
  button.addEventListener('click', onClick);

  linha.append(button);
  if (baixado) linha.append(element('small', 'download-list__estado', estado));
  return linha;
}

function downloadWorkflow(downloads, handlers) {
  const section = element('section', 'download-workflow');
  if (downloads.reportStatus === 'generating') {
    section.setAttribute('aria-busy', 'true');
    section.append(
      element('span', 'download-workflow__step', 'Etapa 1 de 2'),
      contagem('Gerando o PDF de conferência…')
    );
    return section;
  }
  if (downloads.reportStatus === 'error') {
    const falha = element('p', 'inline-error', 'Não foi possível gerar o relatório. Nenhuma imagem foi iniciada.');
    falha.setAttribute('aria-live', 'polite');
    section.append(falha);
    const retry = element('button', 'button button--primary', 'Tentar gerar novamente');
    retry.type = 'button';
    retry.addEventListener('click', handlers.onDownloadAll);
    section.append(retry);
    return section;
  }
  if (downloads.reportStatus !== 'ready') return section;

  const total = downloads.items.length;
  const baixados = downloads.baixados || new Set();
  section.append(
    element('span', 'download-workflow__step', 'Etapa 2 de 2'),
    element('p', 'download-workflow__report', 'PDF gerado. Baixe cada fotografia na ordem que quiser.')
  );

  // O relatório também ganha a sua linha. Ele é disparado sozinho ao ficar
  // pronto, mas isso acontece UMA vez: sem este botão, quem perdesse o arquivo
  // teria de refazer a consulta inteira só para reaver o PDF.
  const listaRelatorio = element('ul', 'download-list download-list--relatorio');
  listaRelatorio.append(linhaDeDownload({
    rotulo: 'Relatório PDF de conferência',
    arquivo: downloads.reportFilename || 'relatorio.pdf',
    baixado: true,
    estado: 'Gerado e baixado. Clique para baixar de novo.',
    onClick: () => handlers.onDownloadReport?.()
  }));
  section.append(listaRelatorio);

  section.append(contagem(`${baixados.size} de ${total} fotografia(s) baixada(s).`));

  // Uma linha por fotografia, em vez de um botão "próxima". A fila sequencial
  // não dizia o que já tinha vindo e, pior, não deixava repetir a foto cuja
  // conexão caiu: o cursor já tinha passado dela.
  const lista = element('ul', 'download-list');
  for (const item of downloads.items) {
    lista.append(linhaDeDownload({
      rotulo: item.title || item.downloadFilename,
      arquivo: item.downloadFilename,
      baixado: baixados.has(item.key),
      estado: 'Baixada. Clique para baixar de novo.',
      onClick: () => handlers.onDownloadItem?.(item.key)
    }));
  }
  section.append(lista);

  if (total && baixados.size === total) {
    section.append(element('p', 'download-workflow__complete', `Todas as ${total} fotografia(s) foram baixadas.`));
  }
  return section;
}

// Uma área grande devolve milhares de fotografias, e cada resultado é um cartão
// com miniatura. Montar tudo de uma vez trava o navegador, então a lista cresce
// sob demanda: um lote entra quando o fim da lista se aproxima da tela.
const LOTE_RESULTADOS = 40;
let observadorAtual = null;

function resultList(query, handlers) {
  const list = element('div', 'query-result-list');
  const total = query.results.length;
  let renderizados = 0;

  // Um grupo COLAPSÁVEL por aerolevantamento. Com vários voos respondendo, a
  // lista corrida obriga a rolar por um voo inteiro para chegar ao seguinte.
  const porProjeto = new Map();
  for (const r of query.results) {
    if (!porProjeto.has(r.projectId)) porProjeto.set(r.projectId, { titulo: r.projectTitle, n: 0 });
    porProjeto.get(r.projectId).n += 1;
  }

  function grupoDe(result) {
    const existente = porProjeto.get(result.projectId);
    if (existente.secao) return existente;
    const secao = element('section', 'query-result-group');
    const cabecalho = element('button', 'query-result-group__toggle');
    cabecalho.type = 'button';
    cabecalho.setAttribute('aria-expanded', 'true');
    const seta = element('span', 'query-result-group__seta', '▾');
    seta.setAttribute('aria-hidden', 'true');
    cabecalho.append(
      seta,
      element('span', 'query-result-group__titulo', existente.titulo),
      element('span', 'query-result-group__contagem',
        existente.n === 1 ? '1 fotografia' : `${existente.n} fotografias`)
    );
    const itens = element('ol', 'query-result-group__itens');
    cabecalho.addEventListener('click', () => {
      const aberto = cabecalho.getAttribute('aria-expanded') === 'true';
      cabecalho.setAttribute('aria-expanded', String(!aberto));
      itens.hidden = aberto;
      seta.textContent = aberto ? '▸' : '▾';
    });
    secao.append(cabecalho, itens);
    list.insertBefore(secao, sentinela);
    existente.secao = secao;
    existente.itens = itens;
    return existente;
  }

  const sentinela = element('div', 'query-result-sentinel');
  sentinela.setAttribute('aria-hidden', 'true');
  list.append(sentinela);

  const contador = element('p', 'query-result-progresso');
  contador.setAttribute('aria-live', 'polite');

  function atualizaContador() {
    contador.textContent = renderizados >= total
      ? `${total} de ${total} exibidas`
      : `Exibindo ${renderizados} de ${total}. Role para carregar mais.`;
  }

  function renderizaLote() {
    const fim = Math.min(renderizados + LOTE_RESULTADOS, total);
    for (let indice = renderizados; indice < fim; indice += 1) {
      const result = query.results[indice];
      grupoDe(result).itens.append(resultCard(result, handlers));
    }
    renderizados = fim;
    atualizaContador();
    if (renderizados >= total) {
      observadorAtual?.disconnect();
      observadorAtual = null;
      sentinela.remove();
    }
  }

  list.append(contador);
  renderizaLote();

  if (renderizados < total) {
    if (typeof IntersectionObserver === 'function') {
      observadorAtual = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) renderizaLote();
      }, { rootMargin: '600px 0px' });
      observadorAtual.observe(sentinela);
    } else {
      // Sem IntersectionObserver, um botão explícito faz o mesmo papel.
      const mais = element('button', 'button button--secondary', 'Carregar mais resultados');
      mais.type = 'button';
      mais.addEventListener('click', () => {
        renderizaLote();
        if (renderizados >= total) mais.remove();
      });
      list.append(mais);
    }
  }

  return list;
}

export function renderQueryPanel(container, query, downloads, handlers) {
  // O painel é remontado por inteiro a cada render; solta o observador do
  // render anterior para não deixar callback preso a DOM descartado.
  observadorAtual?.disconnect();
  observadorAtual = null;

  const header = element('div', 'query-panel__header');
  const back = element('button', 'button-link button-link--back', '← Voltar aos projetos');
  back.type = 'button';
  back.addEventListener('click', handlers.onClear);
  header.append(back);

  const content = element('div', 'query-panel__content');
  if (query.status === 'loading-projects' || query.status === 'running') {
    const progress = query.progress;
    const stage = progress?.stage === 'loading' ? 'Carregando grades' : 'Analisando coberturas';
    content.setAttribute('aria-busy', 'true');
    content.append(
      element('p', 'query-progress__label', stage),
      element('p', 'query-progress__value', `${progress?.current || 0} de ${progress?.total || 0}`)
    );
    const progressBar = document.createElement('progress');
    progressBar.className = 'query-progress__bar';
    progressBar.max = Math.max(1, progress?.total || 1);
    progressBar.value = progress?.current || 0;
    progressBar.setAttribute('aria-label', stage);
    content.append(progressBar);
    const cancel = element('button', 'button button--secondary', 'Cancelar consulta');
    cancel.type = 'button';
    cancel.addEventListener('click', handlers.onCancel);
    content.append(cancel);
  } else if (query.status === 'cancelled') {
    content.append(element('p', 'empty-state', 'A consulta foi cancelada.'), newSearchBlock(query, handlers));
  } else if (query.status === 'error') {
    content.append(element('p', 'inline-error', 'Não foi possível concluir a consulta.'), newSearchBlock(query, handlers));
  } else {
    const totalProjetos = new Set(query.results.map((r) => r.projectId)).size;
    const summary = element('div', 'query-summary');
    summary.append(
      element('strong', 'query-summary__count', String(query.results.length)),
      element('span', 'query-summary__label', query.results.length === 1 ? 'fotografia encontrada' : 'fotografias encontradas')
    );
    // Quantos VOOS responderam importa tanto quanto quantas fotos: diz ao usuário
    // se a área cai num levantamento só ou se há mais de uma época disponível.
    if (totalProjetos > 0) {
      summary.append(element(
        'span',
        'query-summary__projects',
        totalProjetos === 1 ? 'em 1 aerolevantamento' : `em ${totalProjetos} aerolevantamentos`
      ));
    }
    content.append(summary);
    if (query.projectErrors.length > 0) {
      content.append(element('p', 'query-warning', `${query.projectErrors.length} projeto(s) não puderam ser consultados.`));
    }
    const limiteAviso = handlers.resultWarningThreshold;
    if (Number.isFinite(limiteAviso) && query.results.length > limiteAviso) {
      content.append(element(
        'p',
        'query-warning',
        `A área consultada devolveu ${query.results.length} fotografias. Refine a área para um resultado mais manejável; a lista carrega aos poucos conforme você rola.`
      ));
    }
    content.append(newSearchBlock(query, handlers));
    if (query.results.length === 0) {
      content.append(element('p', 'empty-state', 'Nenhuma fotografia cobre o local consultado. Tente uma nova posição ou área.'));
    } else {
      const all = element('button', 'button button--primary query-download-all', 'Preparar download de todas');
      all.type = 'button';
      all.disabled = downloads.reportStatus === 'generating';
      all.addEventListener('click', handlers.onDownloadAll);
      const downloadHint = element('p', 'query-download-hint', 'Gera primeiro um PDF de conferência e depois libera as imagens uma a uma.');
      const inspectionHint = element('p', 'query-inspection-hint', 'Passe o mouse sobre uma foto para pré-visualizar a cobertura ou use “Ver no mapa” para mantê-la destacada.');
      content.append(all, downloadHint, downloadWorkflow(downloads, handlers), inspectionHint, resultList(query, handlers));
    }
  }

  container.replaceChildren(header, content);
}
