import { afterEach } from 'vitest';

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  delete globalThis.AERIAL_CATALOG_CONFIG;
});

