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
      queryId: null,
      progress: null
    },
    downloads: {
      snapshotId: null,
      snapshot: null,
      reportStatus: 'idle',
      error: null,
      reportFilename: null,
      items: [],
      // Quais chaves JÁ foram acionadas. É um conjunto, não um cursor: a fila
      // sequencial impedia rebaixar uma foto cuja conexão caiu no meio.
      baixados: new Set(),
      // O ZIP da consulta inteira. `partes` tem mais de uma entrada apenas no
      // navegador sem gravação em disco, onde a seleção precisa ser fatiada.
      zip: {
        status: 'idle',
        modo: null,
        partes: [],
        concluidas: new Set(),
        falhas: [],
        erro: null,
        parteAtual: null,
        progresso: null
      }
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
