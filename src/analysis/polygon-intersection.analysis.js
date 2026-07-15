import bbox from '@turf/bbox';
import booleanIntersects from '@turf/boolean-intersects';
import { validatePolygonVertices } from '../tools/polygon-query/polygon-geometry.js';

function validate(feature) {
  if (feature?.type !== 'Feature' || feature.geometry?.type !== 'Polygon') {
    return { valid: false, message: 'A consulta por área requer um Polygon GeoJSON válido.' };
  }
  const ring = feature.geometry.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 4) return { valid: false, message: 'Polígono incompleto.' };
  return validatePolygonVertices(ring.slice(0, -1));
}

export const polygonIntersectionAnalysis = Object.freeze({
  id: 'polygon-intersection',
  inputGeometryTypes: ['Polygon'],
  validate,
  executeProject({ geometry, data, signal }) {
    if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    const [minX, minY, maxX, maxY] = bbox(geometry);
    const candidates = data.spatialIndex.search({ minX, minY, maxX, maxY });
    const matches = [];
    for (const candidate of candidates) {
      if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      const feature = data.features[candidate.featureIndex];
      if (booleanIntersects(geometry, feature)) matches.push(feature);
    }
    return matches;
  }
});
