import { describe, expect, it, vi } from 'vitest';
import { createCleanupScope } from '../../src/tools/cleanup-scope.js';

describe('createCleanupScope', () => {
  it('remove listeners em ordem reversa e é idempotente', () => {
    const calls = [];
    const scope = createCleanupScope();
    scope.add(() => calls.push('first'));
    scope.add(() => calls.push('second'));
    scope.cleanup();
    scope.cleanup();
    expect(calls).toEqual(['second', 'first']);
  });

  it('rastreia listener MapLibre', () => {
    const map = { on: vi.fn(), off: vi.fn() };
    const handler = vi.fn();
    const scope = createCleanupScope();
    scope.mapOn(map, 'click', handler);
    scope.cleanup();
    expect(map.on).toHaveBeenCalledWith('click', handler);
    expect(map.off).toHaveBeenCalledWith('click', handler);
  });
});

