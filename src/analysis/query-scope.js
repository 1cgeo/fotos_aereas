import booleanIntersects from '@turf/boolean-intersects';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

export function resolveQueryScope(config, activeIds) {
  if (activeIds.size > 0) return config.projects.filter((project) => activeIds.has(project.id));
  return config.projects.filter((project) => project.enabled !== false);
}

function touchesCoverage(geometry, coverage) {
  if (geometry?.geometry?.type === 'Point') {
    return booleanPointInPolygon(geometry, coverage, { ignoreBoundary: false });
  }
  return booleanIntersects(geometry, coverage);
}

/**
 * Primeira etapa da consulta: reduz o escopo testando a geometria contra a
 * COBERTURA de cada projeto (um polígono por voo), antes de baixar qualquer grade.
 *
 * Buscar em todo o catálogo continua valendo como regra visível ao usuário; o que
 * muda é o custo, que deixa de ser proporcional ao tamanho do catálogo e passa a
 * ser proporcional ao que a área realmente toca.
 *
 * Projeto sem cobertura declarada, ou cuja cobertura falhou, é MANTIDO: a etapa
 * serve para economizar, nunca para esconder um voo.
 */
export async function narrowScopeByCoverage(scope, geometry, repository, signal) {
  if (scope.length <= 1) return { scope, descartados: 0, semCobertura: scope.length };

  const avaliados = await Promise.all(scope.map(async (project) => {
    if (signal?.aborted) throw new DOMException('Consulta cancelada.', 'AbortError');

    let coverage;
    try {
      coverage = await repository.loadCoverage(project.id, { signal });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      coverage = null;
    }
    if (!coverage) return { project, mantem: true, semCobertura: true };

    try {
      return { project, mantem: touchesCoverage(geometry, coverage), semCobertura: false };
    } catch {
      // Cobertura malformada não pode derrubar a consulta: mantém o projeto.
      return { project, mantem: true, semCobertura: true };
    }
  }));

  return {
    scope: avaliados.filter((item) => item.mantem).map((item) => item.project),
    descartados: avaliados.filter((item) => !item.mantem).length,
    semCobertura: avaliados.filter((item) => item.semCobertura).length
  };
}
