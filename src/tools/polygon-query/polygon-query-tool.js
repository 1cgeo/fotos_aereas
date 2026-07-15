import { createCleanupScope } from '../cleanup-scope.js';
import { createPolygonDrawingModel } from './polygon-drawing-model.js';
import { drawingFeatureCollection } from './polygon-geometry.js';

const SOURCE_ID = 'query:polygon-drawing';
const FILL_LAYER_ID = 'query:polygon-fill';
const LINE_LAYER_ID = 'query:polygon-line';
const VERTEX_LAYER_ID = 'query:polygon-vertices';

function ensureLayers(map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: drawingFeatureCollection([]) });
  }
  if (!map.getLayer(FILL_LAYER_ID)) {
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'polygon'],
      paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.18 }
    });
  }
  if (!map.getLayer(LINE_LAYER_ID)) {
    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['in', ['get', 'kind'], ['literal', ['polygon', 'line']]],
      paint: { 'line-color': '#1d4ed8', 'line-width': 3, 'line-dasharray': [2, 1] }
    });
  }
  if (!map.getLayer(VERTEX_LAYER_ID)) {
    map.addLayer({
      id: VERTEX_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['get', 'kind'], 'vertex'],
      paint: {
        'circle-radius': ['case', ['get', 'first'], 7, 5],
        'circle-color': ['case', ['get', 'first'], '#dc2626', '#ffffff'],
        'circle-stroke-color': '#1d4ed8',
        'circle-stroke-width': 2
      }
    });
  }
}

function createControls() {
  const container = document.createElement('div');
  container.className = 'drawing-controls';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Controles do desenho');
  const status = document.createElement('p');
  status.className = 'drawing-controls__status';
  status.setAttribute('aria-live', 'polite');
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.textContent = 'Desfazer vértice';
  const finish = document.createElement('button');
  finish.type = 'button';
  finish.textContent = 'Concluir área';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancelar desenho';
  container.append(status, undo, finish, cancel);
  return { container, status, undo, finish, cancel };
}

function coordinateFromEvent(event) {
  const { lng, lat } = event.lngLat || {};
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

export function createPolygonQueryTool({ map, runner, store, maxVertices = 500 }) {
  const model = createPolygonDrawingModel();
  let scope = null;
  let controls = null;
  let preview = null;
  let frameId = null;
  let draggedVertex = null;
  let dragPanWasEnabled = false;

  function source() {
    return map.getSource(SOURCE_ID);
  }

  function render(message = '') {
    const complete = model.state === 'complete' || model.state === 'editing';
    source()?.setData(drawingFeatureCollection(model.vertices, preview, complete));
    if (!controls) return;
    const count = model.vertices.length;
    controls.undo.disabled = model.state !== 'drawing' || count === 0;
    controls.finish.disabled = model.state !== 'drawing' || count < 3;
    controls.undo.hidden = complete;
    controls.finish.hidden = complete;
    controls.cancel.textContent = complete ? 'Desenhar nova área' : 'Cancelar desenho';
    controls.status.textContent = message || (model.state === 'complete'
      ? 'Área concluída. Arraste os vértices para ajustar ou inicie outra busca.'
      : `${count} vértice(s). Clique no mapa para desenhar.`);
  }

  function runCompleted(feature) {
    preview = null;
    render('Consultando fotografias que intersectam a área…');
    runner.run('polygon-intersection', feature).catch((error) => {
      console.error('Falha na consulta por polígono:', error);
      render(error.message);
    });
  }

  function finish() {
    const result = model.finish();
    if (!result.valid) {
      render(result.message);
      return false;
    }
    runCompleted(result.feature);
    return true;
  }

  function clearAll(clearQuery = true) {
    model.clear();
    preview = null;
    if (clearQuery) runner.clear();
    render();
  }

  function onClick(event) {
    if (model.state === 'complete' || model.state === 'editing') return;
    const coordinate = coordinateFromEvent(event);
    if (!coordinate) return;
    if (model.vertices.length >= 3) {
      const firstPoint = map.project(model.vertices[0]);
      const distance = Math.hypot(event.point.x - firstPoint.x, event.point.y - firstPoint.y);
      if (distance <= 12) {
        finish();
        return;
      }
    }
    if (model.vertices.length >= maxVertices) {
      render(`O limite de ${maxVertices} vértices foi atingido. Conclua ou desfaça o desenho.`);
      return;
    }
    const result = model.add(coordinate);
    preview = null;
    render(result.valid ? '' : result.message);
  }

  function onMouseMove(event) {
    if (draggedVertex !== null) {
      const coordinate = coordinateFromEvent(event);
      if (coordinate) {
        model.moveVertex(draggedVertex, coordinate);
        render('Solte para validar a nova geometria.');
      }
      return;
    }
    if (model.state !== 'drawing') return;
    preview = coordinateFromEvent(event);
    if (frameId !== null) return;
    frameId = requestAnimationFrame(() => {
      frameId = null;
      render();
    });
  }

  function restorePan() {
    if (dragPanWasEnabled) map.dragPan.enable();
    dragPanWasEnabled = false;
    draggedVertex = null;
  }

  function onVertexMouseDown(event) {
    const index = Number(event.features?.[0]?.properties?.index);
    if (!Number.isInteger(index) || !model.vertices[index]) return;
    event.preventDefault();
    if (!model.beginEdit()) return;
    draggedVertex = index;
    dragPanWasEnabled = map.dragPan.isEnabled();
    if (dragPanWasEnabled) map.dragPan.disable();
    map.getCanvas().style.cursor = 'grabbing';
  }

  function onMouseUp() {
    if (draggedVertex === null) return;
    const result = model.commitEdit();
    restorePan();
    map.getCanvas().style.cursor = 'crosshair';
    if (result.valid) runCompleted(result.feature);
    else render(`${result.message} A alteração foi desfeita.`);
  }

  return Object.freeze({
    id: 'polygon-query',
    label: 'Desenhar área',
    activate() {
      if (scope) return;
      ensureLayers(map);
      scope = createCleanupScope();
      controls = createControls();
      map.getContainer().append(controls.container);
      scope.add(() => controls?.container.remove());
      scope.domOn(controls.undo, 'click', () => {
        model.undo();
        preview = null;
        render();
      });
      scope.domOn(controls.finish, 'click', finish);
      scope.domOn(controls.cancel, 'click', () => clearAll(true));
      const canvas = map.getCanvas();
      const previousCursor = canvas.style.cursor;
      canvas.style.cursor = 'crosshair';
      scope.add(() => {
        restorePan();
        canvas.style.cursor = previousCursor;
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null;
      });
      const doubleClickWasEnabled = map.doubleClickZoom.isEnabled();
      if (doubleClickWasEnabled) map.doubleClickZoom.disable();
      scope.add(() => {
        if (doubleClickWasEnabled) map.doubleClickZoom.enable();
      });
      scope.mapOn(map, 'click', onClick);
      scope.mapOn(map, 'mousemove', onMouseMove);
      scope.mapOn(map, 'mouseup', onMouseUp);
      map.on('mousedown', VERTEX_LAYER_ID, onVertexMouseDown);
      scope.add(() => map.off('mousedown', VERTEX_LAYER_ID, onVertexMouseDown));
      render();
    },
    deactivate() {
      const status = store.getState().query.status;
      if (status === 'loading-projects' || status === 'running') runner.cancel();
      if (model.state === 'editing') model.cancelEdit();
      scope?.cleanup();
      scope = null;
      controls = null;
      render();
    },
    handleKeyDown(event) {
      if (event.key === 'Backspace' && model.state === 'drawing') {
        event.preventDefault();
        model.undo();
        preview = null;
        render();
        return true;
      }
      if (event.key === 'Enter' && model.state === 'drawing') {
        event.preventDefault();
        finish();
        return true;
      }
      if (event.key === 'Escape' && model.state === 'editing') {
        model.cancelEdit();
        restorePan();
        render('Edição cancelada.');
        return true;
      }
      if (event.key === 'Escape' && model.state === 'drawing') {
        clearAll(true);
        return true;
      }
      return false;
    },
    clearGeometry() {
      clearAll(false);
    },
    destroy() {
      scope?.cleanup();
      scope = null;
      controls = null;
    },
    getModel() {
      return model;
    }
  });
}
