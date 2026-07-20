import { HIGHLIGHT_FILL_LAYER_ID } from './result-highlight.js';

const SOURCE_ID = 'query:results';
const FILL_LAYER_ID = 'query:results-fill';
const LINE_LAYER_ID = 'query:results-line';

function emptyCollection() {
  return { type: 'FeatureCollection', features: [] };
}

// As coberturas que responderam à consulta ganham camada PRÓPRIA, alimentada
// somente com as feições retornadas. Antes, revelar um projeto atingido ligava a
// camada inteira dele, e o mapa passava a exibir todos os footprints do voo em
// vez dos que de fato intersectaram.
export function ensureQueryResultLayers(map) {
  if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: 'geojson', data: emptyCollection() });

  // Entram ABAIXO do realce individual, para que o item focado continue por cima.
  const beforeId = map.getLayer(HIGHLIGHT_FILL_LAYER_ID) ? HIGHLIGHT_FILL_LAYER_ID : undefined;

  if (!map.getLayer(FILL_LAYER_ID)) {
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.2
      }
    }, beforeId);
  }
  if (!map.getLayer(LINE_LAYER_ID)) {
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': ['get', 'color'],
        'line-opacity': 0.95,
        'line-width': 2
      }
    }, beforeId);
  }
}

export function showQueryResults(map, results, colorByProjectId) {
  ensureQueryResultLayers(map);
  const features = results.map((result) => ({
    type: 'Feature',
    properties: {
      key: result.key,
      projectId: result.projectId,
      color: colorByProjectId.get(result.projectId) || '#2563eb'
    },
    geometry: result.geometry
  }));
  map.getSource(SOURCE_ID).setData({ type: 'FeatureCollection', features });
}

export function clearQueryResults(map) {
  if (map.getSource(SOURCE_ID)) map.getSource(SOURCE_ID).setData(emptyCollection());
}

export function getQueryResultLayerIds() {
  return { source: SOURCE_ID, fill: FILL_LAYER_ID, line: LINE_LAYER_ID };
}
