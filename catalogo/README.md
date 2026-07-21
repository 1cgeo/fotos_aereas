# Catálogo de produção

`config.producao.js` é o catálogo real do portal: os aerolevantamentos publicados, com os metadados de cada voo lidos das tarjas dos foto-índices e das grades.

Ele vive versionado aqui para ter **histórico e backup**. O arquivo que o servidor lê é uma cópia dele em `config.js`, na raiz do diretório publicado. O `public/config.js` do repositório continua sendo o catálogo de DEMONSTRAÇÃO, com dados fictícios, e é o que o build serve.

## Para publicar uma alteração do catálogo

1. edite `catalogo/config.producao.js`;
2. copie para a raiz do diretório publicado, como `config.js`;
3. o portal carrega o catálogo em runtime, sem rebuild.

## Regras que este arquivo precisa respeitar

- **Nenhum endereço interno.** Todas as URLs de dado são relativas (`./data/<projeto>/...`). Não pode conter IP, nome de host, letra de drive nem caminho de rede.
- **`id` de projeto** em minúsculas com hífen, e ele é o nome da pasta em `data/`.
- **`extent`** em EPSG:4326, na ordem oeste, sul, leste, norte.
- **`coverageUrl`** é o contorno real do voo, não a caixa envolvente: é o que permite à consulta descartar um projeto sem baixar a grade dele.
- Acrescentar um voo é acrescentar um objeto em `projects` e subir os arquivos dele em `data/<id>/`.

## Estado

Seis aerolevantamentos. O ITC-PR 1980 esta em ingestao; a contagem dele e a das
fotografias ja gravadas no servidor, e sobe a cada retomada.

| id | voo | fotos |
|---|---|---|
| `cib-butia-2001` | Campo de Instrução de Butiá 2001 | 45 |
| `saica-2001` | Saicã 2001 | 130 |
| `fab-pr-1976` | FAB/DSG 1976 | 400 |
| `sacs-1975` | SACS 1975 | 2.058 |
| `ast10-1964` | AST-10 1964-1966 | 7.951 |
| `pr-itc-1980` | Aerolevantamento ITC-PR 1980 (Parana) | em ingestao |

## Sobre o `pr-itc-1980`

Unico voo do catalogo que NAO e do acervo do 1o CGEO: as fotografias e a
articulacao sao do IAT/ITCG (Governo do Parana), dado publico do GeoPR, e o
credito esta no `credits` e no `licenseLabel` de cada fotografia.

O que e nosso ali e o CONTORNO. A articulacao publicada registra a area util (o
retalho sem recobrimento, ~24% da foto), nao o recobrimento; reconstruimos o
footprint estendendo cada area util pelas arestas que os vizinhos cortam, com o
lado medido por SIFT no nosso acervo (recobrimento real 62,3%, lado 5,754 km).
A POSICAO continua sendo a da fonte, com incerteza da ordem de 1 km, e isso vai
dito no `notes` de cada fotografia.

### Ingestao

Retomavel: o estado vive num SQLite com uma linha por fotografia, e o processo
pode ser morto e recomecado sem refazer nada.

O banco de estado tem de ficar em disco LOCAL, NUNCA no compartilhamento de rede
onde ficam as fotografias. Na primeira corrida ele estava na rede em modo WAL e
travou aos 26%: o WAL do SQLite depende de memoria compartilhada (arquivo -shm)
que o SMB nao implementa, e os arquivos -wal/-shm continuaram bloqueando o banco
DEPOIS de o processo morrer. O script agora se recusa a rodar com o banco em
unidade de rede.

Do voo, 1.162 fotografias (4,0%) estao inacessiveis na origem: 1.090 respondem
404 e 72 vem corrompidas (um unico byte, servido com HTTP 200 e Content-Type
image/jpeg). Dessas, 19 foram RESGATADAS do acervo do 1o CGEO, que tem 2.654
fotografias deste mesmo voo digitalizadas; elas ficam marcadas com procedencia
propria, porque o enquadramento do nosso scan e maior que o do IAT.

So se publica footprint cuja fotografia esta no disco: a grade e montada a
partir do estado da ingestao, nunca da grade completa. Publicar footprint cujo
download quebra e pior do que nao ter a fotografia.
