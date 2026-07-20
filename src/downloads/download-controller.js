import { setDownloadState } from '../app/actions.js';
import { createReportSnapshot } from './report-model.js';
import { resolvePublicUrl } from '../security/urls.js';

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

  return Object.freeze({
    async start(query) {
      if (!query.results.length) return;
      const snapshot = createReportSnapshot({ config, query });
      setDownloadState(store, {
        snapshotId: snapshot.id,
        snapshot,
        reportStatus: 'generating',
        error: null,
        items: snapshot.items,
        currentIndex: 0
      });
      try {
        const { generateDownloadReport } = await import('./pdf-report.js');
        const comMapa = { ...snapshot, basemap: await capturaFundo(snapshot) };
        const bytes = await generateDownloadReport(comMapa);
        triggerBlobDownload(bytes, `relatorio_fotos_aereas_${snapshot.id.slice(0, 8)}.pdf`);
        setDownloadState(store, { reportStatus: 'ready' });
      } catch (error) {
        setDownloadState(store, { reportStatus: 'error', error });
      }
    },
    downloadNext() {
      const downloads = store.getState().downloads;
      const item = downloads.items[downloads.currentIndex];
      if (!item) return false;
      triggerUrlDownload(item.downloadUrl, item.downloadFilename);
      setDownloadState(store, { currentIndex: downloads.currentIndex + 1 });
      return true;
    },
    reset() {
      setDownloadState(store, {
        snapshotId: null,
        snapshot: null,
        reportStatus: 'idle',
        error: null,
        items: [],
        currentIndex: 0
      });
    }
  });
}
