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
      onDownloadAll: vi.fn(), onDownloadItem: vi.fn(), onNewSearch: vi.fn(),
      onSelect: vi.fn((selected) => selected.key), selectedResultKey: null
    };
    renderQueryPanel(container, {
      status: 'ready', results: [result()], projectErrors: []
    }, { reportStatus: 'idle', items: [], baixados: new Set() }, handlers);
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
      onDownloadAll: vi.fn(), onDownloadItem: vi.fn(), onNewSearch: vi.fn(),
      onSelect: vi.fn(), selectedResultKey: null
    };
    renderQueryPanel(container, { status: 'ready', results, projectErrors: [] },
      { reportStatus: 'idle', items: [], baixados: new Set() }, handlers);
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

  function segundo() {
    return { ...result(), key: 'p:2', photoId: '2', title: 'Foto 2', downloadFilename: 'photo2.tif' };
  }

  function painelDeDownload(baixados) {
    const container = document.createElement('div');
    const handlers = {
      onClear: vi.fn(), onCancel: vi.fn(), onHighlight: vi.fn(), onClearHighlight: vi.fn(),
      onDownloadAll: vi.fn(), onDownloadItem: vi.fn(), onDownloadReport: vi.fn(),
      onNewSearch: vi.fn(), onSelect: vi.fn(), selectedResultKey: null
    };
    const itens = [result(), segundo()];
    renderQueryPanel(container, { status: 'ready', results: itens, projectErrors: [] }, {
      reportStatus: 'ready', items: itens, baixados, reportFilename: 'relatorio_abc.pdf'
    }, handlers);
    return { container, handlers };
  }

  // So as linhas de FOTOGRAFIA: o relatorio tem lista propria e nao deve ser
  // confundido com um resultado da consulta.
  function linhasDeFoto(container) {
    return container.querySelectorAll('.download-list:not(.download-list--relatorio) .download-list__item');
  }

  it('lista UMA linha por fotografia, cada uma baixavel por si', () => {
    const { container, handlers } = painelDeDownload(new Set());
    const linhas = linhasDeFoto(container);
    expect(linhas).toHaveLength(2);
    expect(container.textContent).toContain('0 de 2 fotografia(s) baixada(s)');

    // A SEGUNDA, sem passar pela primeira: nao ha ordem imposta.
    linhas[1].querySelector('button').click();
    expect(handlers.onDownloadItem).toHaveBeenCalledWith('p:2');
  });

  it('marca a que ja veio e AINDA deixa baixar de novo', () => {
    const { container, handlers } = painelDeDownload(new Set(['p:1']));
    const linhas = linhasDeFoto(container);
    expect(linhas[0].dataset.baixado).toBe('true');
    expect(linhas[1].dataset.baixado).toBeUndefined();
    expect(container.textContent).toContain('1 de 2 fotografia(s) baixada(s)');

    // O caso que a fila sequencial impedia: reaver o arquivo cuja conexao caiu.
    const botao = linhas[0].querySelector('button');
    expect(botao.disabled).toBe(false);
    expect(botao.getAttribute('aria-label')).toContain('novamente');
    botao.click();
    expect(handlers.onDownloadItem).toHaveBeenCalledWith('p:1');
  });

  it('deixa rebaixar o PDF sem refazer a consulta', () => {
    const { container, handlers } = painelDeDownload(new Set());
    const linha = container.querySelector('.download-list--relatorio .download-list__item');
    expect(linha.dataset.baixado).toBe('true');
    expect(linha.textContent).toContain('Relatório PDF');

    const botao = linha.querySelector('button');
    expect(botao.getAttribute('aria-label')).toContain('relatorio_abc.pdf');
    botao.click();
    expect(handlers.onDownloadReport).toHaveBeenCalledOnce();
    // e nao se confunde com as fotografias
    expect(handlers.onDownloadItem).not.toHaveBeenCalled();
  });

  it('nao conta o PDF entre as fotografias', () => {
    const { container } = painelDeDownload(new Set(['p:1', 'p:2']));
    expect(container.textContent).toContain('2 de 2 fotografia(s) baixada(s)');
    // a lista de fotografias tem 2 linhas, o relatorio vive em lista propria
    expect(linhasDeFoto(container)).toHaveLength(2);
  });

  it('avisa quando todas foram baixadas', () => {
    const { container } = painelDeDownload(new Set(['p:1', 'p:2']));
    expect(container.querySelector('.download-workflow__complete').textContent)
      .toContain('Todas as 2');
  });
});
