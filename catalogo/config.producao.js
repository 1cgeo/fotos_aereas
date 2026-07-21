// Catalogo do Portal de Fotografias Aereas Historicas - 1o Centro de Geoinformacao.
// Este arquivo vive NO SERVIDOR, nao no repositorio publico: e ele que carrega os
// caminhos internos. O repositorio mantem o config.js de demonstracao.
// Carregado em runtime, sem rebuild: para publicar um voo novo, acrescente o
// projeto aqui e suba os arquivos dele em data/<id>/.
globalThis.AERIAL_CATALOG_CONFIG = {
  schemaVersion: 1,
  catalogVersion: '2026-07-21',
  site: {
    kicker: 'Acervo 1º CGEO',
    title: 'Acervo de Fotografias Aéreas Históricas',
    shortTitle: 'Fotos Aéreas',
    description: 'Consulte as coberturas aerofotogramétricas do acervo e baixe as fotografias.',
    locale: 'pt-BR',
    initialView: {
      center: [-52.79, -28.66],
      zoom: 5,
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
      id: 'cib-butia-2001',
      enabled: true,
      // Com mais de um voo no catalogo, nenhum entra ligado: a consulta em duas
      // etapas so vale quando o escopo esta vazio, e ligar um projeto por padrao
      // esconderia esse caminho do usuario.
      initiallyActive: false,
      sortOrder: 10,
      title: 'Campo de Instrução de Butiá 2001',
      shortTitle: 'Butiá 2001',
      summary: 'Cobertura aerofotogramétrica do Campo de Instrução de Butiá e entorno, na escala 1:25.000, executada em outubro de 2001.',
      description: [
        'Cobertura aerofotogramétrica da região de Butiá, no Rio Grande do Sul, abrangendo o Campo de Instrução de Butiá, o rio Jacuí, Amarópolis e o Açude do Quati.',
        'Quatro faixas no sentido norte-sul, com 45 fotografias no total.',
        'O contorno exibido é aproximado e serve para localizar a fotografia, não como medida cartográfica.'
      ],
      period: {
        start: '2001-10-01',
        end: '2001-10-31',
        display: 'outubro de 2001'
      },
      institution: 'Ministério da Defesa',
      contractor: 'BASE Aerofotogrametria e Projetos S.A.',
      nominalScale: '1:25.000',
      filmType: 'Colorido',
      spatialCoverage: 'Campo de Instrução de Butiá e entorno, Rio Grande do Sul',
      photoCount: 45,
      license: {
        label: 'Acervo do 1º Centro de Geoinformação - uso interno'
      },
      credits: 'Executado por BASE Aerofotogrametria e Projetos S.A. Autorização do Ministério da Defesa 234/01, trabalho O-760.',
      links: [],
      extent: [-52.043791, -30.120967, -51.850956, -29.846800],
      data: {
        footprintsUrl: './data/cib-butia-2001/footprints.geojson',
        // Contorno do voo, usado na 1a etapa da consulta para decidir se este
        // projeto precisa ter a grade baixada. E o contorno real, nao a caixa
        // envolvente: com faixas obliquas a caixa incluiria area sem foto.
        coverageUrl: './data/cib-butia-2001/cobertura.geojson'
      },
      style: {
        color: '#b45309',
        fillOpacity: 0.14,
        lineOpacity: 0.9
      },
      download: {
        instructions: 'As fotografias são entregues em JPEG. O negativo digitalizado pode ser solicitado à Divisão de Geoinformação.'
      }
    },
    {
      id: 'saica-2001',
      enabled: true,
      initiallyActive: false,
      sortOrder: 20,
      title: 'Saicã 2001',
      shortTitle: 'Saicã 2001',
      summary: 'Cobertura aerofotogramétrica da região de Saicã, no Rio Grande do Sul, na escala 1:25.000, executada pela Força Aérea Brasileira em 2001.',
      description: [
        'Cobertura aerofotogramétrica do voo Saicã, no Rio Grande do Sul, abrangendo as folhas 2962/4-SE, 2963/3-SO, 2963/3-SE, 2979/2-NE, 2980/1-NO e 2980/1-NE.',
        'Seis faixas no sentido leste-oeste (Fx-01 a Fx-06), com 130 fotografias no total.',
        'O contorno exibido é aproximado e serve para localizar a fotografia, não como medida cartográfica.'
      ],
      period: {
        start: '2001-01-01',
        end: '2001-12-31',
        display: '2001'
      },
      institution: '1ª Divisão de Levantamento',
      contractor: 'Força Aérea Brasileira',
      nominalScale: '1:25.000',
      filmType: 'Colorido',
      spatialCoverage: 'Região de Saicã, Rio Grande do Sul',
      photoCount: 130,
      license: {
        label: 'Acervo do 1º Centro de Geoinformação - uso interno'
      },
      credits: 'Voo executado pela Força Aérea Brasileira. Foto-índice da 1ª Divisão de Levantamento.',
      links: [],
      extent: [-55.096238, -30.046581, -54.780268, -29.892665],
      data: {
        footprintsUrl: './data/saica-2001/footprints.geojson',
        coverageUrl: './data/saica-2001/cobertura.geojson'
      },
      style: {
        color: '#0369a1',
        fillOpacity: 0.14,
        lineOpacity: 0.9
      },
      download: {
        instructions: 'As fotografias são entregues em JPEG. O negativo digitalizado pode ser solicitado à Divisão de Geoinformação.'
      }
    },
    {
      id: 'fab-pr-1976',
      enabled: true,
      initiallyActive: false,
      sortOrder: 30,
      title: 'FAB/DSG 1976',
      shortTitle: 'FAB/DSG 1976',
      summary: 'Cobertura aerofotogramétrica do Paraná e do norte de Santa Catarina, na escala 1:110.000, executada em 1976.',
      description: [
        'Cobertura aerofotogramétrica do voo FAB/DSG, abrangendo o Paraná e o norte de Santa Catarina, das folhas 2799 às 2889.',
        'Dezessete faixas no sentido leste-oeste (FX-01 a FX-17), com as 400 fotografias digitalizadas do voo.',
        'O contorno exibido é aproximado e serve para localizar a fotografia, não como medida cartográfica.'
      ],
      period: {
        start: '1976-01-01',
        end: '1976-12-31',
        display: '1976'
      },
      institution: '1ª Divisão de Levantamento',
      contractor: 'Força Aérea Brasileira e Diretoria de Serviço Geográfico',
      nominalScale: '1:110.000',
      spatialCoverage: 'Paraná e norte de Santa Catarina',
      photoCount: 400,
      license: {
        label: 'Acervo do 1º Centro de Geoinformação - uso interno'
      },
      credits: 'Voo FAB/DSG. Foto-índice da 1ª Divisão de Levantamento.',
      links: [],
      extent: [-54.890124, -27.109461, -51.443551, -24.389154],
      data: {
        footprintsUrl: './data/fab-pr-1976/footprints.geojson',
        coverageUrl: './data/fab-pr-1976/cobertura.geojson'
      },
      style: {
        color: '#166534',
        fillOpacity: 0.14,
        lineOpacity: 0.9
      },
      download: {
        instructions: 'As fotografias são entregues em JPEG. O negativo digitalizado pode ser solicitado à Divisão de Geoinformação. Deste voo, 13 fotografias citadas no foto-índice nunca foram digitalizadas e por isso não constam aqui.'
      }
    },
    {
      id: 'sacs-1975',
      enabled: true,
      initiallyActive: false,
      sortOrder: 40,
      title: 'SACS 1975',
      shortTitle: 'SACS 1975',
      summary: 'Cobertura aerofotogramétrica do Rio Grande do Sul e entorno, na escala 1:110.000, executada em 1975 pela Cruzeiro do Sul.',
      description: [
        'Cobertura aerofotogramétrica do voo SACS, abrangendo o Rio Grande do Sul e áreas vizinhas, com 79 faixas e 2.058 fotografias.',
        'O contorno exibido é aproximado e serve para localizar a fotografia, não como medida cartográfica.',
        'A grade deste voo foi montada sobre um foto-índice que cobre mais de um fuso UTM projetado numa zona única, o que aumenta a imprecisão nas bordas leste e oeste da cobertura.'
      ],
      period: {
        start: '1975-01-01',
        end: '1975-12-31',
        display: '1975'
      },
      institution: '1ª Divisão de Levantamento',
      contractor: 'Cruzeiro do Sul S.A.',
      camera: 'Super-grande-angular, distância focal de cerca de 88 mm',
      nominalScale: '1:110.000',
      spatialCoverage: 'Rio Grande do Sul e entorno',
      photoCount: 2058,
      license: {
        label: 'Acervo do 1º Centro de Geoinformação - uso interno'
      },
      credits: 'Voo executado pela Cruzeiro do Sul S.A. Foto-índice da 1ª Divisão de Levantamento.',
      links: [],
      extent: [-57.840755, -33.163843, -49.199524, -26.875202],
      data: {
        footprintsUrl: './data/sacs-1975/footprints.geojson',
        coverageUrl: './data/sacs-1975/cobertura.geojson'
      },
      style: {
        color: '#7c3aed',
        fillOpacity: 0.14,
        lineOpacity: 0.9
      },
      download: {
        instructions: 'As fotografias são entregues em JPEG. O negativo digitalizado pode ser solicitado à Divisão de Geoinformação. Deste voo, 250 fotografias não constavam no foto-índice e tiveram o contorno acrescentado por casamento com as fotografias vizinhas; a ficha de cada uma indica isso.'
      }
    },
    {
      id: 'ast10-1964',
      enabled: true,
      initiallyActive: false,
      sortOrder: 50,
      title: 'AST-10 1964-1966',
      shortTitle: 'AST-10',
      summary: 'Cobertura aerofotogramétrica do Sul do Brasil na escala 1:60.000, voada entre 1964 e 1966 em cooperação Brasil e Estados Unidos.',
      description: [
        'Cobertura aerofotogramétrica do voo AST-10, projeto AF-63-32, executado em cooperação entre o Exército Brasileiro e a Força Aérea dos Estados Unidos.',
        'Voado a 9.144 metros de altura com câmara de 152,4 mm de distância focal, em 206 rolos e 230 faixas, cobrindo 200 folhas na escala 1:100.000.',
        'O contorno exibido é aproximado e serve para localizar a fotografia, não como medida cartográfica. É a maior cobertura do acervo e a mais antiga.'
      ],
      period: {
        start: '1964-11-03',
        end: '1966-09-25',
        display: 'de novembro de 1964 a setembro de 1966'
      },
      institution: '1ª Divisão de Levantamento',
      contractor: 'Força Aérea dos Estados Unidos',
      camera: 'Câmara métrica de 152,4 mm (6 polegadas)',
      nominalScale: '1:60.000',
      filmType: 'Pancromático',
      spatialCoverage: 'Sul do Brasil',
      photoCount: 7951,
      license: {
        label: 'Acervo do 1º Centro de Geoinformação - uso interno'
      },
      credits: 'Projeto AF-63-32, cooperação Brasil e Estados Unidos. Cópias de depósito da CPRM. Foto-índice e grade da 1ª Divisão de Levantamento.',
      links: [],
      extent: [-57.680610, -34.102755, -47.783016, -23.212490],
      data: {
        footprintsUrl: './data/ast10-1964/footprints.geojson',
        coverageUrl: './data/ast10-1964/cobertura.geojson'
      },
      style: {
        color: '#be123c',
        fillOpacity: 0.12,
        lineOpacity: 0.85
      },
      download: {
        instructions: 'As fotografias são entregues em JPEG. O negativo digitalizado pode ser solicitado à Divisão de Geoinformação. Neste voo, 182 fotografias têm posição declarada não confiável pela grade de origem, e isso vem indicado na ficha de cada uma.'
      }
    },
    {
      id: 'pr-itc-1980',
      enabled: true,
      initiallyActive: false,
      sortOrder: 60,
      title: 'Aerolevantamento ITC-PR 1980',
      shortTitle: 'ITC-PR 1980',
      summary: 'Cobertura aerofotogramétrica do Estado do Paraná na escala 1:25.000, executada em 1980 pelo Instituto de Terras e Cartografia do Paraná.',
      description: [
        'Recobrimento aerofotogramétrico do Estado do Paraná em 1980, na escala 1:25.000.',
        'Fotografias e articulação originais do Instituto Água e Terra (IAT/ITCG), Governo do Paraná, publicadas como dado aberto no GeoPR.',
        'O contorno foi reconstruído pela Divisão de Geoinformação: tamanho, forma e rotação são medidos, mas a posição é a da fonte, com incerteza da ordem de 1 km. Serve para localizar a fotografia, não como medida cartográfica.'
      ],
      period: {
        start: '1980-01-01',
        end: '1980-12-31',
        display: '1980'
      },
      institution: 'Instituto de Terras e Cartografia do Paraná (ITC-PR)',
      contractor: null,
      nominalScale: '1:25.000',
      filmType: 'Preto e branco',
      spatialCoverage: 'Estado do Paraná',
      photoCount: 28069,
      license: {
        label: 'Instituto Água e Terra (IAT/ITCG), Governo do Paraná - dado público'
      },
      credits: 'Fotografias e articulação do Instituto Água e Terra (IAT/ITCG), Governo do Paraná, via GeoPR. Contornos reconstruídos pelo 1º Centro de Geoinformação.',
      links: [
        {
          label: 'Articulação original no GeoPR (IAT)',
          url: 'https://geopr.iat.pr.gov.br/portal/apps/mapviewer/index.html?layers=db5f33c162fc43cba2220075c3d2558e'
        }
      ],
      extent: [-54.640530, -26.749271, -48.072310, -22.487425],
      data: {
        footprintsUrl: './data/pr-itc-1980/footprints.geojson',
        coverageUrl: './data/pr-itc-1980/cobertura.geojson'
      },
      style: {
        color: '#0f766e',
        fillOpacity: 0.12,
        lineOpacity: 0.85
      },
      download: {
        instructions: 'As fotografias são entregues em JPEG de 4.000 px, em tons de cinza. O arquivo em resolução integral permanece no acervo do IAT e pode ser obtido no GeoPR.'
      }
    }
  ]
};

