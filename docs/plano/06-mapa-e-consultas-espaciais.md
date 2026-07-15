# Mapa e consultas espaciais

## Princípio de implementação

O MapLibre é responsável por apresentar as grades, mas não é a fonte de verdade das consultas. `queryRenderedFeatures` considera o que está renderizado no estilo e na área consultada. A regra do produto precisa também pesquisar projetos não visíveis no modo global e retornar sobreposições sem depender da ordem de desenho.

Por isso, cada GeoJSON carregado tem duas representações:

- uma source GeoJSON do MapLibre, quando o projeto estiver visível;
- um conjunto normalizado em memória com índice espacial, usado nas consultas.

## Mapa-base

O `config.js` fornece uma URL de estilo MapLibre. O estilo deve usar dados derivados do OSM e apresentar a atribuição exigida pelo provedor.

O portal não deve depender, em produção de volume relevante, dos tiles comunitários de `tile.openstreetmap.org`. Deve-se escolher um provedor compatível com o tráfego esperado ou hospedar tiles próprios. O botão de download baixa somente as fotografias do acervo; jamais tiles do mapa-base.

## Camadas das grades

Para cada projeto ativo:

```text
source: project:<projectId>:footprints
layer:  project:<projectId>:fill
layer:  project:<projectId>:outline
```

Camadas globais acima das grades:

```text
source: query:point
layer:  query:point-symbol
source: query:drawing
layer:  query:drawing-fill
layer:  query:drawing-line
layer:  query:drawing-preview-line
layer:  query:drawing-vertices
source: highlight:footprint
layer:  highlight:fill
layer:  highlight:outline
```

O destaque usa uma source própria contendo uma cópia da feição normalizada. Assim, funciona de maneira uniforme mesmo quando as grades usam cores distintas.

## Ciclo de carga de projeto

1. Resolver `footprintsUrl`.
2. Buscar com `fetch` e `AbortSignal`.
3. Confirmar status HTTP e tipo de conteúdo aceitável.
4. Analisar JSON com tratamento de erro.
5. Validar `FeatureCollection` e feições.
6. Resolver URLs relativas de miniatura e download.
7. Injetar `projectId` no modelo normalizado.
8. Calcular a caixa envolvente de cada feição.
9. Criar o RBush com itens `{ minX, minY, maxX, maxY, featureIndex }`.
10. Guardar dados e índice no repositório.
11. Se o projeto estiver ligado, adicionar ou atualizar sua source e camadas.

Uma carga simultaneamente solicitada pela visualização e por consulta global deve reutilizar a mesma Promise.

## Resolução do escopo

```js
function resolveQueryScope(catalogProjects, activeIds) {
  if (activeIds.size > 0) {
    return catalogProjects.filter((project) => activeIds.has(project.id));
  }

  return catalogProjects.filter((project) => project.enabled);
}
```

O resultado do escopo é copiado para `query.scopeProjectIds` no início da consulta. Mudanças posteriores nos switches não reescrevem silenciosamente resultados existentes.

## Organização das ferramentas e análises

Inspirado no padrão observado no EBGeo Web, o portal separa quatro responsabilidades:

```text
ToolManager
   |
   +--> ferramenta de ponto --------+
   |                                |
   +--> ferramenta de polígono      +--> AnalysisRunner --> análise pura
             |                      |          |
             +--> modelo/geometria -+          +--> resultados no store
```

- **ToolManager:** exclusividade, ativação, desativação e estado visual da ferramenta ativa.
- **Tool:** eventos do mapa, cursor, preview e tradução da interação em GeoJSON.
- **Modelo/geometria:** estado e operações puras do desenho.
- **AnalysisRunner:** escopo, carregamento, progresso, cancelamento, falhas parciais e publicação.
- **Análise:** recebe geometria, dados e índice de um projeto; retorna correspondências sem acessar UI.

Fluxo comum:

1. A toolbar solicita `toolManager.activate(toolId)`.
2. O gerenciador desativa e limpa a ferramenta anterior.
3. A nova ferramenta instala handlers em um escopo de limpeza próprio.
4. A ferramenta produz `Point` ou `Polygon` válido.
5. O runner congela o escopo e atribui um `queryId`.
6. O runner garante que os projetos estejam carregados e emite progresso.
7. A análise registrada roda uma vez por projeto.
8. O runner agrega, deduplica, ordena e despacha um único resultado.
9. A interface reage ao store; a ferramenta não manipula o painel.

Falha ao ativar uma ferramenta deve restaurar cursor e handlers anteriores e deixar `activeToolId = null`. Desativar a ferramenta interrompe apenas a captura de nova geometria; a consulta concluída permanece visível até `Limpar consulta`.

## Consulta por ponto

Entrada: `Point` GeoJSON em EPSG:4326 e lista de projetos do snapshot.

A ferramenta de ponto possui apenas o ciclo de interação: mudar cursor, aceitar um clique válido, atualizar o marcador e chamar `analysisRunner.run('point-intersection', point)`. Ela não percorre GeoJSON diretamente.

Para cada projeto:

1. Buscar no índice usando uma caixa degenerada: `minX = maxX = longitude` e `minY = maxY = latitude`.
2. Executar `booleanPointInPolygon(point, feature, { ignoreBoundary: false })` em cada candidato.
3. Converter correspondências em modelos de resultado.
4. Agregar, deduplicar e ordenar todos os projetos.

O índice elimina rapidamente polígonos distantes. O teste Turf elimina falsos positivos causados por caixas envolventes, buracos e geometrias côncavas.

O clique é uma coordenada exata, não um raio em pixels. Uma futura opção de tolerância deve ser apresentada como outro tipo de busca e não alterar esta regra silenciosamente.

## Ferramenta própria de desenho

Nenhum plugin de desenho será usado. A implementação adota a separação controle/geometria vista no EBGeo Web, reduzida ao fluxo de consulta:

- `polygon-query-tool.js`: integração com ToolManager e MapLibre;
- `polygon-drawing-model.js`: máquina de estados e comandos;
- `polygon-geometry.js`: fechamento, validação, segmentos e alças;
- `drawing-controls.js`: concluir, desfazer, editar, cancelar e mensagens;
- `polygon-intersection.analysis.js`: consulta espacial pura, fora da ferramenta.

A ferramenta possui um `cleanup-scope` desde a ativação. Todo `map.on`, listener DOM, timer, RAF, alteração de cursor e desabilitação de `dragPan` deve registrar sua reversão nesse escopo.

### Estados

```text
inactive
   |
   | ativar
   v
ready
   |
   | primeiro vértice
   v
drawing <---- desfazer vértice
   |
   | concluir
   v
complete
   |
   | editar
   v
editing ----> complete
   |
   | limpar
   v
ready
```

Estado mínimo:

```js
{
  mode: 'inactive | ready | drawing | complete | editing',
  vertices: [],
  previewCoordinate: null,
  draggedVertexIndex: null,
  validationError: null
}
```

As transições são comandos puros do modelo, como `start`, `addVertex`, `setPreview`, `undoVertex`, `finish`, `beginEdit`, `moveVertex`, `commitEdit`, `cancelEdit` e `reset`. O controle converte eventos em comandos e redesenha a source a partir do estado retornado.

`vertices` é a única fonte de verdade e não repete o primeiro ponto no final. A representação GeoJSON fechada é sempre derivada por `polygon-geometry.js`. Preview, alças e consulta nunca mantêm cópias editáveis concorrentes das coordenadas.

### Criação do polígono

- `click` no mapa adiciona um vértice em `[lng, lat]`.
- `mousemove` atualiza somente a linha de pré-visualização; não altera os vértices confirmados.
- `Desfazer último ponto` remove o último vértice.
- `Concluir área` fica habilitado com pelo menos três vértices distintos.
- Clicar no primeiro vértice também conclui em dispositivos com ponteiro preciso.
- `Enter` conclui quando válido; `Backspace` desfaz; `Esc` cancela o desenho corrente.
- A conclusão gera o anel GeoJSON fechado repetindo a primeira coordenada, sem duplicá-la no modelo.
- Duplo clique não é necessário, evitando conflito com o zoom do MapLibre.

Os botões `Desfazer`, `Concluir` e `Cancelar` ficam visíveis durante o desenho em todos os dispositivos. Em toque, devem permanecer em área alcançável e ter alvo mínimo adequado; no desktop, complementam os atalhos e tornam a conclusão descobrível. Um chip `Ferramenta ativa: Desenhar área` oferece cancelamento direto.

Prioridade da tecla `Esc`:

1. durante arraste de alça, reverter o arraste corrente;
2. durante desenho com vértices, descartar somente o rascunho e voltar a `ready`;
3. durante carregamento/análise, cancelar o runner e desativar a ferramenta;
4. sem operação intermediária, desativar a ferramenta.

Trocar de ferramenta cancela rascunho e execução ainda em andamento. Consulta já concluída permanece até ser substituída por outra ou limpa explicitamente.

Durante `drawing`, o pan continua disponível por arraste fora dos vértices, mas um clique simples cria ponto. Se os testes de usabilidade mostrarem conflito, a aplicação pode exigir uma tecla modificadora para pan no desktop e oferecer botões de zoom. Essa decisão deve ser validada no protótipo.

### Representação visual

Uma única source `query:drawing` é atualizada com uma `FeatureCollection` contendo:

- `Polygon` fechado quando completo;
- `LineString` dos vértices confirmados durante o desenho;
- `LineString` entre o último vértice e o ponteiro;
- `Point` para cada vértice, com propriedade `vertexIndex`;
- primeiro vértice com propriedade visual distinta quando pode concluir.

Atualizações de `mousemove` devem ser limitadas a uma por quadro com `requestAnimationFrame`.

O modelo gera o estado; uma função adaptadora gera a `FeatureCollection`; somente o controle chama `source.setData`. Nenhuma função geométrica acessa a instância do mapa.

### Validação

Antes de adicionar um segmento e antes de concluir:

- rejeitar coordenada idêntica à anterior;
- verificar interseção do novo segmento com segmentos não adjacentes;
- rejeitar polígono auto-intersectante;
- rejeitar área praticamente nula;
- limitar o número de vértices por configuração defensiva, com padrão alto o bastante para uso normal;
- informar o erro junto aos controles, preservando os vértices válidos.

O teste de interseção entre segmentos pode ser uma função geométrica interna pequena e coberta por testes. Não é necessário adicionar uma biblioteca de desenho para isso.

### Edição

Na primeira versão, editar significa mover vértices existentes:

1. `Editar área` mostra alças de vértice.
2. `pointerdown`/evento equivalente sobre uma alça identifica `vertexIndex` por `queryRenderedFeatures` apenas na camada de vértices.
3. O pan do mapa é temporariamente desabilitado.
4. Movimento atualiza o vértice; a coordenada final do anel fechado é regenerada automaticamente.
5. Soltar valida a geometria; posição inválida reverte ao snapshot anterior.
6. `Concluir edição` dispara uma nova consulta.

Adicionar ou remover um vértice durante edição é P1. Redesenhar por completo continua disponível no P0.

As alças são features `Point` em source própria, com propriedades internas fechadas como `{ role: 'handle', handleType: 'vertex', vertexIndex }`. A seleção de alça é o único uso de `queryRenderedFeatures` na edição; a consulta das fotografias continua usando os índices canônicos.

Todo caminho que desabilita `dragPan` deve reabilitá-lo em `pointerup`, cancelamento, perda de foco, erro e destruição da ferramenta.

## Consulta por polígono

Entrada: `Polygon` simples, validado, e lista de projetos do snapshot.

1. Calcular `bbox` do polígono desenhado.
2. Para cada projeto, buscar candidatos no RBush.
3. Aplicar `booleanIntersects(drawnPolygon, footprint)` em cada candidato.
4. Agregar, deduplicar e ordenar.

`booleanIntersects` deve considerar toque de borda como resultado. Fixtures de teste devem cobrir contenção nos dois sentidos, cruzamento, toque, buraco e falso positivo de bbox.

## Concorrência e cancelamento

Consultas restritas a projetos já carregados podem rodar sincronamente se o conjunto de candidatos for pequeno. Consultas maiores devem ceder ao event loop entre projetos para manter feedback visual.

Se medições mostrarem bloqueios perceptíveis, o motor e os índices devem migrar para Web Worker sem alterar sua API pública. A primeira implementação deve manter funções puras e objetos estruturavelmente clonáveis para facilitar essa evolução.

Cada consulta usa um token. Cancelar ou iniciar outra consulta invalida o token anterior; resultados que chegarem depois não atualizam a interface.

O runner possui estados explícitos `idle`, `loading-projects`, `running`, `ready`, `partial`, `cancelled` e `error`. A análise recebe `AbortSignal` para verificar cancelamento entre lotes, embora funções Turf já iniciadas não possam ser interrompidas no meio de uma chamada síncrona.

## Casos geográficos especiais

- Polígonos com buracos: suportados nas grades.
- MultiPolygon: suportado nas grades.
- Polígono desenhado com buraco: fora do escopo.
- Cruzamento do antimeridiano: fora do escopo inicial e deve ser rejeitado com mensagem clara se puder ocorrer no acervo.
- Regiões polares: fora do escopo esperado.
- Geometrias inválidas: projeto entra em erro; não corrigir silenciosamente no cliente.

## Cores e sobreposições

O preenchimento das grades deve ser translúcido, com contorno mais opaco. Com muitos projetos ativos, o mapa pode ficar visualmente denso; por isso:

- o painel identifica a cor de cada projeto;
- hover/foco aumenta espessura e muda preenchimento;
- a lista textual mantém projeto e foto explícitos;
- uma opção P1 pode reduzir temporariamente a opacidade de grades não focadas.
