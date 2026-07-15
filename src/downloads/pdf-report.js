import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const PAGE = { width: 595.28, height: 841.89, margin: 48 };

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
  document.setTitle(`Relatorio de download - ${safeText(snapshot.siteTitle)}`);
  document.setSubject('Fotografias aereas selecionadas para download');
  document.setCreator(snapshot.siteTitle);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
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

  addPage();
  line(snapshot.siteTitle, { size: 18, bold: true, leading: 23, gap: 4 });
  line('Relatorio de selecao e download', { size: 13, bold: true, gap: 8 });
  line(`Gerado em: ${new Date(snapshot.generatedAt).toLocaleString('pt-BR')}`);
  line(`Consulta: ${snapshot.geometryType || 'nao informada'} | ${snapshot.items.length} fotografia(s)`);
  line(`Versao do catalogo: ${snapshot.catalogVersion}`, { gap: 12 });

  line('Aerolevantamentos', { size: 13, bold: true, gap: 4 });
  for (const project of snapshot.projects) {
    line(project.title, { bold: true });
    const details = [
      project.period && `Periodo: ${project.period}`,
      project.institution && `Instituicao: ${project.institution}`,
      project.contractor && `Executante: ${project.contractor}`,
      project.aircraft && `Aeronave: ${project.aircraft}`,
      project.camera && `Camera: ${project.camera}`,
      project.nominalScale && `Escala nominal: ${project.nominalScale}`,
      project.license && `Licenca: ${project.license}`,
      project.credits && `Creditos: ${project.credits}`
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
    if (item.licenseLabel) line(`Licenca: ${item.licenseLabel}`, { indent: 10 });
    y -= 5;
  });

  if (snapshot.attribution) {
    ensureSpace(35);
    line(`Atribuicao do mapa de referencia: ${snapshot.attribution}`, { size: 8, color: rgb(0.35, 0.4, 0.48) });
  }
  return document.save();
}
