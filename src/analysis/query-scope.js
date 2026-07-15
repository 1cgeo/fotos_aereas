export function resolveQueryScope(config, activeIds) {
  if (activeIds.size > 0) return config.projects.filter((project) => activeIds.has(project.id));
  return config.projects.filter((project) => project.enabled !== false);
}

