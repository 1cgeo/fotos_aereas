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

function createThemeSelector(themeController) {
  const group = createElement('div', 'theme-selector');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Tema da interface');
  const options = [
    { id: 'light', icon: '☀', label: 'Claro' },
    { id: 'dark', icon: '☾', label: 'Escuro' }
  ];
  const buttons = new Map();
  for (const option of options) {
    const button = createElement('button', 'theme-option');
    button.type = 'button';
    button.dataset.theme = option.id;
    button.setAttribute('aria-label', `Usar tema ${option.label.toLowerCase()}`);
    const icon = createElement('span', 'theme-option__icon', option.icon);
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, createElement('span', 'theme-option__label', option.label));
    button.addEventListener('click', () => themeController.setTheme(option.id));
    buttons.set(option.id, button);
    group.append(button);
  }
  const unsubscribe = themeController.subscribe((theme) => {
    for (const [id, button] of buttons) {
      const active = id === theme;
      button.setAttribute('aria-pressed', String(active));
      button.classList.toggle('theme-option--active', active);
    }
  });
  return { element: group, destroy: unsubscribe };
}

export function renderAppShell(root, config, { themeController }) {
  const app = createElement('div', 'app-shell');

  const header = createElement('header', 'app-header');
  const identity = createElement('div', 'app-identity');
  const mark = createElement('span', 'app-mark');
  mark.setAttribute('aria-hidden', 'true');
  const identityText = createElement('div', 'app-identity__text');
  const appTitle = createElement('h1', 'app-title');
  appTitle.append(
    createElement('span', 'app-title__long', config.site.title),
    createElement('span', 'app-title__short', config.site.shortTitle)
  );
  identityText.append(createElement('span', 'app-kicker', 'Acervo cartográfico'), appTitle);
  identity.append(mark, identityText);
  const themeSelector = createThemeSelector(themeController);
  header.append(identity, themeSelector.element);

  const main = createElement('main', 'app-main');
  const sidebar = createElement('aside', 'sidebar');
  sidebar.setAttribute('aria-label', 'Projetos e resultados');
  const sidebarHeader = createElement('div', 'sidebar__header');
  const sidebarHeadingRow = createElement('div', 'sidebar__heading-row');
  const sidebarTitle = createElement('h2', 'sidebar__title', 'Aerolevantamentos');
  const collapseButton = createElement('button', 'sidebar__collapse');
  collapseButton.type = 'button';
  collapseButton.setAttribute('aria-expanded', 'true');
  collapseButton.setAttribute('aria-controls', 'sidebar-content');
  const collapseIcon = createElement('span', 'sidebar__collapse-icon', '⌄');
  collapseIcon.setAttribute('aria-hidden', 'true');
  collapseButton.append(collapseIcon);
  sidebarHeadingRow.append(sidebarTitle, collapseButton);
  const sidebarDescription = createElement('p', 'sidebar__description', config.site.description);
  sidebarHeader.append(sidebarHeadingRow, sidebarDescription);
  const sidebarContent = createElement('div', 'sidebar__content');
  sidebarContent.id = 'sidebar-content';
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
  root.removeAttribute('aria-live');
  document.title = config.site.title;

  let sidebarCollapsed = false;
  const sidebarListeners = new Set();
  function setSidebarCollapsed(collapsed) {
    sidebarCollapsed = Boolean(collapsed);
    sidebar.classList.toggle('sidebar--collapsed', sidebarCollapsed);
    app.classList.toggle('app-shell--sidebar-collapsed', sidebarCollapsed);
    collapseButton.setAttribute('aria-expanded', String(!sidebarCollapsed));
    collapseButton.setAttribute('aria-label', sidebarCollapsed ? 'Expandir painel' : 'Recolher painel');
    collapseIcon.textContent = sidebarCollapsed ? '⌃' : '⌄';
    for (const listener of sidebarListeners) listener(sidebarCollapsed);
  }
  collapseButton.addEventListener('click', () => setSidebarCollapsed(!sidebarCollapsed));
  setSidebarCollapsed(false);

  return Object.freeze({
    app, header, main, sidebar, sidebarContent, workspace, toolbar, scope, map,
    setSidebarHeader(title, description) {
      sidebarTitle.textContent = title;
      sidebarDescription.textContent = description;
    },
    setSidebarCollapsed,
    getSidebarCollapsed() {
      return sidebarCollapsed;
    },
    subscribeSidebarToggle(listener) {
      sidebarListeners.add(listener);
      return () => sidebarListeners.delete(listener);
    },
    destroy() {
      sidebarListeners.clear();
      themeSelector.destroy();
    }
  });
}
