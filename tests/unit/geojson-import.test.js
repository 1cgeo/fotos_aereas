import { describe, expect, it } from 'vitest';
import { lerGeoJSON, paraFeatureDeConsulta, resumoDoImport } from '../../src/tools/import-query/geojson-import.js';

const ponto = { type: 'Point', coordinates: [-51.9, -29.9] };
const linha = { type: 'LineString', coordinates: [[-52, -30], [-51, -29]] };
const poligono = {
  type: 'Polygon',
  coordinates: [[[-52, -30], [-51, -30], [-51, -29], [-52, -29], [-52, -30]]]
};

function feature(geometry) {
  return { type: 'Feature', properties: {}, geometry };
}

describe('lerGeoJSON', () => {
  it('aceita geometria nua, Feature e FeatureCollection', () => {
    expect(lerGeoJSON(JSON.stringify(poligono)).geometrias).toHaveLength(1);
    expect(lerGeoJSON(JSON.stringify(feature(poligono))).geometrias).toHaveLength(1);
    expect(lerGeoJSON(JSON.stringify({
      type: 'FeatureCollection', features: [feature(ponto), feature(linha)]
    })).geometrias).toHaveLength(2);
  });

  it('aceita ponto, linha e poligono no mesmo arquivo', () => {
    const { geometrias } = lerGeoJSON(JSON.stringify({
      type: 'FeatureCollection',
      features: [feature(ponto), feature(linha), feature(poligono)]
    }));
    expect(geometrias.map((g) => g.type)).toEqual(['Point', 'LineString', 'Polygon']);
  });

  it('achata GeometryCollection aninhada', () => {
    const { geometrias } = lerGeoJSON(JSON.stringify(feature({
      type: 'GeometryCollection',
      geometries: [ponto, { type: 'GeometryCollection', geometries: [linha, poligono] }]
    })));
    expect(geometrias).toHaveLength(3);
  });

  it('IGNORA com aviso o que nao serve, em vez de calar', () => {
    const { geometrias, avisos } = lerGeoJSON(JSON.stringify({
      type: 'FeatureCollection',
      features: [
        feature(poligono),
        feature({ type: 'Point', coordinates: [-400, 900] }),
        feature({ type: 'Sarcofago', coordinates: [1, 2] }),
        feature({ type: 'Point', coordinates: [] })
      ]
    }));
    expect(geometrias).toHaveLength(1);
    expect(avisos.join(' ')).toMatch(/fora do intervalo/);
    expect(avisos.join(' ')).toMatch(/Sarcofago/);
    expect(avisos.join(' ')).toMatch(/sem coordenadas/);
  });

  it.each([
    ['', /vazio/],
    ['   ', /vazio/],
    ['isto nao e json', /não é um JSON válido/],
    [JSON.stringify({ type: 'FeatureCollection', features: [] }), /Nenhuma geometria utilizável/],
    [JSON.stringify({ type: 'Feature', geometry: null }), /Nenhuma geometria utilizável/]
  ])('rejeita entrada invalida (%s)', (texto, esperado) => {
    expect(() => lerGeoJSON(texto)).toThrow(esperado);
  });

  it('rejeita arquivo acima do limite de tamanho', () => {
    expect(() => lerGeoJSON(JSON.stringify(poligono), { maxBytes: 10 })).toThrow(/excede o limite/);
  });

  it('conta os vertices de todas as geometrias', () => {
    const { totalVertices } = lerGeoJSON(JSON.stringify({
      type: 'FeatureCollection', features: [feature(ponto), feature(linha)]
    }));
    expect(totalVertices).toBe(3);
  });
});

describe('resumoDoImport', () => {
  it('descreve por tipo, no singular e no plural', () => {
    expect(resumoDoImport([ponto])).toBe('1 ponto');
    expect(resumoDoImport([ponto, ponto, linha])).toBe('2 pontos, 1 linha');
    expect(resumoDoImport([poligono, poligono])).toBe('2 polígonos');
  });
});

describe('paraFeatureDeConsulta', () => {
  it('devolve Feature com GeometryCollection', () => {
    const f = paraFeatureDeConsulta([ponto, poligono]);
    expect(f.type).toBe('Feature');
    expect(f.geometry.type).toBe('GeometryCollection');
    expect(f.geometry.geometries).toHaveLength(2);
  });
});
