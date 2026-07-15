# Roteiro de implementação

## Como usar este roteiro

As fases são ordenadas por dependência e risco. Cada uma deve produzir software demonstrável e testes. Estimativas de tempo só devem ser feitas depois de confirmar volume de dados, hospedagem e disponibilidade de design/conteúdo.

## Fase 0 — Descoberta técnica e dados

### Objetivo

Eliminar riscos que podem mudar a arquitetura antes de construir a interface completa.

### Atividades

- Inventariar projetos, contagens, tamanhos de GeoJSON, vértices e originais.
- Confirmar CRS e validade das grades existentes.
- Auditar metadados disponíveis por projeto e foto.
- Confirmar hospedagem, CORS e cabeçalhos de downloads.
- Escolher e homologar o provedor OSM.
- Criar fixtures representativas e anonimizadas quando necessário.
- Prototipar MapLibre com o maior GeoJSON real.
- Prototipar índice espacial e medir ponto/área.
- Prototipar a ferramenta própria com criar, concluir, desfazer e arrastar vértice.
- Prototipar PDF com caracteres portugueses e tabela de 500 linhas.
- Testar um download grande real nos navegadores-alvo.

### Saída

- respostas às decisões de bloqueio;
- dataset de testes;
- medições registradas;
- confirmação ou ajuste da arquitetura GeoJSON + RBush.

### Critério de conclusão

Nenhum volume ou requisito de servidor conhecido invalida a aplicação estática proposta.

## Fase 1 — Fundação da aplicação

### Atividades

- Inicializar Vite vanilla JavaScript.
- Configurar scripts de desenvolvimento, build, preview, lint e teste.
- Criar HTML semântico, tokens CSS e layout responsivo inicial.
- Implementar store simples e tratamento global de erros.
- Implementar contrato mínimo de ferramenta, ToolManager e `cleanup-scope`.
- Criar chip/indicador da ferramenta ativa e cancelamento por `Esc`.
- Implementar carregamento runtime de `config.js`.
- Criar validação e normalização do catálogo.
- Criar um `config.example.js` documentado.
- Exibir catálogo, estados de carregamento e erros.

### Critério de conclusão

Uma configuração válida renderiza o catálogo; configurações inválidas geram mensagens específicas e testes.

## Fase 2 — Mapa e visualização de projetos

### Atividades

- Inicializar MapLibre com estilo configurável.
- Adicionar controles e atribuição.
- Implementar repositório de projetos e fetch deduplicado.
- Validar e normalizar GeoJSON.
- Resolver URLs relativas.
- Criar source e camadas por projeto.
- Implementar switches, cores, detalhes e enquadramento.
- Preservar cache ao desligar projeto.
- Implementar estados de erro isolados.

### Critério de conclusão

Um ou mais projetos podem ser ligados/desligados, suas grades e informações aparecem corretamente e uma falha não derruba o mapa.

## Fase 3 — Motor espacial e consulta por ponto

### Atividades

- Construir RBush por projeto durante a carga.
- Implementar contrato, registro e runner comum das análises.
- Implementar `point-intersection.analysis` como função pura por projeto.
- Implementar resolução e snapshot de escopo.
- Implementar carregamento global com concorrência limitada, progresso e cancelamento.
- Implementar ponto -> candidatos -> teste exato.
- Implementar `point-query-tool` limitado a cursor, clique, marcador e chamada do runner.
- Deduplicar, ordenar e agrupar resultados.
- Mostrar marcador de consulta.
- Criar lista textual inicial e estados vazio/parcial.
- Testar sobreposição dentro e entre projetos.

### Critério de conclusão

O clique retorna todas as fotos corretas com projetos ligados e no modo global, inclusive bordas, buracos e sobreposições.

## Fase 4 — Ferramenta própria de polígono

### Atividades

- Implementar máquina de estados do desenho.
- Separar `polygon-query-tool`, `polygon-drawing-model` e `polygon-geometry`.
- Criar source e camadas de linha, preenchimento, prévia e vértices.
- Capturar clique e movimento sobre o MapLibre.
- Implementar concluir por botão, primeiro vértice e teclado.
- Implementar desfazer, cancelar, limpar e redesenhar.
- Detectar segmentos inválidos e auto-interseção.
- Implementar edição por arraste de vértice.
- Garantir restauração dos handlers de pan em todos os caminhos.
- Implementar `polygon-intersection.analysis` com bbox -> candidatos -> `booleanIntersects`.
- Executar a análise exclusivamente pelo runner comum.
- Reutilizar painel, ordenação e estados da consulta por ponto.

### Critério de conclusão

O usuário cria e edita uma área válida, recebe todas as fotos intersectadas e não consegue concluir uma geometria inválida.

## Fase 5 — Painel final e sincronização

### Atividades

- Completar as quatro visões do painel.
- Criar cartões com miniatura lazy, metadados e download individual.
- Implementar destaque por hover, foco e detalhe fixado.
- Implementar paginação/renderização incremental.
- Refinar mensagens, totais por projeto e estado parcial.
- Implementar gaveta responsiva.
- Revisar teclado, foco, contraste e leitores de tela.

### Critério de conclusão

Mapa e painel permanecem sincronizados com mouse e teclado, e listas grandes continuam utilizáveis.

## Fase 6 — PDF e fila de downloads

### Atividades

- Criar snapshot imutável.
- Montar modelo do relatório.
- Incorporar fonte e gerar PDF paginado.
- Incluir resumo, projetos, grades/fotos, licenças e avisos.
- Baixar o PDF como Blob.
- Implementar fila e seus estados.
- Criar ações de baixar, confirmar, tentar novamente e ignorar.
- Implementar download individual direto nos resultados.
- Testar cabeçalhos e arquivos grandes reais.

### Critério de conclusão

O fluxo de conjunto sempre oferece primeiro um PDF consistente e depois conduz downloads individuais sem carregar originais na memória.

## Fase 7 — Robustez e publicação

### Atividades

- Criar validador de config e dados para CI.
- Executar benchmarks com volume real.
- Mover consulta para Web Worker se as metas não forem atendidas.
- Definir CSP e cabeçalhos de cache.
- Implementar validação central de URLs, limites e allowlists por finalidade.
- Eliminar sinks DOM inseguros e testar payloads maliciosos em config/GeoJSON.
- Configurar headers de segurança primeiro em homologação e depois em modo bloqueante.
- Adicionar secret scanning, auditoria de dependências/proveniência e SBOM ao CI.
- Proteger repositório, CI, storage, CDN e DNS com MFA e menor privilégio.
- Testar publicação atômica, versionamento e rollback de emergência.
- Concluir testes E2E nos navegadores suportados.
- Realizar auditoria de acessibilidade e corrigir problemas P0.
- Revisar textos, licenças, créditos e privacidade.
- Criar pipeline e smoke test pós-publicação.
- Documentar cadastro de projeto e rollback.

### Critério de conclusão

Todos os portões de qualidade passam no ambiente de produção e a equipe responsável consegue cadastrar, verificar e reverter dados.

## Fase 8 — Evoluções P1

- Filtros de catálogo.
- Remover/reincluir fotos na seleção.
- Compartilhar estado na URL.
- Persistir fila em `sessionStorage`.
- Entrada acessível de coordenadas.
- Adicionar/remover vértices durante edição.
- Mapa vetorial esquemático no PDF.
- Modo automático de downloads, somente onde permitido e claramente opcional.
- Catálogo textual de contingência sem WebGL.
- Índice estático pré-processado para acervos maiores.

## Dependências entre frentes

```text
dados e hospedagem
       |
       v
configuração --> mapa/projetos --> motor espacial --> ponto
                                            |
                                            v
                                   desenho próprio/área
                                            |
                                            v
                                     painel final
                                            |
                                            v
                                      PDF e fila
                                            |
                                            v
                                  robustez/publicação
```

Design visual e preparação de dados podem avançar paralelamente depois que os contratos estiverem aprovados.

## Artefatos de entrega

- aplicação estática;
- `config.example.js` comentado;
- GeoJSON de demonstração;
- validador de catálogo e dados;
- testes automatizados;
- manual curto de cadastro de projeto;
- matriz de compatibilidade de downloads;
- registro de dependências, licenças e atribuições;
- procedimento de build, publicação e rollback.
