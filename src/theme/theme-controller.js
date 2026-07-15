export const THEME_STORAGE_KEY = 'aerial-catalog-theme';
export const THEMES = Object.freeze(['light', 'dark']);

export function normalizeTheme(value) {
  return value === 'dark' ? 'dark' : 'light';
}

function readStorage(storage) {
  try {
    return storage?.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(storage, theme) {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // A preferência continua válida na sessão mesmo sem persistência.
  }
}

export function createThemeController(options = {}) {
  const root = options.root || document.documentElement;
  const storage = options.storage === undefined ? globalThis.localStorage : options.storage;
  const listeners = new Set();
  let theme = normalizeTheme(root.dataset.theme || readStorage(storage));
  root.dataset.theme = theme;

  function setTheme(nextTheme, settings = {}) {
    const normalized = normalizeTheme(nextTheme);
    const changed = normalized !== theme;
    theme = normalized;
    root.dataset.theme = theme;
    if (settings.persist !== false) writeStorage(storage, theme);
    if (changed) {
      for (const listener of listeners) listener(theme);
    }
    return theme;
  }

  return Object.freeze({
    get theme() {
      return theme;
    },
    setTheme,
    subscribe(listener, settings = {}) {
      if (typeof listener !== 'function') throw new TypeError('Listener de tema inválido.');
      listeners.add(listener);
      if (settings.emit !== false) listener(theme);
      return () => listeners.delete(listener);
    }
  });
}
