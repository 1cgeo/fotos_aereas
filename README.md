# Portal de Fotografias Aéreas Históricas

Aplicação web estática para consultar grades de aerolevantamentos históricos e baixar fotografias. Usa JavaScript, HTML, CSS, Vite e MapLibre GL JS, sem React e sem backend.

O repositório já inclui dois aerolevantamentos fictícios de Brasília, seis footprints sobrepostos, thumbnails e arquivos leves de demonstração. Nenhum dado do mock deve ser interpretado como informação histórica real.

## Funcionalidades

- catálogo configurável de aerolevantamentos;
- mapa MapLibre com OpenStreetMap de referência;
- temas claro e escuro escolhidos manualmente, com persistência local e sem modo automático;
- ativação independente das grades de voo;
- consulta por clique, incluindo todas as fotografias sobrepostas;
- ferramenta própria para desenho e edição de polígono, sem Terra Draw;
- buscas consecutivas sem recarregar ou reativar a ferramenta;
- consulta apenas nos projetos ligados ou em todo o catálogo quando nenhum está ligado;
- resultados com thumbnail, metadados, seleção persistente, enquadramento e destaque no mapa;
- PDF dinâmico com os dados dos voos e fotografias selecionadas;
- download da consulta inteira num ZIP, com o relatório PDF e a planilha de metadados dentro, montado no navegador e gravado em fluxo no disco (sem gravação em disco, sai fatiado em partes que cabem na memória);
- fila manual de downloads, uma imagem por vez, para quem quer escolher no meio da lista;
- painel recolhível em tablets e celulares, toolbar compacta e resultados adaptáveis;
- validação de configuração, GeoJSON, URLs e nomes de arquivo no cliente.

## Desenvolvimento

Requer Node.js 22 ou versão compatível com Vite 8.

```powershell
npm.cmd install
npm.cmd run dev
```

O endereço local é exibido pelo Vite. Para gerar e conferir a versão de produção:

```powershell
npm.cmd run build
npm.cmd run preview
```

## Dados e configuração

Edite [`public/config.js`](public/config.js). Cada projeto aponta para um `FeatureCollection` GeoJSON em EPSG:4326. Os campos obrigatórios e decisões de modelagem estão detalhados em [`docs/plano/04-configuracao-e-dados.md`](docs/plano/04-configuracao-e-dados.md).

Os URLs de GeoJSON, thumbnails e downloads podem ser relativos ao próprio site. Em produção, use HTTPS. Se os arquivos estiverem em outro host, configure CORS no host do GeoJSON e acrescente explicitamente esse domínio ao `connect-src` da CSP. O portal não usa credenciais para buscar dados públicos.

Não coloque segredos, tokens, URLs assinados permanentes ou dados pessoais em `config.js`: todo conteúdo estático é público e pode ser inspecionado pelo visitante.

## Testes

```powershell
npm.cmd test
npm.cmd run test:coverage
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e
```

Os testes ponta a ponta usam o Chrome instalado em `C:\Program Files\Google\Chrome\Application\chrome.exe` no Windows. Em Linux, instale o Chromium do Playwright com `npx playwright install --with-deps chromium`; o arquivo de configuração usa o navegador gerenciado fora do Windows.

## Publicação e segurança

O diretório publicado é `dist/`. A hospedagem precisa servir HTTPS e aplicar os cabeçalhos de [`public/_headers`](public/_headers). Esse formato funciona diretamente em serviços compatíveis, como Cloudflare Pages e Netlify. GitHub Pages não permite configurar todos esses cabeçalhos; para uma publicação institucional, prefira uma CDN/hospedagem que aceite CSP e headers HTTP ou replique as regras no proxy de borda.

A política padrão permite tiles somente de `tile.openstreetmap.org`. Ao trocar o mapa-base ou hospedar dados em domínios externos, ajuste `connect-src` e, quando necessário, `img-src` com hosts específicos. Não use `*`. Teste primeiro em homologação com `Content-Security-Policy-Report-Only`, corrija as violações esperadas e então publique a política bloqueante.

Controles já aplicados:

- dependências empacotadas localmente, sem scripts de CDN;
- DOM construído com `textContent` e APIs de elementos, sem HTML dinâmico;
- protocolos perigosos, credenciais em URL e nomes de arquivo com caminho são rejeitados;
- tamanho, estrutura e coordenadas do GeoJSON têm limites;
- o ZIP em lote busca as fotografias por `fetch` de mesma origem (coberto por `connect-src 'self'`), sem credenciais e sem recompressão, e escreve em fluxo: o pico de memória é o de UMA fotografia, não o da seleção;
- CSP, bloqueio de frames, `nosniff`, política de referenciador e Permissions Policy;
- sourcemaps de produção desabilitados e dependências auditadas;
- `config.js` sem cache e assets versionados com cache imutável.

Antes de publicar, revise o checklist completo em [`docs/plano/08-desempenho-seguranca-operacao.md`](docs/plano/08-desempenho-seguranca-operacao.md), proteja a conta de deploy com MFA, menor privilégio e revisão obrigatória, e teste os cabeçalhos no domínio final.

## Arquitetura e plano

A documentação completa está em [`docs/plano/README.md`](docs/plano/README.md). A auditoria dos componentes e tamanhos de tela está em [`docs/REVISAO_UI_UX.md`](docs/REVISAO_UI_UX.md). A implementação mantém módulos separados para configuração, dados, mapa, ferramentas, análises, downloads, interface e estado global.
