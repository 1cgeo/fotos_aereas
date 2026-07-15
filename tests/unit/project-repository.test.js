import { describe, expect, it, vi } from 'vitest';
import { createProjectRepository } from '../../src/data/project-repository.js';

const config = {
  projects: [
    {
      id: 'projeto-1',
      title: 'Projeto 1',
      extent: [-48, -16, -47, -15],
      data: { footprintsUrl: 'https://example.gov.br/footprints.geojson' }
    }
  ]
};

const payload = JSON.stringify({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        photoId: 'foto-1',
        photoNumber: '001',
        title: 'Foto 1',
        thumbnailUrl: './thumb.svg',
        downloadUrl: './original.svg',
        downloadFilename: 'original.svg'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-48, -16], [-47, -16], [-47, -15], [-48, -15], [-48, -16]]]
      }
    }
  ]
});

function response(body = payload) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (name === 'content-type' ? 'application/geo+json' : null) },
    text: vi.fn().mockResolvedValue(body)
  };
}

describe('createProjectRepository', () => {
  it('deduplica carregamentos simultâneos e mantém cache', async () => {
    const fetchFn = vi.fn().mockResolvedValue(response());
    const repository = createProjectRepository(config, { fetchFn });

    const [first, second] = await Promise.all([repository.load('projeto-1'), repository.load('projeto-1')]);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(first).toBe(second);
    expect(repository.getStatus('projeto-1')).toBe('ready');

    await repository.load('projeto-1');
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('isola erro e permite nova tentativa', async () => {
    const fetchFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(response());
    const repository = createProjectRepository(config, { fetchFn });

    await expect(repository.load('projeto-1')).rejects.toThrow('offline');
    await expect(repository.load('projeto-1')).resolves.toMatchObject({ projectId: 'projeto-1' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });
});

