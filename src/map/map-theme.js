const LIGHT_RASTER = Object.freeze({
  'raster-brightness-min': 0,
  'raster-brightness-max': 1,
  'raster-contrast': 0,
  'raster-saturation': 0
});

const DARK_RASTER = Object.freeze({
  'raster-brightness-min': 0.03,
  'raster-brightness-max': 0.58,
  'raster-contrast': 0.12,
  'raster-saturation': -0.62
});

export function applyMapTheme(map, theme) {
  const paint = theme === 'dark' ? DARK_RASTER : LIGHT_RASTER;
  const layers = map.getStyle()?.layers || [];
  for (const layer of layers) {
    if (layer.type !== 'raster' || !map.getLayer(layer.id)) continue;
    for (const [property, value] of Object.entries(paint)) {
      map.setPaintProperty(layer.id, property, value);
    }
  }
}
