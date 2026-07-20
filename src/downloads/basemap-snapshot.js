// Captura do mapa-base para o relatorio em PDF.
//
// O relatorio precisa de contexto geografico: sem o mapa por tras, as coberturas
// sao retangulos flutuando no vazio. Aqui montamos uma imagem estatica a partir
// dos tiles do mapa-base configurado, em Web Mercator, cobrindo exatamente a area
// que o PDF vai desenhar, para que a sobreposicao vetorial case pixel a pixel.
//
// Falhar aqui NAO pode impedir o relatorio: se os tiles nao vierem (rede
// bloqueada, provedor fora), o PDF sai com o croqui vetorial, que ja e util.

const TAMANHO_TILE = 256;
const MAX_TILES = 48;
const ZOOM_MAXIMO = 17;

export function lonParaMerc(lon) {
  return lon / 360 + 0.5;
}

export function latParaMerc(lat) {
  const limitada = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const seno = Math.sin((limitada * Math.PI) / 180);
  return 0.5 - Math.log((1 + seno) / (1 - seno)) / (4 * Math.PI);
}

/**
 * Ajusta a caixa (em Mercator normalizado 0..1) para a proporcao do quadro do
 * PDF, crescendo a dimensao que falta. Assim a imagem preenche o quadro sem
 * esticar e sem sobrar tarja.
 */
export function mercParaLat(y) {
  return (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI;
}

export function ajustaCaixaAProporcao(caixaBruta, proporcaoAlvo, folgaRelativa = 0) {
  const folga = Math.max(caixaBruta.x1 - caixaBruta.x0, caixaBruta.y1 - caixaBruta.y0) * folgaRelativa;
  const caixa = {
    x0: caixaBruta.x0 - folga, x1: caixaBruta.x1 + folga,
    y0: caixaBruta.y0 - folga, y1: caixaBruta.y1 + folga
  };
  const largura = caixa.x1 - caixa.x0;
  const altura = caixa.y1 - caixa.y0;
  const proporcao = largura / altura;
  if (!Number.isFinite(proporcao) || proporcao <= 0) return caixa;
  if (proporcao < proporcaoAlvo) {
    const nova = altura * proporcaoAlvo;
    const centro = (caixa.x0 + caixa.x1) / 2;
    return { x0: centro - nova / 2, x1: centro + nova / 2, y0: caixa.y0, y1: caixa.y1 };
  }
  const nova = largura / proporcaoAlvo;
  const centro = (caixa.y0 + caixa.y1) / 2;
  return { x0: caixa.x0, x1: caixa.x1, y0: centro - nova / 2, y1: centro + nova / 2 };
}

/** Maior zoom que mantem a contagem de tiles dentro do teto. */
export function escolheZoom(caixa, larguraAlvoPx) {
  const largura = Math.max(1e-12, caixa.x1 - caixa.x0);
  const ideal = Math.log2(larguraAlvoPx / (TAMANHO_TILE * largura));
  for (let z = Math.min(ZOOM_MAXIMO, Math.max(0, Math.floor(ideal))); z >= 0; z -= 1) {
    const escala = 2 ** z;
    const nx = Math.floor(caixa.x1 * escala) - Math.floor(caixa.x0 * escala) + 1;
    const ny = Math.floor(caixa.y1 * escala) - Math.floor(caixa.y0 * escala) + 1;
    if (nx * ny <= MAX_TILES) return z;
  }
  return 0;
}

function carregaTile(url, signal) {
  return new Promise((resolve) => {
    const imagem = new Image();
    imagem.crossOrigin = 'anonymous';
    imagem.referrerPolicy = 'no-referrer';
    const encerra = (valor) => {
      imagem.onload = null;
      imagem.onerror = null;
      resolve(valor);
    };
    imagem.onload = () => encerra(imagem);
    imagem.onerror = () => encerra(null);
    if (signal) signal.addEventListener('abort', () => encerra(null), { once: true });
    imagem.src = url;
  });
}

/**
 * @param {[number,number,number,number]} bbox [oeste, sul, leste, norte]
 * @param {{ template: string, larguraPx?: number, proporcao?: number, signal?: AbortSignal }} opcoes
 * @returns {Promise<{ bytes: Uint8Array, caixa: object } | null>}
 */
export async function capturaMapaBase(bbox, opcoes) {
  const { template, larguraPx = 1400, proporcao = 1.6, signal } = opcoes || {};
  if (!template || typeof document === 'undefined' || typeof Image === 'undefined') return null;

  const [oeste, sul, leste, norte] = bbox;
  const bruta = {
    x0: lonParaMerc(oeste), x1: lonParaMerc(leste),
    y0: latParaMerc(norte), y1: latParaMerc(sul)
  };
  const caixa = ajustaCaixaAProporcao(bruta, proporcao, 0.1);
  const zoom = escolheZoom(caixa, larguraPx);
  const escala = 2 ** zoom;

  const tx0 = Math.floor(caixa.x0 * escala);
  const tx1 = Math.floor(caixa.x1 * escala);
  const ty0 = Math.floor(caixa.y0 * escala);
  const ty1 = Math.floor(caixa.y1 * escala);

  const canvas = document.createElement('canvas');
  const larguraPixels = Math.round((caixa.x1 - caixa.x0) * escala * TAMANHO_TILE);
  const alturaPixels = Math.round((caixa.y1 - caixa.y0) * escala * TAMANHO_TILE);
  if (larguraPixels < 2 || alturaPixels < 2) return null;
  canvas.width = larguraPixels;
  canvas.height = alturaPixels;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#eef2f7';
  ctx.fillRect(0, 0, larguraPixels, alturaPixels);

  const pedidos = [];
  for (let tx = tx0; tx <= tx1; tx += 1) {
    for (let ty = ty0; ty <= ty1; ty += 1) {
      const nx = ((tx % escala) + escala) % escala;
      const url = template
        .replace('{z}', String(zoom))
        .replace('{x}', String(nx))
        .replace('{y}', String(ty));
      pedidos.push(carregaTile(url, signal).then((imagem) => ({ imagem, tx, ty })));
    }
  }
  const tiles = await Promise.all(pedidos);
  const carregados = tiles.filter((t) => t.imagem);
  // Menos de um terco dos tiles: o fundo sairia esburacado e enganoso.
  if (carregados.length < Math.ceil(tiles.length / 3)) return null;

  for (const { imagem, tx, ty } of carregados) {
    const px = (tx / escala - caixa.x0) * escala * TAMANHO_TILE;
    const py = (ty / escala - caixa.y0) * escala * TAMANHO_TILE;
    ctx.drawImage(imagem, Math.round(px), Math.round(py), TAMANHO_TILE, TAMANHO_TILE);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    bytes,
    caixa,
    zoom,
    tilesCarregados: carregados.length,
    tilesPedidos: tiles.length
  };
}
