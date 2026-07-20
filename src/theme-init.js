// Aplica o tema salvo ANTES da aplicação carregar, para o usuário de tema escuro
// não ver um lampejo claro. Fica FORA do bundle principal de propósito: é
// minúsculo e precisa executar cedo, sem esperar o download da aplicação.
//
// Mora em src/ (e não em public/) para o Vite reescrever o caminho dele conforme
// a base do build. Em public/ ele seria copiado verbatim, e num build de base
// relativa a referência quebraria.
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
