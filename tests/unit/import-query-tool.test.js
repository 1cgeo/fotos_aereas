import { describe, expect, it, vi } from 'vitest';
import { createImportQueryTool } from '../../src/tools/import-query/import-query-tool.js';

function mapaFalso() {
  const fontes = new Map();
  const camadas = new Set();
  return {
    getSource: (id) => fontes.get(id),
    addSource: (id) => fontes.set(id, { dados: null, setData(d) { this.dados = d; } }),
    getLayer: (id) => (camadas.has(id) ? { id } : undefined),
    addLayer: (l) => camadas.add(l.id),
    getContainer: () => document.body,
    dadosDe: (id) => fontes.get(id)?.dados
  };
}

const poligono = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'Polygon',
    coordinates: [[[-52, -30], [-51, -30], [-51, -29], [-52, -29], [-52, -30]]]
  }
};

function arquivoFalso(conteudo, name = 'test.geojson') {
  return { name, text: () => Promise.resolve(conteudo) };
}

/** Simula o ciclo real: abrir() cria o input, o usuário escolhe DEPOIS. */
async function importa(ferramenta, arquivo) {
  ferramenta.abrir();
  const entrada = document.querySelector('input[type="file"]');
  expect(entrada, 'o seletor de arquivo precisa continuar no DOM ate o arquivo chegar').toBeTruthy();
  Object.defineProperty(entrada, 'files', { value: arquivo ? [arquivo] : [], configurable: true });
  entrada.dispatchEvent(new Event('change'));
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe('ferramenta de importar GeoJSON', () => {
  it('roda a consulta com a geometria do arquivo', async () => {
    const map = mapaFalso();
    const runner = { run: vi.fn().mockResolvedValue([]), cancel: vi.fn() };
    const onNewQuery = vi.fn();
    const ferramenta = createImportQueryTool({ map, runner, onNewQuery });

    await importa(ferramenta, arquivoFalso(JSON.stringify({
      type: 'FeatureCollection', features: [poligono]
    })));

    expect(onNewQuery).toHaveBeenCalledOnce();
    expect(runner.run).toHaveBeenCalledOnce();
    const [analise, feature] = runner.run.mock.calls[0];
    expect(analise).toBe('import-intersection');
    expect(feature.geometry.type).toBe('GeometryCollection');
    expect(feature.geometry.geometries).toHaveLength(1);
    // e desenha no mapa
    expect(map.dadosDe('query:import').features).toHaveLength(1);
    ferramenta.destroy();
  });

  it('nao consulta e avisa quando o arquivo nao serve', async () => {
    const map = mapaFalso();
    const runner = { run: vi.fn(), cancel: vi.fn() };
    const ferramenta = createImportQueryTool({ map, runner });
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});

    await importa(ferramenta, arquivoFalso('isto nao e json'));

    expect(runner.run).not.toHaveBeenCalled();
    const aviso = document.querySelector('.map-guidance--import');
    expect(aviso?.dataset.erro).toBe('true');
    expect(aviso?.textContent).toMatch(/não é um JSON válido/);
    erro.mockRestore();
    ferramenta.destroy();
  });

  it('nao faz nada quando a janela e fechada sem escolher arquivo', async () => {
    const map = mapaFalso();
    const runner = { run: vi.fn(), cancel: vi.fn() };
    const ferramenta = createImportQueryTool({ map, runner });

    await importa(ferramenta, null);

    expect(runner.run).not.toHaveBeenCalled();
    ferramenta.destroy();
  });

  it('limpa a geometria desenhada', async () => {
    const map = mapaFalso();
    const runner = { run: vi.fn().mockResolvedValue([]), cancel: vi.fn() };
    const ferramenta = createImportQueryTool({ map, runner });

    await importa(ferramenta, arquivoFalso(JSON.stringify(poligono)));
    expect(map.dadosDe('query:import').features).toHaveLength(1);

    ferramenta.clearGeometry();
    expect(map.dadosDe('query:import').features).toHaveLength(0);
    expect(document.querySelector('.map-guidance--import')).toBeNull();
    ferramenta.destroy();
  });
});
