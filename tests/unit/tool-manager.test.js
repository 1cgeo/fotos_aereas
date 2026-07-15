import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../src/app/store.js';
import { createToolManager } from '../../src/tools/tool-manager.js';

function store() {
  return createStore({ tools: { activeToolId: null, activationError: null } });
}

function tool(id) {
  return { id, activate: vi.fn(), deactivate: vi.fn(), destroy: vi.fn() };
}

describe('ToolManager', () => {
  it('mantém apenas uma ferramenta ativa e alterna a mesma', () => {
    const state = store();
    const manager = createToolManager(state);
    const first = manager.register(tool('point'));
    const second = manager.register(tool('polygon'));

    manager.activate('point');
    manager.activate('polygon');
    expect(first.deactivate).toHaveBeenCalledWith('switch');
    expect(second.activate).toHaveBeenCalledOnce();
    expect(state.getState().tools.activeToolId).toBe('polygon');

    manager.activate('polygon');
    expect(second.deactivate).toHaveBeenCalledWith('toggle');
    expect(state.getState().tools.activeToolId).toBeNull();
  });

  it('limpa falha de ativação e registra erro no estado', () => {
    const state = store();
    const manager = createToolManager(state);
    const broken = tool('broken');
    broken.activate.mockImplementation(() => {
      throw new Error('falhou');
    });
    manager.register(broken);

    expect(() => manager.activate('broken')).toThrow('falhou');
    expect(broken.deactivate).toHaveBeenCalledWith('activation-error');
    expect(state.getState().tools.activeToolId).toBeNull();
    expect(state.getState().tools.activationError.message).toBe('falhou');
  });

  it('rejeita registro duplicado', () => {
    const manager = createToolManager(store());
    manager.register(tool('point'));
    expect(() => manager.register(tool('point'))).toThrow(/duplicada/);
  });
});

