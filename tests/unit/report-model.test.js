import { describe, expect, it, vi } from 'vitest';
import { createReportSnapshot } from '../../src/downloads/report-model.js';

describe('snapshot do relatório', () => {
  it('congela a seleção e inclui metadados dos voos usados', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00Z'));
    const config = {
      catalogVersion: '7',
      site: { title: 'Acervo' },
      basemap: { reportAttributionText: 'OSM' },
      projects: [{
        id: 'voo-a', title: 'Voo A', period: { display: '1958' }, institution: 'Arquivo',
        license: { label: 'Livre' }, nominalScale: '1:25.000'
      }]
    };
    const query = {
      geometry: { geometry: { type: 'Polygon' } },
      scopeProjectIds: ['voo-a'],
      results: [{
        key: 'voo-a:1', projectId: 'voo-a', projectTitle: 'Voo A', photoId: '1',
        photoNumber: '001', title: 'Foto 1', downloadUrl: 'https://example.test/1.tif',
        downloadFilename: '1.tif', nominalScale: '1:25.000'
      }]
    };
    const snapshot = createReportSnapshot({ config, query });
    expect(snapshot.geometryType).toBe('Polygon');
    expect(snapshot.projects[0]).toMatchObject({ title: 'Voo A', institution: 'Arquivo' });
    expect(snapshot.items[0].downloadFilename).toBe('1.tif');
    query.results[0].title = 'Alterada';
    expect(snapshot.items[0].title).toBe('Foto 1');
    vi.useRealTimers();
  });
});
