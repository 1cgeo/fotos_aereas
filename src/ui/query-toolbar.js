function button(label, className = 'tool-button') {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.textContent = label;
  return node;
}

export function createQueryToolbar(container, scopeElement, handlers) {
  const tools = document.createElement('div');
  tools.className = 'tool-buttons';
  const pointButton = button('Consultar ponto');
  const polygonButton = button('Desenhar área');
  polygonButton.disabled = true;
  polygonButton.title = 'Disponível na próxima fase';
  const clearButton = button('Limpar consulta', 'tool-button tool-button--quiet');
  pointButton.addEventListener('click', () => handlers.onActivate('point-query'));
  clearButton.addEventListener('click', handlers.onClear);
  tools.append(pointButton, polygonButton, clearButton);

  const activeChip = document.createElement('div');
  activeChip.className = 'active-tool-chip';
  activeChip.hidden = true;
  const activeLabel = document.createElement('span');
  const deactivateButton = button('×', 'active-tool-chip__close');
  deactivateButton.setAttribute('aria-label', 'Desativar ferramenta');
  deactivateButton.title = 'Desativar ferramenta';
  deactivateButton.addEventListener('click', handlers.onDeactivate);
  activeChip.append(activeLabel, deactivateButton);

  container.replaceChildren(tools, scopeElement, activeChip);

  return Object.freeze({
    update(state) {
      const activeId = state.tools.activeToolId;
      pointButton.setAttribute('aria-pressed', String(activeId === 'point-query'));
      pointButton.classList.toggle('tool-button--active', activeId === 'point-query');
      clearButton.disabled = state.query.status === 'idle';
      activeChip.hidden = !activeId;
      activeLabel.textContent = activeId === 'point-query' ? 'Ferramenta ativa: Consultar ponto' : '';
    },
    setPolygonEnabled(enabled) {
      polygonButton.disabled = !enabled;
      polygonButton.removeAttribute('title');
      if (enabled) polygonButton.addEventListener('click', () => handlers.onActivate('polygon-query'), { once: false });
    }
  });
}

