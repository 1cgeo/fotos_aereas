export function createInitialState(config) {
  return {
    catalog: {
      status: 'ready',
      projects: config.projects,
      errors: []
    },
    projects: {
      activeIds: new Set(),
      selectedId: null,
      dataById: new Map(),
      loadStateById: new Map()
    },
    map: {
      ready: false,
      hoveredPhotoKey: null
    },
    tools: {
      activeToolId: null,
      activationError: null
    },
    query: {
      status: 'idle',
      geometry: null,
      scopeProjectIds: [],
      results: [],
      projectErrors: [],
      queryId: null
    },
    downloads: {
      snapshotId: null,
      reportStatus: 'idle',
      items: [],
      currentIndex: 0
    }
  };
}

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return Object.freeze({
    getState() {
      return state;
    },

    setState(updater) {
      const nextState = typeof updater === 'function' ? updater(state) : updater;
      if (!nextState || nextState === state) return state;
      state = nextState;
      for (const listener of listeners) listener(state);
      return state;
    },

    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new TypeError('O listener do store deve ser uma função.');
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  });
}

