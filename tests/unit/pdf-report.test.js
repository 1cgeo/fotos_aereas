import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { generateDownloadReport } from '../../src/downloads/pdf-report.js';

describe('PDF de download', () => {
  it('gera documento válido e pagina listas extensas', async () => {
    const snapshot = {
      siteTitle: 'Acervo de Fotografias Aéreas',
      generatedAt: '2026-07-15T12:00:00Z',
      geometryType: 'Polygon',
      catalogVersion: '1',
      attribution: '© OpenStreetMap contributors',
      projects: [{ title: 'Voo Histórico', period: '1958', institution: 'Arquivo', license: 'Livre' }],
      items: Array.from({ length: 45 }, (_, index) => ({
        title: `Fotografia ${index + 1}`,
        projectTitle: 'Voo Histórico',
        flightLine: 'FX-01',
        capturedAt: '1958-08-04',
        nominalScale: '1:25.000',
        downloadFilename: `foto-${index + 1}.tif`,
        licenseLabel: 'Livre'
      }))
    };
    const bytes = await generateDownloadReport(snapshot);
    const document = await PDFDocument.load(bytes);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(document.getPageCount()).toBeGreaterThan(1);
    expect(document.getTitle()).toContain('Acervo');
  });
});
