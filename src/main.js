import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';

import { createInitialState, createStore } from './app/store.js';
import { loadRuntimeConfig } from './config/load-config.js';
import { renderAppShell, renderFatalError, renderLoadingScreen } from './ui/shell.js';

async function bootstrap() {
  const root = document.querySelector('#app');
  if (!root) {
    throw new Error('Elemento raiz da aplicação não encontrado.');
  }

  renderLoadingScreen(root, 'Carregando catálogo…');

  try {
    const configUrl = new URL(`${import.meta.env.BASE_URL}config.js`, window.location.origin);
    const config = await loadRuntimeConfig(configUrl);
    const store = createStore(createInitialState(config));
    const ui = renderAppShell(root, config);
    const { initializeApplication } = await import('./app/app-controller.js');
    const controller = await initializeApplication({ config, store, ui });

    globalThis.__AERIAL_APP__ = Object.freeze({ config, store, ui, controller });
  } catch (error) {
    console.error('Falha ao iniciar o portal:', error);
    renderFatalError(root, error);
  }
}

bootstrap();
