import { expect, test } from '@playwright/test';

const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X6X5WQAAAABJRU5ErkJggg==',
  'base64'
);

// O catálogo de demonstração aponta para fotografias que não existem; aqui elas
// respondem com bytes de verdade, para o ZIP sair com conteúdo conferível.
const TAMANHO_FALSO = 4_096;

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    body: transparentPng
  }));
  await page.route('**/fotos/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/jpeg',
    body: Buffer.alloc(TAMANHO_FALSO, 7)
  }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Aerolevantamentos' })).toBeVisible();
  await page.waitForFunction(() => Boolean(globalThis.__AERIAL_APP__?.controller?.map));
});

async function consultaPonto(page, coordenada) {
  await page.evaluate(() => new Promise((resolve) => {
    const map = globalThis.__AERIAL_APP__.controller.map;
    if (!map.isMoving()) resolve();
    else map.once('moveend', resolve);
  }));
  const ponto = await page.evaluate((lngLat) => {
    const projetado = globalThis.__AERIAL_APP__.controller.map.project(lngLat);
    return { x: projetado.x, y: projetado.y };
  }, coordenada);
  await page.locator('.maplibregl-canvas').click({ position: ponto });
  await expect(page.locator('.query-summary__label')).toBeVisible();
}

// Simula a File System Access API: guarda no window os bytes que o portal
// escreveria no disco, para o teste conferir o ZIP inteiro.
async function fingeGravacaoEmDisco(page) {
  await page.addInitScript(() => {
    globalThis.__ZIP_ESCRITO__ = [];
    globalThis.__ZIP_NOME__ = null;
    globalThis.showSaveFilePicker = async ({ suggestedName }) => {
      globalThis.__ZIP_NOME__ = suggestedName;
      return {
        async createWritable() {
          return new WritableStream({
            write(pedaco) { globalThis.__ZIP_ESCRITO__.push([...pedaco]); }
          });
        }
      };
    };
  });
}

test('baixa a consulta inteira num ZIP gravado em disco', async ({ page }) => {
  await fingeGravacaoEmDisco(page);
  await page.reload();
  await page.waitForFunction(() => Boolean(globalThis.__AERIAL_APP__?.controller?.map));
  await consultaPonto(page, [-47.89, -15.75]);

  const botao = page.getByRole('button', { name: /Baixar tudo em ZIP/ });
  await expect(botao).toBeVisible();
  await botao.click();

  await expect(page.locator('.download-workflow__complete')).toHaveText('ZIP concluído.');
  const nome = await page.evaluate(() => globalThis.__ZIP_NOME__);
  expect(nome).toMatch(/^fotos_aereas_\d{8}\.zip$/);

  const texto = await page.evaluate(() => {
    const bytes = new Uint8Array(globalThis.__ZIP_ESCRITO__.flat());
    return { assinatura: [...bytes.slice(0, 2)], conteudo: new TextDecoder('latin1').decode(bytes) };
  });
  expect(texto.assinatura).toEqual([0x50, 0x4b]);
  expect(texto.conteudo).toContain('metadados.csv');
  expect(texto.conteudo).toContain('relatorio_fotos_aereas');
  // O catálogo de demonstração serve SVG no lugar das fotografias.
  expect(texto.conteudo).toContain('Aerolevantamento_Brasilia_1958/brasilia_1958_foto_001.svg');
});

// A divisão em partes está coberta em teste de unidade (dividirEmLotes): aqui o
// que se verifica é que, sem a API de disco, o ZIP ainda chega ao usuário.
test('sem gravação em disco, o ZIP sai pelo caminho em memória', async ({ page }) => {
  await page.addInitScript(() => {
    delete globalThis.showSaveFilePicker;
  });
  await page.reload();
  await page.waitForFunction(() => Boolean(globalThis.__AERIAL_APP__?.controller?.map));
  await consultaPonto(page, [-47.89, -15.75]);

  await expect(page.getByText(/Seu navegador monta o ZIP na memória/)).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /Baixar tudo em ZIP/ }).click();
  expect((await download).suggestedFilename()).toMatch(/^fotos_aereas_\d{8}\.zip$/);
});
