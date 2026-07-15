import { describe, expect, it, vi } from 'vitest';
import { createThemeController } from '../../src/theme/theme-controller.js';
import { renderAppShell } from '../../src/ui/shell.js';

function config() {
  return {
    site: {
      title: 'Acervo de Fotografias Aéreas',
      shortTitle: 'Fotos Aéreas',
      description: 'Consulte o acervo.'
    },
    projects: [{ id: 'a' }, { id: 'b' }]
  };
}

describe('shell responsivo', () => {
  it('recolhe o painel e atualiza contexto sem perder semântica', () => {
    const root = document.createElement('div');
    root.setAttribute('aria-live', 'polite');
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() };
    const themeController = createThemeController({ root: document.documentElement, storage });
    const ui = renderAppShell(root, config(), { themeController });
    const onToggle = vi.fn();
    ui.subscribeSidebarToggle(onToggle);

    expect(root.hasAttribute('aria-live')).toBe(false);
    const collapse = root.querySelector('.sidebar__collapse');
    expect(collapse.getAttribute('aria-expanded')).toBe('true');
    collapse.click();
    expect(ui.getSidebarCollapsed()).toBe(true);
    expect(ui.app.classList.contains('app-shell--sidebar-collapsed')).toBe(true);
    expect(collapse.getAttribute('aria-label')).toBe('Expandir painel');
    expect(onToggle).toHaveBeenCalledWith(true);

    ui.setSidebarHeader('Resultados da consulta', '2 fotografias encontradas.');
    expect(root.querySelector('.sidebar__title').textContent).toBe('Resultados da consulta');
    expect(root.querySelector('.sidebar__description').textContent).toBe('2 fotografias encontradas.');
    ui.destroy();
  });
});
