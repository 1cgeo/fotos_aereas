export function createAnalysisRegistry() {
  const definitions = new Map();
  return Object.freeze({
    register(definition) {
      if (!definition?.id || typeof definition.validate !== 'function' || typeof definition.executeProject !== 'function') {
        throw new TypeError('Análise deve possuir id, validate e executeProject.');
      }
      if (definitions.has(definition.id)) throw new Error(`Análise duplicada: ${definition.id}.`);
      definitions.set(definition.id, Object.freeze(definition));
      return definition;
    },
    get(id) {
      return definitions.get(id) || null;
    },
    list() {
      return [...definitions.values()];
    }
  });
}

