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
      onDownloadAll: vi.fn(), onDownloadNext: vi.fn()
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
    const link = container.querySelector('a[download]');
    expect(link.getAttribute('download')).toBe('photo.tif');
  });

  it('mostra progresso da fila individual', () => {
    const container = document.createElement('div');
    const handlers = {
      onClear: vi.fn(), onCancel: vi.fn(), onHighlight: vi.fn(), onClearHighlight: vi.fn(),
      onDownloadAll: vi.fn(), onDownloadNext: vi.fn()
    };
    renderQueryPanel(container, { status: 'ready', results: [result()], projectErrors: [] }, {
      reportStatus: 'ready', items: [result()], currentIndex: 0
    }, handlers);
    const next = [...container.querySelectorAll('button')].find((button) => button.textContent.includes('próxima'));
    next.click();
    expect(handlers.onDownloadNext).toHaveBeenCalledOnce();
  });
});
