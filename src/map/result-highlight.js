const SOURCE_ID = 'query:result-highlight';
const FILL_LAYER_ID = 'query:result-highlight-fill';
const LINE_LAYER_ID = 'query:result-highlight-line';

function emptyCollection() {
  return { type: 'FeatureCollection', features: [] };
}

export function ensureResultHighlightLayers(map) {
  if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: 'geojson', data: emptyCollection() });
  if (!map.getLayer(FILL_LAYER_ID)) {
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: { 'fill-color': '#facc15', 'fill-opacity': 0.38 }
    });
  }
  if (!map.getLayer(LINE_LAYER_ID)) {
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#b91c1c', 'line-width': 4 }
    });
  }
}

export function showResultHighlight(map, result) {
  ensureResultHighlightLayers(map);
  map.getSource(SOURCE_ID).setData(result ? {
    type: 'Feature',
    properties: { key: result.key },
    geometry: structuredClone(result.geometry)
  } : emptyCollection());
}

export function clearResultHighlight(map) {
  if (map.getSource(SOURCE_ID)) map.getSource(SOURCE_ID).setData(emptyCollection());
}
