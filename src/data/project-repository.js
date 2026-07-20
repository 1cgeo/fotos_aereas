import { normalizeProjectGeoJSON } from './validate-geojson.js';

const MAX_GEOJSON_BYTES = 25 * 1024 * 1024;
const MAX_COVERAGE_BYTES = 2 * 1024 * 1024;

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

    // A checagem de tipo existe para pegar o servidor que devolve uma PÁGINA DE
    // ERRO no lugar do dado, respondendo 200. Ela não deve reprovar
    // `application/octet-stream`: a extensão .geojson não está no mime.types
    // padrão do nginx nem da maioria dos servidores, então "não sei o tipo" é a
    // resposta normal para um arquivo perfeitamente válido. Quem julga o
    // conteúdo de fato é o JSON.parse logo abaixo.
    const contentType = (response.headers?.get?.('content-type') || '').toLowerCase();
    if (contentType.includes('html') || contentType.includes('xml')) {
      throw new Error(`O projeto ${project.title} não retornou JSON (o servidor respondeu ${contentType}).`);
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

  // Cobertura do projeto: um polígono só, carregado na primeira etapa da consulta
  // para descartar projetos que a área nem toca, sem baixar a grade inteira deles.
  const coverages = new Map();

  async function fetchCoverage(project, signal) {
    const response = await fetchFn(project.data.coverageUrl, {
      signal,
      credentials: 'omit',
      headers: { Accept: 'application/geo+json, application/json' }
    });
    if (!response.ok) throw new Error(`Falha ao carregar a cobertura de ${project.title}: HTTP ${response.status}.`);
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_COVERAGE_BYTES) {
      throw new RangeError(`A cobertura de ${project.title} excede o limite de tamanho.`);
    }
    const raw = JSON.parse(text);
    const feature = raw?.type === 'FeatureCollection' ? raw.features?.[0] : raw;
    const type = feature?.geometry?.type;
    if (type !== 'Polygon' && type !== 'MultiPolygon') {
      throw new TypeError(`A cobertura de ${project.title} deve ser Polygon ou MultiPolygon.`);
    }
    return { type: 'Feature', properties: {}, geometry: feature.geometry };
  }

  return Object.freeze({
    // Devolve a cobertura, ou null quando o projeto não declara uma ou quando ela
    // falha. Null significa "não sei", e quem chama deve INCLUIR o projeto: é
    // preferível baixar uma grade à toa a esconder um voo do usuário.
    async loadCoverage(projectId, optionsForLoad = {}) {
      const project = projectsById.get(projectId);
      if (!project?.data?.coverageUrl) return null;
      if (coverages.has(projectId)) return coverages.get(projectId);
      try {
        const feature = await fetchCoverage(project, optionsForLoad.signal);
        coverages.set(projectId, feature);
        return feature;
      } catch (error) {
        if (error?.name === 'AbortError') throw error;
        console.warn(`Cobertura indisponível para ${projectId}; o projeto seguirá no escopo.`, error);
        coverages.set(projectId, null);
        return null;
      }
    },

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

