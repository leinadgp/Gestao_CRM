# Múltiplos participantes escolhendo campanhas diferentes em landing pages multi-campanha

**Data:** 2026-09-22
**Status:** aprovado para virar plano de implementação
**Repositórios envolvidos:** `frontend-crm` (formulário público + CRM interno) e `server CRUD` (backend)

## Contexto

O plano anterior (`2026-09-21-formulario-inscricao-lp-design.md`, já implementado e em produção) adicionou
suporte a 1-5 participantes por inscrição, mas deliberadamente **escondeu** esse recurso em landing pages
com mais de uma campanha vinculada ("modo multi-campanha" / `MODO_MULTI`), porque o backend, nesse modo,
só processa 1 pessoa por campanha e descartaria silenciosamente os demais participantes.

Em uso real, esse é justamente o cenário que mais precisa do recurso: uma prefeitura organiza uma "trilha"
de várias campanhas (cursos) e inscreve vários servidores, cada um podendo fazer cursos diferentes da
trilha. Este documento desenha como oferecer múltiplos participantes **também** no modo multi-campanha,
com cada participante escolhendo suas próprias campanhas/módulos, e dois modos de cálculo de desconto
configuráveis por landing page.

## Fora de escopo

- Rastrear inscrições da mesma prefeitura **ao longo do tempo** (em envios separados do formulário). Todo
  o cálculo de desconto e agrupamento de participantes vale só dentro de **um único envio** do formulário —
  se a prefeitura inscrever pessoas em dias diferentes, cada envio é independente, sem "lembrar" o que já
  foi inscrito antes.
- Alterar o modo de campanha única (`MODO_MULTI === false`) — esse fluxo já foi refeito no plano anterior
  e continua com uma seleção de módulos compartilhada pelo grupo, sem mudança aqui.
- Editar retroativamente negociações antigas quando uma nova inscrição "completaria" um pacote.

## Modos de desconto (configuração por landing page)

Nova coluna `landing_pages.modo_desconto`, valores `'por_pessoa'` (padrão) ou `'por_organizacao'`. Escolhido
junto com as campanhas vinculadas à página, no editor.

### Modo "por pessoa" (padrão)

O desconto de cada participante depende de **quantas campanhas distintas aquele participante, e só ele,
escolheu** dentro do envio. Dois participantes podem cair na mesma negociação (mesma prefeitura + mesma
campanha) com descontos diferentes: um com 10-15% porque está em 2+ campanhas, outro sem desconto porque
está só nessa. Cada um paga pelo que ele individualmente contratou.

Este modo é a generalização natural do que já existe hoje (hoje só há 1 participante por envio nesse
modo, então "desconto por pessoa" e "desconto por envio" coincidem — a mudança é só passar a valer com
2-5 participantes, cada um com sua própria contagem).

### Modo "por organização"

O desconto é único para o envio inteiro, calculado pela **união de todas as campanhas escolhidas por
qualquer participante do grupo** — igual à regra que já existe hoje para 1 participante, generalizada para
somar as escolhas de todos. Serve para o caso "a prefeitura monta uma trilha de 4 cursos, cada servidor faz
uma parte, mas o pacote todo tem desconto" mesmo que nenhum indivíduo, sozinho, tenha feito mais de 1 ou 2
cursos.

## Formulário público — seleção de curso por participante

Hoje (plano anterior), no modo multi-campanha, existe **um único bloco `#containerModulos`** compartilhado,
preenchido por `prepararFormulario()` com a lista de todos os módulos de todas as campanhas vinculadas —
válido para a inscrição toda.

**Muda para:** quando `window.MODO_MULTI === true`, cada participante visível (1 a 5, conforme a quantidade
escolhida) ganha seu **próprio** bloco de seleção de módulos, com os mesmos checkboxes (`todosModulos`,
já calculados por `prepararFormulario()`) — não uma lista por participante buscada separadamente, é a mesma
lista de módulos disponíveis, mas cada participante marca a sua independentemente dos outros. O participante
1 deixa de usar o `#containerModulos` estático do bloco GrapesJS como está hoje nesse modo; o script passa a
**gerar** um bloco de seleção de módulos por participante, dentro do bloco `[data-participante="N"]`
existente (ou, para o participante 1, logo abaixo dos campos dele).

No modo de campanha única (a maioria das páginas hoje), nada muda — continua a seleção compartilhada,
exatamente como está em produção.

O aviso de desconto (`#avisoDesconto`) deixa de ser um texto único fixo e passa a refletir o modo
configurado: em "por organização", mostra o desconto único do pacote; em "por pessoa", mostra, por
participante, o desconto que aquele participante específico está obtendo (ou nenhum aviso, se preferir
manter simples — ver seção de testagem/decisões em aberto).

## Payload enviado ao backend

Hoje: `{ ...dadosPessoa, inscricoes: [{campanha_id, modulos_ids, desconto_percentual}], desconto_percentual, desconto_motivo }`
— uma lista de campanhas/módulos vale pro grupo inteiro.

**Muda para:** `{ ...dadosPessoa, modo_desconto: 'por_pessoa' | 'por_organizacao', participantes: [
{ nome, email, telefone, formacao, cargo, campanhas: [{ campanha_id, modulos_ids }, ...] }, ...
] }` — cada participante carrega sua própria lista de campanhas/módulos escolhidos. O participante 1 usa os
mesmos dados já coletados (`dadosPessoa`), só que agora também com sua própria lista de campanhas em vez de
uma lista compartilhada do grupo.

## Backend — agrupamento e cálculo (`POST /webhook/inscricao-externa`, branch multi-campanha)

Reescreve o laço que hoje itera `inscricoes[]` (uma entrada por campanha, sempre 1 pessoa) para:

1. Calcular, para cada participante, o conjunto de campanhas que ele escolheu.
2. **Se `modo_desconto === 'por_organizacao'`:** calcular `qtdCampanhasGrupo` = união de todas as campanhas
   escolhidas por qualquer participante; `descontoPct` = 15% se ≥3, 10% se =2, 0% se =1 — igual à regra
   atual, só que somando todo o grupo. Esse único percentual vale para todos os participantes e todas as
   campanhas do envio.
3. **Se `modo_desconto === 'por_pessoa'`:** para cada participante, `qtdCampanhasPessoa` = quantas campanhas
   distintas ele escolheu; `descontoPct` daquele participante = 15%/10%/0% pela própria contagem dele.
4. Para cada campanha tocada por **qualquer** participante do envio:
   - Monta `inscritosNovos` = só os participantes que escolheram essa campanha, cada um com seus próprios
     `modulos_ids` (dentro dessa campanha) e seu próprio `desconto_percentual` (calculado no passo 2 ou 3,
     conforme o modo) gravado no registro do participante dentro de `inscritos_json`.
   - `valorFinal` dessa negociação = soma, por participante, do valor dos módulos que ELE escolheu nessa
     campanha, já com o desconto individual dele aplicado — não mais "soma total × um desconto único",
     exceto no modo "por organização", onde o desconto de todos é o mesmo de qualquer forma (resultado
     matematicamente equivalente à regra atual nesse caso).
   - Cria ou atualiza a negociação (empresa + campanha) exatamente como hoje — merge por `email|nome` em
     `inscritos_json`, `qtd_inscritos` = tamanho da lista mesclada.
   - `oportunidades.desconto` (coluna única, percentual): no modo "por organização" grava o percentual único
     do grupo, como hoje. No modo "por pessoa", quando os participantes daquela negociação específica têm
     descontos diferentes entre si, grava o desconto **médio ponderado pelo valor de cada um** (informativo —
     o valor exato por pessoa já está correto dentro de `inscritos_json`, essa coluna deixa de ser a fonte
     da verdade de preço quando há mistura, mas continua útil pra listagem/relatório não quebrar).

`normalizarInscritosJson` ganha o campo `desconto_percentual` (numérico, opcional) em cada item, preservado
como os demais campos já normalizados.

## CRM interno (Funil)

Onde hoje o modal de negociação mostra "Desconto (%)" como um campo único por negociação, isso continua
existindo — reflete o valor gravado em `oportunidades.desconto` (útil mesmo quando é uma média, para dar
uma ideia geral). A visão detalhada por participante (a seção "Dados de cada inscrito no curso", já
existente para o modo `modoPacoteInscricao === 'por_inscrito'`) ganha uma coluna/indicador mostrando o
`desconto_percentual` de cada um, quando presente — sem exigir edição manual desse campo pelo vendedor
nesta fase (é só leitura, preenchido pela landing page).

## Testagem

1. Landing page multi-campanha (4 campanhas), modo "por organização": enviar com 3 participantes,
   distribuídos em cursos diferentes cobrindo as 4 campanhas no total — confirmar que todas as 4
   negociações saem com o mesmo desconto (15%, união ≥3), e que cada uma lista só os participantes
   corretos.
2. Mesma landing page, modo "por pessoa": um participante em 2 campanhas, outro em 1 campanha que
   coincide com uma das do primeiro — confirmar que a negociação compartilhada tem os dois participantes,
   cada um com seu próprio `desconto_percentual` correto dentro de `inscritos_json`, e que `valorFinal`
   reflete a soma correta (um com desconto, outro sem).
3. Confirmar que o modo de campanha única (a maioria das páginas em produção hoje) continua funcionando
   sem nenhuma mudança de comportamento.
4. Conferir no Funil que a negociação mista (item 2) mostra os dois participantes com seus descontos
   individuais na seção "por inscrito".

## Riscos e decisões em aberto

- **Aviso de desconto no formulário público, modo "por pessoa":** o desenho acima deixa em aberto se cada
  participante mostra seu próprio aviso de desconto em tempo real enquanto marca os módulos, ou se isso
  fica mais simples (sem aviso client-side nesse modo, só confirmação depois do envio) — decisão de
  implementação, não bloqueia o restante do desenho.
- **`oportunidades.desconto` como média no modo "por pessoa" com participantes mistos:** é informativo, não
  a fonte da verdade de preço (que vive em `inscritos_json` por participante). Se no futuro for necessário
  que essa coluna seja exata, precisaria virar um campo por participante em vez de por negociação — fora de
  escopo agora.
