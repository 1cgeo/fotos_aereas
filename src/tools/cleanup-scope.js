export function createCleanupScope() {
  const cleanups = [];
  let cleaned = false;

  function add(cleanup) {
    if (typeof cleanup !== 'function') throw new TypeError('Cleanup deve ser uma função.');
    if (cleaned) {
      cleanup();
      return cleanup;
    }
    cleanups.push(cleanup);
    return cleanup;
  }

  return Object.freeze({
    add,

    mapOn(map, eventName, handler) {
      map.on(eventName, handler);
      add(() => map.off(eventName, handler));
      return handler;
    },

    domOn(target, eventName, handler, options) {
      target.addEventListener(eventName, handler, options);
      add(() => target.removeEventListener(eventName, handler, options));
      return handler;
    },

    trackAnimationFrame(frameId) {
      add(() => cancelAnimationFrame(frameId));
      return frameId;
    },

    trackTimer(timerId, type = 'timeout') {
      add(() => (type === 'interval' ? clearInterval(timerId) : clearTimeout(timerId)));
      return timerId;
    },

    trackAbortController(controller) {
      add(() => controller.abort());
      return controller;
    },

    cleanup() {
      if (cleaned) return;
      cleaned = true;
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        try {
          cleanups[index]();
        } catch (error) {
          console.error('Falha ao limpar recurso de ferramenta:', error);
        }
      }
      cleanups.length = 0;
    },

    get cleaned() {
      return cleaned;
    }
  });
}

