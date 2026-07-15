import { normalizeProjectGeoJSON } from './validate-geojson.js';

const MAX_GEOJSON_BYTES = 25 * 1024 * 1024;

export function createProjectRepository(config, options = {}) {
  const fetchFn = options.fetchFn || globalThis.fetch.bind(globalThis);
  const projectsById = new Map(config.projects.map((project) => [project.id, project]));
  const records = new Map();

  async function fetchProject(project, signal) {
    const response = await fetchFn(project.data.footprintsUrl, {
      signal,
      credentials: 'omit',
      headers: { Accept: 'application/geo+json, application/json' }
    });
    if (!response.ok) throw new Error(`Falha ao carregar ${project.title}: HTTP ${response.status}.`);

    const contentType = response.headers?.get?.('content-type') || '';
    if (contentType && !contentType.includes('json') && !contentType.includes('geo+json')) {
      throw new Error(`O projeto ${project.title} não retornou JSON.`);
    }
    const contentLength = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_GEOJSON_BYTES) {
      throw new RangeError(`O GeoJSON de ${project.title} excede o limite de tamanho.`);
    }

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_GEOJSON_BYTES) {
      throw new RangeError(`O GeoJSON de ${project.title} excede o limite de tamanho.`);
    }

    let raw;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new Error(`O GeoJSON de ${project.title} não é um JSON válido.`);
    }
    return normalizeProjectGeoJSON(raw, project, new URL(project.data.footprintsUrl));
  }

  return Object.freeze({
    load(projectId, optionsForLoad = {}) {
      const project = projectsById.get(projectId);
      if (!project) return Promise.reject(new Error(`Projeto desconhecido: ${projectId}.`));
      const existing = records.get(projectId);
      if (existing?.status === 'ready') return Promise.resolve(existing.data);
      if (existing?.status === 'loading') return existing.promise;

      const promise = fetchProject(project, optionsForLoad.signal)
        .then((data) => {
          records.set(projectId, { status: 'ready', data });
          return data;
        })
        .catch((error) => {
          records.set(projectId, { status: 'error', error });
          throw error;
        });
      records.set(projectId, { status: 'loading', promise });
      return promise;
    },

    get(projectId) {
      return records.get(projectId)?.data || null;
    },

    getStatus(projectId) {
      return records.get(projectId)?.status || 'not-loaded';
    },

    clear(projectId) {
      records.delete(projectId);
    }
  });
}

