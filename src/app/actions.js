function replaceNested(state, key, value) {
  return { ...state, [key]: { ...state[key], ...value } };
}

export function setMapReady(store, ready) {
  store.setState((state) => replaceNested(state, 'map', { ready }));
}

export function setProjectLoadState(store, projectId, status, error = null) {
  store.setState((state) => {
    const loadStateById = new Map(state.projects.loadStateById);
    loadStateById.set(projectId, { status, error });
    return replaceNested(state, 'projects', { loadStateById });
  });
}

export function cacheProjectData(store, projectId, data) {
  store.setState((state) => {
    const dataById = new Map(state.projects.dataById);
    dataById.set(projectId, data);
    return replaceNested(state, 'projects', { dataById });
  });
}

export function setProjectActive(store, projectId, active) {
  store.setState((state) => {
    const activeIds = new Set(state.projects.activeIds);
    if (active) activeIds.add(projectId);
    else activeIds.delete(projectId);
    return replaceNested(state, 'projects', { activeIds });
  });
}

export function selectProject(store, projectId) {
  store.setState((state) => replaceNested(state, 'projects', { selectedId: projectId }));
}

export function setActiveTool(store, activeToolId, activationError = null) {
  store.setState((state) => replaceNested(state, 'tools', { activeToolId, activationError }));
}

export function updateQuery(store, patch) {
  store.setState((state) => replaceNested(state, 'query', patch));
}

export function setDownloadState(store, patch) {
  store.setState((state) => replaceNested(state, 'downloads', patch));
}

export function setZipState(store, patch) {
  store.setState((state) => replaceNested(state, 'downloads', {
    zip: { ...state.downloads.zip, ...patch }
  }));
}
