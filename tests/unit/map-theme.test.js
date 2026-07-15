import { describe, expect, it, vi } from 'vitest';
import { applyMapTheme } from '../../src/map/map-theme.js';

describe('tema do mapa raster', () => {
  it('atenua somente camadas raster no tema escuro e restaura no claro', () => {
    const map = {
      getStyle: () => ({ layers: [{ id: 'osm', type: 'raster' }, { id: 'grade', type: 'fill' }] }),
      getLayer: vi.fn(() => ({})),
      setPaintProperty: vi.fn()
    };
    applyMapTheme(map, 'dark');
    expect(map.setPaintProperty).toHaveBeenCalledWith('osm', 'raster-brightness-max', 0.58);
    expect(map.setPaintProperty).not.toHaveBeenCalledWith('grade', expect.anything(), expect.anything());
    map.setPaintProperty.mockClear();
    applyMapTheme(map, 'light');
    expect(map.setPaintProperty).toHaveBeenCalledWith('osm', 'raster-brightness-max', 1);
  });
});
