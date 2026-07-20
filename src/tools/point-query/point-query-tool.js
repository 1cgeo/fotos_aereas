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

function createGuidance() {
  const guidance = document.createElement('div');
  guidance.className = 'map-guidance';
  guidance.setAttribute('role', 'status');
  const title = document.createElement('strong');
  title.textContent = 'Consulta por ponto';
  const text = document.createElement('span');
  text.textContent = 'Clique no mapa. Clique em outro local para fazer uma nova busca.';
  guidance.append(title, text);
  return guidance;
}

/**
 * `asDefault` marca o modo em que a consulta por ponto é o comportamento padrão
 * do mapa, e não uma ferramenta que o usuário liga. Nesse modo não há aviso fixo
 * sobre o mapa nem cursor de mira: clicar consulta, e o mapa segue sendo um mapa.
 */
export function createPointQueryTool({ map, runner, store, asDefault = false, onNewQuery = null }) {
  let scope = null;
  const handleClick = (event) => {
    const { lng, lat } = event.lngLat || {};
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    // Cada clique substitui a busca anterior por inteiro, inclusive a geometria
    // de uma consulta por área que ainda estivesse desenhada no mapa.
    onNewQuery?.();
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
      if (!asDefault) {
        const guidance = createGuidance();
        map.getContainer().append(guidance);
        scope.add(() => guidance.remove());
        const canvas = map.getCanvas();
        const previousCursor = canvas.style.cursor;
        canvas.style.cursor = 'crosshair';
        scope.add(() => {
          canvas.style.cursor = previousCursor;
        });
      }
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
