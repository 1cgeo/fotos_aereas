import { lerGeoJSON, paraFeatureDeConsulta, resumoDoImport } from './geojson-import.js';

const SOURCE_ID = 'query:import';
const FILL_ID = 'query:import-fill';
const LINE_ID = 'query:import-line';
const POINT_ID = 'query:import-point';

function colecaoVazia() {
  return { type: 'FeatureCollection', features: [] };
}

function ensureLayers(map) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, { type: 'geojson', data: colecaoVazia() });
  }
  if (!map.getLayer(FILL_ID)) {
    map.addLayer({
      id: FILL_ID,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: { 'fill-color': '#7c3aed', 'fill-opacity': 0.16 }
    });
  }
  if (!map.getLayer(LINE_ID)) {
    map.addLayer({
      id: LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['in', ['geometry-type'], ['literal', ['Polygon', 'LineString']]],
      paint: { 'line-color': '#6d28d9', 'line-width': 2.5 }
    });
  }
  if (!map.getLayer(POINT_ID)) {
    map.addLayer({
      id: POINT_ID,
      type: 'circle',
      source: SOURCE_ID,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 6,
        'circle-color': '#6d28d9',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });
  }
}

function criaAviso() {
  const caixa = document.createElement('div');
  caixa.className = 'map-guidance map-guidance--import';
  caixa.setAttribute('role', 'status');
  return caixa;
}

export function createImportQueryTool({ map, runner, onNewQuery = null }) {
  let aviso = null;

  function mostra(titulo, texto, erro = false) {
    if (!aviso) {
      aviso = criaAviso();
      map.getContainer().append(aviso);
    }
    aviso.dataset.erro = String(erro);
    aviso.replaceChildren();
    const forte = document.createElement('strong');
    forte.textContent = titulo;
    const span = document.createElement('span');
    span.textContent = texto;
    aviso.append(forte, span);
  }

  function limpaAviso() {
    aviso?.remove();
    aviso = null;
  }

  function desenha(geometrias) {
    ensureLayers(map);
    map.getSource(SOURCE_ID).setData({
      type: 'FeatureCollection',
      features: geometrias.map((g) => ({ type: 'Feature', properties: {}, geometry: g }))
    });
  }

  async function importar(arquivo) {
    if (!arquivo) return;
    onNewQuery?.();
    try {
      const texto = await arquivo.text();
      const { geometrias, avisos } = lerGeoJSON(texto);
      desenha(geometrias);
      const resumo = resumoDoImport(geometrias);
      mostra(
        `Consultando por ${arquivo.name}`,
        avisos.length ? `${resumo}. ${avisos.join(' ')}` : `${resumo}.`
      );
      const feature = paraFeatureDeConsulta(geometrias);
      await runner.run('import-intersection', feature);
    } catch (erro) {
      limpaGeometria();
      mostra('Não foi possível usar este arquivo', erro.message, true);
      console.error('Falha ao importar GeoJSON:', erro);
    }
  }

  function limpaGeometria() {
    if (map.getSource(SOURCE_ID)) map.getSource(SOURCE_ID).setData(colecaoVazia());
  }

  return Object.freeze({
    id: 'import-query',
    label: 'Importar GeoJSON',

    /**
     * Importar NÃO passa pelo ciclo activate/deactivate do gerenciador de
     * ferramentas. A janela de escolha de arquivo é assíncrona: o usuário demora
     * a escolher, e desativar logo depois de abrir removeria o <input> do DOM
     * antes do evento `change`, que então nunca dispararia. Foi exatamente isso
     * que fez a importação não fazer NADA, sem sequer dar erro.
     *
     * Aqui o elemento vive até o arquivo chegar, e se limpa sozinho depois.
     */
    abrir() {
      const entrada = document.createElement('input');
      entrada.type = 'file';
      entrada.accept = '.geojson,.json,application/geo+json,application/json';
      entrada.style.display = 'none';

      let encerrado = false;
      const encerra = () => {
        if (encerrado) return;
        encerrado = true;
        entrada.remove();
      };

      entrada.addEventListener('change', () => {
        const arquivo = entrada.files?.[0];
        encerra();
        importar(arquivo);
      }, { once: true });

      // Se a janela for fechada sem escolher nada, `change` não dispara. O foco
      // voltando para a página é o único sinal disponível; a folga evita correr
      // com o `change` quando o usuário DE FATO escolheu.
      window.addEventListener('focus', () => {
        window.setTimeout(encerra, 1500);
      }, { once: true });

      document.body.append(entrada);
      entrada.click();
    },

    clearGeometry() {
      limpaGeometria();
      limpaAviso();
    },
    destroy() {
      limpaAviso();
    }
  });
}
