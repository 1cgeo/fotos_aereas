const HTTPS_ONLY_PURPOSES = new Set(['geojson', 'thumbnail', 'download', 'link', 'style', 'contact']);

function isLocalhost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

// Implantação em intranet: o portal é servido por HTTP em rede interna, sem
// certificado. Exigir HTTPS de recursos do PRÓPRIO site inviabilizaria esse uso
// sem ganho de segurança: um recurso de mesma origem não é downgrade nem
// terceiro, já chega pelo mesmo canal da página que o pediu. A exigência de
// HTTPS continua valendo para qualquer host diferente do da página.
function isSameOriginAsBase(url, baseUrl) {
  if (!baseUrl) return false;
  try {
    return url.origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

export function assertSameOrigin(url, expectedOrigin) {
  const parsed = url instanceof URL ? url : new URL(url);
  if (!expectedOrigin || parsed.origin !== expectedOrigin) {
    throw new Error('config.js deve ser carregado do mesmo origin da aplicação.');
  }
  return parsed;
}

export function resolvePublicUrl(value, baseUrl, purpose = 'link', allowedHosts = null) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 2_048) {
    throw new TypeError(`URL inválida para ${purpose}.`);
  }
  const hasControlCharacter = [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (hasControlCharacter) throw new Error(`URL de ${purpose} contém caracteres de controle.`);

  const url = new URL(value, baseUrl);
  if (url.username || url.password) throw new Error(`URL de ${purpose} não pode conter credenciais.`);

  const allowsHttp = url.protocol === 'http:'
    && (isLocalhost(url.hostname) || isSameOriginAsBase(url, baseUrl));
  if (HTTPS_ONLY_PURPOSES.has(purpose) && url.protocol !== 'https:' && !allowsHttp) {
    throw new Error(`URL de ${purpose} deve usar HTTPS.`);
  }

  if (allowedHosts && !allowedHosts.includes(url.hostname)) {
    throw new Error(`Host não permitido para ${purpose}: ${url.hostname}.`);
  }

  return url;
}
