globalThis.AERIAL_CATALOG_CONFIG = {
  schemaVersion: 1,
  catalogVersion: 'demo-1',
  site: {
    title: 'Acervo de Fotografias Aéreas Históricas',
    shortTitle: 'Fotos Aéreas',
    description: 'Consulte coberturas e baixe fotografias do acervo.',
    locale: 'pt-BR',
    contact: {
      label: 'Contato do acervo',
      url: 'https://github.com/dinizime/fotos_aereas/issues'
    },
    initialView: {
      center: [-47.9, -15.8],
      zoom: 4,
      minZoom: 2,
      maxZoom: 20
    },
    globalLoadConcurrency: 4,
    maxDrawingVertices: 500,
    resultWarningThreshold: 500
  },
  basemap: {
    styleUrl: './osm-style.json',
    extraAttributions: [
      {
        label: '© OpenStreetMap contributors',
        url: 'https://www.openstreetmap.org/copyright'
      }
    ],
    reportAttributionText: '© OpenStreetMap contributors'
  },
  projects: []
};

