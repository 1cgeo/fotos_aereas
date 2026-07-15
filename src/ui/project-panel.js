function element(tagName, className, text) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function loadLabel(loadState, active) {
  if (loadState?.status === 'loading') return 'Carregando grade…';
  if (loadState?.status === 'error') return 'Erro ao carregar';
  if (active) return 'Grade visível';
  if (loadState?.status === 'ready') return 'Pronto';
  return 'Não carregado';
}

export function renderProjectsView(container, config, state, handlers) {
  const fragment = document.createDocumentFragment();
  const list = element('div', 'project-list');

  for (const project of config.projects) {
    const active = state.projects.activeIds.has(project.id);
    const loadState = state.projects.loadStateById.get(project.id);
    const card = element('article', 'project-card');
    card.dataset.projectId = project.id;

    const top = element('div', 'project-card__top');
    const titleGroup = element('div');
    const title = element('h3', 'project-card__title', project.title);
    const period = element('p', 'project-card__period', project.period?.display || 'Período não informado');
    titleGroup.append(title, period);

    const switchLabel = element('label', 'project-switch');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = active;
    checkbox.disabled = loadState?.status === 'loading';
    checkbox.setAttribute('aria-label', `${active ? 'Ocultar' : 'Mostrar'} ${project.title}`);
    checkbox.addEventListener('change', () => handlers.onToggle(project.id, checkbox.checked));
    const swatch = element('span', 'project-switch__visual');
    swatch.style.setProperty('--project-color', project.style.color);
    switchLabel.append(checkbox, swatch);
    top.append(titleGroup, switchLabel);

    const summary = element('p', 'project-card__summary', project.summary);
    const footer = element('div', 'project-card__footer');
    const status = element('span', `project-status project-status--${loadState?.status || 'idle'}`, loadLabel(loadState, active));
    const details = element('button', 'button-link', 'Ver detalhes');
    details.type = 'button';
    details.addEventListener('click', () => handlers.onDetails(project.id));
    footer.append(status, details);

    if (loadState?.error) {
      const error = element('p', 'inline-error', loadState.error.message || 'Falha ao carregar a grade.');
      card.append(top, summary, footer, error);
    } else {
      card.append(top, summary, footer);
    }
    list.append(card);
  }

  if (config.projects.length === 0) list.append(element('p', 'empty-state', 'Nenhum projeto cadastrado.'));
  fragment.append(list);
  container.replaceChildren(fragment);
}

function addDetailRow(list, label, value) {
  if (value === undefined || value === null || value === '') return;
  const term = element('dt', null, label);
  const description = element('dd', null, String(value));
  list.append(term, description);
}

export function renderProjectDetails(container, project, active, handlers) {
  const back = element('button', 'button-link button-link--back', '← Voltar aos projetos');
  back.type = 'button';
  back.addEventListener('click', handlers.onBack);

  const article = element('article', 'project-details');
  article.append(
    element('p', 'project-details__eyebrow', project.period?.display || 'Período não informado'),
    element('h3', 'project-details__title', project.title),
    element('p', 'project-details__summary', project.summary)
  );
  for (const paragraph of project.description) article.append(element('p', null, paragraph));

  const toggle = element('button', 'button button--secondary', active ? 'Ocultar grade' : 'Mostrar grade');
  toggle.type = 'button';
  toggle.addEventListener('click', () => handlers.onToggle(project.id, !active));
  article.append(toggle);

  const details = element('dl', 'project-definition-list');
  addDetailRow(details, 'Instituição', project.institution);
  addDetailRow(details, 'Executor', project.contractor);
  addDetailRow(details, 'Aeronave', project.aircraft);
  addDetailRow(details, 'Câmera', project.camera);
  addDetailRow(details, 'Escala nominal', project.nominalScale);
  addDetailRow(details, 'Filme', project.filmType);
  addDetailRow(details, 'Cobertura', project.spatialCoverage);
  addDetailRow(details, 'Fotografias', project.photoCount);
  addDetailRow(details, 'Licença', project.license?.label);
  article.append(details);

  if (project.credits) article.append(element('p', 'project-details__credits', project.credits));
  container.replaceChildren(back, article);
}

