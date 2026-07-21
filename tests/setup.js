import { afterEach } from 'vitest';

afterEach(() => {
  // Nem todo arquivo de teste roda em jsdom: os que nao tocam no DOM rodam em
  // node, e ali nao ha document para limpar.
  if (typeof document !== 'undefined') {
    document.head.replaceChildren();
    document.body.replaceChildren();
  }
  delete globalThis.AERIAL_CATALOG_CONFIG;
});

