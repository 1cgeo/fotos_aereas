# Decisões em aberto

Estas perguntas não impedem a documentação do plano, mas algumas precisam ser respondidas na Fase 0 antes da implementação definitiva. A coluna `Padrão proposto` permite avançar enquanto a resposta institucional não chega.

## Decisões de bloqueio

| Tema | Pergunta | Padrão proposto |
|---|---|---|
| Volume | Quantos projetos, fotos, bytes de GeoJSON e vértices existem hoje e em três anos? | Validar arquitetura com 50 projetos e 100 mil fotos. |
| CRS | Todas as grades podem ser publicadas previamente em EPSG:4326? | Reprojetar no pipeline de preparação, nunca no navegador. |
| Hospedagem | Onde ficarão site, GeoJSON, miniaturas e originais? | Mesmo domínio para site/dados/miniaturas; storage/CDN para originais. |
| Downloads | O servidor envia `Content-Length`, `Content-Disposition` e aceita ranges? | Tornar esses cabeçalhos requisito de publicação. |
| Mapa-base | Qual provedor OSM suporta o tráfego e os termos do portal? | Provedor contratado/configurável; não depender dos tiles comunitários em produção. |
| Licença | Quais licenças e créditos devem aparecer por projeto e foto? | Campos obrigatórios no config; herança do projeto pela foto. |
| Metadados | `photoId`, faixa, data, escala, tamanho e checksum estão disponíveis? | Exigir somente identidade e URLs; tratar os demais como recomendados. |
| Navegadores | Safari e dispositivos móveis são requisito formal? | Suportar uso básico; homologar desenho e downloads separadamente. |

## Produto e conteúdo

| Tema | Pergunta | Padrão proposto |
|---|---|---|
| Nome | Qual é o nome institucional do portal? | `Acervo de Fotografias Aéreas Históricas`. |
| Terminologia | A instituição prefere `grade`, `cobertura`, `footprint`, `foto` ou `fotograma`? | Interface usa `cobertura da fotografia`; documentação técnica usa footprint. |
| Projeto ativo | É permitido ligar vários simultaneamente? | Sim; a necessidade de sobreposição favorece comparação. |
| Escopo vazio | Nenhum projeto ligado realmente significa pesquisar todos? | Sim, conforme requisito, com indicador explícito. |
| Seleção manual | O usuário pode retirar fotos antes do relatório? | P1; no P0, preparar todas as encontradas. |
| Limites | Uma consulta pode retornar milhares de fotos? | Permitir, avisar acima do limite configurado e paginar. |
| PDF | A instituição possui modelo, logotipo e textos legais? | Layout neutro, A4, com logo opcional local. |
| PDF cartográfico | É necessário um mapa ou basta a relação das grades? | P0 usa resumo e tabela; mapa vetorial esquemático é P1. |
| Termos | Download exige aceite de termos? | Exibir somente quando `termsUrl`/texto estiver configurado. |
| Idioma | Haverá inglês ou espanhol? | Somente `pt-BR` no P0, mas sem textos espalhados no motor de regras. |

## Comportamento do mapa

| Tema | Pergunta | Padrão proposto |
|---|---|---|
| Enquadramento | Ligar todo projeto sempre altera a vista? | Somente o primeiro; demais exigem `Ver no mapa`. |
| Cor | As cores são editoriais ou geradas? | Configuradas por projeto e validadas. |
| Clique | Deve existir tolerância em pixels? | Não; clique representa coordenada exata. |
| Borda | Tocar a borda conta? | Sim para ponto e área. |
| Desenho | Como concluir o polígono? | Botão, primeiro vértice ou Enter; nunca depender só de duplo clique. |
| Edição | P0 precisa adicionar/remover vértices? | Não; mover, limpar e redesenhar bastam. |
| Pan durante desenho | Clique cria vértice e arraste move o mapa? | Sim no protótipo; ajustar após teste de usabilidade. |
| Antimeridiano | Existem projetos que o cruzam? | Considerado fora do escopo inicial. |

## Downloads

| Tema | Pergunta | Padrão proposto |
|---|---|---|
| Botão | Como explicar que `Baixar todas` inicia PDF e fila, não downloads simultâneos? | Manter o rótulo exigido e exibir texto auxiliar antes da ação. |
| Automação | Tentar abrir todos automaticamente? | Não no P0; fila manual é previsível e não depende de permissão de múltiplos downloads. |
| Confirmação | Como saber se terminou? | Usuário confirma; a página não alega observar conclusão real. |
| Persistência | A fila sobrevive ao recarregamento? | Somente P1 via `sessionStorage`. |
| ZIP | Deve existir para seleções pequenas? | Fora do escopo até existir demanda comprovada. |
| Checksum | Deve aparecer no PDF? | Sim quando fornecido. |

## Operação

| Tema | Pergunta | Padrão proposto |
|---|---|---|
| Responsável | Quem aprova novo projeto e corrige link quebrado? | Definir proprietário editorial antes do lançamento. |
| Atualização | O config pode mudar sem rebuild? | Sim, carregamento runtime. |
| Validação de links | Qual frequência? | Diária para recursos principais e semanal por amostragem de originais. |
| Analytics | Medir consultas e downloads? | Não no P0 sem análise de privacidade. |
| Retenção | URLs antigas continuarão funcionando? | Preferir URLs permanentes; publicar redirecionamentos quando mudarem. |
| Contato | Onde relatar ausência ou erro? | Link de contato configurado no cabeçalho, erros e PDF. |

## Registro de decisões

Ao resolver um tema que altera arquitetura ou comportamento, registrar uma ADR curta em `docs/adr/` com:

- contexto;
- decisão;
- alternativas consideradas;
- consequências;
- data e responsáveis.

ADRs iniciais sugeridas:

1. site estático sem backend;
2. GeoJSON + índice espacial em memória;
3. ferramenta de desenho própria;
4. fila manual em vez de ZIP;
5. configuração em runtime;
6. provedor do mapa-base.
