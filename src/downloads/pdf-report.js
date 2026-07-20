import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { ajustaCaixaAProporcao, latParaMerc, lonParaMerc, mercParaLat } from './basemap-snapshot.js';

const PAGE = { width: 595.28, height: 841.89, margin: 48 };
const MAPA = { altura: 310, rotuloMaximo: 60 };

function corDeHex(hex, padrao = [0.15, 0.39, 0.92]) {
  const valor = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''));
  if (!valor) return rgb(padrao[0], padrao[1], padrao[2]);
  const inteiro = parseInt(valor[1], 16);
  return rgb(((inteiro >> 16) & 255) / 255, ((inteiro >> 8) & 255) / 255, (inteiro & 255) / 255);
}

// Percorre os anéis de um Polygon ou MultiPolygon sem distinguir os dois.
function aneis(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return geometry.coordinates || [];
  if (geometry.type === 'MultiPolygon') return (geometry.coordinates || []).flat();
  return [];
}

function extremos(geometrias) {
  let oeste = Infinity;
  let sul = Infinity;
  let leste = -Infinity;
  let norte = -Infinity;
  for (const geometry of geometrias) {
    if (geometry?.type === 'Point') {
      const [x, y] = geometry.coordinates;
      oeste = Math.min(oeste, x); leste = Math.max(leste, x);
      sul = Math.min(sul, y); norte = Math.max(norte, y);
      continue;
    }
    for (const anel of aneis(geometry)) {
      for (const [x, y] of anel) {
        oeste = Math.min(oeste, x); leste = Math.max(leste, x);
        sul = Math.min(sul, y); norte = Math.max(norte, y);
      }
    }
  }
  return Number.isFinite(oeste) ? { oeste, sul, leste, norte } : null;
}

/**
 * Desenha o esquema da consulta: as coberturas que serão baixadas, a geometria
 * consultada e uma escala. Não é mapa-base, é croqui de conferência: mostra ONDE
 * está o que se vai baixar, para o relatório valer sem depender de rede.
 */
function desenharEsquema(page, snapshot, { topo, largura, altura, regular, bold, imagemBase }) {
  const geometrias = snapshot.items.map((item) => item.geometry).filter(Boolean);
  if (snapshot.queryGeometry) geometrias.push(snapshot.queryGeometry);
  const limites = extremos(geometrias);

  const base = topo - altura;

  if (!limites) {
    page.drawRectangle({
      x: PAGE.margin, y: base, width: largura, height: altura,
      borderColor: rgb(0.8, 0.84, 0.89), borderWidth: 1, color: rgb(0.98, 0.99, 1)
    });
    page.drawText('Sem geometria disponível para o esquema.', {
      x: PAGE.margin + 12, y: base + altura / 2, size: 9, font: regular, color: rgb(0.45, 0.5, 0.58)
    });
    return;
  }

  // Projeção em Web Mercator, a mesma dos tiles: sem isso a sobreposição vetorial
  // não assenta sobre o mapa de fundo. Quando há imagem, a caixa vem dela, para
  // que imagem e vetor compartilhem exatamente o mesmo enquadramento.
  const caixa = snapshot.basemap?.caixa || ajustaCaixaAProporcao({
    x0: lonParaMerc(limites.oeste),
    x1: lonParaMerc(limites.leste),
    y0: latParaMerc(limites.norte),
    y1: latParaMerc(limites.sul)
  }, largura / altura, 0.1);

  if (imagemBase) {
    page.drawImage(imagemBase, { x: PAGE.margin, y: base, width: largura, height: altura });
  } else {
    page.drawRectangle({
      x: PAGE.margin, y: base, width: largura, height: altura, color: rgb(0.98, 0.99, 1)
    });
  }
  page.drawRectangle({
    x: PAGE.margin, y: base, width: largura, height: altura,
    borderColor: rgb(0.72, 0.76, 0.82), borderWidth: 1
  });

  const larguraMerc = Math.max(1e-12, caixa.x1 - caixa.x0);
  const alturaMerc = Math.max(1e-12, caixa.y1 - caixa.y0);
  const paraX = (lon) => PAGE.margin + ((lonParaMerc(lon) - caixa.x0) / larguraMerc) * largura;
  // Mercator cresce para baixo, o PDF cresce para cima.
  const paraY = (lat) => base + (1 - (latParaMerc(lat) - caixa.y0) / alturaMerc) * altura;

  function contorno(geometry, { cor, espessura, opacidade = 1 }) {
    for (const anel of aneis(geometry)) {
      for (let i = 0; i < anel.length - 1; i += 1) {
        page.drawLine({
          start: { x: paraX(anel[i][0]), y: paraY(anel[i][1]) },
          end: { x: paraX(anel[i + 1][0]), y: paraY(anel[i + 1][1]) },
          thickness: espessura,
          color: cor,
          opacity: opacidade
        });
      }
    }
  }

  const cores = new Map((snapshot.projects || []).map((p) => [p.id, corDeHex(p.color)]));
  const rotular = snapshot.items.length <= MAPA.rotuloMaximo;

  snapshot.items.forEach((item, indice) => {
    if (!item.geometry) return;
    const cor = cores.get(item.projectId) || corDeHex(null);
    contorno(item.geometry, { cor, espessura: 0.6, opacidade: 0.75 });
    if (!rotular) return;
    const caixaItem = extremos([item.geometry]);
    if (!caixaItem) return;
    const cx = paraX((caixaItem.oeste + caixaItem.leste) / 2);
    const cy = paraY((caixaItem.sul + caixaItem.norte) / 2);
    const texto = String(indice + 1);
    page.drawCircle({ x: cx, y: cy, size: 6.5, color: rgb(1, 1, 1), borderColor: cor, borderWidth: 0.8 });
    page.drawText(texto, {
      x: cx - regular.widthOfTextAtSize(texto, 6) / 2,
      y: cy - 2,
      size: 6,
      font: regular,
      color: rgb(0.12, 0.16, 0.23)
    });
  });

  // A geometria consultada por último, para ficar por cima das coberturas.
  const corConsulta = rgb(0.72, 0.06, 0.06);
  if (snapshot.queryGeometry?.type === 'Point') {
    const [lon, lat] = snapshot.queryGeometry.coordinates;
    const x = paraX(lon);
    const y = paraY(lat);
    page.drawCircle({ x, y, size: 4.5, color: corConsulta });
    page.drawLine({ start: { x: x - 11, y }, end: { x: x + 11, y }, thickness: 0.9, color: corConsulta });
    page.drawLine({ start: { x, y: y - 11 }, end: { x, y: y + 11 }, thickness: 0.9, color: corConsulta });
  } else if (snapshot.queryGeometry) {
    contorno(snapshot.queryGeometry, { cor: corConsulta, espessura: 1.8 });
  }

  // Escala: distância redonda de cerca de um quarto do quadro. Em Mercator a
  // escala varia com a latitude, então o fator vem da latitude do centro.
  const CIRCUNFERENCIA = 40075016.686;
  const latCentro = mercParaLat((caixa.y0 + caixa.y1) / 2);
  const metrosPorPonto = (larguraMerc * CIRCUNFERENCIA * Math.cos((latCentro * Math.PI) / 180)) / largura;
  const alvoM = (largura / 4) * metrosPorPonto;
  const degraus = [100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000, 500000];
  const passoM = degraus.find((d) => d >= alvoM) || degraus[degraus.length - 1];
  const comprimento = passoM / metrosPorPonto;
  const ex = PAGE.margin + 14;
  const ey = base + 14;
  // Sobre imagem de satelite ou de rua, texto solto some. Uma tarja clara garante
  // a leitura da escala e da legenda em qualquer fundo.
  page.drawRectangle({
    x: ex - 6, y: ey - 8, width: comprimento + 12, height: 24,
    color: rgb(1, 1, 1), opacity: 0.78
  });
  page.drawLine({ start: { x: ex, y: ey }, end: { x: ex + comprimento, y: ey }, thickness: 1.6, color: rgb(0.2, 0.25, 0.33) });
  page.drawLine({ start: { x: ex, y: ey - 3 }, end: { x: ex, y: ey + 3 }, thickness: 1.2, color: rgb(0.2, 0.25, 0.33) });
  page.drawLine({ start: { x: ex + comprimento, y: ey - 3 }, end: { x: ex + comprimento, y: ey + 3 }, thickness: 1.2, color: rgb(0.2, 0.25, 0.33) });
  page.drawText(passoM >= 1000 ? `${passoM / 1000} km` : `${passoM} m`, {
    x: ex, y: ey + 6, size: 7, font: regular, color: rgb(0.35, 0.4, 0.48)
  });

  // Norte.
  const nx = PAGE.margin + largura - 20;
  const ny = base + altura - 30;
  page.drawLine({ start: { x: nx, y: ny }, end: { x: nx, y: ny + 16 }, thickness: 1.4, color: rgb(0.2, 0.25, 0.33) });
  page.drawLine({ start: { x: nx - 4, y: ny + 10 }, end: { x: nx, y: ny + 16 }, thickness: 1.4, color: rgb(0.2, 0.25, 0.33) });
  page.drawLine({ start: { x: nx + 4, y: ny + 10 }, end: { x: nx, y: ny + 16 }, thickness: 1.4, color: rgb(0.2, 0.25, 0.33) });
  page.drawText('N', { x: nx - 2.5, y: ny + 19, size: 7, font: bold, color: rgb(0.2, 0.25, 0.33) });

  // Legenda: sem ela, um relatorio com varios voos mostra cores sem significado.
  // So entram os projetos que tem item selecionado.
  const projetosComItem = [];
  for (const item of snapshot.items) {
    if (!projetosComItem.some((p) => p.id === item.projectId)) {
      const projeto = (snapshot.projects || []).find((p) => p.id === item.projectId);
      projetosComItem.push({ id: item.projectId, title: projeto?.title || item.projectTitle || item.projectId });
    }
  }
  if (projetosComItem.length > 1) {
    let ly = base + altura - 12;
    const lx = PAGE.margin + 12;
    const visiveis = projetosComItem.slice(0, 6);
    const larguraLegenda = 20 + Math.max(...visiveis.map(
      (p) => regular.widthOfTextAtSize(safeText(p.title).slice(0, 52), 7)
    ));
    page.drawRectangle({
      x: lx - 6, y: ly - 6 - visiveis.length * 11,
      width: larguraLegenda + 12, height: visiveis.length * 11 + 12,
      color: rgb(1, 1, 1), opacity: 0.78
    });
    for (const projeto of visiveis) {
      const cor = cores.get(projeto.id) || corDeHex(null);
      page.drawRectangle({ x: lx, y: ly - 5, width: 9, height: 6, color: cor, opacity: 0.85 });
      page.drawText(safeText(projeto.title).slice(0, 52), {
        x: lx + 14, y: ly - 4.5, size: 7, font: regular, color: rgb(0.25, 0.3, 0.38)
      });
      ly -= 11;
    }
    if (projetosComItem.length > visiveis.length) {
      page.drawText(`+${projetosComItem.length - visiveis.length} outro(s) aerolevantamento(s)`, {
        x: lx + 14, y: ly - 4.5, size: 7, font: regular, color: rgb(0.45, 0.5, 0.58)
      });
    }
  }

  if (!rotular) {
    const yAviso = projetosComItem.length > 1 ? base + 30 : base + altura - 14;
    const aviso = `${snapshot.items.length} coberturas; numeração omitida por volume.`;
    page.drawRectangle({
      x: PAGE.margin + 6, y: yAviso - 3,
      width: regular.widthOfTextAtSize(aviso, 7) + 12, height: 13,
      color: rgb(1, 1, 1), opacity: 0.78
    });
    page.drawText(aviso, {
      x: PAGE.margin + 12, y: yAviso, size: 7, font: regular, color: rgb(0.35, 0.4, 0.48)
    });
  }
}

function safeText(value) {
  return String(value ?? '').replace(/[\u2013\u2014]/g, '-').replace(/[^\x20-\x7e\u00a0-\u00ff]/g, '?');
}

function wrap(text, maxCharacters = 86) {
  const words = safeText(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= maxCharacters) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function generateDownloadReport(snapshot) {
  const document = await PDFDocument.create();
  document.setTitle(`Relatório de download - ${safeText(snapshot.siteTitle)}`);
  document.setSubject('Fotografias aéreas selecionadas para download');
  document.setCreator(snapshot.siteTitle);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  // O mapa de fundo é opcional: se a captura falhou (rede bloqueada, provedor
  // fora), o relatório sai com o croqui vetorial em vez de não sair.
  let imagemBase = null;
  if (snapshot.basemap?.bytes) {
    try {
      imagemBase = await document.embedPng(snapshot.basemap.bytes);
    } catch (error) {
      console.warn('Mapa de fundo do relatório não pôde ser embutido.', error);
    }
  }
  let page;
  let y;

  function addPage() {
    page = document.addPage([PAGE.width, PAGE.height]);
    y = PAGE.height - PAGE.margin;
  }

  function ensureSpace(height = 30) {
    if (y - height < PAGE.margin) addPage();
  }

  function line(text, options = {}) {
    const size = options.size || 10;
    const leading = options.leading || size * 1.35;
    const lines = wrap(text, options.maxCharacters || 86);
    ensureSpace(lines.length * leading + 4);
    for (const content of lines) {
      page.drawText(content, {
        x: PAGE.margin + (options.indent || 0),
        y,
        size,
        font: options.bold ? bold : regular,
        color: options.color || rgb(0.12, 0.16, 0.23)
      });
      y -= leading;
    }
    if (options.gap) y -= options.gap;
  }

  const tipoConsulta = snapshot.geometryType === 'Point'
    ? 'ponto'
    : snapshot.geometryType === 'Polygon' ? 'área desenhada' : 'não informada';

  addPage();
  line(snapshot.siteTitle, { size: 18, bold: true, leading: 23, gap: 4 });
  line('Relatório de seleção e download', { size: 13, bold: true, gap: 8 });
  line(`Gerado em: ${new Date(snapshot.generatedAt).toLocaleString('pt-BR')}`);
  line(`Consulta por ${tipoConsulta} | ${snapshot.items.length} fotografia(s)`);
  line(`Versão do catálogo: ${snapshot.catalogVersion}`, { gap: 12 });

  line('Mapa da seleção', { size: 13, bold: true, gap: 4 });
  line(imagemBase
    ? 'Coberturas selecionadas sobre o mapa de referência. A geometria consultada aparece em vermelho.'
    : 'Coberturas selecionadas e a geometria consultada, em vermelho. Mapa de referência indisponível na geração.', {
    size: 8, color: rgb(0.35, 0.4, 0.48), gap: 6
  });
  ensureSpace(MAPA.altura + 10);
  desenharEsquema(page, snapshot, {
    topo: y,
    largura: PAGE.width - PAGE.margin * 2,
    altura: MAPA.altura,
    regular,
    bold,
    imagemBase
  });
  y -= MAPA.altura + 10;
  // A atribuição do mapa fica JUNTO do mapa que ela atribui. No fim do relatório
  // ela ficava solta, longe daquilo a que se refere.
  if (snapshot.attribution) {
    line(`Mapa de referência: ${snapshot.attribution}`, { size: 8, color: rgb(0.35, 0.4, 0.48), gap: 12 });
  } else {
    y -= 6;
  }

  line('Aerolevantamentos', { size: 13, bold: true, gap: 4 });
  for (const project of snapshot.projects) {
    line(project.title, { bold: true });
    const details = [
      project.period && `Período: ${project.period}`,
      project.institution && `Instituição: ${project.institution}`,
      project.contractor && `Executor: ${project.contractor}`,
      project.aircraft && `Aeronave: ${project.aircraft}`,
      project.camera && `Câmera: ${project.camera}`,
      project.nominalScale && `Escala nominal: ${project.nominalScale}`,
      project.license && `Licença: ${project.license}`,
      project.credits && `Créditos: ${project.credits}`
    ].filter(Boolean);
    details.forEach((detail) => line(detail, { indent: 10 }));
    y -= 6;
  }

  line('Fotografias selecionadas', { size: 13, bold: true, gap: 4 });
  snapshot.items.forEach((item, index) => {
    ensureSpace(58);
    line(`${index + 1}. ${item.title} (${item.projectTitle})`, { bold: true });
    line([
      item.flightLine && `Faixa ${item.flightLine}`,
      item.capturedAt,
      item.nominalScale,
      item.downloadFilename
    ].filter(Boolean).join(' | '), { indent: 10 });
    // A licença NÃO se repete por fotografia: ela é a mesma para todo o
    // aerolevantamento e já consta no bloco do projeto, acima. Repetir em cada
    // item só alongava o relatório sem acrescentar informação.
    y -= 5;
  });
  return document.save();
}
