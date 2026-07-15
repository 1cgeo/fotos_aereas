# Configuração e contratos de dados

## Estratégia para `config.js`

O arquivo será um recurso público carregado em tempo de execução. Isso permite cadastrar ou corrigir um projeto sem recompilar o JavaScript da aplicação.

Uma forma simples é o arquivo atribuir um objeto versionado a uma chave conhecida de `globalThis`:

```js
globalThis.AERIAL_CATALOG_CONFIG = {
  schemaVersion: 1,
  site: {},
  basemap: {},
  projects: []
};
```

O carregador cria um elemento `<script src=".../config.js">`, espera `load`, lê `globalThis.AERIAL_CATALOG_CONFIG`, valida e remove a referência global. Essa abordagem funciona em hospedagem estática e evita que o Vite incorpore a configuração ao bundle.

O arquivo é JavaScript público: não pode conter token secreto, credencial, URL assinada permanente nem dado pessoal não publicável.

Como `config.js` é executável, ele deve ser servido apenas pelo mesmo origin, revisado como código e conter somente a atribuição declarativa mostrada abaixo. A validação posterior do objeto não protege contra um arquivo JavaScript adulterado. Os controles completos estão em [Segurança do `config.js`](08-desempenho-seguranca-operacao.md#segurança-do-configjs).

## Exemplo completo

```js
globalThis.AERIAL_CATALOG_CONFIG = {
  schemaVersion: 1,

  site: {
    title: 'Acervo de Fotografias Aéreas Históricas',
    shortTitle: 'Fotos Aéreas',
    description: 'Consulte coberturas e baixe fotografias do acervo.',
    locale: 'pt-BR',
    contact: {
      label: 'Contato do acervo',
      url: 'https://example.gov.br/contato'
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
    styleUrl: 'https://provedor.example/styles/osm/style.json',
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
      id: 'municipio-1958',
      enabled: true,
      initiallyActive: false,
      sortOrder: 10,
      title: 'Aerolevantamento Municipal de 1958',
      shortTitle: 'Município 1958',
      summary: 'Cobertura aerofotogramétrica da área urbana e entorno.',
      description: [
        'Primeiro parágrafo da descrição.',
        'Segundo parágrafo, sem HTML.'
      ],
      period: {
        start: '1958-05-03',
        end: '1958-06-14',
        display: 'maio a junho de 1958'
      },
      institution: 'Instituição responsável',
      contractor: 'Empresa executora',
      aircraft: 'Modelo, se conhecido',
      camera: 'Câmera, se conhecida',
      nominalScale: '1:20.000',
      filmType: 'Pancromático',
      spatialCoverage: 'Município e entorno',
      photoCount: 842,
      license: {
        label: 'Licença ou condição de uso',
        url: 'https://example.gov.br/licenca'
      },
      credits: 'Acervo e digitalização: Instituição responsável.',
      links: [
        {
          label: 'Saiba mais sobre o projeto',
          url: 'https://example.gov.br/projetos/municipio-1958'
        }
      ],
      extent: [-48.25, -16.05, -47.55, -15.45],
      data: {
        footprintsUrl: './data/municipio-1958/footprints.geojson'
      },
      style: {
        color: '#b45309',
        fillOpacity: 0.12,
        lineOpacity: 0.8
      },
      download: {
        instructions: 'Os arquivos originais têm aproximadamente 250 MB.',
        termsUrl: 'https://example.gov.br/termos'
      }
    }
  ]
};
```

## Campos obrigatórios do catálogo

### Raiz

| Campo | Tipo | Regra |
|---|---|---|
| `schemaVersion` | inteiro | Obrigatório e igual a uma versão suportada. |
| `site` | objeto | Obrigatório. |
| `basemap` | objeto | Obrigatório. |
| `projects` | array | Obrigatório; pode estar vazio em ambiente de demonstração. |

`basemap.extraAttributions` usa pares de texto e URL. A interface cria os links com DOM seguro; não recebe HTML arbitrário da configuração. Atribuições que já vierem no style do provedor também devem ser preservadas pelo controle do MapLibre.

### Projeto

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | Único, estável, formato `^[a-z0-9]+(?:-[a-z0-9]+)*$`. |
| `enabled` | boolean | Projetos falsos não aparecem nem entram em consulta global. |
| `title` | string | Obrigatório. |
| `summary` | string | Obrigatório e curto. |
| `period.display` | string | Obrigatório quando datas exatas não forem conhecidas. |
| `extent` | quatro números | `[west, south, east, north]` em EPSG:4326. |
| `data.footprintsUrl` | string/URL | Obrigatório e resolvível a partir do `config.js`. |
| `style.color` | cor CSS hexadecimal | Obrigatório; contraste deve ser validado. |
| `license.label` | string | Obrigatório. |

Datas exatas usam ISO 8601. Incertezas históricas devem permanecer em texto editorial, sem inventar dia e mês.

## Contrato GeoJSON

Cada projeto possui um `FeatureCollection`. Cada fotografia é uma `Feature` com geometria `Polygon` ou `MultiPolygon`.

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": "foto-0123",
      "properties": {
        "photoId": "foto-0123",
        "photoNumber": "0123",
        "title": "Fotografia 0123",
        "flightLine": "FX-07",
        "capturedAt": "1958-05-17",
        "nominalScale": "1:20.000",
        "thumbnailUrl": "./thumbnails/foto-0123.webp",
        "downloadUrl": "https://arquivos.example.gov.br/municipio-1958/foto-0123.tif",
        "downloadFilename": "municipio-1958_foto-0123.tif",
        "mimeType": "image/tiff",
        "sizeBytes": 263192576,
        "checksumSha256": "hash-opcional-em-hexadecimal",
        "licenseLabel": "Mesmo regime do projeto",
        "notes": "Observação editorial opcional"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [-48.01, -15.81],
            [-47.96, -15.81],
            [-47.96, -15.76],
            [-48.01, -15.76],
            [-48.01, -15.81]
          ]
        ]
      }
    }
  ]
}
```

### Propriedades obrigatórias da foto

| Campo | Tipo | Uso |
|---|---|---|
| `photoId` | string | Identidade estável dentro do projeto. |
| `photoNumber` | string | Identificação exibida; string preserva zeros. |
| `title` | string | Rótulo acessível. |
| `downloadUrl` | string/URL | Endereço público do original. |
| `downloadFilename` | string | Nome sugerido, sem barras ou caracteres de controle. |
| `thumbnailUrl` | string/URL | Miniatura otimizada; pode usar placeholder se estiver ausente por migração. |

### Propriedades recomendadas

- `flightLine`
- `capturedAt`
- `nominalScale`
- `mimeType`
- `sizeBytes`
- `checksumSha256`
- `licenseLabel`
- `notes`

O `projectId` não precisa ser repetido em cada feição: o carregador o injeta no modelo normalizado a partir do projeto que declarou o arquivo. Se existir no GeoJSON, deve coincidir com o projeto, ou a carga falha.

## Regras geométricas

- CRS: WGS 84 (`EPSG:4326`).
- Ordem: longitude, latitude.
- Anéis fechados, com primeira e última coordenadas iguais.
- Pelo menos quatro coordenadas por anel fechado.
- Sem `GeometryCollection`.
- Polígonos devem ser válidos e não auto-intersectantes.
- Buracos e `MultiPolygon` são permitidos.
- Coordenadas devem estar dentro de longitude `[-180, 180]` e latitude `[-90, 90]`.
- A extensão calculada das feições deve ser compatível com `project.extent` dentro de tolerância documentada.

A validação geométrica pesada deve acontecer preferencialmente na preparação dos dados, antes da publicação. O navegador ainda verifica estrutura, tipos, IDs duplicados e faixas de coordenadas para falhar de modo compreensível.

## URLs e CORS

- URLs relativas do projeto são resolvidas em relação ao endereço do `config.js`.
- URLs relativas dentro do GeoJSON são resolvidas em relação ao próprio GeoJSON.
- GeoJSON e miniaturas em outro domínio precisam permitir CORS.
- Downloads por navegação direta podem estar em outro domínio, mas o nome sugerido por `download` pode ser ignorado pelo navegador.
- Todos os recursos devem usar HTTPS em produção.
- Redirecionamentos do servidor de arquivos precisam ser testados.

## Miniaturas

- Formato preferencial: WebP ou JPEG.
- Dimensão de referência: 320 px no maior lado.
- Tamanho-alvo: abaixo de 60 KB, aceitando exceções justificadas.
- Carregamento preguiçoso com `loading="lazy"`.
- `alt` deve identificar a fotografia; informações já adjacentes não precisam ser repetidas integralmente.
- Falha usa placeholder local e mantém o download acessível.

## Validação antes da publicação

Deve existir futuramente um script de linha de comando que:

1. carregue `config.js` de forma controlada;
2. valide IDs e campos obrigatórios;
3. abra cada GeoJSON;
4. valide estrutura, geometrias, duplicidades e URLs;
5. compare `photoCount` com o total real;
6. emita resumo por projeto e retorne código diferente de zero em erro;
7. opcionalmente faça requisições `HEAD` amostradas, sem baixar originais.

Esse validador é parte do plano de qualidade, embora o portal final continue sem backend.
