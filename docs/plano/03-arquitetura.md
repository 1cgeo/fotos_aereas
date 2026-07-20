# Arquitetura técnica

## Visão geral

```text
config.js
   |
   v
validação do catálogo -----> painel de projetos
   |
   v
carregador GeoJSON -----> cache da sessão -----> MapLibre
   |                              |
   v                              v
índices espaciais <----- motor de consulta -----> estado de resultados
                                                  |          |
                                                  v          v
                                                painel     destaque
                                                  |
                                                  v
                                      PDF + fila de downloads
```

A fonte de verdade funcional é o estado JavaScript e o GeoJSON carregado, não as feições atualmente renderizadas pelo mapa. Isso permite pesquisar projetos cujas grades não estejam visíveis e evita perder polígonos por estilo, zoom ou sobreposição.

## Dependências de produção previstas

| Pacote | Responsabilidade | Observação |
|---|---|---|
| `maplibre-gl` | mapa, fontes e camadas | Dependência central. |
| `@turf/boolean-point-in-polygon` | refinamento da consulta por ponto | Importação modular. |
| `@turf/boolean-intersects` | refinamento da consulta por área | Importação modular. |
| `@turf/bbox` | caixas envolventes | Usado na carga e consulta. |
| `rbush` | índice espacial de caixas | Um índice por projeto. |
| `pdf-lib` | geração do relatório | Executado somente sob demanda. |

As versões devem ser fixadas pelo lockfile na implementação. A ferramenta de desenho não usará plugin: ela será um módulo da aplicação, construído com eventos de ponteiro do MapLibre e sources/layers GeoJSON dedicadas.

## Dependências de desenvolvimento previstas

- Vite para servidor local e build.
- Vitest para testes unitários e de integração sem navegador completo.
- Playwright para fluxos de interface em navegador real.
- ESLint para erros e consistência do JavaScript.
- Prettier apenas se a equipe quiser formatação automática.

O uso de bibliotecas especializadas não transforma a aplicação em um framework de interface. DOM, componentes visuais e ciclo de vida continuam escritos em JavaScript nativo.

## Estrutura prevista

```text
site_fotos_aereas/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── public/
│   ├── config.js
│   ├── assets/
│   │   ├── logo.svg
│   │   └── pdf/
│   └── data/
│       └── <project-id>/
│           ├── footprints.geojson
│           └── thumbnails/
├── src/
│   ├── main.js
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── base.css
│   │   ├── layout.css
│   │   └── components.css
│   ├── app/
│   │   ├── store.js
│   │   ├── actions.js
│   │   └── selectors.js
│   ├── config/
│   │   ├── load-config.js
│   │   └── validate-config.js
│   ├── data/
│   │   ├── project-repository.js
│   │   ├── validate-geojson.js
│   │   └── spatial-index.js
│   ├── map/
│   │   ├── create-map.js
│   │   ├── project-layers.js
│   │   └── highlight-layer.js
│   ├── tools/
│   │   ├── tool-manager.js
│   │   ├── tool-contract.js
│   │   ├── cleanup-scope.js
│   │   ├── point-query/
│   │   │   └── point-query-tool.js
│   │   └── polygon-query/
│   │       ├── polygon-query-tool.js
│   │       ├── polygon-drawing-model.js
│   │       ├── polygon-geometry.js
│   │       └── drawing-controls.js
│   ├── analysis/
│   │   ├── analysis-contract.js
│   │   ├── analysis-registry.js
│   │   ├── analysis-runner.js
│   │   ├── query-scope.js
│   │   ├── point-intersection.analysis.js
│   │   ├── polygon-intersection.analysis.js
│   │   └── result-normalizer.js
│   ├── ui/
│   │   ├── shell.js
│   │   ├── project-list.js
│   │   ├── project-details.js
│   │   ├── query-toolbar.js
│   │   ├── result-list.js
│   │   └── download-queue.js
│   ├── report/
│   │   ├── build-report-model.js
│   │   └── generate-pdf.js
│   └── download/
│       ├── create-queue.js
│       └── trigger-download.js
├── tests/
│   ├── fixtures/
│   ├── unit/
│   └── e2e/
└── docs/
    └── plano/
```

Se `config.js` precisar ser alterado depois do build sem recompilar, ele deve ficar em `public/` e ser carregado em tempo de execução. O arquivo não deve ser importado estaticamente pelo bundle.

## Módulos e limites

### Catálogo

Carrega e valida a configuração. Expõe objetos normalizados e imutáveis para o restante da aplicação.

### Repositório de projetos

Controla o ciclo `não carregado -> carregando -> pronto | erro`, deduplica requisições simultâneas e mantém GeoJSON e índice espacial na sessão.

### Mapa

Traduz estado de projetos e destaques em sources/layers MapLibre. Não decide regras de consulta nem modifica metadados.

### Gerenciador de ferramentas

Mantém no máximo uma ferramenta interativa ativa: ponto ou polígono. Ativar uma desativa e limpa a anterior antes de instalar os novos handlers. O gerenciador sincroniza `activeToolId` com o store e fornece uma única ação de cancelamento para botão, chip e tecla `Esc`.

Ele não conhece regras espaciais, projetos ou resultados. Seu contrato mínimo é:

```js
{
  id: 'point-query | polygon-query',
  label: '...',
  activate(context),
  deactivate(reason),
  destroy()
}
```

Não é necessária uma classe-base extensa. Um contrato JSDoc e composição mantêm a implementação menor e evitam trazer interfaces de clipboard, persistência e seleção que pertencem ao EBGeo, mas não a este portal.

### Ferramentas de consulta

Cada ferramenta traduz interação do mapa em uma geometria de entrada e solicita execução ao runner:

- `point-query-tool`: cursor, clique, marcador e chamada da análise de ponto;
- `polygon-query-tool`: ciclo do desenho, preview, controles, edição e chamada da análise de polígono.

A ferramenta não percorre projetos nem calcula interseções. Também não renderiza a lista de resultados.

### Modelo e geometria do polígono

`polygon-drawing-model.js` implementa a máquina de estados sem acessar MapLibre. `polygon-geometry.js` contém funções puras para fechar anel, validar, detectar auto-interseção, criar alças e mover vértice. Isso permite testar quase todo o desenho sem canvas ou navegador.

### Runner e análises

O runner coordena o fluxo comum `validar -> congelar escopo -> carregar projetos -> executar -> agregar -> deduplicar -> ordenar -> publicar`. Ele controla progresso, cancelamento, falhas parciais e descarte de respostas antigas.

Cada análise implementa um contrato pequeno:

```js
{
  id: 'point-intersection | polygon-intersection',
  inputGeometryTypes: ['Point'],
  validate(input),
  executeProject({ geometry, project, data, spatialIndex, signal })
}
```

`executeProject` é pura em relação à interface: não acessa DOM, MapLibre ou store, não carrega rede e não publica resultados. A análise retorna correspondências normalizadas ou lança erro controlado. O registro possui somente as duas definições conhecidas e rejeita IDs duplicados.

### Interface

Renderiza HTML seguro com `textContent`, associa eventos e despacha ações. Cada renderizador recebe somente o recorte de estado que necessita.

### Relatório e downloads

Cria primeiro um modelo imutável da seleção. O PDF e a fila usam esse mesmo snapshot, de modo que os dois documentos não divirjam se o estado do mapa mudar.

### Escopo de limpeza

Todo componente interativo cria um `cleanup-scope` que registra:

- listeners do MapLibre e do DOM;
- inscrições no store;
- timers;
- IDs de `requestAnimationFrame`;
- `AbortController` de tarefas iniciadas pela ferramenta;
- restauração de cursor, `dragPan` e outros handlers temporariamente alterados.

`cleanup()` é idempotente e executado em desativação, troca de ferramenta, erro de ativação e destruição do mapa. Artefatos da interação em andamento são removidos; marcador, geometria concluída e resultados da consulta permanecem até `Limpar consulta`.

## Padrões adaptados do EBGeo Web

Referências locais principais:

- `D:\repositorios\ebgeo_web\src\js\tool_manager\tool_manager.js`;
- `D:\repositorios\ebgeo_web\src\js\tool_manager\base_control.js`;
- `D:\repositorios\ebgeo_web\src\js\tool_manager\base_geometry.js`;
- `D:\repositorios\ebgeo_web\src\js\draw_tools\polygon_tool\add_polygon_control.js`;
- `D:\repositorios\ebgeo_web\src\js\draw_tools\polygon_tool\add_polygon_geometry.js`;
- `D:\repositorios\ebgeo_web\src\js\draw_tools\drawing-touch-helpers.js`;
- `D:\repositorios\ebgeo_web\src\js\processing\algorithms\algorithm.interface.js`;
- `D:\repositorios\ebgeo_web\src\js\processing\processing-runner.js`;
- `D:\repositorios\ebgeo_web\src\js\utilities\event-cleanup.js`.

Padrões aproveitados:

- exclusividade e toggle de ferramenta no gerenciador;
- ciclo `activate/deactivate` inequívoco;
- controle de mapa separado de geometria;
- preview por RAF e cancelamento explícito;
- alças como features GeoJSON consultadas em camada própria;
- botões de concluir/desfazer para toque;
- contrato de algoritmo, execução pura e runner coordenador;
- utilitário central para prevenir vazamento de listeners e timers.

Adaptações deliberadas:

- não usar a classe-base ampla de edição, pois o portal não tem clipboard, grupos ou persistência de feições desenhadas;
- não persistir resultados como novas camadas: resultados são efêmeros e pertencem ao snapshot da consulta;
- não criar painel genérico de parâmetros: as duas ferramentas possuem interface fixa;
- não depender de clique direito para concluir, porque botão e teclado são mais descobríveis e funcionam em toque;
- não usar variável Turf global; importar funções modulares;
- não copiar renderização por `innerHTML`; seguir as regras de DOM seguro deste plano.

## Estado da aplicação

```js
{
  catalog: {
    status: 'loading | ready | error',
    projects: [],
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
    activeToolId: 'point-query | polygon-query | null',
    activationError: null
  },
  query: {
    status: 'idle | loading-projects | running | ready | partial | cancelled | error',
    geometry: null,
    scopeProjectIds: [],
    results: [],
    projectErrors: []
  },
  downloads: {
    snapshotId: null,
    reportStatus: 'idle | generating | ready | error',
    items: [],
    baixados: new Set() // chaves ja acionadas; permite rebaixar
  }
}
```

O store pode ser um pequeno módulo com `getState`, `dispatch` e `subscribe`. Não é necessário reproduzir Redux; atualizações devem ser explícitas, serializáveis quando possível e testáveis.

## Inicialização

1. Renderizar o shell e o estado inicial de carregamento.
2. Buscar `config.js` com tratamento de timeout/erro.
3. Validar e normalizar o catálogo.
4. Criar o mapa usando o estilo configurado.
5. Renderizar catálogo e ferramentas desabilitadas até mapa e configuração estarem prontos.
6. Carregar somente projetos marcados com `initiallyActive`.
7. Restaurar estado compartilhável da URL somente depois da validação.

## Tratamento de concorrência

- Cada carga de projeto compartilha a mesma `Promise` enquanto estiver em andamento.
- Uma consulta recebe um `queryId`; resultados atrasados de consultas antigas são descartados.
- `AbortController` cancela `fetch` quando a consulta global é cancelada.
- Desligar um projeto durante uma consulta não altera o snapshot daquela consulta; a próxima consulta usa o novo escopo.
- Gerar relatório desabilita nova preparação, mas não bloqueia a navegação no mapa.

## Build e configuração de base

O `vite.config.js` deve aceitar uma variável de ambiente pública para `base`, permitindo publicar na raiz de um domínio ou em um subdiretório. URLs internas de dados devem ser resolvidas com `new URL(relativePath, configUrl)` ou uma função equivalente, nunca concatenadas supondo `/` como raiz.
