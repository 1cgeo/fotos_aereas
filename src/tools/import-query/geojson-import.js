// Lê um GeoJSON qualquer trazido pelo usuário e o reduz a uma lista plana de
// geometrias utilizáveis como área de consulta.
//
// O arquivo vem de fora, então nada aqui confia nele: tamanho, estrutura, tipos e
// cada coordenada são conferidos. O que não serve é DESCARTADO com aviso, e não
// silenciosamente: o usuário precisa saber que parte do arquivo dele não entrou.

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_GEOMETRIAS = 2_000;
const MAX_VERTICES = 100_000;

const TIPOS_ACEITOS = new Set([
  'Point', 'MultiPoint',
  'LineString', 'MultiLineString',
  'Polygon', 'MultiPolygon'
]);

function coordenadaValida(v) {
  return Array.isArray(v) && v.length >= 2 &&
    Number.isFinite(v[0]) && Number.isFinite(v[1]) &&
    v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
}

function contaEValidaCoordenadas(coords, estado) {
  if (Array.isArray(coords) && coords.length > 0 && typeof coords[0] === 'number') {
    estado.vertices += 1;
    if (!coordenadaValida(coords)) estado.invalida = true;
    return;
  }
  if (!Array.isArray(coords)) {
    estado.invalida = true;
    return;
  }
  for (const filho of coords) contaEValidaCoordenadas(filho, estado);
}

function extrai(no, saida, avisos, profundidade = 0) {
  if (!no || typeof no !== 'object' || profundidade > 8) return;

  if (no.type === 'FeatureCollection') {
    if (!Array.isArray(no.features)) {
      avisos.add('FeatureCollection sem lista de feições.');
      return;
    }
    for (const f of no.features) extrai(f, saida, avisos, profundidade + 1);
    return;
  }
  if (no.type === 'Feature') {
    extrai(no.geometry, saida, avisos, profundidade + 1);
    return;
  }
  if (no.type === 'GeometryCollection') {
    if (!Array.isArray(no.geometries)) {
      avisos.add('GeometryCollection sem lista de geometrias.');
      return;
    }
    for (const g of no.geometries) extrai(g, saida, avisos, profundidade + 1);
    return;
  }
  if (typeof no.type !== 'string') return;

  if (!TIPOS_ACEITOS.has(no.type)) {
    avisos.add(`Geometria do tipo ${no.type} ignorada.`);
    return;
  }
  const estado = { vertices: 0, invalida: false };
  contaEValidaCoordenadas(no.coordinates, estado);
  if (estado.vertices === 0) {
    avisos.add('Geometria sem coordenadas ignorada.');
    return;
  }
  if (estado.invalida) {
    avisos.add('Geometria com coordenada fora do intervalo de longitude e latitude ignorada.');
    return;
  }
  saida.push({ type: no.type, coordinates: no.coordinates, vertices: estado.vertices });
}

/**
 * @returns {{ geometrias: object[], avisos: string[], totalVertices: number }}
 * @throws {Error} quando o arquivo inteiro é inutilizável
 */
export function lerGeoJSON(texto, { maxBytes = MAX_BYTES } = {}) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new Error('O arquivo está vazio.');
  }
  const bytes = new TextEncoder().encode(texto).byteLength;
  if (bytes > maxBytes) {
    throw new RangeError(`O arquivo tem ${(bytes / 1048576).toFixed(1)} MB e excede o limite de ${(maxBytes / 1048576).toFixed(0)} MB.`);
  }

  let bruto;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }

  const geometrias = [];
  const avisos = new Set();
  extrai(bruto, geometrias, avisos);

  if (geometrias.length === 0) {
    throw new Error('Nenhuma geometria utilizável foi encontrada. São aceitos pontos, linhas e polígonos.');
  }
  if (geometrias.length > MAX_GEOMETRIAS) {
    throw new RangeError(`O arquivo traz ${geometrias.length} geometrias e o limite é ${MAX_GEOMETRIAS}.`);
  }
  const totalVertices = geometrias.reduce((soma, g) => soma + g.vertices, 0);
  if (totalVertices > MAX_VERTICES) {
    throw new RangeError(`O arquivo traz ${totalVertices} vértices e o limite é ${MAX_VERTICES}.`);
  }

  return {
    geometrias: geometrias.map(({ type, coordinates }) => ({ type, coordinates })),
    avisos: [...avisos],
    totalVertices
  };
}

/** Resumo legível do que entrou, por tipo, para a interface anunciar. */
export function resumoDoImport(geometrias) {
  const rotulos = {
    Point: ['ponto', 'pontos'],
    MultiPoint: ['ponto', 'pontos'],
    LineString: ['linha', 'linhas'],
    MultiLineString: ['linha', 'linhas'],
    Polygon: ['polígono', 'polígonos'],
    MultiPolygon: ['polígono', 'polígonos']
  };
  const contagem = new Map();
  for (const g of geometrias) {
    const chave = rotulos[g.type] ? rotulos[g.type][0] : 'geometria';
    contagem.set(chave, (contagem.get(chave) || 0) + 1);
  }
  const ordem = ['ponto', 'linha', 'polígono', 'geometria'];
  return [...contagem.entries()]
    .sort((a, b) => ordem.indexOf(a[0]) - ordem.indexOf(b[0]))
    .map(([chave, n]) => {
      const par = Object.values(rotulos).find((p) => p[0] === chave) || ['geometria', 'geometrias'];
      return `${n} ${n === 1 ? par[0] : par[1]}`;
    })
    .join(', ');
}

/** Feature única que representa a consulta inteira, para o estado e o relatório. */
export function paraFeatureDeConsulta(geometrias) {
  return {
    type: 'Feature',
    properties: { origem: 'importado', total: geometrias.length },
    geometry: { type: 'GeometryCollection', geometries: geometrias.map((g) => ({ ...g })) }
  };
}
