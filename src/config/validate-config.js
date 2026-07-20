import { resolvePublicUrl } from '../security/urls.js';

const PROJECT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function assertObject(value, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${field} deve ser um objeto.`);
  }
}

function assertString(value, field, maxLength = 500) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} deve ser um texto não vazio.`);
  }
  if (value.length > maxLength) {
    throw new RangeError(`${field} excede ${maxLength} caracteres.`);
  }
  return value.trim();
}

function normalizeProject(project, index, configUrl, ids) {
  assertObject(project, `projects[${index}]`);
  const id = assertString(project.id, `projects[${index}].id`, 80);
  if (!PROJECT_ID_PATTERN.test(id)) throw new Error(`ID de projeto inválido: ${id}.`);
  if (ids.has(id)) throw new Error(`ID de projeto duplicado: ${id}.`);
  ids.add(id);

  if (!Array.isArray(project.extent) || project.extent.length !== 4 || !project.extent.every(Number.isFinite)) {
    throw new TypeError(`O projeto ${id} deve ter extent com quatro números.`);
  }

  const [west, south, east, north] = project.extent;
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) {
    throw new RangeError(`Extent inválido no projeto ${id}.`);
  }

  assertObject(project.data, `projects[${index}].data`);
  const color = project.style?.color || '#2563eb';
  if (!HEX_COLOR_PATTERN.test(color)) throw new Error(`Cor inválida no projeto ${id}.`);
  const license = project.license
    ? Object.freeze({
        label: assertString(project.license.label, `projects[${index}].license.label`, 200),
        url: project.license.url ? resolvePublicUrl(project.license.url, configUrl, 'link').href : null
      })
    : null;
  const links = Array.isArray(project.links)
    ? project.links.map((link, linkIndex) => ({
        label: assertString(link.label, `projects[${index}].links[${linkIndex}].label`, 120),
        url: resolvePublicUrl(link.url, configUrl, 'link').href
      }))
    : [];

  return Object.freeze({
    ...project,
    id,
    enabled: project.enabled !== false,
    initiallyActive: project.initiallyActive === true,
    sortOrder: Number.isFinite(project.sortOrder) ? project.sortOrder : index,
    title: assertString(project.title, `projects[${index}].title`, 160),
    shortTitle: project.shortTitle ? assertString(project.shortTitle, `projects[${index}].shortTitle`, 80) : null,
    summary: assertString(project.summary, `projects[${index}].summary`, 500),
    description: Array.isArray(project.description)
      ? project.description.map((paragraph, paragraphIndex) =>
          assertString(paragraph, `projects[${index}].description[${paragraphIndex}]`, 2_000)
        )
      : [],
    extent: Object.freeze([...project.extent]),
    license,
    links: Object.freeze(links),
    data: Object.freeze({
      footprintsUrl: resolvePublicUrl(project.data.footprintsUrl, configUrl, 'geojson').href,
      // Geometria de COBERTURA do voo: polígono único, pequeno, usado na primeira
      // etapa da consulta para decidir quais projetos merecem ter a grade baixada.
      // Opcional: projeto sem cobertura declarada entra sempre no escopo.
      coverageUrl: project.data.coverageUrl
        ? resolvePublicUrl(project.data.coverageUrl, configUrl, 'geojson').href
        : null
    }),
    style: Object.freeze({
      color,
      fillOpacity: Number.isFinite(project.style?.fillOpacity)
        ? Math.max(0, Math.min(1, project.style.fillOpacity))
        : 0.12,
      lineOpacity: Number.isFinite(project.style?.lineOpacity)
        ? Math.max(0, Math.min(1, project.style.lineOpacity))
        : 0.8
    })
  });
}

export function normalizeConfig(rawConfig, configUrl) {
  assertObject(rawConfig, 'config');
  if (rawConfig.schemaVersion !== 1) {
    throw new Error(`schemaVersion não suportada: ${rawConfig.schemaVersion}.`);
  }

  assertObject(rawConfig.site, 'site');
  assertObject(rawConfig.basemap, 'basemap');
  if (!Array.isArray(rawConfig.projects)) throw new TypeError('projects deve ser um array.');

  const ids = new Set();
  const projects = rawConfig.projects
    .map((project, index) => normalizeProject(project, index, configUrl, ids))
    .filter((project) => project.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'pt-BR'));

  const initialView = rawConfig.site.initialView || {};
  const center = Array.isArray(initialView.center) && initialView.center.length === 2
    ? initialView.center.map(Number)
    : [-47.9, -15.8];
  if (!center.every(Number.isFinite)) throw new TypeError('site.initialView.center é inválido.');

  const extraAttributions = Array.isArray(rawConfig.basemap.extraAttributions)
    ? rawConfig.basemap.extraAttributions.map((item, index) => {
        assertObject(item, `basemap.extraAttributions[${index}]`);
        return Object.freeze({
          label: assertString(item.label, `basemap.extraAttributions[${index}].label`, 120),
          url: resolvePublicUrl(item.url, configUrl, 'link').href
        });
      })
    : [];

  return Object.freeze({
    schemaVersion: 1,
    catalogVersion: String(rawConfig.catalogVersion || '1'),
    configUrl: new URL(configUrl).href,
    site: Object.freeze({
      ...rawConfig.site,
      title: assertString(rawConfig.site.title, 'site.title', 160),
      shortTitle: assertString(rawConfig.site.shortTitle || rawConfig.site.title, 'site.shortTitle', 80),
      description: assertString(rawConfig.site.description, 'site.description', 500),
      locale: rawConfig.site.locale || 'pt-BR',
      contact: rawConfig.site.contact
        ? Object.freeze({
            label: assertString(rawConfig.site.contact.label, 'site.contact.label', 120),
            url: resolvePublicUrl(rawConfig.site.contact.url, configUrl, 'contact').href
          })
        : null,
      initialView: Object.freeze({
        center: Object.freeze(center),
        zoom: Number.isFinite(initialView.zoom) ? initialView.zoom : 4,
        minZoom: Number.isFinite(initialView.minZoom) ? initialView.minZoom : 2,
        maxZoom: Number.isFinite(initialView.maxZoom) ? initialView.maxZoom : 20
      }),
      globalLoadConcurrency: Math.max(1, Math.min(8, Number(rawConfig.site.globalLoadConcurrency) || 4)),
      maxDrawingVertices: Math.max(3, Math.min(2_000, Number(rawConfig.site.maxDrawingVertices) || 500)),
      resultWarningThreshold: Math.max(1, Number(rawConfig.site.resultWarningThreshold) || 500)
    }),
    basemap: Object.freeze({
      styleUrl: resolvePublicUrl(rawConfig.basemap.styleUrl, configUrl, 'style').href,
      extraAttributions: Object.freeze(extraAttributions),
      reportAttributionText: String(rawConfig.basemap.reportAttributionText || '')
    }),
    projects: Object.freeze(projects)
  });
}
