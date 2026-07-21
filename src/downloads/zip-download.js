import { makeZip } from 'client-zip';

// Sem gravacao em disco (navegador sem File System Access API), o ZIP inteiro
// tem de caber na memoria da aba. Em vez de proibir a selecao grande, ela e
// FATIADA em partes deste tamanho: cada parte e um ZIP inteiro e independente.
export const TETO_EM_MEMORIA_BYTES = 700 * 1024 ** 2;

export function suportaGravacaoEmDisco() {
  return typeof globalThis.showSaveFilePicker === 'function';
}

/**
 * Fatia a selecao em partes que caibam no teto. Uma fotografia sozinha maior que
 * o teto vai na sua propria parte: dividir arquivo nao esta em questao, o que se
 * divide e a lista. Devolve sempre ao menos uma parte.
 */
export function dividirEmLotes(items, teto = TETO_EM_MEMORIA_BYTES) {
  const lotes = [];
  let atual = [];
  let acumulado = 0;
  for (const item of items) {
    const tamanho = Number(item.sizeBytes) || 0;
    if (atual.length > 0 && acumulado + tamanho > teto) {
      lotes.push(atual);
      atual = [];
      acumulado = 0;
    }
    atual.push(item);
    acumulado += tamanho;
  }
  if (atual.length > 0) lotes.push(atual);
  return lotes.length > 0 ? lotes : [[]];
}

export function tamanhoEstimado(items) {
  return items.reduce((soma, item) => soma + (Number(item.sizeBytes) || 0), 0);
}

export function formataTamanho(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

function pastaDoProjeto(titulo, id) {
  const base = (titulo || id || 'aerolevantamento')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || id || 'aerolevantamento';
}

// Nome dentro do ZIP: uma pasta por aerolevantamento, porque uma consulta pode
// responder por varios voos e os numeros de fotografia se repetem entre eles.
// Colisao residual ganha sufixo em vez de sobrescrever silenciosamente.
function nomeNoZip(item, usados) {
  const pasta = pastaDoProjeto(item.projectTitle, item.projectId);
  const arquivo = item.downloadFilename || `${item.photoId}.jpg`;
  let nome = `${pasta}/${arquivo}`;
  if (!usados.has(nome)) {
    usados.add(nome);
    return nome;
  }
  const ponto = nome.lastIndexOf('.');
  const raiz = ponto > 0 ? nome.slice(0, ponto) : nome;
  const extensao = ponto > 0 ? nome.slice(ponto) : '';
  let sufixo = 2;
  while (usados.has(`${raiz}_${sufixo}${extensao}`)) sufixo += 1;
  nome = `${raiz}_${sufixo}${extensao}`;
  usados.add(nome);
  return nome;
}

function campoCsv(valor) {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// Vai junto no ZIP para a pasta baixada nao virar um monte de JPEG sem
// procedencia. Separador ';' e BOM porque quem abre isso abre no Excel pt-BR.
export function montaCsv(items, nomesPorChave) {
  const cabecalho = [
    'aerolevantamento', 'fotografia', 'faixa', 'data', 'escala',
    'arquivo_no_zip', 'tamanho_bytes', 'sha256', 'licenca', 'observacoes'
  ];
  const linhas = items.map((item) => [
    item.projectTitle,
    item.photoNumber || item.photoId,
    item.flightLine,
    item.capturedAt,
    item.nominalScale,
    nomesPorChave.get(item.key) || '',
    item.sizeBytes,
    item.checksumSha256,
    item.licenseLabel,
    item.notes
  ].map(campoCsv).join(';'));
  const BOM = '﻿'; // marca de ordem de byte, para o Excel abrir o CSV em UTF-8
  return `${BOM}${[cabecalho.join(';'), ...linhas].join('\r\n')}\r\n`;
}

function montaAvisoDeFalhas(falhas) {
  const linhas = falhas.map((falha) => `${falha.arquivo}\t${falha.motivo}`);
  return [
    'Fotografias que NAO entraram neste ZIP.',
    '',
    'Cada linha traz o arquivo e o motivo. Repita a consulta para tentar de',
    'novo, ou baixe estas fotografias uma a uma pela lista do portal.',
    '',
    ...linhas,
    ''
  ].join('\r\n');
}

// Gera as entradas do ZIP sob demanda: a proxima fotografia so e buscada
// quando a anterior ja foi escrita no arquivo de saida. E o que mantem o uso de
// memoria no tamanho de UMA fotografia, e nao no da selecao inteira.
async function* entradasDoZip(items, { signal, onProgress, falhas, nomesPorChave, agora, extras }) {
  const usados = new Set();
  for (const item of items) nomesPorChave.set(item.key, nomeNoZip(item, usados));

  yield { name: 'metadados.csv', lastModified: agora, input: montaCsv(items, nomesPorChave) };
  // Anexos prontos (o relatorio PDF) vao na frente das fotografias: quem abre o
  // ZIP encontra primeiro o que explica o que ele tem em maos.
  for (const extra of extras) yield { name: extra.name, lastModified: agora, input: extra.input };

  let feitos = 0;
  let bytes = 0;
  for (const item of items) {
    if (signal?.aborted) throw new DOMException('Download cancelado.', 'AbortError');
    let resposta;
    try {
      resposta = await fetch(item.downloadUrl, {
        signal,
        credentials: 'omit',
        referrerPolicy: 'no-referrer'
      });
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    } catch (erro) {
      if (erro?.name === 'AbortError') throw erro;
      // Uma fotografia indisponivel na origem nao pode derrubar o lote inteiro:
      // registra a falha, segue, e o ZIP sai com um aviso no fim.
      falhas.push({ arquivo: item.downloadFilename || item.photoId, motivo: erro.message || 'falha de rede' });
      continue;
    }

    yield { name: nomesPorChave.get(item.key), lastModified: agora, input: resposta };

    // Executa quando o consumidor pede a proxima entrada, ou seja, depois de
    // esta fotografia ter sido escrita por inteiro.
    feitos += 1;
    bytes += Number(item.sizeBytes) || 0;
    onProgress?.({ feitos, bytes, total: items.length });
  }

  if (falhas.length > 0) {
    yield { name: 'FOTOGRAFIAS_QUE_FALHARAM.txt', lastModified: agora, input: montaAvisoDeFalhas(falhas) };
  }
}

function disparaBlob(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.rel = 'noopener noreferrer';
  link.referrerPolicy = 'no-referrer';
  link.click();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Pede o destino ao usuario. Precisa ser chamado DENTRO do gesto que originou o
 * download (o clique): o navegador so abre o seletor de arquivo sob ativacao do
 * usuario, e qualquer espera antes disso a consome.
 * Devolve null quando o navegador nao tem a API ou quando o usuario desiste.
 */
export async function pedirDestino(nomeArquivo) {
  if (!suportaGravacaoEmDisco()) return null;
  try {
    return await globalThis.showSaveFilePicker({
      suggestedName: nomeArquivo,
      types: [{ description: 'Arquivo ZIP', accept: { 'application/zip': ['.zip'] } }]
    });
  } catch (erro) {
    if (erro?.name === 'AbortError') return { cancelado: true };
    return null;
  }
}

/**
 * Monta o ZIP das fotografias selecionadas.
 * Com destino em disco, o arquivo e escrito em fluxo, uma fotografia por vez.
 * Sem destino, cai para um Blob em memoria (limite pratico do navegador).
 * Devolve { feitos, total, bytes, falhas }.
 */
export async function baixarComoZip({
  items,
  nomeArquivo,
  destino = null,
  signal,
  onProgress,
  extras = [],
  agora = new Date()
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Nenhuma fotografia para baixar.');
  }
  // Sai antes de abrir qualquer fluxo: montar o ZIP para descartar em seguida
  // deixaria a rejeicao do fluxo sem dono.
  if (signal?.aborted) throw new DOMException('Download cancelado.', 'AbortError');
  const falhas = [];
  const nomesPorChave = new Map();
  const fluxo = makeZip(entradasDoZip(items, { signal, onProgress, falhas, nomesPorChave, agora, extras }));

  if (destino) {
    const escrita = await destino.createWritable();
    try {
      // Sem passar o signal ao pipeTo de proposito: o cancelamento ja chega pelo
      // fetch e pelo gerador, e com os dois caminhos ativos o erro da origem
      // ficava sem dono (rejeicao nao tratada) quando o pipeTo abortava antes.
      await fluxo.pipeTo(escrita);
    } catch (erro) {
      // Sem isto, um cancelamento deixa o arquivo aberto e truncado no disco.
      await escrita.abort?.().catch(() => {});
      throw erro;
    }
  } else {
    const blob = await new Response(fluxo).blob();
    if (signal?.aborted) throw new DOMException('Download cancelado.', 'AbortError');
    disparaBlob(blob, nomeArquivo);
  }

  return {
    total: items.length,
    feitos: items.length - falhas.length,
    bytes: items.reduce((soma, item) => soma + (Number(item.sizeBytes) || 0), 0),
    falhas
  };
}
