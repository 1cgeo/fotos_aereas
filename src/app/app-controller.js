import {
  cacheProjectData,
  selectProject,
  setMapReady,
  setProjectActive,
  setProjectLoadState
} from './actions.js';
import { createProjectRepository } from '../data/project-repository.js';
import { createMap } from '../map/create-map.js';
import { ensureProjectLayers, setProjectVisibility } from '../map/project-layers.js';
import { renderProjectDetails, renderProjectsView } from '../ui/project-panel.js';

export async function initializeApplication({ config, store, ui }) {
  const repository = createProjectRepository(config);
  const map = await createMap(ui.map, config);
  setMapReady(store, true);
  let panelView = 'projects';

  function updateScope() {
    const count = store.getState().projects.activeIds.size;
    ui.scope.textContent = count > 0
      ? `Escopo: ${count} ${count === 1 ? 'projeto ligado' : 'projetos ligados'}`
      : 'Escopo: todos os projetos';
  }

  function renderPanel() {
    const state = store.getState();
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

  const initiallyActive = config.projects.filter((project) => project.initiallyActive);
  for (let index = 0; index < initiallyActive.length; index += 1) {
    await toggleProject(initiallyActive[index].id, true, { fit: index === 0 });
  }

  return Object.freeze({
    map,
    repository,
    toggleProject,
    showProjects() {
      panelView = 'projects';
      renderPanel();
    },
    destroy() {
      map.remove();
    }
  });
}

