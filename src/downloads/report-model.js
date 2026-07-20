export function createReportSnapshot({ config, query }) {
  const projectIds = [...new Set(query.results.map((result) => result.projectId))];
  const projects = projectIds.map((id) => {
    const project = config.projects.find((item) => item.id === id);
    return project ? {
      id: project.id,
      title: project.title,
      period: project.period?.display || null,
      institution: project.institution || null,
      contractor: project.contractor || null,
      aircraft: project.aircraft || null,
      camera: project.camera || null,
      nominalScale: project.nominalScale || null,
      license: project.license?.label || null,
      credits: project.credits || null,
      color: project.style?.color || '#2563eb'
    } : { id, title: id, color: '#2563eb' };
  });
  return Object.freeze({
    id: globalThis.crypto?.randomUUID?.() || `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    catalogVersion: config.catalogVersion,
    siteTitle: config.site.title,
    attribution: config.basemap.reportAttributionText,
    geometryType: query.geometry?.geometry?.type || null,
    // A geometria consultada e a de cada cobertura vao para o relatorio: o PDF
    // desenha o esquema do que esta sendo baixado, e nao so a lista.
    queryGeometry: query.geometry?.geometry ? structuredClone(query.geometry.geometry) : null,
    scopeProjectIds: [...query.scopeProjectIds],
    projects,
    items: query.results.map((result) => ({
      key: result.key,
      projectId: result.projectId,
      projectTitle: result.projectTitle,
      photoId: result.photoId,
      photoNumber: result.photoNumber,
      title: result.title,
      flightLine: result.flightLine,
      capturedAt: result.capturedAt,
      nominalScale: result.nominalScale,
      downloadUrl: result.downloadUrl,
      downloadFilename: result.downloadFilename,
      sizeBytes: result.sizeBytes,
      licenseLabel: result.licenseLabel,
      checksumSha256: result.checksumSha256,
      geometry: result.geometry ? structuredClone(result.geometry) : null
    }))
  });
}
