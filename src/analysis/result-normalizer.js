const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export function normalizeAnalysisResult(project, feature) {
  return Object.freeze({
    key: `${project.id}:${feature.properties.photoId}`,
    projectId: project.id,
    projectTitle: project.title,
    projectSortOrder: project.sortOrder,
    photoId: feature.properties.photoId,
    photoNumber: feature.properties.photoNumber,
    title: feature.properties.title,
    flightLine: feature.properties.flightLine,
    capturedAt: feature.properties.capturedAt,
    nominalScale: feature.properties.nominalScale,
    thumbnailUrl: feature.properties.thumbnailUrl,
    downloadUrl: feature.properties.downloadUrl,
    downloadFilename: feature.properties.downloadFilename,
    mimeType: feature.properties.mimeType,
    sizeBytes: feature.properties.sizeBytes,
    checksumSha256: feature.properties.checksumSha256,
    licenseLabel: feature.properties.licenseLabel,
    notes: feature.properties.notes,
    geometry: feature.geometry
  });
}

export function deduplicateAndSortResults(results) {
  const unique = new Map();
  for (const result of results) unique.set(result.key, result);
  return [...unique.values()].sort((a, b) =>
    a.projectSortOrder - b.projectSortOrder ||
    collator.compare(a.projectTitle, b.projectTitle) ||
    collator.compare(a.flightLine || '\uffff', b.flightLine || '\uffff') ||
    collator.compare(a.photoNumber || '\uffff', b.photoNumber || '\uffff') ||
    collator.compare(a.photoId, b.photoId)
  );
}

