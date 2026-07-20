import RBush from 'rbush';
import bbox from '@turf/bbox';
import { describe, expect, it } from 'vitest';
import { importIntersectionAnalysis } from '../../src/analysis/import-intersection.analysis.js';

function quadrado(id, oeste, sul, lado = 1) {
  return {
    type: 'Feature',
    properties: { photoId: id },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [oeste, sul], [oeste + lado, sul], [oeste + lado, sul + lado],
        [oeste, sul + lado], [oeste, sul]
      ]]
    }
  };
}

function baseDe(features) {
  const spatialIndex = new RBush();
  spatialIndex.load(features.map((f, featureIndex) => {
    const [minX, minY, maxX, maxY] = bbox(f);
    return { minX, minY, maxX, maxY, featureIndex };
  }));
  return { features, spatialIndex };
}

function consulta(...geometries) {
  return {
    type: 'Feature',
    properties: {},
    geometry: geometries.length === 1 && geometries[0].type !== 'GeometryCollection'
      ? geometries[0]
      : { type: 'GeometryCollection', geometries }
  };
}

const data = baseDe([
  quadrado('A', 0, 0),
  quadrado('B', 10, 10),
  quadrado('C', 20, 20)
]);

function ids(matches) {
  return matches.map((f) => f.properties.photoId).sort();
}

describe('consulta por geometria importada', () => {
  it('valida a entrada', () => {
    expect(importIntersectionAnalysis.validate(consulta({ type: 'Point', coordinates: [0.5, 0.5] })).valid).toBe(true);
    expect(importIntersectionAnalysis.validate(null).valid).toBe(false);
    expect(importIntersectionAnalysis.validate({ type: 'Feature', geometry: null }).valid).toBe(false);
    expect(importIntersectionAnalysis.validate(
      { type: 'Feature', geometry: { type: 'GeometryCollection', geometries: [] } }
    ).valid).toBe(false);
  });

  it('encontra por PONTO', () => {
    const r = importIntersectionAnalysis.executeProject({
      geometry: consulta({ type: 'Point', coordinates: [0.5, 0.5] }), data
    });
    expect(ids(r)).toEqual(['A']);
  });

  it('encontra por LINHA que atravessa mais de uma cobertura', () => {
    const r = importIntersectionAnalysis.executeProject({
      geometry: consulta({ type: 'LineString', coordinates: [[0.5, 0.5], [10.5, 10.5]] }), data
    });
    expect(ids(r)).toEqual(['A', 'B']);
  });

  it('encontra por POLIGONO', () => {
    const r = importIntersectionAnalysis.executeProject({
      geometry: consulta({
        type: 'Polygon',
        coordinates: [[[19.5, 19.5], [21.5, 19.5], [21.5, 21.5], [19.5, 21.5], [19.5, 19.5]]]
      }), data
    });
    expect(ids(r)).toEqual(['C']);
  });

  it('soma o resultado de VARIAS geometrias sem repetir cobertura', () => {
    const r = importIntersectionAnalysis.executeProject({
      geometry: consulta(
        { type: 'Point', coordinates: [0.5, 0.5] },
        { type: 'Point', coordinates: [0.6, 0.6] },   // mesma cobertura A
        { type: 'Point', coordinates: [20.5, 20.5] }
      ), data
    });
    expect(ids(r)).toEqual(['A', 'C']);
  });

  it('devolve vazio quando nada intersecta', () => {
    const r = importIntersectionAnalysis.executeProject({
      geometry: consulta({ type: 'Point', coordinates: [50, 50] }), data
    });
    expect(r).toEqual([]);
  });

  it('respeita o cancelamento', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => importIntersectionAnalysis.executeProject({
      geometry: consulta({ type: 'Point', coordinates: [0.5, 0.5] }), data, signal: controller.signal
    })).toThrow(/cancelada/);
  });
});
