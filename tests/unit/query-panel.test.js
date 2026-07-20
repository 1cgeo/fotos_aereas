import { describe, expect, it, vi } from 'vitest';
import { renderQueryPanel } from '../../src/ui/query-panel.js';

function result() {
  return {
    key: 'p:1', projectId: 'p', projectTitle: 'Projeto', photoId: '1', title: 'Foto 1',
    flightLine: 'FX-1', capturedAt: '1958-01-01', nominalScale: '1:25.000', sizeBytes: 2048,
    thumbnailUrl: 'https://example.test/thumb.jpg', downloadUrl: 'https://example.test/photo.tif',
    downloadFilename: 'photo.tif', notes: 'Sobreposição.'
  };
}

describe('painel de resultados', () => {
  it('renderiza metadados, download e destaque acessível', () => {
    const container = document.createElement('div');
    const handlers = {
      onClear: vi.fn(), onCancel: vi.fn(), onHighlight: vi.fn(), onClearHighlight: vi.fn(),
      onDownloadAll: vi.fn(), onDownloadNext: vi.fn(), onNewSearch: vi.fn(),
      onSelect: vi.fn((selected) => selected.key), selectedResultKey: null
    };
    renderQueryPanel(container, {
      status: 'ready', results: [result()], projectErrors: []
    }, { reportStatus: 'idle', items: [], currentIndex: 0 }, handlers);
    expect(container.textContent).toContain('Foto 1');
    expect(container.textContent).toContain('2.0 KB');
    const card = container.querySelector('.query-result-card');
    card.dispatchEvent(new Event('mouseenter'));
    card.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(handlers.onHighlight).toHaveBeenCalledTimes(2);
    const locate = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Ver no mapa');
    locate.click();
    expect(handlers.onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'p:1' }));
    expect(locate.getAttribute('aria-pressed')).toBe('true');
    expect(locate.textContent).toBe('Destacado no mapa');
    const nextSearch = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Escolher outro ponto');
    nextSearch.click();
    expect(handlers.onNewSearch).toHaveBeenCalledOnce();
    const link = container.querySelector('a[download]');
    expect(link.getAttribute('download')).toBe('photo.tif');
  });

  function resultado(projectId, projectTitle, n) {
    return {
      ...result(),
      key: `${projectId}:${n}`, projectId, projectTitle, photoId: String(n),
      title: `Foto ${n} - ${projectTitle}`
    };
  }

  function renderiza(results) {
    const container = document.createElement('div');
    const handlers = {
      onClear: vi.fn(), onCancel: vi.fn(), onHighlight: vi.fn(), onClearHighlight: vi.fn(),
      onDownloadAll: vi.fn(), onDownloadNext: vi.fn(), onNewSearch: vi.fn(),
      onSelect: vi.fn(), selectedResultKey: null
    };
    renderQueryPanel(container, { status: 'ready', results, projectErrors: [] },
      { reportStatus: 'idle', items: [], currentIndex: 0 }, handlers);
    return container;
  }

  it('conta os aerolevantamentos, nao so as fotografias', () => {
    const um = renderiza([resultado('a', 'Voo A', 1), resultado('a', 'Voo A', 2)]);
    expect(um.textContent).toContain('em 1 aerolevantamento');

    const dois = renderiza([
      resultado('a', 'Voo A', 1), resultado('a', 'Voo A', 2), resultado('b', 'Voo B', 3)
    ]);
    expect(dois.textContent).toContain('em 2 aerolevantamentos');
  });

  it('agrupa por aerolevantamento, com a contagem de cada um', () => {
    const container = renderiza([
      resultado('a', 'Voo A', 1), resultado('a', 'Voo A', 2), resultado('b', 'Voo B', 3)
    ]);
    const grupos = container.querySelectorAll('.query-result-group');
    expect(grupos).toHaveLength(2);
    const titulos = [...container.querySelectorAll('.query-result-group__titulo')].map((n) => n.textContent);
    expect(titulos).toEqual(['Voo A', 'Voo B']);
    const contagens = [...container.querySelectorAll('.query-result-group__contagem')].map((n) => n.textContent);
    expect(contagens).toEqual(['2 fotografias', '1 fotografia']);
  });

  it('colapsa e reabre um grupo sem afetar os outros', () => {
    const container = renderiza([
      resultado('a', 'Voo A', 1), resultado('b', 'Voo B', 2)
    ]);
    const [primeiro, segundo] = container.querySelectorAll('.query-result-group');
    const alterna = primeiro.querySelector('.query-result-group__toggle');
    const itens = primeiro.querySelector('.query-result-group__itens');

    expect(alterna.getAttribute('aria-expanded')).toBe('true');
    expect(itens.hidden).toBe(false);

    alterna.click();
    expect(alterna.getAttribute('aria-expanded')).toBe('false');
    expect(itens.hidden).toBe(true);
    expect(segundo.querySelector('.query-result-group__itens').hidden).toBe(false);

    alterna.click();
    expect(alterna.getAttribute('aria-expanded')).toBe('true');
    expect(itens.hidden).toBe(false);
  });

  it('mostra progresso da fila individual', () => {
    const container = document.createElement('div');
    const handlers = {
      onClear: vi.fn(), onCancel: vi.fn(), onHighlight: vi.fn(), onClearHighlight: vi.fn(),
      onDownloadAll: vi.fn(), onDownloadNext: vi.fn(), onNewSearch: vi.fn(),
      onSelect: vi.fn(), selectedResultKey: null
    };
    renderQueryPanel(container, { status: 'ready', results: [result()], projectErrors: [] }, {
      reportStatus: 'ready', items: [result()], currentIndex: 0
    }, handlers);
    const next = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('próxima'));
    next.click();
    expect(handlers.onDownloadNext).toHaveBeenCalledOnce();
  });
});
