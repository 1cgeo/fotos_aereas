import { describe, expect, it, vi } from 'vitest';
import { ensureProjectLayers, getProjectLayerIds, setProjectVisibility } from '../../src/map/project-layers.js';

function fakeMap() {
  const sources = new Map();
  const layers = new Map();
  return {
    addSource: vi.fn((id, source) => sources.set(id, { ...source, setData: vi.fn() })),
    getSource: vi.fn((id) => sources.get(id)),
    addLayer: vi.fn((layer) => layers.set(layer.id, layer)),
    getLayer: vi.fn((id) => layers.get(id)),
    setLayoutProperty: vi.fn()
  };
}

describe('project layers', () => {
  it('cria source, preenchimento e contorno uma única vez', () => {
    const map = fakeMap();
    const project = { id: 'projeto-1', style: { color: '#2563eb', fillOpacity: 0.1, lineOpacity: 0.8 } };
    const data = { collection: { type: 'FeatureCollection', features: [] } };

    ensureProjectLayers(map, project, data);
    ensureProjectLayers(map, project, data);

    expect(map.addSource).toHaveBeenCalledOnce();
    expect(map.addLayer).toHaveBeenCalledTimes(2);
    expect(map.getSource(getProjectLayerIds(project.id).source).setData).toHaveBeenCalledOnce();
  });

  it('altera visibilidade das duas camadas', () => {
    const map = fakeMap();
    const project = { id: 'projeto-1', style: { color: '#2563eb', fillOpacity: 0.1, lineOpacity: 0.8 } };
    ensureProjectLayers(map, project, { collection: { type: 'FeatureCollection', features: [] } });
    setProjectVisibility(map, project.id, false);
    expect(map.setLayoutProperty).toHaveBeenCalledTimes(2);
    expect(map.setLayoutProperty).toHaveBeenCalledWith('project:projeto-1:fill', 'visibility', 'none');
  });
});

