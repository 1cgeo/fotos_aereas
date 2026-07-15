import { describe, expect, it } from 'vitest';
import { pointIntersectionAnalysis } from '../../src/analysis/point-intersection.analysis.js';

const polygon = {
  type: 'Feature',
  properties: { photoId: 'foto-1' },
  geometry: {
    type: 'Polygon',
    coordinates: [[[-48, -16], [-47, -16], [-47, -15], [-48, -15], [-48, -16]]]
  }
};

function point(coordinates) {
  return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates } };
}

describe('pointIntersectionAnalysis', () => {
  const data = {
    features: [polygon],
    spatialIndex: { search: () => [{ featureIndex: 0 }] }
  };

  it('inclui ponto interno e na borda', () => {
    expect(pointIntersectionAnalysis.executeProject({ geometry: point([-47.5, -15.5]), data })).toHaveLength(1);
    expect(pointIntersectionAnalysis.executeProject({ geometry: point([-48, -15.5]), data })).toHaveLength(1);
  });

  it('remove falso positivo da caixa envolvente', () => {
    expect(pointIntersectionAnalysis.executeProject({ geometry: point([-49, -15.5]), data })).toHaveLength(0);
  });

  it('valida a geometria de entrada', () => {
    expect(pointIntersectionAnalysis.validate(point([-47.5, -15.5])).valid).toBe(true);
    expect(pointIntersectionAnalysis.validate({ type: 'Feature', geometry: { type: 'LineString' } }).valid).toBe(false);
  });
});

