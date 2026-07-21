import { setDownloadState, setZipState } from '../app/actions.js';
import { createReportSnapshot } from './report-model.js';
import { resolvePublicUrl } from '../security/urls.js';
import {
  baixarComoZip,
  dividirEmLotes,
  pedirDestino,
  suportaGravacaoEmDisco,
  tamanhoEstimado
} from './zip-download.js';

// Descobre o endereco dos tiles a partir do estilo do mapa-base ja configurado,
// para o relatorio usar o MESMO fundo que o usuario viu na tela.
async function descobreTemplateDeTiles(config, signal) {
  try {
    const resposta = await fetch(config.basemap.styleUrl, { signal, credentials: 'omit' });
    if (!resposta.ok) return null;
    const estilo = await resposta.json();
    for (const fonte of Object.values(estilo?.sources || {})) {
      const url = Array.isArray(fonte?.tiles) ? fonte.tiles[0] : null;
      if (!url) continue;
      // Passa pela mesma validacao das demais URLs publicas do portal.
      resolvePublicUrl(url.replace(/\{[zxy]\}/g, '0'), config.basemap.styleUrl, 'link');
      return url;
    }
  } catch {
    return null;
  }
  return null;
}

function limitesDosResultados(snapshot) {
  let oeste = Infinity;
  let sul = Infinity;
  let leste = -Infinity;
  let norte = -Infinity;
  const registra = (x, y) => {
    oeste = Math.min(oeste, x); leste = Math.max(leste, x);
    sul = Math.min(sul, y); norte = Math.max(norte, y);
  };
  const percorre = (geometry) => {
    if (!geometry) return;
    if (geometry.type === 'Point') return registra(...geometry.coordinates);
    const poligonos = geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : geometry.coordinates;
    for (const anel of poligonos || []) for (const [x, y] of anel) registra(x, y);
  };
  snapshot.items.forEach((item) => percorre(item.geometry));
  percorre(snapshot.queryGeometry);
  return Number.isFinite(oeste) ? [oeste, sul, leste, norte] : null;
}

function triggerUrlDownload(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.referrerPolicy = 'no-referrer';
  link.click();
}

function triggerBlobDownload(bytes, filename) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  triggerUrlDownload(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function createDownloadController({ config, store }) {
  // O fundo do mapa é enfeite útil, não requisito: qualquer falha aqui devolve
  // null e o relatório sai com o croqui vetorial.
  async function capturaFundo(snapshot) {
    try {
      const limites = limitesDosResultados(snapshot);
      if (!limites) return null;
      const template = await descobreTemplateDeTiles(config);
      if (!template) return null;
      const { capturaMapaBase } = await import('./basemap-snapshot.js');
      return await capturaMapaBase(limites, { template, larguraPx: 1400, proporcao: 499.28 / 310 });
    } catch (error) {
      console.warn('Mapa de referência do relatório indisponível.', error);
      return null;
    }
  }

  // O PDF gerado fica guardado para poder ser baixado de novo. Sem isto, o
  // relatório só existia no instante em que era gerado: se o download falhasse
  // ou o usuário perdesse o arquivo, a única saída era refazer a consulta
  // inteira. Guardamos os BYTES, não a URL, porque a object URL é revogada.
  let relatorio = null;

  // Estado do ZIP que NAO precisa disparar render: as fotografias de cada parte
  // e o controlador de cancelamento. O que a tela mostra vive no store.
  let partesDoZip = [];
  let cancelamento = null;
  let relatorioDoZip = null;
  let consultaDoZip = null;

  // O mesmo relatório do botão do PDF, gerado UMA vez e repetido em cada parte:
  // uma parte solta continua dizendo de onde veio e o que contém. Falhar aqui
  // não cancela o ZIP, que é o que o usuário veio buscar.
  async function relatorioParaOZip(query) {
    if (relatorioDoZip) return [relatorioDoZip];
    try {
      const snapshot = createReportSnapshot({ config, query });
      const { generateDownloadReport } = await import('./pdf-report.js');
      const comMapa = { ...snapshot, basemap: await capturaFundo(snapshot) };
      relatorioDoZip = {
        name: `relatorio_fotos_aereas_${snapshot.id.slice(0, 8)}.pdf`,
        input: await generateDownloadReport(comMapa)
      };
      return [relatorioDoZip];
    } catch (error) {
      console.warn('Relatório não pôde ser gerado; o ZIP sai sem ele.', error);
      return [];
    }
  }

  function nomeDaParte(indice, total) {
    const carimbo = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (total === 1) return `fotos_aereas_${carimbo}.zip`;
    return `fotos_aereas_${carimbo}_parte${indice + 1}de${total}.zip`;
  }

  // Uma parte, do pedido de destino ate o arquivo fechado. Quem chama ja fez o
  // gesto do usuario, entao o seletor de arquivo pode abrir aqui.
  async function executaParte(indice, destino, query) {
    const parte = partesDoZip[indice];
    if (!parte) return false;
    cancelamento = new AbortController();
    setZipState(store, {
      status: 'preparing',
      parteAtual: indice,
      progresso: { feitos: 0, total: parte.items.length, bytes: 0 },
      erro: null
    });
    try {
      const extras = await relatorioParaOZip(query);
      setZipState(store, { status: 'running' });
      const resultado = await baixarComoZip({
        items: parte.items,
        nomeArquivo: parte.nomeArquivo,
        destino,
        extras,
        signal: cancelamento.signal,
        onProgress: (progresso) => setZipState(store, { progresso })
      });
      partesDoZip[indice] = { ...parte, concluida: true };
      const state = store.getState().downloads.zip;
      setZipState(store, {
        status: 'ready',
        parteAtual: null,
        progresso: null,
        concluidas: new Set(state.concluidas).add(indice),
        falhas: [...state.falhas, ...resultado.falhas]
      });
      return true;
    } catch (erro) {
      const cancelado = erro?.name === 'AbortError';
      setZipState(store, {
        status: cancelado ? 'cancelled' : 'error',
        parteAtual: null,
        progresso: null,
        erro: cancelado ? null : erro
      });
      return false;
    } finally {
      cancelamento = null;
    }
  }

  return Object.freeze({
    async start(query) {
      if (!query.results.length) return;
      relatorio = null;
      const snapshot = createReportSnapshot({ config, query });
      setDownloadState(store, {
        snapshotId: snapshot.id,
        snapshot,
        reportStatus: 'generating',
        error: null,
        items: snapshot.items,
        baixados: new Set()
      });
      try {
        const { generateDownloadReport } = await import('./pdf-report.js');
        const comMapa = { ...snapshot, basemap: await capturaFundo(snapshot) };
        const bytes = await generateDownloadReport(comMapa);
        relatorio = { bytes, filename: `relatorio_fotos_aereas_${snapshot.id.slice(0, 8)}.pdf` };
        triggerBlobDownload(bytes, relatorio.filename);
        setDownloadState(store, { reportStatus: 'ready', reportFilename: relatorio.filename });
      } catch (error) {
        setDownloadState(store, { reportStatus: 'error', error });
      }
    },
    // Baixa UMA foto, identificada pela chave. Marcar como baixada é registro do
    // que o usuário acionou, nunca trava: repetir o clique rebaixa, que é o que
    // salva quem perdeu o arquivo por queda de conexão.
    downloadItem(key) {
      const downloads = store.getState().downloads;
      const item = downloads.items.find((candidate) => candidate.key === key);
      if (!item) return false;
      triggerUrlDownload(item.downloadUrl, item.downloadFilename);
      setDownloadState(store, { baixados: new Set(downloads.baixados).add(key) });
      return true;
    },
    // Baixa a consulta inteira como ZIP. Com gravação em disco é UM arquivo,
    // escrito em fluxo, sem teto de tamanho. Sem ela, a seleção é fatiada em
    // partes que caibam na memória da aba, e cada parte vira um botão: 3 cliques
    // para 2 GB continua sendo outra ordem de grandeza diante de 50 cliques.
    async startZip(query) {
      const results = query?.results || [];
      if (!results.length) return false;

      consultaDoZip = query;
      relatorioDoZip = null;
      const emDisco = suportaGravacaoEmDisco();
      const lotes = emDisco ? [results] : dividirEmLotes(results);
      partesDoZip = lotes.map((items, indice) => ({
        items,
        nomeArquivo: nomeDaParte(indice, lotes.length),
        total: items.length,
        bytes: tamanhoEstimado(items),
        concluida: false
      }));
      setZipState(store, {
        status: 'pending',
        modo: emDisco ? 'disco' : 'memoria',
        partes: partesDoZip.map(({ nomeArquivo, total, bytes }) => ({ nomeArquivo, total, bytes })),
        concluidas: new Set(),
        falhas: [],
        erro: null,
        parteAtual: null,
        progresso: null
      });

      // Com uma parte só, o clique que chegou até aqui já é o pedido: segue
      // direto. Com várias, a tela lista as partes e cada uma é um clique.
      if (partesDoZip.length === 1) return this.downloadZipParte(0);
      return true;
    },

    // O seletor de arquivo exige ativação do usuário, então ele é a PRIMEIRA
    // coisa do clique: qualquer espera antes consome o gesto e o navegador nega.
    async downloadZipParte(indice) {
      const parte = partesDoZip[indice];
      const status = store.getState().downloads.zip.status;
      if (!parte || status === 'running' || status === 'preparing') return false;
      let destino = null;
      if (suportaGravacaoEmDisco()) {
        destino = await pedirDestino(parte.nomeArquivo);
        if (destino?.cancelado) {
          setZipState(store, { status: 'pending' });
          return false;
        }
      }
      return executaParte(indice, destino, consultaDoZip);
    },

    cancelZip() {
      cancelamento?.abort();
      return true;
    },

    // Rebaixa o PDF já gerado, sem refazer o relatório: é o mesmo arquivo, então
    // o que o usuário conferir bate com o que já tinha em mãos.
    downloadReport() {
      if (!relatorio) return false;
      triggerBlobDownload(relatorio.bytes, relatorio.filename);
      return true;
    },
    reset() {
      relatorio = null;
      cancelamento?.abort();
      cancelamento = null;
      partesDoZip = [];
      relatorioDoZip = null;
      consultaDoZip = null;
      setZipState(store, {
        status: 'idle',
        modo: null,
        partes: [],
        concluidas: new Set(),
        falhas: [],
        erro: null,
        parteAtual: null,
        progresso: null
      });
      setDownloadState(store, {
        snapshotId: null,
        snapshot: null,
        reportStatus: 'idle',
        error: null,
        reportFilename: null,
        items: [],
        baixados: new Set()
      });
    }
  });
}
