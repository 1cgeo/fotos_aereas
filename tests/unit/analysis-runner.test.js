import { describe, expect, it, vi } from 'vitest';
import { createAnalysisRegistry } from '../../src/analysis/analysis-registry.js';
import { createAnalysisRunner } from '../../src/analysis/analysis-runner.js';
import { createStore } from '../../src/app/store.js';

function makeProject(id, sortOrder) {
  return { id, title: `Projeto ${id}`, sortOrder, enabled: true };
}

function makeFeature(projectId, photoId) {
  return {
    type: 'Feature',
    properties: {
      projectId,
      photoId,
      photoNumber: photoId,
      title: `Foto ${photoId}`,
      flightLine: 'F-1',
      thumbnailUrl: 'https://example.gov.br/thumb.svg',
      downloadUrl: 'https://example.gov.br/photo.svg',
      downloadFilename: `${photoId}.svg`
    },
    geometry: { type: 'Polygon', coordinates: [] }
  };
}

function makeStore(activeIds = new Set()) {
  return createStore({
    projects: {
      activeIds,
      dataById: new Map(),
      loadStateById: new Map()
    },
    query: {
      status: 'idle',
      geometry: null,
      scopeProjectIds: [],
      results: [],
      projectErrors: [],
      queryId: null,
      progress: null
    }
  });
}

function geometry() {
  return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [-47, -15] } };
}

function setup(activeIds = new Set(), loadImplementation) {
  const projects = [makeProject('a', 1), makeProject('b', 2)];
  const store = makeStore(activeIds);
  const repository = {
    getStatus: vi.fn(() => 'not-loaded'),
    load: vi.fn(loadImplementation || (async (id) => ({
      projectId: id,
      features: [makeFeature(id, `${id}-1`)],
      spatialIndex: {}
    })))
  };
  const registry = createAnalysisRegistry();
  registry.register({
    id: 'test',
    validate: () => ({ valid: true }),
    executeProject: ({ data }) => data.features
  });
  const runner = createAnalysisRunner({
    config: { projects, site: { globalLoadConcurrency: 2 } },
    store,
    repository,
    registry
  });
  return { runner, repository, store };
}

describe('AnalysisRunner', () => {
  it('usa somente projetos ativos quando houver', async () => {
    const { runner, repository, store } = setup(new Set(['b']));
    const result = await runner.run('test', geometry());
    expect(repository.load).toHaveBeenCalledTimes(1);
    expect(repository.load).toHaveBeenCalledWith('b', expect.any(Object));
    expect(result[0].projectId).toBe('b');
    expect(store.getState().query.status).toBe('ready');
  });

  it('consulta todos e preserva resultado parcial', async () => {
    const { runner, store } = setup(new Set(), async (id) => {
      if (id === 'b') throw new Error('indisponível');
      return { projectId: id, features: [makeFeature(id, 'a-1')], spatialIndex: {} };
    });
    const result = await runner.run('test', geometry());
    expect(result).toHaveLength(1);
    expect(store.getState().query.status).toBe('partial');
    expect(store.getState().query.projectErrors).toHaveLength(1);
  });

  it('limpa consulta e invalida estado', async () => {
    const { runner, store } = setup();
    await runner.run('test', geometry());
    runner.clear();
    expect(store.getState().query).toMatchObject({ status: 'idle', queryId: null, results: [] });
  });
});

