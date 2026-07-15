import RBush from 'rbush';
import { describe, expect, it } from 'vitest';
import { polygonIntersectionAnalysis } from '../../src/analysis/polygon-intersection.analysis.js';

function polygon(id, minX, minY, maxX, maxY) {
  return {
    type: 'Feature',
    properties: { photoId: id },
    geometry: {
      type: 'Polygon',
      coordinates: [[[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY], [minX, minY]]]
    }
  };
}

function indexed(features) {
  const spatialIndex = new RBush();
  spatialIndex.load(features.map((feature, featureIndex) => {
    const ring = feature.geometry.coordinates[0];
    const xs = ring.map((item) => item[0]);
    const ys = ring.map((item) => item[1]);
    return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys), featureIndex };
  }));
  return { features, spatialIndex };
}

describe('análise de interseção por polígono', () => {
  it('filtra candidatos do índice com interseção geométrica exata', () => {
    const data = indexed([polygon('A', 0, 0, 2, 2), polygon('B', 4, 4, 5, 5)]);
    const query = polygon('consulta', 1, 1, 3, 3);
    const result = polygonIntersectionAnalysis.executeProject({ geometry: query, data });
    expect(result.map((feature) => feature.properties.photoId)).toEqual(['A']);
  });

  it('considera contato na borda como interseção', () => {
    const data = indexed([polygon('A', 0, 0, 1, 1)]);
    const result = polygonIntersectionAnalysis.executeProject({
      geometry: polygon('consulta', 1, 0, 2, 1),
      data
    });
    expect(result).toHaveLength(1);
  });

  it('valida a entrada e respeita cancelamento', () => {
    expect(polygonIntersectionAnalysis.validate({ type: 'Feature', geometry: { type: 'Point' } }).valid).toBe(false);
    const controller = new AbortController();
    controller.abort();
    expect(() => polygonIntersectionAnalysis.executeProject({
      geometry: polygon('consulta', 0, 0, 1, 1),
      data: indexed([]),
      signal: controller.signal
    })).toThrow(/cancelada/);
  });
});
