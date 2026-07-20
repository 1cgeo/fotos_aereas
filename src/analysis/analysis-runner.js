import { cacheProjectData, setDownloadState, setProjectLoadState, updateQuery } from '../app/actions.js';
import { narrowScopeByCoverage, resolveQueryScope } from './query-scope.js';
import { deduplicateAndSortResults, normalizeAnalysisResult } from './result-normalizer.js';

function createQueryId() {
  return globalThis.crypto?.randomUUID?.() || `query-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

async function mapWithConcurrency(items, limit, worker, signal) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function consume() {
    while (nextIndex < items.length) {
      if (signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, Math.max(1, items.length));
  await Promise.all(Array.from({ length: workerCount }, consume));
  return results;
}

export function createAnalysisRunner({ config, store, repository, registry }) {
  let currentController = null;

  function isCurrent(queryId) {
    return store.getState().query.queryId === queryId;
  }

  return Object.freeze({
    async run(analysisId, geometry) {
      const analysis = registry.get(analysisId);
      if (!analysis) throw new Error(`Análise desconhecida: ${analysisId}.`);
      const validation = analysis.validate(geometry);
      if (!validation.valid) throw new Error(validation.message || 'Entrada inválida para análise.');

      currentController?.abort();
      const controller = new AbortController();
      currentController = controller;
      const queryId = createQueryId();
      const activeIds = store.getState().projects.activeIds;
      let scope = resolveQueryScope(config, activeIds);
      setDownloadState(store, {
        snapshotId: null,
        snapshot: null,
        reportStatus: 'idle',
        error: null,
        items: [],
        currentIndex: 0
      });
      updateQuery(store, {
        queryId,
        status: 'loading-projects',
        geometry: structuredClone(geometry),
        scopeProjectIds: scope.map((project) => project.id),
        results: [],
        projectErrors: [],
        progress: { stage: 'loading', current: 0, total: scope.length }
      });

      const projectErrors = [];
      let loadedCount = 0;

      try {
        // Etapa 1, só quando a consulta varre o catálogo inteiro: descartar por
        // COBERTURA os projetos que a geometria nem toca, antes de baixar grade.
        // Com projeto ligado, o usuário já escolheu o escopo e não há o que reduzir.
        if (activeIds.size === 0 && scope.length > 1) {
          const filtrado = await narrowScopeByCoverage(scope, geometry, repository, controller.signal);
          if (!isCurrent(queryId) || controller.signal.aborted) {
            throw new DOMException('Consulta cancelada.', 'AbortError');
          }
          if (filtrado.scope.length > 0 && filtrado.scope.length < scope.length) {
            scope = filtrado.scope;
            updateQuery(store, {
              scopeProjectIds: scope.map((project) => project.id),
              progress: { stage: 'loading', current: 0, total: scope.length }
            });
          }
        }

        const loaded = await mapWithConcurrency(
          scope,
          config.site.globalLoadConcurrency,
          async (project) => {
            try {
              if (repository.getStatus(project.id) !== 'ready') setProjectLoadState(store, project.id, 'loading');
              const data = await repository.load(project.id, { signal: controller.signal });
              cacheProjectData(store, project.id, data);
              setProjectLoadState(store, project.id, 'ready');
              return { project, data };
            } catch (error) {
              if (isAbortError(error)) throw error;
              projectErrors.push({ projectId: project.id, projectTitle: project.title, message: error.message });
              setProjectLoadState(store, project.id, 'error', error);
              return null;
            } finally {
              loadedCount += 1;
              if (isCurrent(queryId)) {
                updateQuery(store, { progress: { stage: 'loading', current: loadedCount, total: scope.length } });
              }
            }
          },
          controller.signal
        );

        if (!isCurrent(queryId) || controller.signal.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');
        const readyProjects = loaded.filter(Boolean);
        updateQuery(store, {
          status: 'running',
          projectErrors: [...projectErrors],
          progress: { stage: 'analysis', current: 0, total: readyProjects.length }
        });

        const allResults = [];
        for (let index = 0; index < readyProjects.length; index += 1) {
          if (controller.signal.aborted || !isCurrent(queryId)) throw new DOMException('Consulta cancelada.', 'AbortError');
          const { project, data } = readyProjects[index];
          try {
            const features = await analysis.executeProject({
              geometry,
              project,
              data,
              spatialIndex: data.spatialIndex,
              signal: controller.signal
            });
            allResults.push(...features.map((feature) => normalizeAnalysisResult(project, feature)));
          } catch (error) {
            if (isAbortError(error)) throw error;
            projectErrors.push({ projectId: project.id, projectTitle: project.title, message: error.message });
          }
          updateQuery(store, {
            projectErrors: [...projectErrors],
            progress: { stage: 'analysis', current: index + 1, total: readyProjects.length }
          });
          await Promise.resolve();
        }

        const results = deduplicateAndSortResults(allResults);
        const status = projectErrors.length > 0
          ? readyProjects.length === 0 ? 'error' : 'partial'
          : 'ready';
        if (isCurrent(queryId)) {
          updateQuery(store, { status, results, projectErrors, progress: null });
        }
        return results;
      } catch (error) {
        if (isAbortError(error)) {
          if (isCurrent(queryId)) updateQuery(store, { status: 'cancelled', progress: null });
          return [];
        }
        if (isCurrent(queryId)) {
          updateQuery(store, {
            status: 'error',
            projectErrors: [{ projectId: null, projectTitle: null, message: error.message }],
            progress: null
          });
        }
        throw error;
      } finally {
        if (currentController === controller) currentController = null;
      }
    },

    cancel() {
      currentController?.abort();
      currentController = null;
    },

    clear() {
      currentController?.abort();
      currentController = null;
      updateQuery(store, {
        queryId: null,
        status: 'idle',
        geometry: null,
        scopeProjectIds: [],
        results: [],
        projectErrors: [],
        progress: null
      });
    }
  });
}
