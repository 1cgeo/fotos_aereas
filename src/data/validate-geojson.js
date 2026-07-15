import bbox from '@turf/bbox';
import RBush from 'rbush';
import { resolvePublicUrl } from '../security/urls.js';

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DEFAULT_LIMITS = Object.freeze({
  maxFeatures: 100_000,
  maxVerticesPerFeature: 20_000,
  maxTextLength: 2_000
});

function requiredText(value, field, maxLength = DEFAULT_LIMITS.maxTextLength) {
  if (typeof value !== 'string' || value.trim() === '') throw new TypeError(`${field} é obrigatório.`);
  if (value.length > maxLength) throw new RangeError(`${field} excede ${maxLength} caracteres.`);
  return value.trim();
}

function optionalText(value, field, maxLength = DEFAULT_LIMITS.maxTextLength) {
  if (value === undefined || value === null || value === '') return null;
  return requiredText(String(value), field, maxLength);
}

function validatePosition(position, context) {
  if (!Array.isArray(position) || position.length < 2) throw new TypeError(`${context} não é uma posição válida.`);
  const [lng, lat] = position;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new TypeError(`${context} possui coordenada não finita.`);
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) throw new RangeError(`${context} está fora de EPSG:4326.`);
}

function positionsEqual(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function validateRing(ring, context, vertexCounter) {
  if (!Array.isArray(ring) || ring.length < 4) throw new TypeError(`${context} precisa de ao menos quatro posições.`);
  if (!positionsEqual(ring[0], ring[ring.length - 1])) throw new Error(`${context} deve estar fechado.`);
  for (let index = 0; index < ring.length; index += 1) {
    validatePosition(ring[index], `${context}[${index}]`);
    vertexCounter.count += 1;
  }
}

function validateGeometry(geometry, featureIndex, limits) {
  if (!geometry || typeof geometry !== 'object') throw new TypeError(`features[${featureIndex}].geometry é inválida.`);
  const counter = { count: 0 };

  if (geometry.type === 'Polygon') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
      throw new TypeError(`features[${featureIndex}] não possui anéis.`);
    }
    geometry.coordinates.forEach((ring, ringIndex) =>
      validateRing(ring, `features[${featureIndex}].coordinates[${ringIndex}]`, counter)
    );
  } else if (geometry.type === 'MultiPolygon') {
    if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length === 0) {
      throw new TypeError(`features[${featureIndex}] não possui polígonos.`);
    }
    geometry.coordinates.forEach((polygon, polygonIndex) => {
      if (!Array.isArray(polygon) || polygon.length === 0) throw new TypeError(`MultiPolygon vazio em features[${featureIndex}].`);
      polygon.forEach((ring, ringIndex) =>
        validateRing(ring, `features[${featureIndex}].coordinates[${polygonIndex}][${ringIndex}]`, counter)
      );
    });
  } else {
    throw new TypeError(`Geometria não suportada em features[${featureIndex}]: ${geometry.type}.`);
  }

  if (counter.count > limits.maxVerticesPerFeature) {
    throw new RangeError(`features[${featureIndex}] excede o limite de vértices.`);
  }
}

export function normalizeDownloadFilename(value, field = 'downloadFilename') {
  const filename = requiredText(value, field, 180);
  if (filename === '.' || filename === '..' || filename.includes('/') || filename.includes('\\')) {
    throw new Error(`${field} contém caminho inválido.`);
  }
  const hasControl = [...filename].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (hasControl) throw new Error(`${field} contém caractere de controle.`);
  return filename;
}

function normalizeFeature(feature, featureIndex, project, geoJsonUrl, ids, limits) {
  if (!feature || feature.type !== 'Feature') throw new TypeError(`features[${featureIndex}] deve ser uma Feature.`);
  validateGeometry(feature.geometry, featureIndex, limits);
  const properties = feature.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    throw new TypeError(`features[${featureIndex}].properties deve ser um objeto.`);
  }

  const photoId = requiredText(properties.photoId, `features[${featureIndex}].photoId`, 120);
  if (DANGEROUS_KEYS.has(photoId)) throw new Error(`photoId reservado: ${photoId}.`);
  if (ids.has(photoId)) throw new Error(`photoId duplicado no projeto ${project.id}: ${photoId}.`);
  ids.add(photoId);

  const normalized = {
    type: 'Feature',
    id: `${project.id}:${photoId}`,
    properties: {
      projectId: project.id,
      photoId,
      photoNumber: requiredText(properties.photoNumber, `features[${featureIndex}].photoNumber`, 80),
      title: requiredText(properties.title, `features[${featureIndex}].title`, 160),
      flightLine: optionalText(properties.flightLine, `features[${featureIndex}].flightLine`, 80),
      capturedAt: optionalText(properties.capturedAt, `features[${featureIndex}].capturedAt`, 40),
      nominalScale: optionalText(properties.nominalScale, `features[${featureIndex}].nominalScale`, 80),
      thumbnailUrl: resolvePublicUrl(properties.thumbnailUrl, geoJsonUrl, 'thumbnail').href,
      downloadUrl: resolvePublicUrl(properties.downloadUrl, geoJsonUrl, 'download').href,
      downloadFilename: normalizeDownloadFilename(properties.downloadFilename, `features[${featureIndex}].downloadFilename`),
      mimeType: optionalText(properties.mimeType, `features[${featureIndex}].mimeType`, 100),
      sizeBytes: Number.isFinite(properties.sizeBytes) && properties.sizeBytes >= 0 ? properties.sizeBytes : null,
      checksumSha256: optionalText(properties.checksumSha256, `features[${featureIndex}].checksumSha256`, 64),
      licenseLabel: optionalText(properties.licenseLabel, `features[${featureIndex}].licenseLabel`, 200),
      notes: optionalText(properties.notes, `features[${featureIndex}].notes`, limits.maxTextLength)
    },
    geometry: structuredClone(feature.geometry)
  };

  return normalized;
}

export function normalizeProjectGeoJSON(raw, project, geoJsonUrl, customLimits = {}) {
  const limits = { ...DEFAULT_LIMITS, ...customLimits };
  if (!raw || raw.type !== 'FeatureCollection' || !Array.isArray(raw.features)) {
    throw new TypeError(`O GeoJSON do projeto ${project.id} deve ser uma FeatureCollection.`);
  }
  if (raw.features.length > limits.maxFeatures) throw new RangeError(`O projeto ${project.id} excede o limite de feições.`);

  const ids = new Set();
  const features = raw.features.map((feature, index) =>
    normalizeFeature(feature, index, project, geoJsonUrl, ids, limits)
  );
  const collection = { type: 'FeatureCollection', features };
  const spatialIndex = new RBush();
  const indexItems = features.map((feature, featureIndex) => {
    const [minX, minY, maxX, maxY] = bbox(feature);
    return { minX, minY, maxX, maxY, featureIndex };
  });
  spatialIndex.load(indexItems);

  return Object.freeze({
    projectId: project.id,
    collection,
    features,
    spatialIndex,
    extent: features.length > 0 ? bbox(collection) : project.extent
  });
}

