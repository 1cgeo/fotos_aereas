# Plano do portal de fotografias aéreas históricas

## Finalidade deste conjunto

Este diretório descreve o produto e o plano de implementação de um portal cartográfico estático para localizar e baixar fotografias aéreas históricas. A aplicação será feita com HTML semântico, CSS e JavaScript modular, empacotados pelo Vite, sem React, Vue, Angular ou outro framework de interface.

O plano assume que metadados, grades de voo, miniaturas e arquivos para download são públicos. Não haverá backend, autenticação, banco de dados ou criação de ZIP no navegador na primeira versão.

## Decisões-base

- MapLibre GL JS para o mapa interativo.
- Mapa-base derivado do OpenStreetMap, obtido de um provedor configurável e com atribuição visível.
- `config.js` como catálogo editável dos aerolevantamentos.
- Um GeoJSON por projeto como fonte canônica das grades e dos metadados das fotos.
- Coordenadas GeoJSON obrigatoriamente em WGS 84, longitude/latitude (`EPSG:4326`).
- Ferramenta de desenho própria, integrada diretamente aos eventos e fontes GeoJSON do MapLibre.
- Turf para os testes geométricos exatos.
- Índice espacial em memória para reduzir o número de geometrias testadas.
- `pdf-lib` para gerar o relatório antes dos downloads.
- Downloads pesados feitos individualmente, por uma fila visível e recuperável.
- Hospedagem estática e arquivos no mesmo domínio sempre que possível.
- Segurança em camadas: DOM sem HTML dinâmico, URLs validadas, CSP restritiva, headers HTTP, dependências auditadas e publicação protegida.

## Regra central de escopo

- Se um ou mais projetos estiverem ligados, as consultas usarão somente esses projetos.
- Se nenhum projeto estiver ligado, as consultas usarão todos os projetos cadastrados.
- A interface sempre mostrará `Escopo: N projetos ligados` ou `Escopo: todos os projetos`, evitando que o comportamento implícito surpreenda o usuário.

Ligar um projeto controla sua visualização e o escopo da consulta. Não significa carregar a fotografia original no mapa.

## Ordem de leitura

1. [Visão do produto](01-visao-do-produto.md)
2. [Requisitos e regras de negócio](02-requisitos.md)
3. [Arquitetura técnica](03-arquitetura.md)
4. [Configuração e contratos de dados](04-configuracao-e-dados.md)
5. [Interface e experiência](05-interface-e-experiencia.md)
6. [Mapa e consultas espaciais](06-mapa-e-consultas-espaciais.md)
7. [Relatório e downloads](07-relatorio-e-downloads.md)
8. [Desempenho, segurança e operação](08-desempenho-seguranca-operacao.md)
9. [Testes e aceitação](09-testes-e-aceitacao.md)
10. [Roteiro de implementação](10-roteiro-de-implementacao.md)
11. [Decisões em aberto](11-decisoes-em-aberto.md)

## O que significa concluir a primeira versão

A primeira versão estará pronta quando:

- um editor conseguir cadastrar um projeto alterando somente o `config.js` e adicionando seus arquivos;
- o usuário conseguir ligar um ou mais projetos e inspecionar seus metadados e grades;
- a consulta por clique retornar todas as coberturas que contêm o ponto;
- a consulta por polígono retornar todas as coberturas que o intersectam;
- ambas as consultas funcionarem sobre todos os projetos quando nenhum estiver ligado;
- o painel exibir miniatura, metadados, projeto de origem e download de cada resultado;
- a grade correspondente receber destaque ao focar um item;
- o fluxo de lote gerar primeiro um PDF e depois conduzir downloads individuais;
- erros de configuração, rede e download aparecerem de modo compreensível;
- os cenários de aceitação definidos neste plano passarem em navegadores suportados.

## Referências técnicas

- [Vite: guia oficial](https://vite.dev/guide/)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [GeoJSON no MapLibre](https://maplibre.org/maplibre-style-spec/sources/)
- [Turf: ponto em polígono](https://turfjs.org/docs/api/booleanPointInPolygon)
- [PDF-LIB](https://pdf-lib.js.org/)
- [Política de tiles raster do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)

## Referência local de arquitetura

O repositório `D:\repositorios\ebgeo_web` foi usado como referência conceitual para:

- gerenciamento de uma ferramenta de mapa ativa por vez;
- ciclo explícito de ativação, desativação e limpeza;
- separação entre controle de interação e operações geométricas;
- preview limitado por `requestAnimationFrame`;
- controles de concluir/desfazer adequados para toque;
- contrato de análise, função pura e runner coordenador;
- rastreamento central de listeners, timers e cancelamentos.

A arquitetura deste portal adapta esses padrões ao seu escopo menor. Não serão copiados o gerenciador completo de feições, persistência de camadas editáveis ou interfaces que não sejam necessárias à consulta de fotografias.
