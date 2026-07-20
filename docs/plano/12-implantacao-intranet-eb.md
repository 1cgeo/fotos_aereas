# Implantação na intranet do EB

Esta rodada define a primeira implantação real do portal: intranet do Exército, servida por nginx, com o acervo verdadeiro no lugar dos dados de demonstração. Decisões tomadas em 2026-07-20.

Uma versão na internet é possível no futuro, mas não orienta as escolhas desta fase. Onde a decisão de intranet conflitar com o texto das seções anteriores, prevalece o que está aqui.

## Convenção de segredo neste repositório

Este repositório é público. Nenhum documento, código ou configuração dele pode conter endereço IP interno, nome de host, letra de drive mapeado, caminho UNC ou caminho de máquina. Os documentos citam os recursos por papel ("o servidor da intranet", "o acervo em rede", "o share de publicação"); os valores reais vivem fora do repositório, no `.env` da equipe.

Isso vale inclusive para exemplos de comando e trechos de configuração do nginx: usar marcadores como `SERVIDOR`, `SHARE_PUBLICACAO` e `ACERVO`.

## Decisões desta rodada

| Tema | Decisão |
|---|---|
| Ambiente | Intranet do EB, servida por nginx no servidor da divisão. Internet fica para o futuro. |
| Mapa-base | Mantém OpenStreetMap. O acesso ao `tile.openstreetmap.org` está liberado na rede, então não é preciso mapa-base interno. |
| Escopo de carga | Um projeto por vez, começando pelo que já tem grade. Não copiar o acervo inteiro de antemão. |
| Original da foto | Permanece somente no acervo em rede. O portal não serve o arquivo original. |
| Derivadas | Cada foto publicada entra com duas derivadas: uma miniatura muito leve e um arquivo de download comprimido. |
| Grade | Melhora incremental. O portal publica o que existe hoje, marcado quanto à confiabilidade, e absorve as correções conforme saem. |
| Consulta ampla | Buscar em todos os projetos continua sendo requisito, mas passa a ser resolvida em duas etapas. |
| Resultado no mapa | A consulta passa a exibir somente as coberturas que de fato intersectaram. |

## O que muda no produto

### 1. Consulta em duas etapas por geometria de cobertura

Hoje, consultar sem nenhum projeto ligado significa baixar o GeoJSON de todos os projetos do catálogo (`src/analysis/query-scope.js`). Com dois projetos de demonstração isso é irrelevante. Com o acervo real, são dezenas de milhares de footprints baixados para responder a um clique.

Passa a funcionar assim:

1. cada projeto ganha uma **geometria de cobertura**, um polígono único que representa a área do voo inteiro, publicada junto do catálogo e pequena o bastante para carregar sempre;
2. a consulta testa primeiro a geometria de entrada contra essas coberturas, e só isso determina quais projetos são candidatos;
3. somente os projetos candidatos têm a grade carregada e testada foto a foto.

Assim a busca global continua existindo, sem custo proporcional ao tamanho do catálogo. O custo passa a ser proporcional ao que a área realmente toca.

A geometria de cobertura deve ser o contorno real do voo, não a caixa envolvente: um voo em faixa diagonal tem caixa envolvente muito maior que a área coberta, e a caixa produziria projetos candidatos que não têm nenhuma foto na área.

### 2. A consulta mostra só as coberturas que intersectaram

Comportamento atual, em `src/app/app-controller.js`, função `revealIntersectedProjects`: quando um projeto desligado é atingido pela consulta, o código chama `ensureProjectLayers` e liga a camada do projeto. Essa camada é alimentada com a coleção completa do projeto (`src/map/project-layers.js`), então o mapa passa a exibir todos os footprints daquele voo, e não apenas os que responderam à consulta.

Correção: o realce do resultado deixa de ser "ligar a camada do projeto" e passa a ser uma fonte própria de resultados, contendo apenas as feições retornadas, com a cor do projeto de origem vinda de propriedade da própria feição. A camada completa do projeto continua existindo, mas só aparece quando o usuário liga o projeto deliberadamente.

O realce individual em amarelo, ao focar um item da lista, continua como está.

### 3. Lista de resultados sob controle

Uma área grande pode retornar milhares de fotos, e hoje cada resultado vira um item de DOM com miniatura. O limite configurado (`resultWarningThreshold`) apenas avisa, não contém.

A lista passa a renderizar sob demanda, mantendo em DOM somente a janela visível e carregando as miniaturas conforme entram em tela. O aviso de volume permanece, e acima de um teto configurável a interface recomenda refinar a área em vez de tentar desenhar tudo.

## Pipeline de dados por projeto

Cada projeto entra no ar por esta sequência, sempre validada num bloco pequeno antes do voo inteiro:

1. **Grade**: extrair do GPKG do projeto os footprints, reprojetados para `EPSG:4326`, um `FeatureCollection` por projeto.
2. **Atributos**: levar para o GeoJSON somente os campos que a interface exibe ou usa. Atributo de trabalho fica no GPKG.
3. **Confiabilidade**: propagar o indicador de qualidade da posição por foto. O portal precisa dizer ao usuário que o footprint é indicativo de busca, com precisão de índice, e não posição levantada.
4. **Miniatura**: uma por foto, muito leve, dimensionada para a lista de resultados.
5. **Download**: uma versão comprimida por foto, adequada a consumo pela rede.
6. **Cobertura**: o polígono de cobertura do projeto, para a primeira etapa da consulta.
7. **Catálogo**: entrada do projeto no `config.js`, com metadados do voo, licença e crédito.
8. **Publicação**: derivadas e GeoJSON para o share de publicação; entrada do projeto ligada no catálogo.

O arquivo original não entra nessa lista. Ele permanece no acervo em rede como cópia de preservação.

## Implantação no servidor

O site é estático: o `dist/` gerado pelo build, mais o diretório de dados com GeoJSON, miniaturas e arquivos de download.

Os cabeçalhos definidos em `public/_headers` estão no formato de serviços de hospedagem estática e **não são lidos pelo nginx**. Precisam ser transcritos para diretivas do bloco `server`, com três ajustes para o contexto de intranet:

- remover `upgrade-insecure-requests` da CSP enquanto o site for servido por HTTP, sob pena de o navegador reescrever as próprias requisições do site para um HTTPS que não existe;
- revisar `Cross-Origin-Opener-Policy` e `Cross-Origin-Resource-Policy`, que só se aplicam em contexto seguro e não têm efeito útil em HTTP puro;
- manter `connect-src` restrito, com o host de tiles declarado explicitamente, sem curinga.

As regras de cache por caminho (`assets` imutável, `config.js` sem cache, `data` com revalidação curta, `index.html` sem cache) transcrevem-se em blocos `location`.

Compressão: habilitar gzip para GeoJSON no nginx. É o ganho mais barato do conjunto, porque GeoJSON comprime muito bem.

Downloads: garantir que o servidor envie `Content-Length` e `Content-Disposition` e aceite requisição por faixa, para que a fila de download do portal informe tamanho e o usuário possa retomar.

## Ordem de execução

1. corrigir os três comportamentos do produto (consulta em duas etapas, realce só do que intersectou, lista sob demanda);
2. avaliar compressão numa amostra real e fixar os parâmetros de miniatura e de download;
3. rodar o pipeline num bloco pequeno de um projeto, ponta a ponta;
4. subir o nginx com os cabeçalhos transcritos e publicar esse bloco;
5. validar no navegador, dentro da rede, com usuário que não participou da construção;
6. só então processar e publicar o projeto inteiro;
7. repetir por projeto.

O passo 5 é portão, não formalidade. Errar num bloco custa minutos, errar depois de processar um voo inteiro custa dias de máquina.

## Pendências

- Definir os parâmetros de compressão a partir de medição em amostra, não por estimativa.
- Definir o teto de resultados por consulta e o texto exibido ao ultrapassá-lo.
- Definir como a interface comunica a confiabilidade da posição sem transformar a ressalva em ruído.
- Confirmar o acesso administrativo ao servidor e quem opera a publicação em regime.
- Decidir a licença e o crédito por projeto, tema já levantado em [Decisões em aberto](11-decisoes-em-aberto.md).
