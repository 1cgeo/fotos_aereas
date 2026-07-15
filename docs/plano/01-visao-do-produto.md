# Visão do produto

## Problema

Acervos de aerolevantamentos históricos costumam estar organizados em projetos, faixas e fotografias parcialmente sobrepostas. Saber qual fotografia cobre um local exige relacionar visualmente o local de interesse às grades de cobertura e, muitas vezes, repetir a busca em vários projetos.

O portal deve tornar essa busca espacial simples e permitir que a pessoa obtenha os arquivos originais sem que a aplicação precise manter um servidor próprio.

## Proposta

Disponibilizar um mapa com uma lista de aerolevantamentos históricos. O usuário pode visualizar projetos específicos, consultar as fotos que cobrem um ponto ou intersectam uma área e organizar downloads individuais acompanhados de um relatório PDF.

## Públicos principais

- pesquisadores de história urbana, ambiental e territorial;
- profissionais de cartografia, geografia, arquitetura e planejamento;
- servidores responsáveis por acervos e atendimento ao público;
- estudantes e cidadãos que precisam localizar fotografias antigas.

O produto deve funcionar para usuários que compreendem mapas, mas não pressupor experiência com SIG.

## Objetivos

- Explicar quais projetos existem, onde e quando foram realizados.
- Mostrar a cobertura de cada fotografia de maneira legível.
- Encontrar todas as fotografias sobrepostas em um ponto.
- Encontrar todas as fotografias que intersectam uma área desenhada.
- Permitir consultas restritas a projetos ligados ou globais.
- Manter a procedência de cada foto em resultados com múltiplos projetos.
- Oferecer downloads grandes sem montar um ZIP em memória.
- Tornar a inclusão de novos projetos uma operação de dados, não de programação.

## Fora do escopo inicial

- autenticação ou arquivos privados;
- cobrança, carrinho ou licenciamento individual;
- upload de arquivos pelo visitante;
- edição das grades no navegador;
- reprojeção de dados pelo navegador;
- ortorretificação ou processamento fotogramétrico;
- mosaico ou visualização da fotografia original sobre o mapa;
- ZIP contendo os arquivos originais;
- garantia de retomada parcial de downloads interrompidos, que depende do servidor de arquivos;
- mapa-base para uso offline.

## Vocabulário

**Projeto ou aerolevantamento:** campanha cadastrada no catálogo, com metadados próprios e uma coleção de fotografias.

**Grade de voo:** conjunto de polígonos que representa a cobertura no terreno de cada fotografia. Apesar do nome, a feição individual é o footprint da foto, não apenas uma quadrícula decorativa.

**Foto:** registro associado a uma feição da grade, uma miniatura e um arquivo original para download.

**Projeto ligado:** projeto cuja grade está visível e participa da consulta corrente.

**Escopo global:** modo automático usado quando nenhum projeto está ligado; pesquisa todos os projetos configurados.

**Seleção:** conjunto deduplicado de fotos encontrado pela última consulta e, futuramente, ajustado manualmente pelo usuário.

## Jornadas essenciais

### Explorar um aerolevantamento

1. A pessoa abre o catálogo de projetos.
2. Liga um projeto.
3. O mapa enquadra sua extensão e exibe a grade.
4. O painel mostra descrição, data, escala, instituição, licença e demais metadados.
5. A pessoa pode ligar outros projetos para compará-los.

### Encontrar fotos por ponto

1. A pessoa ativa a ferramenta `Consultar ponto`.
2. A interface informa o escopo corrente.
3. A pessoa clica no mapa.
4. Todas as fotos cuja cobertura contém o ponto são listadas.
5. Ao focar ou passar o ponteiro por um resultado, a respectiva grade recebe destaque.
6. A pessoa abre a miniatura ou baixa a foto individual.

### Encontrar fotos por área

1. A pessoa ativa `Desenhar área`.
2. Desenha e conclui um polígono simples.
3. Todas as coberturas que intersectam o polígono são listadas.
4. A pessoa pode apagar e desenhar novamente.

### Baixar um conjunto

1. A pessoa aciona `Baixar todas`.
2. O portal valida os resultados e gera o PDF da consulta.
3. O primeiro item da fila fica pronto para download.
4. A pessoa baixa as imagens uma a uma, acompanhando concluídas, pendentes e falhas.
5. A fila pode ser retomada durante a mesma sessão.

## Princípios de experiência

- O escopo da consulta nunca deve ficar oculto.
- Sobreposição é um dado esperado, não um erro a ser eliminado.
- O mapa e o painel devem permanecer sincronizados.
- Um erro em um projeto não deve inutilizar os projetos saudáveis.
- A aplicação deve explicar limites do navegador antes de iniciar muitos downloads.
- A lista textual deve oferecer uma alternativa acessível à informação transmitida por cor no mapa.
