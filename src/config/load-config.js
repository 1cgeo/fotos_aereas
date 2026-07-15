import { normalizeConfig } from './validate-config.js';
import { assertSameOrigin } from '../security/urls.js';

const CONFIG_KEY = 'AERIAL_CATALOG_CONFIG';

export function loadRuntimeConfig(configUrl, options = {}) {
  const { documentRef = document, globalRef = globalThis, timeoutMs = 10_000 } = options;
  const url = new URL(configUrl, globalRef.location?.href);
  assertSameOrigin(url, globalRef.location?.origin);

  return new Promise((resolve, reject) => {
    const script = documentRef.createElement('script');
    const timeoutId = globalRef.setTimeout(() => {
      cleanup();
      reject(new Error('Tempo esgotado ao carregar config.js.'));
    }, timeoutMs);

    const cleanup = () => {
      globalRef.clearTimeout(timeoutId);
      script.remove();
    };

    script.src = url.href;
    script.async = true;

    script.addEventListener('load', () => {
      try {
        const rawConfig = globalRef[CONFIG_KEY];
        delete globalRef[CONFIG_KEY];
        cleanup();
        resolve(normalizeConfig(rawConfig, url));
      } catch (error) {
        cleanup();
        reject(error);
      }
    });

    script.addEventListener('error', () => {
      cleanup();
      reject(new Error('Não foi possível carregar config.js.'));
    });

    documentRef.head.appendChild(script);
  });
}

