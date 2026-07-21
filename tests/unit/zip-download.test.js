// @vitest-environment node
// Em jsdom, o Uint8Array do TextEncoder do Node e o Uint8Array da janela sao de
// realms diferentes, e o `instanceof` interno do client-zip falha por isso, nao
// pelo nosso codigo. Este arquivo nao toca no DOM, entao roda em node.
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  baixarComoZip,
  dividirEmLotes,
  montaCsv,
  tamanhoEstimado
} from '../../src/downloads/zip-download.js';

const MB = 1024 ** 2;

function foto(numero, tamanho = MB, extras = {}) {
  return {
    key: `voo:${numero}`,
    projectId: 'voo',
    projectTitle: 'Voo Histórico 1980',
    photoId: String(numero),
    photoNumber: String(numero),
    title: `Fotografia ${numero}`,
    flightLine: 'FX-01',
    capturedAt: '1980-05-04',
    nominalScale: '1:25.000',
    downloadUrl: `https://exemplo.test/fotos/${numero}.jpg`,
    downloadFilename: `foto_${numero}.jpg`,
    sizeBytes: tamanho,
    checksumSha256: 'abc',
    licenseLabel: 'Uso interno',
    notes: null,
    ...extras
  };
}

// Destino falso no formato da File System Access API: guarda os bytes escritos.
function destinoEmMemoria() {
  const pedacos = [];
  return {
    pedacos,
    async createWritable() {
      return new WritableStream({
        write(pedaco) { pedacos.push(pedaco); },
        close() {},
        abort() {}
      });
    }
  };
}

function respondeComBytes(tamanho) {
  return new Response(new Uint8Array(tamanho), { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('divisão em partes', () => {
  it('fatia a seleção pelo teto de memória', () => {
    const items = Array.from({ length: 10 }, (_, indice) => foto(indice, 100 * MB));
    const lotes = dividirEmLotes(items, 350 * MB);
    expect(lotes.map((lote) => lote.length)).toEqual([3, 3, 3, 1]);
    expect(lotes.flat()).toHaveLength(10);
  });

  it('não divide arquivo: uma fotografia maior que o teto vai sozinha', () => {
    const lotes = dividirEmLotes([foto(1, 10 * MB), foto(2, 900 * MB), foto(3, 10 * MB)], 100 * MB);
    expect(lotes).toHaveLength(3);
    expect(lotes[1][0].photoId).toBe('2');
  });

  it('devolve uma parte só quando tudo cabe', () => {
    const items = [foto(1), foto(2)];
    expect(dividirEmLotes(items, 700 * MB)).toEqual([items]);
    expect(tamanhoEstimado(items)).toBe(2 * MB);
  });
});

describe('planilha de metadados', () => {
  it('abre com BOM, separa por ponto e vírgula e escapa aspas', () => {
    const items = [foto(1, MB, { notes: 'posição "aproximada"; ver ficha' })];
    const nomes = new Map([[items[0].key, 'Voo/foto_1.jpg']]);
    const csv = montaCsv(items, nomes);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('aerolevantamento;fotografia;faixa');
    expect(csv).toContain('"posição ""aproximada""; ver ficha"');
    expect(csv).toContain('Voo/foto_1.jpg');
  });
});

describe('montagem do ZIP', () => {
  it('escreve um ZIP em fluxo no destino, com uma pasta por aerolevantamento', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => respondeComBytes(2_048)));
    const destino = destinoEmMemoria();
    const progresso = [];
    const items = [foto(1), foto(2)];

    const resultado = await baixarComoZip({
      items,
      nomeArquivo: 'fotos.zip',
      destino,
      onProgress: (evento) => progresso.push(evento.feitos)
    });

    expect(resultado.feitos).toBe(2);
    expect(resultado.falhas).toEqual([]);
    expect(progresso).toEqual([1, 2]);
    const bytes = new Uint8Array(await new Blob(destino.pedacos).arrayBuffer());
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]);
    const texto = new TextDecoder().decode(bytes);
    expect(texto).toContain('metadados.csv');
    expect(texto).toContain('Voo_Historico_1980/foto_1.jpg');
  });

  it('uma fotografia indisponível não derruba o lote e vai para o aviso', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => (
      String(url).includes('/2.jpg')
        ? new Response('', { status: 404 })
        : respondeComBytes(1_024)
    )));
    const destino = destinoEmMemoria();

    const resultado = await baixarComoZip({
      items: [foto(1), foto(2), foto(3)],
      nomeArquivo: 'fotos.zip',
      destino
    });

    expect(resultado.feitos).toBe(2);
    expect(resultado.falhas).toEqual([{ arquivo: 'foto_2.jpg', motivo: 'HTTP 404' }]);
    const texto = new TextDecoder().decode(new Uint8Array(await new Blob(destino.pedacos).arrayBuffer()));
    expect(texto).toContain('FOTOGRAFIAS_QUE_FALHARAM.txt');
  });

  it('cancelar no meio interrompe a montagem', async () => {
    const controle = new AbortController();
    let baixadas = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      baixadas += 1;
      if (baixadas === 2) controle.abort();
      return respondeComBytes(1_024);
    }));

    await expect(baixarComoZip({
      items: [foto(1), foto(2), foto(3), foto(4)],
      nomeArquivo: 'fotos.zip',
      destino: destinoEmMemoria(),
      signal: controle.signal
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(baixadas).toBeLessThan(4);
  });

  it('recusa seleção vazia', async () => {
    await expect(baixarComoZip({ items: [], nomeArquivo: 'fotos.zip' })).rejects.toThrow(/Nenhuma fotografia/);
  });
});
