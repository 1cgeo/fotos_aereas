import { createCleanupScope } from '../cleanup-scope.js';

const SOURCE_ID = 'query:point';
const LAYER_ID = 'query:point-symbol';

function emptyCollection() {
  return { type: 'FeatureCollection', features: [] };
}

function ensureLayer(map) {
  if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: 'geojson', data: emptyCollection() });
  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': 7,
        'circle-color': '#dc2626',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });
  }
}

export function createPointQueryTool({ map, runner, store }) {
  let scope = null;
  const handleClick = (event) => {
    const { lng, lat } = event.lngLat || {};
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    const point = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [lng, lat] }
    };
    map.getSource(SOURCE_ID).setData(point);
    runner.run('point-intersection', point).catch((error) => {
      console.error('Falha na consulta por ponto:', error);
    });
  };

  return Object.freeze({
    id: 'point-query',
    label: 'Consultar ponto',
    activate() {
      if (scope) return;
      ensureLayer(map);
      scope = createCleanupScope();
      const canvas = map.getCanvas();
      const previousCursor = canvas.style.cursor;
      canvas.style.cursor = 'crosshair';
      scope.add(() => {
        canvas.style.cursor = previousCursor;
      });
      scope.mapOn(map, 'click', handleClick);
    },
    deactivate() {
      const status = store.getState().query.status;
      if (status === 'loading-projects' || status === 'running') runner.cancel();
      scope?.cleanup();
      scope = null;
    },
    clearGeometry() {
      if (map.getSource(SOURCE_ID)) map.getSource(SOURCE_ID).setData(emptyCollection());
    },
    destroy() {
      scope?.cleanup();
      scope = null;
    }
  });
}

