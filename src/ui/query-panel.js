function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderQueryPanel(container, query, handlers) {
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
    const summary = element(
      'p',
      'query-summary',
      `${query.results.length} ${query.results.length === 1 ? 'fotografia encontrada' : 'fotografias encontradas'}.`
    );
    content.append(summary);
    if (query.projectErrors.length > 0) {
      content.append(element('p', 'query-warning', `${query.projectErrors.length} projeto(s) não puderam ser consultados.`));
    }
    const list = element('ol', 'query-result-list');
    for (const result of query.results) {
      const item = element('li', 'query-result-basic');
      item.append(
        element('strong', null, `${result.title} · ${result.projectTitle}`),
        element('span', null, [result.flightLine, result.capturedAt].filter(Boolean).join(' · '))
      );
      list.append(item);
    }
    if (query.results.length === 0) content.append(element('p', 'empty-state', 'Nenhuma fotografia cobre o local consultado.'));
    else content.append(list);
  }

  container.replaceChildren(header, content);
}

