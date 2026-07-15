import { setActiveTool } from '../app/actions.js';

export function createToolManager(store) {
  const tools = new Map();
  let activeTool = null;

  return Object.freeze({
    register(tool) {
      if (!tool?.id || typeof tool.activate !== 'function' || typeof tool.deactivate !== 'function') {
        throw new TypeError('Ferramenta deve possuir id, activate e deactivate.');
      }
      if (tools.has(tool.id)) throw new Error(`Ferramenta duplicada: ${tool.id}.`);
      tools.set(tool.id, tool);
      return tool;
    },

    activate(toolId) {
      const tool = tools.get(toolId);
      if (!tool) throw new Error(`Ferramenta desconhecida: ${toolId}.`);
      if (activeTool === tool) {
        this.deactivate('toggle');
        return null;
      }

      if (activeTool) {
        const previous = activeTool;
        activeTool = null;
        previous.deactivate('switch');
      }

      try {
        tool.activate();
        activeTool = tool;
        setActiveTool(store, tool.id);
        return tool;
      } catch (error) {
        try {
          tool.deactivate('activation-error');
        } catch (cleanupError) {
          console.error('Falha ao desfazer ativação de ferramenta:', cleanupError);
        }
        activeTool = null;
        setActiveTool(store, null, error);
        throw error;
      }
    },

    deactivate(reason = 'manual') {
      if (!activeTool) {
        setActiveTool(store, null);
        return;
      }
      const previous = activeTool;
      activeTool = null;
      previous.deactivate(reason);
      setActiveTool(store, null);
    },

    getActiveTool() {
      return activeTool;
    },

    get(toolId) {
      return tools.get(toolId) || null;
    },

    destroy() {
      if (activeTool) this.deactivate('destroy');
      for (const tool of tools.values()) tool.destroy?.();
      tools.clear();
    }
  });
}

