import {
  cacheProjectData,
  selectProject,
  setMapReady,
  setProjectActive,
  setProjectLoadState
} from './actions.js';
import { createProjectRepository } from '../data/project-repository.js';
import { createAnalysisRegistry } from '../analysis/analysis-registry.js';
import { createAnalysisRunner } from '../analysis/analysis-runner.js';
import { pointIntersectionAnalysis } from '../analysis/point-intersection.analysis.js';
import { polygonIntersectionAnalysis } from '../analysis/polygon-intersection.analysis.js';
import { createMap } from '../map/create-map.js';
import { ensureProjectLayers, setProjectVisibility } from '../map/project-layers.js';
import { clearResultHighlight, showResultHighlight } from '../map/result-highlight.js';
import { createDownloadController } from '../downloads/download-controller.js';
import { renderProjectDetails, renderProjectsView } from '../ui/project-panel.js';
import { renderQueryPanel } from '../ui/query-panel.js';
import { createQueryToolbar } from '../ui/query-toolbar.js';
import { createPointQueryTool } from '../tools/point-query/point-query-tool.js';
import { createPolygonQueryTool } from '../tools/polygon-query/polygon-query-tool.js';
import { createToolManager } from '../tools/tool-manager.js';

export async function initializeApplication({ config, store, ui }) {
  const repository = createProjectRepository(config);
  const map = await createMap(ui.map, config);
  setMapReady(store, true);
  let panelView = 'projects';
  const registry = createAnalysisRegistry();
  registry.register(pointIntersectionAnalysis);
  registry.register(polygonIntersectionAnalysis);
  const runner = createAnalysisRunner({ config, store, repository, registry });
  const downloads = createDownloadController({ config, store });
  const toolManager = createToolManager(store);
  const pointTool = toolManager.register(createPointQueryTool({ map, runner, store }));
  const polygonTool = toolManager.register(createPolygonQueryTool({
    map,
    runner,
    store,
    maxVertices: config.site.maxDrawingVertices
  }));

  function clearQuery() {
    runner.clear();
    downloads.reset();
    pointTool.clearGeometry();
    polygonTool.clearGeometry();
    clearResultHighlight(map);
    panelView = 'projects';
  }

  const toolbar = createQueryToolbar(ui.toolbar, ui.scope, {
    onActivate: (toolId) => toolManager.activate(toolId),
    onDeactivate: () => toolManager.deactivate('chip'),
    onClear: clearQuery
  });

  function updateScope() {
    const count = store.getState().projects.activeIds.size;
    ui.scope.textContent = count > 0
      ? `Escopo: ${count} ${count === 1 ? 'projeto ligado' : 'projetos ligados'}`
      : 'Escopo: todos os projetos';
  }

  function renderPanel() {
    const state = store.getState();
    if (state.query.status !== 'idle') {
      renderQueryPanel(ui.sidebarContent, state.query, state.downloads, {
        onClear: clearQuery,
        onCancel: () => runner.cancel(),
        onHighlight: (result) => showResultHighlight(map, result),
        onClearHighlight: () => clearResultHighlight(map),
        onDownloadAll: () => downloads.start(store.getState().query),
        onDownloadNext: () => downloads.downloadNext()
      });
      return;
    }
    if (panelView === 'details' && state.projects.selectedId) {
      const project = config.projects.find((item) => item.id === state.projects.selectedId);
      if (project) {
        renderProjectDetails(ui.sidebarContent, project, state.projects.activeIds.has(project.id), {
          onBack: () => {
            panelView = 'projects';
            selectProject(store, null);
            renderPanel();
          },
          onToggle: toggleProject
        });
        return;
      }
    }
    renderProjectsView(ui.sidebarContent, config, state, {
      onToggle: toggleProject,
      onDetails: (projectId) => {
        panelView = 'details';
        selectProject(store, projectId);
        renderPanel();
      }
    });
  }

  async function toggleProject(projectId, active, options = {}) {
    const project = config.projects.find((item) => item.id === projectId);
    if (!project) return;
    setProjectLoadState(store, projectId, active ? 'loading' : repository.getStatus(projectId));
    renderPanel();

    try {
      if (active) {
        const data = await repository.load(projectId);
        cacheProjectData(store, projectId, data);
        ensureProjectLayers(map, project, data);
        setProjectVisibility(map, projectId, true);
        setProjectActive(store, projectId, true);
        setProjectLoadState(store, projectId, 'ready');

        if (options.fit !== false) {
          map.fitBounds(project.extent, { padding: 60, maxZoom: 14, duration: 700 });
        }
      } else {
        setProjectVisibility(map, projectId, false);
        setProjectActive(store, projectId, false);
        setProjectLoadState(store, projectId, repository.getStatus(projectId));
      }
    } catch (error) {
      console.error(`Falha ao alternar projeto ${projectId}:`, error);
      setProjectActive(store, projectId, false);
      setProjectLoadState(store, projectId, 'error', error);
    }
    updateScope();
    renderPanel();
  }

  renderPanel();
  updateScope();
  toolbar.update(store.getState());
  toolbar.setPolygonEnabled(true);
  const unsubscribe = store.subscribe((state) => {
    if (state.query.status === 'loading-projects') clearResultHighlight(map);
    updateScope();
    toolbar.update(state);
    renderPanel();
  });

  const handleKeyDown = (event) => {
    const activeTool = toolManager.getActiveTool();
    if (activeTool?.handleKeyDown?.(event)) return;
    if (event.key !== 'Escape') return;
    const status = store.getState().query.status;
    if (status === 'loading-projects' || status === 'running') runner.cancel();
    else toolManager.deactivate('escape');
  };
  document.addEventListener('keydown', handleKeyDown);

  const initiallyActive = config.projects.filter((project) => project.initiallyActive);
  for (let index = 0; index < initiallyActive.length; index += 1) {
    await toggleProject(initiallyActive[index].id, true, { fit: index === 0 });
  }

  return Object.freeze({
    map,
    repository,
    registry,
    runner,
    toolManager,
    toggleProject,
    showProjects() {
      panelView = 'projects';
      renderPanel();
    },
    destroy() {
      unsubscribe();
      document.removeEventListener('keydown', handleKeyDown);
      toolManager.destroy();
      runner.cancel();
      map.remove();
    }
  });
}
