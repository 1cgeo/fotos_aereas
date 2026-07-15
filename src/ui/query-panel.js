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
  const download = element('a', 'button button--primary query-result-card__download', 'Baixar fotografia');
  download.href = result.downloadUrl;
  download.download = result.downloadFilename;
  download.target = '_blank';
  download.rel = 'noopener noreferrer';
  download.referrerPolicy = 'no-referrer';
  download.addEventListener('click', () => handlers.onDownload?.(result));
  body.append(download);
  item.append(media, body);
  return item;
}

function downloadWorkflow(downloads, handlers) {
  const section = element('section', 'download-workflow');
  section.setAttribute('aria-live', 'polite');
  if (downloads.reportStatus === 'generating') {
    section.setAttribute('aria-busy', 'true');
    section.append(
      element('span', 'download-workflow__step', 'Etapa 1 de 2'),
      element('p', null, 'Gerando o PDF de conferência…')
    );
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
  section.append(
    element('span', 'download-workflow__step', 'Etapa 2 de 2'),
    element('p', 'download-workflow__report', 'PDF gerado. Baixe agora cada fotografia individualmente.')
  );
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
      heading.setAttribute('role', 'heading');
      heading.setAttribute('aria-level', '4');
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
    content.append(element('p', 'empty-state', 'A consulta foi cancelada.'));
  } else if (query.status === 'error') {
    content.append(element('p', 'inline-error', 'Não foi possível concluir a consulta.'));
  } else {
    const summary = element('div', 'query-summary');
    summary.append(
      element('strong', 'query-summary__count', String(query.results.length)),
      element('span', 'query-summary__label', query.results.length === 1 ? 'fotografia encontrada' : 'fotografias encontradas')
    );
    content.append(summary);
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
      const downloadHint = element('p', 'query-download-hint', 'Gera primeiro um PDF de conferência e depois libera as imagens uma a uma.');
      content.append(all, downloadHint, downloadWorkflow(downloads, handlers), resultList(query, handlers));
    }
  }

  container.replaceChildren(header, content);
}
