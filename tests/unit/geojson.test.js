import { describe, expect, it } from 'vitest';
import { normalizeDownloadFilename, normalizeProjectGeoJSON } from '../../src/data/validate-geojson.js';

const project = {
  id: 'projeto-1',
  title: 'Projeto 1',
  extent: [-48, -16, -47, -15]
};

function feature(overrides = {}) {
  return {
    type: 'Feature',
    id: 'foto-1',
    properties: {
      photoId: 'foto-1',
      photoNumber: '001',
      title: 'Foto 1',
      thumbnailUrl: './thumb.svg',
      downloadUrl: './foto.svg',
      downloadFilename: 'foto.svg',
      ...overrides.properties
    },
    geometry: overrides.geometry || {
      type: 'Polygon',
      coordinates: [[[-48, -16], [-47, -16], [-47, -15], [-48, -15], [-48, -16]]]
    }
  };
}

describe('normalizeProjectGeoJSON', () => {
  it('normaliza propriedades, URLs e índice espacial', () => {
    const result = normalizeProjectGeoJSON(
      { type: 'FeatureCollection', features: [feature()] },
      project,
      new URL('https://example.gov.br/data/footprints.geojson')
    );

    expect(result.features[0].id).toBe('projeto-1:foto-1');
    expect(result.features[0].properties.thumbnailUrl).toBe('https://example.gov.br/data/thumb.svg');
    expect(result.spatialIndex.search({ minX: -47.5, minY: -15.5, maxX: -47.5, maxY: -15.5 })).toHaveLength(1);
  });

  it('aceita MultiPolygon', () => {
    const multi = feature({
      geometry: {
        type: 'MultiPolygon',
        coordinates: [[[[-48, -16], [-47, -16], [-47, -15], [-48, -15], [-48, -16]]]]
      }
    });
    const result = normalizeProjectGeoJSON(
      { type: 'FeatureCollection', features: [multi] },
      project,
      'https://example.gov.br/data.geojson'
    );
    expect(result.features[0].geometry.type).toBe('MultiPolygon');
  });

  it('rejeita anel aberto', () => {
    const invalid = feature({
      geometry: {
        type: 'Polygon',
        coordinates: [[[-48, -16], [-47, -16], [-47, -15], [-48, -15]]]
      }
    });
    expect(() =>
      normalizeProjectGeoJSON(
        { type: 'FeatureCollection', features: [invalid] },
        project,
        'https://example.gov.br/data.geojson'
      )
    ).toThrow(/fechado/);
  });

  it('rejeita photoId duplicado', () => {
    expect(() =>
      normalizeProjectGeoJSON(
        { type: 'FeatureCollection', features: [feature(), feature()] },
        project,
        'https://example.gov.br/data.geojson'
      )
    ).toThrow(/duplicado/);
  });
});

describe('normalizeDownloadFilename', () => {
  it.each(['../foto.tif', 'pasta/foto.tif', 'pasta\\foto.tif'])(
    'rejeita caminho no nome: %s',
    (filename) => expect(() => normalizeDownloadFilename(filename)).toThrow()
  );
});

