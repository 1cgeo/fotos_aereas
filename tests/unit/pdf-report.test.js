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

  function quadrado(oeste, sul, lado = 0.05) {
    return {
      type: 'Polygon',
      coordinates: [[
        [oeste, sul], [oeste + lado, sul], [oeste + lado, sul + lado],
        [oeste, sul + lado], [oeste, sul]
      ]]
    };
  }

  function snapshotBase(overrides = {}) {
    return {
      siteTitle: 'Acervo',
      generatedAt: '2026-07-20T12:00:00Z',
      geometryType: 'Point',
      catalogVersion: '1',
      attribution: '© OpenStreetMap contributors',
      queryGeometry: { type: 'Point', coordinates: [-51.95, -29.98] },
      projects: [],
      items: [],
      ...overrides
    };
  }

  it('desenha o esquema quando ha geometria', async () => {
    const comGeometria = await generateDownloadReport(snapshotBase({
      projects: [{ id: 'a', title: 'Voo A', color: '#b45309' }],
      items: [{ projectId: 'a', projectTitle: 'Voo A', title: 'Foto 1', downloadFilename: 'a.jpg', geometry: quadrado(-52, -30) }]
    }));
    const semGeometria = await generateDownloadReport(snapshotBase({
      projects: [{ id: 'a', title: 'Voo A', color: '#b45309' }],
      items: [{ projectId: 'a', projectTitle: 'Voo A', title: 'Foto 1', downloadFilename: 'a.jpg', geometry: null }]
    }));
    // com geometria ha vetores desenhados no croqui, entao o arquivo cresce
    expect(comGeometria.byteLength).toBeGreaterThan(semGeometria.byteLength);
    await expect(PDFDocument.load(comGeometria)).resolves.toBeDefined();
  });

  it('nao quebra quando nenhum item tem geometria', async () => {
    const bytes = await generateDownloadReport(snapshotBase({
      projects: [{ id: 'a', title: 'Voo A', color: '#b45309' }],
      items: [{ projectId: 'a', projectTitle: 'Voo A', title: 'Foto 1', downloadFilename: 'a.jpg' }],
      queryGeometry: null
    }));
    await expect(PDFDocument.load(bytes)).resolves.toBeDefined();
  });

  it('lida com varios projetos misturados, cada um com sua cor e legenda', async () => {
    const bytes = await generateDownloadReport(snapshotBase({
      geometryType: 'Polygon',
      queryGeometry: quadrado(-52, -30, 3),
      projects: [
        { id: 'a', title: 'Voo A', color: '#b45309' },
        { id: 'b', title: 'Voo B', color: '#0369a1' },
        { id: 'c', title: 'Voo C', color: '#166534' }
      ],
      items: [
        { projectId: 'a', projectTitle: 'Voo A', title: 'A1', downloadFilename: 'a1.jpg', geometry: quadrado(-52, -30) },
        { projectId: 'b', projectTitle: 'Voo B', title: 'B1', downloadFilename: 'b1.jpg', geometry: quadrado(-51.5, -29.5) },
        { projectId: 'c', projectTitle: 'Voo C', title: 'C1', downloadFilename: 'c1.jpg', geometry: quadrado(-50.2, -28.2) },
        { projectId: 'a', projectTitle: 'Voo A', title: 'A2', downloadFilename: 'a2.jpg', geometry: quadrado(-52.1, -30.1) }
      ]
    }));
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
  });

  it('tolera item de projeto ausente da lista de projetos', async () => {
    const bytes = await generateDownloadReport(snapshotBase({
      projects: [{ id: 'a', title: 'Voo A', color: '#b45309' }],
      items: [
        { projectId: 'a', projectTitle: 'Voo A', title: 'A1', downloadFilename: 'a1.jpg', geometry: quadrado(-52, -30) },
        { projectId: 'fantasma', projectTitle: 'Voo Fantasma', title: 'F1', downloadFilename: 'f1.jpg', geometry: quadrado(-51.8, -29.8) }
      ]
    }));
    await expect(PDFDocument.load(bytes)).resolves.toBeDefined();
  });
});
