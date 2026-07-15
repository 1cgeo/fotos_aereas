import { setDownloadState } from '../app/actions.js';
import { createReportSnapshot } from './report-model.js';

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
        const bytes = await generateDownloadReport(snapshot);
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
