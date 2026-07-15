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
      center: [-47.86, -15.76],
      zoom: 12,
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
  projects: [
    {
      id: 'brasilia-1958',
      enabled: true,
      initiallyActive: true,
      sortOrder: 10,
      title: 'Aerolevantamento Brasília 1958',
      shortTitle: 'Brasília 1958',
      summary: 'Cobertura fictícia da fase inicial de implantação de Brasília.',
      description: [
        'Projeto demonstrativo criado para validar consultas, sobreposições e downloads.',
        'As fotografias e instituições apresentadas neste projeto são dados simulados.'
      ],
      period: {
        start: '1958-08-04',
        end: '1958-08-18',
        display: 'agosto de 1958'
      },
      institution: 'Arquivo Cartográfico Demonstrativo',
      contractor: 'Serviço Aerofotogramétrico Fictício',
      aircraft: 'Douglas DC-3 (dado simulado)',
      camera: 'Câmera métrica 152 mm (dado simulado)',
      nominalScale: '1:25.000',
      filmType: 'Pancromático',
      spatialCoverage: 'Plano Piloto e entorno imediato',
      photoCount: 3,
      license: {
        label: 'Dados de demonstração — uso livre',
        url: 'https://github.com/dinizime/fotos_aereas'
      },
      credits: 'Dados inteiramente fictícios para demonstração do portal.',
      links: [],
      extent: [-47.96, -15.84, -47.81, -15.70],
      data: {
        footprintsUrl: './data/brasilia-1958/footprints.geojson'
      },
      style: {
        color: '#b45309',
        fillOpacity: 0.14,
        lineOpacity: 0.9
      },
      download: {
        instructions: 'Os arquivos deste projeto são SVGs leves usados como mock.'
      }
    },
    {
      id: 'brasilia-1972',
      enabled: true,
      initiallyActive: false,
      sortOrder: 20,
      title: 'Aerolevantamento Brasília 1972',
      shortTitle: 'Brasília 1972',
      summary: 'Cobertura fictícia usada para demonstrar consulta entre projetos.',
      description: [
        'Segundo projeto demonstrativo, com footprints que se sobrepõem ao levantamento de 1958.'
      ],
      period: {
        start: '1972-06-10',
        end: '1972-06-22',
        display: 'junho de 1972'
      },
      institution: 'Arquivo Cartográfico Demonstrativo',
      contractor: 'Aerofoto Exemplo S.A.',
      aircraft: 'Beechcraft D18S (dado simulado)',
      camera: 'Câmera métrica 153 mm (dado simulado)',
      nominalScale: '1:18.000',
      filmType: 'Pancromático',
      spatialCoverage: 'Plano Piloto, Lago Sul e eixo leste',
      photoCount: 3,
      license: {
        label: 'Dados de demonstração — uso livre',
        url: 'https://github.com/dinizime/fotos_aereas'
      },
      credits: 'Dados inteiramente fictícios para demonstração do portal.',
      links: [],
      extent: [-47.94, -15.84, -47.77, -15.69],
      data: {
        footprintsUrl: './data/brasilia-1972/footprints.geojson'
      },
      style: {
        color: '#0369a1',
        fillOpacity: 0.13,
        lineOpacity: 0.9
      },
      download: {
        instructions: 'Os arquivos deste projeto são SVGs leves usados como mock.'
      }
    }
  ]
};
