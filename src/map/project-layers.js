function ids(projectId) {
  return {
    source: `project:${projectId}:footprints`,
    fill: `project:${projectId}:fill`,
    outline: `project:${projectId}:outline`
  };
}

export function ensureProjectLayers(map, project, data) {
  const layerIds = ids(project.id);
  if (!map.getSource(layerIds.source)) {
    map.addSource(layerIds.source, { type: 'geojson', data: data.collection });
  } else {
    map.getSource(layerIds.source).setData(data.collection);
  }

  if (!map.getLayer(layerIds.fill)) {
    map.addLayer({
      id: layerIds.fill,
      type: 'fill',
      source: layerIds.source,
      paint: {
        'fill-color': project.style.color,
        'fill-opacity': project.style.fillOpacity
      }
    });
  }

  if (!map.getLayer(layerIds.outline)) {
    map.addLayer({
      id: layerIds.outline,
      type: 'line',
      source: layerIds.source,
      paint: {
        'line-color': project.style.color,
        'line-opacity': project.style.lineOpacity,
        'line-width': 1.5
      }
    });
  }

  return layerIds;
}

export function setProjectVisibility(map, projectId, visible) {
  const layerIds = ids(projectId);
  const visibility = visible ? 'visible' : 'none';
  for (const layerId of [layerIds.fill, layerIds.outline]) {
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
  }
}

export function getProjectLayerIds(projectId) {
  return ids(projectId);
}

