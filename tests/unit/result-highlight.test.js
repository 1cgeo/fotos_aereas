import { describe, expect, it, vi } from 'vitest';
import { clearResultHighlight, showResultHighlight } from '../../src/map/result-highlight.js';

function fakeMap() {
  const sources = new Map();
  const layers = new Map();
  return {
    sources,
    layers,
    getSource: vi.fn((id) => sources.get(id)),
    addSource: vi.fn((id, definition) => sources.set(id, { ...definition, setData: vi.fn() })),
    getLayer: vi.fn((id) => layers.get(id)),
    addLayer: vi.fn((definition) => layers.set(definition.id, definition))
  };
}

describe('destaque de resultado', () => {
  it('usa camada independente e substitui a geometria destacada', () => {
    const map = fakeMap();
    const result = {
      key: 'p:1',
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 1], [0, 0]]] }
    };
    showResultHighlight(map, result);
    const source = map.sources.get('query:result-highlight');
    expect(map.addLayer).toHaveBeenCalledTimes(2);
    expect(source.setData).toHaveBeenCalledWith(expect.objectContaining({ geometry: result.geometry }));
    clearResultHighlight(map);
    expect(source.setData).toHaveBeenLastCalledWith({ type: 'FeatureCollection', features: [] });
  });
});
