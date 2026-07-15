# Revisão de UI e UX

## Escopo validado

A interface foi inspecionada no Chrome em cinco estados visuais: desktop claro, desktop escuro, resultados claro, resultados escuro e celular com painel aberto/recolhido. A matriz principal usou 1440×900, 820×1180 e 390×844. Os testes automatizados também verificam mapa, ferramentas, downloads, persistência do tema e tela estreita.

## Breakpoints

| Faixa | Comportamento |
|---|---|
| Acima de 1100 px | Sidebar fixa de 25 rem, mapa ao lado, labels completas e chip da ferramenta ativo. |
| 901–1100 px | Sidebar fixa reduzida para 21,5 rem, preservando espaço operacional do mapa. |
| Até 900 px | Mapa em tela inteira e sidebar transformada em bottom sheet recolhível, limitada a 46 vh/32 rem. |
| Até 620 px | Título curto, seletor de tema compacto, toolbar em três colunas e labels `Ponto`, `Área`, `Limpar`. |
| Até 360 px | Cartão de resultado muda de layout horizontal para vertical. |
| Altura até 620 px | Bottom sheet e controles de desenho usam limites próprios para não bloquear todo o mapa. |

## Auditoria por componente

| Componente | Problema observado | Decisão aplicada |
|---|---|---|
| Cabeçalho e identidade | O nome completo competiria com o seletor em celulares. | Marca compacta, nome completo em telas maiores e `shortTitle` abaixo de 620 px. |
| Seletor de tema | Não existia tema escuro nem preferência persistida. | Controle segmentado Claro/Escuro; no celular conserva os dois ícones com nomes acessíveis. |
| Tema | Seguir o sistema contrariaria a escolha explícita. | Padrão sempre claro; somente `light`/`dark` são aceitos e persistidos em `localStorage`. |
| Mapa no tema escuro | Raster claro produziria contraste excessivo com a interface. | Atenuação de brilho, contraste e saturação apenas nas camadas raster; grades e highlight preservam suas cores. |
| Sidebar desktop | A rolagem incluía cabeçalho e conteúdo. | Grid interno: cabeçalho contextual fixo e conteúdo com rolagem independente. |
| Sidebar tablet | Em 820 px ocupava quase metade da largura do mapa. | Bottom sheet sobre mapa a partir de 900 px. |
| Sidebar celular | Cobria permanentemente a metade inferior do mapa. | Botão Recolher/Expandir, estado visível e repaint do MapLibre após a transição. |
| Contexto da sidebar | O título permanecia “Aerolevantamentos” em detalhes e resultados. | Cabeçalho muda para catálogo, detalhes ou resultados e informa a contagem encontrada. |
| Cartão de projeto | Estado ligado dependia principalmente do switch. | Borda lateral na cor do projeto, fundo sutil, ponto de status e texto continuam distinguindo o estado sem depender apenas de cor. |
| Switch do projeto | Precisava manter alvo e descrição claros. | Label acessível `Ligar/Desligar`, tooltip de ação e foco visível. |
| Detalhes do voo | Metadados, downloads e créditos tinham pouca hierarquia. | Seções nomeadas, faixa na cor do projeto e ação de grade em largura integral. |
| Toolbar do mapa | `Limpar consulta` ficava cortado em 390 px. | Grid de três colunas no celular e labels curtas, mantendo nomes completos em `aria-label` e `title`. |
| Badge de escopo | O comportamento global precisava continuar evidente. | Permanece em linha própria quando necessário e nunca é removido na versão compacta. |
| Chip da ferramenta | Consumiria largura demais no celular. | Visível em telas maiores e omitido abaixo de 620 px; o botão ativo permanece marcado por `aria-pressed`. |
| Controles do MapLibre | Controles claros destoavam no dark mode. | Fundo, ícones, escala e atribuição acompanham os tokens do tema. |
| Controles de desenho | Poderiam ficar escondidos pelo bottom sheet. | Posição calculada acima do painel e reposicionamento inferior quando ele está recolhido. |
| Progresso da consulta | Havia somente texto `N de N`. | Elemento `progress` nativo com label acessível, valor e estado ocupado. |
| Resumo de resultados | A contagem não tinha destaque visual. | Bloco de resumo com número proeminente e descrição; cabeçalho do painel repete o contexto de forma curta. |
| Grupos de resultados | O nome do projeto estava oculto de tecnologias assistivas. | Headings de nível 4 perceptíveis e mantidos na lista ordenada. |
| Cartão de fotografia | O cartão criava foco extra além do link. | Highlight usa `focusin/focusout` dos controles internos; somente ações reais entram na ordem de tabulação. |
| Inspeção da fotografia | Hover temporário não atendia quem compara fotos com calma ou usa toque. | `Ver no mapa` mantém a cobertura destacada, enquadra sua geometria e marca visualmente o cartão selecionado. |
| Thumbnail | Falha de imagem deixava apenas um espaço vazio. | Placeholder textual `Sem miniatura`. |
| Buscas consecutivas | Não estava evidente que uma ferramenta continuava ativa depois do resultado. | Instrução flutuante, bloco `Continue pesquisando` e ação para novo ponto/área; a nova consulta substitui a anterior. |
| Download em lote | A relação entre PDF e imagens podia ser interpretada como download simultâneo. | Texto antecipatório e marcadores `Etapa 1 de 2` / `Etapa 2 de 2`. |
| Loading e erro fatal | Precisavam respeitar os dois temas e redução de movimento. | Todos os estados usam tokens; animações são praticamente removidas com `prefers-reduced-motion`. |

## Acessibilidade e interação

- foco visível de alto contraste em botões, links, inputs e elementos focalizáveis;
- alvos principais com ao menos 36–44 px conforme densidade e contexto;
- labels completas continuam no nome acessível quando a interface mostra textos curtos;
- estado do tema e das ferramentas exposto por `aria-pressed`;
- estado do painel exposto por `aria-expanded` e `aria-controls`;
- resultados não dependem de hover: foco no link também destaca a grade;
- status não depende somente de cor, pois sempre acompanha texto;
- o mapa mantém controles de navegação, escala e atribuição nos dois temas.

## Persistência do tema

A chave usada é `aerial-catalog-theme`. Valores diferentes de `dark` são normalizados para `light`; não há consulta a `prefers-color-scheme`. Se o navegador bloquear armazenamento local, a escolha continua ativa durante a página atual sem impedir o funcionamento do portal.

## Fluxo de consulta refinado

1. O catálogo apresenta três passos curtos: escopo, ferramenta e mapa.
2. Ao ativar Ponto, uma instrução informa que novos cliques geram novas buscas.
3. Ao concluir uma Área, os controles oferecem diretamente `Desenhar nova área`.
4. Resultados novos substituem os anteriores; não há acúmulo silencioso de seleções.
5. Hover e foco pré-visualizam footprints; `Ver no mapa` fixa o highlight e enquadra a foto.
6. A seleção persiste durante download e atualizações do painel, sendo limpa na próxima consulta.

## Limites mantidos

- O mapa-base continua sendo o OSM configurado; o tema escuro atenua o raster, mas não substitui o provedor.
- O desenho em telas pequenas é suportado, embora operações de ajuste fino continuem naturalmente mais confortáveis com mouse ou caneta.
- O bottom sheet usa botão explícito, não gesto de arraste, para manter comportamento previsível e acessível por teclado.
