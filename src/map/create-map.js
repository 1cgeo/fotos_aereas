import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

class SafeAttributionControl {
  constructor(attributions) {
    this.attributions = attributions;
    this.container = null;
  }

  onAdd() {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-attrib safe-attribution';
    this.attributions.forEach((item, index) => {
      if (index > 0) container.append(document.createTextNode(' · '));
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = item.label;
      container.append(link);
    });
    this.container = container;
    return container;
  }

  onRemove() {
    this.container?.remove();
    this.container = null;
  }
}

export async function createMap(container, config) {
  container.replaceChildren();
  const { initialView } = config.site;
  const map = new maplibregl.Map({
    container,
    style: config.basemap.styleUrl,
    center: initialView.center,
    zoom: initialView.zoom,
    minZoom: initialView.minZoom,
    maxZoom: initialView.maxZoom,
    attributionControl: false,
    hash: false,
    cooperativeGestures: true
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-right');
  map.addControl(new SafeAttributionControl(config.basemap.extraAttributions), 'bottom-right');

  await new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error('Tempo esgotado ao iniciar o mapa.')), 20_000);
    map.once('style.load', () => {
      window.clearTimeout(timeoutId);
      resolve();
    });
    map.once('error', (event) => {
      if (!map.isStyleLoaded()) {
        window.clearTimeout(timeoutId);
        reject(event.error || new Error('Falha ao carregar o estilo do mapa.'));
      }
    });
  });

  return map;
}

