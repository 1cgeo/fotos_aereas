import { describe, expect, it } from 'vitest';
import {
  canAppendVertex,
  drawingFeatureCollection,
  hasSelfIntersection,
  segmentsIntersect,
  toPolygonFeature,
  validatePolygonVertices
} from '../../src/tools/polygon-query/polygon-geometry.js';

describe('geometria poligonal', () => {
  it('detecta interseção entre segmentos', () => {
    expect(segmentsIntersect([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true);
    expect(segmentsIntersect([0, 0], [1, 0], [2, 0], [3, 0])).toBe(false);
  });

  it('rejeita polígono auto-intersectante', () => {
    const bowTie = [[0, 0], [2, 2], [0, 2], [2, 0]];
    expect(hasSelfIntersection(bowTie)).toBe(true);
    expect(validatePolygonVertices(bowTie)).toMatchObject({ valid: false });
  });

  it('aceita polígono simples e fecha apenas a representação GeoJSON', () => {
    const vertices = [[-48, -16], [-47, -16], [-47, -15]];
    expect(validatePolygonVertices(vertices)).toEqual({ valid: true });
    const feature = toPolygonFeature(vertices);
    expect(feature.geometry.coordinates[0]).toHaveLength(4);
    expect(feature.geometry.coordinates[0][0]).toEqual(feature.geometry.coordinates[0][3]);
    expect(vertices).toHaveLength(3);
  });

  it('rejeita vértice duplicado e novo segmento que cruza o traçado', () => {
    const vertices = [[0, 0], [2, 2], [0, 2]];
    expect(canAppendVertex(vertices, [2, 2]).valid).toBe(false);
    expect(canAppendVertex(vertices, [2, 0])).toMatchObject({ valid: false });
  });

  it('produz feições separadas para estilo e edição', () => {
    const collection = drawingFeatureCollection([[0, 0], [1, 0], [1, 1]], null, true);
    expect(collection.features.filter((feature) => feature.properties.kind === 'vertex')).toHaveLength(3);
    expect(collection.features.some((feature) => feature.properties.kind === 'polygon')).toBe(true);
  });
});
