import { describe, expect, it, vi } from 'vitest';
import { narrowScopeByCoverage, resolveQueryScope } from '../../src/analysis/query-scope.js';

function projeto(id) {
  return { id, title: id, enabled: true };
}

function cobertura(west, south, east, north) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
    }
  };
}

function ponto(x, y) {
  return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [x, y] } };
}

function area(west, south, east, north) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]]
    }
  };
}

function repositorio(mapa) {
  return { loadCoverage: vi.fn(async (id) => mapa[id] ?? null) };
}

describe('resolveQueryScope', () => {
  const config = { projects: [projeto('a'), projeto('b')] };

  it('usa somente os projetos ligados', () => {
    expect(resolveQueryScope(config, new Set(['b'])).map((p) => p.id)).toEqual(['b']);
  });

  it('usa todo o catálogo quando nenhum está ligado', () => {
    expect(resolveQueryScope(config, new Set()).map((p) => p.id)).toEqual(['a', 'b']);
  });
});

describe('narrowScopeByCoverage', () => {
  it('descarta o projeto cuja cobertura o ponto não toca', async () => {
    const escopo = [projeto('perto'), projeto('longe')];
    const repo = repositorio({
      perto: cobertura(-52, -30, -51, -29),
      longe: cobertura(-10, 10, -9, 11)
    });
    const resultado = await narrowScopeByCoverage(escopo, ponto(-51.5, -29.5), repo);
    expect(resultado.scope.map((p) => p.id)).toEqual(['perto']);
    expect(resultado.descartados).toBe(1);
  });

  it('mantém o projeto que a área intersecta', async () => {
    const escopo = [projeto('a'), projeto('b')];
    const repo = repositorio({
      a: cobertura(-52, -30, -51, -29),
      b: cobertura(-40, -20, -39, -19)
    });
    const resultado = await narrowScopeByCoverage(escopo, area(-51.5, -29.5, -50.5, -28.5), repo);
    expect(resultado.scope.map((p) => p.id)).toEqual(['a']);
  });

  it('MANTÉM o projeto sem cobertura declarada, para nunca esconder um voo', async () => {
    const escopo = [projeto('com'), projeto('sem')];
    const repo = repositorio({ com: cobertura(-52, -30, -51, -29) });
    const resultado = await narrowScopeByCoverage(escopo, ponto(0, 0), repo);
    expect(resultado.scope.map((p) => p.id)).toEqual(['sem']);
    expect(resultado.semCobertura).toBe(1);
  });

  it('MANTÉM o projeto quando a cobertura falha ao carregar', async () => {
    const escopo = [projeto('a'), projeto('quebrado')];
    const repo = {
      loadCoverage: vi.fn(async (id) => {
        if (id === 'quebrado') throw new Error('rede caiu');
        return cobertura(-52, -30, -51, -29);
      })
    };
    const resultado = await narrowScopeByCoverage(escopo, ponto(0, 0), repo);
    expect(resultado.scope.map((p) => p.id)).toEqual(['quebrado']);
  });

  it('não consulta cobertura quando há um único projeto no escopo', async () => {
    const repo = repositorio({});
    const resultado = await narrowScopeByCoverage([projeto('unico')], ponto(0, 0), repo);
    expect(repo.loadCoverage).not.toHaveBeenCalled();
    expect(resultado.scope.map((p) => p.id)).toEqual(['unico']);
  });

  it('propaga o cancelamento', async () => {
    const controller = new AbortController();
    controller.abort();
    const repo = repositorio({ a: cobertura(-1, -1, 1, 1), b: cobertura(-1, -1, 1, 1) });
    await expect(
      narrowScopeByCoverage([projeto('a'), projeto('b')], ponto(0, 0), repo, controller.signal)
    ).rejects.toThrow(/cancelada/);
  });
});
