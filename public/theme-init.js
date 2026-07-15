(() => {
  const key = 'aerial-catalog-theme';
  let theme = 'light';
  try {
    if (globalThis.localStorage?.getItem(key) === 'dark') theme = 'dark';
  } catch {
    // O armazenamento pode estar indisponível por política do navegador.
  }
  globalThis.document.documentElement.dataset.theme = theme;
})();
