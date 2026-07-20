#!/usr/bin/env node
// Publica o build no diretório servido pelo nginx.
//
// Existe por causa de um estrago real: publicar com `cp -r dist/* <destino>`
// copia junto o `public/config.js` do repositório, que é o catálogo de
// DEMONSTRAÇÃO, por cima do catálogo de PRODUÇÃO do servidor. O portal voltou a
// mostrar Brasília 1958 fictícia no lugar dos cinco voos reais.
//
// A regra que este script faz cumprir: o build entrega CÓDIGO (index.html e
// assets). Catálogo e acervo são do servidor e nunca vêm do dist.

import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Só isto sai do dist. Qualquer outra coisa que o build produza é ignorada de
// propósito: a lista é uma permissão, não uma exclusão, para que um arquivo novo
// em public/ não passe a ser publicado sem alguém decidir.
const DO_BUILD = ['index.html', 'assets'];

// Isto é do servidor. Se o dist trouxer um arquivo com estes nomes, é engano.
const DO_SERVIDOR = ['config.js', 'data'];

const raiz = resolve(import.meta.dirname, '..');
const dist = join(raiz, 'dist');
const destino = process.argv[2] || process.env.PORTAL_DESTINO;

function erro(mensagem) {
  console.error(`\n  ERRO: ${mensagem}\n`);
  process.exit(1);
}

if (!destino) {
  erro('informe o diretório publicado.\n'
    + '  uso: npm run publicar -- <destino>\n'
    + '  ou defina PORTAL_DESTINO no ambiente.');
}
if (!existsSync(dist)) erro('não há dist/. Rode `npm run build` antes.');
if (!existsSync(destino)) erro(`o destino ${destino} não existe.`);

// Guarda: o destino precisa PARECER um portal já publicado. Sem isto, um erro de
// digitação no caminho espalha arquivos num diretório qualquer.
const config = join(destino, 'config.js');
if (!existsSync(config)) {
  erro(`${destino} não tem config.js: não parece o diretório publicado.\n`
    + '  Publicar aqui criaria um portal pela metade. Confira o caminho.');
}

// Guarda principal: o catálogo do servidor é o de produção, não o de demo?
const catalogo = await readFile(config, 'utf8');
if (/catalogVersion:\s*'demo/.test(catalogo)) {
  erro(`${destino}/config.js é o catálogo de DEMONSTRAÇÃO.\n`
    + '  Alguém já publicou por cima do catálogo real.\n'
    + '  Restaure antes: copie catalogo/config.producao.js para config.js.');
}

console.log(`\n  publicando em ${destino}`);
console.log(`  catálogo preservado: ${catalogo.match(/catalogVersion:\s*'([^']+)'/)?.[1]}`);

for (const nome of DO_SERVIDOR) {
  if (existsSync(join(dist, nome))) {
    console.log(`  ignorando dist/${nome} (pertence ao servidor)`);
  }
}

// assets/ vai limpo: os arquivos têm hash no nome, então build após build o
// diretório acumula órfãos que ninguém mais referencia.
const alvoAssets = join(destino, 'assets');
if (existsSync(alvoAssets)) await rm(alvoAssets, { recursive: true });
await mkdir(alvoAssets, { recursive: true });

for (const nome of DO_BUILD) {
  const origem = join(dist, nome);
  if (!existsSync(origem)) erro(`o build não produziu ${nome}.`);
  await cp(origem, join(destino, nome), { recursive: true });
}

// Confere que o que o index.html pede está mesmo lá. Um asset faltando não daria
// 404 no nginx: o fallback de SPA devolve o index.html com 200 e content-type
// text/html, e o portal quebra sem dizer por quê.
const indice = await readFile(join(destino, 'index.html'), 'utf8');
const pedidos = [...indice.matchAll(/(?:src|href)="[^"]*?assets\/([^"]+)"/g)].map((m) => m[1]);
const presentes = new Set(await readdir(alvoAssets));
const faltando = pedidos.filter((nome) => !presentes.has(nome));
if (faltando.length) erro(`o index.html pede assets que não foram copiados: ${faltando.join(', ')}`);

const tamanhos = await Promise.all(pedidos.map(async (nome) => {
  const { size } = await stat(join(alvoAssets, nome));
  return `${nome} (${(size / 1024).toFixed(1)} kB)`;
}));

console.log(`  assets: ${presentes.size} arquivo(s), sem órfãos`);
console.log(`  index.html referencia: ${tamanhos.join(', ')}`);
console.log('\n  publicado. Catálogo e acervo do servidor intactos.\n');
