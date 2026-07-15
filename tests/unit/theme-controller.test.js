import { describe, expect, it, vi } from 'vitest';
import { createThemeController, normalizeTheme, THEME_STORAGE_KEY } from '../../src/theme/theme-controller.js';

function storage(initial = null) {
  let value = initial;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((key, next) => {
      if (key === THEME_STORAGE_KEY) value = next;
    })
  };
}

describe('preferência de tema', () => {
  it('usa light como padrão explícito e ignora valores desconhecidos', () => {
    expect(normalizeTheme('dark')).toBe('dark');
    expect(normalizeTheme('system')).toBe('light');
    expect(normalizeTheme(null)).toBe('light');
  });

  it('lê, aplica e persiste somente light ou dark', () => {
    const root = document.createElement('html');
    const local = storage('dark');
    const controller = createThemeController({ root, storage: local });
    expect(controller.theme).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    controller.setTheme('light');
    expect(root.dataset.theme).toBe('light');
    expect(local.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, 'light');
  });

  it('notifica mudanças e tolera armazenamento indisponível', () => {
    const root = document.createElement('html');
    const broken = {
      getItem: () => { throw new Error('bloqueado'); },
      setItem: () => { throw new Error('bloqueado'); }
    };
    const listener = vi.fn();
    const controller = createThemeController({ root, storage: broken });
    const unsubscribe = controller.subscribe(listener);
    controller.setTheme('dark');
    unsubscribe();
    controller.setTheme('light');
    expect(listener).toHaveBeenNthCalledWith(1, 'light');
    expect(listener).toHaveBeenNthCalledWith(2, 'dark');
  });
});
