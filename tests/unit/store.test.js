import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/app/store.js';

describe('createStore', () => {
  it('atualiza estado e notifica assinantes', () => {
    const store = createStore({ value: 1 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setState((state) => ({ ...state, value: 2 }));
    expect(store.getState().value).toBe(2);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    store.setState((state) => ({ ...state, value: 3 }));
    expect(listener).toHaveBeenCalledOnce();
  });

  it('rejeita listener inválido', () => {
    const store = createStore({});
    expect(() => store.subscribe(null)).toThrow(TypeError);
  });
});

