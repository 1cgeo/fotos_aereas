# Implementação entregue

## Fases e rastreabilidade

1. Fundação: Vite, shell semântico, configuração em runtime, store, validação de URLs e testes.
2. Catálogo e mapa: MapLibre, OSM, repositório GeoJSON, índice RBush, camadas e dados mock.
3. Consulta pontual: ToolManager, ciclo de vida, escopo global, execução cancelável e tolerância a falhas parciais.
4. Consulta poligonal: ferramenta própria, preview, atalhos, validação de auto-interseção e edição por vértices.
5. Resultados e downloads: cartões, highlight, relatório PDF e fila individual.
6. Produção: responsividade, acessibilidade, CSP/headers, divisão de bundle, testes de segurança e E2E.

## Fluxo de aceitação rápido

1. Abra o portal e confirme a grade laranja do projeto de 1958.
2. Ative “Consultar ponto” e clique na interseção de footprints; mais de uma foto deve aparecer.
3. Passe o mouse ou foque um cartão; o footprint correspondente deve ficar amarelo/vermelho.
4. Volte, ative “Desenhar área”, marque ao menos três vértices e conclua.
5. Arraste um vértice. Uma geometria válida refaz a consulta; uma inválida é revertida.
6. Use “Preparar download de todas”. O PDF deve vir antes da fila de imagens.
7. Desligue todos os projetos e consulte novamente; o escopo deve indicar todo o catálogo.

## Limites deliberados

- O site é público e não implementa autenticação, autorização nem URLs privadas.
- O OpenStreetMap é mapa de referência; a operação deve respeitar a política de uso do provedor de tiles ou adotar serviço próprio para tráfego relevante.
- O navegador não cria ZIP de originais pesados. Cada download depende de uma ação explícita, reduzindo uso de memória e bloqueios de múltiplos downloads.
- A disponibilidade e a banda dos arquivos são responsabilidade da hospedagem estática/CDN.
