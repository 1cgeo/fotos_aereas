function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

export function renderLoadingScreen(root, message) {
  const container = createElement('main', 'loading-screen');
  container.setAttribute('aria-busy', 'true');
  const spinner = createElement('span', 'loading-spinner');
  spinner.setAttribute('aria-hidden', 'true');
  container.append(spinner, createElement('p', null, message));
  root.replaceChildren(container);
}

export function renderFatalError(root, error) {
  const container = createElement('main', 'fatal-error');
  const title = createElement('h1', null, 'Não foi possível abrir o portal');
  const message = createElement(
    'p',
    null,
    error instanceof Error ? error.message : 'Ocorreu um erro inesperado.'
  );
  const retry = createElement('button', 'button button--primary', 'Tentar novamente');
  retry.type = 'button';
  retry.addEventListener('click', () => window.location.reload());
  container.append(title, message, retry);
  root.replaceChildren(container);
}

export function renderAppShell(root, config) {
  const app = createElement('div', 'app-shell');

  const header = createElement('header', 'app-header');
  const identity = createElement('div', 'app-identity');
  identity.append(
    createElement('span', 'app-kicker', 'Acervo cartográfico'),
    createElement('h1', 'app-title', config.site.title)
  );
  header.append(identity);

  const main = createElement('main', 'app-main');
  const sidebar = createElement('aside', 'sidebar');
  sidebar.setAttribute('aria-label', 'Projetos e resultados');
  const sidebarHeader = createElement('div', 'sidebar__header');
  sidebarHeader.append(
    createElement('h2', 'sidebar__title', 'Aerolevantamentos'),
    createElement('p', 'sidebar__description', config.site.description)
  );
  const sidebarContent = createElement('div', 'sidebar__content');
  const emptyCatalog = createElement(
    'p',
    'empty-state',
    config.projects.length === 0
      ? 'Nenhum projeto foi cadastrado ainda.'
      : `${config.projects.length} projeto(s) disponível(is).`
  );
  sidebarContent.append(emptyCatalog);
  sidebar.append(sidebarHeader, sidebarContent);

  const workspace = createElement('section', 'workspace');
  workspace.setAttribute('aria-label', 'Mapa de fotografias aéreas');
  const toolbar = createElement('div', 'map-toolbar');
  toolbar.setAttribute('aria-label', 'Ferramentas de consulta');
  const scope = createElement('span', 'scope-badge', 'Escopo: todos os projetos');
  toolbar.append(scope);
  const map = createElement('div', 'map');
  map.id = 'map';
  map.setAttribute('role', 'application');
  map.setAttribute('aria-label', 'Mapa interativo');
  map.append(createElement('p', 'map-placeholder', 'O mapa será iniciado na próxima fase.'));
  workspace.append(toolbar, map);

  main.append(sidebar, workspace);
  app.append(header, main);
  root.replaceChildren(app);
  document.title = config.site.title;

  return Object.freeze({ app, header, main, sidebar, sidebarContent, workspace, toolbar, scope, map });
}

