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

Cinco aerolevantamentos, 10.584 fotografias.

| id | voo | fotos |
|---|---|---|
| `cib-butia-2001` | Campo de Instrução de Butiá 2001 | 45 |
| `saica-2001` | Saicã 2001 | 130 |
| `fab-pr-1976` | FAB/DSG 1976 | 400 |
| `sacs-1975` | SACS 1975 | 2.058 |
| `ast10-1964` | AST-10 1964-1966 | 7.951 |
