import { describe, expect, it } from 'vitest';
import { createPolygonDrawingModel } from '../../src/tools/polygon-query/polygon-drawing-model.js';

function completeTriangle(model) {
  model.add([0, 0]);
  model.add([2, 0]);
  model.add([1, 1]);
  return model.finish();
}

describe('modelo de desenho poligonal', () => {
  it('desenha, desfaz e conclui uma área', () => {
    const model = createPolygonDrawingModel();
    model.add([0, 0]);
    model.add([2, 0]);
    model.add([1, 1]);
    expect(model.state).toBe('drawing');
    expect(model.undo()).toBe(true);
    expect(model.finish().valid).toBe(false);
    model.add([1, 1]);
    expect(model.finish()).toMatchObject({ valid: true });
    expect(model.state).toBe('complete');
  });

  it('reverte uma edição que torna o polígono inválido', () => {
    const model = createPolygonDrawingModel();
    completeTriangle(model);
    const original = model.vertices;
    expect(model.beginEdit()).toBe(true);
    model.moveVertex(2, [1, 0]);
    expect(model.commitEdit()).toMatchObject({ valid: false, reverted: true });
    expect(model.vertices).toEqual(original);
    expect(model.state).toBe('complete');
  });

  it('cancela uma edição usando o snapshot', () => {
    const model = createPolygonDrawingModel();
    completeTriangle(model);
    const original = model.vertices;
    model.beginEdit();
    model.moveVertex(1, [3, 0]);
    expect(model.cancelEdit()).toBe(true);
    expect(model.vertices).toEqual(original);
  });

  it('limpa integralmente o estado', () => {
    const model = createPolygonDrawingModel();
    completeTriangle(model);
    model.clear();
    expect(model.state).toBe('ready');
    expect(model.vertices).toEqual([]);
    expect(model.feature()).toBeNull();
  });
});
