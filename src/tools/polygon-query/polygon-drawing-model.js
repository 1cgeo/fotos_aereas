import { canAppendVertex, toPolygonFeature, validatePolygonVertices } from './polygon-geometry.js';

export function createPolygonDrawingModel() {
  let state = 'ready';
  let vertices = [];
  let editSnapshot = null;

  return Object.freeze({
    get state() {
      return state;
    },
    get vertices() {
      return vertices.map((vertex) => [...vertex]);
    },
    add(coordinate) {
      if (state === 'complete' || state === 'editing') return { valid: false, message: 'Conclua a edição atual.' };
      const validation = canAppendVertex(vertices, coordinate);
      if (!validation.valid) return validation;
      vertices = [...vertices, [coordinate[0], coordinate[1]]];
      state = 'drawing';
      return { valid: true };
    },
    undo() {
      if (state !== 'drawing' || vertices.length === 0) return false;
      vertices = vertices.slice(0, -1);
      if (vertices.length === 0) state = 'ready';
      return true;
    },
    finish() {
      const validation = validatePolygonVertices(vertices);
      if (!validation.valid) return validation;
      state = 'complete';
      return { valid: true, feature: toPolygonFeature(vertices) };
    },
    beginEdit() {
      if (state !== 'complete') return false;
      editSnapshot = vertices.map((vertex) => [...vertex]);
      state = 'editing';
      return true;
    },
    moveVertex(index, coordinate) {
      if (state !== 'editing' || !vertices[index]) return false;
      vertices = vertices.map((vertex, current) => current === index ? [coordinate[0], coordinate[1]] : vertex);
      return true;
    },
    commitEdit() {
      if (state !== 'editing') return { valid: false, message: 'Nenhuma edição ativa.' };
      const validation = validatePolygonVertices(vertices);
      if (!validation.valid) {
        vertices = editSnapshot;
        editSnapshot = null;
        state = 'complete';
        return { ...validation, reverted: true };
      }
      editSnapshot = null;
      state = 'complete';
      return { valid: true, feature: toPolygonFeature(vertices) };
    },
    cancelEdit() {
      if (state !== 'editing') return false;
      vertices = editSnapshot;
      editSnapshot = null;
      state = 'complete';
      return true;
    },
    clear() {
      vertices = [];
      editSnapshot = null;
      state = 'ready';
    },
    feature() {
      return state === 'complete' ? toPolygonFeature(vertices) : null;
    }
  });
}
