import { describe, expect, it } from 'vitest';
import { normalizeConfig } from '../../src/config/validate-config.js';

function validConfig() {
  return {
    schemaVersion: 1,
    site: {
      title: 'Portal',
      shortTitle: 'Portal',
      description: 'Descrição',
      initialView: { center: [-47, -15], zoom: 5 }
    },
    basemap: { styleUrl: './style.json' },
    projects: [
      {
        id: 'projeto-1',
        title: 'Projeto 1',
        summary: 'Resumo',
        extent: [-48, -16, -47, -15],
        data: { footprintsUrl: './projeto.geojson' },
        style: { color: '#2563eb' }
      }
    ]
  };
}

describe('normalizeConfig', () => {
  it('normaliza configuração válida e resolve URLs', () => {
    const result = normalizeConfig(validConfig(), new URL('https://example.gov.br/config.js'));
    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].data.footprintsUrl).toBe('https://example.gov.br/projeto.geojson');
    expect(result.basemap.styleUrl).toBe('https://example.gov.br/style.json');
  });

  it('rejeita schema desconhecido', () => {
    const input = validConfig();
    input.schemaVersion = 2;
    expect(() => normalizeConfig(input, 'https://example.gov.br/config.js')).toThrow(/schemaVersion/);
  });

  it('rejeita IDs duplicados', () => {
    const input = validConfig();
    input.projects.push(structuredClone(input.projects[0]));
    expect(() => normalizeConfig(input, 'https://example.gov.br/config.js')).toThrow(/duplicado/);
  });

  it('rejeita cor arbitrária', () => {
    const input = validConfig();
    input.projects[0].style.color = 'url(javascript:alert(1))';
    expect(() => normalizeConfig(input, 'https://example.gov.br/config.js')).toThrow(/Cor inválida/);
  });
});

