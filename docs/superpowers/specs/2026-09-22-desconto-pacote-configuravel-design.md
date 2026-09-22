# Desconto por pacote configurável no painel

**Data:** 2026-09-22
**Status:** aprovado para virar plano de implementação
**Repositórios envolvidos:** `frontend-crm` (formulário público + painel de Configurações) e `server CRUD` (backend)

## Contexto

O desconto por "pacote" (quando uma landing page tem várias campanhas vinculadas e o
visitante — ou o grupo de participantes — escolhe mais de uma) é hoje uma regra fixa no
código: 2 campanhas = 10%, 3 ou mais = 15%. Essa regra está duplicada em pelo menos dois
lugares (o script injetado na landing page publicada, que mostra o aviso de desconto em
tempo real, e o endpoint público que efetivamente grava a inscrição). O negócio precisa de
uma quarta faixa (4 campanhas = 20%) agora, e prevê precisar ajustar isso de novo no futuro
sem depender de uma mudança de código — então a faixa deixa de ser fixa e passa a ser uma
lista configurável no painel.

## Fora de escopo

- A regra continua **global** (uma tabela só, vale para toda landing page multi-campanha da
  empresa) — não há configuração por landing page ou por campanha individual.
- Não mexe em como o desconto é aplicado (por pessoa vs. por organização — already
  configurável por landing page, definido no plano anterior) — só em **de onde vem o
  percentual** de cada faixa.
- Não mexe no desconto de campanha única (que não tem noção de "pacote").

## Modelo de dados

Nova tabela `faixas_desconto_pacote`, global (sem vínculo a landing page nem campanha):

```sql
CREATE TABLE IF NOT EXISTS faixas_desconto_pacote (
  id SERIAL PRIMARY KEY,
  qtd_minima_campanhas INTEGER NOT NULL UNIQUE,
  percentual NUMERIC(5,2) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

Cada linha diz "a partir de X campanhas escolhidas, aplica Y% de desconto". O percentual
aplicado numa inscrição é o da **maior faixa cuja `qtd_minima_campanhas` seja menor ou igual**
à quantidade de campanhas distintas escolhidas (pela pessoa, no modo "por pessoa", ou pelo
grupo todo, no modo "por organização" — a regra de *quem* conta as campanhas não muda, só
de onde vem o percentual de cada faixa). Sem faixa aplicável (ex.: só 1 campanha, ou tabela
vazia), o desconto é 0%.

Dado inicial (seed, para preservar o comportamento atual e já entregar a faixa pedida):
`{2, 10}`, `{3, 15}`, `{4, 20}`.

## Backend

- Migração idempotente (`CREATE TABLE IF NOT EXISTS`, padrão do projeto) mais um `INSERT`
  condicional do seed inicial (só insere se a tabela estiver vazia, pra não sobrescrever
  configuração já feita pelo painel em boots seguintes).
- **`GET /faixas-desconto`**: rota pública (sem `verificarToken`), devolve a lista ordenada
  por `qtd_minima_campanhas` — precisa ser pública porque quem lê isso primeiro é o navegador
  de um visitante anônimo da landing page, antes de qualquer login.
- **`POST /faixas-desconto`**, **`PUT /faixas-desconto/:id`**, **`DELETE
  /faixas-desconto/:id`**: autenticadas, para o painel gerenciar a lista. `qtd_minima_campanhas`
  único (a tabela já garante isso via `UNIQUE`; a rota devolve erro claro em vez do 500
  genérico de constraint).
- Uma função utilitária `resolverDescontoPacote(qtdCampanhas, faixas)` substitui o `if/else`
  fixo (`qtd >= 3 ? 15 : qtd === 2 ? 10 : 0`) nos dois pontos onde ele hoje existe dentro de
  `POST /webhook/inscricao-externa` (cálculo "por organização" e cálculo "por pessoa").

## Formulário público (script da landing page)

O script injetado (`scriptFormulario`) busca `GET /faixas-desconto` no carregamento da
página — mesmo padrão já usado para UFs e módulos da campanha — e guarda o resultado (ex.
`window.FAIXAS_DESCONTO`). A função que hoje calcula o aviso de desconto em tempo real
(`calcularDescontoMulti`) passa a usar essa lista em vez do `pct = qtd >= 3 ? 15 : qtd === 2
? 10 : 0` fixo, nos dois modos (por pessoa / por organização).

## Painel — nova aba em Configurações

Nova aba **"Desconto por Pacote"** em `Configuracoes.jsx`, seguindo o mesmo padrão visual e
de interação já usado na aba "Cargos" (lista com adicionar/editar/remover, sem modal
separado — edição inline). Cada linha mostra "a partir de N campanhas" + "% de desconto",
com validação simples (número inteiro positivo para a quantidade, percentual entre 0 e 100).
A lista é ordenada automaticamente por quantidade mínima na exibição, independente da ordem
de cadastro.

## Testagem

1. Cadastrar a faixa `{4, 20}` no painel, confirmar que aparece ordenada corretamente junto
   das faixas existentes.
2. Numa landing page multi-campanha de teste, selecionar 4 campanhas (por pessoa e por
   organização) e confirmar que o aviso mostra 20%, e que a inscrição gravada no banco
   reflete esse percentual.
3. Editar uma faixa existente (ex. mudar a de 3 campanhas de 15% para 18%) e confirmar que
   uma nova inscrição já usa o valor atualizado.
4. Remover uma faixa e confirmar que uma quantidade de campanhas que caía nela passa a usar
   a faixa imediatamente abaixo (ou 0%, se não sobrar nenhuma aplicável).
5. Confirmar que campanha única (sem noção de pacote) continua sem desconto, sem chamada a
   `/faixas-desconto` nem impacto nenhum.

## Riscos e decisões em aberto

- Nenhuma faixa cadastrada (tabela zerada pelo usuário) resulta em desconto sempre 0% — é o
  comportamento esperado, não um erro a ser bloqueado.
- `GET /faixas-desconto` sendo público expõe a política de desconto por pacote a qualquer
  visitante que inspecionar a rede do navegador — isso já era verdade antes (os percentuais
  estavam hardcoded no HTML/JS público), então não é uma regressão de sigilo.
