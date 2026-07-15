import { describe, expect, it } from 'vitest';
import { deduplicateAndSortResults } from '../../src/analysis/result-normalizer.js';

describe('deduplicateAndSortResults', () => {
  it('deduplica por chave e ordena naturalmente', () => {
    const results = [
      { key: 'p:10', projectSortOrder: 1, projectTitle: 'P', flightLine: 'F-2', photoNumber: '10', photoId: '10' },
      { key: 'p:2', projectSortOrder: 1, projectTitle: 'P', flightLine: 'F-2', photoNumber: '2', photoId: '2' },
      { key: 'p:2', projectSortOrder: 1, projectTitle: 'P', flightLine: 'F-2', photoNumber: '2', photoId: '2' }
    ];
    expect(deduplicateAndSortResults(results).map((result) => result.photoId)).toEqual(['2', '10']);
  });
});

