# Testes e aceitação

## Estratégia

A qualidade será verificada em quatro níveis:

1. validação editorial e estrutural dos dados;
2. testes unitários de regras e geometria;
3. testes de integração dos módulos;
4. testes ponta a ponta e verificações manuais em navegadores reais.

Dados de teste devem ser pequenos, determinísticos e hospedados localmente. A suíte não pode depender da disponibilidade do mapa-base ou dos servidores de produção.

## Fixtures mínimas

Criar pelo menos três projetos fictícios:

### Projeto A

- duas fotos parcialmente sobrepostas;
- uma foto com ponto exatamente na borda;
- IDs numéricos armazenados como string;
- miniaturas e downloads locais pequenos.

### Projeto B

- uma cobertura sobreposta ao Projeto A;
- um `MultiPolygon`;
- um polígono com buraco;
- campos recomendados ausentes.

### Projeto C

- arquivo GeoJSON inválido ou resposta HTTP simulada com erro;
- usado para verificar resultado parcial e nova tentativa.

Fixtures geométricas isoladas devem cobrir:

- ponto interno;
- ponto externo;
- ponto na aresta e no vértice;
- ponto dentro de buraco;
- polígono de consulta contido na foto;
- foto contida na consulta;
- cruzamento;
- toque de borda;
- caixas envolventes sobrepostas sem interseção real;
- polígono côncavo;
- `MultiPolygon`;
- anel auto-intersectante inválido.

## Testes unitários

### Configuração

- aceita configuração mínima válida;
- rejeita versão desconhecida;
- rejeita `project.id` duplicado ou inválido;
- rejeita extent fora da faixa;
- rejeita protocolo perigoso;
- normaliza campos opcionais sem alterar o objeto original;
- resolve URL relativa a partir de `config.js`.

### GeoJSON

- aceita `Polygon` e `MultiPolygon`;
- rejeita outros tipos de geometria;
- rejeita `photoId` duplicado dentro do projeto;
- injeta `projectId` corretamente;
- resolve URL relativa a partir do GeoJSON;
- preserva zeros em `photoNumber`;
- rejeita coordenadas fora da faixa e anel aberto;
- isola erro em um projeto.

### Índice e consultas

- o RBush retorna todos os candidatos esperados;
- falsos positivos da bbox são removidos pelo teste exato;
- ponto na borda é incluído;
- buraco exclui o ponto;
- todos os tipos de interseção de área são incluídos;
- a chave composta deduplica sem colidir projetos;
- ordenação natural é estável;
- escopo com ativos usa ativos;
- escopo vazio usa todos os habilitados.

### Ferramenta própria de desenho

- modelo de desenho testado sem instância MapLibre;
- transições válidas da máquina de estados;
- adicionar e desfazer vértice;
- `Esc` cancela sem deixar camada residual;
- primeiro `Esc` descarta arraste/rascunho e um `Esc` posterior desativa a ferramenta;
- conclusão repete a primeira coordenada;
- menos de três vértices não concluem;
- coordenada consecutiva duplicada é rejeitada;
- auto-interseção é rejeitada;
- arraste inválido reverte;
- mover o primeiro vértice atualiza o fechamento;
- `dragPan` é restaurado em conclusão, cancelamento e erro;
- atualização de prévia é limitada por quadro.

### ToolManager e limpeza

- rejeita ID de ferramenta duplicado;
- mantém no máximo uma ferramenta ativa;
- ativar a mesma ferramenta aplica o toggle definido;
- desativa a ferramenta anterior antes de ativar a próxima;
- falha em `activate` executa cleanup e deixa estado sem ferramenta ativa;
- `deactivate` e `cleanup` podem ser chamados mais de uma vez;
- listeners MapLibre, listeners DOM, timers, RAF e AbortController são liberados;
- cursor e `dragPan` são restaurados em sucesso, erro, cancelamento e destruição;
- desativar ferramenta preserva consulta concluída;
- `Limpar consulta` remove geometria, marcador e resultados independentemente da ferramenta ativa.

### Contrato e runner de análise

- registro rejeita ID duplicado e definição sem métodos obrigatórios;
- ponto aceita somente `Point` e polígono aceita somente `Polygon` válido;
- `executeProject` não acessa DOM, MapLibre, store ou rede;
- runner congela o escopo uma única vez;
- projetos ainda não carregados são preparados com concorrência limitada;
- progresso soma cargas e execuções sem regredir;
- erro de um projeto produz estado parcial e preserva os demais;
- cancelamento aborta fetches, para novos lotes e impede publicação tardia;
- resultado com `queryId` antigo é ignorado;
- agrega, deduplica e ordena antes de um único despacho ao store;
- mesma geometria e mesmos dados produzem o mesmo resultado.

### Resultados e relatório

- formata datas incompletas sem inventar valores;
- formata bytes e tamanho desconhecido;
- agrupa por projeto;
- snapshot não muda com o estado posterior;
- PDF cria nova página e repete cabeçalho ao exceder a altura;
- caracteres portugueses aparecem corretamente;
- nomes de arquivo são normalizados;
- erro de PDF preserva snapshot e fila ainda não iniciada.

### Fila

- cria itens na ordem dos resultados;
- avança somente por ação explícita no P0;
- tentar novamente incrementa tentativas;
- ignorar não remove o item;
- estados e totais permanecem consistentes;
- URL de protocolo não permitido nunca é aberta.

## Testes de integração

- carregar configuração -> renderizar catálogo;
- ligar projeto -> buscar GeoJSON -> indexar -> criar layers;
- duas solicitações simultâneas -> um único fetch;
- desligar e religar -> reutilizar cache;
- consulta global -> carregar projetos com concorrência limitada;
- cancelar consulta global -> abortar pendentes e ignorar respostas tardias;
- ativar ponto e depois polígono -> handlers do ponto saem antes dos handlers do polígono;
- ferramenta produz geometria -> runner executa -> painel reage somente ao store;
- desativar ferramenta após executar -> resultados e geometria concluída permanecem;
- focar resultado -> atualizar source de destaque;
- trocar resultado -> substituir, não acumular, destaque;
- acionar `Baixar todas` -> PDF e fila recebem o mesmo snapshot;
- nova consulta -> fila existente permanece identificável e não muda silenciosamente.

O adaptador de mapa deve ser testável com uma interface pequena ou mock. Não simular internamente toda a biblioteca MapLibre.

## Cenários ponta a ponta

### 1. Exploração de um projeto

**Dado** o catálogo carregado  
**Quando** o usuário liga o Projeto A  
**Então** a grade aparece, o escopo informa um projeto e os detalhes podem ser abertos.

### 2. Sobreposição no mesmo projeto

**Dado** o Projeto A ligado  
**Quando** o usuário consulta o ponto coberto por duas fotos  
**Então** os dois cartões aparecem e ambos identificam o Projeto A.

### 3. Sobreposição entre projetos

**Dado** os Projetos A e B ligados  
**Quando** o usuário consulta a região comum  
**Então** aparecem fotos dos dois projetos, agrupadas e deduplicadas.

### 4. Consulta global sem grade visível

**Dado** nenhum projeto ligado  
**Quando** o usuário consulta um ponto  
**Então** a interface anuncia escopo global, carrega os dados necessários e retorna resultados de A e B.

### 5. Falha parcial global

**Dado** que o Projeto C falha ao carregar  
**Quando** a consulta global termina  
**Então** resultados de A e B aparecem e a interface informa explicitamente que C foi omitido.

### 6. Desenho customizado

**Dado** `Desenhar área` ativo  
**Quando** o usuário cria três ou mais vértices e aciona `Concluir área`  
**Então** o polígono fecha, a consulta roda uma vez e os resultados aparecem.

### 7. Desenho inválido

**Dado** um desenho em andamento  
**Quando** o novo segmento criaria auto-interseção  
**Então** o vértice é rejeitado, os anteriores permanecem e uma explicação aparece.

### 8. Edição da área

**Dado** um polígono concluído  
**Quando** o usuário move um vértice e conclui a edição  
**Então** a nova geometria é validada e a consulta é refeita.

### 9. Destaque sincronizado

**Dado** uma lista com várias fotos  
**Quando** o usuário passa o ponteiro ou move o foco para cada cartão  
**Então** somente a grade correspondente fica destacada.

### 10. Download individual

**Dado** um resultado com URL válida  
**Quando** o usuário aciona `Baixar fotografia`  
**Então** o link de arquivo é aberto por um gesto direto, sem carregar o original na memória do portal.

### 11. Preparação do conjunto

**Dado** resultados de dois projetos  
**Quando** o usuário aciona `Baixar todas`  
**Então** um PDF com ambos os projetos e todas as grades é oferecido antes da fila.

### 12. Downloads individuais em sequência

**Dado** uma fila preparada  
**Quando** o usuário baixa e confirma cada item  
**Então** a interface avança, preserva contadores e nunca cria ZIP ou busca os originais com `fetch`.

### 13. Miniatura quebrada

**Dado** que uma miniatura falha  
**Quando** o cartão é exibido  
**Então** aparece placeholder, metadados continuam legíveis e o download permanece disponível.

### 14. Uso por teclado

**Dado** um usuário sem mouse  
**Quando** ele percorre catálogo, ferramentas, resultados e fila  
**Então** todos os controles são operáveis e o destaque acompanha o foco.

## Acessibilidade

Verificações automáticas com axe ou ferramenta equivalente podem detectar parte dos problemas. A aceitação também exige revisão manual de:

- ordem e visibilidade do foco;
- nomes e estados dos switches;
- anúncios de carregamento e total;
- contraste de texto, controles, grades e destaque;
- zoom do navegador a 200%;
- `prefers-reduced-motion`;
- navegação por teclado;
- leitura básica com NVDA/Firefox ou combinação institucional suportada.

Desenhar um polígono é uma interação espacial intrinsecamente difícil para leitores de tela. A consulta por ponto deve ter uma evolução acessível por entrada de longitude/latitude no P1; isso não elimina a necessidade de tornar controles e resultados acessíveis no P0.

## Testes manuais de download

Automatização não reproduz todas as permissões de download dos navegadores. Em cada navegador suportado, verificar:

- mesmo domínio com `download`;
- outro domínio com `Content-Disposition`;
- outro domínio sem `Content-Disposition`;
- bloqueio de popup;
- arquivo grande de homologação;
- cancelamento pelo usuário;
- nome com acentos e espaços;
- servidor com suporte a range;
- download em dispositivo móvel.

## Testes específicos de segurança

### Payloads de dados

Config e GeoJSON de teste devem incluir, em todos os campos textuais relevantes:

- tags `<script>`, `<img onerror>`, SVG e entidades;
- aspas, crases e sequências que fechariam atributos/templates;
- IDs `__proto__`, `constructor`, `prototype` e nomes iguais a IDs do DOM;
- URLs `javascript:`, `data:text/html`, `file:`, com credenciais, caracteres de controle e hostname semelhante ao permitido;
- nome de arquivo com `../`, barras, nomes reservados e tamanho excessivo;
- objetos profundos, arrays enormes, números não finitos e geometrias acima dos limites.

Aceitação: nenhum payload cria elemento ou atributo executável, inicia conexão não permitida, polui protótipo ou bloqueia indefinidamente a interface. O projeto inválido falha de forma isolada.

### Ambiente publicado

- HTTPS obrigatório e redirecionamento de HTTP;
- CSP primeiro em Report-Only na homologação e depois bloqueante;
- ausência de `unsafe-eval`, wildcard e script de terceiros;
- framing bloqueado;
- MIME e `nosniff` corretos para HTML, JS, CSS, JSON e downloads de teste;
- Referrer-Policy e Permissions-Policy presentes;
- nenhuma requisição de mixed content;
- páginas 404 não refletem entrada como HTML;
- CORS sem credenciais para dados públicos entre origens;
- source maps e variáveis públicas revisados;
- allowlists da aplicação coerentes com `connect-src`/`img-src`;
- rollback de build e config ensaiado.

### Cadeia de suprimentos e publicação

- lockfile não muda durante `npm ci`;
- secret scanning sem achados válidos;
- dependências e licenças inventariadas;
- vulnerabilidades altas/críticas triadas;
- hashes/manifesto do build registrados;
- credencial de deploy não aparece no bundle ou log;
- storage rejeita escrita anônima e mantém versões para rollback.

## Testes de desempenho

Gerar datasets sintéticos com 10 mil, 50 mil e 100 mil footprints. Medir separadamente:

- parse do JSON;
- validação;
- construção do índice;
- memória aproximada;
- consulta por ponto;
- consulta por polígono pequeno e amplo;
- renderização de 100, 500 e 2 mil resultados;
- geração de PDF com 10, 100, 500 e 2 mil linhas.

Os resultados determinam se Web Worker, paginação e limites editoriais entram antes do lançamento.

## Portões de qualidade

Um build candidato só pode ser publicado quando:

- validação de config e dados passar;
- lint não tiver erros;
- testes unitários e de integração passarem;
- cenários E2E P0 passarem em Chromium e Firefox;
- smoke test passar no ambiente publicado;
- não houver violação crítica de acessibilidade conhecida;
- não houver vulnerabilidade crítica/alta conhecida sem aceitação formal e controle compensatório;
- secret scanning, auditoria de dependências e testes de payload passarem;
- CSP e cabeçalhos de produção forem verificados no domínio final;
- allowlists de hosts e privilégios de deploy forem revisados;
- licenças, créditos e atribuição estiverem revisados;
- ao menos um link real de cada projeto novo tiver sido verificado.
