import { describe, expect, it } from 'vitest';
import {
  ajustaCaixaAProporcao,
  capturaMapaBase,
  escolheZoom,
  latParaMerc,
  lonParaMerc,
  mercParaLat
} from '../../src/downloads/basemap-snapshot.js';

describe('projeção Web Mercator', () => {
  it('mapeia o meridiano e o equador para o centro', () => {
    expect(lonParaMerc(0)).toBeCloseTo(0.5, 10);
    expect(latParaMerc(0)).toBeCloseTo(0.5, 10);
  });

  it('mapeia os extremos de longitude para 0 e 1', () => {
    expect(lonParaMerc(-180)).toBeCloseTo(0, 10);
    expect(lonParaMerc(180)).toBeCloseTo(1, 10);
  });

  it('cresce para BAIXO em latitude, como os tiles', () => {
    expect(latParaMerc(60)).toBeLessThan(latParaMerc(-60));
  });

  it('inverte de volta para a latitude de origem', () => {
    for (const lat of [-85, -30.1, -0.5, 0, 12.3, 60, 84]) {
      expect(mercParaLat(latParaMerc(lat))).toBeCloseTo(lat, 6);
    }
  });

  it('limita as latitudes fora do alcance do Mercator', () => {
    expect(Number.isFinite(latParaMerc(90))).toBe(true);
    expect(Number.isFinite(latParaMerc(-90))).toBe(true);
  });
});

describe('ajustaCaixaAProporcao', () => {
  it('alarga a caixa alta para atingir a proporção, mantendo o centro', () => {
    const caixa = { x0: 0.4, x1: 0.5, y0: 0.4, y1: 0.8 };
    const ajustada = ajustaCaixaAProporcao(caixa, 2);
    expect((ajustada.x1 - ajustada.x0) / (ajustada.y1 - ajustada.y0)).toBeCloseTo(2, 8);
    expect((ajustada.x0 + ajustada.x1) / 2).toBeCloseTo(0.45, 8);
    expect(ajustada.y0).toBeCloseTo(0.4, 8);
  });

  it('aumenta a altura da caixa larga', () => {
    const ajustada = ajustaCaixaAProporcao({ x0: 0, x1: 0.4, y0: 0.4, y1: 0.5 }, 2);
    expect((ajustada.x1 - ajustada.x0) / (ajustada.y1 - ajustada.y0)).toBeCloseTo(2, 8);
  });

  it('aplica folga relativa antes de ajustar', () => {
    const sem = ajustaCaixaAProporcao({ x0: 0.4, x1: 0.5, y0: 0.4, y1: 0.5 }, 1);
    const com = ajustaCaixaAProporcao({ x0: 0.4, x1: 0.5, y0: 0.4, y1: 0.5 }, 1, 0.2);
    expect(com.x1 - com.x0).toBeGreaterThan(sem.x1 - sem.x0);
  });
});

describe('escolheZoom', () => {
  it('nunca ultrapassa o teto de tiles', () => {
    const caixa = { x0: 0.3, x1: 0.7, y0: 0.3, y1: 0.7 };
    const zoom = escolheZoom(caixa, 4000);
    const escala = 2 ** zoom;
    const nx = Math.floor(caixa.x1 * escala) - Math.floor(caixa.x0 * escala) + 1;
    const ny = Math.floor(caixa.y1 * escala) - Math.floor(caixa.y0 * escala) + 1;
    expect(nx * ny).toBeLessThanOrEqual(48);
  });

  it('usa zoom maior para área menor', () => {
    const ampla = escolheZoom({ x0: 0.2, x1: 0.8, y0: 0.2, y1: 0.8 }, 1400);
    const estreita = escolheZoom({ x0: 0.4999, x1: 0.5001, y0: 0.4999, y1: 0.5001 }, 1400);
    expect(estreita).toBeGreaterThan(ampla);
  });
});

describe('capturaMapaBase', () => {
  it('devolve null sem template, em vez de quebrar o relatório', async () => {
    await expect(capturaMapaBase([-52, -30, -51, -29], { template: null })).resolves.toBeNull();
  });
});
