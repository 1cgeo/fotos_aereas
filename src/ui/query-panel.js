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

function resultCard(result, handlers) {
  const item = element('li', 'query-result-card');
  item.tabIndex = 0;
  item.addEventListener('mouseenter', () => handlers.onHighlight(result));
  item.addEventListener('mouseleave', handlers.onClearHighlight);
  item.addEventListener('focus', () => handlers.onHighlight(result));
  item.addEventListener('blur', handlers.onClearHighlight);

  const thumbnail = document.createElement('img');
  thumbnail.className = 'query-result-card__thumbnail';
  thumbnail.src = result.thumbnailUrl;
  thumbnail.alt = `Miniatura de ${result.title}`;
  thumbnail.loading = 'lazy';
  thumbnail.decoding = 'async';
  thumbnail.referrerPolicy = 'no-referrer';
  thumbnail.addEventListener('error', () => {
    thumbnail.hidden = true;
  });

  const body = element('div', 'query-result-card__body');
  body.append(
    element('strong', 'query-result-card__title', result.title),
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
  const download = element('a', 'button button--primary query-result-card__download', 'Baixar fotografia');
  download.href = result.downloadUrl;
  download.download = result.downloadFilename;
  download.target = '_blank';
  download.rel = 'noopener noreferrer';
  download.referrerPolicy = 'no-referrer';
  download.addEventListener('click', () => handlers.onDownload?.(result));
  body.append(download);
  item.append(thumbnail, body);
  return item;
}

function downloadWorkflow(downloads, handlers) {
  const section = element('section', 'download-workflow');
  section.setAttribute('aria-live', 'polite');
  if (downloads.reportStatus === 'generating') {
    section.setAttribute('aria-busy', 'true');
    section.append(element('p', null, 'Gerando o PDF de conferência…'));
    return section;
  }
  if (downloads.reportStatus === 'error') {
    section.append(element('p', 'inline-error', 'Não foi possível gerar o relatório. Nenhuma imagem foi iniciada.'));
    const retry = element('button', 'button button--primary', 'Tentar gerar novamente');
    retry.type = 'button';
    retry.addEventListener('click', handlers.onDownloadAll);
    section.append(retry);
    return section;
  }
  if (downloads.reportStatus !== 'ready') return section;

  const total = downloads.items.length;
  const current = downloads.currentIndex;
  section.append(element('p', 'download-workflow__report', 'PDF gerado. Baixe agora cada fotografia individualmente.'));
  if (current < total) {
    const next = downloads.items[current];
    const button = element('button', 'button button--primary', `Baixar próxima (${current + 1} de ${total})`);
    button.type = 'button';
    button.addEventListener('click', handlers.onDownloadNext);
    section.append(button, element('small', null, next.downloadFilename));
  } else {
    section.append(element('p', 'download-workflow__complete', `Fila concluída: ${total} fotografia(s) acionada(s).`));
  }
  return section;
}

function resultList(query, handlers) {
  const list = element('ol', 'query-result-list');
  let lastProjectId = null;
  for (const result of query.results) {
    if (result.projectId !== lastProjectId) {
      const heading = element('li', 'query-result-group', result.projectTitle);
      heading.setAttribute('aria-hidden', 'true');
      list.append(heading);
      lastProjectId = result.projectId;
    }
    list.append(resultCard(result, handlers));
  }
  return list;
}

export function renderQueryPanel(container, query, downloads, handlers) {
  const header = element('div', 'query-panel__header');
  const back = element('button', 'button-link button-link--back', '← Voltar aos projetos');
  back.type = 'button';
  back.addEventListener('click', handlers.onClear);
  const title = element('h3', 'query-panel__title', 'Resultado da consulta');
  header.append(back, title);

  const content = element('div', 'query-panel__content');
  if (query.status === 'loading-projects' || query.status === 'running') {
    const progress = query.progress;
    const stage = progress?.stage === 'loading' ? 'Carregando grades' : 'Analisando coberturas';
    content.setAttribute('aria-busy', 'true');
    content.append(
      element('p', 'query-progress__label', stage),
      element('p', 'query-progress__value', `${progress?.current || 0} de ${progress?.total || 0}`)
    );
    const cancel = element('button', 'button button--secondary', 'Cancelar consulta');
    cancel.type = 'button';
    cancel.addEventListener('click', handlers.onCancel);
    content.append(cancel);
  } else if (query.status === 'cancelled') {
    content.append(element('p', 'empty-state', 'A consulta foi cancelada.'));
  } else if (query.status === 'error') {
    content.append(element('p', 'inline-error', 'Não foi possível concluir a consulta.'));
  } else {
    content.append(element(
      'p',
      'query-summary',
      `${query.results.length} ${query.results.length === 1 ? 'fotografia encontrada' : 'fotografias encontradas'}.`
    ));
    if (query.projectErrors.length > 0) {
      content.append(element('p', 'query-warning', `${query.projectErrors.length} projeto(s) não puderam ser consultados.`));
    }
    if (query.results.length === 0) {
      content.append(element('p', 'empty-state', 'Nenhuma fotografia cobre o local consultado.'));
    } else {
      const all = element('button', 'button button--primary query-download-all', 'Preparar download de todas');
      all.type = 'button';
      all.disabled = downloads.reportStatus === 'generating';
      all.addEventListener('click', handlers.onDownloadAll);
      content.append(all, downloadWorkflow(downloads, handlers), resultList(query, handlers));
    }
  }

  container.replaceChildren(header, content);
}
