import bbox from '@turf/bbox';
import booleanIntersects from '@turf/boolean-intersects';

// Consulta por geometria IMPORTADA: aceita ponto, linha e polígono, e mais de uma
// ao mesmo tempo. Uma cobertura entra no resultado se intersectar QUALQUER uma
// das geometrias trazidas, e entra uma vez só.
//
// Fica separada das análises de ponto e de área porque o filtro pelo índice
// espacial precisa ser feito por geometria, e não pela caixa envolvente do
// conjunto: com duas áreas distantes, a caixa do conjunto cobriria todo o vazio
// entre elas e o índice deixaria de filtrar.

function geometriasDe(feature) {
  const g = feature?.geometry;
  if (!g) return [];
  return g.type === 'GeometryCollection' ? (g.geometries || []) : [g];
}

function validate(feature) {
  const geometrias = geometriasDe(feature);
  if (feature?.type !== 'Feature' || geometrias.length === 0) {
    return { valid: false, message: 'A consulta por arquivo requer ao menos uma geometria.' };
  }
  return { valid: true };
}

export const importIntersectionAnalysis = Object.freeze({
  id: 'import-intersection',
  inputGeometryTypes: ['GeometryCollection'],
  validate,
  executeProject({ geometry, data, signal }) {
    if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
    const geometrias = geometriasDe(geometry);
    const encontrados = new Set();
    const matches = [];

    for (const g of geometrias) {
      if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      const alvo = { type: 'Feature', properties: {}, geometry: g };
      const [minX, minY, maxX, maxY] = bbox(alvo);
      for (const candidate of data.spatialIndex.search({ minX, minY, maxX, maxY })) {
        if (encontrados.has(candidate.featureIndex)) continue;
        const feature = data.features[candidate.featureIndex];
        if (booleanIntersects(alvo, feature)) {
          encontrados.add(candidate.featureIndex);
          matches.push(feature);
        }
      }
    }
    return matches;
  }
});
