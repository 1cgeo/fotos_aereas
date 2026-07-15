# Interface e experiência

## Estrutura de desktop

```text
+---------------------------------------------------------------+
| Cabeçalho: marca, título, ajuda                               |
+----------------------+----------------------------------------+
| Painel lateral       | Barra de ferramentas do mapa           |
|                      | [Ponto] [Desenhar área] [Limpar]       |
| Projetos / detalhes  | Escopo: todos os projetos              |
| ou resultados        |                                        |
|                      |                 MAPA                   |
|                      |                                        |
|                      |                           atribuição |
+----------------------+----------------------------------------+
```

O painel deve ter largura ajustável dentro de limites razoáveis, com padrão aproximado de 360 a 420 px. O mapa ocupa o restante. O cabeçalho não deve disputar altura desnecessária com o mapa.

## Estrutura em tela estreita

- Mapa ocupa a tela.
- Catálogo e resultados aparecem em uma gaveta inferior ou lateral.
- A gaveta possui estados recolhido, parcial e expandido.
- Ferramentas continuam acessíveis sem abrir completamente a gaveta.
- Durante desenho, gestos do mapa e da gaveta não podem competir.
- Miniaturas podem ser menores, mas metadados e downloads permanecem disponíveis.

O desenho preciso de polígono em celulares deve ser testado; se a experiência não for confiável, a interface deve informar que essa ferramenta funciona melhor em tela maior, sem bloquear a consulta por ponto.

## Navegação do painel

O painel tem quatro visões exclusivas, preservando o contexto em estado JavaScript:

1. **Projetos:** catálogo com controles de ligar/desligar.
2. **Detalhes do projeto:** metadados de um projeto, com os controles ainda acessíveis.
3. **Resultados:** resumo da consulta e cartões de fotos.
4. **Downloads:** PDF e fila de arquivos.

Cada visão secundária oferece retorno com rótulo específico, como `Voltar aos projetos` ou `Voltar aos resultados`. O botão Voltar do navegador pode ser integrado na fase P1, sem ser requisito para o MVP.

## Catálogo de projetos

Cada item mostra:

- controle `switch` com rótulo `Mostrar <projeto>`;
- título;
- período;
- resumo curto;
- estado `carregando`, `visível`, `erro` ou `indisponível`;
- botão `Ver detalhes`;
- amostra da cor usada na grade.

Ligar um projeto:

1. muda o switch imediatamente para estado ocupado;
2. carrega o GeoJSON se necessário;
3. adiciona as camadas;
4. enquadra o projeto apenas se for o primeiro projeto ligado ou se a ação vier de `Ver no mapa`;
5. atualiza o rótulo de escopo;
6. apresenta erro no próprio item se a carga falhar.

Desligar não descarta os dados da memória durante a sessão. Se for o último projeto, a interface anuncia que as consultas seguintes abrangerão todos os projetos.

## Detalhes do projeto

Ordem recomendada:

1. título e período;
2. estado de visibilidade e botão `Mostrar/Ocultar grade`;
3. descrição;
4. ficha técnica;
5. total de fotos;
6. licença e créditos;
7. orientações de download;
8. links externos.

Campos vazios não geram linhas em branco. Texto do `config.js` é tratado como texto, nunca como HTML.

## Barra de consulta

Controles:

- `Consultar ponto`;
- `Desenhar área`;
- `Editar área`, visível quando aplicável;
- `Limpar consulta`;
- indicador permanente de escopo.

As duas ferramentas são mutuamente exclusivas. A ferramenta ativa usa `aria-pressed="true"`, estilo visual inequívoco e instrução curta:

- ponto: `Clique no mapa para localizar todas as fotos que cobrem o local.`
- área: `Clique para adicionar vértices e conclua o polígono para consultar.`

Um chip próximo à toolbar mostra `Ferramenta ativa: Consultar ponto` ou `Ferramenta ativa: Desenhar área`, com botão acessível para desativar. O chip permanece visível mesmo quando o painel lateral muda de visão.

`Esc` é P0 e cancela a operação intermediária antes de desativar a ferramenta. Atalhos `P` para ponto e `A` para área são P1. Atalhos não atuam enquanto o foco estiver em campo de formulário.

## Estados durante consulta global

Antes de buscar todos os projetos ainda não carregados, o painel mostra:

```text
Preparando consulta em todos os projetos
12 de 30 grades carregadas
[barra de progresso]
[Cancelar]
```

Ao final com falhas parciais:

```text
146 fotos encontradas em 27 projetos.
3 projetos não puderam ser consultados. [Ver detalhes] [Tentar novamente]
```

A aplicação não deve apresentar resultado parcial como se fosse completo.

## Lista de resultados

Cabeçalho:

- método e local/área da consulta;
- escopo congelado daquela consulta;
- total geral e por projeto;
- `Baixar todas`;
- `Limpar consulta`.

Cartão de resultado:

```text
+-------------------------------------+
| [miniatura] Foto 0123               |
|             Município 1958          |
|             Faixa FX-07 · 17/05/58 |
|             250,9 MB · TIFF         |
| [Ver detalhes] [Baixar fotografia]  |
+-------------------------------------+
```

Comportamentos de sincronização:

- `pointerenter` destaca a grade.
- `pointerleave` remove destaque temporário.
- `focusin` destaca para teclado.
- `focusout` remove se o foco sair do cartão.
- abrir detalhes fixa o destaque até fechar ou abrir outro item.
- o destaque usa `projectId + photoId`, nunca somente `photoId`.

Para centenas de resultados, usar paginação ou renderização incremental em blocos. Virtualização pode ser adotada depois, pois aumenta a complexidade de foco e acessibilidade.

## Estado vazio

Mensagens devem orientar a próxima ação:

- Ponto: `Nenhuma fotografia do escopo selecionado cobre este ponto.`
- Área: `Nenhuma fotografia do escopo selecionado intersecta esta área.`
- Complemento quando restrito: `Ligue outros projetos ou desligue todos para pesquisar o catálogo completo.`

## Feedback e erros

- Mensagens junto ao controle que originou o problema.
- Região `aria-live="polite"` para totais e conclusão de tarefas.
- `role="alert"` somente para erros que exigem atenção imediata.
- Toasts não devem ser a única localização de informação recuperável.
- Erro sempre oferece uma ação adequada: tentar novamente, ignorar, abrir o arquivo diretamente ou retornar.

## Acessibilidade

- Estruturas `header`, `main`, `aside`, `nav` e títulos hierárquicos.
- Ordem de foco acompanha a ordem visual.
- Botões reais, não `div` clicáveis.
- Switches com nome, estado e descrição de carregamento.
- Contraste AA e destaque que combina cor, espessura e/ou padrão.
- O mapa tem nome acessível e instrução; resultados equivalentes ficam no painel.
- `prefers-reduced-motion` reduz transições e evita enquadramentos animados longos.
- Miniaturas não são essenciais para executar o download.
- Formatação de datas e tamanhos usa `Intl` com `pt-BR`.

## Confirmações

Não confirmar ações facilmente reversíveis, como trocar ferramenta ou remover destaque. Confirmar somente quando limpar uma consulta também descartar uma fila com progresso manual registrado.
