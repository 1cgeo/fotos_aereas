const EPSILON = 1e-10;

function isCoordinate(value) {
  return Array.isArray(value) && value.length >= 2 &&
    Number.isFinite(value[0]) && Number.isFinite(value[1]) &&
    value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
}

function samePoint(a, b) {
  return Math.abs(a[0] - b[0]) <= EPSILON && Math.abs(a[1] - b[1]) <= EPSILON;
}

function orientation(a, b, c) {
  const value = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(value) <= EPSILON) return 0;
  return value > 0 ? 1 : -1;
}

function onSegment(a, b, point) {
  return point[0] >= Math.min(a[0], b[0]) - EPSILON &&
    point[0] <= Math.max(a[0], b[0]) + EPSILON &&
    point[1] >= Math.min(a[1], b[1]) - EPSILON &&
    point[1] <= Math.max(a[1], b[1]) + EPSILON;
}

export function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  return (o1 === 0 && onSegment(a, b, c)) ||
    (o2 === 0 && onSegment(a, b, d)) ||
    (o3 === 0 && onSegment(c, d, a)) ||
    (o4 === 0 && onSegment(c, d, b));
}

export function hasSelfIntersection(vertices) {
  const count = vertices.length;
  if (count < 4) return false;
  for (let first = 0; first < count; first += 1) {
    const firstNext = (first + 1) % count;
    for (let second = first + 1; second < count; second += 1) {
      const secondNext = (second + 1) % count;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (first === 0 && secondNext === 0) continue;
      if (segmentsIntersect(vertices[first], vertices[firstNext], vertices[second], vertices[secondNext])) {
        return true;
      }
    }
  }
  return false;
}

export function signedArea(vertices) {
  return vertices.reduce((sum, vertex, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return sum + vertex[0] * next[1] - next[0] * vertex[1];
  }, 0) / 2;
}

export function validatePolygonVertices(vertices) {
  if (!Array.isArray(vertices) || vertices.length < 3) {
    return { valid: false, message: 'Desenhe pelo menos três vértices.' };
  }
  if (!vertices.every(isCoordinate)) {
    return { valid: false, message: 'O desenho possui coordenadas inválidas.' };
  }
  for (let index = 0; index < vertices.length; index += 1) {
    if (samePoint(vertices[index], vertices[(index + 1) % vertices.length])) {
      return { valid: false, message: 'O desenho possui vértices repetidos.' };
    }
  }
  if (Math.abs(signedArea(vertices)) <= EPSILON) {
    return { valid: false, message: 'A área desenhada é muito pequena.' };
  }
  if (hasSelfIntersection(vertices)) {
    return { valid: false, message: 'As bordas do polígono não podem se cruzar.' };
  }
  return { valid: true };
}

export function canAppendVertex(vertices, coordinate) {
  if (!isCoordinate(coordinate)) return { valid: false, message: 'Coordenada inválida.' };
  if (vertices.some((vertex) => samePoint(vertex, coordinate))) {
    return { valid: false, message: 'Este vértice já existe.' };
  }
  if (vertices.length < 2) return { valid: true };
  const start = vertices.at(-1);
  for (let index = 0; index < vertices.length - 2; index += 1) {
    if (segmentsIntersect(start, coordinate, vertices[index], vertices[index + 1])) {
      return { valid: false, message: 'O novo segmento cruza uma borda existente.' };
    }
  }
  return { valid: true };
}

export function toPolygonFeature(vertices, properties = {}) {
  const coordinates = vertices.map((vertex) => [...vertex]);
  if (coordinates.length > 0) coordinates.push([...coordinates[0]]);
  return {
    type: 'Feature',
    properties: { ...properties },
    geometry: { type: 'Polygon', coordinates: [coordinates] }
  };
}

export function drawingFeatureCollection(vertices, preview = null, complete = false) {
  const features = [];
  if (vertices.length >= 3 && complete) {
    features.push(toPolygonFeature(vertices, { kind: 'polygon' }));
  }
  const lineCoordinates = preview && !complete ? [...vertices, preview] : vertices;
  if (lineCoordinates.length >= 2) {
    features.push({
      type: 'Feature',
      properties: { kind: 'line' },
      geometry: { type: 'LineString', coordinates: lineCoordinates.map((item) => [...item]) }
    });
  }
  vertices.forEach((coordinate, index) => {
    features.push({
      type: 'Feature',
      properties: { kind: 'vertex', index, first: index === 0 },
      geometry: { type: 'Point', coordinates: [...coordinate] }
    });
  });
  return { type: 'FeatureCollection', features };
}
