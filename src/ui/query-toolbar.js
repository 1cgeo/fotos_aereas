function button(label, className = 'tool-button', shortLabel = label) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = className;
  node.setAttribute('aria-label', label);
  node.title = label;
  const long = document.createElement('span');
  long.className = 'tool-button__label tool-button__label--long';
  long.textContent = label;
  const short = document.createElement('span');
  short.className = 'tool-button__label tool-button__label--short';
  short.textContent = shortLabel;
  node.append(long, short);
  return node;
}

// A consulta por ponto não tem botão: clicar no mapa já consulta, sempre. Só o
// desenho de área é um modo, porque muda o que o clique faz.
export function createQueryToolbar(container, scopeElement, handlers) {
  const tools = document.createElement('div');
  tools.className = 'tool-buttons';
  const polygonButton = button('Desenhar área', 'tool-button', 'Área');
  const importButton = button('Importar GeoJSON', 'tool-button', 'Importar');
  const clearButton = button('Limpar consulta', 'tool-button tool-button--quiet', 'Limpar');
  polygonButton.addEventListener('click', () => {
    if (!polygonButton.disabled) handlers.onActivate('polygon-query');
  });
  importButton.addEventListener('click', () => handlers.onImport?.());
  clearButton.addEventListener('click', handlers.onClear);
  tools.append(polygonButton, importButton, clearButton);

  const activeChip = document.createElement('div');
  activeChip.className = 'active-tool-chip';
  activeChip.hidden = true;
  const activeLabel = document.createElement('span');
  const deactivateButton = document.createElement('button');
  deactivateButton.type = 'button';
  deactivateButton.className = 'active-tool-chip__close';
  deactivateButton.textContent = '×';
  deactivateButton.setAttribute('aria-label', 'Desativar ferramenta');
  deactivateButton.title = 'Desativar ferramenta';
  deactivateButton.addEventListener('click', handlers.onDeactivate);
  activeChip.append(activeLabel, deactivateButton);

  container.replaceChildren(tools, scopeElement, activeChip);

  return Object.freeze({
    update(state) {
      const activeId = state.tools.activeToolId;
      const desenhando = activeId === 'polygon-query';
      polygonButton.setAttribute('aria-pressed', String(desenhando));
      polygonButton.classList.toggle('tool-button--active', desenhando);
      clearButton.disabled = state.query.status === 'idle';
      // O chip só anuncia o desenho de área: a consulta por ponto é o padrão, e
      // padrão não é modo ativo a ser exibido nem desligado.
      activeChip.hidden = !desenhando;
      activeLabel.textContent = desenhando ? 'Ferramenta ativa: Desenhar área' : '';
    },
    setPolygonEnabled(enabled) {
      polygonButton.disabled = !enabled;
      if (enabled) polygonButton.removeAttribute('title');
      else polygonButton.title = 'Ferramenta indisponível';
    }
  });
}
