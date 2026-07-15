import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('postura de segurança do cliente', () => {
  it('não usa APIs de injeção de HTML ou execução dinâmica', () => {
    const files = globSync('src/**/*.js');
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\.innerHTML\s*=|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function\s*\(/);
    }
  });

  it('publica CSP e cabeçalhos defensivos no arquivo de hospedagem', () => {
    const headers = readFileSync('public/_headers', 'utf8');
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("object-src 'none'");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Permissions-Policy:');
  });
});
