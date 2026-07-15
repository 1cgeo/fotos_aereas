# Requisitos e regras de negócio

## Prioridades

- **P0:** necessário para a primeira entrega pública.
- **P1:** importante, mas pode entrar logo depois da primeira entrega.
- **P2:** evolução desejável.

## Catálogo e projetos

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-PROJ-001 | P0 | Carregar o catálogo de projetos a partir de `config.js`. |
| RF-PROJ-002 | P0 | Exibir nome, período, resumo e disponibilidade de cada projeto. |
| RF-PROJ-003 | P0 | Permitir ligar e desligar mais de um projeto. |
| RF-PROJ-004 | P0 | Ao ligar um projeto, carregar sua grade sob demanda e mostrar progresso. |
| RF-PROJ-005 | P0 | Exibir os metadados completos do projeto selecionado no painel lateral. |
| RF-PROJ-006 | P0 | Enquadrar a extensão configurada do projeto, sem depender do carregamento integral da grade. |
| RF-PROJ-007 | P0 | Identificar projeto indisponível e manter os demais utilizáveis. |
| RF-PROJ-008 | P1 | Filtrar o catálogo por texto, ano e instituição. |

## Mapa

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-MAPA-001 | P0 | Renderizar mapa interativo com MapLibre GL JS. |
| RF-MAPA-002 | P0 | Usar mapa-base OSM configurável e atribuição sempre visível. |
| RF-MAPA-003 | P0 | Exibir controles de zoom, restauração de orientação e escala. |
| RF-MAPA-004 | P0 | Desenhar uma camada de preenchimento e uma de contorno para cada grade ativa. |
| RF-MAPA-005 | P0 | Diferenciar visualmente projetos quando mais de um estiver ligado. |
| RF-MAPA-006 | P0 | Destacar uma foto sem eliminar o estilo das demais. |
| RF-MAPA-007 | P0 | Limpar o destaque quando o resultado perde foco, preservando a seleção da consulta. |
| RF-MAPA-008 | P1 | Compartilhar centro, zoom e projetos ativos pela URL. |

## Escopo da consulta

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-ESCOPO-001 | P0 | Com pelo menos um projeto ligado, pesquisar somente nos projetos ligados. |
| RF-ESCOPO-002 | P0 | Sem projeto ligado, pesquisar em todos os projetos cadastrados e habilitados. |
| RF-ESCOPO-003 | P0 | Exibir o escopo junto às ferramentas e no cabeçalho dos resultados. |
| RF-ESCOPO-004 | P0 | Antes de uma consulta global, carregar e indexar as grades ainda não carregadas. |
| RF-ESCOPO-005 | P0 | Exibir progresso e permitir cancelar uma consulta global durante o carregamento. |
| RF-ESCOPO-006 | P0 | Informar projetos ignorados por erro e oferecer nova tentativa. |

`Nenhum projeto ligado` não significa `nenhum projeto no escopo`. Esta exceção deve aparecer claramente na interface e nos testes.

## Consulta por ponto

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-PONTO-001 | P0 | Disponibilizar uma ferramenta chamada `Consultar ponto`. |
| RF-PONTO-002 | P0 | Converter o clique em um ponto GeoJSON `[longitude, latitude]`. |
| RF-PONTO-003 | P0 | Retornar toda cobertura `Polygon` ou `MultiPolygon` que contenha o ponto. |
| RF-PONTO-004 | P0 | Considerar ponto na borda como interseção. |
| RF-PONTO-005 | P0 | Não limitar a busca à feição visualmente superior. |
| RF-PONTO-006 | P0 | Marcar no mapa a coordenada consultada até a consulta ser limpa. |

## Ciclo das ferramentas

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-TOOL-001 | P0 | Manter no máximo uma ferramenta interativa ativa entre ponto e polígono. |
| RF-TOOL-002 | P0 | Ativar outra ferramenta deve desativar e limpar os handlers temporários da anterior. |
| RF-TOOL-003 | P0 | Exibir indicador persistente com nome da ferramenta ativa e ação de desativar. |
| RF-TOOL-004 | P0 | Pressionar `Esc` deve cancelar primeiro arraste/rascunho em andamento e, sem operação intermediária, desativar a ferramenta. |
| RF-TOOL-005 | P0 | Desativar ferramenta não deve apagar uma consulta concluída; isso pertence a `Limpar consulta`. |
| RF-TOOL-006 | P0 | Desativar durante carregamento ou análise deve cancelar a execução corrente e impedir resultado tardio. |

## Consulta por polígono

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-AREA-001 | P0 | Disponibilizar a ferramenta `Desenhar área`. |
| RF-AREA-002 | P0 | Aceitar um polígono por consulta e impedir conclusão com menos de três vértices distintos. |
| RF-AREA-003 | P0 | Retornar toda cobertura que toque, cruze, contenha ou esteja contida na área. |
| RF-AREA-004 | P0 | Permitir editar, apagar e redesenhar a área. |
| RF-AREA-005 | P0 | Reexecutar a consulta somente ao concluir uma edição, não a cada movimento do ponteiro. |
| RF-AREA-006 | P1 | Exibir a área aproximada do polígono desenhado. |

## Resultados

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-RES-001 | P0 | Substituir os metadados do projeto no painel pelos resultados da consulta, mantendo navegação de retorno. |
| RF-RES-002 | P0 | Mostrar total encontrado e totais agrupados por projeto. |
| RF-RES-003 | P0 | Deduplicar por chave composta `projectId + photoId`. |
| RF-RES-004 | P0 | Ordenar por projeto, linha de voo e identificador da foto, com regra de fallback documentada. |
| RF-RES-005 | P0 | Mostrar em cada cartão: miniatura, foto, projeto, data, linha/faixa, escala, tamanho e licença quando disponíveis. |
| RF-RES-006 | P0 | Destacar no mapa a grade do cartão em hover, foco por teclado ou abertura do detalhe. |
| RF-RES-007 | P0 | Rolagem ou paginação não pode remover resultados da seleção. |
| RF-RES-008 | P0 | Oferecer estados de vazio, carregamento parcial, erro parcial e sucesso. |
| RF-RES-009 | P0 | Permitir limpar a consulta, geometria, marcador, destaque e fila relacionada em uma ação confirmada quando necessário. |
| RF-RES-010 | P1 | Permitir remover e reincluir fotos antes de preparar os downloads. |

## Downloads e relatório

| ID | Prioridade | Requisito |
|---|---:|---|
| RF-DOWN-001 | P0 | Disponibilizar download individual em cada resultado. |
| RF-DOWN-002 | P0 | O botão principal do conjunto deve se chamar `Baixar todas` e abrir o fluxo de relatório e fila, sem prometer um ZIP ou downloads simultâneos. |
| RF-DOWN-003 | P0 | Gerar e oferecer primeiro um PDF com a consulta, projetos e fotos selecionadas. |
| RF-DOWN-004 | P0 | Criar uma fila ordenada de downloads individuais após o PDF. |
| RF-DOWN-005 | P0 | Exibir o item atual, pendentes, concluídos manualmente, ignorados e falhas. |
| RF-DOWN-006 | P0 | Oferecer `Baixar próxima`, `Tentar novamente`, `Ignorar` e download direto de qualquer item. |
| RF-DOWN-007 | P0 | Não buscar o conteúdo dos originais para a memória do portal. |
| RF-DOWN-008 | P0 | Advertir que o navegador e o servidor controlam confirmação, progresso real e retomada do arquivo. |
| RF-DOWN-009 | P1 | Oferecer modo automático opcional somente se validado nos navegadores suportados. |
| RF-DOWN-010 | P1 | Persistir a fila na sessão para recuperação após recarregar a página. |

O estado `concluído` da primeira versão significa que o portal acionou o download e o usuário o confirmou. Uma página web comum não consegue provar que o navegador terminou de gravar um arquivo aberto por navegação direta.

## Requisitos não funcionais

| ID | Categoria | Requisito |
|---|---|---|
| RNF-001 | Tecnologia | JavaScript em módulos ES, HTML e CSS; Vite apenas como ferramenta de desenvolvimento e build. |
| RNF-002 | Implantação | Artefato final composto somente por arquivos estáticos. |
| RNF-003 | Acessibilidade | Operações principais acessíveis por teclado, foco visível, nomes acessíveis e contraste WCAG AA. |
| RNF-004 | Responsividade | Uso completo em desktop; consulta e download utilizáveis em telas estreitas, com painel em gaveta. |
| RNF-005 | Desempenho | Interação do mapa continua responsiva durante consultas sobre o volume de referência. |
| RNF-006 | Resiliência | Falha de miniatura, projeto ou download é isolada e explicada. |
| RNF-007 | Segurança | Nenhuma chave secreta ou URL privada pode estar em `config.js`. |
| RNF-008 | Compatibilidade | Duas versões estáveis mais recentes de Chrome, Edge e Firefox; Safari recente validado separadamente. |
| RNF-009 | Observabilidade | Erros técnicos no console e mensagens curtas, acionáveis e sem dados sensíveis na interface. |
| RNF-010 | Licenças | Atribuição do mapa-base e licença/proveniência das fotos sempre preservadas. |
| RNF-011 | Segurança | Metadados e GeoJSON nunca podem ser inseridos como HTML ou executados como JavaScript. |
| RNF-012 | Segurança | Toda URL deve passar por validação central de protocolo, credenciais, tamanho e host permitido para sua finalidade. |
| RNF-013 | Segurança | Produção deve enviar CSP bloqueante e os cabeçalhos de segurança definidos no plano. |
| RNF-014 | Segurança | Nenhum JavaScript de produção pode ser carregado de CDN ou origem de terceiro. |
| RNF-015 | Segurança | Config, dados e geometrias devem respeitar limites de tamanho, profundidade, contagem e complexidade independentes dos arquivos carregados. |
| RNF-016 | Cadeia de suprimentos | Build reprodutível com lockfile, `npm ci`, auditoria, secret scanning e revisão de mudanças de dependências. |
| RNF-017 | Operação | Repositório, CI, hospedagem, storage e DNS devem usar MFA, menor privilégio, logs, versionamento e rollback testado. |

## Regras de ordenação

1. `project.sortOrder` crescente.
2. Nome do projeto em português, usando `Intl.Collator('pt-BR', { numeric: true })`.
3. `flightLine` com ordenação natural.
4. `photoNumber` com ordenação natural.
5. `photoId` como desempate estável.

Campos ausentes aparecem depois de campos preenchidos. O ordenamento nunca depende da ordem acidental das feições no arquivo.
