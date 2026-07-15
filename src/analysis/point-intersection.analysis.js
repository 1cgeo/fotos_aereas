import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

function isValidPoint(feature) {
  const coordinates = feature?.geometry?.coordinates;
  return feature?.type === 'Feature' &&
    feature.geometry?.type === 'Point' &&
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    Number.isFinite(coordinates[0]) &&
    Number.isFinite(coordinates[1]);
}

export const pointIntersectionAnalysis = Object.freeze({
  id: 'point-intersection',
  inputGeometryTypes: ['Point'],
  validate(input) {
    return isValidPoint(input)
      ? { valid: true }
      : { valid: false, message: 'A consulta por ponto requer um Point GeoJSON válido.' };
  },
  executeProject({ geometry, data, signal }) {
    if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    const [x, y] = geometry.geometry.coordinates;
    const candidates = data.spatialIndex.search({ minX: x, minY: y, maxX: x, maxY: y });
    const matches = [];
    for (const candidate of candidates) {
      if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      const feature = data.features[candidate.featureIndex];
      if (booleanPointInPolygon(geometry, feature, { ignoreBoundary: false })) matches.push(feature);
    }
    return matches;
  }
});

