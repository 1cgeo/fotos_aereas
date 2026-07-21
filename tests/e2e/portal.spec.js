import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X6X5WQAAAABJRU5ErkJggg==',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aerolevantamentos' })).toBeVisible();
  await expect(page.getByText('Aerolevantamento Brasília 1958', { exact: true })).toBeVisible();
  await page.waitForFunction(() => Boolean(globalThis.__AERIAL_APP__?.controller?.map));
  await page.evaluate(() => new Promise((resolve) => {
    const map = globalThis.__AERIAL_APP__.controller.map;
    if (!map.isMoving()) resolve();
    else map.once('moveend', resolve);
  }));
});

async function clickCoordinate(page, coordinate) {
  await page.evaluate(() => new Promise((resolve) => {
    const map = globalThis.__AERIAL_APP__.controller.map;
    if (!map.isMoving()) resolve();
    else map.once('moveend', resolve);
  }));
  const point = await page.evaluate((lngLat) => {
    const projected = globalThis.__AERIAL_APP__.controller.map.project(lngLat);
    return { x: projected.x, y: projected.y };
  }, coordinate);
  await page.locator('.maplibregl-canvas').click({ position: point });
}

test('consulta sobreposição por ponto e destaca um resultado', async ({ page }) => {
  await expect(page.getByText('Cada novo clique ou desenho substitui a busca anterior.')).toBeVisible();
  await page.getByRole('button', { name: 'Consultar ponto' }).click();
  await expect(page.getByText(/Clique no mapa\. Clique em outro local/)).toBeVisible();
  await clickCoordinate(page, [-47.89, -15.75]);
  await expect(page.locator('.query-summary__label')).toBeVisible();
  const cards = page.locator('.query-result-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first().getByRole('img', { name: /Miniatura/ })).toBeVisible();
  await clickCoordinate(page, [-47.82, -15.80]);
  await expect(page.locator('.query-result-card')).toHaveCount(1);
  const locate = page.locator('.query-result-card__locate');
  await locate.click();
  await expect(locate).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.query-result-card')).toHaveAttribute('data-selected', 'true');
  await page.locator('.query-result-card').hover();
  const highlighted = await page.evaluate(() => {
    const source = globalThis.__AERIAL_APP__.controller.map.getSource('query:result-highlight');
    return Boolean(source);
  });
  expect(highlighted).toBe(true);
});

test('desenha polígono customizado e prepara a fila após o PDF', async ({ page }) => {
  await page.getByRole('button', { name: 'Desenhar área' }).click();
  await clickCoordinate(page, [-47.91, -15.79]);
  await clickCoordinate(page, [-47.84, -15.79]);
  await clickCoordinate(page, [-47.84, -15.74]);
  await clickCoordinate(page, [-47.91, -15.74]);
  await page.getByRole('button', { name: 'Concluir área' }).click();
  await expect(page.locator('.query-summary__label')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Preparar download uma a uma' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^relatorio_fotos_aereas_.*\.pdf$/);
  await expect(page.getByRole('button', { name: /Baixar próxima/ })).toBeVisible();
  await page.locator('.query-next-search__button').click();
  await expect(page.locator('.query-summary')).toHaveCount(0);
  await expect(page.getByText(/0 vértice/)).toBeVisible();
});

test('consulta todos os projetos quando nenhum está ligado', async ({ page }) => {
  await page.locator('.project-card input[type="checkbox"]').first().uncheck();
  await expect(page.getByText('Escopo: todos os projetos')).toBeVisible();
  await page.getByRole('button', { name: 'Consultar ponto' }).click();
  await clickCoordinate(page, [-47.89, -15.75]);
  await expect(page.locator('.query-summary__label')).toBeVisible();
  await expect(page.locator('.query-result-group')).toHaveCount(2);
});

test('mantém ferramentas e desenho utilizáveis em tela estreita', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Fotos Aéreas' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Consultar ponto' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Desenhar área' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Limpar consulta' })).toBeVisible();
  const canvasBox = await page.locator('.maplibregl-canvas').boundingBox();
  expect(canvasBox.height).toBeGreaterThan(700);
  await page.getByRole('button', { name: 'Recolher painel' }).click();
  await expect(page.locator('.app-shell')).toHaveClass(/app-shell--sidebar-collapsed/);
  await expect(page.locator('.project-list')).not.toBeVisible();
  await page.getByRole('button', { name: 'Expandir painel' }).click();
  await expect(page.locator('.project-list')).toBeVisible();
  await page.getByRole('button', { name: 'Desenhar área' }).click();
  await expect(page.getByRole('group', { name: 'Controles do desenho' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar desenho' })).toBeVisible();
});

test('mantém tema explícito persistido sem seguir o sistema', async ({ page }) => {
  await page.evaluate(() => localStorage.removeItem('aerial-catalog-theme'));
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.getByRole('button', { name: 'Usar tema escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Usar tema claro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
