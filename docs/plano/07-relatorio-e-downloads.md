# Relatório e downloads

## Motivação

As fotografias originais podem ter centenas de megabytes. Buscar todas com JavaScript para montar um ZIP consumiria memória, duplicaria transferência em alguns fluxos e poderia travar a aba. A primeira versão deve manter cada arquivo como download direto e independente.

Navegadores também podem bloquear muitos downloads automáticos. O fluxo principal será uma fila conduzida pelo usuário, em que cada clique representa um download claro.

## Ação principal

O botão exigido pela interface se chama `Baixar todas`. Ele inicia a preparação do relatório e da fila; não significa que o navegador abrirá todos os arquivos simultaneamente. Um texto auxiliar explica: `Primeiro geraremos um relatório; depois você baixará as fotos uma a uma.`

Ao acioná-lo:

1. validar que existem resultados incluídos;
2. congelar um snapshot da consulta;
3. mostrar resumo de quantidade e tamanho conhecido;
4. aceitar eventuais termos configurados;
5. gerar o PDF;
6. oferecer o PDF como primeiro download;
7. criar a fila das fotografias;
8. abrir a visão de downloads no primeiro item.

O resumo junto ao botão pode dizer: `Gera um relatório e organiza 38 fotografias para download individual.`

## Snapshot

PDF e fila devem ser construídos a partir do mesmo objeto imutável:

```js
{
  id: 'uuid-ou-identificador-local',
  generatedAt: '2026-07-15T...',
  appTitle: '...',
  appVersion: '...',
  query: {
    method: 'point | polygon',
    geometry: {},
    scopeProjectIds: [],
    incompleteProjectIds: []
  },
  projects: [],
  photos: [],
  totals: {
    photos: 0,
    knownBytes: 0,
    unknownSizeCount: 0
  },
  attributions: []
}
```

Alterar projetos ativos, redesenhar ou executar outra consulta não muda uma fila já preparada. Para refletir a nova consulta, o usuário prepara outra fila.

## Conteúdo do PDF

### Capa e resumo

- título do portal;
- `Relatório de seleção de fotografias aéreas`;
- data e hora com fuso configurado;
- tipo de consulta;
- coordenada do ponto ou caixa envolvente e quantidade de vértices da área;
- escopo usado;
- total de projetos e fotografias;
- tamanho total conhecido e quantidade sem tamanho informado;
- aviso de consulta parcial, quando houver projeto com erro;
- identificador do snapshot.

### Seção por aerolevantamento

- título e período;
- instituição, executor, escala nominal e cobertura;
- descrição curta;
- licença, créditos e links escritos por extenso quando necessário;
- total de fotografias desse projeto na seleção.

### Relação das grades/fotografias

Tabela paginada com:

- ordem da fila;
- projeto;
- `photoNumber` e `photoId`;
- faixa/linha de voo;
- data da tomada;
- escala;
- nome do arquivo;
- tamanho;
- checksum quando fornecido;
- licença específica, se diferente do projeto.

A tabela é o registro das grades que originaram os downloads. Uma representação cartográfica vetorial, sem mapa-base, pode ser incluída como P1. Capturar diretamente o canvas do mapa-base não é requisito porque tiles externos podem impedir exportação por CORS e sua licença precisa ser respeitada.

### Rodapé

- número da página;
- título curto do portal;
- identificador do snapshot;
- aviso de que o relatório descreve uma consulta, não certifica completude do acervo.

## Regras de geração do PDF

- Gerar com `pdf-lib` somente após gesto do usuário.
- Incorporar uma fonte local que cubra caracteres portugueses e cuja licença permita redistribuição.
- Quebrar descrições por largura medida, não por contagem fixa de caracteres.
- Repetir cabeçalho da tabela em cada página.
- Evitar incluir miniaturas no P0; elas aumentam uso de rede, memória e problemas de CORS.
- Formatar datas e bytes antes de entregar o modelo ao gerador.
- Liberar a URL de objeto do PDF com `URL.revokeObjectURL` depois de tempo seguro ou ao substituir o relatório.
- Exibir progresso por seções em seleções grandes.
- Se a geração falhar, preservar a seleção e permitir tentar novamente.

Nome recomendado:

```text
relatorio_fotos_aereas_<AAAA-MM-DD>_<snapshot-curto>.pdf
```

## Fila de downloads

Cada item:

```js
{
  key: '<projectId>:<photoId>',
  order: 1,
  label: 'Foto 0123',
  projectTitle: 'Município 1958',
  url: 'https://...',
  filename: 'municipio-1958_foto-0123.tif',
  sizeBytes: 263192576,
  status: 'pending | triggered | confirmed | skipped | failed',
  attempts: 0,
  lastError: null
}
```

### Interface da fila

```text
Relatório
[✓ Baixar relatório novamente]

Fotografia 4 de 38
Foto 0123 · Município 1958 · 250,9 MB
[Baixar esta fotografia]
[Marcar como concluída e ir para a próxima]
[Ignorar] [Abrir link em nova aba]

3 confirmadas · 35 pendentes · 0 falhas
[ver toda a fila]
```

O download deve ser acionado por um link real quando possível. Para arquivos no mesmo domínio, o atributo `download` sugere o nome configurado. Em outro domínio, o navegador pode ignorá-lo; o servidor de arquivos deve enviar `Content-Disposition: attachment; filename="..."`.

O portal não marca automaticamente como concluído ao receber um evento inexistente de término. Após acionar, mostra `Download solicitado` e pede confirmação para avançar. Essa honestidade evita apresentar progresso falso.

## Botão individual nos resultados

O botão `Baixar fotografia` não exige gerar relatório. Ele é uma ação direta para uma única foto. O requisito de PDF precede somente o fluxo de conjunto iniciado por `Baixar todas`.

## Persistência

P0: fila mantida em memória enquanto a página estiver aberta.

P1: salvar no `sessionStorage` somente metadados, status e URLs públicas. Na restauração:

- validar `schemaVersion` da fila;
- limitar idade;
- reconciliar projetos/fotos ainda existentes;
- informar itens removidos do catálogo;
- nunca salvar blobs de fotos ou do PDF.

## Falhas

- URL ausente: item bloqueado e erro de dados.
- Servidor retorna página em vez de arquivo: oferecer link e orientar contato; detecção completa depende do servidor.
- Link expirado: não deve existir em arquitetura estática; reportar configuração inválida.
- Popup bloqueado: manter link clicável na mesma tela.
- Arquivo removido: `Tentar novamente` e contato do acervo.
- PDF falhou: não iniciar fila automaticamente; preservar snapshot.

## Requisitos do servidor de arquivos

Recomendados para uma boa experiência:

- HTTPS;
- `Content-Length` correto;
- `Content-Type` correto;
- `Content-Disposition: attachment` com nome seguro;
- suporte a `Accept-Ranges: bytes` para retomada pelo navegador;
- URLs estáveis;
- cache adequado a arquivos imutáveis;
- CORS se futuramente o portal precisar verificar ou ler os arquivos, embora o P0 use navegação direta.
