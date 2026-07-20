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
import { clearQueryResults, showQueryResults } from '../map/query-result-layers.js';
import { applyMapTheme } from '../map/map-theme.js';
import { createDownloadController } from '../downloads/download-controller.js';
import { renderProjectDetails, renderProjectsView } from '../ui/project-panel.js';
import { renderQueryPanel } from '../ui/query-panel.js';
import { createQueryToolbar } from '../ui/query-toolbar.js';
import { createPointQueryTool } from '../tools/point-query/point-query-tool.js';
import { createPolygonQueryTool } from '../tools/polygon-query/polygon-query-tool.js';
import { createImportQueryTool } from '../tools/import-query/import-query-tool.js';
import { importIntersectionAnalysis } from '../analysis/import-intersection.analysis.js';
import { createToolManager } from '../tools/tool-manager.js';
import bbox from '@turf/bbox';

export async function initializeApplication({ config, store, ui, themeController }) {
  const repository = createProjectRepository(config);
  const map = await createMap(ui.map, config);
  const unsubscribeTheme = themeController?.subscribe((theme) => applyMapTheme(map, theme));
  let sidebarResizeTimer = null;
  const unsubscribeSidebar = ui.subscribeSidebarToggle?.(() => {
    map.resize();
    if (sidebarResizeTimer !== null) window.clearTimeout(sidebarResizeTimer);
    sidebarResizeTimer = window.setTimeout(() => {
      map.resize();
      map.triggerRepaint();
      sidebarResizeTimer = null;
    }, 200);
  });
  setMapReady(store, true);
  let panelView = 'projects';
  let sidebarContext = null;
  let selectedResultKey = null;
  let revealedQueryId = null;
  const projectColors = new Map(config.projects.map((project) => [project.id, project.style.color]));
  const registry = createAnalysisRegistry();
  registry.register(pointIntersectionAnalysis);
  registry.register(polygonIntersectionAnalysis);
  registry.register(importIntersectionAnalysis);
  const runner = createAnalysisRunner({ config, store, repository, registry });
  const downloads = createDownloadController({ config, store });
  const toolManager = createToolManager(store);
  // Uma busca nova apaga a anterior por inteiro: resultados, realce, fila de
  // download e a geometria da OUTRA ferramenta. Sem isso, o polígono da consulta
  // passada continua desenhado depois de um clique por ponto, e vice-versa.
  let pointTool = null;
  let polygonTool = null;
  let importTool = null;
  function prepararNovaBusca(origem) {
    selectedResultKey = null;
    revealedQueryId = null;
    downloads.reset();
    clearResultHighlight(map);
    clearQueryResults(map);
    if (origem !== 'point') pointTool?.clearGeometry();
    if (origem !== 'polygon') polygonTool?.clearGeometry();
    if (origem !== 'import') importTool?.clearGeometry();
  }

  pointTool = toolManager.register(createPointQueryTool({
    map,
    runner,
    store,
    asDefault: true,
    onNewQuery: () => prepararNovaBusca('point')
  }));
  polygonTool = toolManager.register(createPolygonQueryTool({
    map,
    runner,
    store,
    maxVertices: config.site.maxDrawingVertices,
    onNewQuery: () => prepararNovaBusca('polygon')
  }));
  // Fora do gerenciador de ferramentas de propósito: importar é ação, não modo,
  // e o gerenciador desativaria a "ferramenta" antes de o arquivo ser escolhido.
  importTool = createImportQueryTool({
    map,
    runner,
    onNewQuery: () => prepararNovaBusca('import')
  });

  function clearQuery() {
    selectedResultKey = null;
    revealedQueryId = null;
    runner.clear();
    downloads.reset();
    pointTool.clearGeometry();
    polygonTool.clearGeometry();
    // Também o import: sem isto, "Limpar consulta" deixava no mapa o GeoJSON
    // importado e o aviso "Consultando por <arquivo>" de uma busca que já não existe.
    importTool.clearGeometry();
    clearQueryResults(map);
    clearResultHighlight(map);
    panelView = 'projects';
  }

  // A consulta desenha SOMENTE as coberturas que intersectaram, numa camada
  // própria. Ligar a camada inteira do projeto atingido (comportamento anterior)
  // enchia o mapa com todos os footprints do voo, e não com o que respondeu.
  function showIntersectedFootprints(state) {
    showQueryResults(map, state.query.results, projectColors);
  }

  // Durante uma consulta, o mapa mostra SÓ o que a consulta encontrou, mesmo dos
  // projetos ligados. A grade cheia de um voo ligado competiria visualmente com o
  // resultado e esconderia justamente a resposta que o usuário pediu. Ao limpar a
  // busca, os projetos ligados voltam a aparecer.
  function aplicarVisibilidadeDosProjetos(state) {
    const consultando = state.query.status !== 'idle';
    for (const project of config.projects) {
      const ligado = state.projects.activeIds.has(project.id);
      setProjectVisibility(map, project.id, ligado && !consultando);
    }
  }

  function restoreSelectedHighlight() {
    const selected = store.getState().query.results.find((result) => result.key === selectedResultKey);
    if (selected) showResultHighlight(map, selected);
    else clearResultHighlight(map);
  }

  function focusResult(result) {
    selectedResultKey = selectedResultKey === result.key ? null : result.key;
    if (!selectedResultKey) {
      clearResultHighlight(map);
      return null;
    }
    showResultHighlight(map, result);
    const compact = window.matchMedia?.('(max-width: 900px)').matches;
    const bottom = compact && !ui.getSidebarCollapsed?.()
      ? Math.min(window.innerHeight * 0.46, 512) + 24
      : 72;
    const padding = compact ? { top: 96, right: 56, bottom, left: 56 } : 72;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    map.fitBounds(bbox(result.geometry), { padding, maxZoom: 16, duration: reducedMotion ? 0 : 500 });
    return selectedResultKey;
  }

  function startNewSearch(query) {
    // Consulta importada não tem ferramenta a reativar: volta ao padrão (ponto).
    const tipo = query.geometry?.geometry?.type;
    const toolId = tipo === 'Polygon' ? 'polygon-query' : 'point-query';
    clearQuery();
    if (toolManager.getActiveTool()?.id !== toolId) toolManager.activate(toolId);
    retomarPadrao();
    if (window.matchMedia?.('(max-width: 900px)').matches) ui.setSidebarCollapsed?.(true);
  }

  // A consulta por ponto é o comportamento PADRÃO do mapa, não uma ferramenta a
  // ligar: sempre que nenhum modo estiver ativo, ela volta a valer. Só o desenho
  // de área é modo, porque muda o que o clique faz.
  function retomarPadrao() {
    if (!toolManager.getActiveTool()) toolManager.activate('point-query');
  }

  const toolbar = createQueryToolbar(ui.toolbar, ui.scope, {
    onActivate: (toolId) => {
      if (toolManager.getActiveTool()?.id !== toolId) clearQuery();
      toolManager.activate(toolId);
      retomarPadrao();
    },
    onDeactivate: () => {
      toolManager.deactivate('chip');
      retomarPadrao();
    },
    // Importar é AÇÃO, não modo: sai do desenho de área (se estiver nele), volta
    // o mapa ao padrão e abre o seletor. A consulta acontece quando o arquivo
    // chega, o que pode demorar: nada aqui pode desmontar o seletor antes disso.
    onImport: () => {
      toolManager.deactivate('import');
      retomarPadrao();
      importTool.abrir();
    },
    onClear: clearQuery
  });

  function updateScope() {
    const count = store.getState().projects.activeIds.size;
    ui.scope.textContent = count > 0
      ? `Escopo: ${count} ${count === 1 ? 'projeto ligado' : 'projetos ligados'}`
      : 'Escopo: todos os projetos';
    ui.scope.title = count > 0
      ? 'A consulta usará somente os projetos ligados.'
      : 'Nenhum projeto está ligado; a consulta usará todo o catálogo.';
  }

  function renderPanel() {
    const state = store.getState();
    if (state.query.status !== 'idle') {
      if (sidebarContext !== 'query') ui.setSidebarCollapsed?.(false);
      sidebarContext = 'query';
      const resultCount = state.query.results.length;
      const description = state.query.status === 'loading-projects' || state.query.status === 'running'
        ? 'Buscando fotografias nas grades do escopo atual.'
        : `${resultCount} ${resultCount === 1 ? 'fotografia encontrada' : 'fotografias encontradas'}.`;
      ui.setSidebarHeader?.('Resultados da consulta', description);
      renderQueryPanel(ui.sidebarContent, state.query, state.downloads, {
        selectedResultKey,
        resultWarningThreshold: config.site.resultWarningThreshold,
        onClear: clearQuery,
        onNewSearch: () => startNewSearch(state.query),
        onCancel: () => runner.cancel(),
        onHighlight: (result) => showResultHighlight(map, result),
        onClearHighlight: restoreSelectedHighlight,
        onSelect: focusResult,
        onDownloadAll: () => downloads.start(store.getState().query),
        onDownloadItem: (key) => downloads.downloadItem(key),
        onDownloadReport: () => downloads.downloadReport()
      });
      return;
    }
    if (panelView === 'details' && state.projects.selectedId) {
      const project = config.projects.find((item) => item.id === state.projects.selectedId);
      if (project) {
        if (sidebarContext !== 'details') ui.setSidebarCollapsed?.(false);
        sidebarContext = 'details';
        ui.setSidebarHeader?.('Detalhes do voo', project.period?.display || 'Informações do aerolevantamento');
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
    sidebarContext = 'projects';
    ui.setSidebarHeader?.('Aerolevantamentos', config.site.description);
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
  retomarPadrao();
  const unsubscribe = store.subscribe((state) => {
    if (state.query.status === 'idle' || state.query.status === 'loading-projects') {
      selectedResultKey = null;
      clearResultHighlight(map);
      clearQueryResults(map);
    }
    if ((state.query.status === 'ready' || state.query.status === 'partial') && state.query.queryId !== revealedQueryId) {
      revealedQueryId = state.query.queryId;
      showIntersectedFootprints(state);
    }
    aplicarVisibilidadeDosProjetos(state);
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
    else {
      toolManager.deactivate('escape');
      retomarPadrao();
    }
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
      unsubscribeTheme?.();
      unsubscribeSidebar?.();
      if (sidebarResizeTimer !== null) window.clearTimeout(sidebarResizeTimer);
      ui.destroy?.();
      document.removeEventListener('keydown', handleKeyDown);
      toolManager.destroy();
      runner.cancel();
      map.remove();
    }
  });
}
