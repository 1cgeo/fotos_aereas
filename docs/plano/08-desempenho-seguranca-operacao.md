# Desempenho, segurança e operação

## Orçamento inicial de desempenho

Os números finais devem ser calibrados com o acervo real. Como ponto de partida em desktop intermediário e conexão estável:

| Operação | Meta inicial |
|---|---:|
| Shell utilizável, sem contar mapa externo | até 2 s |
| Catálogo visível após resposta do config | até 300 ms |
| Ativar projeto já em cache | até 300 ms |
| Consulta em dados já indexados | até 500 ms no volume de referência |
| Resposta visual a hover/foco | próximo quadro, alvo de 100 ms |
| Tarefa longa no thread principal | evitar blocos acima de 50 ms |

Volume de referência a confirmar:

- 50 projetos;
- 100 mil footprints no total;
- 10 mil footprints no maior projeto;
- GeoJSON total não comprimido abaixo de 100 MB;
- até 2 mil resultados em uma consulta excepcional.

Se o acervo exceder materialmente esses valores, deve haver uma etapa de arquitetura de dados antes da implementação final.

## Estratégias de desempenho

- Carregar somente `config.js` na inicialização.
- Carregar grades sob demanda, exceto durante consulta global.
- Limitar concorrência de downloads de GeoJSON, por exemplo a quatro requisições.
- Manter cache de projeto na sessão.
- Usar RBush e refinamento geométrico exato.
- Importar funções Turf individualmente.
- Importar `pdf-lib` dinamicamente somente no fluxo de relatório.
- Usar miniaturas pequenas e lazy loading.
- Renderizar resultados em blocos ou páginas.
- Atualizar prévia de desenho com `requestAnimationFrame`.
- Evitar recriar sources MapLibre; preferir `setData` quando apropriado.
- Medir antes de mover consultas para Web Worker.

## Escalonamento sem backend

Se GeoJSON integral se tornar grande demais, ainda é possível permanecer estático com uma etapa de pré-processamento:

- arquivo leve de índice espacial e metadados por projeto;
- geometrias simplificadas para consulta/visualização;
- arquivos divididos por região;
- PMTiles ou vector tiles apenas para renderização, acompanhados de índice consultável separado;
- compressão HTTP Brotli/Gzip para JSON.

Vector tiles visuais, sozinhos, não resolvem a consulta global: os tiles fora da tela não estão carregados. A fonte de consulta precisa continuar disponível de forma determinística.

## Mapa-base e OSM

Dados OSM são abertos, mas servidores públicos de tiles têm políticas próprias. Antes da publicação:

1. escolher um provedor com capacidade e termos compatíveis;
2. registrar URL do estilo sem segredo no `config.js`, ou usar mecanismo público permitido pelo provedor;
3. mostrar atribuição no mapa;
4. preservar atribuições adicionais presentes no estilo;
5. não fazer prefetch, download em massa ou empacotamento dos tiles;
6. documentar contato e plano de troca do provedor.

A URL do estilo deve ser configurável para que uma mudança de provedor não exija alterar o código-fonte.

## Postura de segurança

Ser estático reduz a superfície de ataque do servidor da aplicação, mas não torna o portal seguro por natureza. O navegador ainda executa JavaScript, interpreta dados externos, abre links de download e se comunica com provedores de mapa. A cadeia de publicação, o domínio e o storage dos arquivos também podem ser atacados.

Todo conteúdo entregue ao navegador é público e inspecionável. O portal não pode proteger imagens, esconder URLs ou aplicar autorização real sem um serviço no servidor. Se algum arquivo não puder ser público, ele está fora desta arquitetura.

Objetivos P0:

- impedir execução de metadados ou URLs como código;
- aceitar conexões somente com origens previstas;
- proteger a integridade do código, configuração e catálogo publicados;
- reduzir impacto de dados excessivos ou malformados;
- evitar navegação silenciosa para destinos perigosos;
- minimizar dependências e JavaScript de terceiros;
- proteger conta de hospedagem, pipeline, domínio e DNS;
- preservar privacidade e disponibilidade;
- possibilitar detecção, rollback e resposta a incidentes.

Segurança deve ser aplicada em camadas. Validação não substitui CSP; CSP não substitui construção segura do DOM; HTTPS não substitui controle da publicação.

## Fronteiras de confiança

```text
equipe editorial --------> config.js / GeoJSON / miniaturas
                                |
pipeline e hospedagem -------->+--------> navegador do usuário
                                |             |
provedor OSM/style/tiles ------+             +--> servidor dos originais
                                              +--> links institucionais
```

Classificação:

- **Código confiável:** HTML, CSS e bundle revisados e produzidos pelo pipeline.
- **Configuração executável confiável:** `config.js`, somente depois de revisão e publicação controlada.
- **Dados não confiáveis para fins de renderização:** todos os textos, propriedades, IDs e URLs vindos de config e GeoJSON. Mesmo sendo institucionais, devem ser validados antes de entrar no DOM.
- **Serviços externos:** estilo, tiles, sprites, glifos, miniaturas remotas, links e servidor dos originais.
- **Entrada do usuário:** cliques, geometria desenhada, estado da URL e dados restaurados de storage.

Dados do mapa nunca recebem confiança por estarem no mesmo domínio. Uma falha editorial ou comprometimento de arquivo não deve virar XSS.

## Modelo de ameaças e controles

| Ameaça | Exemplo | Controle principal |
|---|---|---|
| XSS por metadado | `title` contém tag, SVG ou evento | DOM criado por APIs seguras e texto inserido com `textContent`. |
| XSS por URL | `downloadUrl` usa `javascript:` ou `data:text/html` | Parser central, protocolos e hosts permitidos por finalidade, mais CSP. |
| HTML em popup/mapa | Propriedade GeoJSON é interpolada em template | Popups recebem elementos DOM, nunca string HTML. |
| DOM clobbering | Dado controla `id`/`name` e colide com globais | IDs DOM são internos; dados ficam em `data-*` normalizado ou em `Map`. |
| Comprometimento de `config.js` | Alguém publica JavaScript arbitrário | Mesmo controle de mudança do bundle, MFA, revisão, CSP e rollback. |
| Dependência comprometida | Pacote ou atualização injeta código | Poucas dependências, lockfile, `npm ci`, revisão e auditoria de proveniência. |
| Script de terceiro comprometido | CDN entrega biblioteca alterada | Não carregar JavaScript por CDN; empacotar dependências localmente. |
| Clickjacking | Site malicioso enquadra o portal e induz cliques | `frame-ancestors 'none'` e `X-Frame-Options: DENY`. |
| Reverse tabnabbing | Link externo manipula a aba de origem | `rel="noopener noreferrer"` e, quando apropriado, COOP. |
| Conteúdo misto | Recurso HTTP em página HTTPS | Somente HTTPS e `upgrade-insecure-requests`. |
| Exaustão de recursos | GeoJSON enorme ou geometria com milhões de vértices | Limites, timeout, cancelamento, validação e processamento incremental/worker. |
| Prototype pollution | Propriedade `__proto__` entra em merge genérico | Copiar somente campos permitidos; usar `Map`; evitar merge profundo de dados. |
| Redirecionamento/download enganoso | Foto aponta para host não aprovado | Allowlist, host visível, gesto explícito e verificação editorial. |
| Vazamento de navegação | URL completa é enviada como `Referer` | `Referrer-Policy: strict-origin-when-cross-origin`; não colocar consulta sensível na URL. |
| Alteração de arquivo publicado | Storage ou conta de deploy é comprometida | Menor privilégio, versionamento, logs, alertas e publicação atômica. |
| Sequestro de domínio/DNS | Conta do registrador é tomada | MFA resistente a phishing, registrar lock, renovação automática e alertas. |
| Indisponibilidade/abuso de banda | Hotlink ou download automatizado massivo | CDN, limites/alertas e controles do storage compatíveis com o acesso público. |

## Segurança do `config.js`

`config.js` é executado pelo navegador; portanto, não é apenas um arquivo de dados. Validar o objeto depois da carga não impede código malicioso presente no próprio arquivo.

Regras obrigatórias:

- servir `config.js` somente do mesmo origin da aplicação;
- não aceitar URL remota de configuração por query string, hash ou parâmetro de ambiente do navegador;
- manter o arquivo como atribuição declarativa ao objeto global conhecido, sem funções, imports, acesso ao DOM ou requisições;
- revisar mudanças no config como mudanças de código;
- validar o objeto resultante e copiar somente propriedades previstas;
- remover a referência global depois da normalização;
- servir com `Content-Type: text/javascript; charset=utf-8` e `X-Content-Type-Options: nosniff`;
- usar HTTPS, cache curto/revalidação e rollback versionado;
- nunca inserir segredos, credenciais ou tokens privilegiados.

Uma migração futura para `config.json` reduziria o risco de configuração executável, mas não é requisito deste plano. Enquanto `config.js` for mantido, ele pertence à base confiável da aplicação.

## Segredos e tokens

- Tudo que estiver em `public/`, no bundle ou em variáveis `VITE_*` é público.
- Não usar chave com permissão de escrita, administração ou acesso privado no navegador.
- Se o provedor de tiles exigir token público, restringi-lo por origem/domínio, produto e quota no painel do provedor.
- Credenciais de deploy existem somente no cofre do CI, com escopo de escrita limitado ao destino correto e sem exposição em logs.
- Ativar secret scanning no repositório e bloquear publicação quando um segredo conhecido for encontrado.
- Source maps não contêm segredos; ainda assim, sua publicação deve ser uma decisão explícita. O build nunca deve embutir variáveis privadas.

## Construção segura do DOM

Todos os campos do config e do GeoJSON são tratados como texto ou valores tipados.

Permitido:

- `document.createElement`;
- `textContent`;
- propriedades DOM tipadas;
- `addEventListener` com função;
- `classList` com classes definidas pelo código;
- fragmentos DOM criados pela aplicação.

Proibido para conteúdo dinâmico:

- `innerHTML`, `outerHTML` e `insertAdjacentHTML`;
- `document.write`;
- `eval`, `new Function` ou timers que recebem string;
- atributos `on*` construídos como texto;
- templates HTML contendo valores de metadados;
- CSS arbitrário vindo do catálogo.

Cores configuráveis devem passar por regex estrita de hexadecimal. IDs usados em source/layer MapLibre devem ser compostos a partir de IDs já validados. O aplicativo não deve transformar nomes editoriais diretamente em IDs DOM.

O mesmo princípio vale para:

- popups e controles do MapLibre;
- mensagens de erro;
- atributos `alt`, `title` e `aria-label`;
- texto inserido no PDF;
- dados restaurados da URL ou `sessionStorage`.

## Validação de URLs e navegação

Deve existir uma única função de normalização de URL, testada isoladamente. Ela recebe a finalidade da URL e aplica regras diferentes para `geojson`, `thumbnail`, `download`, `link`, `style` e `contact`.

Regras:

1. resolver com `new URL(value, trustedBaseUrl)`;
2. aceitar `https:` em produção;
3. aceitar `http:` somente para `localhost` em desenvolvimento;
4. rejeitar credenciais embutidas (`username`/`password`), caracteres de controle e URL excessivamente longa;
5. rejeitar `javascript:`, `vbscript:`, `file:`, `filesystem:` e esquemas desconhecidos;
6. permitir `blob:` somente para objetos criados internamente, como o PDF;
7. permitir `data:` somente onde a aplicação cria o conteúdo e o tipo é conhecido; nunca para links ou downloads vindos do catálogo;
8. comparar o hostname normalizado com a allowlist da finalidade;
9. exibir claramente quando um download sair do domínio institucional;
10. adicionar `rel="noopener noreferrer"` a links externos e usar `target="_blank"` somente quando houver motivo de experiência.

A allowlist da aplicação evita erros de dados. A CSP do servidor é a barreira efetiva contra conexões inesperadas no navegador; ambas devem ser mantidas coerentes.

## Validação e limites de recursos

Antes de usar um recurso:

- conferir status HTTP e `Content-Type`;
- usar timeout e `AbortController`;
- rejeitar `Content-Length` acima do limite quando o cabeçalho estiver disponível;
- limitar tamanho efetivamente lido, contagem de feições, propriedades, profundidade, caracteres por campo, anéis e vértices;
- analisar JSON exclusivamente com `JSON.parse`, nunca `eval`;
- copiar para o modelo somente uma lista fechada de propriedades;
- rejeitar chaves perigosas e nunca fazer merge profundo de objetos de dados;
- validar números finitos, faixas de coordenadas, IDs, MIME declarado e nomes de arquivo;
- interromper o projeto com erro específico, sem tentar reparar silenciosamente geometria inválida.

Os limites exatos devem vir do inventário da Fase 0 e ficar centralizados no código. Não podem ser controlados pelo próprio arquivo remoto que se deseja limitar.

Projetos muito grandes devem ser validados no pipeline antes da publicação. Limites no navegador são a última defesa contra falhas ou adulteração, não o processo principal de qualidade.

## Segurança dos downloads

- Os originais são públicos e baixados por navegação direta; a aplicação não envia cookies, tokens ou cabeçalhos de autorização.
- O portal não usa `fetch` para abrir, inspecionar ou compactar a fotografia original.
- Cada download exige gesto claro; não abrir várias abas ou arquivos automaticamente no P0.
- O hostname de destino fica disponível no detalhe e deve pertencer à allowlist institucional.
- `downloadFilename` é normalizado, tem limite de tamanho e não aceita barras, caminhos relativos, caracteres de controle ou nomes reservados.
- O servidor deve enviar `Content-Disposition: attachment`, `Content-Type` correto e `X-Content-Type-Options: nosniff`.
- Checksum SHA-256, quando disponível, aparece no PDF e no detalhe para verificação externa.
- Links externos recebem `noopener`; o portal não confia em retorno ou mensagem da aba aberta.
- O PDF é criado apenas com texto e vetores controlados. Não inserir JavaScript, anexos, links automáticos ou miniaturas remotas no PDF P0.

Se os originais precisarem de autenticação, expiração ou auditoria por usuário, será necessário rever a premissa sem backend.

## Content Security Policy

A CSP deve ser enviada como cabeçalho HTTP, primeiro em `Content-Security-Policy-Report-Only` durante homologação e depois em modo bloqueante. Não depender somente de `<meta>`: diretivas como `frame-ancestors` precisam do cabeçalho.

Política-base, com hosts reais enumerados pelo ambiente:

```text
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  script-src-attr 'none';
  style-src 'self';
  style-src-attr 'unsafe-inline';
  img-src 'self' data: blob: https://miniaturas.example.gov.br https://tiles.example.net;
  connect-src 'self' https://dados.example.gov.br https://tiles.example.net;
  font-src 'self';
  worker-src 'self' blob:;
  manifest-src 'self';
  media-src 'none';
  object-src 'none';
  frame-src 'none';
  frame-ancestors 'none';
  base-uri 'none';
  form-action 'none';
  upgrade-insecure-requests;
```

Observações:

- MapLibre, CSS, workers e `pdf-lib` são empacotados localmente; nenhuma biblioteca executável é carregada de CDN.
- `config.js` funciona com `script-src 'self'` por estar no mesmo origin.
- `style-src-attr 'unsafe-inline'` pode ser necessário porque o mapa ajusta posições e dimensões no DOM. Isso não libera scripts nem elementos `<style>` inline. Deve ser confirmado e, se possível, reduzido no teste de compatibilidade.
- `connect-src` precisa incluir style JSON, tiles, sprites, glifos e GeoJSON conforme a forma como o provedor os entrega.
- Não usar `*`, `https:` genérico, `unsafe-eval` ou `unsafe-inline` em `script-src`.
- Qualquer violação observada deve ser entendida; não ampliar a política apenas para silenciar o console.
- Trusted Types (`require-trusted-types-for 'script'`) pode ser habilitado como defesa adicional depois de testar MapLibre e navegadores-alvo; não substitui a proibição de sinks inseguros.
- COEP não deve ser ativado sem homologar todos os tiles, sprites, glifos e miniaturas, pois pode bloquear recursos externos sem cabeçalhos compatíveis.

Se o portal precisar ser incorporado por um site institucional, substituir `frame-ancestors 'none'` por uma lista exata de origens aprovadas. Nunca liberar todos os enquadradores.

## Cabeçalhos HTTP de produção

| Cabeçalho | Valor inicial | Finalidade/cuidado |
|---|---|---|
| `Content-Security-Policy` | política acima | Restringe código e conexões; testar antes em Report-Only. |
| `Strict-Transport-Security` | `max-age=31536000` | HTTPS persistente. Adicionar `includeSubDomains` e `preload` somente se todos os subdomínios estiverem preparados. |
| `X-Content-Type-Options` | `nosniff` | Impede interpretação de tipo diferente do declarado. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Reduz vazamento de caminho e mantém origem para provedores que exigem Referer. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | Desativa capacidades não utilizadas; ampliar a lista conforme suporte. |
| `X-Frame-Options` | `DENY` | Compatibilidade adicional contra framing; CSP é a regra principal. |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isola a janela e reduz relação com abas externas; homologar links/downloads antes de exigir. |
| `X-XSS-Protection` | `0` | Desativa filtros legados problemáticos; CSP e codificação são as defesas. |

Também:

- servir HTML como `text/html; charset=utf-8`, JavaScript como `text/javascript; charset=utf-8`, JSON/GeoJSON com tipo coerente, CSS como `text/css` e imagens com MIME real;
- configurar páginas de erro estáticas que não reflitam caminho ou parâmetros sem escape;
- desativar listagem de diretórios no storage/origin;
- não emitir cookies, pois o portal não possui sessão;
- testar cabeçalhos no domínio final e em respostas de erro, não apenas no servidor local.

## CORS e isolamento de origens

CORS permite que JavaScript de uma origem leia respostas de outra. Ele não é autenticação, não impede download direto e não torna um arquivo privado.

- Preferir config, GeoJSON e miniaturas no mesmo origin do portal.
- Para dados deliberadamente públicos em origin separado, usar uma origem exata ou `Access-Control-Allow-Origin: *` sem credenciais, conforme a política institucional.
- Nunca combinar origem ampla com cookies ou credenciais.
- O portal deve usar `credentials: 'omit'` em fetches de dados públicos entre origens.
- O estilo e os assets do mapa precisam de CORS compatível com o MapLibre.
- Downloads por link direto não devem depender de CORS; dependem de HTTPS, cabeçalhos corretos e política do navegador.
- CSP restringe para onde a página pode se conectar; CORS define se a resposta remota pode ser lida. As duas políticas têm funções diferentes.

## Cadeia de dependências

- Manter o menor conjunto possível de dependências diretas.
- Instalar no CI com `npm ci` e lockfile versionado; nunca atualizar o lockfile durante o build de produção.
- Fixar versões e revisar alterações de dependências separadamente.
- Auditar dependências diretas e transitivas, licenças, mantenedores e proveniência disponível.
- Executar `npm audit` e `npm audit signatures` quando suportado; achados precisam de triagem, não de atualização automática cega.
- Gerar inventário/SBOM do build publicado.
- Configurar atualizações automatizadas para abrir propostas revisáveis, nunca publicar diretamente.
- Não executar scripts de instalação de pacote desconhecido fora de ambiente isolado.
- Não usar imports de CDN, snippets remotos ou tags de analytics sem nova revisão de segurança e privacidade.
- Se um recurso executável externo for inevitável, fixar versão, avaliar SRI/CORS, limitar por CSP e documentar o risco; a preferência continua sendo empacotar localmente.

## Proteção da hospedagem, pipeline e domínio

- MFA resistente a phishing para repositório, CI, CDN, storage, DNS e registrador.
- Contas individuais; proibir credenciais compartilhadas.
- Menor privilégio: visitantes têm somente leitura; credencial de deploy escreve apenas no site correto; equipe editorial não administra DNS.
- Revisão obrigatória e proteção do branch de produção.
- CI executado a partir de revisão imutável; ações/plugins de CI fixados por versão ou commit.
- Ambientes de preview não podem reutilizar credenciais de produção nem indexar acidentalmente dados ainda não publicados.
- Storage sem escrita pública, sem listagem de diretório e, quando aplicável, acessível ao público somente através da CDN.
- Versionamento de objetos, logs de alteração, publicação atômica e rollback testado.
- Certificados TLS com renovação monitorada; redirecionamento permanente de HTTP para HTTPS.
- DNS protegido com registrar lock, renovação automática, contatos atualizados e alertas de mudança.
- Backup independente de configuração, dados editoriais e últimos builds saudáveis.

## Testes de segurança

O pipeline e a homologação devem incluir:

- lint e busca por `innerHTML`, `eval`, `new Function`, handlers inline e outros sinks proibidos;
- testes unitários com textos e URLs maliciosos;
- fuzz básico de config/GeoJSON: profundidade, tamanho, IDs especiais, números não finitos e geometrias extremas;
- secret scanning;
- auditoria de dependências, assinaturas/proveniência e licenças;
- verificação automatizada dos cabeçalhos no ambiente publicado;
- CSP em Report-Only durante homologação e inspeção de violações;
- scanner passivo para site estático, sem testes destrutivos contra provedores externos;
- teste de framing, links externos, mixed content, MIME incorreto e páginas 404;
- revisão manual das allowlists de hosts;
- teste de comprometimento editorial simulado: metadado contendo HTML não pode gerar elemento executável;
- teste de rollback e restauração de um build conhecido.

Nenhuma vulnerabilidade crítica ou alta conhecida pode ser aceita para lançamento sem análise formal, controle compensatório, responsável e prazo.

## Resposta a incidentes

Deve existir um procedimento curto e testado:

1. confirmar e registrar o incidente sem apagar evidências;
2. retirar ou reverter rapidamente config, dados ou build afetado;
3. invalidar cache da CDN somente para os recursos comprometidos;
4. revogar tokens e credenciais de deploy potencialmente expostos;
5. revisar logs do repositório, CI, storage, CDN e DNS;
6. verificar se originais ou metadados foram alterados;
7. comunicar responsáveis institucionais e usuários quando aplicável;
8. corrigir a causa, republicar de origem confiável e monitorar;
9. registrar lições e atualizar controles/testes.

Contatos, responsabilidades, credenciais de emergência e acesso ao rollback não devem depender de uma única pessoa.

## Referências de segurança

- [OWASP: prevenção de DOM XSS](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [OWASP: Content Security Policy](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [OWASP: gerenciamento de JavaScript de terceiros](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html)
- [OWASP: cabeçalhos HTTP de segurança](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
- [MDN: `frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)
- [npm: proveniência de pacotes](https://docs.npmjs.com/viewing-package-provenance/)

## Privacidade

- Não coletar coordenadas consultadas por padrão.
- Não incluir analytics na primeira versão sem decisão institucional.
- Se analytics for adotado, preferir métricas agregadas e documentar base legal, retenção e consentimento quando aplicável.
- O provedor do mapa-base recebe IP e requisições de tiles; isso deve aparecer no aviso de privacidade.
- O servidor dos originais recebe a requisição de download diretamente do navegador.

## Cache e atualização

Recomendação de cabeçalhos:

- HTML e `config.js`: cache curto ou revalidação.
- Assets com hash do Vite: `public, max-age=31536000, immutable`.
- GeoJSON versionado: cache longo e URL alterada quando o conteúdo mudar.
- Miniaturas e originais imutáveis: cache longo.

O `config.js` pode incluir `catalogVersion` e URLs como `footprints.v3.geojson`. Publicar primeiro os novos dados e depois o config evita que o catálogo aponte temporariamente para arquivos inexistentes.

## Implantação

Pipeline recomendado:

1. verificar origem imutável do commit e aprovações exigidas;
2. executar secret scanning;
3. instalar dependências com `npm ci` e lockfile versionado;
4. auditar dependências, assinaturas/proveniência e licenças;
5. executar lint e busca por sinks DOM proibidos;
6. validar configuração, dados, limites e allowlists;
7. executar testes unitários, de segurança e de navegador;
8. gerar build Vite e SBOM/inventário de componentes;
9. servir o diretório `dist` em ambiente efêmero com headers de produção;
10. executar scanner passivo e smoke test com substitutos controlados;
11. publicar de forma atômica usando credencial de menor privilégio;
12. verificar CSP/headers, mapa, projeto, consulta, PDF e download no domínio final;
13. registrar versão, manifesto/hash do build e ponto de rollback.

## Monitoramento operacional

Sem backend da aplicação, ainda devem existir:

- monitor externo da página inicial;
- verificação periódica do `config.js` e de uma amostra de GeoJSON/miniaturas/originais;
- monitoramento de certificado TLS, expiração do domínio e mudanças de DNS;
- alertas de alteração no storage, falhas de deploy e crescimento anormal de banda;
- coleta de violações CSP, se houver endpoint institucional ou serviço aprovado, sem incluir coordenadas consultadas;
- registro da versão publicada no rodapé ou diagnóstico;
- canal de contato para dados ausentes ou links quebrados;
- procedimento de rollback para a publicação estática anterior;
- revisão periódica de acessos administrativos, dependências e allowlists.

## Ameaças à disponibilidade

- indisponibilidade do provedor de tiles;
- GeoJSON muito grande ou inválido;
- CORS incorreto em dados remotos;
- mudança de URLs dos originais;
- limite de banda da hospedagem;
- navegador sem WebGL;
- pressão de memória em dispositivo móvel.

Se WebGL falhar, a página deve manter uma mensagem com explicação e contato. Um catálogo textual sem mapa pode ser uma evolução P1.
