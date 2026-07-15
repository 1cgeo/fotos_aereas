import { describe, expect, it } from 'vitest';
import { assertSameOrigin, resolvePublicUrl } from '../../src/security/urls.js';

describe('resolvePublicUrl', () => {
  it('resolve caminho relativo com HTTPS', () => {
    const result = resolvePublicUrl('./dados.geojson', 'https://example.gov.br/config.js', 'geojson');
    expect(result.href).toBe('https://example.gov.br/dados.geojson');
  });

  it.each(['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'file:///etc/passwd'])(
    'rejeita protocolo perigoso: %s',
    (value) => {
      expect(() => resolvePublicUrl(value, 'https://example.gov.br/config.js', 'download')).toThrow();
    }
  );

  it('rejeita credenciais embutidas', () => {
    expect(() =>
      resolvePublicUrl('https://user:password@example.gov.br/a.tif', 'https://example.gov.br', 'download')
    ).toThrow(/credenciais/);
  });

  it('aplica allowlist de hosts', () => {
    expect(() =>
      resolvePublicUrl('https://evil.example/a.tif', 'https://example.gov.br', 'download', [
        'arquivos.example.gov.br'
      ])
    ).toThrow(/Host não permitido/);
  });
});

describe('assertSameOrigin', () => {
  it('aceita a mesma origem', () => {
    expect(assertSameOrigin(new URL('https://example.gov.br/config.js'), 'https://example.gov.br')).toBeInstanceOf(URL);
  });

  it('rejeita outra origem', () => {
    expect(() =>
      assertSameOrigin(new URL('https://cdn.example/config.js'), 'https://example.gov.br')
    ).toThrow(/mesmo origin/);
  });
});

